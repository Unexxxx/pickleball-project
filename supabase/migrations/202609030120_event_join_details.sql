drop function if exists public.resolve_event_join(text);

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
  club_slug text,
  event_type public.event_type,
  club_timezone text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select event.id, event.name, event.venue, event.starts_at, event.ends_at,
    event.capacity, event.formats, event.record_class, event.status,
    event.is_private, club.name, club.slug, event.type, club.timezone
  from public.events event
  join public.clubs club on club.id = event.club_id
  where event.join_code = p_join_code
    and event.status = 'published'
    and p_join_code ~ '^[a-f0-9]{18}$'
$$;

revoke all on function public.resolve_event_join(text) from public;
grant execute on function public.resolve_event_join(text) to anon, authenticated;
