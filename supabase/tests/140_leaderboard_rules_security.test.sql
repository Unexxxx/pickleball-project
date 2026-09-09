begin;
select plan(10);
select is((select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('public_player_profiles','public_player_statistics','public_leaderboards','public_match_history')
 and c.reloptions @> array['security_invoker=true']),4,'all public-facing views use caller permissions');

select ok((select relrowsecurity from pg_class where oid = 'public.leaderboard_rules'::regclass), 'rule metadata has RLS enabled');
select ok(not exists (
  select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
), 'all public tables have RLS enabled');
select ok(not exists (
  select 1 from unnest(array['anon','authenticated']) role_name
  cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER','MAINTAIN']) privilege_name
  where has_table_privilege(role_name, 'public.leaderboard_rules', privilege_name)
), 'API roles have no mutation or maintenance privileges');
select ok(has_table_privilege('service_role', 'public.leaderboard_rules', 'UPDATE'), 'trusted service retains maintenance');

set local role anon;
select ok(exists(select 1 from public.leaderboard_rules), 'anonymous users can read published rules');
select throws_ok($$delete from public.leaderboard_rules$$, '42501', 'permission denied for table leaderboard_rules', 'anonymous deletion denied');
select throws_ok($$truncate public.leaderboard_rules$$, '42501', 'permission denied for table leaderboard_rules', 'anonymous truncate denied');
reset role;
set local role authenticated;
select ok(exists(select 1 from public.leaderboard_rules), 'authenticated users can read published rules');
select throws_ok($$update public.leaderboard_rules set minimum_matches = 0$$, '42501', 'permission denied for table leaderboard_rules', 'client rule changes denied');
reset role;

select * from finish();
rollback;
