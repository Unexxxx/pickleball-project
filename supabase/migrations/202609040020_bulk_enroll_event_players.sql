do $$
declare
  v_event_id uuid;
  v_club_id uuid;
  v_capacity integer;
  v_confirmed_count integer;
  v_waitlist_max bigint;
  v_inserted_count integer;
begin
  select event.id, event.club_id, event.capacity
  into v_event_id, v_club_id, v_capacity
  from public.events event
  where event.join_code = '58f34b73143f09bf3f'
    and event.status = 'published'
  for update;

  if v_event_id is null then
    raise exception using errcode = 'P0001', detail = 'TARGET_EVENT_NOT_FOUND_OR_NOT_PUBLISHED';
  end if;

  select count(*)
  into v_confirmed_count
  from public.event_registrations registration
  where registration.event_id = v_event_id
    and registration.status = 'confirmed';

  select coalesce(max(registration.waitlist_position), 0)
  into v_waitlist_max
  from public.event_registrations registration
  where registration.event_id = v_event_id
    and registration.status = 'waitlisted';

  with candidates as (
    select
      account.player_id,
      row_number() over(order by player.created_at, player.id) as sequence
    from public.accounts account
    join public.players player on player.id = account.player_id
    where account.contact_verified_at is not null
      and player.merged_into_player_id is null
      and not exists (
        select 1
        from public.event_registrations active_registration
        where active_registration.event_id = v_event_id
          and active_registration.player_id = account.player_id
          and active_registration.status in ('confirmed', 'waitlisted')
      )
  )
  insert into public.event_registrations(
    event_id,
    player_id,
    status,
    waitlist_position,
    terms_version
  )
  select
    v_event_id,
    candidate.player_id,
    case
      when v_confirmed_count + candidate.sequence <= v_capacity
        then 'confirmed'::public.registration_status
      else 'waitlisted'::public.registration_status
    end,
    case
      when v_confirmed_count + candidate.sequence > v_capacity
        then v_waitlist_max + candidate.sequence
          - greatest(v_capacity - v_confirmed_count, 0)
      else null
    end,
    'admin-bulk-enrollment-2026-09-04'
  from candidates candidate;

  get diagnostics v_inserted_count = row_count;

  insert into private.audit_log(
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    after_state
  ) values (
    'event.players_bulk_enrolled',
    'event',
    v_event_id,
    v_club_id,
    extensions.gen_random_uuid(),
    jsonb_build_object(
      'inserted_count', v_inserted_count,
      'terms_version', 'admin-bulk-enrollment-2026-09-04'
    )
  );
end
$$;
