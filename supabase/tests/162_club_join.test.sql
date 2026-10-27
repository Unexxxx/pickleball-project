begin;
select plan(20);

-- Players: 1 owner, 2 staff, 3 and 4 newcomers.
do $$ declare n int; id uuid; begin
 for n in 1..4 loop
  id := ('95000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'join-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'join-test-'||n,'Join Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values
 ('95000000-0000-4000-8000-0000000000c1','join-approval','Approval Club','UTC'),
 ('95000000-0000-4000-8000-0000000000c2','join-open','Open Club','UTC');
update public.clubs set join_policy = 'open' where id = '95000000-0000-4000-8000-0000000000c2';
insert into public.club_memberships(club_id,player_id,role) values
 ('95000000-0000-4000-8000-0000000000c1','95000000-0000-4000-8000-000000000001','owner'),
 ('95000000-0000-4000-8000-0000000000c1','95000000-0000-4000-8000-000000000002','staff'),
 ('95000000-0000-4000-8000-0000000000c2','95000000-0000-4000-8000-000000000001','owner');

select is((select join_policy from public.clubs where id='95000000-0000-4000-8000-0000000000c1'),'approval','clubs require approval by default');
select ok(not has_function_privilege('anon','public.request_club_membership(uuid)','EXECUTE'),'signing in is required to join');

set local role authenticated;

-- Newcomer 3 requests to join the approval club: pending, no club role.
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000003',true);
select is(public.request_club_membership('95000000-0000-4000-8000-0000000000c1'),'requested','approval club records a request');
select is(public.request_club_membership('95000000-0000-4000-8000-0000000000c1'),'requested','asking again is idempotent');
select is((select status::text||'/'||role::text from public.club_memberships where club_id='95000000-0000-4000-8000-0000000000c1' and player_id='95000000-0000-4000-8000-000000000003'),'requested/member','a request is stored as pending, not active');
select is((select count(*)::int from public.club_member_directory('95000000-0000-4000-8000-0000000000c1')),2,'pending requests are not listed publicly');
select throws_ok($$select * from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1')$$,'P0001',null,'non-staff cannot read the staff roster');
select throws_ok($$select public.set_club_join_policy('95000000-0000-4000-8000-0000000000c1','open')$$,'P0001',null,'members cannot change the join policy');

-- Newcomer 4 joins the open club at once.
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000004',true);
select is(public.request_club_membership('95000000-0000-4000-8000-0000000000c2'),'active','open club joins immediately');
select is((select status::text from public.club_memberships where club_id='95000000-0000-4000-8000-0000000000c2' and player_id='95000000-0000-4000-8000-000000000004'),'active','open-club joiner is an active member');

-- Staff (player 2) sees and approves the request.
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where status='requested'),1,'staff see the pending request');
select lives_ok($$select public.review_club_membership('95000000-0000-4000-8000-0000000000c1',
  (select membership_id from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where player_id='95000000-0000-4000-8000-000000000003'), true)$$,'staff approve the request');
select is((select status::text from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where player_id='95000000-0000-4000-8000-000000000003'),'active','approved request becomes an active membership');
-- Staff cannot remove the owner; staff can remove a plain member.
select throws_ok($$select public.remove_club_member('95000000-0000-4000-8000-0000000000c1',
  (select membership_id from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where player_id='95000000-0000-4000-8000-000000000001'))$$,'P0001',null,'staff cannot remove an owner');
select lives_ok($$select public.remove_club_member('95000000-0000-4000-8000-0000000000c1',
  (select membership_id from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where player_id='95000000-0000-4000-8000-000000000003'))$$,'staff remove a member');
select is((select count(*)::int from public.club_staff_roster('95000000-0000-4000-8000-0000000000c1') where player_id='95000000-0000-4000-8000-000000000003'),0,'removed member leaves the roster');

-- The only owner cannot leave; a member can, and can rejoin.
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.leave_club('95000000-0000-4000-8000-0000000000c1')$$,'P0001',null,'the last owner cannot leave');
select lives_ok($$select public.set_club_join_policy('95000000-0000-4000-8000-0000000000c1','open')$$,'owner changes the join policy');
select set_config('request.jwt.claim.sub','95000000-0000-4000-8000-000000000004',true);
select lives_ok($$select public.leave_club('95000000-0000-4000-8000-0000000000c2')$$,'a member leaves');
select is(public.request_club_membership('95000000-0000-4000-8000-0000000000c2'),'active','a former member can rejoin');
reset role;

select * from finish();
rollback;
