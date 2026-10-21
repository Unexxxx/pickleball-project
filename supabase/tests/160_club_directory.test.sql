begin;
select plan(11);

-- Three players: an owner, a public member and a private member.
do $$ declare n int; id uuid; begin
 for n in 1..3 loop
  id := ('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'directory-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'directory-test-'||n,'Directory Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
update public.players set visibility = 'private' where id = '97000000-0000-4000-8000-000000000003';
insert into public.clubs(id,slug,name,timezone) values('97000000-0000-4000-8000-0000000000c1','directory-test','Directory Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000001','owner'),
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000002','member'),
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000003','member');

select ok(has_function_privilege('anon','public.club_member_directory(uuid)','EXECUTE'),'anyone can read a club directory');
select ok(not has_function_privilege('anon','public.set_club_contact(uuid,text)','EXECUTE'),'anonymous users cannot set a club contact');

set local role anon;
select is((select count(*)::int from public.club_member_directory('97000000-0000-4000-8000-0000000000c1')),3,'directory lists every active member');
select is((select role::text from public.club_member_directory('97000000-0000-4000-8000-0000000000c1') limit 1),'owner','club leads are listed first');
select is((select count(*)::int from public.club_member_directory('97000000-0000-4000-8000-0000000000c1') where display_name is null and player_id is null and public_slug is null),1,'private members keep their identity hidden');
select ok(not exists(select 1 from public.club_member_directory('97000000-0000-4000-8000-0000000000c1') where display_name = 'Directory Test 3'),'private member name is never published');
reset role;

-- A plain member cannot publish the contact.
set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.set_club_contact('97000000-0000-4000-8000-0000000000c1','fb.com/x')$$,'P0001',null,'members cannot set the club contact');

-- The owner can set, trims it, and blank clears it.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.set_club_contact('97000000-0000-4000-8000-0000000000c1','  fb.com/directoryclub  ')$$,'owner sets the club contact');
select is((select contact_info from public.clubs where id='97000000-0000-4000-8000-0000000000c1'),'fb.com/directoryclub','contact is stored trimmed');
select lives_ok($$select public.set_club_contact('97000000-0000-4000-8000-0000000000c1','   ')$$,'owner clears the club contact');
reset role;
select is((select contact_info from public.clubs where id='97000000-0000-4000-8000-0000000000c1'),null,'blank contact clears it');

select * from finish();
rollback;
