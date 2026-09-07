create or replace view public.public_match_history as
select mp.player_id,m.id match_id,m.format,m.record_class,m.assigned_at played_at,mr.status result_status,o.effect_state,o.calculation_version,
rr.score,rr.winner_side,mp.side,(rr.winner_side=mp.side) won,
(rr.revision_no>1) has_revision_history,
(select coalesce(jsonb_agg(jsonb_build_object('side',other.side,'name',coalesce(p.display_name,'Private player'),'slug',p.public_slug) order by other.side,other.position),'[]'::jsonb)
 from public.match_participants other left join public.public_player_profiles p on p.player_id=other.player_id where other.match_id=m.id) participants
from public.match_participants mp join public.matches m on m.id=mp.match_id join public.match_results mr on mr.match_id=m.id
join public.official_results o on o.match_id=m.id join public.result_revisions rr on rr.id=o.authoritative_revision_id
where mr.status in('finalized','disputed','voided')
and exists(select 1 from public.public_player_profiles profile where profile.player_id=mp.player_id);
