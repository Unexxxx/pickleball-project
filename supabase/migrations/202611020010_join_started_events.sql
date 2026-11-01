-- Joining a started event: players can still join (or ask to join) an event
-- that's in progress while it has a free spot. There's no waitlist once it
-- has started, so a full event turns new players away, and approving a
-- request needs a free spot too. Closed, ended and canceled events stay shut.

create or replace function public.register_for_event(
  p_event_id uuid,
  p_terms_version text,
  p_access_code text,
  p_idempotency_key uuid
)
returns table(
  registration_id uuid,
  status public.registration_status,
  waitlist_position bigint
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_player uuid := public.current_player_id();
  v_capacity integer;
  v_club_id uuid;
  v_is_private boolean;
  v_access_code_hash text;
  v_count integer;
  v_status public.registration_status;
  v_position bigint;
  v_live boolean;
begin
  if v_player is null or not exists(
    select 1
    from public.accounts account
    where account.player_id = v_player
      and account.contact_verified_at is not null
  ) then
    raise exception using errcode = 'P0001', detail = 'PLAYER_NOT_VERIFIED';
  end if;

  select
    event.capacity,
    event.club_id,
    event.is_private,
    event.access_code_hash,
    event.status = 'in_progress'
  into
    v_capacity,
    v_club_id,
    v_is_private,
    v_access_code_hash,
    v_live
  from public.events event
  where event.id = p_event_id
    and event.status in ('published', 'in_progress')
    and now() between
      coalesce(event.registration_opens_at, '-infinity')
      and coalesce(event.registration_closes_at, 'infinity')
  for update;

  if v_capacity is null then
    raise exception using errcode = 'P0001', detail = 'EVENT_NOT_OPEN';
  end if;

  if exists(
    select 1
    from public.event_registrations registration
    where registration.event_id = p_event_id
      and registration.player_id = v_player
      and registration.status in ('confirmed', 'waitlisted', 'requested')
  ) then
    raise exception using errcode = 'P0001', detail = 'ALREADY_REGISTERED';
  end if;

  -- Once it has started there's no waitlist: joining needs a free spot.
  if v_live and (
    select count(*)
    from public.event_registrations registration
    where registration.event_id = p_event_id
      and registration.status = 'confirmed'
  ) >= v_capacity then
    raise exception using errcode = 'P0001', detail = 'EVENT_FULL';
  end if;

  if v_is_private and (
    p_access_code is null
    or extensions.crypt(trim(p_access_code), v_access_code_hash) <> v_access_code_hash
  ) then
    raise exception using errcode = 'P0001', detail = 'ACCESS_CODE_REQUIRED';
  end if;

  if not v_is_private
    and not private.has_club_role(
      v_club_id,
      array['owner', 'organizer', 'staff']::public.club_role[]
    )
  then
    -- A declined request stays declined; staff can still add the player.
    if exists(
      select 1
      from public.event_registrations registration
      where registration.event_id = p_event_id
        and registration.player_id = v_player
        and registration.status = 'canceled'
    ) then
      raise exception using errcode = 'P0001', detail = 'REQUEST_DECLINED';
    end if;
    v_status := 'requested';
  else
    select count(*)
    into v_count
    from public.event_registrations registration
    where registration.event_id = p_event_id
      and registration.status = 'confirmed';

    if v_count < v_capacity then
      v_status := 'confirmed';
    else
      v_status := 'waitlisted';
      select coalesce(max(registration.waitlist_position), 0) + 1
      into v_position
      from public.event_registrations registration
      where registration.event_id = p_event_id
        and registration.status = 'waitlisted';
    end if;
  end if;

  insert into public.event_registrations(
    event_id,
    player_id,
    status,
    waitlist_position,
    terms_version
  ) values (
    p_event_id,
    v_player,
    v_status,
    v_position,
    p_terms_version
  )
  returning
    public.event_registrations.id,
    public.event_registrations.status,
    public.event_registrations.waitlist_position
  into registration_id, status, waitlist_position;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    after_state
  ) values (
    auth.uid(),
    case when v_status = 'requested'
      then 'registration.requested' else 'registration.created' end,
    'registration',
    registration_id,
    v_club_id,
    p_idempotency_key,
    jsonb_build_object('status', status)
  );

  return next;
exception
  when unique_violation then
    raise exception using errcode = 'P0001', detail = 'ALREADY_REGISTERED';
end
$$;

create or replace function public.review_event_registration(
  p_registration_id uuid,
  p_approve boolean
)
returns public.registration_status
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_event_id uuid;
  v_club_id uuid;
  v_capacity integer;
  v_status public.registration_status;
  v_next public.registration_status;
  v_position bigint;
  v_live boolean;
begin
  select registration.event_id, registration.status
  into v_event_id, v_status
  from public.event_registrations registration
  where registration.id = p_registration_id;

  select event.club_id, event.capacity, event.status = 'in_progress'
  into v_club_id, v_capacity, v_live
  from public.events event
  where event.id = v_event_id
  for update;

  if v_club_id is null or not private.has_club_role(
    v_club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;

  select registration.status into v_status
  from public.event_registrations registration
  where registration.id = p_registration_id
  for update;
  if v_status is distinct from 'requested' then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;

  if not p_approve then
    v_next := 'canceled';
  elsif (
    select count(*)
    from public.event_registrations registration
    where registration.event_id = v_event_id
      and registration.status = 'confirmed'
  ) < v_capacity then
    v_next := 'confirmed';
  elsif v_live then
    -- No waitlist once the event has started.
    raise exception using errcode = 'P0001', detail = 'EVENT_FULL';
  else
    v_next := 'waitlisted';
    select coalesce(max(registration.waitlist_position), 0) + 1
    into v_position
    from public.event_registrations registration
    where registration.event_id = v_event_id
      and registration.status = 'waitlisted';
  end if;

  update public.event_registrations
  set status = v_next, waitlist_position = v_position, version = version + 1
  where id = p_registration_id;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, after_state
  ) values (
    auth.uid(),
    case when p_approve then 'registration.approved' else 'registration.declined' end,
    'registration', p_registration_id, v_club_id,
    jsonb_build_object('status', v_next)
  );
  return v_next;
end
$$;
