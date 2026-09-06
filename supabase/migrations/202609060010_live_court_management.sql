create or replace function public.add_event_court(p_event_id uuid,p_idempotency_key uuid)
returns table(court_id uuid,court_label text)
language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_event public.events%rowtype;v_court public.event_courts%rowtype;v_next integer;
begin
 select * into v_event from public.events where id=p_event_id for update;
 if v_event.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
 if not private.has_club_role(v_event.club_id,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
 if v_event.status in('completed','canceled') then raise exception using errcode='P0001',detail='EVENT_CLOSED';end if;
 select * into v_court from public.event_courts where event_id=p_event_id and status='inactive' and current_match_id is null order by coalesce(substring(label from '[0-9]+$')::integer,2147483647),label,id for update skip locked limit 1;
 if v_court.id is not null then
  update public.event_courts set status='available',version=version+1 where id=v_court.id returning id,label into court_id,court_label;
 else
  select coalesce(max(substring(label from '[0-9]+$')::integer),0)+1 into v_next from public.event_courts where event_id=p_event_id and label~'^Court [0-9]+$';
  insert into public.event_courts(event_id,label,status)values(p_event_id,'Court '||v_next,'available') returning id,label into court_id,court_label;
 end if;
 insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,after_state)values(auth.uid(),'event.court_added','event_court',court_id,v_event.club_id,p_idempotency_key,jsonb_build_object('event_id',p_event_id,'label',court_label));
 return next;
end$$;

create or replace function public.reduce_event_court(p_event_id uuid,p_court_id uuid,p_idempotency_key uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public,private as $$
declare v_event public.events%rowtype;v_court public.event_courts%rowtype;
begin
 select * into v_event from public.events where id=p_event_id for update;
 if v_event.id is null then raise exception using errcode='P0001',detail='NOT_FOUND';end if;
 if not private.has_club_role(v_event.club_id,array['owner','organizer']::public.club_role[]) then raise exception using errcode='P0001',detail='PERMISSION_DENIED';end if;
 if v_event.status in('completed','canceled') then raise exception using errcode='P0001',detail='EVENT_CLOSED';end if;
 select * into v_court from public.event_courts where id=p_court_id and event_id=p_event_id for update;
 if v_court.id is null or v_court.status='inactive' then raise exception using errcode='P0001',detail='COURT_NOT_FOUND';end if;
 if v_court.status<>'available' or v_court.current_match_id is not null then raise exception using errcode='P0001',detail='COURT_IN_USE';end if;
 if(select count(*) from public.event_courts where event_id=p_event_id and status<>'inactive')<=1 then raise exception using errcode='P0001',detail='MINIMUM_COURT_COUNT';end if;
 update public.event_courts set status='inactive',version=version+1 where id=p_court_id;
 insert into private.audit_log(actor_auth_user_id,action,aggregate_type,aggregate_id,club_id,request_id,before_state,after_state)values(auth.uid(),'event.court_reduced','event_court',p_court_id,v_event.club_id,p_idempotency_key,jsonb_build_object('event_id',p_event_id,'label',v_court.label,'status',v_court.status),jsonb_build_object('status','inactive'));
 return p_court_id;
end$$;
revoke all on function public.add_event_court(uuid,uuid) from public;
revoke all on function public.reduce_event_court(uuid,uuid,uuid) from public;
grant execute on function public.add_event_court(uuid,uuid) to authenticated;
grant execute on function public.reduce_event_court(uuid,uuid,uuid) to authenticated;
