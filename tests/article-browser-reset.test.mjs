import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({entryPoints:['src/lib/articleClient.ts'],bundle:true,write:false,format:'iife',globalName:'ArticleClient'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<100&&!check();i++)await sleep(10);assert.ok(check(),'article state did not settle');}
function browser(){
 const dom=new JSDOM(`<main data-locale="en"><a data-article-write></a><span data-related-filter><span data-related-name></span><button data-related-clear></button></span><form><input name="q"><select name="category"><option value="">All</option><option value="interview">Interview</option></select><select name="origin"><option value="">All</option><option value="official">Official</option></select><select name="sort"><option value="newest">Newest</option><option value="oldest">Oldest</option></select><button type="reset">Clear</button></form><p data-article-status></p><div data-article-state></div><a data-article-empty-write></a><button data-article-retry></button><button data-article-previous></button><div data-article-grid></div><button data-article-more></button></main>`,{url:'https://wiki.example/en/articles/?q=missing&category=interview&origin=official&sort=oldest&offset=24',runScripts:'outside-only'});
 const w=dom.window,root=w.document.querySelector('main'),calls=[];w.AbortSignal=AbortSignal;w.AbortController=AbortController;
 w.fetch=async url=>{const q=new URL(url,w.location).searchParams;calls.push(q);return Response.json({items:q.get('q')?[]:[{id:'one',title:'Article',summary:'Summary',category:'interview',origin:'official',author:'Fixture',updatedAt:'2026-10-25'}],nextOffset:null});};
 w.eval(bundle.outputFiles[0].text+';window.ArticleClient=ArticleClient');w.ArticleClient.initArticleBrowser(root);
 return {w,root,calls,form:root.querySelector('form')};
}
test('clearing filters waits for the native reset default action before reading form data',async()=>{
 const b=browser();try{
  await until(()=>b.root.querySelector('[data-article-state]').dataset.state==='empty');
  // A trusted browser event can checkpoint microtasks before the native reset.
  // Model that order explicitly: jsdom form.reset alone does not reproduce it.
  const event=new b.w.Event('reset',{bubbles:true,cancelable:true});b.form.dispatchEvent(event);await Promise.resolve();
  assert.equal(b.calls.length,1,'must not read the old form during the reset event microtask');
  for(const control of b.form.querySelectorAll('input,select'))control.value=control.name==='sort'?'newest':'';
  await until(()=>b.root.querySelector('[data-article-state]').dataset.state==='ready');
  assert.equal(b.root.querySelectorAll('.article-list-card').length,1);assert.equal(b.w.location.search,'');
  assert.equal(b.calls.at(-1).get('q'),'');assert.equal(b.calls.at(-1).get('offset'),'0');
  b.form.elements.q.value='missing';b.form.dispatchEvent(new b.w.Event('submit',{bubbles:true,cancelable:true}));await until(()=>b.root.querySelector('[data-article-state]').dataset.state==='empty');
  b.form.reset();await until(()=>b.root.querySelector('[data-article-state]').dataset.state==='ready');assert.equal(b.w.location.search,'');
 }finally{b.w.close();}
});
test('a canceled native reset preserves the current query and result',async()=>{
 const b=browser();try{await until(()=>b.root.querySelector('[data-article-state]').dataset.state==='empty');b.form.addEventListener('reset',event=>event.preventDefault());b.form.reset();await sleep(30);assert.equal(b.calls.length,1);assert.equal(b.form.elements.q.value,'missing');assert.match(b.w.location.search,/q=missing/);}finally{b.w.close();}
});
