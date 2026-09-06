create function private.requeue_finished_match_player()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_next_position bigint;
  v_actor uuid := public.current_player_id();
begin
  if old.state = 'assigned'
    and new.state = 'unavailable'
    and old.assigned_match_id is not null
    and exists (
      select 1 from public.matches match
      where match.id = old.assigned_match_id and match.status = 'score_pending'
    ) then
    perform 1 from public.events event where event.id = old.event_id for update;
    select event.queue_version * 1000000 + (
      select count(*) * 1000
      from public.match_participants participant
      join public.match_participants current_participant
        on current_participant.match_id = participant.match_id
       and current_participant.player_id = old.player_id
      where participant.match_id = old.assigned_match_id
        and (participant.side, participant.position, participant.player_id)
          <= (current_participant.side, current_participant.position, current_participant.player_id)
    )
    into v_next_position
    from public.events event
    where event.id = old.event_id;

    new.state := 'ready';
    new.position_key := v_next_position;
    new.assigned_match_id := null;
    new.joined_at := now();

    insert into private.event_queue_history(
      queue_entry_id,
      from_state,
      to_state,
      old_position_key,
      new_position_key,
      actor_player_id,
      reason,
      request_id
    ) values (
      old.id,
      old.state,
      'ready',
      old.position_key,
      v_next_position,
      coalesce(v_actor, old.player_id),
      'match_completed_returned_to_queue',
      gen_random_uuid()
    );
  end if;
  return new;
end
$$;

revoke all on function private.requeue_finished_match_player() from public, anon, authenticated;

create trigger queue_return_after_finished_match
before update of state on public.event_queue_entries
for each row execute function private.requeue_finished_match_player();

-- Repair only entries with audit evidence proving they were produced by the
-- earlier end-match implementation.
update public.events event
set queue_version = event.queue_version + 1
where exists (
  select 1
  from public.event_queue_entries entry
  join public.match_participants participant
    on participant.event_id = entry.event_id and participant.player_id = entry.player_id
  join public.match_results result on result.match_id = participant.match_id
  join private.audit_log audit
    on audit.aggregate_id = result.id and audit.action = 'match.ended_score_submitted'
  where entry.event_id = event.id
    and entry.state = 'unavailable'
    and not participant.active
);

insert into private.event_queue_history(
  queue_entry_id,
  from_state,
  to_state,
  old_position_key,
  new_position_key,
  actor_player_id,
  reason,
  request_id
)
select
  ranked.id,
  'unavailable',
  'ready',
  ranked.old_position,
  ranked.new_position,
  ranked.player_id,
  'repair_completed_match_rotation',
  gen_random_uuid()
from (
  select
    entry.id,
    entry.player_id,
    entry.position_key as old_position,
    coalesce((
      select max(ready.position_key)
      from public.event_queue_entries ready
      where ready.event_id = entry.event_id and ready.state = 'ready'
    ), 0) + row_number() over (
      partition by entry.event_id order by entry.updated_at, entry.position_sequence, entry.id
    ) * 1000 as new_position
  from public.event_queue_entries entry
  where entry.state = 'unavailable'
    and exists (
      select 1
      from public.match_participants participant
      join public.match_results result on result.match_id = participant.match_id
      join private.audit_log audit
        on audit.aggregate_id = result.id and audit.action = 'match.ended_score_submitted'
      where participant.event_id = entry.event_id
        and participant.player_id = entry.player_id
        and not participant.active
    )
) ranked;

with repaired as (
  select
    entry.id,
    coalesce((
      select max(ready.position_key)
      from public.event_queue_entries ready
      where ready.event_id = entry.event_id and ready.state = 'ready'
    ), 0) + row_number() over (
      partition by entry.event_id order by entry.updated_at, entry.position_sequence, entry.id
    ) * 1000 as new_position
  from public.event_queue_entries entry
  where entry.state = 'unavailable'
    and exists (
      select 1
      from public.match_participants participant
      join public.match_results result on result.match_id = participant.match_id
      join private.audit_log audit
        on audit.aggregate_id = result.id and audit.action = 'match.ended_score_submitted'
      where participant.event_id = entry.event_id
        and participant.player_id = entry.player_id
        and not participant.active
    )
)
update public.event_queue_entries entry
set state = 'ready',
    position_key = repaired.new_position,
    assigned_match_id = null,
    joined_at = now(),
    version = entry.version + 1
from repaired
where entry.id = repaired.id;

comment on function private.requeue_finished_match_player() is
  'Returns players from a scored match to the tail of the ready queue in deterministic order.';
