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
    event.access_code_hash
  into
    v_capacity,
    v_club_id,
    v_is_private,
    v_access_code_hash
  from public.events event
  where event.id = p_event_id
    and event.status = 'published'
    and now() between
      coalesce(event.registration_opens_at, '-infinity')
      and coalesce(event.registration_closes_at, 'infinity')
  for update;

  if v_capacity is null then
    raise exception using errcode = 'P0001', detail = 'EVENT_NOT_OPEN';
  end if;

  if v_is_private
    and not exists(
      select 1
      from public.club_memberships membership
      where membership.club_id = v_club_id
        and membership.player_id = v_player
        and membership.status in ('active', 'invited')
    )
    and (
      p_access_code is null
      or extensions.crypt(trim(p_access_code), v_access_code_hash) <> v_access_code_hash
    )
  then
    raise exception using errcode = 'P0001', detail = 'ACCESS_CODE_REQUIRED';
  end if;

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
    'registration.created',
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

revoke all on function public.register_for_event(uuid, text, text, uuid) from public;
grant execute on function public.register_for_event(uuid, text, text, uuid) to authenticated;
