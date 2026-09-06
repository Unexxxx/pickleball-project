create or replace function public.adjust_event_queue(
  p_queue_entry_id uuid,
  p_expected_version bigint,
  p_before_entry_id uuid,
  p_reason text,
  p_idempotency_key uuid
)
returns table(queue_entry_id uuid, "position" bigint, event_queue_version bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_club uuid;
  v_event uuid;
  v_old bigint;
  v_other_old bigint;
  v_temporary bigint;
  v_actor uuid := public.current_player_id();
begin
  select entry.club_id, entry.event_id, entry.position_key
  into v_club, v_event, v_old
  from public.event_queue_entries entry
  where entry.id = p_queue_entry_id
    and entry.state = 'ready'
    and entry.version = p_expected_version
  for update;
  if v_event is null then
    raise exception using errcode = 'P0001', detail = 'STALE_VERSION';
  end if;
  if not private.has_club_role(v_club, array['owner','organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  perform 1 from public.event_queue_entries entry
  where entry.event_id = v_event and entry.state = 'ready'
  order by entry.id for update;

  if p_before_entry_id is null then
    select coalesce(max(entry.position_key), 0) + 1000
    into "position"
    from public.event_queue_entries entry
    where entry.event_id = v_event and entry.state = 'ready';
    update public.event_queue_entries
    set position_key = "position", version = version + 1
    where id = p_queue_entry_id;
  else
    select entry.position_key into v_other_old
    from public.event_queue_entries entry
    where entry.id = p_before_entry_id
      and entry.event_id = v_event
      and entry.state = 'ready';
    if v_other_old is null then
      raise exception using errcode = 'P0001', detail = 'TENANT_MISMATCH';
    end if;
    select coalesce(min(entry.position_key), 0) - 1000
    into v_temporary
    from public.event_queue_entries entry
    where entry.event_id = v_event and entry.state = 'ready';
    update public.event_queue_entries
    set position_key = v_temporary, version = version + 1
    where id = p_queue_entry_id;
    update public.event_queue_entries
    set position_key = v_old, version = version + 1
    where id = p_before_entry_id;
    update public.event_queue_entries
    set position_key = v_other_old, version = version + 1
    where id = p_queue_entry_id
    returning position_key into "position";
  end if;

  update public.events
  set queue_version = queue_version + 1
  where id = v_event
  returning queue_version into event_queue_version;
  queue_entry_id := p_queue_entry_id;
  insert into private.event_queue_history(
    queue_entry_id, from_state, to_state, old_position_key, new_position_key,
    actor_player_id, reason, request_id
  ) values (
    p_queue_entry_id, 'ready', 'ready', v_old, "position",
    v_actor, p_reason, p_idempotency_key
  );
  return next;
end
$$;

create or replace function public.replace_standby_player(
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
  v_outgoing_rank integer;
  v_replacement_rank integer;
  v_group_end integer;
  v_temporary_position bigint;
  v_version bigint;
begin
  select * into v_event from public.events event where event.id = p_event_id for update;
  if v_event.id is null then raise exception using errcode='P0001', detail='NOT_FOUND'; end if;
  if v_event.queue_version <> p_expected_queue_version then raise exception using errcode='P0001', detail='STALE_VERSION'; end if;
  if not private.has_club_role(v_event.club_id, array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001', detail='PERMISSION_DENIED'; end if;
  if p_format <> all(v_event.formats) then raise exception using errcode='P0001', detail='INVALID_FORMAT'; end if;
  if length(trim(p_reason)) < 3 then raise exception using errcode='P0001', detail='REASON_REQUIRED'; end if;
  if p_outgoing_entry_id = p_replacement_entry_id then raise exception using errcode='P0001', detail='INVALID_REPLACEMENT'; end if;
  v_required := case when p_format = 'singles' then 2 else 4 end;

  perform 1 from public.event_queue_entries entry
  where entry.id in (p_outgoing_entry_id, p_replacement_entry_id)
  order by entry.id for update;

  with ranked as (
    select entry.id, entry.position_key,
      row_number() over(order by entry.position_key, entry.joined_at, entry.id)::integer as queue_rank
    from public.event_queue_entries entry
    where entry.event_id = p_event_id and entry.state = 'ready'
  )
  select
    max(position_key) filter(where id = p_outgoing_entry_id),
    max(position_key) filter(where id = p_replacement_entry_id),
    max(queue_rank) filter(where id = p_outgoing_entry_id),
    max(queue_rank) filter(where id = p_replacement_entry_id)
  into v_outgoing_position, v_replacement_position, v_outgoing_rank, v_replacement_rank
  from ranked;
  if v_outgoing_position is null or v_replacement_position is null then raise exception using errcode='P0001', detail='STALE_VERSION'; end if;
  if v_outgoing_rank > v_required * 2 then raise exception using errcode='P0001', detail='NOT_IN_RESERVED_LINEUP'; end if;
  v_group_end := case when v_outgoing_rank <= v_required then v_required else v_required * 2 end;
  if v_replacement_rank <= v_group_end then raise exception using errcode='P0001', detail='REPLACEMENT_ALREADY_RESERVED'; end if;

  select coalesce(min(entry.position_key), 0) - 1000 into v_temporary_position
  from public.event_queue_entries entry
  where entry.event_id = p_event_id and entry.state = 'ready';
  update public.event_queue_entries set position_key = v_temporary_position, version = version + 1 where id = p_outgoing_entry_id;
  update public.event_queue_entries set position_key = v_outgoing_position, version = version + 1 where id = p_replacement_entry_id;
  update public.event_queue_entries set position_key = v_replacement_position, version = version + 1 where id = p_outgoing_entry_id;
  update public.events set queue_version = queue_version + 1 where id = p_event_id returning queue_version into v_version;

  insert into private.event_queue_history(
    queue_entry_id, from_state, to_state, old_position_key, new_position_key,
    actor_player_id, reason, request_id
  ) values
    (p_outgoing_entry_id, 'ready', 'ready', v_outgoing_position, v_replacement_position, v_actor, p_reason, p_idempotency_key),
    (p_replacement_entry_id, 'ready', 'ready', v_replacement_position, v_outgoing_position, v_actor, p_reason, p_idempotency_key);
  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state
  ) values (
    auth.uid(), 'queue.reserved_player_replaced', 'event', p_event_id, v_event.club_id,
    p_idempotency_key,
    jsonb_build_object('outgoingEntryId', p_outgoing_entry_id, 'replacementEntryId', p_replacement_entry_id, 'reason', p_reason, 'reservedGroupEnd', v_group_end)
  );
  return v_version;
end
$$;

revoke all on function public.adjust_event_queue(uuid, bigint, uuid, text, uuid) from public;
revoke all on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) from public;
grant execute on function public.adjust_event_queue(uuid, bigint, uuid, text, uuid) to authenticated;
grant execute on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) to authenticated;

comment on function public.adjust_event_queue(uuid, bigint, uuid, text, uuid) is
  'Atomically swaps adjacent ready queue positions without fractional position collisions.';
comment on function public.replace_standby_player(uuid, text, uuid, uuid, bigint, text, uuid) is
  'Atomically replaces a player in standby or the first upcoming lineup with a later eligible queue entry.';
