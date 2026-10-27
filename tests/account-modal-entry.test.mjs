import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const original=await readFile('src/scripts/accountStore.js','utf8');
const remote='import(/* @vite-ignore */ `${apiBase}/auth/client/v1.mjs?ui=modal-1`)';assert.ok(original.includes(remote));
// Supply the remote module at the loading boundary; execute the real site glue.
const bundle=await build({stdin:{contents:original.replace(remote,'Promise.resolve(globalThis.centralTestModule)'),resolveDir:fileURLToPath(new URL('../src/scripts/',import.meta.url))},bundle:true,write:false,format:'iife',globalName:'AccountGlue',platform:'browser',define:{'import.meta.env.PUBLIC_EDITOR_ENABLED':'"false"','import.meta.env.PUBLIC_EDITOR_LOCAL':'"false"','import.meta.env.PUBLIC_EDITOR_API_BASE':'""','import.meta.env.DEV':'false'}});
const tick=()=>new Promise(resolve=>setTimeout(resolve,15));
test('Wiki header, account, AI and creator entry open the shared form without losing the current page or draft',async()=>{
 const calls=[],before='https://wiki-auth-preview.kamitsubaki.wiki/ja/chronicle/submit/?draft=A%20B&source=a%2fb#editor';
 const dom=new JSDOM('<div data-account-config data-locale="ja" data-api-base="https://auth-preview.kamitsubaki.wiki" data-copy="{}"></div><a data-account-nav href="/ja/account/">Account</a><button data-account-login>Login</button><a data-ai-oauth>AI login</a><a data-creator-login>Creator login</a><textarea>Unsaved content</textarea><dialog data-account-dialog></dialog>',{url:before,runScripts:'outside-only'});
 try{const w=dom.window;w.AbortSignal=AbortSignal;w.document.documentElement.dataset.theme='dark';w.centralTestModule={createAccountAuthClient:()=>({refresh:async()=>null,subscribe:()=>()=>{},openSignIn:options=>{calls.push(options);return true;}})};w.eval(bundle.outputFiles[0].text);await tick();
  for(const selector of ['[data-account-nav]','[data-account-login]','[data-ai-oauth]','[data-creator-login]']){const trigger=w.document.querySelector(selector);trigger.dispatchEvent(new w.MouseEvent('click',{button:0,bubbles:true,cancelable:true}));await tick();assert.equal(calls.at(-1).trigger,trigger);assert.equal(calls.at(-1).returnTo,before);assert.equal(calls.at(-1).theme,'dark');assert.equal(w.location.href,before);assert.equal(w.document.querySelector('textarea').value,'Unsaved content');assert.equal(w.document.querySelector('dialog').open,false);}
  assert.equal(calls.length,4);
 }finally{dom.window.close();}
});

test('unchanged account refreshes reuse the library but changes and five-minute reconciliation still read it',async()=>{
 const dom=new JSDOM('<div data-account-config data-locale="zh" data-api-base="https://api.example" data-copy="{}"></div>',{url:'https://wiki.example/zh/account/',runScripts:'outside-only'});
 try{const w=dom.window;w.AbortSignal=AbortSignal;let userId='alice',reads=0;
 w.centralTestModule={createAccountAuthClient:()=>({refresh:async()=>({kind:'user',userId}),subscribe:()=>()=>{}})};
 w.fetch=async url=>{assert.equal(new URL(url).pathname,'/api/account/library');reads++;return new Response(JSON.stringify({library:{version:1,items:[],lists:[]},revision:1}),{headers:{'Content-Type':'application/json'}});};
 w.eval(bundle.outputFiles[0].text);await tick();await tick();assert.equal(reads,1);
 for(let n=0;n<10;n++){await w.AccountGlue.refreshAuth(true);await tick();}assert.equal(reads,1);
 const originalNow=w.Date.now;w.Date.now=()=>originalNow()+300001;await w.AccountGlue.refreshAuth(true);await tick();assert.equal(reads,2);w.Date.now=originalNow;
 userId='bob';await w.AccountGlue.refreshAuth(true);await tick();assert.equal(reads,3);assert.equal(w.AccountGlue.state.viewer.userId,'bob');
 }finally{dom.window.close();}
});
