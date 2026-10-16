import test from 'node:test';
import assert from 'node:assert/strict';
import {createArchiveCommunityClient} from '../src/lib/archiveClient.mjs';
import {emptyObservatory,loadObservatory} from '../src/lib/archivePersonal.mjs';
const memory=()=>{const rows=new Map();return {getItem:key=>rows.get(key),setItem:(key,value)=>rows.set(key,value)};};
function accountFixture(owner='alice'){
 let generation=0;const account={apiBase:'https://api.wiki.test',state:{auth:'user',viewer:owner?{userId:owner}:null},getAccountGeneration:()=>generation,refreshAuth:async()=>{}};
 const change=next=>{generation++;account.state.viewer=next?{userId:next}:null;};return {account,change,client:createArchiveCommunityClient(async()=>account)};
}
async function withFetch(mock,run){const old=globalThis.fetch;globalThis.fetch=mock;try{await run();}finally{globalThis.fetch=old;}}
test('queued personal writes stay bound to their original session and cannot enter the new account',async()=>{
 const {client,change}=accountFixture(),storage=memory();await client.currentOwner();let release,started;const ready=new Promise(resolve=>started=resolve),requests=[];
 await withFetch(async(_url,options)=>{const body=JSON.parse(options.body);requests.push(body);started();return new Promise(resolve=>release=()=>resolve(Response.json({data:body.data,revision:1})));},async()=>{
  const first=client.record({kind:'read',entityId:'song-a',note:'Alice private note'},storage);await ready;const queued=client.record({kind:'read',entityId:'song-b',note:'Second Alice note'},storage);
  const rejected=Promise.all([assert.rejects(first,/account_changed/),assert.rejects(queued,/account_changed/)]);change('bob');release();await rejected;
  assert.equal(loadObservatory(storage,'bob').data.records.length,0);assert.equal(loadObservatory(storage,'alice').data.records.length,1);assert.equal(requests.length,1);assert.equal(requests[0].accountId,'alice');
 });
});
test('an account changing away and back invalidates a community response despite an equal final user ID',async()=>{
 const {client,change}=accountFixture();await client.currentOwner();let release,started;const ready=new Promise(resolve=>started=resolve);
 await withFetch(async()=>{started();return new Promise(resolve=>release=()=>resolve(Response.json({private:'old Alice session'})));},async()=>{
  const pending=client.request('me'),rejected=assert.rejects(pending,/account_changed/);await ready;change(null);change('alice');release();await rejected;
 });
});
test('ordinary same-account sync notifications do not invalidate an ongoing response',async()=>{
 const {client,account}=accountFixture();await client.currentOwner();let release,started;const ready=new Promise(resolve=>started=resolve);
 await withFetch(async()=>{started();return new Promise(resolve=>release=()=>resolve(Response.json({ok:true})));},async()=>{
  const pending=client.request('me');await ready;account.state.sync='synced';release();assert.deepEqual(await pending,{ok:true});
 });
});
test('initial authentication completes before a new personal write binds to its session',async()=>{
 let generation=0,refreshes=0;const account={state:{auth:'checking',viewer:null},getAccountGeneration:()=>generation,refreshAuth:async()=>{refreshes++;generation++;account.state.viewer={userId:'alice'};account.state.auth='user';}},client=createArchiveCommunityClient(async()=>account),storage=memory();
 await withFetch(async(_url,options)=>{const body=JSON.parse(options.body);assert.equal(body.accountId,'alice');return Response.json({data:body.data,revision:1});},async()=>{
  const result=await client.record({kind:'heard',entityId:'song-a'},storage);assert.equal(result.synced,true);assert.equal(refreshes,1);assert.equal(loadObservatory(storage,'alice').data.records.length,1);
 });
});
test('a stale synchronization read cannot overwrite local data after logout and login',async()=>{
 const {client,change}=accountFixture(),storage=memory();await client.currentOwner();let release,started;const ready=new Promise(resolve=>started=resolve);
 await withFetch(async()=>{started();return new Promise(resolve=>release=()=>resolve(Response.json({data:{...emptyObservatory(),passport:{name:'Old secret',note:'private',published:false}},revision:9})));},async()=>{
  const pending=client.synchronize(storage),rejected=assert.rejects(pending,/account_changed/);await ready;change(null);change('alice');release();await rejected;assert.equal(loadObservatory(storage,'alice').revision,0);assert.equal(loadObservatory(storage,'alice').data.passport.name,'');
 });
});
test('an offline save retains the intended account draft for a later retry',async()=>{
 const {client}=accountFixture(),storage=memory();await withFetch(async()=>Response.json({error:{code:'community_unavailable'}},{status:503}),async()=>{
  const saved=await client.record({kind:'read',entityId:'song-a'},storage);assert.equal(saved.synced,false);assert.equal(saved.error.message,'community_unavailable');assert.equal(loadObservatory(storage,'alice').dirty,true);
 });
});
test('guest community mutations require sign-in before any private payload is sent',async()=>{
 const {client}=accountFixture(null);let calls=0;await withFetch(async()=>{calls++;return Response.json({});},async()=>{await assert.rejects(client.request('collections',{method:'POST',body:{title:'Guest private draft'}}),error=>error.status===401);assert.equal(calls,0);});
});
