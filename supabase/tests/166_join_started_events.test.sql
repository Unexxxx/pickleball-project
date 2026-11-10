begin;
select plan(10);

-- Players: 1 owner, 2-5 outsiders.
do $$ declare n int; id uuid; begin
 for n in 1..5 loop
  id := ('96600000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'live-join-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'live-join-'||n,'Live Join '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96600000-0000-4000-8000-0000000000c1','live-join','Live Join Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('96600000-0000-4000-8000-0000000000c1','96600000-0000-4000-8000-000000000001','owner');
-- e1 public and in progress with 2 spots; e2 private and in progress with 1
-- spot (passcode "dink1234"); e3 closed for registration; e4 completed.
-- Start times are in the future (new events must be); organizers can start
-- an event early.
insert into public.events(id,club_id,type,name,venue,starts_at,ends_at,capacity,formats,record_class,status,is_private,access_code_hash) values
 ('96600000-0000-4000-8000-0000000000e1','96600000-0000-4000-8000-0000000000c1','open_play','Live Public','Court',now()+interval '1 hour',now()+interval '5 hours',2,array['doubles'],'unranked','in_progress',false,null),
 ('96600000-0000-4000-8000-0000000000e2','96600000-0000-4000-8000-0000000000c1','open_play','Live Private','Court',now()+interval '1 hour',now()+interval '5 hours',1,array['doubles'],'unranked','in_progress',true,extensions.crypt('dink1234',extensions.gen_salt('bf'))),
 ('96600000-0000-4000-8000-0000000000e3','96600000-0000-4000-8000-0000000000c1','open_play','Closed','Court',now()+interval '1 day',now()+interval '2 days',8,array['doubles'],'unranked','registration_closed',false,null),
 ('96600000-0000-4000-8000-0000000000e4','96600000-0000-4000-8000-0000000000c1','open_play','Ended','Court',now()+interval '1 day',now()+interval '2 days',8,array['doubles'],'unranked','completed',false,null);

set local role authenticated;

-- Started public event with free spots: players can still ask.
select set_config('request.jwt.claim.sub','96600000-0000-4000-8000-000000000002',true);
select is((select status::text from public.register_for_event('96600000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','players can ask to join a started event');
select set_config('request.jwt.claim.sub','96600000-0000-4000-8000-000000000003',true);
select is((select status::text from public.register_for_event('96600000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','a second request');
select set_config('request.jwt.claim.sub','96600000-0000-4000-8000-000000000004',true);
select is((select status::text from public.register_for_event('96600000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'requested','a third request');

-- The owner joins (one spot) and approves 2 (the last spot); approving 3 fails.
select set_config('request.jwt.claim.sub','96600000-0000-4000-8000-000000000001',true);
select is((select status::text from public.register_for_event('96600000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())),'confirmed','staff join a started event straight away');
select is(public.review_event_registration((select id from public.event_registrations where event_id='96600000-0000-4000-8000-0000000000e1' and player_id='96600000-0000-4000-8000-000000000002'),true)::text,'confirmed','approving fills the last spot');
select throws_ok($$select public.review_event_registration((select id from public.event_registrations where event_id='96600000-0000-4000-8000-0000000000e1' and player_id='96600000-0000-4000-8000-000000000003'),true)$$,'P0001',null,'no waitlist once the event has started');

-- Full now: new requests are turned away.
select set_config('request.jwt.claim.sub','96600000-0000-4000-8000-000000000005',true);
select throws_ok($$select * from public.register_for_event('96600000-0000-4000-8000-0000000000e1','t',null,gen_random_uuid())$$,'P0001',null,'a full started event takes no new requests');

-- The private started event takes the passcode while a spot is free.
select is((select status::text from public.register_for_event('96600000-0000-4000-8000-0000000000e2','t','dink1234',gen_random_uuid())),'confirmed','the passcode joins a started private event');

-- Closed and ended events stay shut.
select throws_ok($$select * from public.register_for_event('96600000-0000-4000-8000-0000000000e3','t',null,gen_random_uuid())$$,'P0001',null,'a closed event takes no one');
select throws_ok($$select * from public.register_for_event('96600000-0000-4000-8000-0000000000e4','t',null,gen_random_uuid())$$,'P0001',null,'an ended event takes no one');

select * from finish();
rollback;
