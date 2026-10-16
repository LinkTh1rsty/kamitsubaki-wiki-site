import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityRegistry} from '../src/lib/entityRegistry.mjs';
import {entityArchiveHub} from '../src/lib/entityArchiveHub.mjs';
import {visualRecords} from '../src/lib/archiveResearch.mjs';
import {galleryViewerCopy} from '../src/lib/galleryViewerCopy.mjs';
import {archiveFixture} from './helpers/archive-fixture.mjs';
test('entity hubs distinguish identities from repeated credit and setlist entries',()=>{
 const entry=(id,type,extra={})=>({data:{id,entityType:type,schemaVersion:2,locale:'zh',title:id,...extra},body:'',filePath:'src/content/'+id+'/zh.md'});
 const registry=createEntityRegistry([entry('kaf','virtual-avatar'),entry('maker','person',{roles:['composer']}),entry('song','work-track',{performers:[{entity:'kaf'}],credits:[{entity:'maker',role:'composer'},{entity:'maker',role:'lyricist'},{name:'Named arranger',role:'arranger'}]}),entry('live','live-event',{setlist:[{songId:'song'},{songId:'song'},{title:'Unlinked'}]}),entry('release','work-release',{primaryArtist:'kaf',tracks:[{songId:'song'},{title:'Unknown'}]})]);
 const actor=entityArchiveHub(registry,'kaf');assert.equal(actor.find(metric=>metric.key==='songs').count,1);assert.equal(actor.find(metric=>metric.key==='releases').count,1);assert.equal(actor.find(metric=>metric.key==='lives').count,0);
 const metrics=entityArchiveHub(registry,'song','zh',[{id:'event'},{id:'event'}]);
 assert.equal(metrics.find(metric=>metric.key==='credits').count,3);assert.equal(metrics.find(metric=>metric.key==='credits').records.length,1);
 assert.equal(metrics.find(metric=>metric.key==='performances').count,1);assert.equal(metrics.find(metric=>metric.key==='chronicle').count,1);
 assert.equal(entityArchiveHub(registry,'maker').find(metric=>metric.key==='credits').count,1);
 assert.equal(entityArchiveHub(registry,'release').find(metric=>metric.key==='trackEntries').count,2);
});
test('current artwork has unknown visual dates; release dates never become first-seen dates',()=>{
 const snapshot=archiveFixture(),song=snapshot.entities.find(row=>row.id==='song-a');song.image='/images/artists/kaf.jpg';song.facts.credits=[{role:'illustrator',name:'Recorded illustrator'}];
 const visual=visualRecords(snapshot,{q:'song-a'},'en')[0];assert.equal(visual.date,null);assert.equal(visual.designerName,'Recorded illustrator');assert.equal(visual.path,song.narratives.en.path);
 assert.equal(visualRecords(snapshot,{q:'song-a',year:'2024'},'en').length,0);
 song.facts.visualHistory=[{id:'dated',title:'Known use',image:song.image,date:'2024-02-29',sourceIds:['official']}];
 assert.equal(visualRecords(snapshot,{q:'song-a',until:'2023'},'en').length,0);assert.equal(visualRecords(snapshot,{q:'song-a',until:'2024'},'en')[0].id,'dated');
 song.facts.visualHistory[0].image='/images/artists/rim.png';song.facts.visualHistory.push({id:'older',title:'Earlier artwork',image:'/images/older.jpg',date:'2020-01-01'});
 const newest=visualRecords(snapshot,{q:'song-a'},'en');assert.deepEqual(newest.map(row=>row.id),['dated','older','song-a']);assert.equal(newest.at(-1).date,null);
 assert.deepEqual(visualRecords(snapshot,{q:'song-a',sort:'oldest'},'en').map(row=>row.id),['older','dated','song-a']);
 assert.equal(visualRecords(snapshot,{q:'song-a',sort:'title'},'en')[0].id,'older');
});
test('PhotoSwipe controls follow English, Japanese and both Traditional Chinese locales',()=>{
 assert.equal(galleryViewerCopy('en-US').close,'Close');assert.equal(galleryViewerCopy('ja').close,'閉じる');assert.equal(galleryViewerCopy('zh-Hant-TW').details,'圖片資料');assert.equal(galleryViewerCopy('zh-HK').close,'關閉');
});
