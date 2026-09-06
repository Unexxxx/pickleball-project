begin;

select plan(14);

-- Durable source-of-truth tables and tenant keys.
select ok(to_regclass('public.event_queue_entries') is not null, 'queue entries exist');
select ok(to_regclass('private.event_queue_history') is not null, 'append-only queue history exists');
select ok(exists (select 1 from information_schema.columns where table_schema='public' and table_name='events' and column_name='queue_version' and data_type='bigint'), 'event has a bigint queue version');

-- Exactly one ready entry per player/event and one monotonic sequence value per event.
select ok(exists (select 1 from pg_indexes where schemaname='public' and indexname='event_queue_one_ready_player_idx' and indexdef ilike '%unique%' and indexdef ilike '%where%ready%'), 'one active ready queue entry per event/player');
select ok(exists (select 1 from pg_indexes where schemaname='public' and indexname='event_queue_event_sequence_key' and indexdef ilike '%unique%'), 'queue sequence is unique within an event');

-- Commands are the only write boundary; join must lock rows for concurrent callers.
select has_function('public','set_event_attendance',array['uuid','uuid','text','text','uuid']);
select has_function('public','join_event_queue',array['uuid','uuid']);
select has_function('public','leave_event_queue',array['uuid','text','uuid']);
select has_function('public','adjust_event_queue',array['uuid','bigint','uuid','text','uuid']);
select ok(exists (select 1 from pg_proc where oid=to_regprocedure('public.join_event_queue(uuid,uuid)') and lower(prosrc) like '%for update%'), 'queue join serializes concurrent mutations with row locks');

-- History is immutable and queue reads are tenant/participant scoped.
select ok(not exists (select 1 from information_schema.role_table_grants where grantee='authenticated' and table_schema='private' and table_name='event_queue_history' and privilege_type in ('UPDATE','DELETE')), 'authenticated users cannot rewrite queue history');
select ok(coalesce((select relrowsecurity from pg_class where oid=to_regclass('public.event_queue_entries')),false), 'queue entries have RLS enabled');
select ok(exists (select 1 from pg_policies where schemaname='public' and tablename='event_queue_entries' and policyname='queue_participant_or_club_read'), 'queue reads are participant or Club scoped');

-- Private Broadcast channel joins require authenticated Club membership.
select ok(exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages' and policyname='authenticated_private_broadcast_read' and roles @> array['authenticated']::name[]), 'private Realtime Broadcast authorization remains enabled');

select * from finish();
rollback;
