create function public.replace_standby_player(
  p_event_id uuid,
  p_format text,
  p_outgoing_entry_id uuid,
  p_replacement_entry_id uuid,
  p_expected_queue_version bigint,
  p_reason text,
  p_idempotency_key uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event public.events%rowtype;
  v_actor uuid := public.current_player_id();
  v_required integer;
  v_outgoing_position bigint;
  v_replacement_position bigint;
  v_temporary_position bigint;
  v_version bigint;
begin
  select * into v_event from public.events event where event.id = p_event_id for update;
  if v_event.id is null then raise exception using errcode='P0001', detail='NOT_FOUND'; end if;
  if v_event.queue_version <> p_expected_queue_version then
    raise exception using errcode='P0001', detail='STALE_VERSION';
  end if;
  if not private.has_club_role(v_event.club_id, array['owner','organizer']::public.club_role[]) then
    raise exception using errcode='P0001', detail='PERMISSION_DENIED';
  end if;
  if p_format <> all(v_event.formats) then
    raise exception using errcode='P0001', detail='INVALID_FORMAT';
  end if;
  if length(trim(p_reason)) < 3 then
    raise exception using errcode='P0001', detail='REASON_REQUIRED';
  end if;
  if p_outgoing_entry_id = p_replacement_entry_id then
    raise exception using errcode='P0001', detail='INVALID_REPLACEMENT';
  end if;
  v_required := case when p_format = 'singles' then 2 else 4 end;

  perform 1
  from public.event_queue_entries entry
  where entry.id in (p_outgoing_entry_id, p_replacement_entry_id)
  order by entry.id
  for update;

  select entry.position_key into v_outgoing_position
  from public.event_queue_entries entry
  where entry.id = p_outgoing_entry_id and entry.event_id = p_event_id and entry.state = 'ready';
  select entry.position_key into v_replacement_position
  from public.event_queue_entries entry
  where entry.id = p_replacement_entry_id and entry.event_id = p_event_id and entry.state = 'ready';
  if v_outgoing_position is null or v_replacement_position is null then
    raise exception using errcode='P0001', detail='STALE_VERSION';
  end if;
  if not exists (
    select 1 from (
      select entry.id from public.event_queue_entries entry
      where entry.event_id = p_event_id and entry.state = 'ready'
      order by entry.position_key, entry.joined_at, entry.id limit v_required
    ) standby where standby.id = p_outgoing_entry_id
  ) then raise exception using errcode='P0001', detail='NOT_IN_STANDBY'; end if;
  if exists (
    select 1 from (
      select entry.id from public.event_queue_entries entry
      where entry.event_id = p_event_id and entry.state = 'ready'
      order by entry.position_key, entry.joined_at, entry.id limit v_required
    ) standby where standby.id = p_replacement_entry_id
  ) then raise exception using errcode='P0001', detail='REPLACEMENT_ALREADY_STANDBY'; end if;

  select coalesce(min(entry.position_key), 0) - 1000 into v_temporary_position
  from public.event_queue_entries entry
  where entry.event_id = p_event_id and entry.state = 'ready';
  update public.event_queue_entries entry
  set position_key = v_temporary_position, version = entry.version + 1
  where entry.id = p_outgoing_entry_id;
  update public.event_queue_entries entry
  set position_key = v_outgoing_position, version = entry.version + 1
  where entry.id = p_replacement_entry_id;
  update public.event_queue_entries entry
  set position_key = v_replacement_position, version = entry.version + 1
  where entry.id = p_outgoing_entry_id;
  update public.events event
  set queue_version = event.queue_version + 1
  where event.id = p_event_id returning event.queue_version into v_version;

  insert into private.event_queue_history(
    queue_entry_id, from_state, to_state, old_position_key, new_position_key,
    actor_player_id, reason, request_id
  ) values
    (p_outgoing_entry_id, 'ready', 'ready', v_outgoing_position, v_replacement_position, v_actor, p_reason, p_idempotency_key),
    (p_replacement_entry_id, 'ready', 'ready', v_replacement_position, v_outgoing_position, v_actor, p_reason, p_idempotency_key);
  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state
  ) values (
    auth.uid(), 'queue.standby_player_replaced', 'event', p_event_id, v_event.club_id,
    p_idempotency_key,
    jsonb_build_object('outgoingEntryId', p_outgoing_entry_id, 'replacementEntryId', p_replacement_entry_id, 'reason', p_reason)
  );
  return v_version;
end
$$;

revoke all on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) from public;
grant execute on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) to authenticated;

comment on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) is
  'Atomically swaps one standby player with a later ready player using optimistic queue versioning.';
