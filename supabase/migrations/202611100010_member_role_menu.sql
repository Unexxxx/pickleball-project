-- Club roles are now just Owner, Admin and Member. "Admin" is stored as the
-- existing 'organizer' enum value (renaming it would break every function
-- body that names it). Staff and score officials are retired:
--   * staff become admins, score officials become members;
--   * memberships can only hold owner, organizer (admin) or member;
--   * an admin passes every check that used to allow staff or score
--     officials, so admins run events, approve players, enter scores and
--     resolve disputes. Owner-only checks stay owner-only;
--   * owners make a member an admin, or an admin a member, from the
--     Members tab. The person must be an active member of this club, the
--     last owner can't be demoted, and the row's version moves.

update public.club_memberships
set role = case role when 'staff' then 'organizer'::public.club_role
                     else 'member'::public.club_role end,
    version = version + 1
where role in ('staff', 'score_official');

alter table public.club_memberships
  add constraint club_memberships_role_owner_admin_member
  check (role in ('owner', 'organizer', 'member'));

create or replace function private.has_club_role(p_club_id uuid, p_roles public.club_role[])
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private
as $$
  select exists(
    select 1 from public.club_memberships
    where club_id = p_club_id
      and player_id = public.current_player_id()
      and status = 'active'
      and (
        role = any(p_roles)
        or (role = 'organizer'
            and p_roles && array['staff', 'score_official']::public.club_role[])
      )
  )
$$;

create or replace function public.set_membership_role(
  p_club_id uuid,
  p_membership_id uuid,
  p_role public.club_role,
  p_reason text,
  p_idempotency_key uuid
)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old public.club_role;
  v_version bigint;
begin
  if not private.has_club_role(p_club_id, array['owner']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if p_role not in ('organizer', 'member') then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
  select membership.role into v_old
  from public.club_memberships membership
  where membership.id = p_membership_id
    and membership.club_id = p_club_id
    and membership.status = 'active'
  for update;
  if not found then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;
  if v_old = 'owner' and private.club_active_owner_count(p_club_id) <= 1 then
    raise exception using errcode = 'P0001', detail = 'LAST_OWNER';
  end if;

  update public.club_memberships
  set role = p_role, version = version + 1
  where id = p_membership_id
  returning version into v_version;

  insert into private.audit_log(
    actor_auth_user_id, action, aggregate_type, aggregate_id, club_id,
    before_state, after_state, request_id
  ) values (
    auth.uid(), 'membership.role_changed', 'membership', p_membership_id, p_club_id,
    jsonb_build_object('role', v_old), jsonb_build_object('role', p_role, 'reason', p_reason),
    p_idempotency_key
  );
  return v_version;
end
$$;
