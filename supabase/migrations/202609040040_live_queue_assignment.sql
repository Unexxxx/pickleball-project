create or replace function private.can_view_event_operations(p_event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select public.current_player_id() is not null and (
    exists (
      select 1 from public.events e
      where e.id = p_event_id
        and private.has_club_role(e.club_id, array['owner','organizer','score_official','staff']::public.club_role[])
    )
    or exists (
      select 1 from public.event_registrations registration
      where registration.event_id = p_event_id
        and registration.player_id = public.current_player_id()
        and registration.status = 'confirmed'
    )
  )
$$;

revoke all on function private.can_view_event_operations(uuid) from public, anon, authenticated;

drop policy if exists queue_participant_or_club_read on public.event_queue_entries;
create policy queue_event_participant_or_club_read on public.event_queue_entries
for select to authenticated using (
  player_id = public.current_player_id()
  or private.can_view_event_operations(event_id)
);

drop policy if exists match_participant_or_club_read on public.matches;
create policy match_event_participant_or_club_read on public.matches
for select to authenticated using (
  private.is_match_participant(id)
  or private.can_view_event_operations(event_id)
);

drop policy if exists match_participant_rows_read on public.match_participants;
create policy match_participant_rows_event_read on public.match_participants
for select to authenticated using (
  player_id = public.current_player_id()
  or private.can_view_event_operations(event_id)
);

create or replace function public.assign_next_queued_match(
  p_event_id uuid,
  p_format text,
  p_idempotency_key uuid
)
returns table(match_id uuid, court_id uuid, assignment_version bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_proposal_id uuid;
  v_court_id uuid;
  v_queue_version bigint;
begin
  select generated.proposal_id, generated.court_id
  into v_proposal_id, v_court_id
  from public.generate_match_proposal(p_event_id, p_format, p_idempotency_key) generated;

  if v_proposal_id is null then
    raise exception using errcode = 'P0001', detail = 'PROPOSAL_FAILED';
  end if;

  select proposal.queue_version
  into v_queue_version
  from public.match_proposals proposal
  where proposal.id = v_proposal_id;

  return query
  select confirmed.match_id, v_court_id, confirmed.assignment_version
  from public.confirm_match_proposal(v_proposal_id, v_queue_version, p_idempotency_key) confirmed;
end
$$;

revoke all on function public.assign_next_queued_match(uuid, text, uuid) from public;
grant execute on function public.assign_next_queued_match(uuid, text, uuid) to authenticated;

comment on function public.assign_next_queued_match(uuid, text, uuid) is
  'Atomically assigns the first complete ready queue group to the next available court.';
