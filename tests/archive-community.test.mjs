import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {DatabaseSync} from 'node:sqlite';
import {handleArchiveCommunity} from '../functions/_shared/archiveCommunity.mjs';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {emptyObservatory,upsertObservation} from '../src/lib/archivePersonal.mjs';
async function fixture(){
 const sqlite=new DatabaseSync(':memory:');sqlite.exec(await readFile('migrations/archive/0001_community.sql','utf8'));
 const db={prepare:sql=>({
  bind:(...args)=>({
   first:async()=>sqlite.prepare(sql).get(...args) || null,
   all:async()=>({results:sqlite.prepare(sql).all(...args)}),
   run:async()=>({meta:{changes:Number(sqlite.prepare(sql).run(...args).changes)}}),
  }),
 })};
 const snapshot=archiveFixture();
 const env={ARCHIVE_DB:db,ARCHIVE_ACCOUNT:{fetch:async request=>{
  const who=request.headers.get('Authorization');
  return Response.json({viewer:who?{kind:'user',userId:who,displayName:who,roles:who==='reviewer'?['archive-reviewer']:[]}:null});
 }},ASSETS:{fetch:async()=>Response.json({version:1,snapshot:snapshot.snapshot,records:snapshot.entities})}};
 const call=async(path,method='GET',body,who='alice',origin='https://wiki.test')=>{
  const request=new Request('https://wiki.test/api/archive/community/'+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(who?{Authorization:who}:{})},body:['GET','DELETE'].includes(method)?undefined:JSON.stringify(body || {})});
  const response=await handleArchiveCommunity({request,env,params:{route:path.split('/').map(decodeURIComponent)}});
  return {status:response.status,data:await response.json()};
 };
 return {call,env,sqlite};
}

test('collection presentation survives publish and fork while invalid metadata is rejected',async()=>{
 const {call}=await fixture(),items=[{entityId:'song-a',note:'First line\n第二行',section:'Part one',cover:true},{entityId:'song-b',note:'Next',section:'Part two'}];
 const created=await call('collections','POST',{title:'A guided exhibition',kind:'collection',items,action:'publish'});assert.equal(created.status,201);assert.deepEqual(created.data.collection.items,items);
 const id=created.data.collection.id,publicRead=await call('collections/'+id,'GET',undefined,null);assert.deepEqual(publicRead.data.collection.items,items);assert.ok(!('owner' in publicRead.data.collection));
 const fork=await call('collections/'+id+'/fork','POST',{},'bob');assert.deepEqual(fork.data.collection.items,items);assert.equal(fork.data.collection.status,'draft');
 assert.equal((await call('collections','POST',{title:'Invalid',kind:'collection',items:items.map(item=>({...item,cover:true})),action:'publish'})).status,400);
 assert.equal((await call('collections','POST',{title:'Invalid',kind:'collection',items:[{entityId:'song-a',section:{html:'bad'}}],action:'publish'})).status,400);
});
test('community authentication trusts the identity binding; blocks CSRF and account spoofing',async()=>{
 const {call,env}=await fixture();
 assert.equal((await call('me','GET',undefined,null)).status,401);
 assert.equal((await call('collections','POST',{accountId:'bob'},'alice','https://evil.test')).status,403);
 assert.equal((await call('me','PUT',{accountId:'bob',revision:0,data:emptyObservatory()})).status,409);
 const response=await handleArchiveCommunity({request:new Request('https://wiki.test/api/archive/community/me'),params:{route:['me']},env:{ARCHIVE_DB:env.ARCHIVE_DB}});
 assert.equal(response.status,503);
});
test('profile synchronization isolates owners and rejects stale overwrites',async()=>{
 const {call}=await fixture(),data=upsertObservation(emptyObservatory(),{kind:'heard',entityId:'song-a'});
 assert.equal((await call('me','PUT',{revision:0,data})).status,200);
 assert.equal((await call('me','PUT',{revision:0,data:emptyObservatory()})).status,409);
 assert.equal((await call('me','GET',undefined,'bob')).data.data.records.length,0);
 assert.equal((await call('me')).data.data.records.length,1);
 assert.equal((await call('me','PUT',{revision:1,data:upsertObservation(data,{kind:'heard',entityId:'live-a'})})).status,400);
});
test('public witness consent is independent of passport and can be withdrawn; editions must exist',async()=>{
 const {call}=await fixture();
 let data=upsertObservation(emptyObservatory(),{kind:'visited',entityId:'live-a',note:'Private ticket',ticketUrl:'https://example.com/ticket'});
 await call('me','PUT',{revision:0,data});
 assert.equal((await call('witnesses/live-a','GET',undefined,null)).data.witnesses.length,0);
 data=upsertObservation(data,{kind:'visited',entityId:'live-a',note:'Public memory',visibility:'public'});
 await call('me','PUT',{revision:1,data});
 const witnesses=(await call('witnesses/live-a','GET',undefined,null)).data.witnesses;
 assert.equal(witnesses.length,1);assert.equal(witnesses[0].record.note,'Public memory');assert.ok(!('passportId' in witnesses[0]));assert.ok(!JSON.stringify(witnesses).includes('alice'));
 data=upsertObservation(data,{kind:'visited',entityId:'live-a',visibility:'private'});
 await call('me','PUT',{revision:2,data});
 assert.equal((await call('witnesses/live-a','GET',undefined,null)).data.witnesses.length,0);
 assert.equal((await call('me','PUT',{revision:3,data:upsertObservation(data,{kind:'owned',entityId:'release',editionId:'release:fake'})})).status,400);
 assert.equal((await call('me','PUT',{revision:3,data:upsertObservation(data,{kind:'owned',entityId:'release',editionId:'release:alpha',barcode:'4901234567894'})})).status,200);
});
test('malformed input returns client errors without leaking internal details',async()=>{
 const {call,env}=await fixture();
 assert.equal((await call('me','PUT',{data:null,revision:0})).status,400);
 const response=await handleArchiveCommunity({request:new Request('https://wiki.test/api/archive/community/me',{method:'PUT',headers:{Origin:'https://wiki.test','Content-Type':'application/json'},body:'{broken'}),env,params:{route:['me']}});
 assert.equal(response.status,400);
 assert.equal((await response.json()).error.code,'invalid_json');
 const body={entityId:'song-a',field:'sources',locale:'',snapshot:'fixture'};
 await call('tasks/song-a%3Asources/claim','POST',body);
 assert.equal((await call('tasks/song-a%3Asources/submit','POST',{proofUrl:'not a URL'})).status,400);
});

test('published collection links work without login and do not disclose account or reviewer IDs',async()=>{
 const {call}=await fixture(),payload={title:'Public archive',kind:'collection',items:[{entityId:'song-a'}],action:'publish'};
 const collection=(await call('collections','POST',payload)).data.collection;
 const anonymous=await call('collections/'+collection.id,'GET',undefined,null);
 assert.equal(anonymous.status,200);
 const signedIn=await call('collections/'+collection.id,'GET',undefined,'bob');
 for(const response of [anonymous,signedIn]){
  assert.equal(response.data.collection.title,payload.title);
  assert.ok(!('owner' in response.data.collection));
  assert.ok(!('reviewer' in response.data.collection));
  assert.ok(!('review_note' in response.data.collection));
 }
});

test('review authority grants access to submitted exhibitions, not private drafts',async()=>{
 const {call}=await fixture(),payload={title:'Private draft',kind:'exhibition',items:[{entityId:'song-a'}],action:'draft'};
 const collection=(await call('collections','POST',payload)).data.collection;
 assert.equal((await call('collections/'+collection.id,'GET',undefined,'reviewer')).status,404);
 assert.equal((await call('collections/'+collection.id,'GET')).status,200);
 await call('collections/'+collection.id,'PUT',{...payload,action:'publish',revision:1});
 assert.equal((await call('collections/'+collection.id,'GET',undefined,'reviewer')).status,200);
});

test('null bodies and invalid collection items are rejected as client input errors',async()=>{
 const {call,env}=await fixture();
 const request=new Request('https://wiki.test/api/archive/community/collections',{method:'POST',headers:{Origin:'https://wiki.test',Authorization:'alice','Content-Type':'application/json'},body:'null'});
 assert.equal((await handleArchiveCommunity({request,env,params:{route:['collections']}})).status,400);
 assert.equal((await call('collections','POST',{title:'Bad item',kind:'collection',items:[null],action:'publish'})).status,400);
});
test('collections keep drafts private, support fork and follow, enforce ownership and reviewed exhibitions',async()=>{
 const {call}=await fixture(),payload={title:'My collection',description:'A source-backed route',kind:'collection',items:[{entityId:'song-a',note:'Start here'}],action:'draft'};
 const draft=(await call('collections','POST',payload)).data.collection;
 assert.equal((await call('collections')).data.collections.length,0);
 assert.equal((await call('collections/'+draft.id,'GET',undefined,'bob')).status,404);
 assert.equal((await call('collections/'+draft.id,'PUT',{...payload,revision:1,action:'publish'})).status,200);
 assert.equal((await call('collections')).data.collections.length,1);
 assert.equal((await call('collections/'+draft.id,'PUT',{...payload,revision:1,action:'publish'})).status,409);
 assert.equal((await call('collections/'+draft.id+'/follow','POST',{follow:true},'bob')).status,200);
 assert.equal((await call('me','GET',undefined,'bob')).data.follows.length,1);
 const fork=await call('collections/'+draft.id+'/fork','POST',{},'bob');assert.equal(fork.status,201);assert.equal(fork.data.collection.status,'draft');
 assert.equal((await call('collections/'+draft.id,'DELETE',undefined,'bob')).status,403);
 const exhibition=(await call('collections','POST',{...payload,kind:'exhibition',action:'publish'})).data.collection;
 assert.equal(exhibition.status,'pending');
 assert.equal((await call('collections/'+exhibition.id+'/review','POST',{action:'approve',revision:1,note:'Checked'},'alice')).status,403);
 assert.equal((await call('collections/'+exhibition.id+'/review','POST',{action:'approve',revision:1,note:'Checked'},'reviewer')).status,200);
});
test('claim races, stale catalogue, submissions and contribution approvals use server state',async()=>{
 const {call}=await fixture(),body={entityId:'song-a',field:'sources',locale:'',snapshot:'fixture'},path='tasks/song-a%3Asources';
 assert.equal((await call(path+'/claim','POST',{...body,snapshot:'old'})).status,409);
 const results=await Promise.all([call(path+'/claim','POST',body,'alice'),call(path+'/claim','POST',body,'bob')]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
 const claimant=results[0].status===200?'alice':'bob',other=claimant==='alice'?'bob':'alice';
 assert.equal((await call(path+'/submit','POST',{proofUrl:'https://github.com/example/repo/pull/1'},other)).status,403);
 assert.equal((await call(path+'/submit','POST',{proofUrl:'https://github.com/example/repo/pull/1'},claimant)).status,200);
 assert.equal((await call(path+'/review','POST',{action:'approve',note:'Checked merged source'},claimant)).status,403);
 assert.equal((await call(path+'/review','POST',{action:'approve',note:'Checked merged source'},'reviewer')).status,200);
 assert.equal((await call('me','GET',undefined,claimant)).data.tasks[0].status,'approved');
});
test('rooms share only the host position, require membership, retain revision order and close cleanly',async()=>{
 const {call}=await fixture();
 const created=(await call('rooms','POST',{title:'Explore together'})).data,id=created.id;
 assert.equal((await call('rooms/'+id,'GET',undefined,'bob')).status,403);
 assert.equal((await call('rooms/'+id+'/join','POST',{},'bob')).status,200);
 assert.equal((await call('rooms/'+id+'/position','PUT',{entityId:'song-a',revision:1},'bob')).status,403);
 assert.equal((await call('rooms/'+id+'/position','PUT',{entityId:'song-a',revision:1})).status,200);
 assert.equal((await call('rooms/'+id+'/position','PUT',{entityId:'song-b',revision:1})).status,409);
 const view=(await call('rooms/'+id,'GET',undefined,'bob')).data;assert.equal(view.position.entityId,'song-a');assert.equal(view.participants.length,2);
 assert.ok(!('owner' in view));assert.ok(!('data' in view));
 assert.equal((await call('rooms/'+id,'DELETE')).status,200);
 assert.equal((await call('rooms/'+id,'GET',undefined,'bob')).status,404);
});

test('closing a room during catalogue validation prevents a late host position write',async()=>{
 const {call,env}=await fixture(),created=(await call('rooms','POST',{title:'Concurrent closure'})).data;
 const assets=env.ASSETS;let resume,started;const validationStarted=new Promise(resolve=>started=resolve);
 env.ASSETS={fetch:async request=>{started();await new Promise(resolve=>resume=resolve);return assets.fetch(request);}};
 const position=call('rooms/'+created.id+'/position','PUT',{entityId:'song-a',revision:1});await validationStarted;
 assert.equal((await call('rooms/'+created.id,'DELETE')).status,200);resume();
 assert.equal((await position).status,409);
 assert.equal((await call('rooms/'+created.id)).status,404);
});

test('verified contribution totals cover all approved work, excluding claims and other accounts',async()=>{
 const {call,sqlite}=await fixture(),now=Date.now(),statement=sqlite.prepare("INSERT INTO archive_tasks(id,entity_id,field,locale,owner,status,snapshot,claimed_at,expires_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)");
 for(let i=0;i<105;i++)statement.run('task-'+i,'song-a','sources','','alice','approved','fixture',now,now+1000,now);
 statement.run('claim','song-b','sources','','alice','claimed','fixture',now,now+1000,now);statement.run('other','song-b','credits','','bob','approved','fixture',now,now+1000,now);
 const me=(await call('me')).data;assert.equal(me.tasks.length,100);assert.equal(me.contributions.approved,105);assert.equal(me.contributions.month.approved,105);
 assert.equal((await call('me','GET',undefined,'bob')).data.contributions.approved,1);
});
