import assert from 'node:assert/strict';
import test from 'node:test';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {JSDOM} from 'jsdom';
import {reviewCopy} from '../src/lib/reviewCopy.mjs';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({entryPoints:[resolve('src/scripts/ownReview.js')],bundle:true,write:false,format:'iife',plugins:[{name:'account-fixture',setup(b){
 b.onResolve({filter:/accountStore\.js$/},()=>({path:'account',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:'export const state=window.account;export async function refreshAuth(){return state.viewer;}'}));
}}]});
const pause=()=>new Promise(resolve=>setTimeout(resolve,10));
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await pause();}assert.ok(fn(),'state did not settle');}
function setup(handler=()=>null){
 const dom=new JSDOM('<main data-own-review data-api="https://api.example" data-locale="zh"><button data-review-reload>重新读取</button><p data-review-status></p><div data-review-content></div></main>',{url:'https://wiki.example/zh/contribute/review/?id=articles:test',runScripts:'outside-only'});
 const w=dom.window,copy=reviewCopy('zh'),calls=[];
 w.document.querySelector('main').dataset.copy=JSON.stringify(copy);w.account={viewer:{userId:'alice'}};w.AbortSignal=AbortSignal;
 const data={request:{id:'articles:test',kind:'articles',title:'Article',status:'pending'},editor:{resourceId:'test'},events:[],revisions:[],threads:['one','two'].map(id=>({id,messages:[{actor_name:'Reviewer',body:id}]}))};
 w.fetch=async(url,options={})=>{const path=new URL(url).pathname,body=options.body&&JSON.parse(options.body);calls.push({path,body});return await handler({path,body,data})||Response.json({data:path.endsWith('/seen')||path.endsWith('/messages')?{}:data});};
 const start=()=>w.eval(bundle.outputFiles[0].text);
 const type=(index,value)=>{const input=w.document.querySelectorAll('textarea')[index];input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const send=index=>w.document.querySelectorAll('form')[index].dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
 return {w,copy,calls,start,type,send,close:()=>w.close()};
}
test('sending one reply preserves drafts in other threads and typing during the request',async()=>{
 let resolveWrite;
 const q=setup(({path})=>path.endsWith('/messages')?new Promise(r=>{resolveWrite=r;}):null);
 try{q.start();await until(()=>q.w.document.querySelectorAll('textarea').length===2);q.type(0,'Sent reply');q.type(1,'Other unsent reply');q.send(0);await until(()=>resolveWrite);q.type(0,'Next unsent reply');resolveWrite(Response.json({data:{}}));await until(()=>!q.w.document.querySelector('[data-review-reload]').disabled);assert.deepEqual([...q.w.document.querySelectorAll('textarea')].map(n=>n.value),['Next unsent reply','Other unsent reply']);}finally{q.close();}
});
test('a late reply failure cannot overwrite the next account status or reveal previous drafts',async()=>{
 let resolveWrite;
 const q=setup(({path})=>path.endsWith('/messages')?new Promise(r=>{resolveWrite=r;}):null);
 try{q.start();await until(()=>q.w.document.querySelector('textarea'));q.type(0,'Alice private draft');q.send(0);await until(()=>resolveWrite);q.w.account.viewer={userId:'bob'};q.w.dispatchEvent(new q.w.Event('kamitsubaki-account-state'));resolveWrite(Response.json({error:{message:'old account error'}},{status:503}));await pause();await pause();assert.equal(q.w.document.querySelector('[data-review-status]').textContent,q.copy.change);assert.ok(!q.w.document.querySelector('[data-review-content]').textContent.includes('Alice'));assert.equal(q.w.document.querySelector('textarea'),null);}finally{q.close();}
});
test('an unchanged retry reuses its operation while edited content receives a new operation',async()=>{
 const q=setup(({path})=>path.endsWith('/messages')?Response.json({error:{message:'Temporary error'}},{status:503}):null);
 try{q.start();await until(()=>q.w.document.querySelector('textarea'));q.type(0,'First attempt');q.send(0);await until(()=>!q.w.document.querySelector('[data-review-reload]').disabled);q.send(0);await until(()=>!q.w.document.querySelector('[data-review-reload]').disabled);q.type(0,'Changed reply');q.send(0);await until(()=>!q.w.document.querySelector('[data-review-reload]').disabled);const writes=q.calls.filter(c=>c.path.endsWith('/messages'));assert.equal(writes.length,3);assert.equal(writes[0].body.operationId,writes[1].body.operationId);assert.notEqual(writes[1].body.operationId,writes[2].body.operationId);}finally{q.close();}
});
test('GitHub review states have localized labels in every supported language',()=>{
 for(const locale of ['zh','en','ja','zh-tw','zh-hk'])for(const state of ['open','changes','closed','merged','published','failed','paused','conflict'])assert.ok(reviewCopy(locale).states[state],`${locale}: ${state}`);
});
test('successful send with failed readback keeps other drafts and reports that the reply was saved',async()=>{
 let sent=false;
 const q=setup(({path})=>{if(path.endsWith('/messages')){sent=true;return Response.json({data:{}});}if(sent&&!path.endsWith('/seen'))return new Response('<html>upstream unavailable</html>',{status:503,headers:{'Content-Type':'text/html'}});return null;});
 try{q.start();await until(()=>q.w.document.querySelectorAll('textarea').length===2);q.type(0,'Sent reply');q.type(1,'Retain other draft');q.send(0);await until(()=>!q.w.document.querySelector('[data-review-reload]').disabled);assert.deepEqual([...q.w.document.querySelectorAll('textarea')].map(n=>n.value),['','Retain other draft']);assert.ok(q.w.document.querySelector('[data-review-status]').textContent.includes(q.copy.saved));assert.ok(q.w.document.querySelector('[data-review-status]').textContent.includes(q.copy.failure));}finally{q.close();}
});
