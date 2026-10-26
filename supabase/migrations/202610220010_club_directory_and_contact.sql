-- Public club home: a member directory anyone can read, and a contact line
-- that club owners/organizers publish so players know who to reach.

-- Contact shown on the public club page (e.g. a Facebook page or phone).
alter table public.clubs
  add column contact_info text
  check (contact_info is null or length(contact_info) between 1 and 200);

-- Active members of a club with their club role. Membership rows stay
-- RLS-protected (self or club leads only); this function publishes just the
-- public identity of each member. Private or merged players keep their row
-- (so counts stay honest) but their name, slug, avatar and id are withheld.
create function public.club_member_directory(p_club_id uuid)
returns table (
  player_id uuid,
  display_name text,
  public_slug text,
  avatar_path text,
  role public.club_role,
  joined_at timestamptz
)
language sql stable security definer
set search_path = pg_catalog, public
as $$
  select
    case when p.visibility = 'public' and p.merged_into_player_id is null then p.id end,
    case when p.visibility = 'public' and p.merged_into_player_id is null then p.display_name end,
    case when p.visibility = 'public' and p.merged_into_player_id is null then p.public_slug end,
    case when p.visibility = 'public' and p.merged_into_player_id is null then p.avatar_path end,
    m.role,
    m.created_at
  from public.club_memberships m
  join public.players p on p.id = m.player_id
  where m.club_id = p_club_id and m.status = 'active'
  order by
    case m.role when 'owner' then 0 when 'organizer' then 1 when 'staff' then 2 else 3 end,
    p.display_name
$$;
revoke all on function public.club_member_directory(uuid) from public;
grant execute on function public.club_member_directory(uuid) to anon, authenticated;

-- Owners and organizers set or clear the published contact. Blank clears it.
create function public.set_club_contact(p_club_id uuid, p_contact text)
returns void
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old text;
  v_new text := nullif(btrim(coalesce(p_contact, '')), '');
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  select contact_info into v_old from public.clubs where id = p_club_id for update;
  update public.clubs set contact_info = v_new where id = p_club_id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(), 'club.contact_updated', 'club', p_club_id, p_club_id,
          jsonb_build_object('contact', v_old), jsonb_build_object('contact', v_new));
end
$$;
revoke all on function public.set_club_contact(uuid, text) from public, anon;
grant execute on function public.set_club_contact(uuid, text) to authenticated;
