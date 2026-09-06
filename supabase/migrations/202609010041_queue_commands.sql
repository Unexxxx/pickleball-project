create or replace function public.set_event_attendance(p_event_id uuid,p_player_id uuid,p_state text,p_reason text,p_idempotency_key uuid)
returns table(attendance_id uuid,state text,version bigint) language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_club uuid;v_actor uuid:=public.current_player_id();
begin
  select club_id into v_club from public.events where id=p_event_id for update;
  if v_actor is null then raise exception using errcode='P0001',detail='AUTH_REQUIRED';end if;
  if v_actor<>p_player_id and not private.has_club_role(v_club,array['owner','organizer','staff']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  if not exists(select 1 from public.event_registrations where event_id=p_event_id and player_id=p_player_id and status='confirmed') then raise exception using errcode='P0001',detail='INELIGIBLE';end if;
  insert into public.event_attendance(event_id,player_id,state,checked_in_at,checked_out_at,changed_by)
  values(p_event_id,p_player_id,p_state,case when p_state='checked_in' then now() end,case when p_state='checked_out' then now() end,v_actor)
  on conflict(event_id,player_id) do update set state=excluded.state,checked_in_at=case when excluded.state='checked_in' then coalesce(public.event_attendance.checked_in_at,now()) else public.event_attendance.checked_in_at end,checked_out_at=case when excluded.state='checked_out' then now() else null end,changed_by=v_actor,version=public.event_attendance.version+1
  returning id,public.event_attendance.state,public.event_attendance.version into attendance_id,state,version;
  insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,after_state) values(auth.uid(),'attendance.changed','attendance',attendance_id,v_club,p_idempotency_key,jsonb_build_object('state',state,'reason',p_reason));return next;
end $$;

create or replace function public.join_event_queue(p_event_id uuid,p_idempotency_key uuid)
returns table(queue_entry_id uuid,"position" bigint,version bigint) language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_player uuid:=public.current_player_id();v_club uuid;v_sequence bigint;
begin
  select club_id,queue_version+1 into v_club,v_sequence from public.events where id=p_event_id and status in('published','registration_closed','in_progress') for update;
  if v_player is null then raise exception using errcode='P0001',detail='AUTH_REQUIRED';end if;
  perform 1 from public.event_attendance where event_id=p_event_id and player_id=v_player and state='checked_in' for update;
  if not found then raise exception using errcode='P0001',detail='INELIGIBLE';end if;
  update public.events set queue_version=v_sequence where id=p_event_id;
  insert into public.event_queue_entries(club_id,event_id,player_id,position_sequence,position_key) values(v_club,p_event_id,v_player,v_sequence,v_sequence*1000) returning id,position_key,public.event_queue_entries.version into queue_entry_id,"position",version;
  insert into private.event_queue_history(queue_entry_id,to_state,new_position_key,actor_player_id,reason,request_id) values(queue_entry_id,'ready',"position",v_player,'player_joined',p_idempotency_key);return next;
exception when unique_violation then raise exception using errcode='P0001',detail='ALREADY_EXISTS';end $$;

create or replace function public.leave_event_queue(p_event_id uuid,p_reason text,p_idempotency_key uuid)
returns table(queue_entry_id uuid,state public.queue_entry_state,version bigint) language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_player uuid:=public.current_player_id();v_old bigint;
begin
  select position_key into v_old from public.event_queue_entries where event_id=p_event_id and player_id=v_player and public.event_queue_entries.state='ready' for update;
  update public.event_queue_entries set state='left' where event_id=p_event_id and player_id=v_player and public.event_queue_entries.state='ready' returning id,public.event_queue_entries.state,public.event_queue_entries.version+1 into queue_entry_id,state,version;
  if queue_entry_id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
  update public.events set queue_version=queue_version+1 where id=p_event_id;
  insert into private.event_queue_history(queue_entry_id,from_state,to_state,old_position_key,actor_player_id,reason,request_id) values(queue_entry_id,'ready','left',v_old,v_player,coalesce(nullif(p_reason,''),'player_left'),p_idempotency_key);return next;
end $$;

create or replace function public.adjust_event_queue(p_queue_entry_id uuid,p_expected_version bigint,p_before_entry_id uuid,p_reason text,p_idempotency_key uuid)
returns table(queue_entry_id uuid,"position" bigint,event_queue_version bigint) language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_club uuid;v_event uuid;v_old bigint;v_new bigint;v_actor uuid:=public.current_player_id();
begin
  select club_id,event_id,position_key into v_club,v_event,v_old from public.event_queue_entries where id=p_queue_entry_id and state='ready' and version=p_expected_version for update;
  if v_event is null then raise exception using errcode='P0001',detail='STALE_VERSION';end if;
  if not private.has_club_role(v_club,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  perform 1 from public.event_queue_entries where event_id=v_event and state='ready' for update;
  if p_before_entry_id is null then select coalesce(max(position_key),0)+1000 into v_new from public.event_queue_entries where event_id=v_event and state='ready';else select position_key-500 into v_new from public.event_queue_entries where id=p_before_entry_id and event_id=v_event and state='ready';end if;
  if v_new is null then raise exception using errcode='P0001',detail='TENANT_MISMATCH';end if;
  update public.event_queue_entries set position_key=v_new where id=p_queue_entry_id returning id,position_key into queue_entry_id,"position";
  update public.events set queue_version=queue_version+1 where id=v_event returning queue_version into event_queue_version;
  insert into private.event_queue_history(queue_entry_id,from_state,to_state,old_position_key,new_position_key,actor_player_id,reason,request_id) values(queue_entry_id,'ready','ready',v_old,v_new,v_actor,p_reason,p_idempotency_key);return next;
exception when unique_violation then raise exception using errcode='P0001',detail='STALE_VERSION';end $$;

revoke all on function public.set_event_attendance(uuid,uuid,text,text,uuid),public.join_event_queue(uuid,uuid),public.leave_event_queue(uuid,text,uuid),public.adjust_event_queue(uuid,bigint,uuid,text,uuid) from public;
grant execute on function public.set_event_attendance(uuid,uuid,text,text,uuid),public.join_event_queue(uuid,uuid),public.leave_event_queue(uuid,text,uuid),public.adjust_event_queue(uuid,bigint,uuid,text,uuid) to authenticated;
