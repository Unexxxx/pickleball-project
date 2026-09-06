create or replace function private.is_match_participant(p_match_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,private as $$
  select exists(
    select 1 from public.match_participants mp
    where mp.match_id=p_match_id and mp.player_id=public.current_player_id()
  )
$$;

create or replace function private.can_manage_match(p_match_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public,private as $$
  select exists(
    select 1
    from public.matches m
    join public.club_memberships cm
      on cm.club_id=m.club_id
     and cm.player_id=public.current_player_id()
     and cm.status='active'
     and cm.role=any(array['owner','organizer','score_official','staff']::public.club_role[])
    where m.id=p_match_id
  )
$$;

revoke all on function private.is_match_participant(uuid),private.can_manage_match(uuid)
from public,anon,authenticated;

drop policy if exists match_participant_or_club_read on public.matches;
create policy match_participant_or_club_read on public.matches
for select to authenticated using(
  private.has_club_role(club_id,array['owner','organizer','score_official','staff']::public.club_role[])
  or private.is_match_participant(id)
);

drop policy if exists match_participant_rows_read on public.match_participants;
create policy match_participant_rows_read on public.match_participants
for select to authenticated using(
  player_id=public.current_player_id()
  or private.can_manage_match(match_id)
);
