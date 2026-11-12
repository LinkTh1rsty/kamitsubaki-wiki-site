import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {getManualCatalog,getManualChapter,getManualSearchIndex,getManualPaths,retiredDocTargets} from '../src/lib/docsCenter.mjs';
import {supportedLocales} from '../src/lib/i18n.mjs';
import {docsCopy} from '../src/lib/docsCopy.mjs';
import {searchDocs} from '../src/lib/docsSearch.mjs';
import {documentContentDigest} from '../scripts/doc-migration-integrity.mjs';

test('all five languages publish the same ordered chapters and local search records',async()=>{
 let reference;
 for(const locale of supportedLocales){
  const books=await getManualCatalog(locale,{includeBody:true});
  const identity=books.flatMap(book=>book.chapters.map(chapter=>`${book.id}/${chapter.slug}:${chapter.order}`));
  reference??=identity;assert.deepEqual(identity,reference);
  assert.deepEqual(books.find(book=>book.id==='develop').chapters.map(chapter=>chapter.slug),['start','architecture','content','frontend','features','operations','troubleshooting']);
  const index=await getManualSearchIndex(locale);assert.equal(index.entries.length,identity.length);
  for(const entry of index.entries){assert.ok(entry.href.startsWith(`/${locale}/docs/`));assert.ok(entry.title&&entry.summary&&entry.body);assert.ok(!entry.href.includes('legacy'));}
  const guide=await getManualChapter('contribute','syntax',locale,{render:false});assert.match(guide.body,/:::speech speaker_1/);
  assert.match(guide.body,/@\[youtube\]\(3Wtx6k2vInU/,'Migration must preserve media identifiers inside examples');
  assert.doesNotMatch(guide.body,/blob\/e505ecd93\/docs\/manuals\/contribute\/syntax\//);
 }
 await assert.rejects(getManualChapter('site','start','invalid'),/Unknown manual path/);
});

test('search covers late body text and code examples, ranks titles, and excludes empty queries',async()=>{
 const index=await getManualSearchIndex('en');
 assert.ok(searchDocs(index.entries,'speech speaker').some(item=>item.href.endsWith('/contribute/syntax/')));
 assert.ok(searchDocs(index.entries,'release-build.mjs').some(item=>item.href.endsWith('/develop/operations/')));
 assert.ok(searchDocs(index.entries,'WORKSPACE_ISOLATED').some(item=>item.href.endsWith('/develop/start/')));
 assert.match(index.entries.find(item=>item.href.endsWith('/contribute/syntax/')).body,/speaker_1/);
 assert.deepEqual(searchDocs(index.entries,''),[]);assert.deepEqual(searchDocs(index.entries,'no-such-doc-60129'),[]);
 const entries=[{title:'A',summary:'',body:'Running CHECKS works',href:'/body/'},{title:'Checks',summary:'',body:'',href:'/title/'}];
 assert.equal(searchDocs(entries,'ＣＨＥＣＫＳ')[0].href,'/title/');
 assert.match(searchDocs(entries,'running')[0].snippet,/Running CHECKS/);
});

test('redirects and archival mappings point at published chapters while business data stays in place',async()=>{
 const paths=new Set((await getManualPaths()).map(item=>`${item.book}/${item.chapter}`));
 for(const target of Object.values(retiredDocTargets))assert.ok(paths.has(target),target);
 const migration=JSON.parse(await readFile('docs/migration-map.json','utf8'));
 for(const entry of migration.entries){
  assert.match(entry.sourceSha256,/^[a-f0-9]{64}$/);assert.ok(entry.archive.startsWith('docs/legacy/'));
  const archived=(await readFile(entry.archive,'utf8')).replace(/^>[^\n]*\n\n/,'');
  assert.equal(documentContentDigest(archived),entry.contentSha256,entry.archive);
  for(const target of entry.chapters)assert.ok(paths.has(target));
 }
 for(const path of ['docs/v3/reports/content-layout.json','docs/v3/reports/migration-report.json','maintenance/article-speech-conversion/manifest.json'])await readFile(path);
});

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({stdin:{contents:"import {initDocsSearch} from './src/scripts/docsSearch.js';window.start=initDocsSearch;",resolveDir:process.cwd()},bundle:true,write:false,format:'iife'});
function browser(fetcher){
 const dom=new JSDOM('<div data-docs-search data-index="/en/docs/search-index.json"><button data-docs-search-open>Search</button><dialog><button data-docs-search-close>Close</button><input><p data-docs-search-status></p><button data-docs-search-retry hidden>Retry</button><div data-docs-search-results></div></dialog></div>',{url:'http://127.0.0.1:18000/en/docs/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,host=w.document.querySelector('[data-docs-search]'),dialog=w.document.querySelector('dialog');
 host.dataset.copy=JSON.stringify(docsCopy('en'));
 dialog.showModal=()=>{dialog.open=true;};dialog.close=()=>{dialog.open=false;dialog.dispatchEvent(new w.Event('close'));};
 w.fetch=fetcher;w.eval(bundle.outputFiles[0].text);w.start();
 return {w,host,dialog,input:host.querySelector('input'),trigger:host.querySelector('[data-docs-search-open]')};
}
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
test('search loads lazily, retries a failure, supports keyboard navigation, and restores focus',async()=>{
 let requests=0;
 const b=browser(async()=>{if(++requests===1)throw Error('offline');return {ok:true,json:async()=>({entries:[{title:'<img src=x onerror=alert(1)>',summary:'S',body:'Needle in the full body',group:'Reference',href:'/en/docs/site/start/'}]})};});
 try{
  assert.equal(requests,0);b.trigger.click();await tick();assert.equal(requests,1);
  const retry=b.host.querySelector('[data-docs-search-retry]');assert.equal(retry.hidden,false);
  b.input.value='needle';retry.click();await tick();assert.equal(retry.hidden,true);
  const first=b.host.querySelector('[data-docs-search-results] a');assert.ok(first);assert.equal(first.querySelector('img'),null);
  b.input.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true}));assert.equal(b.w.document.activeElement,first);
  first.dispatchEvent(new b.w.KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));assert.equal(b.w.document.activeElement,b.input);
  b.host.querySelector('[data-docs-search-close]').click();assert.equal(b.w.document.activeElement,b.trigger);
  b.trigger.click();await tick();assert.equal(requests,2);
  b.input.value='unmatched';b.input.dispatchEvent(new b.w.Event('input'));assert.match(b.host.querySelector('[data-docs-search-status]').textContent,/No matching/);
 }finally{b.w.close();}
});
test('search rejects records outside the current documentation language',async()=>{
 const b=browser(async()=>({ok:true,json:async()=>({entries:[{title:'wrong',summary:'',body:'',group:'',href:'/zh/docs/site/start/'}]})}));
 try{b.trigger.click();await tick();assert.equal(b.host.querySelector('[data-docs-search-retry]').hidden,false);assert.equal(b.host.querySelector('[data-docs-search-results] a'),null);}finally{b.w.close();}
});
