create or replace function public.organizer_checkout_player(
  p_event_id uuid,
  p_player_id uuid,
  p_idempotency_key uuid
)
returns table(attendance_id uuid, queue_entry_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.events%rowtype;
  v_actor uuid := public.current_player_id();
  v_entry public.event_queue_entries%rowtype;
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

  select entry.* into v_entry
  from public.event_queue_entries entry
  where entry.event_id = p_event_id
    and entry.player_id = p_player_id
    and entry.state in ('ready', 'assigned')
  order by entry.joined_at desc
  limit 1
  for update;

  if v_entry.state = 'assigned' then
    raise exception using errcode = 'P0001', detail = 'PLAYER_ASSIGNED';
  end if;

  insert into public.event_attendance(
    event_id, player_id, state, checked_out_at, changed_by
  ) values (
    p_event_id, p_player_id, 'checked_out', now(), v_actor
  )
  on conflict(event_id, player_id) do update
  set state = 'checked_out',
      checked_out_at = now(),
      changed_by = v_actor,
      version = public.event_attendance.version + 1
  returning id into attendance_id;

  update public.events
  set queue_version = queue_version + 1
  where id = p_event_id;

  if v_entry.id is not null then
    update public.event_queue_entries entry
    set state = 'left', version = version + 1
    where entry.id = v_entry.id;
    queue_entry_id := v_entry.id;

    insert into private.event_queue_history(
      queue_entry_id, from_state, to_state, old_position_key,
      actor_player_id, reason, request_id
    ) values (
      v_entry.id, 'ready', 'left', v_entry.position_key,
      v_actor, 'organizer_checkout', p_idempotency_key
    );
  end if;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id,
    club_id, request_id, after_state
  ) values (
    auth.uid(), 'attendance.checked_out', 'attendance', attendance_id,
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

comment on function public.organizer_checkout_player(uuid, uuid, uuid) is
  'Checks out an unassigned player and removes their ready entry, including legacy queue rows without attendance.';
