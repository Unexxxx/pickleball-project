create function private.require_future_event_schedule()
returns trigger
language plpgsql
set search_path = pg_catalog, public, private
as $$
begin
  if (tg_op = 'INSERT' or new.starts_at is distinct from old.starts_at)
    and new.starts_at <= now()
  then
    raise exception using errcode = 'P0001', detail = 'EVENT_START_MUST_BE_FUTURE';
  end if;
  return new;
end
$$;

create trigger events_future_schedule
before insert or update of starts_at on public.events
for each row execute function private.require_future_event_schedule();

revoke all on function private.require_future_event_schedule() from public, anon, authenticated;
