create function public.get_event_join_roster(p_join_code text)
returns table(
  display_name text,
  public_slug text,
  avatar_path text,
  registration_status public.registration_status,
  waitlist_position bigint
)
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select
    player.display_name,
    player.public_slug,
    player.avatar_path,
    registration.status,
    registration.waitlist_position
  from public.events event
  join public.event_registrations registration on registration.event_id = event.id
  join public.players player on player.id = registration.player_id
  where event.join_code = p_join_code
    and public.current_player_id() is not null
    and p_join_code ~ '^[a-f0-9]{18}$'
    and event.status <> 'draft'
    and registration.status in ('confirmed', 'waitlisted')
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
  order by
    case registration.status when 'confirmed' then 0 else 1 end,
    registration.waitlist_position nulls first,
    player.display_name
$$;

revoke all on function public.get_event_join_roster(text) from public;
grant execute on function public.get_event_join_roster(text) to authenticated;
