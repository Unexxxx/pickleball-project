-- Explicit user-authorized historical application. Never enroll/check in players.
-- Missing target is normal on fresh/local databases. No other pending event is approved.
do $$
declare target constant uuid:='84c53c10-b5a5-47ce-aa6c-ef278af0121c';
 r record; run bigint; total int; approved int:=0;
begin
 if not exists(select 1 from public.events where id=target) then return;end if;
 perform pg_advisory_xact_lock(860608060);
 perform 1 from public.events where id=target for update;
 select count(*) into total from public.matches where event_id=target;
 if total<>55 or exists(select 1 from public.matches where event_id=target and (record_class<>'ranked' or format<>'doubles' or status not in('score_pending','finalized'))) then
   raise exception 'Target event changed: expected 55 completed ranked doubles matches';end if;
 if exists(select 1 from public.matches m left join public.match_results mr on mr.match_id=m.id
   left join public.result_revisions rv on rv.id=mr.current_revision_id where m.event_id=target and (rv.id is null or mr.status not in('pending_confirmation','finalized'))) then
   raise exception 'Missing or disputed target results';end if;
 insert into private.audit_log(action,aggregate_type,aggregate_id,before_state,after_state)
 values('rating.user_authorized_event_backfill','event',target,
   (select jsonb_agg(jsonb_build_object('match',to_jsonb(m),'result',to_jsonb(mr))) from public.matches m join public.match_results mr on mr.match_id=m.id where m.event_id=target),
   jsonb_build_object('model','team-bayes-v1','expectedMatches',55,'approval','explicit_user_request','scoresModified',false));
 for r in select mr.id,rv.submitted_by from public.matches m join public.match_results mr on mr.match_id=m.id
   join public.result_revisions rv on rv.id=mr.current_revision_id where m.event_id=target
   order by coalesce(m.played_at,m.assigned_at),m.id loop
   -- Approval attributed to the original club score submitter, never invented confirmations.
   if not exists(select 1 from public.match_results mr join public.club_memberships cm on cm.club_id=mr.club_id
     where mr.id=r.id and cm.player_id=r.submitted_by and cm.status='active' and cm.role in('owner','organizer','score_official')) then
     raise exception 'Historical score submitter is not an authorized club official';end if;
   perform private.accept_club_result(r.id,r.submitted_by,false);
   approved:=approved+1;
 end loop;
 run:=private.rebuild_team_ratings('user_requested_event:'||target);
 update public.official_results o set calculation_version=run from public.matches m where o.match_id=m.id and m.event_id=target;
 if approved<>55 or (select count(*) from private.bayes_rating_ledger where run_id=run and match_id in(select id from public.matches where event_id=target))<>220 then
   raise exception 'Rating backfill verification failed';end if;
 insert into private.audit_log(action,aggregate_type,aggregate_id,after_state) values('rating.event_backfill_completed','event',target,jsonb_build_object('matches',approved,'run',run,'model','team-bayes-v1'));
end $$;
