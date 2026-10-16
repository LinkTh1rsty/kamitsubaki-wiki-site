import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializeArchiveWorkspace} from '../src/scripts/archiveWorkspace.js';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {archiveFeatureCopy} from '../src/lib/archiveFeatureCopy.mjs';
import {readRadioQueue,writeRadioQueue,addRadioTracks} from '../src/lib/archiveRadio.mjs';
import {emptyObservatory,upsertObservation,loadObservatory,saveObservatory,completeObservatorySave} from '../src/lib/archivePersonal.mjs';

test('account notifications during snapshot loading do not render missing data; research is enabled once ready',async()=>{
 const dom=new JSDOM('<section data-module="challenges" data-locale="zh"><script type="application/json" data-archive-copy></script><form data-archive-filters><input name="q"/></form><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail></aside><div data-monthly-challenge></div></section>',{url:'https://wiki.test/zh/explore/challenges/'});
 const globals=['window','document','location','history','localStorage','FormData','CustomEvent','Event'];
 const previous=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of globals)Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true,writable:true});
 try{
  const root=document.querySelector('section');root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));
  let ready;const pending=new Promise(resolve=>ready=resolve);
  const initialized=initializeArchiveWorkspace(root,{loadSnapshot:()=>pending,owner:async()=>null,request:async()=>({}),storage:localStorage});
  assert.equal(root.querySelector('input').disabled,true);
  window.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:'fixture'}}}));
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(root.querySelector('[data-archive-results]').children.length,0);
  ready(archiveFixture());await initialized;
  assert.equal(root.querySelector('input').disabled,false);
  assert.ok(root.querySelector('[data-archive-results]').children.length>0);
 }finally{dom.window.close();for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
});

test('extending a radio queue preserves its playback position; replacement resets it',()=>{
 const data=new Map(),storage={getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};
 writeRadioQueue(storage,{version:1,ids:['song-a'],index:0,seconds:82});
 addRadioTracks(storage,['song-b']);assert.equal(readRadioQueue(storage).seconds,82);
 addRadioTracks(storage,['song-b'],{replace:true});assert.equal(readRadioQueue(storage).seconds,undefined);
 assert.deepEqual(readRadioQueue(storage).ids,['song-b']);
});
test('a save response keeps observations changed during its request and leaves them pending in the same account',()=>{
 const entries=new Map(),storage={getItem:key=>entries.get(key),setItem:(key,value)=>entries.set(key,value)};
 const sent=upsertObservation(emptyObservatory(),{kind:'heard',entityId:'song-a'});
 saveObservatory(storage,'alice',sent,1,true);
 const edited=upsertObservation(sent,{kind:'read',entityId:'song-b'});
 saveObservatory(storage,'alice',edited,1,true);
 const result=completeObservatorySave(storage,'alice',sent,{data:sent,revision:2});
 assert.equal(result.synced,false);assert.equal(result.data.records.length,2);
 assert.equal(loadObservatory(storage,'alice').revision,2);assert.equal(loadObservatory(storage,'alice').dirty,true);
 assert.equal(loadObservatory(storage,'bob').data.records.length,0);
});
test('an account switch while reading an imported file cannot apply it to the new account',async()=>{
 const dom=new JSDOM('<section data-module="physical" data-locale="zh"><script type="application/json" data-archive-copy></script><input type="file" data-import-observatory/><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail></aside></section>',{url:'https://wiki.test/zh/explore/physical/'});
 const globals=['window','document','location','history','localStorage','FormData','CustomEvent','Event'];
 const previous=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of globals)Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true,writable:true});
 try{
  let owner='alice';const root=document.querySelector('section');root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>owner,request:async()=>({}),storage:localStorage});
  const input=root.querySelector('input'),incoming=upsertObservation(emptyObservatory(),{kind:'read',entityId:'song-a'});
  Object.defineProperty(input,'files',{value:[{size:200,text:async()=>{owner='bob';return JSON.stringify(incoming);}}]});
  input.dispatchEvent(new Event('change',{bubbles:true}));await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(loadObservatory(localStorage,'alice').data.records.length,0);
  assert.equal(loadObservatory(localStorage,'bob').data.records.length,0);
 }finally{dom.window.close();for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
});

async function workspaceDOM(module,markup,callback){
 const dom=new JSDOM(`<section data-module="${module}" data-locale="zh"><script type="application/json" data-archive-copy></script><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail hidden></aside>${markup}</section>`,{url:`https://wiki.test/zh/explore/${module}/`,pretendToBeVisual:true});
 const globals=['window','document','location','history','localStorage','FormData','CustomEvent','Event'];
 const previous=new Map(globals.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of globals)Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true,writable:true});
 try{const root=document.querySelector('section');root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));await callback(root,dom.window);}
 finally{dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));dom.window.close();for(const [key,descriptor]of previous)descriptor?Object.defineProperty(globalThis,key,descriptor):delete globalThis[key];}
}
const nextTurn=()=>new Promise(resolve=>setTimeout(resolve,0));

test('a delayed collection profile cannot restore private collections after logout',async()=>{
 await workspaceDOM('collections','<div data-community-collections></div><form data-collection-form></form>',async(root,w)=>{
  let who='alice',resolveProfile,started;
  const profileStarted=new Promise(resolve=>started=resolve);
  const request=async path=>{
   if(path==='collections')return {collections:[]};
   if(path==='me'){started();return new Promise(resolve=>resolveProfile=resolve);}
   throw Error('unexpected request');
  };
  const initialized=initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,request,storage:localStorage});
  await profileStarted;who=null;w.dispatchEvent(new w.CustomEvent('kamitsubaki-account-state',{detail:{viewer:null}}));await nextTurn();
  resolveProfile({collections:[{id:'secret',title:'Alice private collection',description:'',status:'draft',items:[]}],follows:[]});
  await initialized;await nextTurn();
  assert.ok(!root.textContent.includes('Alice private collection'));
 });
});

test('reloading a profile cannot write another account response into the original account',async()=>{
 await workspaceDOM('physical','<button data-reload-observatory></button>',async(root,w)=>{
  let who='alice',resolveProfile,started;const pending=new Promise(resolve=>started=resolve);
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,request:async()=>{started();return new Promise(resolve=>resolveProfile=resolve);},storage:localStorage});
  root.querySelector('[data-reload-observatory]').click();await pending;who='bob';w.dispatchEvent(new w.CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:'bob'}}}));
  resolveProfile({data:upsertObservation(emptyObservatory(),{kind:'read',entityId:'song-b'}),revision:8});await nextTurn();
  assert.equal(loadObservatory(localStorage,'alice').data.records.length,0);
  assert.equal(loadObservatory(localStorage,'bob').data.records.length,0);
 });
});

const roomMarkup='<form data-join-room><input name="id" value="old-room"><button>Join</button></form><section data-active-room hidden><p data-room-title></p><p data-room-participants></p><form data-room-position><input name="entityId" value="song-b"><input name="kind" value="entity"><input name="section" value=""></form><button data-end-room></button><button data-leave-room></button><input type="checkbox" data-follow-host checked><div data-room-current></div></section>';
test('a join response cannot reopen a room after the account has changed',async()=>{
 await workspaceDOM('rooms',roomMarkup,async(root,w)=>{
  let who='alice',resolveJoin,started;const pending=new Promise(resolve=>started=resolve);
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,request:async()=>{started();return new Promise(resolve=>resolveJoin=resolve);},storage:localStorage});
  root.querySelector('[data-join-room]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await pending;
  who='bob';w.dispatchEvent(new w.CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:'bob'}}}));
  resolveJoin({id:'old-room',title:'Alice room',host:true,participants:['alice'],revision:1,position:{entityId:'song-a'}});await nextTurn();
  assert.equal(root.querySelector('[data-active-room]').hidden,true);
  assert.equal(root.querySelectorAll('[data-room-current] iframe').length,0);
  assert.equal(new URL(w.location.href).searchParams.has('room'),false);
 });
});

test('the first resolved account can join a room while initial authentication emits its notification',async()=>{
 await workspaceDOM('rooms',roomMarkup,async(root,w)=>{
  let notified=false;
  const owner=async()=>{if(!notified){notified=true;w.dispatchEvent(new w.CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:'alice'}}}));}return 'alice';};
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner,request:async()=>({id:'old-room',title:'Room',host:true,participants:['alice'],revision:1,position:null}),storage:localStorage});
  root.querySelector('[data-join-room]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await nextTurn();
  assert.equal(root.querySelector('[data-active-room]').hidden,false);
 });
});

test('an older presence response cannot undo the host position; closing a room releases its iframe',async()=>{
 await workspaceDOM('rooms',roomMarkup,async(root,w)=>{
  const active={id:'old-room',title:'Room',host:true,participants:['alice'],revision:1,position:{entityId:'song-a'}};
  let resolvePresence;
  const request=async(path,options)=>{
   if(path.endsWith('/join'))return active;
   if(path.endsWith('/presence'))return new Promise(resolve=>resolvePresence=resolve);
   if(path.endsWith('/position'))return {revision:2,position:{entityId:options.body.entityId}};
   if(options.method==='DELETE')return {ended:true};
   throw Error('unexpected request');
  };
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=> 'alice',request,storage:localStorage});
  root.querySelector('[data-join-room]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await nextTurn();
  w.document.dispatchEvent(new w.Event('visibilitychange'));await nextTurn();assert.equal(typeof resolvePresence,'function');
  root.querySelector('[data-room-position]').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await nextTurn();
  resolvePresence(active);await nextTurn();assert.ok(root.querySelector('[data-room-current] a').href.endsWith('/song-b/'));
  root.querySelector('[data-end-room]').click();await nextTurn();
  assert.equal(root.querySelector('[data-active-room]').hidden,true);assert.equal(root.querySelectorAll('[data-room-current] iframe').length,0);
 });
});
