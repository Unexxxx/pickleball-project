create or replace function public.transition_event(
  p_event_id uuid,
  p_expected_version bigint,
  p_transition public.event_status,
  p_idempotency_key uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.events%rowtype;
  v_version bigint;
begin
  select * into v_event from public.events where id = p_event_id for update;
  if v_event.id is null then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;
  if not private.has_club_role(v_event.club_id, array['owner','organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if not (
    (v_event.status = 'draft' and p_transition in ('published', 'canceled'))
    or (v_event.status = 'published' and p_transition in ('registration_closed', 'in_progress', 'canceled'))
    or (v_event.status = 'registration_closed' and p_transition in ('in_progress', 'canceled'))
    or (v_event.status = 'in_progress' and p_transition in ('completed', 'canceled'))
  ) then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  update public.events set status = p_transition
  where id = p_event_id and version = p_expected_version
  returning version into v_version;
  if v_version is null then
    raise exception using errcode = 'P0001', detail = 'STALE_VERSION';
  end if;
  insert into private.audit_log(actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, before_state, after_state)
  values(auth.uid(), 'event.status_changed', 'event', p_event_id, v_event.club_id, p_idempotency_key,
    jsonb_build_object('status', v_event.status), jsonb_build_object('status', p_transition));
  return v_version;
end
$$;

create function public.organizer_check_in_and_queue(
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
begin
  select * into v_event from public.events where id = p_event_id for update;
  if v_event.id is null or v_event.status <> 'in_progress' then
    raise exception using errcode = 'P0001', detail = 'EVENT_NOT_IN_PROGRESS';
  end if;
  if not private.has_club_role(v_event.club_id, array['owner','organizer','staff']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if not exists (
    select 1 from public.event_registrations
    where event_id = p_event_id and player_id = p_player_id and status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', detail = 'PLAYER_NOT_CONFIRMED';
  end if;

  insert into public.event_attendance(event_id, player_id, state, checked_in_at, changed_by)
  values(p_event_id, p_player_id, 'checked_in', now(), v_actor)
  on conflict(event_id, player_id) do update
    set state = 'checked_in', checked_in_at = coalesce(public.event_attendance.checked_in_at, now()), checked_out_at = null, changed_by = v_actor
  returning id into attendance_id;

  select entry.id, entry.position_key into queue_entry_id, queue_position
  from public.event_queue_entries entry
  where entry.event_id = p_event_id and entry.player_id = p_player_id and entry.state in ('ready', 'assigned')
  order by entry.joined_at desc limit 1;

  if queue_entry_id is null then
    update public.events set queue_version = queue_version + 1
    where id = p_event_id returning queue_version into queue_position;
    insert into public.event_queue_entries(club_id, event_id, player_id, position_sequence, position_key)
    values(v_event.club_id, p_event_id, p_player_id, queue_position, queue_position * 1000)
    returning id, position_key into queue_entry_id, queue_position;
    insert into private.event_queue_history(queue_entry_id, to_state, new_position_key, actor_player_id, reason, request_id)
    values(queue_entry_id, 'ready', queue_position, v_actor, 'organizer_check_in', p_idempotency_key);
  end if;

  insert into private.audit_log(actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state)
  values(auth.uid(), 'attendance.checked_in_and_queued', 'attendance', attendance_id, v_event.club_id, p_idempotency_key,
    jsonb_build_object('event_id', p_event_id, 'player_id', p_player_id, 'queue_entry_id', queue_entry_id));
  return next;
end
$$;

revoke all on function public.organizer_check_in_and_queue(uuid, uuid, uuid) from public;
grant execute on function public.organizer_check_in_and_queue(uuid, uuid, uuid) to authenticated;
