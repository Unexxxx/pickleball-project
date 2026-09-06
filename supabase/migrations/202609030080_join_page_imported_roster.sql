drop function public.get_event_join_roster(text);

create function public.get_event_join_roster(p_join_code text)
returns table(
  display_name text,
  public_slug text,
  avatar_path text,
  registration_status public.registration_status,
  waitlist_position bigint,
  identity_verified boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  with visible_event as (
    select event.id, event.club_id, event.is_private
    from public.events event
    where event.join_code = p_join_code
      and public.current_player_id() is not null
      and p_join_code ~ '^[a-f0-9]{18}$'
      and event.status <> 'draft'
      and (
        not event.is_private
        or exists(
          select 1
          from public.club_memberships membership
          where membership.club_id = event.club_id
            and membership.player_id = public.current_player_id()
            and membership.status in ('active', 'invited')
        )
        or exists(
          select 1
          from public.event_registrations own_registration
          where own_registration.event_id = event.id
            and own_registration.player_id = public.current_player_id()
            and own_registration.status in ('confirmed', 'waitlisted')
        )
      )
  )
  select roster.*
  from (
    select
      player.display_name,
      player.public_slug,
      player.avatar_path,
      registration.status as registration_status,
      registration.waitlist_position,
      true as identity_verified
    from visible_event event
    join public.event_registrations registration on registration.event_id = event.id
    join public.players player on player.id = registration.player_id
    where registration.status in ('confirmed', 'waitlisted')

    union all

    select
      imported.display_name,
      null,
      null,
      imported.status as registration_status,
      imported.waitlist_position,
      false as identity_verified
    from visible_event event
    join public.external_event_roster_entries imported on imported.event_id = event.id
    where imported.matched_player_id is null
  ) roster
  order by
    roster.registration_status,
    roster.waitlist_position nulls first,
    roster.display_name
$$;

revoke all on function public.get_event_join_roster(text) from public;
grant execute on function public.get_event_join_roster(text) to authenticated;
