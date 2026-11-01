-- Event templates: a club's saved Create event settings (name, type, format,
-- results, start time, length, venue, players, courts, joining, notes).
-- Never the date or the passcode (passcodes are only stored hashed).
-- Shared by the club's owners, organizers and staff; read and written only
-- by them. Settings are shaped by the app; here they're bounded in size.

create table public.event_templates (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  settings jsonb not null check (
    jsonb_typeof(settings) = 'object' and pg_column_size(settings) <= 16000
  ),
  created_by uuid references public.players,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index event_templates_club_name_idx
  on public.event_templates (club_id, lower(btrim(name)));

alter table public.event_templates enable row level security;
create policy event_templates_staff_read
on public.event_templates
for select
using (
  private.has_club_role(
    club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  )
);
revoke insert, update, delete on public.event_templates from anon, authenticated;
revoke all on public.event_templates from anon;

-- Save (or, with the same name, update) a template. 50 per club.
create function public.save_event_template(
  p_club_id uuid,
  p_name text,
  p_settings jsonb
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_name text := btrim(coalesce(p_name, ''));
  v_id uuid;
begin
  if not private.has_club_role(
    p_club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if char_length(v_name) not between 1 and 60
    or p_settings is null
    or jsonb_typeof(p_settings) <> 'object'
    or pg_column_size(p_settings) > 16000
  then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
  if not exists(
    select 1 from public.event_templates template
    where template.club_id = p_club_id
      and lower(btrim(template.name)) = lower(v_name)
  ) and (
    select count(*) from public.event_templates template
    where template.club_id = p_club_id
  ) >= 50 then
    raise exception using errcode = 'P0001', detail = 'TEMPLATE_LIMIT';
  end if;

  insert into public.event_templates (club_id, name, settings, created_by)
  values (p_club_id, v_name, p_settings, public.current_player_id())
  on conflict (club_id, lower(btrim(name))) do update
    set name = excluded.name,
        settings = excluded.settings,
        updated_at = now()
  returning id into v_id;

  insert into private.audit_log (
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, after_state
  ) values (
    auth.uid(), 'event_template.saved', 'event_template', v_id, p_club_id,
    jsonb_build_object('name', v_name)
  );
  return v_id;
end
$$;

create function public.delete_event_template(p_template_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_club_id uuid;
  v_name text;
begin
  select template.club_id, template.name into v_club_id, v_name
  from public.event_templates template
  where template.id = p_template_id;
  if v_club_id is null or not private.has_club_role(
    v_club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  delete from public.event_templates where id = p_template_id;
  insert into private.audit_log (
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state
  ) values (
    auth.uid(), 'event_template.deleted', 'event_template', p_template_id, v_club_id,
    jsonb_build_object('name', v_name)
  );
end
$$;

revoke all on function public.save_event_template(uuid, text, jsonb) from public, anon;
grant execute on function public.save_event_template(uuid, text, jsonb) to authenticated;
revoke all on function public.delete_event_template(uuid) from public, anon;
grant execute on function public.delete_event_template(uuid) to authenticated;
