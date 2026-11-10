-- Club leaderboards for clubs of any size: 50 at a time ("Show more"),
-- search by name across everyone, "Members only" ranked in the database
-- (so a member ranked #250 overall still counts), and the signed-in
-- player's own position for the "Your rank" card.
--
-- Ranks come from public_leaderboards (unique, so they double as the page
-- cursor). "Members only" renumbers members 1, 2, 3… in the same order.
-- Search keeps each player's real rank.

create function private.club_leaderboard_rows(p_club_id uuid, p_members_only boolean)
returns table (
  rank bigint,
  player_id uuid,
  public_slug text,
  display_name text,
  rating numeric,
  wins integer,
  losses integer,
  win_rate numeric,
  calculation_version bigint,
  is_member boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with board as (
    select lb.*, exists(
      select 1 from public.club_memberships m
      where m.club_id = p_club_id and m.player_id = lb.player_id and m.status = 'active'
    ) as member
    from public.public_leaderboards lb
    where lb.scope = 'club' and lb.club_id = p_club_id
  )
  select
    case when p_members_only then row_number() over (order by b.rank) else b.rank end,
    b.player_id, b.public_slug, b.display_name, b.rating::numeric, b.wins::integer,
    b.losses::integer, b.win_rate::numeric, b.calculation_version::bigint, b.member
  from board b
  where not p_members_only or b.member
$$;
revoke all on function private.club_leaderboard_rows(uuid, boolean) from public, anon, authenticated;

create function public.club_leaderboard_page(
  p_club_id uuid,
  p_members_only boolean default false,
  p_query text default null,
  p_after_rank bigint default null,
  p_limit integer default 50
)
returns table (
  rank bigint,
  player_id uuid,
  public_slug text,
  display_name text,
  rating numeric,
  wins integer,
  losses integer,
  win_rate numeric,
  calculation_version bigint,
  is_member boolean,
  total bigint
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  v_like text := private.like_pattern(p_query);
begin
  return query
  with matches as (
    select r.* from private.club_leaderboard_rows(p_club_id, coalesce(p_members_only, false)) r
    where v_like is null or r.display_name ilike v_like
  ),
  counted as (select count(*) as n from matches)
  select m.rank, m.player_id, m.public_slug, m.display_name, m.rating, m.wins, m.losses,
         m.win_rate, m.calculation_version, m.is_member, (select n from counted)
  from matches m
  where p_after_rank is null or m.rank > p_after_rank
  order by m.rank
  limit v_limit;
end
$$;
revoke all on function public.club_leaderboard_page(uuid, boolean, text, bigint, integer) from public;
grant execute on function public.club_leaderboard_page(uuid, boolean, text, bigint, integer) to anon, authenticated;

-- The signed-in player's own row and how many are ranked, for "Your rank".
-- No row when they aren't ranked here (or their profile is private).
create function public.club_leaderboard_me(
  p_club_id uuid,
  p_members_only boolean default false
)
returns table (
  rank bigint,
  player_id uuid,
  public_slug text,
  display_name text,
  rating numeric,
  wins integer,
  losses integer,
  win_rate numeric,
  calculation_version bigint,
  is_member boolean,
  total bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with board as (
    select r.*, count(*) over () as n
    from private.club_leaderboard_rows(p_club_id, coalesce(p_members_only, false)) r
  )
  select b.rank, b.player_id, b.public_slug, b.display_name, b.rating, b.wins, b.losses,
         b.win_rate, b.calculation_version, b.is_member, b.n
  from board b
  where b.player_id = public.current_player_id()
$$;
revoke all on function public.club_leaderboard_me(uuid, boolean) from public, anon;
grant execute on function public.club_leaderboard_me(uuid, boolean) to authenticated;
