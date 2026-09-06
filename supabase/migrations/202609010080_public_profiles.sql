create view public.public_player_profiles as
select p.id as player_id,p.public_slug,p.display_name,p.avatar_path,p.created_at
from public.players p where p.visibility='public' and p.merged_into_player_id is null;

create view public.public_player_statistics as
select p.id as player_id,p.public_slug,coalesce(s.rating,1500)::numeric(10,2) rating,coalesce(s.wins,0) wins,coalesce(s.losses,0) losses,
case when coalesce(s.wins,0)+coalesce(s.losses,0)=0 then 0 else s.wins::numeric/(s.wins+s.losses) end::numeric(8,6) win_rate,
coalesce(s.current_streak,0) current_streak,coalesce(s.longest_win_streak,0) longest_win_streak,s.last_match_at,coalesce(s.calculation_version,0) calculation_version
from public.players p left join public.player_statistics s on s.player_id=p.id where p.visibility='public' and p.merged_into_player_id is null;

create view public.public_match_history as
select mp.player_id,m.id match_id,m.format,m.record_class,m.assigned_at played_at,mr.status result_status,o.effect_state,o.calculation_version,
rr.score,rr.winner_side,mp.side,(rr.winner_side=mp.side) won,
exists(select 1 from public.result_disputes d where d.result_id=mr.id) has_revision_history
from public.match_participants mp join public.matches m on m.id=mp.match_id join public.match_results mr on mr.match_id=m.id
join public.official_results o on o.match_id=m.id join public.result_revisions rr on rr.id=o.authoritative_revision_id
where mr.status in('finalized','disputed','voided');

create index match_participants_player_match_idx on public.match_participants(player_id,match_id);
create index official_results_finalized_idx on public.official_results(finalized_at desc,match_id);
grant select on public.public_player_profiles,public.public_player_statistics,public.public_match_history to anon,authenticated;
revoke all on public.accounts,public.event_attendance,public.event_queue_entries,public.club_memberships from anon;
comment on view public.public_player_profiles is 'Privacy-safe canonical identity projection: no contact, membership, attendance, trust, or moderation data.';
