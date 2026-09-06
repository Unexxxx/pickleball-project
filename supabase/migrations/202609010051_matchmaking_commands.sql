create or replace function public.generate_match_proposal(p_event_id uuid,p_format text,p_idempotency_key uuid)
returns table(proposal_id uuid,side_a_player_ids uuid[],side_b_player_ids uuid[],court_id uuid,policy_version text,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=public.current_player_id();v_club uuid;v_record public.record_class;v_queue_version bigint;v_required int;v_players uuid[];v_entries uuid[];v_court uuid;v_format public.match_format;
begin
  if v_actor is null then raise exception using errcode='P0001',detail='AUTH_REQUIRED';end if;
  begin v_format:=p_format::public.match_format; exception when invalid_text_representation then raise exception using errcode='P0001',detail='INVALID_FORMAT';end;
  v_required:=case when v_format='singles' then 2 else 4 end;
  select e.club_id,e.record_class,e.queue_version into v_club,v_record,v_queue_version from public.events e where e.id=p_event_id and e.status in('published','registration_closed','in_progress') for update;
  if v_club is null then raise exception using errcode='P0001',detail='INVALID_STATE_TRANSITION';end if;
  if not private.has_club_role(v_club,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  if not exists(select 1 from public.events e where e.id=p_event_id and p_format=any(e.formats)) then raise exception using errcode='P0001',detail='INVALID_FORMAT';end if;
  select p.id,p.side_a_player_ids,p.side_b_player_ids,p.court_id,p.policy_version,p.expires_at into proposal_id,side_a_player_ids,side_b_player_ids,court_id,policy_version,expires_at from public.match_proposals p where p.created_by=v_actor and p.request_id=p_idempotency_key;
  if proposal_id is not null then return next;return;end if;
  select c.id into v_court from public.event_courts c where c.event_id=p_event_id and c.status='available' and c.current_match_id is null order by c.label,c.id for update skip locked limit 1;
  if v_court is null then raise exception using errcode='P0001',detail='NO_COURT_AVAILABLE';end if;
  select array_agg(q.player_id order by q.position_key,q.joined_at,q.id),array_agg(q.id order by q.position_key,q.joined_at,q.id)
    into v_players,v_entries from (select * from public.event_queue_entries where event_id=p_event_id and state='ready' order by position_key,joined_at,id limit v_required for update) q;
  if coalesce(cardinality(v_players),0)<>v_required then raise exception using errcode='P0001',detail='INSUFFICIENT_PLAYERS';end if;
  if exists(select 1 from unnest(v_players) pid where not exists(select 1 from public.accounts a where a.player_id=pid and a.contact_verified_at is not null)) then raise exception using errcode='P0001',detail='PLAYER_NOT_VERIFIED';end if;
  if v_record='ranked' and exists(select 1 from unnest(v_players) pid where not public.player_ranked_eligible(pid,v_club)) then raise exception using errcode='P0001',detail='INELIGIBLE';end if;
  side_a_player_ids:=case when v_format='singles' then v_players[1:1] else array[v_players[1],v_players[2]] end;
  side_b_player_ids:=case when v_format='singles' then v_players[2:2] else array[v_players[3],v_players[4]] end;
  court_id:=v_court;policy_version:='matchmaking-v1';expires_at:=now()+interval '5 minutes';
  insert into public.match_proposals(club_id,event_id,court_id,format,side_a_player_ids,side_b_player_ids,queue_entry_ids,queue_version,policy_version,snapshot,request_id,created_by,expires_at)
  values(v_club,p_event_id,v_court,v_format,side_a_player_ids,side_b_player_ids,v_entries,v_queue_version,policy_version,jsonb_build_object('queueVersion',v_queue_version,'queueEntryIds',v_entries),p_idempotency_key,v_actor,expires_at) returning id into proposal_id;
  insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,after_state) values(auth.uid(),'match.proposed','match_proposal',proposal_id,v_club,p_idempotency_key,jsonb_build_object('policyVersion',policy_version));
  return next;
end $$;

create or replace function public.confirm_match_proposal(p_proposal_id uuid,p_expected_event_queue_version bigint,p_idempotency_key uuid)
returns table(match_id uuid,assignment_version bigint) language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_actor uuid:=public.current_player_id();v_p public.match_proposals%rowtype;v_event public.events%rowtype;v_match uuid;v_pid uuid;v_index int;
begin
  select * into v_p from public.match_proposals where id=p_proposal_id for update;
  if v_p.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
  if not private.has_club_role(v_p.club_id,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  if v_p.status='confirmed' then select m.id,m.version into match_id,assignment_version from public.matches m where m.proposal_id=v_p.id;return next;return;end if;
  if v_p.status<>'pending' or v_p.expires_at<=now() then raise exception using errcode='P0001',detail='INVALID_STATE_TRANSITION';end if;
  select * into v_event from public.events where id=v_p.event_id for update;
  if v_event.queue_version<>p_expected_event_queue_version or v_p.queue_version<>p_expected_event_queue_version then raise exception using errcode='P0001',detail='STALE_VERSION';end if;
  perform 1 from public.event_courts where id=v_p.court_id and event_id=v_p.event_id and status='available' and current_match_id is null for update;
  if not found then raise exception using errcode='P0001',detail='COURT_CONFLICT';end if;
  perform 1 from public.event_queue_entries where id=any(v_p.queue_entry_ids) and event_id=v_p.event_id and state='ready' order by id for update;
  if (select count(*) from public.event_queue_entries where id=any(v_p.queue_entry_ids) and state='ready')<>cardinality(v_p.queue_entry_ids) then raise exception using errcode='P0001',detail='PLAYER_CONFLICT';end if;
  if exists(select 1 from unnest(v_p.side_a_player_ids||v_p.side_b_player_ids) pid join public.match_participants mp on mp.player_id=pid and mp.event_id=v_p.event_id and mp.active) then raise exception using errcode='P0001',detail='PLAYER_CONFLICT';end if;
  insert into public.matches(club_id,event_id,court_id,proposal_id,format,record_class,policy_version,created_by) values(v_p.club_id,v_p.event_id,v_p.court_id,v_p.id,v_p.format,v_event.record_class,v_p.policy_version,v_actor) returning id,version into v_match,assignment_version;
  v_index:=0;foreach v_pid in array v_p.side_a_player_ids loop v_index:=v_index+1;insert into public.match_participants(match_id,event_id,player_id,side,position) values(v_match,v_p.event_id,v_pid,1,v_index);end loop;
  v_index:=0;foreach v_pid in array v_p.side_b_player_ids loop v_index:=v_index+1;insert into public.match_participants(match_id,event_id,player_id,side,position) values(v_match,v_p.event_id,v_pid,2,v_index);end loop;
  update public.event_queue_entries set state='assigned',assigned_match_id=v_match,version=version+1 where id=any(v_p.queue_entry_ids);
  update public.event_courts set status='reserved',current_match_id=v_match,version=version+1 where id=v_p.court_id;
  update public.match_proposals set status='confirmed',match_id=v_match,version=version+1 where id=v_p.id;
  update public.events set queue_version=queue_version+1 where id=v_p.event_id;
  match_id:=v_match;
  insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,after_state) values(auth.uid(),'match.assigned','match',v_match,v_p.club_id,p_idempotency_key,jsonb_build_object('proposalId',v_p.id,'courtId',v_p.court_id));
  return next;
exception when unique_violation then raise exception using errcode='P0001',detail='RESOURCE_CONFLICT';end $$;

create or replace function public.cancel_match_assignment(p_match_id uuid,p_reason text,p_idempotency_key uuid)
returns table(match_id uuid,status public.match_status,assignment_version bigint) language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_match public.matches%rowtype;v_actor uuid:=public.current_player_id();
begin
  select * into v_match from public.matches where id=p_match_id for update;
  if v_match.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
  if not private.has_club_role(v_match.club_id,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  if v_match.status='canceled' then match_id:=v_match.id;status:=v_match.status;assignment_version:=v_match.version;return next;return;end if;
  if v_match.status not in('assigned','playing') then raise exception using errcode='P0001',detail='INVALID_STATE_TRANSITION';end if;
  update public.matches set status='canceled',canceled_by=v_actor,cancellation_reason=p_reason,version=version+1 where id=v_match.id returning id,public.matches.status,version into match_id,status,assignment_version;
  update public.match_participants set active=false where match_participants.match_id=v_match.id;
  update public.event_queue_entries set state='ready',assigned_match_id=null,version=version+1 where assigned_match_id=v_match.id;
  update public.event_courts set status='available',current_match_id=null,version=version+1 where current_match_id=v_match.id;
  update public.events set queue_version=queue_version+1 where id=v_match.event_id;
  insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,after_state) values(auth.uid(),'match.canceled','match',v_match.id,v_match.club_id,p_idempotency_key,jsonb_build_object('reason',p_reason));
  return next;
end $$;

revoke all on function public.generate_match_proposal(uuid,text,uuid),public.confirm_match_proposal(uuid,bigint,uuid),public.cancel_match_assignment(uuid,text,uuid) from public;
grant execute on function public.generate_match_proposal(uuid,text,uuid),public.confirm_match_proposal(uuid,bigint,uuid),public.cancel_match_assignment(uuid,text,uuid) to authenticated;
