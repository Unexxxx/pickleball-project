begin;
select plan(17);
create temporary table bayes_sample as select private.team_bayes_update(
'[{"id":"a","side":1,"mu":1500,"sigma":350},{"id":"b","side":1,"mu":1500,"sigma":350},{"id":"c","side":2,"mu":1500,"sigma":350},{"id":"d","side":2,"mu":1500,"sigma":350}]',1) value;
select ok((select (value->0->>'mu')::numeric>1500 from bayes_sample),'winner mean increases');
select is((select value->0->>'mu' from bayes_sample),(select value->1->>'mu' from bayes_sample),'equal confidence teammates receive equal adjustments');
select ok((select (value->0->>'sigma')::numeric<350 from bayes_sample),'uncertainty decreases after evidence');
select ok((select abs((value->0->>'mu')::numeric+(value->2->>'mu')::numeric-3000)<.00001 from bayes_sample),'symmetric match is symmetric');
select throws_ok($$select private.valid_score_winner('{"games":[{"sideA":-1,"sideB":11}]}')$$,'P0001',null,'negative scores rejected');
select ok(not has_function_privilege('authenticated','private.rebuild_team_ratings(text)','EXECUTE'),'players cannot rebuild ratings');
select ok(not has_function_privilege('authenticated','public.end_match_with_score_legacy(uuid,jsonb,uuid)','EXECUTE'),'legacy endpoint cannot bypass new rating flow');

-- Real production schema, auth, eligibility, result, and rating functions.
do $$ declare n int; id uuid; begin
 for n in 1..4 loop
  id:=('99000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'bayes-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'bayes-test-'||n,'Bayes Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone,subscription_status,subscription_valid_until)
values('99000000-0000-4000-8000-000000000100','bayes-test-club','Bayes Test','Asia/Manila','active','infinity');
insert into public.club_memberships(club_id,player_id,role) values('99000000-0000-4000-8000-000000000100','99000000-0000-4000-8000-000000000001','owner');
insert into public.identity_attestations(club_id,player_id,attested_by_player_id,attestation_type,note)
select '99000000-0000-4000-8000-000000000100',id,'99000000-0000-4000-8000-000000000001','in_person','Test fixture'
from public.players where public_slug like 'bayes-test-%';
insert into public.events(id,club_id,type,name,venue,starts_at,ends_at,capacity,formats,record_class,status,join_code)
values('99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000100','open_play','Bayes Test','Test',now()+interval '1 day',now()+interval '2 days',4,array['doubles'],'ranked','published','BAYES-TEST');
insert into public.event_courts(id,event_id,label) values('99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000101','Court Test');
insert into public.match_proposals(id,club_id,event_id,court_id,format,side_a_player_ids,side_b_player_ids,queue_entry_ids,queue_version,policy_version,snapshot,request_id,created_by,expires_at)
values('99000000-0000-4000-8000-000000000103','99000000-0000-4000-8000-000000000100','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000102','doubles',
array['99000000-0000-4000-8000-000000000001','99000000-0000-4000-8000-000000000002']::uuid[],array['99000000-0000-4000-8000-000000000003','99000000-0000-4000-8000-000000000004']::uuid[],
'{}',0,'matchmaking-v3','{}',gen_random_uuid(),'99000000-0000-4000-8000-000000000001',now()+interval '1 hour');
insert into public.matches(id,club_id,event_id,court_id,proposal_id,format,record_class,policy_version,created_by)
values('99000000-0000-4000-8000-000000000104','99000000-0000-4000-8000-000000000100','99000000-0000-4000-8000-000000000101','99000000-0000-4000-8000-000000000102','99000000-0000-4000-8000-000000000103','doubles','ranked','matchmaking-v3','99000000-0000-4000-8000-000000000001');
insert into public.match_participants(match_id,event_id,player_id,side,position)
select '99000000-0000-4000-8000-000000000104','99000000-0000-4000-8000-000000000101',('99000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,case when n<=2 then 1 else 2 end,(n-1)%2+1 from generate_series(1,4) n;
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000001',true);
create temporary table bayes_end as select * from public.end_match_with_score('99000000-0000-4000-8000-000000000104','{"games":[{"sideA":11,"sideB":5}]}','99000000-0000-4000-8000-000000000105');
select is((select status from bayes_end),'finalized','club score finalizes immediately');
select is((select wins from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),1,'rated win recorded');
select is((select count(*)::int from private.bayes_rating_ledger where match_id='99000000-0000-4000-8000-000000000104'),4,'four audit entries');
select * from public.end_match_with_score('99000000-0000-4000-8000-000000000104','{"games":[{"sideA":11,"sideB":5}]}','99000000-0000-4000-8000-000000000105');
select is((select wins from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),1,'retry does not double count');
select * from public.submit_match_result('99000000-0000-4000-8000-000000000104','{"games":[{"sideA":5,"sideB":11}]}','99000000-0000-4000-8000-000000000106');
select is((select losses from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),1,'correction replays winner');
select is((select wins from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),0,'old win removed from projection');
select set_config('request.jwt.claim.sub','99000000-0000-4000-8000-000000000002',true);
select throws_ok($$select * from public.submit_match_result('99000000-0000-4000-8000-000000000104','{"games":[{"sideA":11,"sideB":0}]}','99000000-0000-4000-8000-000000000107')$$,'P0001',null,'participant cannot edit finalized score');
update public.official_results set effect_state='suspended' where match_id='99000000-0000-4000-8000-000000000104';
select private.rebuild_competition_after_dispute((select result_id from bayes_end));
select is((select rating from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),1500::numeric,'suspension removes rating effect');
select is((select rating_deviation from public.player_statistics where player_id='99000000-0000-4000-8000-000000000001'),350::numeric,'suspension restores uncertainty');
select is((select count(*)::int from public.result_revisions where match_id='99000000-0000-4000-8000-000000000104'),2,'original and corrected scores retained');
select * from finish();
rollback;
