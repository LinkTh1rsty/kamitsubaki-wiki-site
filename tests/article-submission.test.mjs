import test from 'node:test';
import assert from 'node:assert/strict';
import {initializeArticleSubmission} from '../src/scripts/articleSubmission.js';
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function setup({id='existing',storageThrows=false}={}){
 const elements=new Map(),values=new Map(),requests=[];
 const get=key=>{if(!elements.has(key))elements.set(key,{disabled:false,textContent:'',setAttribute(){},removeAttribute(){}});return elements.get(key);};
 get('[data-editor-copy]').textContent=JSON.stringify({replace:'Replace?',apply:'Apply',cancel:'Cancel'});
 const root={dataset:{contentLocale:'zh',articleApi:'https://api.example'},querySelector:get,querySelectorAll:()=>[],setAttribute(){},removeAttribute(){}};
 const original={location:globalThis.location,localStorage:globalThis.localStorage,fetch:globalThis.fetch};
 globalThis.location={href:'https://wiki.example/zh/articles/submit/'+(id?'?id='+id:'')};globalThis.localStorage={getItem:key=>values.get(key),setItem:(key,value)=>{if(storageThrows)throw Error('QuotaExceededError');values.set(key,value);}};
 globalThis.fetch=async(url,options)=>{requests.push({url,body:options.body&&JSON.parse(options.body)});return Response.json(options.method==='GET'?{permissions:{canEdit:true},article:{id:'existing',version:2,locale:'zh',body:'published'}}:{revisionId:'draft-1',id:'existing',locale:'zh'});};
 const editor={hasLocalWork:()=>true,snapshot:()=>({locale:'zh',content:{title:'Local draft',body:'Unsent changes'}}),restore(){throw Error('must preserve local draft');}};
 return {root,get,requests,editor,restore:()=>Object.assign(globalThis,original)};
}
test('recovered local edits can save a proposal against the requested public article',async()=>{
 const f=setup();try{initializeArticleSubmission(f.root,f.editor);await settle();await f.get('[data-article-save]').onclick();assert.equal(f.requests.length,2);assert.equal(f.requests[1].body.articleId,'existing');assert.equal(f.requests[1].body.baseVersion,2);assert.equal(f.requests[1].body.content.body,'Unsent changes');assert.match(f.get('[data-article-status]').textContent,/已保存/);}finally{f.restore();}
});
test('unavailable browser storage does not turn a successful cloud save into a failure',async()=>{
 const f=setup({id:'',storageThrows:true});try{initializeArticleSubmission(f.root,f.editor);await settle();await f.get('[data-article-save]').onclick();assert.equal(f.requests.length,1);assert.match(f.get('[data-article-status]').textContent,/已保存/);}finally{f.restore();}
});
test('new articles leave the previous proposal state intact and receive an independent draft URL',async()=>{
 const f=setup({id:''});
 try{initializeArticleSubmission(f.root,f.editor,'guest',{confirm:async()=>true});await settle();await f.get('[data-article-new]').onclick();const url=new URL(globalThis.location.href);assert.ok(url.searchParams.get('draft'));assert.equal(url.searchParams.has('id'),false);}finally{f.restore();}
});

test('a failed existing article load cannot accidentally create a new document',async()=>{
 const f=setup();try{globalThis.fetch=async()=>{f.requests.push({});return Response.json({error:{message:'Unavailable'}},{status:503});};initializeArticleSubmission(f.root,f.editor);await settle();await f.get('[data-article-save]').onclick();assert.equal(f.requests.length,1);assert.match(f.get('[data-article-status]').textContent,/先从我的提案/);}finally{f.restore();}
});

test('new-article confirmation keeps the current draft until accepted and cancels on dismissal',async()=>{
 const f=setup({id:''});let answer;
 try{initializeArticleSubmission(f.root,f.editor,'guest',{confirm:()=>new Promise(resolve=>{answer=resolve;})});await settle();
 const before=globalThis.location.href,pending=f.get('[data-article-new]').onclick();
 assert.equal(globalThis.location.href,before);answer(false);await pending;assert.equal(globalThis.location.href,before);
 }finally{f.restore();}
});
test('an explicit save retries a repaired media-state 409 without bypassing CAS choices',async()=>{const f=setup({id:''});let attempt=0;try{globalThis.fetch=async(url,options)=>{f.requests.push({url,body:options.body&&JSON.parse(options.body)});if(++attempt===1)return Response.json({error:{message:'Image must be staged again'}},{status:409});return Response.json({revisionId:'draft-1',id:'article-1',locale:'zh',draftVersion:1,fingerprint:'current'});};initializeArticleSubmission(f.root,f.editor,'alice');await settle();await f.get('[data-article-save]').onclick();assert.equal(attempt,1);await f.get('[data-article-save]').onclick();assert.equal(attempt,2);assert.match(f.get('[data-article-status]').textContent,/已保存/);}finally{f.restore();}});
