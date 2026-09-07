-- A single database selector owns previews and assignments. Queue positions
-- represent saved team slots first, followed by the unreserved bench.
alter table public.event_queue_entries add column rotation_skips integer not null default 0;
create table private.event_rotation_lineups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  ordinal bigint generated always as identity,
  entry_ids uuid[] not null,
  metrics jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index on private.event_rotation_lineups(event_id, ordinal);
revoke all on private.event_rotation_lineups from public, anon, authenticated;

-- Pure, deterministic selector. The candidate pool and mandatory fairness
-- slots are supplied by the transactional reservation function below.
create function private.select_rotation_v3(p_candidates jsonb, p_pairs jsonb, p_required integer, p_forced uuid[])
returns jsonb language sql immutable set search_path = pg_catalog, public, private as $$
with candidates as (
  select (v->>'id')::uuid id, ordinality::integer n,
    (v->>'rating')::numeric rating, (v->>'winRate')::numeric win_rate,
    (v->>'rank')::numeric rank_value
  from jsonb_array_elements(p_candidates) with ordinality as c(v,ordinality)
), groups as (
  select array[a.id,b.id,c.id,d.id] ids
  from candidates a join candidates b on b.n>a.n
  join candidates c on c.n>b.n join candidates d on d.n>c.n
  where p_required=4 and array[a.id,b.id,c.id,d.id] @> p_forced
  union all
  select array[a.id,b.id] from candidates a join candidates b on b.n>a.n
  where p_required=2 and array[a.id,b.id] @> p_forced
), partitions as (
  select ids, array[ids[1],ids[k]] side_a,
    array(select x from unnest(ids) x where x<>ids[1] and x<>ids[k] order by x) side_b
  from groups cross join generate_series(2,4) k where p_required=4
  union all select ids,array[ids[1]],array[ids[2]] from groups where p_required=2
), metrics as (
  select p.*,
    abs((select avg(rating) from candidates where id=any(p.side_a))-(select avg(rating) from candidates where id=any(p.side_b))) rating_gap,
    abs((select avg(win_rate) from candidates where id=any(p.side_a))-(select avg(win_rate) from candidates where id=any(p.side_b))) win_gap,
    abs((select avg(rank_value) from candidates where id=any(p.side_a))-(select avg(rank_value) from candidates where id=any(p.side_b))) rank_gap,
    (select sum(n) from candidates where id=any(p.ids)) wait_cost,
    coalesce((select sum(coalesce((p_pairs->(least(x::text,y::text)||':'||greatest(x::text,y::text))->>'teammates')::integer,0))
      from unnest(p.ids) x cross join unnest(p.ids) y where x<y and ((x=any(p.side_a) and y=any(p.side_a)) or (x=any(p.side_b) and y=any(p.side_b)))),0) teammate_cost,
    coalesce((select sum(coalesce((p_pairs->(least(x::text,y::text)||':'||greatest(x::text,y::text))->>'opponents')::integer,0))
      from unnest(p.side_a) x cross join unnest(p.side_b) y),0) opponent_cost,
    coalesce((select sum(coalesce((p_pairs->(least(x::text,y::text)||':'||greatest(x::text,y::text))->>'recent')::integer,0))
      from unnest(p.ids) x cross join unnest(p.ids) y where x<y),0) recent_cost
  from partitions p
), scored as (
  select *,
    greatest(0,rating_gap/100-1)+greatest(0,win_gap/0.15-1)+greatest(0,rank_gap/0.20-1) balance_excess,
    rating_gap/100+win_gap/0.15+rank_gap/0.20 balance_cost
  from metrics
)
select jsonb_build_object(
  'entryIds', (select jsonb_agg(id order by side,n) from (
    select id,1 side,n from unnest(side_a) with ordinality c(id,n)
    union all select id,2,n from unnest(side_b) with ordinality c(id,n)
  ) ordered),
  'policyVersion','matchmaking-v3','ratingDifference',rating_gap,
  'winRateDifference',win_gap,'rankPercentileDifference',rank_gap,
  'recentEncounterPenalty',recent_cost,'teammateRepeats',teammate_cost,
  'opponentRepeats',opponent_cost,'balanceExcess',balance_excess
)
from scored order by balance_excess, recent_cost, teammate_cost, opponent_cost,
  balance_cost,wait_cost,side_a::text,side_b::text limit 1
$$;
revoke all on function private.select_rotation_v3(jsonb,jsonb,integer,uuid[]) from public,anon,authenticated;

create function private.refresh_event_rotation(p_event_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  v_event public.events%rowtype; v_required integer; v_slot record;
  v_candidates jsonb; v_pairs jsonb; v_choice jsonb; v_ids uuid[]; v_forced uuid[];
  v_saved uuid[]; v_order uuid[]; v_current uuid[]; v_base bigint; v_id uuid; v_i integer;
begin
  select * into v_event from public.events where id=p_event_id for update;
  if v_event.id is null then return; end if;
  if v_event.status<>'in_progress' then
    delete from private.event_rotation_lineups where event_id=p_event_id;
    return;
  end if;
  v_required:=case when 'singles'=any(v_event.formats) and not 'doubles'=any(v_event.formats) then 2 else 4 end;
  -- Assigned lineups have departed. Checked-out members invalidate only their
  -- own slot; remaining members retain priority when that slot is refilled.
  for v_slot in select * from private.event_rotation_lineups where event_id=p_event_id order by ordinal loop
    select array_agg(id order by array_position(v_slot.entry_ids,id)) into v_ids
    from public.event_queue_entries where id=any(v_slot.entry_ids) and state='ready';
    if coalesce(cardinality(v_ids),0)=0 then
      delete from private.event_rotation_lineups where id=v_slot.id;
    elsif v_ids is distinct from v_slot.entry_ids then
      update private.event_rotation_lineups set entry_ids=v_ids where id=v_slot.id;
    end if;
  end loop;
  if (select count(*) from private.event_rotation_lineups where event_id=p_event_id and cardinality(entry_ids)=v_required)=2 then return;end if;

  -- Include every prior encounter, and the last three personal appearances
  -- for each player, including matches currently on court.
  with appearances as (
    select mp.*, row_number() over(partition by mp.player_id order by m.assigned_at desc,m.id desc) personal_turn
    from public.match_participants mp join public.matches m on m.id=mp.match_id
    where m.event_id=p_event_id and m.status not in ('canceled','voided')
  ), pairs as (
    select least(qa.id::text,qb.id::text)||':'||greatest(qa.id::text,qb.id::text) key,
      count(*) filter(where a.side=b.side) teammates,
      count(*) filter(where a.side<>b.side) opponents,
      count(*) filter(where a.personal_turn<=3 or b.personal_turn<=3) recent
    from appearances a join appearances b on a.match_id=b.match_id and a.player_id<b.player_id
    join public.event_queue_entries qa on qa.player_id=a.player_id and qa.event_id=p_event_id and qa.state='ready'
    join public.event_queue_entries qb on qb.player_id=b.player_id and qb.event_id=p_event_id and qb.state='ready'
    group by 1
  ) select coalesce(jsonb_object_agg(key,jsonb_build_object('teammates',teammates,'opponents',opponents,'recent',recent)),'{}') into v_pairs from pairs;

  -- Fill two slots only. Existing complete slots are never reshuffled.
  for v_i in 1..2 loop
    select * into v_slot from private.event_rotation_lineups where event_id=p_event_id order by ordinal offset v_i-1 limit 1;
    if found and cardinality(v_slot.entry_ids)=v_required then continue; end if;
    v_forced:=coalesce(v_slot.entry_ids,'{}'::uuid[]);
    select coalesce(array_agg(entry_id),'{}') into v_saved
      from private.event_rotation_lineups l cross join unnest(l.entry_ids) entry_id
      where l.event_id=p_event_id and (v_slot.id is null or l.id<>v_slot.id);

    with event_stats as (
      select mp.player_id,count(*) games,
        count(*) filter(where r.status in ('pending_confirmation','finalized') and rr.winner_side=mp.side) wins,
        count(*) filter(where r.status in ('pending_confirmation','finalized') and rr.winner_side<>mp.side) losses
      from public.match_participants mp join public.matches m on m.id=mp.match_id
      left join public.match_results r on r.match_id=m.id
      left join public.result_revisions rr on rr.id=r.current_revision_id
      where m.event_id=p_event_id and m.status not in ('canceled','voided') group by mp.player_id
    ), eligible as (
      select q.*, coalesce(es.games,0) games,coalesce(s.rating,1500) rating,
        (coalesce(es.wins,0)+1)::numeric/(coalesce(es.wins,0)+coalesce(es.losses,0)+2) win_rate,
        coalesce(lb.rank::numeric/nullif((select max(rank) from public.public_leaderboards where scope='overall'),0),0.5) rank_value
      from public.event_queue_entries q
      left join event_stats es on es.player_id=q.player_id
      left join public.player_statistics s on s.player_id=q.player_id
      left join public.public_leaderboards lb on lb.player_id=q.player_id and lb.scope='overall'
      where q.event_id=p_event_id and q.state='ready' and not q.id=any(v_saved)
    ), pool as (
      select * from eligible order by (id=any(v_forced)) desc,(rotation_skips>=3) desc,
        case when rotation_skips>=3 then rotation_skips else 0 end desc,
        games,position_key,id limit 12
    ) select jsonb_agg(jsonb_build_object('id',id,'rating',rating,'winRate',win_rate,'rank',rank_value,'skips',rotation_skips)
      order by (id=any(v_forced)) desc,(rotation_skips>=3) desc,
        case when rotation_skips>=3 then rotation_skips else 0 end desc,games,position_key,id)
      into v_candidates from pool;
    if coalesce(jsonb_array_length(v_candidates),0)<v_required then
      -- An incomplete standby must not consume only part of a saved upcoming
      -- group in the UI. Release later slots and rebuild on the next refresh.
      if v_slot.id is not null and exists(select 1 from private.event_rotation_lineups where event_id=p_event_id and ordinal>v_slot.ordinal) then
        delete from private.event_rotation_lineups where event_id=p_event_id and ordinal>v_slot.ordinal;
        perform private.refresh_event_rotation(p_event_id);
        return;
      end if;
      exit;
    end if;
    -- Always take the highest-priority waiting player. Overdue players become
    -- mandatory up to available team slots; age continues growing for others.
    select array_agg(id) into v_forced from (
      select (v->>'id')::uuid id from jsonb_array_elements(v_candidates) with ordinality c(v,n)
      where (v->>'id')::uuid=any(v_forced) or (v->>'skips')::integer>=3 or n=1
      order by n limit v_required
    ) mandatory;
    v_choice:=private.select_rotation_v3(v_candidates,v_pairs,v_required,v_forced);
    if v_choice is null then exit; end if;
    select array_agg(x::uuid order by n) into v_ids from jsonb_array_elements_text(v_choice->'entryIds') with ordinality c(x,n);
    if v_slot.id is null then
      insert into private.event_rotation_lineups(event_id,entry_ids,metrics) values(p_event_id,v_ids,v_choice);
    else
      update private.event_rotation_lineups set entry_ids=v_ids,metrics=v_choice where id=v_slot.id;
    end if;
    update public.event_queue_entries set rotation_skips=case when id=any(v_ids) then 0 else rotation_skips+1 end
      where event_id=p_event_id and state='ready' and id in (
        select (v->>'id')::uuid from jsonb_array_elements(v_candidates) v
      );
    insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,after_state)
      values(auth.uid(),'rotation.reserved','event',p_event_id,v_event.club_id,v_choice);
  end loop;

  select coalesce(array_agg(entry_id order by l.ordinal,n),'{}') into v_saved
    from private.event_rotation_lineups l cross join unnest(l.entry_ids) with ordinality c(entry_id,n) where l.event_id=p_event_id;
  select v_saved||coalesce(array_agg(id order by position_key,id),'{}') into v_order
    from public.event_queue_entries where event_id=p_event_id and state='ready' and not id=any(v_saved);
  select array_agg(id order by position_key,id) into v_current from public.event_queue_entries where event_id=p_event_id and state='ready';
  if v_order is distinct from coalesce(v_current,'{}') then
    -- Two-pass relocation avoids unique position collisions, including swaps.
    select coalesce(max(abs(position_key)),0)+1000000 into v_base from public.event_queue_entries where event_id=p_event_id;
    for v_i in 1..coalesce(cardinality(v_order),0) loop
      update public.event_queue_entries set position_key= -v_base-v_i,version=version+1 where id=v_order[v_i];
    end loop;
    for v_i in 1..coalesce(cardinality(v_order),0) loop
      update public.event_queue_entries set position_key=v_base+v_i*1000,version=version+1 where id=v_order[v_i];
    end loop;
  end if;
end $$;
revoke all on function private.refresh_event_rotation(uuid) from public,anon,authenticated;

create function private.refresh_rotation_trigger() returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
begin
  perform private.refresh_event_rotation(coalesce(new.event_id,old.event_id));
  return null;
end $$;
revoke all on function private.refresh_rotation_trigger() from public,anon,authenticated;
create constraint trigger refresh_rotation_after_queue
after insert or update of state or delete on public.event_queue_entries
deferrable initially deferred for each row execute function private.refresh_rotation_trigger();

create function private.refresh_rotation_event_trigger() returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
begin perform private.refresh_event_rotation(new.id);return null;end $$;
revoke all on function private.refresh_rotation_event_trigger() from public,anon,authenticated;
create constraint trigger refresh_rotation_after_event
after update of status on public.events deferrable initially deferred
for each row when(old.status is distinct from new.status) execute function private.refresh_rotation_event_trigger();

-- The existing proposal/confirmation code continues enforcing subscription,
-- identity, resource locks and idempotency. Its sides are replaced by saved slots.
alter function public.generate_match_proposal(uuid,text,uuid) rename to generate_match_proposal_v2;
revoke all on function public.generate_match_proposal_v2(uuid,text,uuid) from public,anon,authenticated;
create function public.generate_match_proposal(p_event_id uuid,p_format text,p_idempotency_key uuid)
returns table(proposal_id uuid,side_a_player_ids uuid[],side_b_player_ids uuid[],court_id uuid,policy_version text,expires_at timestamptz)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_slot private.event_rotation_lineups%rowtype; v_p record; v_players uuid[]; v_size integer;
begin
  if not exists(select 1 from public.events e where e.id=p_event_id and e.status='in_progress'
    and private.has_club_role(e.club_id,array['owner','organizer']::public.club_role[])) then
    raise exception using errcode='P0001',detail='PERMISSION_DENIED';
  end if;
  perform private.refresh_event_rotation(p_event_id);
  select * into v_slot from private.event_rotation_lineups where event_id=p_event_id order by ordinal limit 1;
  v_size:=case when p_format='singles' then 1 else 2 end;
  if cardinality(v_slot.entry_ids) is distinct from v_size*2 then raise exception using errcode='P0001',detail='INSUFFICIENT_PLAYERS';end if;
  if exists(select 1 from public.event_queue_entries q where q.id=any(v_slot.entry_ids)
    and not exists(select 1 from public.accounts a where a.player_id=q.player_id and a.contact_verified_at is not null)) then
    raise exception using errcode='P0001',detail='PLAYER_NOT_VERIFIED';
  end if;
  select * into v_p from public.generate_match_proposal_v2(p_event_id,p_format,p_idempotency_key);
  if exists(select 1 from public.match_proposals where id=v_p.proposal_id and status='confirmed') then
    return query select v_p.proposal_id,v_p.side_a_player_ids,v_p.side_b_player_ids,v_p.court_id,v_p.policy_version,v_p.expires_at;return;
  end if;
  select array_agg(player_id order by array_position(v_slot.entry_ids,id)) into v_players from public.event_queue_entries where id=any(v_slot.entry_ids);
  update public.match_proposals p set side_a_player_ids=v_players[1:v_size],side_b_player_ids=v_players[v_size+1:v_size*2],
    policy_version='matchmaking-v3',snapshot=p.snapshot||v_slot.metrics where p.id=v_p.proposal_id;
  return query select p.id,p.side_a_player_ids,p.side_b_player_ids,p.court_id,p.policy_version,p.expires_at from public.match_proposals p where p.id=v_p.proposal_id;
end $$;
revoke all on function public.generate_match_proposal(uuid,text,uuid) from public,anon,authenticated;

create or replace function public.assign_next_queued_match(p_event_id uuid,p_format text,p_idempotency_key uuid)
returns table(match_id uuid,court_id uuid,assignment_version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_p record;v_version bigint;
begin
  perform 1 from public.events e where e.id=p_event_id
    and private.has_club_role(e.club_id,array['owner','organizer']::public.club_role[]) for update;
  if not found then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
  return query select m.id,m.court_id,m.version from public.matches m join public.match_proposals p on p.id=m.proposal_id
    where p.event_id=p_event_id and p.created_by=public.current_player_id() and p.request_id=p_idempotency_key;
  if found then return;end if;
  select * into v_p from public.generate_match_proposal(p_event_id,p_format,p_idempotency_key);
  select queue_version into v_version from public.match_proposals where id=v_p.proposal_id;
  return query select c.match_id,v_p.court_id,c.assignment_version from public.confirm_match_proposal(v_p.proposal_id,v_version,p_idempotency_key) c;
  perform private.refresh_event_rotation(p_event_id);
end $$;
revoke all on function public.assign_next_queued_match(uuid,text,uuid) from public,anon;
grant execute on function public.assign_next_queued_match(uuid,text,uuid) to authenticated;

alter function public.adjust_event_queue(uuid,bigint,uuid,text,uuid) rename to adjust_event_queue_v2;
revoke all on function public.adjust_event_queue_v2(uuid,bigint,uuid,text,uuid) from public,anon,authenticated;
create function public.adjust_event_queue(p_queue_entry_id uuid,p_expected_version bigint,p_before_entry_id uuid,p_reason text,p_idempotency_key uuid)
returns table(queue_entry_id uuid,"position" bigint,event_queue_version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_event uuid;
begin
  select event_id into v_event from public.event_queue_entries where id=p_queue_entry_id;
  perform 1 from public.events where id=v_event for update;
  if exists(select 1 from private.event_rotation_lineups where event_id=v_event and (p_queue_entry_id=any(entry_ids) or p_before_entry_id=any(entry_ids))) then
    raise exception using errcode='P0001',detail='NOT_IN_BENCH';
  end if;
  return query select * from public.adjust_event_queue_v2(p_queue_entry_id,p_expected_version,p_before_entry_id,p_reason,p_idempotency_key);
end $$;
revoke all on function public.adjust_event_queue(uuid,bigint,uuid,text,uuid) from public,anon;
grant execute on function public.adjust_event_queue(uuid,bigint,uuid,text,uuid) to authenticated;

-- Keep explicit organizer replacements in their exact saved team slot.
alter function public.replace_standby_player(uuid,text,uuid,uuid,bigint,text,uuid) rename to replace_standby_player_v2;
revoke all on function public.replace_standby_player_v2(uuid,text,uuid,uuid,bigint,text,uuid) from public,anon,authenticated;
create function public.replace_standby_player(p_event_id uuid,p_format text,p_outgoing_entry_id uuid,p_replacement_entry_id uuid,p_expected_queue_version bigint,p_reason text,p_idempotency_key uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_version bigint;
begin
  v_version:=public.replace_standby_player_v2(p_event_id,p_format,p_outgoing_entry_id,p_replacement_entry_id,p_expected_queue_version,p_reason,p_idempotency_key);
  update private.event_rotation_lineups set entry_ids=array(
    select case when x=p_outgoing_entry_id then p_replacement_entry_id when x=p_replacement_entry_id then p_outgoing_entry_id else x end from unnest(entry_ids) x
  ), metrics=metrics||jsonb_build_object('organizerOverride',true) where event_id=p_event_id;
  return v_version;
end $$;
revoke all on function public.replace_standby_player(uuid,text,uuid,uuid,bigint,text,uuid) from public,anon;
grant execute on function public.replace_standby_player(uuid,text,uuid,uuid,bigint,text,uuid) to authenticated;

insert into private.rule_versions(domain,version,parameters,active_from) values('matchmaking','matchmaking-v3',
  '{"pool":12,"mandatoryAfterSkippedReservations":3,"personalRecencyMatches":3,"history":"whole_event","provisionalWinRate":"(wins+1)/(wins+losses+2)","ratingTolerance":100,"winRateTolerance":0.15,"rankPercentileTolerance":0.20,"persistedSlots":2}',now());
-- Bootstrap only running events; no historical matches or scores are changed.
do $$ declare e record; begin
  for e in select id from public.events where status='in_progress' loop perform private.refresh_event_rotation(e.id); end loop;
end $$;
