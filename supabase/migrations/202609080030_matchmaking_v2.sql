create or replace function private.recent_teammate_count(
  p_event_id uuid,
  p_first_player_id uuid,
  p_second_player_id uuid
)
returns bigint
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select count(*)
  from (
    select match.id
    from public.matches match
    where match.event_id = p_event_id
      and match.status in ('score_pending', 'finalized', 'disputed')
    order by match.completed_at desc nulls last, match.id
    limit 20
  ) recent
  join public.match_participants first_player
    on first_player.match_id = recent.id
   and first_player.player_id = p_first_player_id
  join public.match_participants second_player
    on second_player.match_id = recent.id
   and second_player.player_id = p_second_player_id
   and second_player.side = first_player.side
$$;

revoke all on function private.recent_teammate_count(uuid, uuid, uuid)
from public, anon, authenticated;

create or replace function public.generate_match_proposal(
  p_event_id uuid,
  p_format text,
  p_idempotency_key uuid
)
returns table(
  proposal_id uuid,
  side_a_player_ids uuid[],
  side_b_player_ids uuid[],
  court_id uuid,
  policy_version text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_club uuid;
  v_record public.record_class;
  v_queue_version bigint;
  v_required int;
  v_players uuid[];
  v_entries uuid[];
  v_court uuid;
  v_format public.match_format;
  v_recent_penalty bigint := 0;
  v_win_rate_difference numeric := 0;
  v_rank_difference numeric := 0;
  v_rating_difference numeric := 0;
begin
  if v_actor is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;
  begin
    v_format := p_format::public.match_format;
  exception when invalid_text_representation then
    raise exception using errcode = 'P0001', detail = 'INVALID_FORMAT';
  end;
  v_required := case when v_format = 'singles' then 2 else 4 end;

  select event.club_id, event.record_class, event.queue_version
  into v_club, v_record, v_queue_version
  from public.events event
  where event.id = p_event_id
    and event.status in ('published', 'registration_closed', 'in_progress')
  for update;
  if v_club is null then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  if not private.has_club_role(
    v_club,
    array['owner','organizer']::public.club_role[]
  ) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if not exists (
    select 1 from public.events event
    where event.id = p_event_id and p_format = any(event.formats)
  ) then
    raise exception using errcode = 'P0001', detail = 'INVALID_FORMAT';
  end if;

  select proposal.id, proposal.side_a_player_ids,
    proposal.side_b_player_ids, proposal.court_id,
    proposal.policy_version, proposal.expires_at
  into proposal_id, side_a_player_ids, side_b_player_ids,
    court_id, policy_version, expires_at
  from public.match_proposals proposal
  where proposal.created_by = v_actor
    and proposal.request_id = p_idempotency_key;
  if proposal_id is not null then
    return next;
    return;
  end if;

  select court.id into v_court
  from public.event_courts court
  where court.event_id = p_event_id
    and court.status = 'available'
    and court.current_match_id is null
  order by court.label, court.id
  for update skip locked
  limit 1;
  if v_court is null then
    raise exception using errcode = 'P0001', detail = 'NO_COURT_AVAILABLE';
  end if;

  select
    array_agg(queue.player_id order by queue.position_key, queue.joined_at, queue.id),
    array_agg(queue.id order by queue.position_key, queue.joined_at, queue.id)
  into v_players, v_entries
  from (
    select *
    from public.event_queue_entries
    where event_id = p_event_id and state = 'ready'
    order by position_key, joined_at, id
    limit v_required
    for update
  ) queue;
  if coalesce(cardinality(v_players), 0) <> v_required then
    raise exception using errcode = 'P0001', detail = 'INSUFFICIENT_PLAYERS';
  end if;
  if exists (
    select 1 from unnest(v_players) player_id
    where not exists (
      select 1 from public.accounts account
      where account.player_id = player_id
        and account.contact_verified_at is not null
    )
  ) then
    raise exception using errcode = 'P0001', detail = 'PLAYER_NOT_VERIFIED';
  end if;
  if v_record = 'ranked' and exists (
    select 1 from unnest(v_players) player_id
    where not public.player_ranked_eligible(player_id, v_club)
  ) then
    raise exception using errcode = 'P0001', detail = 'INELIGIBLE';
  end if;

  if v_format = 'singles' then
    side_a_player_ids := v_players[1:1];
    side_b_player_ids := v_players[2:2];
  else
    with partitions as (
      select 1 as choice,
        array[v_players[1], v_players[2]]::uuid[] as side_a,
        array[v_players[3], v_players[4]]::uuid[] as side_b
      union all
      select 2,
        array[v_players[1], v_players[3]]::uuid[],
        array[v_players[2], v_players[4]]::uuid[]
      union all
      select 3,
        array[v_players[1], v_players[4]]::uuid[],
        array[v_players[2], v_players[3]]::uuid[]
    ), player_metrics as (
      select partition.choice, side.name as side, player.id,
        coalesce(stat.rating, 1500)::numeric as rating,
        case
          when coalesce(stat.wins, 0) + coalesce(stat.losses, 0) = 0 then 0.5
          else stat.wins::numeric / (stat.wins + stat.losses)
        end as win_rate,
        leaderboard.rank
      from partitions partition
      cross join lateral (
        values ('a', partition.side_a), ('b', partition.side_b)
      ) side(name, ids)
      cross join lateral unnest(side.ids) player(id)
      left join public.player_statistics stat on stat.player_id = player.id
      left join public.public_leaderboards leaderboard
        on leaderboard.player_id = player.id and leaderboard.scope = 'overall'
    ), ranked_metrics as (
      select metrics.*,
        coalesce(
          metrics.rank,
          max(coalesce(metrics.rank, 0)) over(partition by metrics.choice) + 1
        )::numeric as effective_rank
      from player_metrics metrics
    ), team_metrics as (
      select choice, side,
        avg(rating) as average_rating,
        avg(win_rate) as average_win_rate,
        avg(effective_rank) as average_rank
      from ranked_metrics
      group by choice, side
    ), scored as (
      select partition.*,
        private.recent_teammate_count(
          p_event_id, partition.side_a[1], partition.side_a[2]
        ) + private.recent_teammate_count(
          p_event_id, partition.side_b[1], partition.side_b[2]
        ) as recent_penalty,
        abs(side_a.average_win_rate - side_b.average_win_rate) as win_difference,
        abs(side_a.average_rank - side_b.average_rank) as rank_difference,
        abs(side_a.average_rating - side_b.average_rating) as rating_difference
      from partitions partition
      join team_metrics side_a on side_a.choice = partition.choice and side_a.side = 'a'
      join team_metrics side_b on side_b.choice = partition.choice and side_b.side = 'b'
    )
    select
      array(
        select ids.player_id
        from unnest(scored.side_a) as ids(player_id)
        order by ids.player_id
      ),
      array(
        select ids.player_id
        from unnest(scored.side_b) as ids(player_id)
        order by ids.player_id
      ),
      scored.recent_penalty,
      scored.win_difference,
      scored.rank_difference,
      scored.rating_difference
    into side_a_player_ids, side_b_player_ids, v_recent_penalty,
      v_win_rate_difference, v_rank_difference, v_rating_difference
    from scored
    order by scored.recent_penalty, scored.win_difference,
      scored.rank_difference, scored.rating_difference,
      scored.side_a::text, scored.side_b::text
    limit 1;
  end if;

  court_id := v_court;
  policy_version := 'matchmaking-v2';
  expires_at := now() + interval '5 minutes';
  insert into public.match_proposals(
    club_id, event_id, court_id, format, side_a_player_ids,
    side_b_player_ids, queue_entry_ids, queue_version, policy_version,
    snapshot, request_id, created_by, expires_at
  ) values (
    v_club, p_event_id, v_court, v_format, side_a_player_ids,
    side_b_player_ids, v_entries, v_queue_version, policy_version,
    jsonb_build_object(
      'queueVersion', v_queue_version,
      'queueEntryIds', v_entries,
      'recentTeammatePenalty', v_recent_penalty,
      'winRateDifference', v_win_rate_difference,
      'rankDifference', v_rank_difference,
      'ratingDifference', v_rating_difference
    ),
    p_idempotency_key, v_actor, expires_at
  ) returning id into proposal_id;
  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id,
    club_id, request_id, after_state
  ) values (
    auth.uid(), 'match.proposed', 'match_proposal', proposal_id,
    v_club, p_idempotency_key,
    jsonb_build_object(
      'policyVersion', policy_version,
      'recentTeammatePenalty', v_recent_penalty,
      'winRateDifference', v_win_rate_difference,
      'rankDifference', v_rank_difference,
      'ratingDifference', v_rating_difference
    )
  );
  return next;
end
$$;

revoke all on function public.generate_match_proposal(uuid, text, uuid) from public;
grant execute on function public.generate_match_proposal(uuid, text, uuid) to authenticated;

insert into private.rule_versions(domain, version, parameters, active_from)
values (
  'matchmaking',
  'matchmaking-v2',
  '{"selection":"fifo_complete_group","recentHistoryMatches":20,"priority":["recent_teammate_penalty","win_rate_difference","rank_difference","rating_difference","canonical_player_uuid"],"defaultRating":1500,"defaultWinRate":0.5}'::jsonb,
  now()
)
on conflict(domain, version) do nothing;

comment on function private.recent_teammate_count(uuid, uuid, uuid) is
  'Counts same-side pairings within the 20 most recently completed matches in an event.';
comment on function public.generate_match_proposal(uuid, text, uuid) is
  'Creates a deterministic FIFO proposal and balances doubles by teammate recency, win rate, rank, and rating.';
