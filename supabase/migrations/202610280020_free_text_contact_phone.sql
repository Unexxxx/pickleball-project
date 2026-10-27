-- The club contact number is free text: clubs write it any way they like
-- (e.g. "Viber: 0917 123 4567 (after 5pm)"), up to 100 characters.
-- Replaces the digits-only rule from 202610280010. Email and Facebook keep
-- their format checks because they become links on the public club page.

do $$
declare
  v_name text;
begin
  -- The inline check from 202610280010 has a generated name; find it.
  for v_name in
    select conname from pg_constraint
    where conrelid = 'public.clubs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%contact_phone%'
  loop
    execute format('alter table public.clubs drop constraint %I', v_name);
  end loop;
end
$$;

alter table public.clubs
  add constraint clubs_contact_phone_length
  check (contact_phone is null or length(contact_phone) <= 100);

create or replace function public.set_club_contacts(
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
