// Usage: ROTATION_PGLITE_PATH=/path/to/@electric-sql/pglite/dist/index.js node scripts/test-rotation-database.mjs
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const {PGlite}=await import(pathToFileURL(process.env.ROTATION_PGLITE_PATH));
const db=new PGlite();
const load=async path=>db.exec(await readFile(path,'utf8'));
await load('tests/fixtures/rotation-database.sql');
await load('supabase/migrations/202609010051_matchmaking_commands.sql');
await load('supabase/migrations/202609080030_matchmaking_v2.sql');
await load('supabase/migrations/202609050050_queue_reorder_and_upcoming_replacement.sql');
await load('supabase/migrations/202609080050_rotation_matchmaking_v3.sql');
const id=n=>`10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const event=id(100),club=id(101),court=id(102);
const query=async(sql,params=[]) => (await db.query(sql,params)).rows;
await db.exec(`select set_config('test.actor','${id(1)}',false);insert into public.clubs values('${club}');insert into public.events(id,club_id) values('${event}','${club}');insert into public.event_courts(id,event_id,label) values('${court}','${event}','Court 1');`);
await db.exec('begin');
for(let n=1;n<=36;n++){
 await query('insert into public.players values($1)',[id(n)]);
 await query('insert into public.accounts values($1,now())',[id(n)]);
 await query('insert into public.event_queue_entries(id,club_id,event_id,player_id,position_key,position_sequence) values($1,$2,$3,$4,$5,$5)',[id(n+200),club,event,id(n),n*1000]);
}
await db.exec('commit');
let slots=await query('select * from private.event_rotation_lineups order by ordinal');
assert.equal(slots.length,2);assert.equal(new Set(slots.flatMap(x=>x.entry_ids)).size,8);
const first=slots[0].entry_ids;
await query('select private.refresh_event_rotation($1)',[event]);
assert.deepEqual((await query('select entry_ids from private.event_rotation_lineups order by ordinal'))[0].entry_ids,first);
const games=new Map(), partners=new Map(),opponents=new Map(), allGroups=new Set();
let partnerRepeats=0,opponentRepeats=0;
const pairs=new Set(),opPairs=new Set();
const key=(a,b)=>[a,b].sort().join(':');
const start=performance.now();
for(let turn=0;turn<55;turn++){
 const before=(await query('select entry_ids from private.event_rotation_lineups order by ordinal'));
 const request=id(1000+turn);
 const [assigned]=await query('select * from public.assign_next_queued_match($1,$2,$3)',[event,'doubles',request]);
 const [retry]=await query('select * from public.assign_next_queued_match($1,$2,$3)',[event,'doubles',request]);
 assert.equal(assigned.match_id,retry.match_id);
 const ps=await query('select player_id,side from public.match_participants where match_id=$1 order by side,position',[assigned.match_id]);
 assert.deepEqual(ps.map(p=>id(Number(p.player_id.slice(-12))+200)),before[0].entry_ids);
 assert.deepEqual((await query('select entry_ids from private.event_rotation_lineups order by ordinal'))[0].entry_ids,before[1].entry_ids);
 allGroups.add(ps.map(p=>p.player_id).sort().join(':'));
 for(const p of ps)games.set(p.player_id,(games.get(p.player_id)??0)+1);
 for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++){
  const [a,b]=[ps[i],ps[j]],same=a.side===b.side,set=same?pairs:opPairs,k=key(a.player_id,b.player_id);
  if(set.has(k)){if(same)partnerRepeats++;else opponentRepeats++;}set.add(k);
  const map=same?partners:opponents;
  for(const [x,y] of [[a,b],[b,a]]){if(!map.has(x.player_id))map.set(x.player_id,new Set());map.get(x.player_id).add(y.player_id);}
 }
 await db.exec('begin');
 const revision=id(2000+turn);
 await query('insert into public.result_revisions values($1,$2)',[revision,turn%2+1]);
 await query("insert into public.match_results(match_id,status,current_revision_id) values($1,'pending_confirmation',$2)",[assigned.match_id,revision]);
 await query("update public.matches set status='score_pending',completed_at=clock_timestamp() where id=$1",[assigned.match_id]);
 await query('update public.match_participants set active=false where match_id=$1',[assigned.match_id]);
 const [{tail}]=await query('select max(position_key)::float8 tail from public.event_queue_entries');
 for(let i=0;i<ps.length;i++)await query("update public.event_queue_entries set state='ready',assigned_match_id=null,position_key=$1,rotation_skips=0 where player_id=$2",[tail+(i+1)*1000,ps[i].player_id]);
 await query("update public.event_courts set status='available',current_match_id=null where id=$1",[court]);
 await db.exec('commit');
}
assert.equal(games.size,36);
assert.ok(Math.max(...games.values())-Math.min(...games.values())<=2,'fair match counts');
assert.ok(allGroups.size>40,'fixed four-player groups must not recur');
assert.ok(Math.min(...[...partners.values()].map(x=>x.size))>=4,'every player receives more than three distinct teammates');
assert.ok(partnerRepeats<56/2,'substantially fewer repeated partners than v2');
assert.ok(opponentRepeats<166/2,'substantially fewer repeated opponents than v2');
console.log(JSON.stringify({matches:55,distinctGroups:allGroups.size,partnerRepeats,opponentRepeats,minGames:Math.min(...games.values()),maxGames:Math.max(...games.values()),minPartners:Math.min(...[...partners.values()].map(x=>x.size)),minOpponents:Math.min(...[...opponents.values()].map(x=>x.size)),elapsedSeconds:(performance.now()-start)/1000}));
// Check out one reserved player: no ghost slot, no duplicate reservations.
const [slot]=await query('select * from private.event_rotation_lineups order by ordinal');
await query("update public.event_queue_entries set state='left' where id=$1",[slot.entry_ids[0]]);
slots=await query('select * from private.event_rotation_lineups order by ordinal');
assert.equal(new Set(slots.flatMap(s=>s.entry_ids)).size,8);
assert.ok(!slots.flatMap(s=>s.entry_ids).includes(slot.entry_ids[0]));
// Saved slot survives a late arrival.
const stable=slots.map(s=>s.entry_ids);
await query('insert into public.players values($1)',[id(37)]);
await query('insert into public.event_queue_entries(id,club_id,event_id,player_id,position_key,position_sequence) select $1,$2,$3,$4,max(position_key)+1000,37000 from public.event_queue_entries',[id(237),club,event,id(37)]);
assert.deepEqual((await query('select entry_ids from private.event_rotation_lineups order by ordinal')).map(s=>s.entry_ids),stable);
// Organizer moves affect only the bench; explicit replacements update the saved slot.
const bench=await query("select * from public.event_queue_entries where state='ready' and not id=any($1::uuid[]) order by position_key",[stable.flat()]);
await query('select * from public.adjust_event_queue($1,$2,$3,$4,$5)',[bench[1].id,bench[1].version,bench[0].id,'Bench adjustment',id(4000)]);
assert.deepEqual((await query('select entry_ids from private.event_rotation_lineups order by ordinal')).map(s=>s.entry_ids),stable);
const [moved]=await query('select position_key from public.event_queue_entries where id=$1',[bench[1].id]);
assert.equal(moved.position_key,bench[0].position_key);
const [{queue_version}]=await query('select queue_version from public.events where id=$1',[event]);
await query('select public.replace_standby_player($1,$2,$3,$4,$5,$6,$7)',[event,'doubles',stable[1][0],bench[0].id,queue_version,'Emergency replacement',id(4001)]);
const replaced=(await query('select entry_ids from private.event_rotation_lineups order by ordinal')).map(s=>s.entry_ids);
assert.equal(replaced[1][0],bench[0].id);
assert.deepEqual(replaced[0],stable[0]);
await query('select private.refresh_event_rotation($1)',[event]);
assert.deepEqual((await query('select entry_ids from private.event_rotation_lineups order by ordinal')).map(s=>s.entry_ids),replaced);
await query("select set_config('test.actor',$1,false)",[id(2)]);
await assert.rejects(query('select * from public.assign_next_queued_match($1,$2,$3)',[event,'doubles',id(4002)]),e=>e.detail==='PERMISSION_DENIED');
await query("select set_config('test.actor',$1,false)",[id(1)]);
// Mixed skill levels: the optimal partition balances all three dimensions.
const candidates=[1900,1700,1300,1100].map((rating,i)=>({id:id(i+1),rating,winRate:[.9,.7,.3,.1][i],rank:[.1,.3,.7,.9][i]}));
const [{choice}]=await query('select private.select_rotation_v3($1::jsonb,$2::jsonb,4,$3::uuid[]) choice',[JSON.stringify(candidates),'{}',[]]);
assert.equal(choice.ratingDifference,0);
assert.ok(choice.winRateDifference<.00001);
assert.ok(choice.rankPercentileDifference<.00001);
const [{single}]=await query('select private.select_rotation_v3($1::jsonb,$2::jsonb,2,$3::uuid[]) single',[JSON.stringify(candidates),'{}',[id(1)]]);
assert.equal(single.entryIds.length,2);
assert.ok(single.entryIds.includes(id(1)));
console.log('PASS: stable reservations, idempotent assignment, preview parity, 55-match rotation, checkout repair, late arrival, bench moves, upcoming replacement, organizer permissions, skill balance, singles selector.');
await db.close();
