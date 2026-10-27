import test from 'node:test';
import assert from 'node:assert/strict';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {selectArchive,parseArchiveQuestion,setlistStatistics,archiveStatistics,archiveOnThisDay,musicVersions,validBarcode,compareArchive,genomePoints} from '../src/lib/archiveResearch.mjs';
import {emptyObservatory,validateObservatory,upsertObservation,loadObservatory,saveObservatory,observatoryAchievements} from '../src/lib/archivePersonal.mjs';
import {validateRadioQueue} from '../src/lib/archiveRadio.mjs';
const snapshot=archiveFixture();
test('confirmed query conditions share canonical facts across languages and pair creator with role',()=>{
 const conditions={type:'work-track',creator:'maker',role:'composer'};
 assert.deepEqual(selectArchive(snapshot,conditions,'zh').map(e=>e.id),['song-a']);
 assert.deepEqual(selectArchive(snapshot,conditions,'en').map(e=>e.id),['song-a']);
 assert.equal(selectArchive(snapshot,{creator:'kaf',role:'composer'}).length,0);
});
test('bounded question parser distinguishes KAF from KAFU and never executes ambiguity',()=>{
 assert.deepEqual(parseArchiveQuestion('KAF songs in 2024',snapshot).query,{type:'work-track',year:'2024',artist:'kaf'});
 assert.equal(parseArchiveQuestion('KAFU songs',snapshot).query.artist,'kafu');
 assert.ok(parseArchiveQuestion('KAF and maker songs',snapshot).unresolved.includes('artist'));
 assert.equal(parseArchiveQuestion('something unsupported',snapshot).query.q,'something unsupported');
 assert.equal(parseArchiveQuestion('KAF songs in 2023 to 2024',snapshot).query.from,'2023');
 assert.equal(parseArchiveQuestion('KAF songs',snapshot).requiresConfirmation,true);
});
test('setlist coverage retains repeated songs and excludes imprecise latest dates and unrelated scopes',()=>{
 const stats=setlistStatistics(snapshot);assert.equal(stats.total,2);assert.equal(stats.covered,1);assert.equal(stats.unlinked,1);
 assert.equal(stats.songs[0].occurrences.length,2);assert.equal(stats.songs[0].eventCount,1);assert.equal(stats.songs[0].latest,'2024-02-29');
 assert.equal(archiveStatistics(snapshot,{year:'1999'}).setlists.total,0);
});
test('historical month/day requires actual day precision and handles leap days without exceptions',()=>{
 assert.deepEqual(archiveOnThisDay(snapshot,'02-29').map(e=>e.id),['leap-event']);
 for(const invalid of ['02-30','13-01','01','00-10'])assert.deepEqual(archiveOnThisDay(snapshot,invalid),[]);
 assert.deepEqual(archiveOnThisDay(snapshot,'01-01'),[]);
});
test('version cycles terminate; entity comparison uses shared recorded connections',()=>{
 assert.deepEqual(new Set(musicVersions(snapshot,'song-a').ids),new Set(['song-a','remix']));
 assert.deepEqual(compareArchive(snapshot,['song-a','song-b']).common.map(e=>e.id),['maker']);
 assert.equal(genomePoints(snapshot,['year','duration','bpm']).length,0);
 assert.equal(genomePoints(snapshot,['year','duration']).length,1);
});
test('barcodes require a valid GTIN checksum and queues remain bounded',()=>{
 assert.equal(validBarcode('4901234567894'),'4901234567894');assert.equal(validBarcode('4901234567890'),null);
 assert.equal(validBarcode('036000291452'),'036000291452');assert.equal(validBarcode('abcdefghijklm'),null);
 assert.deepEqual(validateRadioQueue({version:1,ids:['song-a','song-a'],index:50}),{version:1,ids:['song-a'],index:0});
 assert.throws(()=>validateRadioQueue({version:1,ids:['<script>'],index:0}));
});
test('personal data is account scoped and contributions cannot be forged by importing badges',()=>{
 const memory=new Map(),storage={getItem:key=>memory.get(key),setItem:(key,value)=>memory.set(key,value)};
 const data=upsertObservation(emptyObservatory(),{kind:'heard',entityId:'song-a'});
 saveObservatory(storage,'alice',data);assert.equal(loadObservatory(storage,'bob').data.records.length,0);
 assert.equal(loadObservatory(storage,null).data.records.length,0);
 assert.equal(observatoryAchievements(data,0).find(a=>a.kind==='approved').earned,false);
 assert.throws(()=>validateObservatory({version:1,records:[{id:'bad',kind:'approved',entityId:'song-a',at:Date.now()}],routes:[]}));
 assert.throws(()=>upsertObservation(data,{kind:'visited',entityId:'live-a',ticketUrl:'javascript:alert(1)'}));
});
