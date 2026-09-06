create or replace function private.record_finalized_result_trust()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private as $$
declare v_confirmation record;v_previous numeric;
begin
  for v_confirmation in
    select distinct rc.player_id
    from public.result_confirmations rc
    where rc.result_revision_id=new.authoritative_revision_id
    order by rc.player_id
  loop
    select coalesce((select current_score from private.trust_score_ledger where player_id=v_confirmation.player_id order by created_at desc,id desc limit 1),50) into v_previous;
    insert into private.trust_score_ledger(player_id,reason_code,delta,previous_score,current_score,source_id,actor_auth_user_id,rule_version,request_id)
    values(v_confirmation.player_id,'result_confirmed',0.25,v_previous,least(100,v_previous+0.25),new.id,auth.uid(),'trust-v1',gen_random_uuid());
  end loop;
  return new;
end $$;

create trigger official_result_trust
after insert on public.official_results
for each row execute function private.record_finalized_result_trust();

create or replace function private.broadcast_calculation_change()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public,private,realtime as $$
declare v_event_id uuid;
begin
  select event_id into v_event_id from public.matches where id=new.match_id;
  perform realtime.send(
    jsonb_build_object('schemaVersion',1,'eventId',v_event_id,'clubId',new.club_id,'aggregateVersion',new.calculation_version,'occurredAt',now(),'payload',jsonb_build_object('eventType','calculation.changed','entityId',new.id)),
    'calculation.changed','club:'||new.club_id::text||':event:'||v_event_id::text||':operations',true
  );
  return new;
end $$;

create trigger official_result_calculation_broadcast
after insert or update of calculation_version on public.official_results
for each row execute function private.broadcast_calculation_change();
