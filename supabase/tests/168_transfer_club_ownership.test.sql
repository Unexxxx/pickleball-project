begin;
select plan(8);

-- Players: 1 owner, 2 admin ('organizer'), 3 member.
do $$ declare n int; id uuid; begin
 for n in 1..3 loop
  id := ('96800000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'transfer-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'transfer-'||n,'Transfer '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96800000-0000-4000-8000-0000000000c1','transfer','Transfer Club','UTC');
insert into public.club_memberships(id,club_id,player_id,role,status) values
 ('96800000-0000-4000-8000-0000000000a1','96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-000000000001','owner','active'),
 ('96800000-0000-4000-8000-0000000000a2','96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-000000000002','organizer','active'),
 ('96800000-0000-4000-8000-0000000000a3','96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-000000000003','member','active');

set local role authenticated;

-- An admin can't take the club.
select set_config('request.jwt.claim.sub','96800000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.transfer_club_ownership('96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-0000000000a2',gen_random_uuid())$$,'P0001',null,'only the owner transfers ownership');

select set_config('request.jwt.claim.sub','96800000-0000-4000-8000-000000000001',true);
-- A member must be made an admin first.
select throws_ok($$select public.transfer_club_ownership('96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-0000000000a3',gen_random_uuid())$$,'P0001',null,'a member cannot receive ownership');
select throws_ok($$select public.transfer_club_ownership('96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-0000000000a1',gen_random_uuid())$$,'P0001',null,'the owner cannot transfer to themselves');

select lives_ok($$select public.transfer_club_ownership('96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-0000000000a2',gen_random_uuid())$$,'the owner hands the club to an admin');
select is((select role::text from public.club_memberships where id='96800000-0000-4000-8000-0000000000a2'),'owner','the admin is now the owner');
select is((select role::text from public.club_memberships where id='96800000-0000-4000-8000-0000000000a1'),'organizer','the previous owner is now an admin');
-- The previous owner no longer has owner rights.
select throws_ok($$select public.transfer_club_ownership('96800000-0000-4000-8000-0000000000c1','96800000-0000-4000-8000-0000000000a2',gen_random_uuid())$$,'P0001',null,'the previous owner cannot transfer again');
reset role;
select is((select count(*)::int from private.audit_log where club_id='96800000-0000-4000-8000-0000000000c1' and action='club.ownership_transferred'),1,'the transfer is audit-logged');

select * from finish();
rollback;
