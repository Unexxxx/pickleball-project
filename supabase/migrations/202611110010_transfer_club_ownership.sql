-- An owner hands the club to one of its admins from the Members tab. The
-- admin becomes the owner and the previous owner becomes an admin, in one
-- step. Only admins ('organizer') can receive it: a member is made an admin
-- first.

create function public.transfer_club_ownership(
  p_club_id uuid,
  p_membership_id uuid,
  p_idempotency_key uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_mine public.club_memberships%rowtype;
  v_target public.club_memberships%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;
  select * into v_mine from public.club_memberships
  where club_id = p_club_id and player_id = v_actor
    and status = 'active' and role = 'owner'
  for update;
  if not found then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  select * into v_target from public.club_memberships
  where id = p_membership_id and club_id = p_club_id and status = 'active'
  for update;
  if not found or v_target.id = v_mine.id then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;
  if v_target.role <> 'organizer' then
    raise exception using errcode = 'P0001', detail = 'NOT_ADMIN';
  end if;

  update public.club_memberships
  set role = 'owner', version = version + 1
  where id = v_target.id;
  update public.club_memberships
  set role = 'organizer', version = version + 1
  where id = v_mine.id;

  insert into private.audit_log (
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id,
    before_state, after_state, request_id
  ) values (
    auth.uid(), 'club.ownership_transferred', 'club', p_club_id, p_club_id,
    jsonb_build_object('ownerPlayerId', v_actor),
    jsonb_build_object('ownerPlayerId', v_target.player_id),
    p_idempotency_key
  );
end
$$;

revoke all on function public.transfer_club_ownership(uuid, uuid, uuid) from public;
grant execute on function public.transfer_club_ownership(uuid, uuid, uuid) to authenticated;
