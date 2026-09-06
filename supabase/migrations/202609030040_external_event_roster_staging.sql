create table public.external_event_roster_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events on delete cascade,
  club_id uuid not null references public.clubs on delete cascade,
  source_url text not null,
  source_ref text not null,
  display_name text not null check(length(trim(display_name)) between 1 and 120),
  status public.registration_status not null,
  waitlist_position bigint check(waitlist_position is null or waitlist_position > 0),
  matched_player_id uuid references public.players,
  created_at timestamptz not null default now(),
  unique(event_id, source_url, source_ref)
);

create index external_event_roster_event_status_idx
on public.external_event_roster_entries(event_id, status, waitlist_position);

alter table public.external_event_roster_entries enable row level security;

create policy external_roster_manager_read
on public.external_event_roster_entries
for select
to authenticated
using (
  private.has_club_role(
    club_id,
    array['owner', 'organizer', 'staff']::public.club_role[]
  )
);

grant select on public.external_event_roster_entries to authenticated;
revoke insert, update, delete on public.external_event_roster_entries from anon, authenticated;

create or replace function public.stage_external_event_roster(
  p_event_id uuid,
  p_source_url text,
  p_entries jsonb,
  p_idempotency_key uuid
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_club_id uuid;
  v_count integer;
begin
  select event.club_id into v_club_id
  from public.events event
  where event.id = p_event_id;

  if v_club_id is null or not private.has_club_role(
    v_club_id,
    array['owner', 'organizer']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;

  if p_source_url !~ '^https://reclub\.co/m/[A-Za-z0-9_-]+$'
    or jsonb_typeof(p_entries) <> 'array'
    or jsonb_array_length(p_entries) > 500
  then
    raise exception using errcode = 'P0001', detail = 'INVALID_IMPORT';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) entry
    where entry->>'status' not in ('confirmed', 'waitlisted')
      or length(trim(entry->>'displayName')) not between 1 and 120
      or length(entry->>'sourceRef') not between 1 and 160
  ) then
    raise exception using errcode = 'P0001', detail = 'INVALID_IMPORT_ENTRY';
  end if;

  insert into public.external_event_roster_entries(
    event_id,
    club_id,
    source_url,
    source_ref,
    display_name,
    status,
    waitlist_position
  )
  select
    p_event_id,
    v_club_id,
    p_source_url,
    entry->>'sourceRef',
    trim(entry->>'displayName'),
    (entry->>'status')::public.registration_status,
    nullif(entry->>'waitlistPosition', '')::bigint
  from jsonb_array_elements(p_entries) entry
  where entry->>'status' in ('confirmed', 'waitlisted')
    and length(trim(entry->>'displayName')) between 1 and 120
    and length(entry->>'sourceRef') between 1 and 160
  on conflict(event_id, source_url, source_ref) do nothing;

  get diagnostics v_count = row_count;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    after_state
  ) values (
    auth.uid(),
    'event.external_roster_staged',
    'event',
    p_event_id,
    v_club_id,
    p_idempotency_key,
    jsonb_build_object('source_url', p_source_url, 'entry_count', v_count)
  );

  return v_count;
end
$$;

revoke all on function public.stage_external_event_roster(uuid, text, jsonb, uuid) from public;
grant execute on function public.stage_external_event_roster(uuid, text, jsonb, uuid) to authenticated;
