-- Club owners/organizers set or clear the club's profile picture or cover.
-- Files are uploaded by the client into club-media/<club id>/… (storage
-- policies from 202609030020 already limit that folder to the same roles);
-- this command only records the path, and only one inside the club's folder.
-- Returns the previous path so the caller can delete the replaced file.
create function public.set_club_media(p_club_id uuid, p_kind text, p_path text)
returns text
language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old text;
begin
  if not public.can_manage_club_media(p_club_id) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if p_kind not in ('profile', 'background') then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
  if p_path is not null and (
    p_path not like p_club_id::text || '/%'
    or p_path like '%..%'
    or length(p_path) > 200
  ) then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;

  if p_kind = 'profile' then
    select profile_image_path into v_old from public.clubs where id = p_club_id for update;
    update public.clubs set profile_image_path = p_path where id = p_club_id;
  else
    select background_image_path into v_old from public.clubs where id = p_club_id for update;
    update public.clubs set background_image_path = p_path where id = p_club_id;
  end if;

  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(), 'club.media_updated', 'club', p_club_id, p_club_id,
          jsonb_build_object('kind', p_kind, 'path', v_old),
          jsonb_build_object('kind', p_kind, 'path', p_path));
  return v_old;
end
$$;
revoke all on function public.set_club_media(uuid, text, text) from public, anon;
grant execute on function public.set_club_media(uuid, text, text) to authenticated;
