begin;
select plan(7);
insert into public.clubs(id,slug,name,timezone) values('98000000-0000-4000-8000-000000000001','join-lifecycle-test','Lifecycle','UTC');
insert into public.events(club_id,type,name,venue,starts_at,ends_at,capacity,formats,record_class,status,join_code)
select '98000000-0000-4000-8000-000000000001','open_play','Lifecycle','Court',now()+interval '1 day',now()+interval '2 days',4,array['doubles'],'unranked',s::public.event_status,lpad(n::text,18,'0')
from unnest(array['draft','published','registration_closed','in_progress','completed','canceled']) with ordinality as states(s,n);
set local role anon;
select is((select count(*)::int from public.resolve_event_join('000000000000000001')),0,'draft invitation hidden');
select is((select status::text from public.resolve_event_join('000000000000000002')),'published','published link works');
select is((select status::text from public.resolve_event_join('000000000000000003')),'registration_closed','closed registration link works');
select is((select status::text from public.resolve_event_join('000000000000000004')),'in_progress','live event link works');
select is((select status::text from public.resolve_event_join('000000000000000005')),'completed','completed link works');
select is((select status::text from public.resolve_event_join('000000000000000006')),'canceled','canceled link works');
select is((select count(*)::int from public.resolve_event_join('invalid')),0,'invalid link hidden');
reset role;
select * from finish();
rollback;
