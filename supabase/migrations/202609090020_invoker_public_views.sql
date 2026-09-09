-- Separate public and own-profile policies so anonymous reads never call
-- current_player_id(), which is intentionally authenticated-only.
 drop policy players_public_read on public.players;
 create policy players_public_read on public.players for select to anon, authenticated
 using (visibility = 'public' and merged_into_player_id is null);
 create policy players_self_read on public.players for select to authenticated
 using (id = public.current_player_id());

-- Store only the already-published history fields, not operational metadata.
create table public.player_match_history_public as
select * from public.public_match_history with no data;
alter table public.player_match_history_public add primary key (player_id, match_id);
alter table public.player_match_history_public enable row level security;
revoke all on public.player_match_history_public from public, anon, authenticated;
grant select on public.player_match_history_public to anon, authenticated;
grant all on public.player_match_history_public to service_role;
create policy public_history_read on public.player_match_history_public
for select to anon, authenticated using (exists (
 select 1 from public.players p where p.id = player_id
 and p.visibility = 'public' and p.merged_into_player_id is null
));

create function private.refresh_public_match_history(p_match_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog as $$
begin
 delete from public.player_match_history_public where match_id = p_match_id;
 insert into public.player_match_history_public
select mp.player_id,m.id match_id,m.format,m.record_class,m.assigned_at played_at,mr.status result_status,o.effect_state,o.calculation_version,
rr.score,rr.winner_side,mp.side,(rr.winner_side=mp.side) won,
(rr.revision_no>1) has_revision_history,
(select coalesce(jsonb_agg(jsonb_build_object('side',other.side,'name',coalesce(p.display_name,'Private player'),'slug',p.public_slug) order by other.side,other.position),'[]'::jsonb)
 from public.match_participants other left join public.public_player_profiles p on p.player_id=other.player_id where other.match_id=m.id) participants
from public.match_participants mp join public.matches m on m.id=mp.match_id join public.match_results mr on mr.match_id=m.id
join public.official_results o on o.match_id=m.id join public.result_revisions rr on rr.id=o.authoritative_revision_id
where mr.status in('finalized','disputed','voided')
and exists(select 1 from public.public_player_profiles profile where profile.player_id=mp.player_id)
 and m.id = p_match_id;
end $$;
revoke all on function private.refresh_public_match_history(uuid) from public, anon, authenticated;

create function private.sync_public_match_history()
returns trigger language plpgsql security definer set search_path = pg_catalog as $$
declare target uuid; old_target uuid; item record;
begin
 if TG_TABLE_NAME = 'players' then
   for item in select distinct match_id from public.match_participants where player_id = coalesce(new.id, old.id)
   loop perform private.refresh_public_match_history(item.match_id); end loop;
 else
   if TG_TABLE_NAME = 'matches' then
     if TG_OP <> 'DELETE' then target := new.id; end if;
     if TG_OP <> 'INSERT' then old_target := old.id; end if;
   elsif TG_TABLE_NAME = 'result_revisions' then
     if TG_OP <> 'DELETE' then select match_id into target from public.match_results where id = new.result_id; end if;
     if TG_OP <> 'INSERT' then select match_id into old_target from public.match_results where id = old.result_id; end if;
   else
     if TG_OP <> 'DELETE' then target := new.match_id; end if;
     if TG_OP <> 'INSERT' then old_target := old.match_id; end if;
   end if;
   if target is not null then perform private.refresh_public_match_history(target); end if;
   if old_target is not null and old_target is distinct from target then perform private.refresh_public_match_history(old_target); end if;
 end if;
 return null;
end $$;
revoke all on function private.sync_public_match_history() from public, anon, authenticated;

create trigger sync_public_history after insert or update or delete on public.matches
for each row execute function private.sync_public_match_history();
create trigger sync_public_history after insert or update or delete on public.match_participants
for each row execute function private.sync_public_match_history();
create trigger sync_public_history after insert or update or delete on public.match_results
for each row execute function private.sync_public_match_history();
create trigger sync_public_history after insert or update or delete on public.official_results
for each row execute function private.sync_public_match_history();
create trigger sync_public_history after insert or update or delete on public.result_revisions
for each row execute function private.sync_public_match_history();
create trigger sync_public_history after update of display_name, public_slug, visibility, merged_into_player_id on public.players
for each row execute function private.sync_public_match_history();

insert into public.player_match_history_public select * from public.public_match_history;
create or replace view public.public_match_history with (security_invoker = true) as
select * from public.player_match_history_public;
alter view public.public_player_profiles set (security_invoker = true);
alter view public.public_player_statistics set (security_invoker = true);
alter view public.public_leaderboards set (security_invoker = true);

