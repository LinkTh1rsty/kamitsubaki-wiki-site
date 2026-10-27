import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityRegistry} from '../src/lib/entityRegistry.mjs';
import {buildLiveArchive,selectLiveArchive,liveSetlistRows,songLiveHistory} from '../src/lib/liveArchive.mjs';
import {buildCreditsArchive,selectCreditsArchive,creditIdentity} from '../src/lib/creditsArchive.mjs';
import {archiveCopy} from '../src/lib/archiveCopy.mjs';

const person=(id,name=id)=>({schemaVersion:2,id,locale:'zh',entityType:'person',name,romanizedName:id,roles:['composer']});
const song=(id,extra={})=>({schemaVersion:2,id,locale:'zh',entityType:'work-track',title:id,romanizedTitle:id,performers:[],credits:[],...extra});
const live=(id,extra={})=>({schemaVersion:2,id,locale:'zh',entityType:'live-event',name:id,eventType:'oneman-live',headliners:[],...extra});
const registry=data=>createEntityRegistry(data.map(d=>({data:d,filePath:`F:/wiki/src/content/${d.entityType==='live-event'?'lives':d.entityType==='work-track'?'songs':'people'}/${d.id}/zh.md`,body:'Do not publish full bodies.'})));

test('live archive includes documented guests, date ranges and venue modes without expanding group membership',()=>{
  const r=registry([person('a','花譜'),person('b','理芽'),person('unit'),
    live('series',{dateRange:{start:'2020-10-10',end:'2021-06-12'},headliners:['a'],guestPerformers:['b'],venue:{name:'Hall',isVirtual:false}}),
    live('virtual',{eventType:'xr-sinka-live',headliners:['unit'],venue:{name:'Stage',isVirtual:true}}),
    live('expo',{eventType:'exhibition',headliners:['a']})]);
  const catalog=buildLiveArchive(r,'zh');
  assert.deepEqual(catalog.summary,{total:3,concerts:2,withSetlists:0,artists:3});
  assert.deepEqual(catalog.years,['2021','2020']);
  assert.equal(catalog.entries.find(e=>e.id==='expo').needsSetlist,false);
  assert.equal(catalog.entries.find(e=>e.id==='expo').mode,'unknown');
  assert.deepEqual(selectLiveArchive(catalog.entries,{artist:'b',year:'2021',mode:'physical'}).map(e=>e.id),['series']);
  assert.equal(selectLiveArchive(catalog.entries,{artist:'b',mode:'virtual'}).length,0);
  assert.ok(!JSON.stringify(catalog).includes('F:/wiki'));
  assert.ok(!JSON.stringify(catalog).includes('Do not publish full bodies'));
});

test('live filters combine folded text, event type, venue and year; missing dates stay last in both directions',()=>{
  const catalog=buildLiveArchive(registry([
    live('old',{name:'花譜演出',dateRange:{start:'2019'},venue:{name:'東京 Hall',isVirtual:false}}),
    live('new',{dateRange:{start:'2024-01-01'}}),live('unknown'),
  ]),'zh');
  const before=JSON.stringify(catalog.entries);
  assert.deepEqual(selectLiveArchive(catalog.entries,{query:'花谱 hall',type:'oneman-live',mode:'physical',year:'2019'}).map(e=>e.id),['old']);
  assert.deepEqual(selectLiveArchive(catalog.entries).map(e=>e.id),['new','old','unknown']);
  assert.deepEqual(selectLiveArchive(catalog.entries,{sort:'oldest'}).map(e=>e.id),['old','new','unknown']);
  assert.deepEqual(selectLiveArchive(catalog.entries,{year:'unknown'}).map(e=>e.id),['unknown']);
  assert.equal(JSON.stringify(catalog.entries),before);
});

test('setlists preserve repeated renditions and free titles; only valid song IDs become links',()=>{
  const r=registry([song('majo',{title:'魔女'}),person('not-a-song'),live('concert',{setlist:[
    {songId:'majo',number:'01'},{songId:'majo',title:'魔女 · acoustic',number:'EN1',duration:'4:12'},
    {title:'魔女'},{songId:'missing',title:'Unlinked'},{songId:'not-a-song',title:'Wrong type'},
  ]})]);
  const rows=liveSetlistRows(r.resolveEntity('concert','zh'),r,'zh');
  assert.deepEqual(rows.map(row=>row.number),['01','EN1','','','']);
  assert.equal(rows[0].title,'魔女'); assert.equal(rows[1].title,'魔女 · acoustic');
  assert.equal(rows[0].path,rows[1].path); assert.equal(rows[2].path,null);
  assert.equal(rows[3].path,null); assert.equal(rows[4].path,null);
  assert.deepEqual(rows.map(row=>row.position),[1,2,3,4,5]);
});

test('song history uses explicit performance edges, deduplicates events and retains all positions',()=>{
  const r=registry([song('majo'),song('other'),live('early',{dateRange:{start:'2019'},setlist:[{songId:'majo',number:'2'},{songId:'majo',number:'EN1'}]}),
    live('late',{dateRange:{start:'2024'},setlist:[{songId:'majo'}]}),live('title-only',{setlist:[{title:'majo'}]}),
    {schemaVersion:2,id:'album',locale:'zh',entityType:'work-release',title:'Album',releaseType:'album',tracks:[{songId:'majo'}]},
  ]);
  const history=songLiveHistory(r,'majo','zh');
  assert.deepEqual(history.map(item=>item.id),['early','late']);
  assert.deepEqual(history[0].performances.map(row=>row.number),['2','EN1']);
  assert.deepEqual(songLiveHistory(r,'other'),[]); assert.deepEqual(songLiveHistory(r,'missing'),[]);
  assert.deepEqual(songLiveHistory(r,'early'),[]);
});

test('credit statistics count distinct works and performers, not credit rows or duplicate vocal roles',()=>{
  const r=registry([person('maker','Maker'),person('kaf','花譜'),song('one',{releaseDate:'2024',performers:[{entity:'kaf'},{entity:'kaf',role:'guest-vocal'}],credits:[
    {entity:'maker',role:'composer'},{entity:'maker',role:'lyricist'},{entity:'maker',role:'composer'},
  ]}),song('two',{performers:[{entity:'kaf'}],credits:[{entity:'maker',role:'composer'}]}),song('uncredited')]);
  const catalog=buildCreditsArchive(r,'zh'),maker=catalog.creators[0];
  assert.deepEqual(catalog.summary,{totalSongs:3,withCredits:2,withWorkCredits:2,creatorGroups:1,linkedCreators:1});
  assert.equal(catalog.entries[0].credits.length,2); assert.equal(maker.workCount,2);
  assert.deepEqual(maker.roles,['composer','lyricist']);
  assert.equal(maker.collaborators[0].count,2); assert.deepEqual(maker.years,[{year:'2024',count:1}]);
  assert.ok(!JSON.stringify(catalog).includes('Do not publish full bodies'));
});
test('release illustration credits extend creator works while keeping song coverage separate',()=>{
 const r=registry([person('maker','Maker'),person('kaf','花譜'),song('song',{performers:[{entity:'kaf'}],credits:[{entity:'maker',role:'composer'}]}),
  {schemaVersion:2,id:'album',locale:'zh',entityType:'work-release',title:'Album',primaryArtist:'kaf',releaseDate:'2024',tracks:[],credits:[{entity:'maker',role:'illustrator'}]}]);
 const catalog=buildCreditsArchive(r,'zh');
 assert.equal(catalog.summary.totalSongs,1);assert.equal(catalog.summary.withCredits,1);assert.equal(catalog.summary.withWorkCredits,2);
 assert.equal(catalog.creators[0].workCount,2);
 assert.deepEqual(selectCreditsArchive(catalog.entries,{artist:'kaf',role:'illustrator'}).map(row=>row.id),['album']);
});

test('creator and role filters must match the same authored credit and combine with performer and year',()=>{
  const r=registry([person('a'),person('b'),person('kaf','花譜'),song('mixed',{performers:[{entity:'kaf'}],releaseDate:'2020',credits:[{entity:'a',role:'lyricist'},{entity:'b',role:'composer'}]}),
    song('match',{performers:[{entity:'kaf'}],releaseDate:'2021',credits:[{entity:'a',role:'composer'}]})]);
  const catalog=buildCreditsArchive(r,'zh'),before=JSON.stringify(catalog.entries);
  assert.deepEqual(selectCreditsArchive(catalog.entries,{creator:'entity:a',role:'composer'}).map(e=>e.id),['match']);
  assert.deepEqual(selectCreditsArchive(catalog.entries,{creator:'entity:a',role:'composer',artist:'kaf',query:'花谱',year:'2021'}).map(e=>e.id),['match']);
  assert.equal(selectCreditsArchive(catalog.entries,{creator:'entity:a',role:'composer',year:'2020'}).length,0);
  assert.equal(JSON.stringify(catalog.entries),before);
});

test('name-only credits stay separate from entity identities and same-name entities; unresolved identities do not get links',()=>{
  const r=registry([person('one','Alice'),person('two','Alice'),song('song',{credits:[{entity:'one',role:'composer'},
    {entity:'two',role:'composer'},{name:' Alice ',role:'lyricist'},{entity:'unresolved',role:'composer'}]})]);
  const catalog=buildCreditsArchive(r,'en');
  assert.equal(catalog.creators.length,4); assert.equal(catalog.summary.linkedCreators,2);
  assert.equal(catalog.creators.find(c=>c.key==='name:Alice').path,null);
  assert.equal(catalog.creators.find(c=>c.key==='entity:unresolved').path,null);
  assert.equal(creditIdentity({name:'  '}),null);
  assert.equal(creditIdentity({entity:'one',name:'Alice'}),'entity:one');
});

test('empty archives have finite summaries and both archives provide all five locale labels',()=>{
  const r=registry([]);
  assert.equal(buildLiveArchive(r).summary.total,0); assert.equal(buildCreditsArchive(r).summary.withCredits,0);
  for(const locale of ['zh','zh-tw','zh-hk','ja','en']){
    const c=archiveCopy(locale); assert.ok(c.live.title&&c.credits.title&&c.live.modes.unknown);
    assert.ok(c.live.types['xr-sinka-live']&&c.roles.composer&&c.results.includes('{total}'));
  }
});
