begin;
select plan(9);

select ok(exists(select 1 from pg_indexes where indexname='rating_ledger_result_player_idx'),'replay cannot duplicate a result/player/ruleset effect');
select ok(exists(select 1 from pg_indexes where indexname='result_revision_request_idx'),'duplicate result submission requests are constrained');
select ok((select prosrc like '%record_class=''ranked''%' from pg_proc where oid=to_regprocedure('private.rebuild_team_ratings(text)')),'only ranked records enter rating calculation');
select ok((select prosrc like '%rebuild_competition_after_dispute%' from pg_proc where oid=to_regprocedure('public.resolve_result_dispute(uuid,text,jsonb,text,uuid)')),'correction invokes projection rebuild');
select ok(not has_table_privilege('authenticated','private.trust_score_ledger','SELECT'),'Trust Score remains private');
select ok((select prosrc not like '%trust_score%' from pg_proc where oid=to_regprocedure('private.finalize_match_result(uuid)')),'Trust Score is isolated from Elo');
select ok(exists(select 1 from pg_policies where schemaname='public' and tablename='events' and policyname='published_events_read'),'event tenant boundary policy exists');
select ok(exists(select 1 from pg_indexes where indexname='leaderboard_rank_idx'),'leaderboard has deterministic ranking index');
select ok(
  (select qual not like '%match_participants%' and qual like '%is_match_participant%' from pg_policies where schemaname='public' and tablename='matches' and policyname='match_event_participant_or_club_read'),
  'match and participant RLS policies do not recurse directly'
);

select * from finish();
rollback;
