begin;
select plan(18);

-- Players: 1 owner, 2 club member, 3 and 4 outsiders, 5 a late outsider.
do $$ declare n int; id uuid; begin
 for n in 1..5 loop
  id := ('96000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'event-req-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'event-req-'||n,'Event Req '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96000000-0000-4000-8000-0000000000c1','event-requests','Requests Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('96000000-0000-4000-8000-0000000000c1','96000000-0000-4000-8000-000000000001','owner'),
 ('96000000-0000-4000-8000-0000000000c1','96000000-0000-4000-8000-000000000002','member');
-- e1 public with one spot; e2 private (passcode "dink1234").
insert into public.events(id,club_id,type,name,venue,starts_at,ends_at,capacity,formats,record_class,status,is_private,access_code_hash) values
 ('96000000-0000-4000-8000-0000000000e1','96000000-0000-4000-8000-0000000000c1','open_play','Public Play','Court',now()+interval '1 day',now()+interval '2 days',1,array['doubles'],'unranked','published',false,null),
 ('96000000-0000-4000-8000-0000000000e2','96000000-0000-4000-8000-0000000000c1','open_play','Private Play','Court',now()+interval '1 day',now()+interval '2 days',8,array['doubles'],'unranked','published',true,extensions.crypt('dink1234',extensions.gen_salt('bf')));

select ok(not has_function_privilege('anon','public.review_event_registration(uuid,boolean)','EXECUTE'),'anonymous users cannot review requests');

set local role authenticated;
-- Private events are listed for everyone, outsiders included.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.events where club_id='96000000-0000-4000-8000-0000000000c1'),2,'private events show in listings');

-- Outsider 3 asks to join the public event: a request, no spot.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000003',true);
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','joining a public event sends a request');
select throws_ok($$select * from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())$$,'P0001',null,'one request per player');
select throws_ok($$select public.review_event_registration((select id from public.event_registrations where player_id='96000000-0000-4000-8000-000000000003'),true)$$,'P0001',null,'players cannot approve themselves');

-- The private event needs the passcode, even from a club member.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.register_for_event('96000000-0000-4000-8000-0000000000e2','t',null,gen_random_uuid())$$,'P0001',null,'club members need the passcode too');
select throws_ok($$select * from public.register_for_event('96000000-0000-4000-8000-0000000000e2','t','wrong',gen_random_uuid())$$,'P0001',null,'a wrong passcode is rejected');
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e2','t',' dink1234 ',gen_random_uuid())),'confirmed','the right passcode joins straight away');

-- Outsider 4 also asks; outsider 5 asks too.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000004',true);
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','a second request');
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000005',true);
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','a third request');
-- 5 changes their mind.
select lives_ok($$select public.withdraw_from_event('96000000-0000-4000-8000-0000000000e1','changed mind',gen_random_uuid())$$,'a player can take back a request');

-- The owner approves 3 (the one spot), then 4 (waitlist).
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',true);
select is(public.review_event_registration((select id from public.event_registrations where event_id='96000000-0000-4000-8000-0000000000e1' and player_id='96000000-0000-4000-8000-000000000003'),true)::text,'confirmed','approving fills a free spot');
select is(public.review_event_registration((select id from public.event_registrations where event_id='96000000-0000-4000-8000-0000000000e1' and player_id='96000000-0000-4000-8000-000000000004'),true)::text,'waitlisted','approving when full goes to the waitlist');
select throws_ok($$select public.review_event_registration((select id from public.event_registrations where event_id='96000000-0000-4000-8000-0000000000e1' and player_id='96000000-0000-4000-8000-000000000003'),false)$$,'P0001',null,'only pending requests can be reviewed');

-- Staff join their own club's public event without approval.
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'waitlisted','club staff skip the approval step');

-- Member 2 asks for the public event and is declined; asking again is blocked.
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',true);
select is((select status::text from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','a member of the club still asks for a public event');
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',true);
select is(public.review_event_registration((select id from public.event_registrations where event_id='96000000-0000-4000-8000-0000000000e1' and player_id='96000000-0000-4000-8000-000000000002'),false)::text,'canceled','declining closes the request');
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.register_for_event('96000000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())$$,'P0001',null,'a declined player cannot ask again');

select * from finish();
rollback;
