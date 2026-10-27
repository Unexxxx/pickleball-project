begin;
select plan(12);

do $$ declare n int; id uuid; begin
 for n in 1..3 loop
  id := ('94000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'contacts-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'contacts-test-'||n,'Contacts Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('94000000-0000-4000-8000-0000000000c1','contacts-test','Contacts Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('94000000-0000-4000-8000-0000000000c1','94000000-0000-4000-8000-000000000001','owner'),
 ('94000000-0000-4000-8000-0000000000c1','94000000-0000-4000-8000-000000000002','staff'),
 ('94000000-0000-4000-8000-0000000000c1','94000000-0000-4000-8000-000000000003','member');

select ok(not has_function_privilege('anon','public.set_club_contacts(uuid,text,text,text)','EXECUTE'),'anonymous users cannot set contacts');

set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000003',true);
select throws_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1','a@b.co',null,null)$$,'P0001',null,'members cannot set contacts');

-- Staff count as club admins here.
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1',' club@example.com ','facebook.com/contactsclub','+63 917 123 4567')$$,'staff set all three contacts');
reset role;
select is((select contact_email from public.clubs where id='94000000-0000-4000-8000-0000000000c1'),'club@example.com','email is stored trimmed');
select is((select contact_facebook from public.clubs where id='94000000-0000-4000-8000-0000000000c1'),'https://facebook.com/contactsclub','a bare Facebook address gets https://');
select is((select contact_phone from public.clubs where id='94000000-0000-4000-8000-0000000000c1'),'+63 917 123 4567','phone is stored as written');

set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-4000-8000-000000000001',true);
select throws_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1','not-an-email',null,null)$$,'P0001',null,'invalid email is rejected');
select throws_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1',null,'https://evil.example/facebook.com/x',null)$$,'P0001',null,'non-Facebook links are rejected');
select lives_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1',null,null,'Viber: 0917 123 4567 (after 5pm)')$$,'the contact number accepts any text');
select throws_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1',null,null,repeat('9',101))$$,'P0001',null,'contact numbers over 100 characters are rejected');
select lives_ok($$select public.set_club_contacts('94000000-0000-4000-8000-0000000000c1','',' ',null)$$,'blank fields clear contacts');
reset role;
select is((select coalesce(contact_email,'')||coalesce(contact_facebook,'')||coalesce(contact_phone,'') from public.clubs where id='94000000-0000-4000-8000-0000000000c1'),'','all contacts cleared');

select * from finish();
rollback;
