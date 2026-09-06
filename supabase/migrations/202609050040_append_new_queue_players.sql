create or replace function public.join_event_queue(
  p_event_id uuid,
  p_idempotency_key uuid
)
returns table(queue_entry_id uuid, "position" bigint, version bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_player uuid := public.current_player_id();
  v_club uuid;
  v_sequence bigint;
  v_position bigint;
begin
  select event.club_id
  into v_club
  from public.events event
  where event.id = p_event_id
    and event.status in ('published', 'registration_closed', 'in_progress')
  for update;
  if v_player is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;
  if v_club is null then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  perform 1
  from public.event_attendance attendance
  where attendance.event_id = p_event_id
    and attendance.player_id = v_player
    and attendance.state = 'checked_in'
  for update;
  if not found then
    raise exception using errcode = 'P0001', detail = 'INELIGIBLE';
  end if;

  select
    coalesce(max(entry.position_sequence), 0) + 1,
    coalesce(max(entry.position_key), 0) + 1000
  into v_sequence, v_position
  from public.event_queue_entries entry
  where entry.event_id = p_event_id;

  update public.events
  set queue_version = queue_version + 1
  where id = p_event_id;
  insert into public.event_queue_entries(
    club_id, event_id, player_id, position_sequence, position_key
  ) values (
    v_club, p_event_id, v_player, v_sequence, v_position
  )
  returning id, position_key, public.event_queue_entries.version
  into queue_entry_id, "position", version;
  insert into private.event_queue_history(
    queue_entry_id, to_state, new_position_key, actor_player_id, reason, request_id
  ) values (
    queue_entry_id, 'ready', "position", v_player, 'player_joined', p_idempotency_key
  );
  return next;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', detail = 'ALREADY_EXISTS';
end
$$;

create or replace function public.organizer_check_in_and_queue(
  p_event_id uuid,
  p_player_id uuid,
  p_idempotency_key uuid
)
returns table(attendance_id uuid, queue_entry_id uuid, queue_position bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.events%rowtype;
  v_actor uuid := public.current_player_id();
  v_sequence bigint;
begin
  select * into v_event
  from public.events event
  where event.id = p_event_id
  for update;
  if v_event.id is null or v_event.status <> 'in_progress' then
    raise exception using errcode = 'P0001', detail = 'EVENT_NOT_IN_PROGRESS';
  end if;
  if not private.has_club_role(
    v_event.club_id,
    array['owner','organizer','staff']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if not exists (
    select 1
    from public.event_registrations registration
    where registration.event_id = p_event_id
      and registration.player_id = p_player_id
      and registration.status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', detail = 'PLAYER_NOT_CONFIRMED';
  end if;

  insert into public.event_attendance(
    event_id, player_id, state, checked_in_at, changed_by
  ) values (
    p_event_id, p_player_id, 'checked_in', now(), v_actor
  )
  on conflict(event_id, player_id) do update
  set state = 'checked_in',
      checked_in_at = coalesce(public.event_attendance.checked_in_at, now()),
      checked_out_at = null,
      changed_by = v_actor
  returning id into attendance_id;

  select entry.id, entry.position_key
  into queue_entry_id, queue_position
  from public.event_queue_entries entry
  where entry.event_id = p_event_id
    and entry.player_id = p_player_id
    and entry.state in ('ready', 'assigned')
  order by entry.joined_at desc
  limit 1;

  if queue_entry_id is null then
    select
      coalesce(max(entry.position_sequence), 0) + 1,
      coalesce(max(entry.position_key), 0) + 1000
    into v_sequence, queue_position
    from public.event_queue_entries entry
    where entry.event_id = p_event_id;

    update public.events
    set queue_version = queue_version + 1
    where id = p_event_id;
    insert into public.event_queue_entries(
      club_id, event_id, player_id, position_sequence, position_key
    ) values (
      v_event.club_id, p_event_id, p_player_id, v_sequence, queue_position
    )
    returning id, position_key into queue_entry_id, queue_position;
    insert into private.event_queue_history(
      queue_entry_id, to_state, new_position_key, actor_player_id, reason, request_id
    ) values (
      queue_entry_id, 'ready', queue_position, v_actor, 'organizer_check_in', p_idempotency_key
    );
  end if;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state
  ) values (
    auth.uid(), 'attendance.checked_in_and_queued', 'attendance', attendance_id,
    v_event.club_id, p_idempotency_key,
    jsonb_build_object(
      'event_id', p_event_id,
      'player_id', p_player_id,
      'queue_entry_id', queue_entry_id
    )
  );
  return next;
end
$$;

revoke all on function public.join_event_queue(uuid, uuid) from public;
revoke all on function public.organizer_check_in_and_queue(uuid, uuid, uuid) from public;
grant execute on function public.join_event_queue(uuid, uuid) to authenticated;
grant execute on function public.organizer_check_in_and_queue(uuid, uuid, uuid) to authenticated;

comment on function public.join_event_queue(uuid, uuid) is
  'Appends a checked-in player after every existing queue entry without displacing reserved lineups.';
comment on function public.organizer_check_in_and_queue(uuid, uuid, uuid) is
  'Checks in a confirmed player and appends new queue entries to the queue tail.';
