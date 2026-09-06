create function public.update_event_details(
  p_event_id uuid,
  p_expected_version bigint,
  p_name text,
  p_venue text,
  p_map_url text,
  p_notes text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
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
  select * into v_event
  from public.events
  where id = p_event_id
  for update;

  if v_event.id is null then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;

  if not private.has_club_role(
    v_event.club_id,
    array['owner', 'organizer']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;

  if v_event.status = 'canceled' then
    raise exception using errcode = 'P0001', detail = 'EVENT_CANCELED';
  end if;

  if p_ends_at <= p_starts_at then
    raise exception using errcode = 'P0001', detail = 'INVALID_SCHEDULE';
  end if;

  if p_capacity < 2 or p_capacity > 1000 then
    raise exception using errcode = 'P0001', detail = 'INVALID_CAPACITY';
  end if;

  if p_capacity < (
    select count(*) from public.event_registrations
    where event_id = p_event_id and status = 'confirmed'
  ) then
    raise exception using errcode = 'P0001', detail = 'CAPACITY_BELOW_CONFIRMED';
  end if;

  update public.events
  set name = trim(p_name),
      venue = trim(p_venue),
      map_url = nullif(trim(p_map_url), ''),
      notes = nullif(trim(p_notes), ''),
      starts_at = p_starts_at,
      ends_at = p_ends_at,
      capacity = p_capacity
  where id = p_event_id
    and version = p_expected_version
  returning version into v_version;

  if v_version is null then
    raise exception using errcode = 'P0001', detail = 'STALE_VERSION';
  end if;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    before_state,
    after_state
  ) values (
    auth.uid(),
    case
      when v_event.starts_at <> p_starts_at or v_event.ends_at <> p_ends_at
        then 'event.rescheduled'
      else 'event.updated'
    end,
    'event',
    p_event_id,
    v_event.club_id,
    p_idempotency_key,
    jsonb_build_object(
      'name', v_event.name,
      'venue', v_event.venue,
      'starts_at', v_event.starts_at,
      'ends_at', v_event.ends_at,
      'capacity', v_event.capacity
    ),
    jsonb_build_object(
      'name', trim(p_name),
      'venue', trim(p_venue),
      'starts_at', p_starts_at,
      'ends_at', p_ends_at,
      'capacity', p_capacity
    )
  );

  return v_version;
end
$$;

revoke all on function public.update_event_details(
  uuid, bigint, text, text, text, text, timestamptz, timestamptz, integer, uuid
) from public;
grant execute on function public.update_event_details(
  uuid, bigint, text, text, text, text, timestamptz, timestamptz, integer, uuid
) to authenticated;

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
  if not private.has_club_role(
    v_event.club_id,
    array['owner', 'organizer']::public.club_role[]
  ) then
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

  update public.events
  set status = p_transition
  where id = p_event_id and version = p_expected_version
  returning version into v_version;
  if v_version is null then
    raise exception using errcode = 'P0001', detail = 'STALE_VERSION';
  end if;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id,
    request_id, before_state, after_state
  ) values (
    auth.uid(), 'event.status_changed', 'event', p_event_id, v_event.club_id,
    p_idempotency_key, jsonb_build_object('status', v_event.status),
    jsonb_build_object('status', p_transition)
  );
  return v_version;
end
$$;

drop function public.resolve_event_join(text);
create function public.resolve_event_join(p_join_code text)
returns table(
  id uuid, name text, venue text, map_url text, notes text,
  starts_at timestamptz, ends_at timestamptz, capacity integer, formats text[],
  record_class public.record_class, status public.event_status,
  is_private boolean, club_name text, club_slug text,
  event_type public.event_type, club_timezone text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select event.id, event.name, event.venue, event.map_url, event.notes,
    event.starts_at, event.ends_at, event.capacity, event.formats,
    event.record_class, event.status, event.is_private, club.name, club.slug,
    event.type, club.timezone
  from public.events event
  join public.clubs club on club.id = event.club_id
  where event.join_code = p_join_code
    and event.status in ('published', 'canceled')
    and p_join_code ~ '^[a-f0-9]{18}$'
$$;
revoke all on function public.resolve_event_join(text) from public;
grant execute on function public.resolve_event_join(text) to anon, authenticated;
