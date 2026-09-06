create or replace function private.broadcast_result_change()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private,realtime as $$
declare
  v_event uuid;
  v_club uuid;
  v_entity uuid;
  v_version bigint;
  v_kind text;
begin
  if tg_table_name='result_confirmations' then
    select r.event_id,r.club_id,r.version,rr.id
      into v_event,v_club,v_version,v_entity
      from public.result_revisions rr
      join public.match_results r on r.id=rr.result_id
      where rr.id=new.result_revision_id;
    v_kind:='confirmation.changed';
  else
    v_event:=new.event_id;
    v_club:=new.club_id;
    v_version:=new.version;
    v_entity:=new.id;
    v_kind:='result.changed';
  end if;

  perform realtime.send(
    jsonb_build_object(
      'schemaVersion',1,
      'eventId',v_event,
      'clubId',v_club,
      'aggregateVersion',v_version,
      'occurredAt',now(),
      'payload',jsonb_build_object('eventType',v_kind,'entityId',v_entity)
    ),
    v_kind,
    'club:'||v_club::text||':event:'||v_event::text||':operations',
    true
  );
  return new;
end
$$;

comment on function private.broadcast_result_change() is
  'Broadcasts match-result and confirmation invalidations without referencing fields absent from the triggering row type.';
