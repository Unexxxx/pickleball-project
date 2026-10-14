-- Hosted Supabase loads pg-safeupdate for API requests, which rejects UPDATE
-- statements without a WHERE clause. Resetting every rating row before the
-- replay is intentional, so say so explicitly; otherwise every finished match
-- fails with "UPDATE requires a WHERE clause".
create or replace function private.rebuild_team_ratings(p_reason text)
returns bigint language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare run bigint; m record; p record; before_players jsonb; after_players jsonb;
 s public.player_statistics%rowtype; won boolean; streak int;
begin
 perform pg_advisory_xact_lock(860608060);
 insert into private.bayes_rating_runs(reason,previous_projection)
 values(p_reason,jsonb_build_object('statistics',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.player_statistics x),
   'leaderboards',(select coalesce(jsonb_agg(to_jsonb(x)),'[]') from public.leaderboard_entries x))) returning id into run;
 update public.player_statistics set rating=1500,rating_deviation=350,rating_model='team-bayes-v1',wins=0,losses=0,
   current_streak=0,longest_win_streak=0,last_match_at=null,calculation_version=run,updated_at=now()
   where true;
 update public.leaderboard_entries set rating=1500,wins=0,losses=0,win_rate=0,current_streak=0,longest_win_streak=0,last_match_at=null,calculation_version=run
   where true;
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
