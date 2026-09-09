create or replace function public.end_match_with_score(p_match_id uuid,p_score jsonb,p_idempotency_key uuid)
returns table(result_id uuid,revision_id uuid,status text,version bigint)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare r record; c uuid;
begin
 select club_id into c from public.matches where id=p_match_id;
 if c is null or not private.has_club_role(c,array['owner','organizer']::public.club_role[]) then
  raise exception using errcode='P0001',detail='PERMISSION_DENIED';
 end if;
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
