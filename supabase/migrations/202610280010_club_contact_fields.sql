-- Structured club contacts: email, Facebook page and phone, each optional.
-- Replaces the free-text clubs.contact_info line (kept for now so the
-- previous app version keeps working during deploy; no longer written).
-- Email and Facebook formats are checked here, not only in the app, so
-- links on the public club page are always a mailto: or a facebook.com
-- page. The contact number is free text (any format), up to 100 characters.

alter table public.clubs
  add column contact_email text
    check (contact_email is null or (
      length(contact_email) <= 254
      and contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  add column contact_facebook text
    check (contact_facebook is null or (
      length(contact_facebook) <= 200
      and contact_facebook ~* '^https://((www|m|web)\.)?(facebook|fb)\.com/[^\s]+$')),
  add column contact_phone text
    check (contact_phone is null or length(contact_phone) <= 100);

-- Move existing single-line contacts into the matching field.
-- A line that's neither an email nor a Facebook link is kept as the number.
update public.clubs set contact_phone = left(btrim(contact_info), 100)
where contact_info is not null and btrim(contact_info) <> ''
  and btrim(contact_info) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and regexp_replace(btrim(contact_info), '^https?://', '', 'i') !~* '^((www|m|web)\.)?(facebook|fb)\.com/[^\s]+$';
update public.clubs set contact_email = btrim(contact_info)
where contact_info is not null and btrim(contact_info) ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  and length(btrim(contact_info)) <= 254;
update public.clubs
set contact_facebook = case
  when btrim(contact_info) ~* '^https://' then btrim(contact_info)
  else 'https://' || regexp_replace(btrim(contact_info), '^http://', '', 'i')
end
where contact_info is not null
  and regexp_replace(btrim(contact_info), '^https?://', '', 'i') ~* '^((www|m|web)\.)?(facebook|fb)\.com/[^\s]+$';

-- Club admins (owner, organizer, staff) set all three at once; blank clears
-- a field. A bare "facebook.com/club" is stored as https://facebook.com/club.
create function public.set_club_contacts(
  p_club_id uuid,
  p_email text,
  p_facebook text,
  p_phone text
)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_facebook text := nullif(btrim(coalesce(p_facebook, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_before jsonb;
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer', 'staff']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if v_facebook is not null and v_facebook !~* '^https?://' then
    v_facebook := 'https://' || v_facebook;
  end if;
  v_facebook := regexp_replace(v_facebook, '^http://', 'https://', 'i');
  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    raise exception using errcode = 'P0001', detail = 'INVALID_EMAIL';
  end if;
  if v_facebook is not null and (length(v_facebook) > 200
     or v_facebook !~* '^https://((www|m|web)\.)?(facebook|fb)\.com/[^\s]+$') then
    raise exception using errcode = 'P0001', detail = 'INVALID_FACEBOOK';
  end if;
  if v_phone is not null and length(v_phone) > 100 then
    raise exception using errcode = 'P0001', detail = 'INVALID_PHONE';
  end if;

  select jsonb_build_object('email', contact_email, 'facebook', contact_facebook, 'phone', contact_phone)
  into v_before from public.clubs where id = p_club_id for update;
  update public.clubs
  set contact_email = v_email, contact_facebook = v_facebook, contact_phone = v_phone
  where id = p_club_id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(), 'club.contacts_updated', 'club', p_club_id, p_club_id, v_before,
          jsonb_build_object('email', v_email, 'facebook', v_facebook, 'phone', v_phone));
end
$$;
revoke all on function public.set_club_contacts(uuid, text, text, text) from public, anon;
grant execute on function public.set_club_contacts(uuid, text, text, text) to authenticated;
