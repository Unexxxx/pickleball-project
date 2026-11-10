begin;
select plan(16);

-- Players: 1 owner, 2 admin, 3..37 members (36 and 37 private), 38 and 39
-- asking to join, 40 a member called "100% Pickle" (a literal % in a name).
do $$ declare n int; id uuid; begin
 for n in 1..40 loop
  id := ('96900000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'pages-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name,visibility)
  values(id,'pages-'||n,case when n=40 then '100% Pickle' else 'Member '||lpad(n::text,2,'0') end,
         case when n in (36,37) then 'private' else 'public' end);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96900000-0000-4000-8000-0000000000c1','pages','Pages Club','UTC');
insert into public.club_memberships(club_id,player_id,role,status)
select '96900000-0000-4000-8000-0000000000c1',
       ('96900000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       (case n when 1 then 'owner' when 2 then 'organizer' else 'member' end)::public.club_role,
       (case when n in (38,39) then 'requested' else 'active' end)::public.membership_status
from generate_series(1,40) n;

-- Anyone can read the counts and the public list.
set local role anon;
select results_eq($$select members, private_members from public.club_member_counts('96900000-0000-4000-8000-0000000000c1')$$,
  $$values (38, 2)$$, 'counts everyone active and the private members');
select is((select count(*)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members')),30,'the first page has 30 members');
select is((select max(total)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members')),34,'total counts public members only');
select is((select display_name from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members') limit 1),'100% Pickle','members are sorted by name');
select is((select count(*)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members',null,'Member 31','96900000-0000-4000-8000-000000000031')),4,'the next page continues after the last name');
select is((select count(distinct player_id)::int from (
  select player_id from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members')
  union all
  select player_id from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members',null,'Member 31','96900000-0000-4000-8000-000000000031')) pages),34,'pages neither skip nor repeat anyone');
select is((select max(total)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members','member 1')),10,'search finds names across the whole club');
select is((select max(total)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members','%')),1,'a % in the search is matched literally');
select is((select count(*)::int from public.club_member_page('96900000-0000-4000-8000-0000000000c1','members') where player_id in ('96900000-0000-4000-8000-000000000036','96900000-0000-4000-8000-000000000037')),0,'private members are not named');
select is((select role::text from public.club_member_page('96900000-0000-4000-8000-0000000000c1','staff') limit 1),'owner','the owner leads the staff list');
select throws_ok($$select * from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','members')$$,'42501',null,'visitors cannot read the roster');

set local role authenticated;
select set_config('request.jwt.claim.sub','96900000-0000-4000-8000-000000000003',true);
select throws_ok($$select * from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','members')$$,'P0001',null,'members cannot read the roster');

select set_config('request.jwt.claim.sub','96900000-0000-4000-8000-000000000002',true);
select is((select max(total)::int from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','members')),36,'admins see every member, private ones too');
select is((select count(*)::int from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','members')),30,'the roster also comes 30 at a time');
select is((select max(total)::int from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','requests')),2,'admins see pending requests');
select is((select count(*)::int from public.club_roster_page('96900000-0000-4000-8000-0000000000c1','staff')),2,'the staff list has the owner and the admin');

select * from finish();
rollback;
