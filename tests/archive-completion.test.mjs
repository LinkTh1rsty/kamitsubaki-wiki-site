import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {archiveDigest} from '../src/lib/archiveSnapshot.mjs';
import {verifyArchiveSnapshot,archiveCSV,archiveZip,pilgrimageGPX,pilgrimageGeoJSON,archiveCitation} from '../src/lib/archiveExports.mjs';
import {musicConnections,compareLiveSetlists,archiveCollaborations,archiveCoverage} from '../src/lib/archiveInsights.mjs';
import {saveCollectionDraft,readCollectionDrafts,collectionEditorItems,exportCollectionEditor,importCollectionEditor} from '../src/lib/archiveCollectionDrafts.mjs';
import {selectArchive,visualRecords,archiveStatistics,atlasPlaces} from '../src/lib/archiveResearch.mjs';
import {createEntityRegistry} from '../src/lib/entityRegistry.mjs';
import {buildCreditsArchive,selectCreditsArchive} from '../src/lib/creditsArchive.mjs';
const store=()=>{const data=new Map();return {getItem:key=>data.get(key),setItem:(key,value)=>data.set(key,value)};};
const editor=(extra={})=>({id:'',title:'My draft',description:'',kind:'exhibition',revision:'0',items:'song-a\n\nsong-b',notes:'A\nUnused\nB',...extra});

test('downloaded public bundles round trip and tampering invalidates their canonical snapshot hash',async()=>{
 const {snapshot:_fixture,...payload}=archiveFixture(),snapshot={snapshot:archiveDigest(payload),...payload};
 assert.equal(await verifyArchiveSnapshot(snapshot,webcrypto.subtle),true);
 const bytes=await archiveZip({'snapshot.json':snapshot,'citation.json':archiveCitation(snapshot,['song-a'],new Date('2026-10-14'))}),files=unzipSync(bytes),restored=JSON.parse(strFromU8(files['snapshot.json']));
 assert.equal(await verifyArchiveSnapshot(restored,webcrypto.subtle),true);
 restored.entities[0].narratives.zh.title='Changed';assert.equal(await verifyArchiveSnapshot(restored,webcrypto.subtle),false);
 assert.ok(!Object.keys(files).some(key=>/profile|draft|account/.test(key)));
});

test('CSV escapes formula text and quotes while preserving zero, negative numbers and unknown values',()=>{
 const csv=archiveCSV([{title:'=HYPERLINK("https://bad.test")',count:0,numeric:-1,missing:null},{title:'\t@SUM(1)',count:2,numeric:1,missing:'a,b\n"quote"'}]);
 assert.ok(csv.includes("'="));assert.ok(csv.includes("'\t@"));assert.ok(csv.includes('"0","-1",""'));assert.ok(csv.includes('"a,b\n""quote"""'));
});

test('pilgrimage exports keep unknown geometry and never invent coordinates or a road line',()=>{
 const rows=[{id:'one',title:'A & <B>',world:'real',entities:['live-a'],coordinates:{lat:35,lng:139}},{id:'two',title:'Unknown',world:'real',entities:['live-b']},{id:'fiction',title:'Fiction',world:'virtual',entities:[],coordinates:{lat:0,lng:0}}];
 const geo=pilgrimageGeoJSON(rows,'hash'),gpx=pilgrimageGPX(rows,'hash');
 assert.equal(geo.features.length,2);assert.deepEqual(geo.features[0].geometry.coordinates,[139,35]);assert.equal(geo.features[1].geometry,null);
 assert.equal((gpx.match(/<rtept /g) || []).length,1);assert.ok(gpx.includes('A &amp; &lt;B&gt;'));assert.ok(!gpx.includes('Fiction'));
});

test('version research preserves type, direction, sources and containing releases across cycles',()=>{
 const snapshot=archiveFixture();snapshot.relations.push({source:'song-a',target:'remix',type:'version-of',versionType:'cover',sourceIds:['official']});snapshot.entities.find(row=>row.id==='song-a').facts.sources=[{id:'official',title:'Official',url:'https://example.com'}];snapshot.entities.find(row=>row.id==='release').facts.tracks=[{songId:'song-a'}];
 const result=musicConnections(snapshot,'song-a','en');assert.equal(result.releases[0].id,'release');assert.ok(result.versions.some(row=>row.versionType==='cover' && row.source.id==='song-a' && row.target.id==='remix' && row.sources[0].id==='official'));
 assert.equal(selectArchive(snapshot,{version:'cover'},'en').filter(row=>['song-a','remix'].includes(row.id)).length,2);
});

test('setlist comparisons retain repeated renditions and distinguish unlinked titles from absent data',()=>{
 const snapshot=archiveFixture();snapshot.entities.find(row=>row.id==='live-a').facts.setlistStatus='partial';const comparison=compareLiveSetlists(snapshot,['live-a','live-b','live-a']);
 assert.equal(comparison.lives.length,2);assert.deepEqual(comparison.rows[0].counts,[2,0]);assert.deepEqual(comparison.unlinked,[1,0]);assert.equal(comparison.lives[0].facts.setlistStatus,'partial');
});

test('co-credit statistics deduplicate roles and keep authored names separate from entity identities',()=>{
 const snapshot=archiveFixture();snapshot.entities.find(row=>row.id==='song-a').facts.credits.push({entity:'maker',role:'arranger'},{name:'Maker',role:'mixer'},{entity:'kaf',role:'vocalist'});
 const pairs=archiveCollaborations(snapshot,{type:'work-track'});assert.ok(pairs.some(row=>row.left==='entity:maker' && row.right==='name:Maker' && row.count===1));assert.ok(pairs.every(row=>row.left!==row.right && row.count===1));
 assert.equal(archiveCoverage(snapshot,{year:'1900'}).total,0);assert.equal(archiveStatistics(snapshot,{q:'not-a-record'}).songs,0);
});

test('creator work filters apply the same credit role plus a distinct collaborator',()=>{
 const entries=[{data:{schemaVersion:2,id:'maker',locale:'zh',entityType:'person',name:'Maker',romanizedName:'maker',roles:['composer']}},{data:{schemaVersion:2,id:'song',locale:'zh',entityType:'work-track',title:'Song',romanizedTitle:'song',performers:[],credits:[{entity:'maker',role:'composer'},{name:'Partner',role:'mixer'},{name:'Partner',role:'producer'}]}},{data:{schemaVersion:2,id:'album',locale:'zh',entityType:'work-release',title:'Album',releaseType:'album',tracks:[],credits:[{entity:'maker',role:'illustrator'},{name:'Partner',role:'illustrator'}]}}];
 const catalog=buildCreditsArchive(createEntityRegistry(entries));assert.equal(catalog.creators.find(row=>row.key==='entity:maker').coCreators[0].count,2);
 assert.equal(selectCreditsArchive(catalog.entries,{creator:'entity:maker',collaborator:'name:Partner',role:'composer',workType:'work-track'}).length,1);
 assert.equal(selectCreditsArchive(catalog.entries,{creator:'entity:maker',collaborator:'entity:maker'}).length,0);
});

test('device exhibition drafts preserve unfinished inputs, owner isolation and line-aligned chapter notes',()=>{
 const storage=store(),saved=saveCollectionDraft(storage,'alice',editor({items:'song-a\n\nunknown-entry'}));assert.equal(readCollectionDrafts(storage,'bob').length,0);assert.equal(readCollectionDrafts(storage,null).length,0);
 assert.deepEqual(collectionEditorItems(saved.editor),[{entityId:'song-a',note:'A'},{entityId:'unknown-entry',note:'B'}]);
 const imported=importCollectionEditor(exportCollectionEditor(saved.editor));assert.equal(imported.items,saved.editor.items);assert.ok(!('approved' in imported));
 saveCollectionDraft(storage,'alice',editor({title:'Changed'}),saved.localId);assert.equal(readCollectionDrafts(storage,'alice').length,1);
 assert.throws(()=>importCollectionEditor({version:1,editor:editor()}));assert.throws(()=>importCollectionEditor({format:'archive-exhibition-draft',version:1,editor:editor({kind:'published'})}));
});

test('visual lineage and year filters use authored visual dates instead of identity dates',()=>{
 const snapshot=archiveFixture(),entity=snapshot.entities.find(row=>row.id==='kaf');entity.image='/images/kaf.png';entity.morphing={group:'lineage',slot:'virtual-artist'};entity.facts.visualHistory=[{id:'first',title:'Known visual',image:'/images/known.png',date:'2024'}];
 assert.equal(visualRecords(snapshot,{lineage:'lineage'}).length,2);assert.equal(visualRecords(snapshot,{lineage:'lineage',year:'2018'}).length,0);assert.equal(visualRecords(snapshot,{visualEntity:'kaf',year:'2024'}).length,1);
});

test('Atlas merges later sourced coordinates for the same venue and respects multi-year dates',()=>{
 const snapshot=archiveFixture(),first=snapshot.entities.find(row=>row.id==='live-a'),second=snapshot.entities.find(row=>row.id==='live-b');first.date='2023';first.facts.dateRange={start:'2023',end:'2025'};first.facts.venue={name:'Hall',isVirtual:false,sourceIds:['one']};second.facts.venue={name:'Hall',isVirtual:false,sourceIds:['two'],coordinates:{lat:35,lng:139}};
 assert.deepEqual(atlasPlaces(snapshot)[0].coordinates,{lat:35,lng:139});assert.deepEqual(atlasPlaces(snapshot)[0].sourceIds,['one','two']);assert.ok(selectArchive(snapshot,{year:'2024'}).some(row=>row.id==='live-a'));
});

test('heterogeneous CSV rows retain later evidence fields and research citations list explicit sources',()=>{
 const csv=archiveCSV([{id:'a'},{id:'b',sourceIds:['official'],versionType:'cover'}]);assert.ok(csv.includes('"sourceIds","versionType"'));assert.ok(csv.includes('official'));
 const snapshot=archiveFixture();snapshot.entities[0].facts.sources=[{url:'https://example.test/official'}];const citation=archiveCitation(snapshot,[snapshot.entities[0].id,snapshot.entities[0].id]);assert.deepEqual(citation.sources,['https://example.test/official']);assert.equal(citation.entities.length,1);
});
