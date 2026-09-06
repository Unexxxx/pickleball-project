create type public.queue_entry_state as enum ('ready','assigned','left','unavailable');

alter table public.events add column queue_version bigint not null default 0;
alter table public.event_attendance
  add column checked_in_at timestamptz,
  add column checked_out_at timestamptz,
  add column changed_by uuid references public.players;

create table public.event_queue_entries (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  player_id uuid not null references public.players,
  state public.queue_entry_state not null default 'ready',
  position_sequence bigint not null,
  position_key bigint not null,
  assigned_match_id uuid,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1,
  unique (event_id, position_sequence)
);

create unique index event_queue_event_sequence_key
  on public.event_queue_entries(event_id, position_sequence);
create unique index event_queue_one_ready_player_idx
  on public.event_queue_entries(event_id, player_id) where state = 'ready';
create unique index event_queue_ready_position_idx
  on public.event_queue_entries(event_id, position_key) where state = 'ready';
create index event_queue_ready_order_idx
  on public.event_queue_entries(event_id, position_key, joined_at, id) where state = 'ready';
create index event_queue_player_state_idx
  on public.event_queue_entries(event_id, player_id, state);

create table private.event_queue_history (
  id bigint generated always as identity primary key,
  queue_entry_id uuid not null references public.event_queue_entries,
  from_state public.queue_entry_state,
  to_state public.queue_entry_state not null,
  old_position_key bigint,
  new_position_key bigint,
  actor_player_id uuid not null references public.players,
  reason text not null,
  request_id uuid not null,
  occurred_at timestamptz not null default now()
);
create index event_queue_history_entry_idx
  on private.event_queue_history(queue_entry_id, occurred_at, id);

alter table public.event_queue_entries enable row level security;
create policy queue_participant_or_club_read on public.event_queue_entries
  for select to authenticated
  using (
    player_id = public.current_player_id()
    or private.has_club_role(club_id, array['owner','organizer','score_official','staff']::public.club_role[])
  );
grant select on public.event_queue_entries to authenticated;

create trigger queue_entry_updated
  before update on public.event_queue_entries
  for each row execute function private.set_updated_at();

create or replace function private.broadcast_queue_change()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private, realtime as $$
declare v_event_version bigint;
begin
  select queue_version into v_event_version from public.events where id = coalesce(new.event_id, old.event_id);
  perform realtime.send(
    jsonb_build_object(
      'schemaVersion', 1,
      'eventId', coalesce(new.event_id, old.event_id),
      'clubId', coalesce(new.club_id, old.club_id),
      'eventType', case when tg_op = 'UPDATE' and new.position_key is distinct from old.position_key then 'queue.reordered' else 'queue.changed' end,
      'entityId', coalesce(new.id, old.id),
      'entityVersion', coalesce(new.version, old.version),
      'eventVersion', v_event_version,
      'occurredAt', now(),
      'requestId', gen_random_uuid()
    ),
    'queue.changed',
    'club:' || coalesce(new.club_id, old.club_id)::text || ':event:' || coalesce(new.event_id, old.event_id)::text || ':operations',
    true
  );
  return coalesce(new, old);
end $$;

create trigger queue_entry_broadcast
  after insert or update or delete on public.event_queue_entries
  for each row execute function private.broadcast_queue_change();
