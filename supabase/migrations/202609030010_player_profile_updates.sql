create or replace function public.update_my_player_profile(
  p_display_name text,
  p_avatar_path text,
  p_expected_version bigint,
  p_idempotency_key uuid
)
returns table(player_id uuid, display_name text, avatar_path text, version bigint)
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_player_id uuid := public.current_player_id();
  v_before jsonb;
begin
  if v_player_id is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;

  if length(trim(p_display_name)) not between 2 and 80
    or lower(trim(p_display_name)) ~ '^(guest|ghost|anonymous|anon|unknown|player[[:space:]]*[0-9]+)$'
  then
    raise exception using errcode = 'P0001', detail = 'INVALID_IDENTITY';
  end if;

  if p_avatar_path is not null
    and p_avatar_path !~ ('^' || auth.uid()::text || '/[0-9a-f-]+\.(jpg|jpeg|png|webp)$')
  then
    raise exception using errcode = 'P0001', detail = 'INVALID_AVATAR_PATH';
  end if;

  select jsonb_build_object(
    'display_name', p.display_name,
    'avatar_path', p.avatar_path,
    'version', p.version
  )
  into v_before
  from public.players p
  where p.id = v_player_id;

  update public.players p
  set display_name = trim(p_display_name),
      avatar_path = p_avatar_path,
      version = p.version + 1
  where p.id = v_player_id
    and p.version = p_expected_version
  returning p.id, p.display_name, p.avatar_path, p.version
  into player_id, display_name, avatar_path, version;

  if player_id is null then
    raise exception using errcode = 'P0001', detail = 'STALE_VERSION';
  end if;

  insert into private.audit_log(
    actor_auth_user_id,
    action,
    aggregate_type,
    aggregate_id,
    request_id,
    before_state,
    after_state
  )
  values (
    auth.uid(),
    'player.profile_updated',
    'player',
    player_id,
    p_idempotency_key,
    v_before,
    jsonb_build_object(
      'display_name', display_name,
      'avatar_path', avatar_path,
      'version', version
    )
  );

  return next;
end
$$;

revoke all on function public.update_my_player_profile(text, text, bigint, uuid) from public;
grant execute on function public.update_my_player_profile(text, text, bigint, uuid) to authenticated;

create policy avatar_owner_update
on storage.objects
for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy avatar_owner_delete
on storage.objects
for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
