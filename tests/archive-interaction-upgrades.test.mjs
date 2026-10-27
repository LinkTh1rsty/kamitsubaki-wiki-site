import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {parseArchiveQuestion,selectArchive} from '../src/lib/archiveResearch.mjs';
import {archiveInteractionCopy} from '../src/lib/archiveInteractionCopy.mjs';
import {archiveChoices,searchArchiveChoices} from '../src/lib/archiveSelection.mjs';
import {createArchiveEntityPicker} from '../src/scripts/archiveEntityPicker.js';
import {writeRadioQueue,readRadioQueue,editRadioQueue,nextRadioIndex,saveRadioPlaylist,readRadioPlaylists,removeRadioPlaylist,addRadioTracks} from '../src/lib/archiveRadio.mjs';
import {collectionEditorItems,collectionPresentation,validateCollectionEditor,exportCollectionEditor,importCollectionEditor} from '../src/lib/archiveCollectionDrafts.mjs';
const store=()=>{const data=new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value),removeItem:key=>data.delete(key)};};

test('partial questions retain descriptions instead of silently widening the query',()=>{
 const snapshot=archiveFixture(),plain=parseArchiveQuestion('花谱 2024 年的歌曲',snapshot),rain=parseArchiveQuestion('花谱 2024 年关于雨的歌曲',snapshot);
 assert.deepEqual(plain.query,{type:'work-track',year:'2024',artist:'kaf'});
 assert.equal(rain.query.q,'雨');assert.ok(rain.unresolved.includes('q'));assert.equal(rain.unrecognizedText,'雨');
 assert.equal(parseArchiveQuestion('KAF songs about rain in 2024',snapshot).query.q,'rain');
 assert.equal(parseArchiveQuestion('花谱关于的士的歌曲',snapshot).query.q,'的士');
 assert.equal(parseArchiveQuestion('花譜 夜の雨 楽曲',snapshot).query.q,'夜の雨');
 const ambiguous=parseArchiveQuestion('KAF and maker songs',snapshot);assert.equal(ambiguous.query.artist,undefined);assert.deepEqual(ambiguous.candidates.artist,['kaf','maker']);
});

test('type recognition consumes matched words without removing parts of search keywords',()=>{
 const snapshot=archiveFixture();snapshot.entities.find(row=>row.id==='song-a').narratives.en.summary='songwriting';snapshot.entities.find(row=>row.id==='song-b').narratives.en.summary='writing';
 for(const question of ['KAF song about songwriting','KAF songs about songwriting']){
  const plan=parseArchiveQuestion(question,snapshot);assert.equal(plan.query.q,'songwriting');assert.deepEqual(selectArchive(snapshot,plan.query,'en').map(row=>row.id),['song-a']);
 }
 assert.equal(parseArchiveQuestion('KAF music about musicboxes',snapshot).query.q,'musicboxes');
});

test('localized composer templates resolve the work without turning sentence grammar into keywords',()=>{
 const snapshot=archiveFixture(),song=snapshot.entities.find(row=>row.id==='song-a');song.narratives.zh.title='夜の雨';song.narratives.en.title='Rain at Night';song.narratives.ja={...song.narratives.zh,locale:'ja'};
 for(const locale of ['zh','zh-tw','zh-hk','ja','en']){
  const title=(song.narratives[locale] || song.narratives.zh).title,question=archiveInteractionCopy(locale).creditsTemplate.replace('{work}',title),plan=parseArchiveQuestion(question,snapshot);
  assert.deepEqual(plan.query,{role:'composer',entity:'song-a'},question);assert.equal(plan.unrecognizedText,'');assert.deepEqual(selectArchive(snapshot,plan.query,locale).map(row=>row.id),['song-a']);
 }
 assert.equal(parseArchiveQuestion('夜の雨 を作曲したのは誰 夜明け',snapshot).query.q,'夜明け');
});

test('record choices search multilingual aliases and distinguish KAF from KAFU',()=>{
 const snapshot=archiveFixture();snapshot.entities[0].narratives.en.aliases=['Virtual Singer'];
 const choices=archiveChoices(snapshot,'zh');assert.equal(searchArchiveChoices(choices,'ＫＡＦ')[0].id,'kaf');assert.equal(searchArchiveChoices(choices,'花谱')[0].id,'kaf');assert.equal(searchArchiveChoices(choices,'Virtual Singer')[0].id,'kaf');
 assert.ok(searchArchiveChoices(choices,'KAF',['kaf']).every(row=>row.id!=='kaf'));assert.equal(archiveChoices(snapshot,'en',['live-event']).length,2);
});

test('the picker submits IDs, supports keyboard selection and rejects unselected free text before form handlers',async()=>{
 const dom=new JSDOM('<form><label>Record<input name="entity" required/></label><button>Submit</button></form>',{url:'https://wiki.test'}),w=dom.window,field=w.document.querySelector('input'),form=field.form;let submitted=0;form.addEventListener('submit',()=>submitted++);
 const picker=createArchiveEntityPicker(field,{items:archiveChoices(archiveFixture(),'en'),locale:'en'});
 try{
  picker.input.value='KAF';picker.input.dispatchEvent(new w.Event('input',{bubbles:true}));form.dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));assert.equal(submitted,0);assert.equal(field.value,'');
  picker.input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));picker.input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(field.value,'kaf');assert.equal(new w.FormData(form).get('entity'),'kaf');
  assert.equal(picker.input.getAttribute('aria-expanded'),'false');assert.match(picker.host.textContent,/kaf/);
  form.reset();await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(field.value,'');assert.equal(picker.host.querySelectorAll('.archive-picker__chip').length,0);
  const submit=form.querySelector('button[type=submit],button:not([type])');submit.focus();picker.input.focus();assert.equal(picker.input.getAttribute('aria-expanded'),'true');submit.focus();await new Promise(resolve=>w.setTimeout(resolve,0));assert.equal(picker.input.getAttribute('aria-expanded'),'false');
 }finally{picker.destroy();w.close();}
});

test('multi selection preserves order and provides removal without exposing raw IDs as the primary label',()=>{
 const dom=new JSDOM('<form><textarea name="interests"></textarea></form>'),field=dom.window.document.querySelector('textarea'),picker=createArchiveEntityPicker(field,{items:archiveChoices(archiveFixture(),'zh'),multiple:true,max:2});
 try{picker.setValues(['kaf','song-a']);assert.equal(field.value,'kaf\nsong-a');assert.match(picker.host.textContent,/花譜/);assert.equal(picker.input.disabled,true);picker.host.querySelector('button').click();assert.equal(field.value,'song-a');assert.equal(picker.input.disabled,false);}finally{picker.destroy();dom.window.close();}
});

test('queue edits preserve the current track and position while invalid drag orders cannot drop tracks',()=>{
 const storage=store();writeRadioQueue(storage,{version:1,ids:['song-a','song-b','remix'],index:1,seconds:42,repeat:'all'});
 editRadioQueue(storage,{type:'move',id:'song-b',step:-1});let queue=readRadioQueue(storage);assert.equal(queue.ids[queue.index],'song-b');assert.equal(queue.seconds,42);
 editRadioQueue(storage,{type:'order',ids:['song-b']});assert.equal(readRadioQueue(storage).ids.length,3);
 editRadioQueue(storage,{type:'shuffle'});queue=readRadioQueue(storage);assert.equal(queue.ids[queue.index],'song-b');assert.equal(queue.seconds,42);
 editRadioQueue(storage,{type:'remove',id:'song-b'});queue=readRadioQueue(storage);assert.equal(queue.ids.length,2);assert.equal(queue.seconds,0);assert.equal(queue.repeat,'all');
 assert.equal(nextRadioIndex({...queue,index:1,repeat:'off'},{automatic:true}),null);assert.equal(nextRadioIndex({...queue,index:1,repeat:'all'},{automatic:true}),0);assert.equal(nextRadioIndex({...queue,index:1,repeat:'one'},{automatic:true}),1);
});

test('named playlists survive queue clearing and new tracks are deduplicated before the queue limit',()=>{
 const storage=store();writeRadioQueue(storage,{version:1,ids:['song-a','song-b'],index:1,seconds:42,repeat:'one'});const saved=saveRadioPlaylist(storage,'My songs');
 writeRadioQueue(storage,{version:1,ids:[],index:0});assert.equal(readRadioPlaylists(storage)[0].name,'My songs');assert.deepEqual(readRadioPlaylists(storage)[0].queue.ids,['song-a','song-b']);assert.equal(readRadioPlaylists(storage)[0].queue.seconds,0);
 removeRadioPlaylist(storage,saved.id);assert.equal(readRadioPlaylists(storage).length,0);
 writeRadioQueue(storage,{version:1,ids:Array.from({length:199},(_,index)=>'track-'+index),index:0});addRadioTracks(storage,['track-0','track-new']);assert.ok(readRadioQueue(storage).ids.includes('track-new'));
});

test('collection exports round trip multiline notes, sections and one cover while retaining old drafts',()=>{
 const items=[{entityId:'song-a',note:'First line\n第二行',section:'Part one',cover:true},{entityId:'song-b',note:'B'}],editor=validateCollectionEditor({items:'song-a\nsong-b',notes:'Legacy A\nB',presentation:collectionPresentation(items)});
 assert.deepEqual(collectionEditorItems(importCollectionEditor(exportCollectionEditor(editor))),items);
 assert.deepEqual(collectionEditorItems(validateCollectionEditor({items:'song-a',notes:'Old note'})),[{entityId:'song-a',note:'Old note'}]);
 assert.throws(()=>validateCollectionEditor({...editor,presentation:collectionPresentation(items.map(row=>({...row,cover:true})))}));
});
