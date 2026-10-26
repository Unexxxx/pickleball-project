begin;
select plan(8);

do $$ declare n int; id uuid; begin
 for n in 1..2 loop
  id := ('96000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'media-test-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name) values(id,'media-test-'||n,'Media Test '||n);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('96000000-0000-4000-8000-0000000000c1','media-test','Media Club','UTC');
insert into public.club_memberships(club_id,player_id,role) values
 ('96000000-0000-4000-8000-0000000000c1','96000000-0000-4000-8000-000000000001','owner'),
 ('96000000-0000-4000-8000-0000000000c1','96000000-0000-4000-8000-000000000002','member');

select ok(not has_function_privilege('anon','public.set_club_media(uuid,text,text)','EXECUTE'),'anonymous users cannot change club media');

set local role authenticated;
select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000002',true);
select throws_ok($$select public.set_club_media('96000000-0000-4000-8000-0000000000c1','profile','96000000-0000-4000-8000-0000000000c1/a.png')$$,'P0001',null,'members cannot change club media');

select set_config('request.jwt.claim.sub','96000000-0000-4000-8000-000000000001',true);
select is(public.set_club_media('96000000-0000-4000-8000-0000000000c1','profile','96000000-0000-4000-8000-0000000000c1/a.png'),null,'owner sets the profile picture; no previous file');
select is(public.set_club_media('96000000-0000-4000-8000-0000000000c1','profile','96000000-0000-4000-8000-0000000000c1/b.png'),'96000000-0000-4000-8000-0000000000c1/a.png','replacing returns the previous path');
select lives_ok($$select public.set_club_media('96000000-0000-4000-8000-0000000000c1','background','96000000-0000-4000-8000-0000000000c1/cover.webp')$$,'owner sets the cover');
select throws_ok($$select public.set_club_media('96000000-0000-4000-8000-0000000000c1','profile','someone-else/x.png')$$,'P0001',null,'paths outside the club folder are rejected');
select throws_ok($$select public.set_club_media('96000000-0000-4000-8000-0000000000c1','logo','96000000-0000-4000-8000-0000000000c1/x.png')$$,'P0001',null,'unknown media kinds are rejected');
reset role;
select is((select profile_image_path||'|'||background_image_path from public.clubs where id='96000000-0000-4000-8000-0000000000c1'),
 '96000000-0000-4000-8000-0000000000c1/b.png|96000000-0000-4000-8000-0000000000c1/cover.webp','both paths are stored');

select * from finish();
rollback;
