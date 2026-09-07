-- Versioned two-team Gaussian skill model (no draws, full participation).
-- Mean 1500, initial uncertainty 350, performance noise 175, dynamics 3.5/game.
-- Scores determine the winner; margin does not affect this first model.
insert into private.rule_versions(domain,version,parameters,active_from) values
('rating','team-bayes-v1','{"initialMean":1500,"initialSigma":350,"beta":175,"tau":3.5,"sigmaFloor":35,"scoreMargin":false,"teamAggregation":"sum","formats":"shared","provisionalSigma":175}',now());

alter table public.player_statistics
  add column rating_deviation numeric(12,6) not null default 350,
  add column rating_model text not null default 'team-bayes-v1';
create table private.bayes_rating_runs (
  id bigint primary key default nextval('private.competition_calculation_version'),
  model text not null default 'team-bayes-v1',
  reason text not null,
  previous_projection jsonb not null,
  created_at timestamptz not null default now()
);
create table private.bayes_rating_ledger (
  run_id bigint not null references private.bayes_rating_runs,
  match_id uuid not null references public.matches,
  revision_id uuid not null references public.result_revisions,
  player_id uuid not null references public.players,
  pre_mean numeric not null, pre_sigma numeric not null,
  post_mean numeric not null, post_sigma numeric not null,
  expected numeric not null,
  primary key(run_id,match_id,player_id)
);
revoke all on private.bayes_rating_runs,private.bayes_rating_ledger from public,anon,authenticated;

-- Normal CDF approximation (absolute error approximately 7.5e-8).
create function private.bayes_normal_cdf(x double precision)
returns double precision language plpgsql immutable strict set search_path=pg_catalog as $$
declare t double precision; q double precision;
begin
 t:=1/(1+0.2316419*abs(x));
 q:=exp(-x*x/2)/sqrt(2*pi())*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));
 return case when x>=0 then 1-q else q end;
end $$;

create function private.team_bayes_update(p_players jsonb,p_winner integer)
returns jsonb language plpgsql immutable set search_path=pg_catalog,private as $$
declare c double precision; t double precision; v double precision; w double precision;
  d double precision; expected double precision; output jsonb;
begin
 if p_winner is null or p_winner not in(1,2) or jsonb_typeof(p_players) is distinct from 'array' then
   raise exception using errcode='P0001',detail='INVALID_RATING_INPUT'; end if;
 if jsonb_array_length(p_players) not in(2,4) or exists(
   select 1 from jsonb_array_elements(p_players) p where
    not(p ?& array['id','side','mu','sigma']) or (p->>'side')::int not in(1,2)
    or (p->>'sigma')::numeric not between 0.001 and 350
    or (p->>'mu')::numeric not between -100000 and 100000
 ) or (select count(distinct p->>'id') from jsonb_array_elements(p_players) p)<>jsonb_array_length(p_players)
 or (select count(*) from jsonb_array_elements(p_players) p where (p->>'side')::int=1)*2<>jsonb_array_length(p_players) then
   raise exception using errcode='P0001',detail='INVALID_RATING_INPUT'; end if;
 select sum(case when (p->>'side')::int=1 then (p->>'mu')::double precision else -(p->>'mu')::double precision end),
   sqrt(sum(power((p->>'sigma')::double precision,2)+3.5*3.5+175*175))
 into d,c from jsonb_array_elements(p_players) p;
 expected:=private.bayes_normal_cdf(d/c);
 t:=case when p_winner=1 then d/c else -d/c end;
 -- Stable inverse Mills ratio for extreme upsets, where the CDF underflows.
 if t < -10 then
   v:=-t+1/(-t)-2/power(-t,3)+10/power(-t,5);
 else v:=exp(-t*t/2)/sqrt(2*pi())/greatest(private.bayes_normal_cdf(t),1e-30); end if;
 w:=least(1,greatest(0,v*(v+t)));
 select jsonb_agg(jsonb_build_object('id',p->>'id','side',(p->>'side')::int,
   'mu',(p->>'mu')::double precision + case when (p->>'side')::int=p_winner then 1 else -1 end *
      (power((p->>'sigma')::double precision,2)+3.5*3.5)/c*v,
   'sigma',least(350,sqrt(greatest(35*35,(power((p->>'sigma')::double precision,2)+3.5*3.5)*
      (1-(power((p->>'sigma')::double precision,2)+3.5*3.5)/(c*c)*w)))),
   'expected',case when (p->>'side')::int=1 then expected else 1-expected end))
 into output from jsonb_array_elements(p_players) p;
 return output;
end $$;
revoke all on function private.bayes_normal_cdf(double precision),private.team_bayes_update(jsonb,integer) from public,anon,authenticated;

create function private.valid_score_winner(p_score jsonb)
returns smallint language plpgsql immutable set search_path=pg_catalog as $$
declare a int; b int;
begin
 if jsonb_typeof(p_score->'games') is distinct from 'array' then
  raise exception using errcode='P0001',detail='INVALID_SCORE'; end if;
 if jsonb_array_length(p_score->'games') not between 1 and 5 then
  raise exception using errcode='P0001',detail='INVALID_SCORE'; end if;
 if exists(select 1 from jsonb_array_elements(p_score->'games') g where
   jsonb_typeof(g->'sideA') is distinct from 'number' or jsonb_typeof(g->'sideB') is distinct from 'number'
   or (g->>'sideA') !~ '^[0-9]{1,2}$' or (g->>'sideB') !~ '^[0-9]{1,2}$'
   or (g->>'sideA')=(g->>'sideB')) then raise exception using errcode='P0001',detail='INVALID_SCORE';end if;
 select count(*) filter(where (g->>'sideA')::int>(g->>'sideB')::int),
 count(*) filter(where (g->>'sideB')::int>(g->>'sideA')::int) into a,b from jsonb_array_elements(p_score->'games') g;
 if a=b then raise exception using errcode='P0001',detail='INVALID_SCORE';end if;
 return case when a>b then 1 else 2 end;
end $$;
revoke all on function private.valid_score_winner(jsonb) from public,anon,authenticated;

-- Deterministic replay makes edits, suspended results and future model upgrades
-- correct without compounding an old rating. Preserve every prior run/ledger.
create function private.rebuild_team_ratings(p_reason text)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare run bigint; m record; p record; before_players jsonb; after_players jsonb;
 s public.player_statistics%rowtype; won boolean; streak int;
begin
 perform pg_advisory_xact_lock(860608060);
 insert into private.bayes_rating_runs(reason,previous_projection)
 values(p_reason,jsonb_build_object('statistics',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.player_statistics x),
   'leaderboards',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.leaderboard_entries x))) returning id into run;
 update public.player_statistics set rating=1500,rating_deviation=350,rating_model='team-bayes-v1',wins=0,losses=0,
   current_streak=0,longest_win_streak=0,last_match_at=null,calculation_version=run,updated_at=now();
 update public.leaderboard_entries set rating=1500,wins=0,losses=0,win_rate=0,current_streak=0,longest_win_streak=0,last_match_at=null,calculation_version=run;
 for m in select mm.id,mm.club_id,rr.id revision_id,rr.score,rr.winner_side,
   coalesce(mm.played_at,mm.assigned_at,rr.submitted_at) played
   from public.official_results o join public.matches mm on mm.id=o.match_id
   join public.match_results r on r.match_id=mm.id
   join public.result_revisions rr on rr.id=o.authoritative_revision_id
   where mm.record_class='ranked' and o.effect_state='active' and r.status='finalized'
   order by coalesce(mm.played_at,mm.assigned_at,rr.submitted_at),mm.id
 loop
   if private.valid_score_winner(m.score)<>m.winner_side then raise exception using errcode='P0001',detail='SCORE_WINNER_MISMATCH';end if;
   insert into public.player_statistics(player_id) select player_id from public.match_participants where match_id=m.id on conflict do nothing;
   select jsonb_agg(jsonb_build_object('id',mp.player_id,'side',mp.side,'mu',ps.rating,'sigma',ps.rating_deviation) order by mp.side,mp.position)
   into before_players from public.match_participants mp join public.player_statistics ps on ps.player_id=mp.player_id where mp.match_id=m.id;
   after_players:=private.team_bayes_update(before_players,m.winner_side);
   for p in select * from jsonb_to_recordset(after_players) as x(id uuid,side int,mu numeric,sigma numeric,expected numeric) loop
     select * into s from public.player_statistics where player_id=p.id;
     insert into private.bayes_rating_ledger values(run,m.id,m.revision_id,p.id,s.rating,s.rating_deviation,round(p.mu,2),round(p.sigma,6),p.expected);
     won:=p.side=m.winner_side;
     streak:=case when won then greatest(1,s.current_streak+1) else least(-1,s.current_streak-1) end;
     update public.player_statistics set rating=round(p.mu,2),rating_deviation=round(p.sigma,6),rating_model='team-bayes-v1',
       wins=wins+won::int,losses=losses+(not won)::int,current_streak=streak,
       longest_win_streak=greatest(longest_win_streak,streak),last_match_at=m.played,calculation_version=run,updated_at=now() where player_id=p.id;
     insert into public.leaderboard_entries(scope,club_id,player_id,rating,wins,losses,win_rate,current_streak,longest_win_streak,last_match_at,calculation_version)
       values('club',m.club_id,p.id,round(p.mu,2),won::int,(not won)::int,won::int,case when won then 1 else -1 end,won::int,m.played,run)
       on conflict(scope,club_id,player_id) do update set
         wins=leaderboard_entries.wins+won::int,losses=leaderboard_entries.losses+(not won)::int,
         current_streak=case when won then greatest(1,leaderboard_entries.current_streak+1) else least(-1,leaderboard_entries.current_streak-1) end,
         longest_win_streak=case when won then greatest(leaderboard_entries.longest_win_streak,leaderboard_entries.current_streak+1) else leaderboard_entries.longest_win_streak end,
         last_match_at=m.played,calculation_version=run;
   end loop;
 end loop;
 insert into public.leaderboard_entries(scope,club_id,player_id,rating,wins,losses,win_rate,current_streak,longest_win_streak,last_match_at,calculation_version)
 select 'overall',null,player_id,rating,wins,losses,case when wins+losses>0 then wins::numeric/(wins+losses) else 0 end,current_streak,longest_win_streak,last_match_at,run
 from public.player_statistics
 on conflict(scope,club_id,player_id) do update set rating=excluded.rating,wins=excluded.wins,losses=excluded.losses,win_rate=excluded.win_rate,
 current_streak=excluded.current_streak,longest_win_streak=excluded.longest_win_streak,last_match_at=excluded.last_match_at,calculation_version=run;
 -- One global skill estimate; club wins/streaks remain scoped to that club.
 update public.leaderboard_entries le set rating=ps.rating,win_rate=case when le.wins+le.losses>0 then le.wins::numeric/(le.wins+le.losses) else 0 end
 from public.player_statistics ps where le.player_id=ps.player_id;
 insert into private.audit_log(action,aggregate_type,after_state) values('rating.rebuilt','rating_model',jsonb_build_object('model','team-bayes-v1','run',run,'reason',p_reason));
 return run;
end $$;
revoke all on function private.rebuild_team_ratings(text) from public,anon,authenticated;

create function private.accept_club_result(p_result_id uuid,p_actor uuid,p_rebuild boolean default true)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r public.match_results%rowtype; m public.matches%rowtype; rr public.result_revisions%rowtype; run bigint;
begin
 perform pg_advisory_xact_lock(860608060);
 select * into r from public.match_results where id=p_result_id for update;
 select * into m from public.matches where id=r.match_id for update;
 select * into rr from public.result_revisions where id=r.current_revision_id;
 if r.id is null or rr.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
 if not exists(select 1 from public.club_memberships where club_id=m.club_id and player_id=p_actor and status='active' and role in('owner','organizer','score_official')) and not (
   exists(select 1 from public.match_participants where match_id=m.id and player_id=p_actor)
   and exists(select 1 from public.result_confirmations where result_revision_id=rr.id and side=1)
   and exists(select 1 from public.result_confirmations where result_revision_id=rr.id and side=2)
 ) then
  raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
 if r.status in('disputed','voided') or exists(select 1 from public.result_disputes where result_id=r.id and status='open') then
  raise exception using errcode='P0001',detail='DISPUTE_NOT_RESOLVED';end if;
 if exists(select 1 from public.official_results where match_id=m.id and authoritative_revision_id=rr.id and effect_state<>'suspended') and r.status='finalized' then
  return (select calculation_version from public.official_results where match_id=m.id);end if;
 if private.valid_score_winner(rr.score)<>rr.winner_side then raise exception using errcode='P0001',detail='SCORE_WINNER_MISMATCH';end if;
 if exists(select 1 from public.match_participants mp where mp.match_id=m.id and not exists(select 1 from public.accounts a where a.player_id=mp.player_id and a.contact_verified_at is not null)) then
  raise exception using errcode='P0001',detail='PLAYER_NOT_VERIFIED';end if;
 if m.record_class='ranked' then
   if exists(select 1 from public.match_participants mp where mp.match_id=m.id and not public.player_ranked_eligible(mp.player_id,m.club_id)) then
    raise exception using errcode='P0001',detail='IDENTITY_NOT_ATTESTED';end if;
   if not exists(select 1 from public.clubs where id=m.club_id and subscription_status in('trialing','active') and (subscription_valid_until is null or subscription_valid_until>now())) then
    raise exception using errcode='P0001',detail='SUBSCRIPTION_INACTIVE';end if;
 end if;
 insert into public.official_results(match_id,club_id,authoritative_revision_id,effect_state,finalized_by,eligibility_evidence,calculation_checksum)
 values(m.id,m.club_id,rr.id,case when m.record_class='ranked' then 'active'::public.ranked_effect_state else 'none'::public.ranked_effect_state end,p_actor,
  jsonb_build_object('approval',case when exists(select 1 from public.club_memberships where club_id=m.club_id and player_id=p_actor and status='active' and role in('owner','organizer','score_official')) then 'club' else 'both_sides' end,'actor',p_actor,'ratingModel','team-bayes-v1'),rr.score_digest)
 on conflict(match_id) do update set authoritative_revision_id=excluded.authoritative_revision_id,effect_state=excluded.effect_state,
 finalized_by=p_actor,eligibility_evidence=excluded.eligibility_evidence,updated_at=now(),calculation_checksum=rr.score_digest;
 update public.result_revisions set status='accepted' where id=rr.id;
 update public.match_results set status='finalized',version=version+1 where id=r.id;
 update public.matches set status='finalized',version=version+1 where id=m.id;
 if p_rebuild then run:=private.rebuild_team_ratings('club_score_approved');end if;
 update public.official_results set calculation_version=run where match_id=m.id;
 insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,after_state)
 values(auth.uid(),'result.rating_approved','match_result',r.id,m.club_id,jsonb_build_object('revision',rr.id,'actor',p_actor,'model','team-bayes-v1'));
 return run;
end $$;
revoke all on function private.accept_club_result(uuid,uuid,boolean) from public,anon,authenticated;

-- Preserve existing court release/requeue behavior; finalize only after it ran.
alter function public.end_match_with_score(uuid,jsonb,uuid) rename to end_match_with_score_legacy;
revoke all on function public.end_match_with_score_legacy(uuid,jsonb,uuid) from public,anon,authenticated;
create function public.end_match_with_score(p_match_id uuid,p_score jsonb,p_idempotency_key uuid)
returns table(result_id uuid,revision_id uuid,status text,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r record; c uuid;
begin
 perform pg_advisory_xact_lock(860608060);
 perform private.valid_score_winner(p_score);
 if exists(select 1 from public.result_revisions where submitted_by=public.current_player_id() and request_id=p_idempotency_key and match_id<>p_match_id) then
  raise exception using errcode='P0001',detail='IDEMPOTENCY_CONFLICT';end if;
 select * into r from public.end_match_with_score_legacy(p_match_id,p_score,p_idempotency_key);
 select club_id into c from public.matches where id=p_match_id;
 if private.has_club_role(c,array['owner','organizer','score_official']::public.club_role[]) then
  perform private.accept_club_result(r.result_id,public.current_player_id());end if;
 return query select x.id,x.current_revision_id,x.status::text,x.version from public.match_results x where x.id=r.result_id;
end $$;
revoke all on function public.end_match_with_score(uuid,jsonb,uuid) from public,anon;
grant execute on function public.end_match_with_score(uuid,jsonb,uuid) to authenticated;

-- Club edits remain available after finalization and cause a chronological replay.
create or replace function public.submit_match_result(p_match_id uuid,p_score jsonb,p_idempotency_key uuid)
returns table(result_id uuid,revision_id uuid,status text,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare m public.matches%rowtype; r public.match_results%rowtype; rr uuid; actor uuid:=public.current_player_id(); winner smallint; club_actor boolean;
begin
 perform pg_advisory_xact_lock(860608060);
 select * into m from public.matches where id=p_match_id for update;
 if actor is null then raise exception using errcode='P0001',detail='AUTH_REQUIRED';end if;
 if m.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
 club_actor:=private.has_club_role(m.club_id,array['owner','organizer','score_official']::public.club_role[]);
 if not club_actor and not exists(select 1 from public.match_participants where match_id=m.id and player_id=actor) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
 select * into r from public.match_results where match_id=m.id for update;
 if exists(select 1 from public.result_revisions where submitted_by=actor and request_id=p_idempotency_key) then
  if not exists(select 1 from public.result_revisions where submitted_by=actor and request_id=p_idempotency_key and match_id=m.id) then raise exception using errcode='P0001',detail='IDEMPOTENCY_CONFLICT';end if;
  return query select r.id,r.current_revision_id,r.status::text,r.version;return;end if;
 if m.status in('assigned','playing') then
  return query select * from public.end_match_with_score(p_match_id,p_score,p_idempotency_key);return;end if;
 if r.id is null or r.status not in('pending_confirmation','finalized') or (r.status='finalized' and not club_actor)
  or exists(select 1 from public.result_disputes d where d.result_id=r.id and d.status='open') then raise exception using errcode='P0001',detail='INVALID_STATE_TRANSITION';end if;
 winner:=private.valid_score_winner(p_score);
 insert into public.result_revisions(result_id,match_id,revision_no,score,score_digest,winner_side,submitted_by,request_id,supersedes_revision_id,reason)
 values(r.id,m.id,(select max(rv.revision_no)+1 from public.result_revisions rv where rv.result_id=r.id),p_score,
 encode(extensions.digest(p_score::text,'sha256'),'hex'),winner,actor,p_idempotency_key,r.current_revision_id,'Score correction') returning id into rr;
 update public.result_revisions set status='superseded' where id=r.current_revision_id;
 update public.match_results mr set current_revision_id=rr,status='pending_confirmation',version=mr.version+1 where mr.id=r.id;
 if club_actor then perform private.accept_club_result(r.id,actor);end if;
 return query select x.id,x.current_revision_id,x.status::text,x.version from public.match_results x where x.id=r.id;
end $$;

create or replace function private.rebuild_competition_after_dispute(p_result_id uuid)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin return private.rebuild_team_ratings('dispute:'||p_result_id);end $$;

-- Retain the legacy implementation for audit/reference, never execute it.
alter function private.finalize_match_result(uuid) rename to finalize_match_result_elo;
revoke all on function private.finalize_match_result_elo(uuid) from public,anon,authenticated;
create function private.finalize_match_result(p_result_id uuid)
returns table(result_id uuid,official_result_id uuid,calculation_version bigint,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r record; v bigint;
begin
 perform pg_advisory_xact_lock(860608060);
 v:=private.accept_club_result(p_result_id,public.current_player_id());
 return query select mr.id,o.id,v,mr.version from public.match_results mr join public.official_results o on o.match_id=mr.match_id where mr.id=p_result_id;
end $$;
revoke all on function private.finalize_match_result(uuid) from public,anon,authenticated;

-- Acquire the rating lock before result row locks on every public mutation path.
alter function public.confirm_match_result(uuid,uuid,uuid) rename to confirm_match_result_legacy;
revoke all on function public.confirm_match_result_legacy(uuid,uuid,uuid) from public,anon,authenticated;
create function public.confirm_match_result(p_result_id uuid,p_revision_id uuid,p_idempotency_key uuid)
returns table(result_id uuid,status text,confirmed_side_a boolean,confirmed_side_b boolean,calculation_version bigint,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
 perform pg_advisory_xact_lock(860608060);
 return query select * from public.confirm_match_result_legacy(p_result_id,p_revision_id,p_idempotency_key);
end $$;
revoke all on function public.confirm_match_result(uuid,uuid,uuid) from public,anon;
grant execute on function public.confirm_match_result(uuid,uuid,uuid) to authenticated;

alter function public.open_result_dispute(uuid,text,text,uuid[],uuid) rename to open_result_dispute_legacy;
revoke all on function public.open_result_dispute_legacy(uuid,text,text,uuid[],uuid) from public,anon,authenticated;
create function public.open_result_dispute(p_result_id uuid,p_reason_code text,p_description text,p_evidence_object_ids uuid[],p_idempotency_key uuid)
returns table(dispute_id uuid,status text,calculation_version bigint,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
begin
 perform pg_advisory_xact_lock(860608060);
 return query select * from public.open_result_dispute_legacy(p_result_id,p_reason_code,p_description,p_evidence_object_ids,p_idempotency_key);
end $$;
revoke all on function public.open_result_dispute(uuid,text,text,uuid[],uuid) from public,anon;
grant execute on function public.open_result_dispute(uuid,text,text,uuid[],uuid) to authenticated;

create or replace function public.resolve_result_dispute(p_dispute_id uuid,p_resolution text,p_corrected_score jsonb,p_reason text,p_idempotency_key uuid)
returns table(dispute_id uuid,result_status text,revision_id uuid,calculation_version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare d public.result_disputes%rowtype; r public.match_results%rowtype; actor uuid:=public.current_player_id(); winner smallint;
begin
 perform pg_advisory_xact_lock(860608060);
 select * into d from public.result_disputes where id=p_dispute_id and status='open' for update;
 if d.id is null then raise exception using errcode='P0001',detail='DISPUTE_NOT_OPEN';end if;
 if not private.has_club_role(d.club_id,array['owner','score_official']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
 if p_resolution is null or p_resolution not in('corrected','upheld','voided') or length(trim(coalesce(p_reason,'')))<3 then raise exception using errcode='P0001',detail='INVALID_RESOLUTION';end if;
 select * into r from public.match_results where id=d.result_id for update;
 revision_id:=r.current_revision_id;
 if p_resolution='corrected' then
   winner:=private.valid_score_winner(p_corrected_score);
   insert into public.result_revisions(result_id,match_id,revision_no,score,score_digest,winner_side,status,submitted_by,reason,request_id,supersedes_revision_id)
   values(r.id,r.match_id,(select max(rv.revision_no)+1 from public.result_revisions rv where rv.result_id=r.id),p_corrected_score,
     encode(extensions.digest(p_corrected_score::text,'sha256'),'hex'),winner,'accepted',actor,p_reason,p_idempotency_key,r.current_revision_id)
   returning id into revision_id;
   update public.result_revisions set status='superseded' where id=r.current_revision_id;
 end if;
 update public.match_results mr set current_revision_id=revision_id,status=case when p_resolution='voided' then 'voided'::public.result_status else 'finalized'::public.result_status end,version=mr.version+1 where mr.id=r.id;
 update public.matches set status=case when p_resolution='voided' then 'voided'::public.match_status else 'finalized'::public.match_status end where id=r.match_id;
 update public.official_results set authoritative_revision_id=revision_id,effect_state=case when p_resolution='voided' then 'none'::public.ranked_effect_state
   when exists(select 1 from public.matches where id=r.match_id and record_class='ranked') then 'active'::public.ranked_effect_state else 'none'::public.ranked_effect_state end where match_id=r.match_id;
 update public.result_disputes dd set status='resolved',resolution=p_resolution::public.dispute_resolution,resolution_reason=p_reason,resolved_by=actor,resolved_at=now(),version=dd.version+1 where dd.id=d.id;
 if p_resolution<>'voided' and not exists(select 1 from public.official_results where match_id=r.match_id) then perform private.accept_club_result(r.id,actor,false);end if;
 calculation_version:=private.rebuild_competition_after_dispute(r.id);
 update public.official_results set calculation_version=resolve_result_dispute.calculation_version where match_id=r.match_id;
 dispute_id:=d.id;
 select mr.status::text into result_status from public.match_results mr where mr.id=r.id;
 insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id)
 values(auth.uid(),'dispute.resolved','result_dispute',d.id,d.club_id,p_idempotency_key);
 return next;
end $$;

create or replace view public.public_player_statistics as
select p.id as player_id,p.public_slug,coalesce(s.rating,1500)::numeric(10,2) rating,coalesce(s.wins,0) wins,coalesce(s.losses,0) losses,
case when coalesce(s.wins,0)+coalesce(s.losses,0)=0 then 0 else s.wins::numeric/(s.wins+s.losses) end::numeric(8,6) win_rate,
coalesce(s.current_streak,0) current_streak,coalesce(s.longest_win_streak,0) longest_win_streak,s.last_match_at,coalesce(s.calculation_version,0) calculation_version,
coalesce(s.rating_deviation,350) rating_deviation,coalesce(s.rating_model,'team-bayes-v1') rating_model,
(coalesce(s.rating_deviation,350)>175) provisional
from public.players p left join public.player_statistics s on s.player_id=p.id where p.visibility='public' and p.merged_into_player_id is null;
insert into public.leaderboard_rules(id,description,ordering) values('team-bayes-v1',
'Team Bayesian mean with uncertainty; provisional while deviation exceeds 175. Winner-only v1; score margins are not weighted.',
array['rating desc','wins desc','win_rate desc','losses asc','last_match_at desc','player_id asc']);
