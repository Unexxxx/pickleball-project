begin;
select plan(15);

select ok(to_regclass('public.match_proposals') is not null, 'match proposals exist');
select ok(to_regclass('public.matches') is not null, 'matches exist');
select ok(to_regclass('public.match_participants') is not null, 'participants exist');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='event_courts_one_active_match_idx'), 'a court cannot host two active matches');
select ok(exists(select 1 from pg_indexes where schemaname='public' and indexname='match_participants_one_active_player_idx'), 'a player cannot occupy two active matches');
select has_function('public','generate_match_proposal',array['uuid','text','uuid']);
select has_function('public','confirm_match_proposal',array['uuid','bigint','uuid']);
select has_function('public','cancel_match_assignment',array['uuid','text','uuid']);
select ok(exists(select 1 from pg_proc where oid=to_regprocedure('public.confirm_match_proposal(uuid,bigint,uuid)') and lower(prosrc) like '%for update%'), 'confirmation locks resources');
select ok(exists(select 1 from pg_constraint where conname='match_participant_side_check'), 'participant sides are constrained');
select ok(exists(select 1 from pg_constraint where conname='match_proposal_participant_count_check'), 'proposal participant count is constrained');
select ok(coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.matches')),false), 'matches use RLS');
select ok(coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.match_proposals')),false), 'proposals use RLS');
select ok(not has_table_privilege('authenticated','public.matches','INSERT'), 'clients cannot insert matches');
select ok(not has_table_privilege('authenticated','public.match_participants','INSERT'), 'clients cannot insert participants');

select * from finish();
rollback;
