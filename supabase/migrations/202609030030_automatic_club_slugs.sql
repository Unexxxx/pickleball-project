create or replace function public.create_club_auto(
  p_name text,
  p_timezone text,
  p_idempotency_key uuid
)
returns table(club_id uuid, slug text)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_base_slug text;
  v_candidate text;
  v_suffix integer := 1;
begin
  if v_actor is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;

  if length(trim(p_name)) not between 2 and 100 then
    raise exception using errcode = 'P0001', detail = 'INVALID_CLUB_NAME';
  end if;

  if length(trim(p_timezone)) not between 1 and 64 then
    raise exception using errcode = 'P0001', detail = 'INVALID_TIMEZONE';
  end if;

  select
    (command.response->>'clubId')::uuid,
    command.response->>'slug'
  into club_id, slug
  from private.idempotency_commands command
  where command.actor_id = v_actor
    and command.operation = 'create_club_auto'
    and command.key = p_idempotency_key;

  if club_id is not null then
    return next;
    return;
  end if;

  v_base_slug := trim(both '-' from lower(regexp_replace(trim(p_name), '[^a-zA-Z0-9]+', '-', 'g')));
  v_base_slug := left(coalesce(nullif(v_base_slug, ''), 'club'), 32);

  perform pg_advisory_xact_lock(hashtext('club-slug:' || v_base_slug));
  v_candidate := v_base_slug;
  while exists(select 1 from public.clubs existing where existing.slug = v_candidate) loop
    v_suffix := v_suffix + 1;
    v_candidate := left(v_base_slug, 35) || '-' || v_suffix::text;
  end loop;

  insert into private.idempotency_commands(actor_id, operation, key, request_hash)
  values (
    v_actor,
    'create_club_auto',
    p_idempotency_key,
    encode(extensions.digest(concat_ws('|', p_name, p_timezone), 'sha256'), 'hex')
  );

  insert into public.clubs(name, slug, timezone)
  values (trim(p_name), v_candidate, trim(p_timezone))
  returning id, public.clubs.slug into club_id, slug;

  insert into public.club_memberships(club_id, player_id, role)
  values (club_id, v_actor, 'owner');

  update private.idempotency_commands command
  set response = jsonb_build_object('clubId', club_id, 'slug', slug)
  where command.actor_id = v_actor
    and command.operation = 'create_club_auto'
    and command.key = p_idempotency_key;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    club_id,
    request_id,
    after_state
  )
  values (
    auth.uid(),
    'club.created',
    'club',
    club_id,
    club_id,
    p_idempotency_key,
    jsonb_build_object('name', trim(p_name), 'slug', slug, 'timezone', trim(p_timezone))
  );

  return next;
end
$$;

revoke all on function public.create_club_auto(text, text, uuid) from public;
grant execute on function public.create_club_auto(text, text, uuid) to authenticated;
