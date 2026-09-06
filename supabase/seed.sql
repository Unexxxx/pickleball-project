do $$ begin if current_database() not like '%postgres%' then raise exception 'Seed is local-development only'; end if; end $$;
insert into private.rule_versions(domain,version,parameters,active_from) values
('elo','elo-v1','{"initial":1500,"scale":400,"k":32,"rounding":"half-away-from-zero"}',now()),
('trust','trust-v1','{"initial":50,"minimum":0,"maximum":100}',now())
on conflict do nothing;

-- Synthetic, deterministic local fixtures. `db push` never executes this file.
insert into public.players(id,public_slug,display_name) values
('10000000-0000-4000-8000-000000000001','demo-alex-rivera','Alex Rivera'),
('10000000-0000-4000-8000-000000000002','demo-jordan-lee','Jordan Lee'),
('10000000-0000-4000-8000-000000000003','demo-sam-patel','Sam Patel'),
('10000000-0000-4000-8000-000000000004','demo-casey-kim','Casey Kim')
on conflict(id) do nothing;

insert into public.clubs(id,slug,name,timezone,subscription_status,subscription_valid_until) values
('20000000-0000-4000-8000-000000000001','northside-pickleball','Northside Pickleball Club','Asia/Manila','active','infinity'),
('20000000-0000-4000-8000-000000000002','southbay-pickleball','Southbay Pickleball Club','Asia/Manila','expired','2026-01-01')
on conflict(id) do nothing;

insert into public.club_memberships(club_id,player_id,role) values
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','organizer'),
('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','member'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','member'),
('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','owner')
on conflict(club_id,player_id) do nothing;

insert into public.identity_attestations(club_id,player_id,attested_by_player_id,attestation_type,note)
select '20000000-0000-4000-8000-000000000001',id,'10000000-0000-4000-8000-000000000001','in_person','Synthetic local verification' from public.players
on conflict(club_id,player_id,attestation_type) do nothing;

insert into public.events(id,club_id,type,name,venue,starts_at,ends_at,capacity,formats,record_class,status,join_code) values
('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','open_play','Northside Demo Open Play','Courts 1–4','2026-09-05 10:00+08','2026-09-05 13:00+08',24,array['singles','doubles'],'ranked','published','NORTH-DEMO'),
('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','tournament','Southbay Demo Tournament','Southbay Hall','2026-08-01 10:00+08','2026-08-01 18:00+08',32,array['doubles'],'unranked','completed','SOUTH-DEMO')
on conflict(id) do nothing;

insert into public.event_courts(id,event_id,label) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Court 1'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Center Court')
on conflict(id) do nothing;

insert into public.event_queue_entries(id,club_id,event_id,player_id,state,position_sequence,position_key) values
('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','ready',1,1024),
('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','ready',2,2048)
on conflict(id) do nothing;

insert into public.match_proposals(id,club_id,event_id,court_id,format,side_a_player_ids,side_b_player_ids,queue_entry_ids,queue_version,policy_version,snapshot,status,request_id,created_by,expires_at) values
('51000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','doubles',array['10000000-0000-4000-8000-000000000001'::uuid,'10000000-0000-4000-8000-000000000002'::uuid],array['10000000-0000-4000-8000-000000000003'::uuid,'10000000-0000-4000-8000-000000000004'::uuid],array[]::uuid[],0,'matchmaking-v1','{"synthetic":true}','confirmed','51000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','2026-08-01 09:30+08')
on conflict(id) do nothing;
insert into public.matches(id,club_id,event_id,court_id,proposal_id,format,record_class,status,policy_version,created_by,played_at,completed_at) values
('52000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002','51000000-0000-4000-8000-000000000001','doubles','unranked','disputed','matchmaking-v1','10000000-0000-4000-8000-000000000004','2026-08-01 12:00+08','2026-08-01 12:30+08')
on conflict(id) do nothing;
update public.match_proposals set match_id='52000000-0000-4000-8000-000000000001' where id='51000000-0000-4000-8000-000000000001';
insert into public.match_participants(match_id,event_id,player_id,side,position,active) values
('52000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',1,1,false),
('52000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000002',1,2,false),
('52000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003',2,1,false),
('52000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004',2,2,false)
on conflict do nothing;
insert into public.match_results(id,match_id,club_id,event_id,status) values
('53000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','disputed')
on conflict(id) do nothing;
insert into public.result_revisions(id,result_id,match_id,revision_no,score,score_digest,winner_side,status,submitted_by,request_id) values
('54000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001',1,'{"games":[{"sideA":11,"sideB":8}]}','demo-score-sha256-v1',1,'accepted','10000000-0000-4000-8000-000000000001','54000000-0000-4000-8000-000000000002')
on conflict(id) do nothing;
update public.match_results set current_revision_id='54000000-0000-4000-8000-000000000001' where id='53000000-0000-4000-8000-000000000001';
insert into public.official_results(id,match_id,club_id,authoritative_revision_id,effect_state,finalized_by,eligibility_evidence,calculation_version,calculation_checksum) values
('55000000-0000-4000-8000-000000000001','52000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','54000000-0000-4000-8000-000000000001','none','10000000-0000-4000-8000-000000000004','{"recordClass":"unranked"}',1,'demo-unranked-sha256-v1')
on conflict(id) do nothing;
insert into public.result_disputes(id,result_id,club_id,opened_by,reason_code,description,status) values
('56000000-0000-4000-8000-000000000001','53000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000003','score_mismatch','Synthetic open dispute','open')
on conflict(id) do nothing;

insert into public.player_statistics(player_id,rating,wins,losses,current_streak,longest_win_streak,calculation_version) values
('10000000-0000-4000-8000-000000000001',1516,1,0,1,1,1),
('10000000-0000-4000-8000-000000000002',1484,0,1,-1,0,1)
on conflict(player_id) do nothing;
insert into public.leaderboard_entries(scope,club_id,player_id,rating,wins,losses,win_rate,current_streak,longest_win_streak,calculation_version) values
('overall',null,'10000000-0000-4000-8000-000000000001',1516,1,0,1,1,1,1),
('club','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',1516,1,0,1,1,1,1),
('overall',null,'10000000-0000-4000-8000-000000000002',1484,0,1,0,-1,0,1)
on conflict do nothing;

insert into public.reports(id,reporter_player_id,subject_type,subject_id,reason_code,description,status) values
('60000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','player','10000000-0000-4000-8000-000000000004','conduct','Synthetic moderation fixture','open')
on conflict(id) do nothing;

insert into private.trust_score_ledger(id,player_id,reason_code,delta,previous_score,current_score,rule_version,request_id) values
('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','demo_adjustment',-2,50,48,'trust-v1','70000000-0000-4000-8000-000000000002')
on conflict(id) do nothing;
insert into public.trust_score_review_requests(id,player_id,challenged_ledger_id,reason) values
('70000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000003','70000000-0000-4000-8000-000000000001','Synthetic review fixture')
on conflict(id) do nothing;

insert into private.evidence_objects(id,object_path,owner_player_id,purpose,content_type,size_bytes,finalized_at,retention_until,legal_hold_at) values
('80000000-0000-4000-8000-000000000001','demo/expired.jpg','10000000-0000-4000-8000-000000000003','report','image/jpeg',128,now()-interval'100 days',now()-interval'10 days',null),
('80000000-0000-4000-8000-000000000002','demo/legal-hold.pdf','10000000-0000-4000-8000-000000000003','dispute','application/pdf',256,now()-interval'100 days',now()-interval'10 days',now())
on conflict(id) do nothing;

insert into private.calculation_runs(id,rule_version,status,checksum,started_at,finished_at) values
('90000000-0000-4000-8000-000000000001','elo-v1','completed','demo-projection-sha256-v1',now(),now())
on conflict(id) do nothing;
