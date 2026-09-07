create or replace function private.attest_identity_from_organizer_check_in()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_club_id uuid;
  v_actor_auth_user_id uuid;
  v_attestation_id uuid;
begin
  if new.state <> 'checked_in' or new.changed_by is null then
    return new;
  end if;

  select event.club_id
  into v_club_id
  from public.events event
  where event.id = new.event_id;

  if v_club_id is null
    or not exists (
      select 1
      from public.club_memberships membership
      where membership.club_id = v_club_id
        and membership.player_id = new.changed_by
        and membership.status = 'active'
        and membership.role in ('owner', 'organizer', 'score_official', 'staff')
    )
    or not exists (
      select 1
      from public.accounts account
      where account.player_id = new.player_id
        and account.contact_verified_at is not null
    )
  then
    return new;
  end if;

  select account.auth_user_id
  into v_actor_auth_user_id
  from public.accounts account
  where account.player_id = new.changed_by;

  insert into public.identity_attestations(
    club_id,
    player_id,
    attested_by_player_id,
    attestation_type,
    note
  ) values (
    v_club_id,
    new.player_id,
    new.changed_by,
    'in_person',
    'Identity verified during organizer check-in.'
  )
  on conflict(club_id, player_id, attestation_type) do update
  set attested_by_player_id = excluded.attested_by_player_id,
      note = excluded.note,
      created_at = now(),
      revoked_at = null
  returning id into v_attestation_id;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    after_state
  ) values (
    v_actor_auth_user_id,
    'identity.attested_from_organizer_check_in',
    'player',
    new.player_id,
    v_club_id,
    extensions.gen_random_uuid(),
    jsonb_build_object(
      'attestation_id', v_attestation_id,
      'attestation_type', 'in_person',
      'attendance_id', new.id,
      'event_id', new.event_id
    )
  );

  return new;
end
$$;

revoke all on function private.attest_identity_from_organizer_check_in()
from public, anon, authenticated;

drop trigger if exists event_attendance_identity_attestation
on public.event_attendance;

create trigger event_attendance_identity_attestation
after insert or update of state, changed_by
on public.event_attendance
for each row
execute function private.attest_identity_from_organizer_check_in();

-- Apply the same rule to current check-ins made by attributable authorized staff.
update public.event_attendance
set changed_by = changed_by
where state = 'checked_in'
  and changed_by is not null;

comment on function private.attest_identity_from_organizer_check_in() is
  'Creates an auditable in-person Club identity attestation when authorized staff check a verified player into an event.';
