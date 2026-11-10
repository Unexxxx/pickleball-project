begin;
select plan(12);

-- Players: 1 owner, 2 staff, 3 member, 4 owner of another club.
do $$ declare n int; id uuid; begin
 for n in 1..4 loop
  id := ('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'template-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'template-test-'||n,'Template Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values
 ('97000000-0000-4000-8000-0000000000c1','templates-club','Templates Club','UTC'),
 ('97000000-0000-4000-8000-0000000000c2','other-templates','Other Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000001','owner'),
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000002','organizer'),
 ('97000000-0000-4000-8000-0000000000c1','97000000-0000-4000-8000-000000000003','member'),
 ('97000000-0000-4000-8000-0000000000c2','97000000-0000-4000-8000-000000000004','owner');

select ok(not has_function_privilege('anon','public.save_event_template(uuid,text,jsonb)','EXECUTE'),'anonymous users cannot save templates');

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000001',true);
select lives_ok($$select public.save_event_template('97000000-0000-4000-8000-0000000000c1',' Saturday Open Play ','{"capacity":16}')$$,'the owner saves a template');
select lives_ok($$select public.save_event_template('97000000-0000-4000-8000-0000000000c1','saturday open play','{"capacity":24}')$$,'saving the same name again updates it');
select is((select count(*)::int from public.event_templates),1,'one template, not two');
select is((select (settings->>'capacity')::int from public.event_templates),24,'the template has the newer settings');
select set_config('test.template_id',(select id::text from public.event_templates),true) is not null as remembered;
select throws_ok($$select public.save_event_template('97000000-0000-4000-8000-0000000000c1','Bad','[1,2]')$$,'P0001',null,'settings must be an object');
select throws_ok($$insert into public.event_templates(club_id,name,settings) values('97000000-0000-4000-8000-0000000000c1','Direct','{}')$$,'42501',null,'templates are only written through the function');

-- Staff share the club's templates.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
select is((select count(*)::int from public.event_templates),1,'staff see the club''s templates');

-- Members and other clubs don't.
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000003',true);
select is((select count(*)::int from public.event_templates),0,'members cannot see templates');
select throws_ok($$select public.save_event_template('97000000-0000-4000-8000-0000000000c1','Mine','{}')$$,'P0001',null,'members cannot save templates');
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000004',true);
select throws_ok($$select public.delete_event_template(current_setting('test.template_id')::uuid)$$,'P0001',null,'another club''s owner cannot delete it');

select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000002',true);
select lives_ok($$select public.delete_event_template(current_setting('test.template_id')::uuid)$$,'staff can delete a template');

select * from finish();
rollback;
