import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {articleCopy} from '../src/lib/articleCopy.mjs';

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundled=await build({entryPoints:['src/lib/articleClient.ts'],platform:'browser',bundle:true,write:false,format:'iife',globalName:'ArticleClient'});

function reader({locale='zh',id='',fetchImpl}={}) {
 const copy=articleCopy(locale);
 const dom=new JSDOM(`<main data-article-page="read" data-article-api="https://api.wiki.example" data-locale="${locale}">
  <h1 data-article-title></h1><p data-article-status role="status"></p>
  <p data-article-meta></p><p data-article-summary></p><article data-article-body></article>
  <section data-article-related-panel hidden><div data-article-related></div></section>
  <details data-article-toc-panel hidden><summary>Contents</summary><nav data-article-toc></nav></details>
  <a data-article-edit hidden>Edit</a><a data-article-contribute>Contribute</a>
  <div data-share-popover hidden></div>
 </main>`,{url:`https://wiki.example/${locale}/articles/read/${id?'?id='+encodeURIComponent(id):''}`,runScripts:'outside-only'});
 const w=dom.window,root=w.document.querySelector('main'),requests=[];
 root.querySelector('[data-article-title]').textContent=copy.loading;
 w.AbortSignal=globalThis.AbortSignal;
 w.fetch=(url,options)=>{requests.push({url,options});return fetchImpl?.(url,options)??Promise.reject(Error('Unexpected fetch'));};
 w.eval(bundled.outputFiles[0].text+'\nwindow.ArticleClient=ArticleClient;');
 const init=()=>w.ArticleClient.initArticleBrowser(root);
 const title=()=>root.querySelector('[data-article-title]').textContent;
 const status=()=>root.querySelector('[data-article-status]').textContent;
 const settled=async(expected)=>{
  for(let i=0;i<5&&status()!==expected;i++)await new Promise(resolve=>setImmediate(resolve));
  assert.equal(status(),expected,'the request reaches its specific terminal status');
 };
 return {w,root,requests,copy,init,title,status,settled};
}

test('a reader without an article ID stops loading with its localized title and no request',()=>{
 for(const locale of ['zh','zh-tw','ja','en']) {
  const b=reader({locale});
  try {
   b.init();
   assert.equal(b.title(),b.copy.title);
   assert.equal(b.status(),b.copy.missing);
   assert.equal(b.requests.length,0);
  } finally {b.w.close();}
 }
});

test('an unpublished or missing article preserves the 404 explanation and never exposes article actions',async()=>{
 let reply;
 const response=new Promise(resolve=>{reply=resolve;});
 const b=reader({id:'pndr-business-model',fetchImpl:()=>response});
 try {
  b.init();
  assert.equal(b.title(),b.copy.loading,'the loading title remains while the response is pending');
  assert.equal(b.requests.length,1);
  assert.equal(b.requests[0].url,'https://api.wiki.example/api/articles/items/pndr-business-model?locale=zh');
  reply(Response.json({error:{message:'文章不存在或未公开'}},{status:404}));
  await b.settled('文章不存在或未公开');
  assert.equal(b.title(),b.copy.title);
  assert.equal(b.root.querySelector('[data-article-body]').textContent,'');
  assert.equal(b.root.querySelector('[data-article-meta]').textContent,'');
  for(const selector of ['[data-article-edit]','[data-share-popover]','[data-article-related-panel]','[data-article-toc-panel]']) {
   assert.equal(b.root.querySelector(selector).hidden,true,selector+' remains unavailable');
  }
 } finally {b.w.close();}
});

test('a rejected network request ends the loading title and retains its specific failure message',async()=>{
 const b=reader({locale:'ja',id:'network-test',fetchImpl:async()=>{throw Error('Failed to fetch');}});
 try {
  b.init();
  await b.settled('Failed to fetch');
  assert.equal(b.title(),b.copy.title);
  assert.equal(b.root.querySelector('[data-article-body]').textContent,'');
  assert.equal(b.root.querySelector('[data-share-popover]').hidden,true);
 } finally {b.w.close();}
});

test('an API failure without an explanation uses the localized service error and ends loading',async()=>{
 const b=reader({locale:'en',id:'service-test',fetchImpl:async()=>Response.json({},{status:503})});
 try {
  b.init();
  await b.settled(b.copy.unavailable);
  assert.equal(b.title(),b.copy.title);
 } finally {b.w.close();}
});

test('a refresh failure preserves the server-rendered article and offers retry',async()=>{
 const b=reader({id:'already-readable',fetchImpl:async()=>{throw Error('Offline');}});
 try{
  b.root.querySelector('[data-article-title]').textContent='Published title';
  b.root.querySelector('[data-article-body]').textContent='Published body';
  const retry=b.w.document.createElement('button');retry.dataset.articleRetry='';retry.hidden=true;b.root.append(retry);
  b.init();await b.settled('Offline');
  assert.equal(b.title(),'Published title');assert.equal(b.root.querySelector('[data-article-body]').textContent,'Published body');assert.equal(retry.hidden,false);
  retry.click();await b.settled('Offline');assert.equal(b.requests.length,2);
 }finally{b.w.close();}
});
