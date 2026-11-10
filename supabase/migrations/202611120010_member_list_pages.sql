-- Member lists that scale to clubs with thousands of members. Instead of
-- loading everyone, pages read 30 at a time ("Show more") and search the
-- whole club by name in the database.
--
-- Pages are ordered by name and continue after the last row shown (the
-- name plus an id breaks ties), so removing or approving someone never
-- skips or repeats a row the way page offsets would.

create or replace function private.like_pattern(p_query text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when nullif(btrim(coalesce(p_query, '')), '') is null then null
    else '%' || replace(replace(replace(btrim(p_query), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end
$$;

-- Header and Overview: how many people are in the club, and how many of the
-- regular members keep their profile private (they are counted, not named).
create function public.club_member_counts(p_club_id uuid)
returns table (members integer, private_members integer)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    count(*)::integer,
    count(*) filter (
      where m.role not in ('owner', 'organizer', 'staff')
        and not (p.visibility = 'public' and p.merged_into_player_id is null)
    )::integer
  from public.club_memberships m
  join public.players p on p.id = m.player_id
  where m.club_id = p_club_id and m.status = 'active'
$$;
revoke all on function public.club_member_counts(uuid) from public;
grant execute on function public.club_member_counts(uuid) to anon, authenticated;

-- Public list. 'staff': the owners and admins (private ones come back
-- without a name). 'members': everyone else with a public profile, a page
-- at a time. `total` is how many rows match, ignoring the page.
create function public.club_member_page(
  p_club_id uuid,
  p_scope text,
  p_query text default null,
  p_after_name text default null,
  p_after_id uuid default null,
  p_limit integer default 30
)
returns table (
  player_id uuid,
  display_name text,
  public_slug text,
  avatar_path text,
  role public.club_role,
  joined_at timestamptz,
  total bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_like text := private.like_pattern(p_query);
begin
  if p_scope = 'staff' then
    return query
    with matches as (
      select
        case when p.visibility = 'public' and p.merged_into_player_id is null then p.id end as pid,
        case when p.visibility = 'public' and p.merged_into_player_id is null then p.display_name end as pname,
        case when p.visibility = 'public' and p.merged_into_player_id is null then p.public_slug end as pslug,
        case when p.visibility = 'public' and p.merged_into_player_id is null then p.avatar_path end as pavatar,
        m.role as mrole,
        m.created_at as mjoined
      from public.club_memberships m
      join public.players p on p.id = m.player_id
      where m.club_id = p_club_id and m.status = 'active'
        and m.role in ('owner', 'organizer', 'staff')
    )
    select pid, pname, pslug, pavatar, mrole, mjoined, count(*) over ()
    from matches
    order by case mrole when 'owner' then 0 else 1 end, lower(pname) nulls last, pid
    limit v_limit;
  elsif p_scope = 'members' then
    return query
    with matches as (
      select p.id as pid, p.display_name as pname, p.public_slug as pslug,
             p.avatar_path as pavatar, m.role as mrole, m.created_at as mjoined
      from public.club_memberships m
      join public.players p on p.id = m.player_id
      where m.club_id = p_club_id and m.status = 'active'
        and m.role not in ('owner', 'organizer', 'staff')
        and p.visibility = 'public' and p.merged_into_player_id is null
        and (v_like is null or p.display_name ilike v_like)
    ),
    counted as (select count(*) as n from matches)
    select pid, pname, pslug, pavatar, mrole, mjoined, (select n from counted)
    from matches
    where p_after_name is null
       or (lower(pname), pid) > (lower(p_after_name), p_after_id)
    order by lower(pname), pid
    limit v_limit;
  else
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
end
$$;
revoke all on function public.club_member_page(uuid, text, text, text, uuid, integer) from public;
grant execute on function public.club_member_page(uuid, text, text, text, uuid, integer) to anon, authenticated;

-- Owners' and admins' list: 'staff', 'members' (private profiles included,
-- so they can be managed) or 'requests' (pending join requests).
create function public.club_roster_page(
  p_club_id uuid,
  p_scope text,
  p_query text default null,
  p_after_name text default null,
  p_after_id uuid default null,
  p_limit integer default 30
)
returns table (
  membership_id uuid,
  player_id uuid,
  display_name text,
  public_slug text,
  avatar_path text,
  role public.club_role,
  status public.membership_status,
  since timestamptz,
  total bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  v_like text := private.like_pattern(p_query);
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if p_scope not in ('staff', 'members', 'requests') then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
  return query
  with matches as (
    select m.id as mid, p.id as pid, p.display_name as pname, p.public_slug as pslug,
           p.avatar_path as pavatar, m.role as mrole, m.status as mstatus,
           case when m.status = 'requested' then m.updated_at else m.created_at end as msince
    from public.club_memberships m
    join public.players p on p.id = m.player_id
    where m.club_id = p_club_id
      and case p_scope
        when 'staff' then m.status = 'active' and m.role in ('owner', 'organizer', 'staff')
        when 'members' then m.status = 'active' and m.role not in ('owner', 'organizer', 'staff')
        else m.status = 'requested'
      end
      and (v_like is null or p.display_name ilike v_like)
  ),
  counted as (select count(*) as n from matches)
  select mid, pid, pname, pslug, pavatar, mrole, mstatus, msince, (select n from counted)
  from matches
  where p_scope = 'staff'
     or p_after_name is null
     or (lower(pname), mid) > (lower(p_after_name), p_after_id)
  order by case when p_scope = 'staff' and mrole = 'owner' then 0 else 1 end, lower(pname), mid
  limit v_limit;
end
$$;
revoke all on function public.club_roster_page(uuid, text, text, text, uuid, integer) from public, anon;
grant execute on function public.club_roster_page(uuid, text, text, text, uuid, integer) to authenticated;
