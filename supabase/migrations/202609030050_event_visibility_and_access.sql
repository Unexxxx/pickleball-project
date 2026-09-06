alter table public.events
  add column is_private boolean not null default false,
  add column access_code_hash text;

alter table public.events
  add constraint private_event_access_code_required check (
    (not is_private and access_code_hash is null)
    or (is_private and access_code_hash is not null)
  );

-- Publish only the reported disposable-account event. Other historical drafts
-- remain untouched so unfinished events are not disclosed accidentally.
update public.events
set status = 'published'
where id = '74229049-2952-4fb3-9f2f-a4aee53ce941'
  and status = 'draft';

drop policy published_events_read on public.events;
create policy published_events_read
on public.events
for select
using (
  (status <> 'draft' and not is_private)
  or private.has_club_role(
    club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  )
  or (
    status <> 'draft'
    and is_private
    and exists(
      select 1 from public.club_memberships membership
      where membership.club_id = events.club_id
        and membership.player_id = public.current_player_id()
        and membership.status in ('active', 'invited')
    )
  )
);

drop policy courts_event_read on public.event_courts;
create policy courts_event_read
on public.event_courts
for select
using (exists(select 1 from public.events event where event.id = event_id));

drop function public.create_event(uuid, public.event_type, text, text, timestamptz, timestamptz, integer, integer, text[], public.record_class, uuid);
create function public.create_event(
  p_club_id uuid,
  p_type public.event_type,
  p_name text,
  p_venue text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_court_count integer,
  p_formats text[],
  p_record_class public.record_class,
  p_is_private boolean,
  p_access_code text,
  p_idempotency_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions
as $$
declare
  v_id uuid;
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if p_is_private and (p_access_code is null or length(trim(p_access_code)) < 4 or length(trim(p_access_code)) > 32) then
    raise exception using errcode = 'P0001', detail = 'INVALID_ACCESS_CODE';
  end if;
  insert into public.events(
    club_id, type, name, venue, starts_at, ends_at, capacity, formats,
    record_class, status, is_private, access_code_hash
  ) values (
    p_club_id, p_type, p_name, p_venue, p_starts_at, p_ends_at, p_capacity, p_formats,
    p_record_class, 'published', p_is_private,
    case when p_is_private then extensions.crypt(trim(p_access_code), extensions.gen_salt('bf')) end
  ) returning id into v_id;
  insert into public.event_courts(event_id, label)
  select v_id, 'Court ' || number from generate_series(1, p_court_count) number;
  insert into private.audit_log(actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state)
  values(auth.uid(), 'event.created', 'event', v_id, p_club_id, p_idempotency_key, jsonb_build_object('is_private', p_is_private));
  return v_id;
end
$$;

drop function public.register_for_event(uuid, text, uuid);
create function public.register_for_event(
  p_event_id uuid,
  p_terms_version text,
  p_access_code text,
  p_idempotency_key uuid
)
returns table(registration_id uuid, status public.registration_status, waitlist_position bigint)
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
    select 1 from public.accounts where player_id = v_player and contact_verified_at is not null
  ) then
    raise exception using errcode = 'P0001', detail = 'PLAYER_NOT_VERIFIED';
  end if;
  select capacity, club_id, is_private, access_code_hash
  into v_capacity, v_club_id, v_is_private, v_access_code_hash
  from public.events
  where id = p_event_id
    and status = 'published'
    and now() between coalesce(registration_opens_at, '-infinity') and coalesce(registration_closes_at, 'infinity')
  for update;
  if v_capacity is null then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  if v_is_private
    and not exists(
      select 1 from public.club_memberships membership
      where membership.club_id = v_club_id
        and membership.player_id = v_player
        and membership.status in ('active', 'invited')
    )
    and (p_access_code is null or extensions.crypt(trim(p_access_code), v_access_code_hash) <> v_access_code_hash)
  then
    raise exception using errcode = 'P0001', detail = 'ACCESS_CODE_REQUIRED';
  end if;
  select count(*) into v_count from public.event_registrations where event_id = p_event_id and status = 'confirmed';
  if v_count < v_capacity then
    v_status := 'confirmed';
  else
    v_status := 'waitlisted';
    select coalesce(max(registration.waitlist_position), 0) + 1 into v_position
    from public.event_registrations registration where registration.event_id = p_event_id;
  end if;
  insert into public.event_registrations(event_id, player_id, status, waitlist_position, terms_version)
  values(p_event_id, v_player, v_status, v_position, p_terms_version)
  returning id, public.event_registrations.status, public.event_registrations.waitlist_position
  into registration_id, status, waitlist_position;
  return next;
exception when unique_violation then
  raise exception using errcode = 'P0001', detail = 'ALREADY_EXISTS';
end
$$;

revoke all on function public.create_event(uuid, public.event_type, text, text, timestamptz, timestamptz, integer, integer, text[], public.record_class, boolean, text, uuid) from public;
grant execute on function public.create_event(uuid, public.event_type, text, text, timestamptz, timestamptz, integer, integer, text[], public.record_class, boolean, text, uuid) to authenticated;
revoke all on function public.register_for_event(uuid, text, text, uuid) from public;
grant execute on function public.register_for_event(uuid, text, text, uuid) to authenticated;

create function public.resolve_event_join(p_join_code text)
returns table(
  id uuid,
  name text,
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  formats text[],
  record_class public.record_class,
  status public.event_status,
  is_private boolean,
  club_name text,
  club_slug text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select event.id, event.name, event.venue, event.starts_at, event.ends_at,
    event.capacity, event.formats, event.record_class, event.status,
    event.is_private, club.name, club.slug
  from public.events event
  join public.clubs club on club.id = event.club_id
  where event.join_code = p_join_code
    and event.status = 'published'
    and p_join_code ~ '^[a-f0-9]{18}$'
$$;

revoke all on function public.resolve_event_join(text) from public;
grant execute on function public.resolve_event_join(text) to anon, authenticated;
