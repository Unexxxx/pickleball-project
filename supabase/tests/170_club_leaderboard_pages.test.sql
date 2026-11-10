begin;
select plan(13);

-- Players 1..60 ("Ranker 01".."Ranker 60") ranked in that order on the club
-- leaderboard. Even numbers up to 58 are active members; 59 left the club;
-- 60 keeps a private profile (never listed).
do $$ declare n int; id uuid; begin
 for n in 1..60 loop
  id := ('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  insert into auth.users(id,email,email_confirmed_at) values(id,'board-'||n||'@example.invalid',now());
  insert into public.players(id,public_slug,display_name,visibility)
  values(id,'board-'||n,'Ranker '||lpad(n::text,2,'0'),case when n=60 then 'private' else 'public' end);
  insert into public.accounts(auth_user_id,player_id,contact_verified_at) values(id,id,now());
 end loop;
end $$;
insert into public.clubs(id,slug,name,timezone) values('97000000-0000-4000-8000-0000000000c1','board','Board Club','UTC');
insert into public.club_memberships(club_id,player_id,role,status)
select '97000000-0000-4000-8000-0000000000c1',('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'member',
       (case when n=59 then 'left' else 'active' end)::public.membership_status
from generate_series(1,60) n where n%2=0 or n=59;
insert into public.leaderboard_entries(scope,club_id,player_id,rating,wins,losses,win_rate,current_streak,longest_win_streak,calculation_version)
select 'club','97000000-0000-4000-8000-0000000000c1',('97000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,
       2000-n,10,5,0.666667,0,0,1
from generate_series(1,60) n;

set local role anon;
select is((select count(*)::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1')),50,'the first page has 50 players');
select is((select max(total)::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1')),59,'private profiles are not ranked publicly');
select is((select min(rank)::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1')),1,'the board starts at #1');
select results_eq($$select rank::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1',false,null,50)$$,
  $$select generate_series(51,59)$$,'the next page continues after #50');
select is((select max(total)::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1',false,'ranker 1')),10,'search covers the whole board');
select is((select is_member from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1') where rank=2),true,'members are marked');
select is((select is_member from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1') where rank=59 or display_name='Ranker 59' limit 1),false,'someone who left is not a member');
select is((select max(total)::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1',true)),29,'members only counts every member, not just the first page');
select is((select display_name from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1',true) where rank=1),'Ranker 02','members are ranked among themselves');
select is((select rank::int from public.club_leaderboard_page('97000000-0000-4000-8000-0000000000c1',true,'Ranker 10')),5,'search keeps the member rank');
select throws_ok($$select * from public.club_leaderboard_me('97000000-0000-4000-8000-0000000000c1')$$,'42501',null,'visitors have no own rank');

set local role authenticated;
select set_config('request.jwt.claim.sub','97000000-0000-4000-8000-000000000031',true);
select results_eq($$select rank::int, total::int from public.club_leaderboard_me('97000000-0000-4000-8000-0000000000c1')$$,
  $$values (31, 59)$$,'a player sees their own rank and how many are ranked');
select is((select count(*)::int from public.club_leaderboard_me('97000000-0000-4000-8000-0000000000c1',true)),0,'a non-member has no members-only rank');

select * from finish();
rollback;
