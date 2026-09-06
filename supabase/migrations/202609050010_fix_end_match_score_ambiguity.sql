create or replace function public.end_match_with_score(
  p_match_id uuid,
  p_score jsonb,
  p_idempotency_key uuid
)
returns table(result_id uuid, revision_id uuid, status text, version bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_match public.matches%rowtype;
  v_result uuid;
  v_revision uuid;
  v_wins_a int;
  v_wins_b int;
  v_digest text;
begin
  if v_actor is null then raise exception using errcode='P0001', detail='AUTH_REQUIRED'; end if;

  select revision.result_id, revision.id, 'pending_confirmation', result.version
  into result_id, revision_id, status, version
  from public.result_revisions revision
  join public.match_results result on result.id = revision.result_id
  where revision.submitted_by = v_actor and revision.request_id = p_idempotency_key;
  if result_id is not null then return next; return; end if;

  select * into v_match from public.matches match where match.id = p_match_id for update;
  if v_match.id is null then raise exception using errcode='P0001', detail='NOT_FOUND'; end if;
  if v_match.status not in ('assigned','playing') then
    raise exception using errcode='P0001', detail='INVALID_STATE_TRANSITION';
  end if;
  if not exists (
    select 1 from public.match_participants participant
    where participant.match_id = p_match_id and participant.player_id = v_actor
  ) and not private.has_club_role(
    v_match.club_id,
    array['owner','organizer','score_official']::public.club_role[]
  ) then
    raise exception using errcode='P0001', detail='PERMISSION_DENIED';
  end if;
  if jsonb_typeof(p_score->'games') <> 'array'
    or jsonb_array_length(p_score->'games') not between 1 and 5
    or exists (
      select 1 from jsonb_array_elements(p_score->'games') game
      where not (game ? 'sideA' and game ? 'sideB')
        or (game->>'sideA')::int = (game->>'sideB')::int
    ) then
    raise exception using errcode='P0001', detail='INVALID_SCORE';
  end if;

  select
    count(*) filter(where (game->>'sideA')::int > (game->>'sideB')::int),
    count(*) filter(where (game->>'sideB')::int > (game->>'sideA')::int)
  into v_wins_a, v_wins_b
  from jsonb_array_elements(p_score->'games') game;
  if v_wins_a = v_wins_b then raise exception using errcode='P0001', detail='INVALID_SCORE'; end if;

  insert into public.match_results(match_id, club_id, event_id)
  values(p_match_id, v_match.club_id, v_match.event_id)
  on conflict(match_id) do update set updated_at = now()
  returning id into v_result;

  v_digest := encode(extensions.digest(p_score::text, 'sha256'), 'hex');
  insert into public.result_revisions(
    result_id, match_id, revision_no, score, score_digest, winner_side, submitted_by, request_id
  ) values (
    v_result,
    p_match_id,
    (select coalesce(max(revision.revision_no), 0) + 1 from public.result_revisions revision where revision.result_id = v_result),
    p_score,
    v_digest,
    case when v_wins_a > v_wins_b then 1 else 2 end,
    v_actor,
    p_idempotency_key
  ) returning id into v_revision;

  update public.match_results result
  set current_revision_id = v_revision,
      status = 'pending_confirmation',
      version = result.version + 1
  where result.id = v_result
  returning result.version into version;
  update public.matches match
  set status = 'score_pending',
      played_at = coalesce(match.played_at, match.assigned_at),
      completed_at = now(),
      version = match.version + 1
  where match.id = p_match_id;
  update public.match_participants participant
  set active = false
  where participant.match_id = p_match_id;
  update public.event_queue_entries entry
  set state = 'unavailable', assigned_match_id = null, version = entry.version + 1
  where entry.assigned_match_id = p_match_id;
  update public.event_courts court
  set status = 'available', current_match_id = null, version = court.version + 1
  where court.current_match_id = p_match_id;
  update public.events event
  set queue_version = event.queue_version + 1
  where event.id = v_match.event_id;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, request_id, after_state
  ) values (
    auth.uid(), 'match.ended_score_submitted', 'match_result', v_result, v_match.club_id,
    p_idempotency_key, jsonb_build_object('revisionId', v_revision, 'scoreDigest', v_digest, 'courtReleased', true)
  );

  result_id := v_result;
  revision_id := v_revision;
  status := 'pending_confirmation';
  return next;
end
$$;

revoke all on function public.end_match_with_score(uuid, jsonb, uuid) from public;
grant execute on function public.end_match_with_score(uuid, jsonb, uuid) to authenticated;
