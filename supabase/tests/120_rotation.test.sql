begin;
select plan(8);
select ok(not has_table_privilege('authenticated','private.event_rotation_lineups','SELECT'),'reserved lineups remain private');
select ok(not has_function_privilege('authenticated','public.generate_match_proposal_v2(uuid,text,uuid)','EXECUTE'),'legacy generator cannot bypass saved teams');
select ok(has_function_privilege('authenticated','public.assign_next_queued_match(uuid,text,uuid)','EXECUTE'),'authenticated assignment endpoint exists');
create temporary table rotation_result as
select private.select_rotation_v3(
  (select jsonb_agg(jsonb_build_object('id',('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'rating',r,'winRate',w,'rank',k))
   from (values(1,1900,.9,.1),(2,1700,.7,.3),(3,1300,.3,.7),(4,1100,.1,.9)) c(n,r,w,k)),
  '{}'::jsonb,4,'{}'::uuid[]) choice;
select is((select jsonb_array_length(choice->'entryIds') from rotation_result),4,'four selected players');
select is((select (choice->>'ratingDifference')::numeric from rotation_result),0::numeric,'team ratings balanced');
select is((select (choice->>'winRateDifference')::numeric from rotation_result),0::numeric,'team win rates balanced');
select is((select (choice->>'rankPercentileDifference')::numeric from rotation_result),0::numeric,'team ranks balanced');
select ok(exists(select 1 from pg_trigger where tgname='refresh_rotation_after_queue' and tgdeferrable and tginitdeferred),'queue reservations refresh after transaction');
select * from finish();
rollback;
