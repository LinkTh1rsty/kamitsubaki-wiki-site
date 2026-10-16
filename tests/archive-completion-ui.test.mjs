import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializeCollectionTools} from '../src/scripts/archiveCollectionTools.js';
import {initializeArchiveOpenData} from '../src/scripts/archiveOpenData.js';
import {initializeArchiveWorkspace} from '../src/scripts/archiveWorkspace.js';
import {archiveCompletionCopy} from '../src/lib/archiveCompletionCopy.mjs';
import {archiveFeatureCopy} from '../src/lib/archiveFeatureCopy.mjs';
import {readCollectionDrafts,exportCollectionEditor} from '../src/lib/archiveCollectionDrafts.mjs';
import {archiveDigest} from '../src/lib/archiveSnapshot.mjs';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {emptyObservatory,saveObservatory} from '../src/lib/archivePersonal.mjs';
const turn=()=>new Promise(resolve=>setTimeout(resolve,10));
async function waitUntil(condition){
 for(let attempt=0;attempt<200;attempt++){if(condition())return;await turn();}
 assert.ok(condition(),'Asynchronous snapshot verification did not finish');
}
async function domTest(markup,run){
 const dom=new JSDOM(markup,{url:'https://wiki.test/zh/explore/collections/',pretendToBeVisual:true}),keys=['window','document','location','history','localStorage','Event','CustomEvent','FormData','matchMedia'];
 const previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{value:key==='matchMedia'?()=>({matches:true}):dom.window[key],configurable:true,writable:true});
 dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 try{await run(document.querySelector('section'),dom.window);}finally{dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));dom.window.close();for(const [key,value]of previous)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];}
}
const editor='<section><p data-archive-status></p><form data-collection-form><input name="id"/><input name="title" value="Private"/><textarea name="description"></textarea><select name="kind"><option value="collection">Collection</option></select><input name="revision" value="0"/><textarea name="items">song-a\n\nsong-b</textarea><textarea name="notes">A\nblank line\nB</textarea></form><div data-device-drafts></div><input type="file" data-import-collection/><aside hidden tabindex="-1" data-collection-preview></aside></section>';
const findButton=(root,label)=>[...root.querySelectorAll('button')].find(button=>button.textContent===label);
test('chapter controls preserve notes, restore reading progress and isolate device drafts by owner',async()=>{
 await domTest(editor,async(root)=>{
  let who='alice',options;const errors=[],c=archiveCompletionCopy('zh');
  const tools=await initializeCollectionTools(root,{snapshot:archiveFixture(),locale:'zh',owner:async()=>who,storage:localStorage,onOpen:()=>{},onError:error=>errors.push(error.message),loadSortable:async()=>({default:class{constructor(_node,value){options=value;}destroy(){}}})});
  findButton(root,c.deviceDraft).click();await turn();assert.equal(readCollectionDrafts(localStorage,'alice').length,1);
  root.querySelectorAll('[data-collection-chapters] li')[1].querySelectorAll('button')[1].click();await turn();
  assert.equal(root.querySelector('[name=items]').value,'song-b\nsong-a');assert.equal(root.querySelector('[name=notes]').value,'B\nA');
  const chapters=root.querySelector('[data-collection-chapters]');options.onStart();chapters.prepend(chapters.lastElementChild);options.onEnd();await turn();
  assert.equal(root.querySelector('[name=items]').value,'song-a\nsong-b');assert.equal(root.querySelector('[name=notes]').value,'A\nB');
  findButton(root,c.preview).click();await turn();const panel=root.querySelector('[data-collection-preview]');assert.match(panel.textContent,/song-a/);
  findButton(panel,c.next).click();await turn();findButton(panel,c.read).click();await turn();findButton(panel,c.close).click();findButton(root,c.preview).click();await turn();
  assert.match(panel.textContent,/song-b/);assert.ok(findButton(panel,'✓ '+c.read));
  options.onStart();who='bob';await tools.changeOwner();options.onEnd();await turn();assert.equal(panel.hidden,true);assert.ok(!root.querySelector('[data-device-drafts]').textContent.includes('Private'));assert.equal(readCollectionDrafts(localStorage,'bob').length,0);assert.deepEqual(errors,[]);
 });
});
test('a collection import interrupted by logout and login cannot restore private text after an ABA owner change',async()=>{
 await domTest(editor,async(root)=>{
  let who='alice',release;const c=archiveCompletionCopy('zh');
  const tools=await initializeCollectionTools(root,{snapshot:archiveFixture(),locale:'zh',owner:async()=>who,storage:localStorage,onOpen:()=>{},loadSortable:async()=>({default:class{destroy(){}}})});
  const incoming=exportCollectionEditor({title:'import secret',items:'song-a',notes:'private'}),input=root.querySelector('[data-import-collection]');
  Object.defineProperty(input,'files',{value:[{size:100,text:()=>new Promise(resolve=>release=resolve)}]});input.dispatchEvent(new Event('change'));await turn();
  who=null;await tools.changeOwner();who='alice';await tools.changeOwner();release(JSON.stringify(incoming));await turn();
  assert.equal(root.querySelector('[name=title]').value,'Private');assert.equal(readCollectionDrafts(localStorage,'alice').length,0);assert.equal(root.querySelector('[data-archive-status]').textContent,'');assert.ok(findButton(root,c.deviceDraft));
 });
});

test('an exported draft containing the permitted full Chinese note text can be imported without truncation',async()=>{
 await domTest(editor,async(root)=>{
  const errors=[],incoming=exportCollectionEditor({title:'长笔记',items:'song-a',notes:'私'.repeat(40000)}),text=JSON.stringify(incoming);assert.ok(new TextEncoder().encode(text).length>100000);
  await initializeCollectionTools(root,{snapshot:archiveFixture(),locale:'zh',owner:async()=>null,storage:localStorage,onOpen:()=>{},onError:error=>errors.push(error.message),loadSortable:async()=>({default:class{destroy(){}}})});
  const input=root.querySelector('[data-import-collection]');Object.defineProperty(input,'files',{value:[{size:new TextEncoder().encode(text).length,text:async()=>text}]});input.dispatchEvent(new Event('change'));await turn();assert.equal(root.querySelector('[name=notes]').value,'私'.repeat(40000));assert.deepEqual(errors,[]);
 });
});
test('Open Data verifies each historical snapshot and disables export when its content is tampered',async()=>{
 const fixture=archiveFixture();delete fixture.snapshot;fixture.snapshot=archiveDigest(fixture);const old=structuredClone(fixture);old.entities[0].date='2017';delete old.snapshot;old.snapshot=archiveDigest(old);const malformed=structuredClone(old);delete malformed.snapshot;malformed.relations={};malformed.snapshot=archiveDigest(malformed);
 const previousFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({snapshots:[{hash:old.snapshot}]});
 try{await domTest('<section><select data-data-snapshot><option value="'+fixture.snapshot+'">current</option></select><select data-data-resource><option value="entities">entities</option><option value="relations">relations</option></select><p data-data-status></p><button data-data-verify></button><button data-data-download="json"></button><pre data-data-preview></pre><pre data-data-citation></pre></section>',async root=>{
  let tampered=false;await initializeArchiveOpenData(root,{snapshot:fixture,copy:archiveCompletionCopy('zh'),load:async()=>tampered==='shape'?malformed:tampered?{...old,entities:[]}:old});await turn();
  const select=root.querySelector('select'),download=root.querySelector('[data-data-download]');await waitUntil(()=>!download.disabled);assert.equal(download.disabled,false);
  select.value=old.snapshot;select.dispatchEvent(new Event('change'));await waitUntil(()=>!download.disabled);assert.equal(download.disabled,false);assert.match(root.querySelector('[data-data-preview]').textContent,/2017/);
  tampered=true;root.querySelector('[data-data-verify]').click();await waitUntil(()=>/不一致/.test(root.querySelector('[data-data-status]').textContent));assert.equal(download.disabled,true);assert.equal(root.querySelector('[data-data-preview]').textContent,'');assert.match(root.querySelector('[data-data-status]').textContent,/不一致/);
  tampered='shape';select.append(new window.Option('Invalid shape',malformed.snapshot));select.value=malformed.snapshot;root.querySelector('[data-data-resource]').value='relations';select.dispatchEvent(new Event('change'));await waitUntil(()=>/不一致/.test(root.querySelector('[data-data-status]').textContent));assert.equal(download.disabled,true);assert.equal(root.querySelector('[data-data-preview]').textContent,'');
 });}finally{globalThis.fetch=previousFetch;}
});
test('public snapshot loading caches by URL and retries failed historical loads',async()=>{
 const {loadArchiveSnapshot}=await import('../src/lib/archiveClient.mjs?completion-cache');const previousFetch=globalThis.fetch;let calls=0,fail=true;
 globalThis.fetch=async url=>{calls++;if(url==='old' && fail)return new Response('',{status:503});return Response.json({...archiveFixture(),snapshot:url});};
 try{assert.equal((await loadArchiveSnapshot('current')).snapshot,'current');assert.equal((await loadArchiveSnapshot('current')).snapshot,'current');assert.equal(calls,1);await assert.rejects(loadArchiveSnapshot('old'));fail=false;assert.equal((await loadArchiveSnapshot('old')).snapshot,'old');assert.equal(calls,3);}finally{globalThis.fetch=previousFetch;}
});
test('live comparison restores shared IDs on load and clears the matrix when history removes them',async()=>{
 await domTest('<section data-module="live-mode"><script data-archive-copy></script><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail></aside><form data-setlist-compare><textarea name="lives"></textarea><button>Compare</button></form><div data-setlist-comparison></div></section>',async(root,w)=>{
  history.replaceState({},'', '/zh/explore/live-mode/?lives=live-a,live-b');root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>null});
  assert.equal(root.querySelector('[name=lives]').value,'live-a\nlive-b');assert.match(root.querySelector('[data-setlist-comparison]').textContent,/song-a/);
  history.replaceState({},'', '/zh/explore/live-mode/');w.dispatchEvent(new w.PopStateEvent('popstate'));await turn();assert.equal(root.querySelector('[data-setlist-comparison]').textContent,'');assert.equal(root.querySelector('[name=lives]').value,'');
 });
});

test('logout removes a private pilgrimage and a delayed owner read cannot restore it',async()=>{
 await domTest('<section data-module="atlas"><script data-archive-copy></script><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail></aside><div data-atlas-map></div><ol data-pilgrimage-route></ol><a data-route-directions></a></section>',async(root,w)=>{
  let who='alice',block=false,release;const pending=new Promise(resolve=>release=resolve),snapshot=archiveFixture();snapshot.entities.find(row=>row.id==='live-a').facts.venue={name:'Hall',isVirtual:false};
  saveObservatory(localStorage,'alice',{...emptyObservatory(),routes:[{id:'pilgrimage',places:['venue:live-a']}]});root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));
  const app=await initializeArchiveWorkspace(root,{loadSnapshot:async()=>snapshot,storage:localStorage,owner:async()=>{const original=who;if(block)await pending;return original;}});await turn();assert.match(root.querySelector('[data-pilgrimage-route]').textContent,/Hall/);
  block=true;await app.render();who=null;block=false;w.dispatchEvent(new w.CustomEvent('kamitsubaki-account-state',{detail:{viewer:null}}));await turn();release();await turn();assert.equal(root.querySelector('[data-pilgrimage-route]').textContent,'');assert.equal(root.querySelector('[data-route-directions]').hidden,true);
 });
});
