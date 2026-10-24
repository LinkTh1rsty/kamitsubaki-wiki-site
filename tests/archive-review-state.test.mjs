import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {initializeCollectionTools} from '../src/scripts/archiveCollectionTools.js';
import {initializeArchiveWorkspace} from '../src/scripts/archiveWorkspace.js';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {archiveFeatureCopy} from '../src/lib/archiveFeatureCopy.mjs';
import {archiveCompletionCopy} from '../src/lib/archiveCompletionCopy.mjs';
import {readCollectionDrafts,saveCollectionDraft,collectionDraftKey,exportCollectionEditor,collectionEditorItems,collectionPresentation,validateCollectionEditor} from '../src/lib/archiveCollectionDrafts.mjs';
import {emptyObservatory,loadObservatory} from '../src/lib/archivePersonal.mjs';
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
async function domTest(module,markup,run){
 const dom=new JSDOM(`<section data-module="${module}" data-locale="zh"><script data-archive-copy></script><p data-archive-status></p><div data-archive-results></div><button data-archive-more></button><aside data-archive-detail hidden></aside>${markup}</section>`,{url:`https://wiki.test/zh/explore/${module}/`,pretendToBeVisual:true});
 const keys=['window','document','location','history','localStorage','Event','CustomEvent','FormData','matchMedia'],previous=new Map(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 for(const key of keys)Object.defineProperty(globalThis,key,{value:key==='matchMedia'?()=>({matches:true}):dom.window[key],configurable:true,writable:true});dom.window.HTMLElement.prototype.scrollIntoView=()=>{};
 const root=document.querySelector('section');root.querySelector('[data-archive-copy]').textContent=JSON.stringify(archiveFeatureCopy('zh'));
 try{await run(root,dom.window);}finally{dom.window.dispatchEvent(new dom.window.PageTransitionEvent('pagehide'));dom.window.close();for(const [key,value]of previous)value?Object.defineProperty(globalThis,key,value):delete globalThis[key];}
}
const editor='<form data-collection-form><input name="id"/><input name="title"/><textarea name="description"></textarea><select name="kind"><option value="collection">Collection</option></select><input name="revision" value="0"/><textarea name="items">song-a\nsong-b</textarea><textarea name="notes">A\nB</textarea><button value="draft">Server save</button></form>';
const toolsMarkup=editor+'<div data-device-drafts></div><input type="file" data-import-collection/><aside hidden tabindex="-1" data-collection-preview></aside>';
const c=archiveCompletionCopy('zh'),button=(root,text)=>[...root.querySelectorAll('button')].find(node=>node.textContent===text);
const initializeTools=(root,owner)=>initializeCollectionTools(root,{snapshot:archiveFixture(),locale:'zh',storage:localStorage,owner,onOpen:()=>{},loadSortable:async()=>({default:class{destroy(){}}})});

test('saving and reopening a collection preserves 21 full-length notes and keeps the editor usable',async()=>{
 await domTest('collections',toolsMarkup+'<div data-community-collections></div>',async root=>{
  const snapshot=archiveFixture(),prototype=snapshot.entities.find(row=>row.id==='song-a');for(let index=0;index<21;index++)snapshot.entities.push({...structuredClone(prototype),id:'chapter-'+index});
  let saved;const request=async(path,options)=>{
   if(options?.method){saved={...options.body,id:'remote-collection',revision:(saved?.revision || 0)+1,status:'draft'};return {collection:saved};}
   return path==='me'?{collections:saved?[saved]:[],follows:[]}:{collections:[]};
  };
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>snapshot,owner:async()=>'alice',request,storage:localStorage});
  const form=root.querySelector('form'),note='首行\n'+'字'.repeat(1997);assert.equal(note.length,2000);
  form.elements.items.value=Array.from({length:21},(_,index)=>'chapter-'+index).join('\n');form.elements.items.dispatchEvent(new Event('input',{bubbles:true}));
  for(const field of root.querySelectorAll('[data-chapter-note]')){field.value=note;field.dispatchEvent(new Event('input',{bubbles:true}));}
  form.elements.title.value='长笔记';form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();
  assert.equal(saved.items.length,21);assert.ok(saved.items.every(item=>item.note===note));
  assert.doesNotThrow(()=>validateCollectionEditor(Object.fromEntries(new FormData(form))));
  button(root.querySelector('[data-community-collections]'),archiveFeatureCopy('zh').edit).click();
  assert.deepEqual(collectionEditorItems(Object.fromEntries(new FormData(form))),saved.items);
  const raw=form.elements.notes,lines=raw.value.split('\n');lines[20]='只修改最后一章';raw.value=lines.join('\n');raw.dispatchEvent(new Event('input',{bubbles:true}));
  button(form,c.deviceDraft).click();await tick();const draft=readCollectionDrafts(localStorage,'alice')[0],items=collectionEditorItems(draft.editor);
  assert.ok(items.slice(0,20).every(item=>item.note===note));assert.equal(items[20].note,'只修改最后一章');
  form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await tick();assert.deepEqual(saved.items,items);assert.doesNotThrow(()=>validateCollectionEditor(Object.fromEntries(new FormData(form))));
 });
});

test('opening another draft closes the old preview and preserves each draft reading progress',async()=>{
 await domTest('collections',toolsMarkup,async root=>{
  const first=saveCollectionDraft(localStorage,'alice',{title:'First',items:'song-a\nsong-b',notes:'A\nB'}),second=saveCollectionDraft(localStorage,'alice',{title:'Second',items:'song-a\nsong-b',notes:'Different A\nB'});
  const key=draft=>collectionDraftKey('alice')+':progress:'+draft.localId,fingerprint=JSON.stringify(['song-a','song-b']);
  localStorage.setItem(key(second),JSON.stringify({fingerprint,current:1,completed:['song-b']}));
  await initializeTools(root,async()=>'alice');const article=title=>[...root.querySelectorAll('[data-device-drafts] article')].find(row=>row.querySelector('h3').textContent===title),panel=root.querySelector('[data-collection-preview]');
  button(article('First'),c.open).click();button(root.querySelector('form'),c.preview).click();await tick();button(panel,c.read).click();await tick();const firstProgress=localStorage.getItem(key(first));
  button(article('Second'),c.open).click();assert.equal(panel.hidden,true);assert.equal(panel.childElementCount,0);assert.equal(localStorage.getItem(key(first)),firstProgress);
  button(root.querySelector('form'),c.preview).click();await tick();assert.equal(panel.querySelector('h2').textContent,'Second');assert.ok(button(panel,'✓ '+c.read));
  button(panel,c.previous).click();await tick();button(panel,c.read).click();await tick();assert.deepEqual(JSON.parse(localStorage.getItem(key(second))).completed,['song-b','song-a']);assert.equal(localStorage.getItem(key(first)),firstProgress);
 });
});

test('replacing the editor with a remote collection or an import closes its previous preview',async()=>{
 await domTest('collections',toolsMarkup+'<div data-community-collections></div>',async root=>{
  const remote={id:'remote',revision:1,title:'Remote',description:'',kind:'collection',status:'draft',items:[{entityId:'song-b',note:'Remote note'}]};
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>'alice',request:async path=>path==='me'?{collections:[remote],follows:[]}:{collections:[]},storage:localStorage});
  const form=root.querySelector('form'),panel=root.querySelector('[data-collection-preview]');button(form,c.preview).click();await tick();const first=readCollectionDrafts(localStorage,'alice')[0],key=collectionDraftKey('alice')+':progress:'+first.localId;
  button(panel,c.read).click();await tick();const previous=localStorage.getItem(key);
  button(root.querySelector('[data-community-collections]'),archiveFeatureCopy('zh').edit).click();assert.equal(panel.hidden,true);assert.equal(localStorage.getItem(key),previous);
  button(form,c.preview).click();await tick();const input=root.querySelector('[data-import-collection]'),note='Imported first line\n'+'字'.repeat(400),legacyNote='旧笔记'.repeat(200),incoming=exportCollectionEditor({title:'Imported',items:'song-a\nsong-b',notes:note.replace(/\n/g,' ')+'\n'+legacyNote,presentation:collectionPresentation([{entityId:'song-a',note}])});
  Object.defineProperty(input,'files',{value:[{size:100,text:async()=>JSON.stringify(incoming)}]});input.dispatchEvent(new Event('change'));await tick();assert.equal(panel.hidden,true);assert.equal(form.elements.title.value,'Imported');assert.equal(localStorage.getItem(key),previous);
  assert.deepEqual(collectionEditorItems(Object.fromEntries(new FormData(form))),[{entityId:'song-a',note},{entityId:'song-b',note:legacyNote}]);
  const raw=form.elements.notes,lines=raw.value.split('\n');lines[1]='Changed B';raw.value=lines.join('\n');raw.dispatchEvent(new Event('input',{bubbles:true}));assert.deepEqual(collectionEditorItems(Object.fromEntries(new FormData(form))),[{entityId:'song-a',note},{entityId:'song-b',note:'Changed B'}]);
 });
});

test('a delayed editing preview cannot reopen after switching to another draft',async()=>{
 await domTest('collections',toolsMarkup,async root=>{
  saveCollectionDraft(localStorage,'alice',{title:'First',items:'song-a',notes:'A'});saveCollectionDraft(localStorage,'alice',{title:'Second',items:'song-b',notes:'B'});
  let calls=0,release;await initializeTools(root,async()=>++calls===3?new Promise(resolve=>release=resolve):'alice');
  const article=title=>[...root.querySelectorAll('[data-device-drafts] article')].find(row=>row.querySelector('h3').textContent===title),panel=root.querySelector('[data-collection-preview]');
  button(article('First'),c.open).click();button(root.querySelector('form'),c.preview).click();await tick();assert.equal(typeof release,'function');
  button(article('Second'),c.open).click();release('alice');await tick();assert.equal(panel.hidden,true);assert.equal(root.querySelector('[name=title]').value,'Second');
 });
});

test('deleting an edited draft cancels its pending autosave and removes the progress containing private notes',async()=>{
 await domTest('collections',toolsMarkup,async root=>{
  await initializeTools(root,async()=> 'alice');root.querySelector('[name=title]').value='Private draft';button(root,c.deviceDraft).click();await tick();const saved=readCollectionDrafts(localStorage,'alice')[0];
  button(root,c.preview).click();await tick();button(root.querySelector('[data-collection-preview]'),c.read).click();await tick();const key=collectionDraftKey('alice')+':progress:'+saved.localId;assert.ok(localStorage.getItem(key));
  root.querySelector('[name=title]').value='Private new text';root.querySelector('[name=title]').dispatchEvent(new Event('input',{bubbles:true}));button(root.querySelector('[data-device-drafts]'),c.deleteDraft).click();await new Promise(resolve=>setTimeout(resolve,320));
  assert.equal(readCollectionDrafts(localStorage,'alice').length,0);assert.equal(localStorage.getItem(key),null);
 });
});
test('changing the device draft owner clears the editor before any new owner can save it',async()=>{
 await domTest('collections',toolsMarkup,async root=>{
  let who='alice';const tools=await initializeTools(root,async()=>who);root.querySelector('[name=title]').value='Alice private text';button(root,c.deviceDraft).click();await tick();who='bob';await tools.changeOwner();
  assert.equal(root.querySelector('[name=title]').value,'');button(root,c.deviceDraft).click();await tick();assert.ok(!JSON.stringify(readCollectionDrafts(localStorage,'bob')).includes('Alice private text'));
 });
});
test('returning from the browser cache keeps the same owner draft identity',async()=>{
 await domTest('collections',toolsMarkup,async(root,w)=>{
  await initializeTools(root,async()=> 'alice');root.querySelector('[name=title]').value='First';button(root,c.deviceDraft).click();await tick();const first=readCollectionDrafts(localStorage,'alice')[0].localId;
  w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await tick();root.querySelector('[name=title]').value='Continued';button(root,c.deviceDraft).click();await tick();const drafts=readCollectionDrafts(localStorage,'alice');assert.equal(drafts.length,1);assert.equal(drafts[0].localId,first);assert.equal(drafts[0].editor.title,'Continued');
 });
});
test('a delayed file import cannot replace edits made after the import started',async()=>{
 await domTest('collections',toolsMarkup,async root=>{
  await initializeTools(root,async()=> 'alice');let release;const input=root.querySelector('[data-import-collection]'),incoming=exportCollectionEditor({title:'Old imported title',items:'song-a',notes:'old note'});
  Object.defineProperty(input,'files',{value:[{size:100,text:()=>new Promise(resolve=>release=resolve)}]});input.dispatchEvent(new Event('change'));await tick();root.querySelector('[name=title]').value='New typed title';root.querySelector('[name=title]').dispatchEvent(new Event('input',{bubbles:true}));release(JSON.stringify(incoming));await tick();assert.equal(root.querySelector('[name=title]').value,'New typed title');
 });
});
test('a save response after switching away and back cannot restore old private collection fields',async()=>{
 await domTest('collections',editor+'<div data-community-collections></div>',async(root,w)=>{
  let who='alice',release,started;const ready=new Promise(resolve=>started=resolve),request=async(path,options)=>{if(options?.method==='POST'){started();return new Promise(resolve=>release=resolve);}return path==='me'?{collections:[],follows:[]}:{collections:[]};};
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,request,storage:localStorage});root.querySelector('[name=title]').value='Alice private fields';root.querySelector('[data-collection-form]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await ready;
  who='bob';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));who='alice';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));release({collection:{id:'old',title:'Alice private fields',description:'',kind:'collection',revision:1,items:[{entityId:'song-a',note:'private'}]}});await tick();assert.equal(root.querySelector('[name=title]').value,'');
 });
});
test('a room created by an old account operation is not joined by the new account',async()=>{
 const room='<form data-create-room><input name="title" value="Room"/><button>Create</button></form><section data-active-room hidden><p data-room-title></p><p data-room-participants></p><form data-room-position></form><button data-end-room></button><button data-leave-room></button><input type="checkbox" data-follow-host checked/><div data-room-current></div></section>';
 await domTest('rooms',room,async(root,w)=>{
  let who='alice',release,started;const ready=new Promise(resolve=>started=resolve),joins=[];
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,request:async(path)=>{if(path==='rooms'){started();return new Promise(resolve=>release=resolve);}joins.push(who);return {id:'old-room',title:'Room',host:true,participants:[],revision:1,position:null};},storage:localStorage});
  root.querySelector('[data-create-room]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await ready;who='bob';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));release({id:'old-room'});await tick();assert.deepEqual(joins,[]);assert.equal(root.querySelector('[data-active-room]').hidden,true);
 });
});
test('passport submission cannot copy the previous account fields into a newly resolved owner',async()=>{
 const markup='<form data-passport-form><input name="name"/><textarea name="note"></textarea><textarea name="interests"></textarea><input type="checkbox" name="published"/><button>Save</button></form>';
 await domTest('physical',markup,async(root,w)=>{
  let who='alice',pause=false,release,started;const ready=new Promise(resolve=>started=resolve);
  await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>{if(pause){started();return new Promise(resolve=>release=resolve);}return who;},storage:localStorage});
  root.querySelector('[name=name]').value='Alice private name';root.querySelector('[name=note]').value='Alice private note';pause=true;root.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));await ready;
  who='bob';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));pause=false;release(who);await tick();assert.equal(loadObservatory(localStorage,'bob').data.passport.name,'');
 });
});
test('an observatory file read started in a previous login cannot merge after switching away and back',async()=>{
 await domTest('physical','<input type="file" data-import-observatory/>',async(root,w)=>{
  let who='alice',release;await initializeArchiveWorkspace(root,{loadSnapshot:async()=>archiveFixture(),owner:async()=>who,storage:localStorage});const input=root.querySelector('input');
  const incoming={...emptyObservatory(),records:[{id:'read:song-a',kind:'read',entityId:'song-a',note:'Old private import',at:Date.now()}]};Object.defineProperty(input,'files',{value:[{size:100,text:()=>new Promise(resolve=>release=resolve)}]});input.dispatchEvent(new Event('change'));await tick();
  who='bob';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));who='alice';w.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:{viewer:{userId:who}}}));release(JSON.stringify(incoming));await tick();assert.equal(loadObservatory(localStorage,'alice').data.records.length,0);
 });
});
