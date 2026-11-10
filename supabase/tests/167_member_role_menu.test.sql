begin;
select plan(12);

-- Players: 1 owner, 2 admin ('organizer'), 3 member, 4 requested (pending).
do $$ declare n int; id uuid; begin
 for n in 1..4 loop
  id := ('96700000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'role-menu-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'role-menu-'||n,'Role Menu '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96700000-0000-4000-8000-0000000000c1','role-menu','Role Menu Club','UTC');
insert into public.club_memberships(id,club_id,player_id,role,status) values
 ('96700000-0000-4000-8000-0000000000a1','96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-000000000001','owner','active'),
 ('96700000-0000-4000-8000-0000000000a2','96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-000000000002','organizer','active'),
 ('96700000-0000-4000-8000-0000000000a3','96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-000000000003','member','active'),
 ('96700000-0000-4000-8000-0000000000a4','96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-000000000004','member','requested');

-- Staff and score officials are retired: memberships can't hold them.
select throws_ok($$update public.club_memberships set role='staff' where id='96700000-0000-4000-8000-0000000000a3'$$,'23514',null,'a membership cannot be staff');
select throws_ok($$update public.club_memberships set role='score_official' where id='96700000-0000-4000-8000-0000000000a3'$$,'23514',null,'a membership cannot be a score official');

-- Admins pass the checks that used to allow staff or score officials, but
-- not owner-only checks.
select set_config('request.jwt.claim.sub','96700000-0000-4000-8000-000000000002',true);
select ok(private.has_club_role('96700000-0000-4000-8000-0000000000c1',array['owner','score_official']::public.club_role[]),'an admin can do what score officials did');
select ok(not private.has_club_role('96700000-0000-4000-8000-0000000000c1',array['owner']::public.club_role[]),'an admin is not an owner');

set local role authenticated;

-- Admins can't change roles.
select throws_ok($$select public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a3','organizer','menu',gen_random_uuid())$$,'P0001',null,'only owners change roles');

select set_config('request.jwt.claim.sub','96700000-0000-4000-8000-000000000001',true);
select is(public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a3','organizer','menu',gen_random_uuid()),2::bigint,'the owner makes a member an admin');
select is((select role::text from public.club_memberships where id='96700000-0000-4000-8000-0000000000a3'),'organizer','the role is saved');
select lives_ok($$select public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a2','member','menu',gen_random_uuid())$$,'the owner turns an admin back into a member');
select throws_ok($$select public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a3','staff','menu',gen_random_uuid())$$,'P0001',null,'staff is no longer a role to give');
select throws_ok($$select public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a4','organizer','menu',gen_random_uuid())$$,'P0001',null,'a pending request gets no role');
select throws_ok($$select public.set_membership_role('96700000-0000-4000-8000-0000000000c1','96700000-0000-4000-8000-0000000000a1','member','menu',gen_random_uuid())$$,'P0001',null,'the last owner keeps the owner role');
reset role;
select is((select count(*)::int from private.audit_log where club_id='96700000-0000-4000-8000-0000000000c1' and action='membership.role_changed'),2,'each change is audit-logged');

select * from finish();
rollback;
