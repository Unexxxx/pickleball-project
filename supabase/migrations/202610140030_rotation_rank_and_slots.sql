-- Matchmaking v3 follow-ups:
-- * Use the event's single format (see 202610140020_single_format_events).
-- * Rank percentile came from public_leaderboards, which hides private
--   profiles, so strong private players were balanced as mid-ranked.
-- * Expose the saved Standby/Upcoming slot sizes so the queue page shows
--   only players the database has actually reserved.
create or replace function private.refresh_event_rotation(p_event_id uuid)
returns void language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare
  v_event public.events%rowtype; v_required integer; v_slot record;
  v_candidates jsonb; v_pairs jsonb; v_choice jsonb; v_ids uuid[]; v_forced uuid[];
  v_saved uuid[]; v_order uuid[]; v_current uuid[]; v_base bigint; v_id uuid; v_i integer;
begin
  select * into v_event from public.events where id=p_event_id for update;
  if v_event.id is null then return; end if;
  if v_event.status<>'in_progress' then
    delete from private.event_rotation_lineups where event_id=p_event_id;
    return;
  end if;
  -- Each event has exactly one format (events_single_format).
  v_required:=case when v_event.formats[1]='singles' then 2 else 4 end;
  -- Assigned lineups have departed. Checked-out members invalidate only their
  -- own slot; remaining members retain priority when that slot is refilled.
  for v_slot in select * from private.event_rotation_lineups where event_id=p_event_id order by ordinal loop
    select array_agg(id order by array_position(v_slot.entry_ids,id)) into v_ids
    from public.event_queue_entries where id=any(v_slot.entry_ids) and state='ready';
    if coalesce(cardinality(v_ids),0)=0 then
      delete from private.event_rotation_lineups where id=v_slot.id;
    elsif v_ids is distinct from v_slot.entry_ids then
      update private.event_rotation_lineups set entry_ids=v_ids where id=v_slot.id;
    end if;
  end loop;
  if (select count(*) from private.event_rotation_lineups where event_id=p_event_id and cardinality(entry_ids)=v_required)=2 then return;end if;

  -- Include every prior encounter, and the last three personal appearances
  -- for each player, including matches currently on court.
  with appearances as (
    select mp.*, row_number() over(partition by mp.player_id order by m.assigned_at desc,m.id desc) personal_turn
    from public.match_participants mp join public.matches m on m.id=mp.match_id
    where m.event_id=p_event_id and m.status not in ('canceled','voided')
  ), pairs as (
    select least(qa.id::text,qb.id::text)||':'||greatest(qa.id::text,qb.id::text) key,
      count(*) filter(where a.side=b.side) teammates,
      count(*) filter(where a.side<>b.side) opponents,
      count(*) filter(where a.personal_turn<=3 or b.personal_turn<=3) recent
    from appearances a join appearances b on a.match_id=b.match_id and a.player_id<b.player_id
    join public.event_queue_entries qa on qa.player_id=a.player_id and qa.event_id=p_event_id and qa.state='ready'
    join public.event_queue_entries qb on qb.player_id=b.player_id and qb.event_id=p_event_id and qb.state='ready'
    group by 1
  ) select coalesce(jsonb_object_agg(key,jsonb_build_object('teammates',teammates,'opponents',opponents,'recent',recent)),'{}') into v_pairs from pairs;

  -- Fill two slots only. Existing complete slots are never reshuffled.
  for v_i in 1..2 loop
    select * into v_slot from private.event_rotation_lineups where event_id=p_event_id order by ordinal offset v_i-1 limit 1;
    if found and cardinality(v_slot.entry_ids)=v_required then continue; end if;
    v_forced:=coalesce(v_slot.entry_ids,'{}'::uuid[]);
    select coalesce(array_agg(entry_id),'{}') into v_saved
      from private.event_rotation_lineups l cross join unnest(l.entry_ids) entry_id
      where l.event_id=p_event_id and (v_slot.id is null or l.id<>v_slot.id);

    with event_stats as (
      select mp.player_id,count(*) games,
        count(*) filter(where r.status in ('pending_confirmation','finalized') and rr.winner_side=mp.side) wins,
        count(*) filter(where r.status in ('pending_confirmation','finalized') and rr.winner_side<>mp.side) losses
      from public.match_participants mp join public.matches m on m.id=mp.match_id
      left join public.match_results r on r.match_id=m.id
      left join public.result_revisions rr on rr.id=r.current_revision_id
      where m.event_id=p_event_id and m.status not in ('canceled','voided') group by mp.player_id
    ), overall_ranks as (
      -- Same order as public_leaderboards, but private profiles keep their
      -- real rank instead of falling back to the midpoint.
      select le.player_id,
        row_number() over(order by le.rating desc,le.wins desc,le.win_rate desc,le.losses asc,le.last_match_at desc nulls last,le.player_id asc) rank,
        count(*) over() total
      from public.leaderboard_entries le
      join public.players p on p.id=le.player_id and p.merged_into_player_id is null
      where le.scope='overall' and le.wins+le.losses>=1
    ), eligible as (
      select q.*, coalesce(es.games,0) games,coalesce(s.rating,1500) rating,
        (coalesce(es.wins,0)+1)::numeric/(coalesce(es.wins,0)+coalesce(es.losses,0)+2) win_rate,
        coalesce(lb.rank::numeric/nullif(lb.total,0),0.5) rank_value
      from public.event_queue_entries q
      left join event_stats es on es.player_id=q.player_id
      left join public.player_statistics s on s.player_id=q.player_id
      left join overall_ranks lb on lb.player_id=q.player_id
      where q.event_id=p_event_id and q.state='ready' and not q.id=any(v_saved)
    ), pool as (
      select * from eligible order by (id=any(v_forced)) desc,(rotation_skips>=3) desc,
        case when rotation_skips>=3 then rotation_skips else 0 end desc,
        games,position_key,id limit 12
    ) select jsonb_agg(jsonb_build_object('id',id,'rating',rating,'winRate',win_rate,'rank',rank_value,'skips',rotation_skips)
      order by (id=any(v_forced)) desc,(rotation_skips>=3) desc,
        case when rotation_skips>=3 then rotation_skips else 0 end desc,games,position_key,id)
      into v_candidates from pool;
    if coalesce(jsonb_array_length(v_candidates),0)<v_required then
      -- An incomplete standby must not consume only part of a saved upcoming
      -- group in the UI. Release later slots and rebuild on the next refresh.
      if v_slot.id is not null and exists(select 1 from private.event_rotation_lineups where event_id=p_event_id and ordinal>v_slot.ordinal) then
        delete from private.event_rotation_lineups where event_id=p_event_id and ordinal>v_slot.ordinal;
        perform private.refresh_event_rotation(p_event_id);
        return;
      end if;
      exit;
    end if;
    -- Always take the highest-priority waiting player. Overdue players become
    -- mandatory up to available team slots; age continues growing for others.
    select array_agg(id) into v_forced from (
      select (v->>'id')::uuid id from jsonb_array_elements(v_candidates) with ordinality c(v,n)
      where (v->>'id')::uuid=any(v_forced) or (v->>'skips')::integer>=3 or n=1
      order by n limit v_required
    ) mandatory;
    v_choice:=private.select_rotation_v3(v_candidates,v_pairs,v_required,v_forced);
    if v_choice is null then exit; end if;
    select array_agg(x::uuid order by n) into v_ids from jsonb_array_elements_text(v_choice->'entryIds') with ordinality c(x,n);
    if v_slot.id is null then
      insert into private.event_rotation_lineups(event_id,entry_ids,metrics) values(p_event_id,v_ids,v_choice);
    else
      update private.event_rotation_lineups set entry_ids=v_ids,metrics=v_choice where id=v_slot.id;
    end if;
    update public.event_queue_entries set rotation_skips=case when id=any(v_ids) then 0 else rotation_skips+1 end
      where event_id=p_event_id and state='ready' and id in (
        select (v->>'id')::uuid from jsonb_array_elements(v_candidates) v
      );
    insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,after_state)
      values(auth.uid(),'rotation.reserved','event',p_event_id,v_event.club_id,v_choice);
  end loop;

  select coalesce(array_agg(entry_id order by l.ordinal,n),'{}') into v_saved
    from private.event_rotation_lineups l cross join unnest(l.entry_ids) with ordinality c(entry_id,n) where l.event_id=p_event_id;
  select v_saved||coalesce(array_agg(id order by position_key,id),'{}') into v_order
    from public.event_queue_entries where event_id=p_event_id and state='ready' and not id=any(v_saved);
  select array_agg(id order by position_key,id) into v_current from public.event_queue_entries where event_id=p_event_id and state='ready';
  if v_order is distinct from coalesce(v_current,'{}') then
    -- Two-pass relocation avoids unique position collisions, including swaps.
    select coalesce(max(abs(position_key)),0)+1000000 into v_base from public.event_queue_entries where event_id=p_event_id;
    for v_i in 1..coalesce(cardinality(v_order),0) loop
      update public.event_queue_entries set position_key= -v_base-v_i,version=version+1 where id=v_order[v_i];
    end loop;
    for v_i in 1..coalesce(cardinality(v_order),0) loop
      update public.event_queue_entries set position_key=v_base+v_i*1000,version=version+1 where id=v_order[v_i];
    end loop;
  end if;
end $$;
revoke all on function private.refresh_event_rotation(uuid) from public,anon,authenticated;

create or replace function public.event_rotation_slot_sizes(p_event_id uuid)
returns integer[] language plpgsql stable security definer set search_path=pg_catalog,public,private as $$
begin
  if not private.can_view_event_operations(p_event_id) then
    raise exception using errcode='P0001',detail='PERMISSION_DENIED';
  end if;
  return coalesce((select array_agg(cardinality(entry_ids) order by ordinal)
    from private.event_rotation_lineups where event_id=p_event_id),'{}');
end $$;
revoke all on function public.event_rotation_slot_sizes(uuid) from public,anon;
grant execute on function public.event_rotation_slot_sizes(uuid) to authenticated;

-- Rebuild running events with the corrected ranks; saved complete slots stay.
do $$ declare e record; begin
  for e in select id from public.events where status='in_progress' loop perform private.refresh_event_rotation(e.id); end loop;
end $$;
