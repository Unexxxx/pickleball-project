-- Runs within the authorized, version-checked transition_event transaction.
create function private.complete_event_operations()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public, private as $$
begin
  if new.status = 'completed' and old.status is distinct from new.status then
    if exists(select 1 from public.matches where event_id = new.id and status in ('assigned','playing')) then
      raise exception using errcode = 'P0001', detail = 'ACTIVE_MATCHES_REMAIN';
    end if;
    insert into private.event_queue_history(queue_entry_id,from_state,to_state,old_position_key,actor_player_id,reason,request_id)
    select id,state,'left',position_key,public.current_player_id(),'event_completed',gen_random_uuid()
    from public.event_queue_entries where event_id = new.id and state in ('ready','unavailable');
    update public.event_queue_entries set state = 'left', version = version + 1
    where event_id = new.id and state in ('ready','unavailable');
    update public.event_attendance set state = 'checked_out', checked_out_at = now(), changed_by = public.current_player_id()
    where event_id = new.id and state = 'checked_in';
    update public.match_proposals set status = 'canceled', version = version + 1
    where event_id = new.id and status = 'pending';
    new.queue_version := old.queue_version + 1;
  end if;
  return new;
end $$;
revoke all on function private.complete_event_operations() from public, anon, authenticated;
create trigger complete_event_operations before update of status on public.events
for each row execute function private.complete_event_operations();
