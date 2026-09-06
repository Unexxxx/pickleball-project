create type public.match_format as enum ('singles','doubles');
create type public.match_status as enum ('assigned','playing','score_pending','finalized','disputed','voided','canceled');
create type public.match_proposal_status as enum ('pending','confirmed','expired','canceled');

create function private.uuid_array_is_distinct(p_values uuid[]) returns boolean
language sql immutable strict set search_path=pg_catalog as $$
  select cardinality(p_values)=(select count(distinct value) from unnest(p_values) value)
$$;

create table public.match_proposals (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  court_id uuid not null references public.event_courts,
  format public.match_format not null,
  side_a_player_ids uuid[] not null,
  side_b_player_ids uuid[] not null,
  queue_entry_ids uuid[] not null,
  queue_version bigint not null,
  policy_version text not null,
  snapshot jsonb not null,
  status public.match_proposal_status not null default 'pending',
  match_id uuid,
  request_id uuid not null,
  created_by uuid not null references public.players,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  version bigint not null default 1,
  constraint match_proposal_participant_count_check check (
    (format='singles' and cardinality(side_a_player_ids)=1 and cardinality(side_b_player_ids)=1)
    or (format='doubles' and cardinality(side_a_player_ids)=2 and cardinality(side_b_player_ids)=2)
  ),
  constraint match_proposal_distinct_players_check check (
    private.uuid_array_is_distinct(side_a_player_ids || side_b_player_ids)
  ),
  unique(created_by, request_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  court_id uuid not null references public.event_courts,
  proposal_id uuid not null unique references public.match_proposals,
  format public.match_format not null,
  record_class public.record_class not null,
  status public.match_status not null default 'assigned',
  policy_version text not null,
  assigned_at timestamptz not null default now(),
  played_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.players,
  canceled_by uuid references public.players,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version bigint not null default 1
);

alter table public.match_proposals
  add constraint match_proposals_match_fkey foreign key(match_id) references public.matches;

alter table public.event_courts
  add column current_match_id uuid references public.matches,
  add column version bigint not null default 1,
  add column updated_at timestamptz not null default now();

create table public.match_participants (
  match_id uuid not null references public.matches on delete cascade,
  event_id uuid not null references public.events on delete cascade,
  player_id uuid not null references public.players,
  side smallint not null,
  position smallint not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key(match_id,player_id),
  unique(match_id,side,position),
  constraint match_participant_side_check check(side in (1,2)),
  constraint match_participant_position_check check(position in (1,2))
);

create index match_proposals_event_status_idx on public.match_proposals(club_id,event_id,status,created_at desc);
create index matches_event_status_idx on public.matches(club_id,event_id,status,assigned_at desc);
create index match_participants_match_side_idx on public.match_participants(match_id,side,position);
create unique index event_courts_one_active_match_idx on public.event_courts(current_match_id) where current_match_id is not null;
create unique index match_participants_one_active_player_idx on public.match_participants(event_id,player_id) where active;

create trigger matches_updated before update on public.matches for each row execute function private.set_updated_at();
create trigger event_courts_updated before update on public.event_courts for each row execute function private.set_updated_at();

alter table public.match_proposals enable row level security;
alter table public.matches enable row level security;
alter table public.match_participants enable row level security;

create policy match_proposals_club_read on public.match_proposals for select to authenticated
  using(private.has_club_role(club_id,array['owner','organizer']::public.club_role[]));
create policy match_participant_or_club_read on public.matches for select to authenticated
  using(private.has_club_role(club_id,array['owner','organizer','score_official','staff']::public.club_role[])
    or exists(select 1 from public.match_participants mp where mp.match_id=id and mp.player_id=public.current_player_id()));
create policy match_participant_rows_read on public.match_participants for select to authenticated
  using(player_id=public.current_player_id() or exists(select 1 from public.matches m where m.id=match_id and private.has_club_role(m.club_id,array['owner','organizer','score_official','staff']::public.club_role[])));

grant select on public.match_proposals,public.matches,public.match_participants to authenticated;

insert into private.rule_versions(domain,version,parameters,active_from)
values('matchmaking','matchmaking-v1','{"selection":"queue_position_then_uuid","defaultRating":1500,"doubles":"minimum_team_average_difference","tieBreak":"canonical_player_uuid"}',now())
on conflict(domain,version) do nothing;

comment on table public.match_proposals is 'Expiring deterministic snapshots; confirmation revalidates all resources.';
comment on table public.match_participants is 'Canonical participant assignments. Active rows enforce no player double-booking.';
