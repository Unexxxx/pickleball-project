alter table public.events
  add column map_url text,
  add column notes text,
  add constraint events_map_url_valid check (
    map_url is null
    or (length(map_url) <= 1000 and map_url ~ '^https://')
  ),
  add constraint events_notes_length check (
    notes is null or length(notes) <= 10000
  );

drop function public.create_event(
  uuid,
  public.event_type,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text[],
  public.record_class,
  public.event_status,
  boolean,
  text,
  uuid
);

create function public.create_event(
  p_club_id uuid,
  p_type public.event_type,
  p_name text,
  p_venue text,
  p_map_url text,
  p_notes text,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_capacity integer,
  p_court_count integer,
  p_formats text[],
  p_record_class public.record_class,
  p_initial_status public.event_status,
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
  if not private.has_club_role(
    p_club_id,
    array['owner', 'organizer']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;

  if p_initial_status not in ('draft', 'published') then
    raise exception using errcode = 'P0001', detail = 'INVALID_INITIAL_STATUS';
  end if;

  if p_map_url is not null and (
    length(p_map_url) > 1000 or p_map_url !~ '^https://'
  ) then
    raise exception using errcode = 'P0001', detail = 'INVALID_MAP_URL';
  end if;

  if p_notes is not null and length(p_notes) > 10000 then
    raise exception using errcode = 'P0001', detail = 'NOTES_TOO_LONG';
  end if;

  if p_is_private and (
    p_access_code is null
    or length(trim(p_access_code)) < 4
    or length(trim(p_access_code)) > 32
  ) then
    raise exception using errcode = 'P0001', detail = 'INVALID_ACCESS_CODE';
  end if;

  insert into public.events(
    club_id,
    type,
    name,
    venue,
    map_url,
    notes,
    starts_at,
    ends_at,
    capacity,
    formats,
    record_class,
    status,
    is_private,
    access_code_hash
  ) values (
    p_club_id,
    p_type,
    p_name,
    p_venue,
    nullif(trim(p_map_url), ''),
    nullif(trim(p_notes), ''),
    p_starts_at,
    p_ends_at,
    p_capacity,
    p_formats,
    p_record_class,
    p_initial_status,
    p_is_private,
    case
      when p_is_private then extensions.crypt(
        trim(p_access_code),
        extensions.gen_salt('bf')
      )
    end
  ) returning id into v_id;

  insert into public.event_courts(event_id, label)
  select v_id, 'Court ' || number
  from generate_series(1, p_court_count) number;

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
    'event.created',
    'event',
    v_id,
    p_club_id,
    p_idempotency_key,
    jsonb_build_object(
      'status', p_initial_status,
      'is_private', p_is_private,
      'has_map_url', p_map_url is not null,
      'has_notes', p_notes is not null
    )
  );

  return v_id;
end
$$;

revoke all on function public.create_event(
  uuid,
  public.event_type,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text[],
  public.record_class,
  public.event_status,
  boolean,
  text,
  uuid
) from public;

grant execute on function public.create_event(
  uuid,
  public.event_type,
  text,
  text,
  text,
  text,
  timestamptz,
  timestamptz,
  integer,
  integer,
  text[],
  public.record_class,
  public.event_status,
  boolean,
  text,
  uuid
) to authenticated;

drop function public.resolve_event_join(text);

create function public.resolve_event_join(p_join_code text)
returns table(
  id uuid,
  name text,
  venue text,
  map_url text,
  notes text,
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer,
  formats text[],
  record_class public.record_class,
  status public.event_status,
  is_private boolean,
  club_name text,
  club_slug text,
  event_type public.event_type,
  club_timezone text
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
    and event.status = 'published'
    and p_join_code ~ '^[a-f0-9]{18}$'
$$;

revoke all on function public.resolve_event_join(text) from public;
grant execute on function public.resolve_event_join(text) to anon, authenticated;
