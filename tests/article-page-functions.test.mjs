import test from 'node:test';
import assert from 'node:assert/strict';
import {renderArticlePage,articleSitemap} from '../functions/_shared/articlePage.mjs';
import {onRequestGet as redirectLegacy} from '../functions/[locale]/articles/read/index.js';
import {articleHTML} from '../src/lib/articleMarkdownRenderer.mjs';

const shell='<!doctype html><html><head><title>Loading</title><meta name="description" content="old"><meta name="robots" content="noindex"><link rel="canonical" href="https://kamitsubaki.wiki/zh/articles/read/"><meta property="og:type" content="website"><meta property="og:title" content="old"><meta property="og:description" content="old"><meta property="og:url" content="old"><meta name="twitter:title" content="old"><meta name="twitter:description" content="old"><script type="application/ld+json">{}</script></head><body><main data-article-page="read"><h1 data-article-title>Loading</h1><p data-article-meta></p><p data-article-summary></p><article class="wiki-reader" data-article-body></article></main></body></html>';
const env={ASSETS:{fetch:async()=>new Response(shell,{headers:{'Content-Type':'text/html'}})}};
test('server articles share the client renderer and replacement-like text stays literal',async()=>{
 const original=globalThis.fetch,body='表格：\n\n| **列** | 值 |\n| --- | --- |\n| {{ruby::花譜::かふ}} | $x^2$ |\n\n字面 $&、$`、$\'、$1。';
 globalThis.fetch=async()=>Response.json({article:{id:'safe-id',title:'标题 $& $1',summary:'简介 $`',body,version:1}});
 try{const response=await renderArticlePage({request:new Request('https://kamitsubaki.wiki/zh/articles/read/safe-id/'),env,params:{locale:'zh',id:'safe-id'}}),html=await response.text();assert.equal(response.status,200);assert.ok(html.includes('<h1 data-article-title>标题 $&amp; $1</h1>'));assert.ok(html.includes(articleHTML(body)));assert.equal((html.match(/<article\b/g)||[]).length,1);}finally{globalThis.fetch=original;}
});

test('dynamic article HTML is readable without JS and escapes unsafe content',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({article:{id:'safe-id',title:'A <unsafe> title',summary:'Summary & more',body:'## Read this\n\nA **complete** article.\n\n<script>alert(1)</script>',author:'Someone',updatedAt:'2026-10-02',version:1,origin:'user-submission'}});
 try{
  const response=await renderArticlePage({request:new Request('https://kamitsubaki.wiki/zh/articles/read/safe-id/'),env,params:{locale:'zh',id:'safe-id'}});
  assert.equal(response.status,200);const html=await response.text();
  assert.match(html,/<h1 data-article-title>A &lt;unsafe&gt; title<\/h1>/);
  assert.match(html,/<h2>Read this<\/h2>/);
  assert.match(html,/<strong>complete<\/strong>/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
  assert.match(html,/data-article-id="safe-id"/);
  assert.match(html,/rel="canonical" href="https:\/\/kamitsubaki\.wiki\/zh\/articles\/read\/safe-id\/"/);
  assert.match(html,/content="index, follow, max-image-preview:large"/);
 }finally{globalThis.fetch=original;}
});

test('hidden articles stay 404 and old query links redirect',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('Not found',{status:404});
 try{
  assert.equal((await renderArticlePage({request:new Request('https://kamitsubaki.wiki/en/articles/read/hidden/'),env,params:{locale:'en',id:'hidden'}})).status,404);
  const response=await redirectLegacy({request:new Request('https://kamitsubaki.wiki/en/articles/read/?id=safe-id'),env,params:{locale:'en'}});
  assert.equal(response.status,301);assert.equal(response.headers.get('location'),'https://kamitsubaki.wiki/en/articles/read/safe-id/');
 }finally{globalThis.fetch=original;}
});

test('dynamic sitemap includes only public API rows and Chinese locale variants',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({items:[{id:'one',locale:'zh',updatedAt:'2026-10-02 00:00:00'},{id:'two',locale:'ja',updatedAt:'2026-10-01 00:00:00'}],nextOffset:null});
 try{const response=await articleSitemap({env});assert.equal(response.status,200);const xml=await response.text();assert.match(xml,/\/zh\/articles\/read\/one\//);assert.match(xml,/\/zh-tw\/articles\/read\/one\//);assert.match(xml,/\/zh-hk\/articles\/read\/one\//);assert.match(xml,/\/ja\/articles\/read\/two\//);assert.doesNotMatch(xml,/\/en\/articles\/read\/two\//);}
 finally{globalThis.fetch=original;}
});

test('server first paint includes the same category and avatar metadata as the client',async()=>{
 const {articleMetaHTML}=await import('../src/lib/articleReaderPresentation.mjs');
 const original=globalThis.fetch;
 const article={id:'safe-id',title:'对谈',summary:'简介',body:'正文',author:'署名',authorAvatarUrl:'https://wiki.example/avatar.png',category:'profile',origin:'user-submission',publishedAt:'2026-11-03',updatedAt:'2026-11-04',version:1};
 globalThis.fetch=async()=>Response.json({article});
 try{
  const response=await renderArticlePage({request:new Request('https://kamitsubaki.wiki/zh/articles/read/safe-id/'),env:{ASSETS:{fetch:async()=>new Response(shell.replace('<p data-article-meta></p>','<div data-article-meta></div>'))}},params:{locale:'zh',id:'safe-id'}});
  const html=await response.text();assert.ok(html.includes(articleMetaHTML(article,'zh')));assert.match(html,/data-article-avatar/);assert.match(html,/人物专访/);
 }finally{globalThis.fetch=original;}
});
