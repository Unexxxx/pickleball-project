-- Joining and leaving clubs.
--   * Each club picks a join policy: 'open' (joining makes you an active
--     member at once) or 'approval' (a 'requested' membership that club
--     staff approve or decline). Existing clubs default to 'approval'.
--   * Owners, organizers and staff review requests and remove members;
--     only owners can remove staff, organizers or other owners, and a club
--     always keeps at least one active owner.
--   * Every change is written to the audit log.

alter table public.clubs
  add column join_policy text not null default 'approval'
  check (join_policy in ('open', 'approval'));

create function private.club_active_owner_count(p_club_id uuid)
returns bigint language sql stable security definer
set search_path = pg_catalog, public
as $$
  select count(*) from public.club_memberships
  where club_id = p_club_id and role = 'owner' and status = 'active'
$$;
revoke all on function private.club_active_owner_count(uuid) from public, anon, authenticated;

-- Join (open clubs) or request to join (approval clubs). Returns the
-- resulting membership status.
create function public.request_club_membership(p_club_id uuid)
returns text language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_policy text;
  v_existing public.club_memberships%rowtype;
  v_status public.membership_status;
begin
  if v_actor is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;
  select join_policy into v_policy from public.clubs where id = p_club_id;
  if v_policy is null then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;

  select * into v_existing from public.club_memberships
  where club_id = p_club_id and player_id = v_actor for update;
  if found and v_existing.status in ('active', 'invited', 'requested') then
    return v_existing.status::text;
  end if;
  if found and v_existing.status = 'suspended' then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;

  v_status := case when v_policy = 'open' then 'active' else 'requested' end;
  if found then
    -- Rejoining after leaving starts again as a plain member.
    update public.club_memberships
    set status = v_status, role = 'member', version = version + 1
    where id = v_existing.id;
  else
    insert into public.club_memberships (club_id, player_id, role, status)
    values (p_club_id, v_actor, 'member', v_status);
  end if;

  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, after_state)
  values (auth.uid(),
          case when v_status = 'active' then 'membership.joined' else 'membership.requested' end,
          'club', p_club_id, p_club_id, jsonb_build_object('playerId', v_actor, 'status', v_status));
  return v_status::text;
end
$$;

-- Leave a club, or cancel a pending request. The last active owner can't
-- leave (the club would have nobody who can manage it).
create function public.leave_club(p_club_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_actor uuid := public.current_player_id();
  v_membership public.club_memberships%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = 'P0001', detail = 'AUTH_REQUIRED';
  end if;
  select * into v_membership from public.club_memberships
  where club_id = p_club_id and player_id = v_actor
    and status in ('active', 'invited', 'requested')
  for update;
  if not found then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;
  if v_membership.role = 'owner' and v_membership.status = 'active'
     and private.club_active_owner_count(p_club_id) <= 1 then
    raise exception using errcode = 'P0001', detail = 'LAST_OWNER';
  end if;
  update public.club_memberships
  set status = 'left', version = version + 1
  where id = v_membership.id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(),
          case when v_membership.status = 'requested' then 'membership.request_canceled' else 'membership.left' end,
          'membership', v_membership.id, p_club_id,
          jsonb_build_object('status', v_membership.status, 'role', v_membership.role),
          jsonb_build_object('status', 'left'));
end
$$;

-- Staff approve or decline a pending request.
create function public.review_club_membership(p_club_id uuid, p_membership_id uuid, p_approve boolean)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_status public.membership_status;
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer', 'staff']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  select status into v_status from public.club_memberships
  where id = p_membership_id and club_id = p_club_id for update;
  if v_status is distinct from 'requested' then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  update public.club_memberships
  set status = case when p_approve then 'active' else 'left' end::public.membership_status,
      role = 'member', version = version + 1
  where id = p_membership_id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, after_state)
  values (auth.uid(),
          case when p_approve then 'membership.approved' else 'membership.declined' end,
          'membership', p_membership_id, p_club_id,
          jsonb_build_object('status', case when p_approve then 'active' else 'left' end));
end
$$;

-- Staff remove an active member. Removing an owner, organizer or staff
-- member takes an owner; nobody removes the last owner or themselves
-- (that's leave_club).
create function public.remove_club_member(p_club_id uuid, p_membership_id uuid)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_target public.club_memberships%rowtype;
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer', 'staff']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  select * into v_target from public.club_memberships
  where id = p_membership_id and club_id = p_club_id and status in ('active', 'invited')
  for update;
  if not found then
    raise exception using errcode = 'P0001', detail = 'NOT_FOUND';
  end if;
  if v_target.player_id = public.current_player_id() then
    raise exception using errcode = 'P0001', detail = 'INVALID_STATE_TRANSITION';
  end if;
  if v_target.role in ('owner', 'organizer', 'staff')
     and not private.has_club_role(p_club_id, array['owner']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if v_target.role = 'owner' and private.club_active_owner_count(p_club_id) <= 1 then
    raise exception using errcode = 'P0001', detail = 'LAST_OWNER';
  end if;
  update public.club_memberships
  set status = 'left', version = version + 1
  where id = p_membership_id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(), 'membership.removed', 'membership', p_membership_id, p_club_id,
          jsonb_build_object('status', v_target.status, 'role', v_target.role),
          jsonb_build_object('status', 'left'));
end
$$;

-- Owners and organizers choose how people join.
create function public.set_club_join_policy(p_club_id uuid, p_policy text)
returns void language plpgsql security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_old text;
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  if p_policy not in ('open', 'approval') then
    raise exception using errcode = 'P0001', detail = 'VALIDATION_FAILED';
  end if;
  select join_policy into v_old from public.clubs where id = p_club_id for update;
  update public.clubs set join_policy = p_policy where id = p_club_id;
  insert into private.audit_log (actor_auth_user_id, action, aggregate_type, aggregate_id, club_id, before_state, after_state)
  values (auth.uid(), 'club.join_policy_updated', 'club', p_club_id, p_club_id,
          jsonb_build_object('policy', v_old), jsonb_build_object('policy', p_policy));
end
$$;

-- Staff view of the roster: pending requests and members with the ids the
-- review/remove commands need. Staff see private members' names here so they
-- can manage their own club.
create function public.club_staff_roster(p_club_id uuid)
returns table (
  membership_id uuid,
  player_id uuid,
  display_name text,
  public_slug text,
  avatar_path text,
  role public.club_role,
  status public.membership_status,
  since timestamptz
)
language plpgsql stable security definer
set search_path = pg_catalog, public, private
as $$
begin
  if not private.has_club_role(p_club_id, array['owner', 'organizer', 'staff']::public.club_role[]) then
    raise exception using errcode = 'P0001', detail = 'PERMISSION_DENIED';
  end if;
  return query
  select m.id, p.id, p.display_name, p.public_slug, p.avatar_path, m.role, m.status,
         case when m.status = 'requested' then m.updated_at else m.created_at end
  from public.club_memberships m
  join public.players p on p.id = m.player_id
  where m.club_id = p_club_id and m.status in ('active', 'invited', 'requested')
  order by m.status = 'requested' desc, p.display_name;
end
$$;

revoke all on function
  public.request_club_membership(uuid),
  public.leave_club(uuid),
  public.review_club_membership(uuid, uuid, boolean),
  public.remove_club_member(uuid, uuid),
  public.set_club_join_policy(uuid, text),
  public.club_staff_roster(uuid)
from public, anon;
grant execute on function
  public.request_club_membership(uuid),
  public.leave_club(uuid),
  public.review_club_membership(uuid, uuid, boolean),
  public.remove_club_member(uuid, uuid),
  public.set_club_join_policy(uuid, text),
  public.club_staff_roster(uuid)
to authenticated;
