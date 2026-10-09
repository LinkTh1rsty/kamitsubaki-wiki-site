import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryQueueSummary,galleryIssueMessage,galleryIssueSelector} from '../src/lib/galleryQueue.mjs';

const set=metadata=>({id:'set-1',title:'Design set 1',character:metadata.character||'',metadata});
const image=overrides=>({id:'photo-1',set:'set-1',state:'staged',file:{name:'image.png'},...overrides});
const metadata={character:'kaf',author:'Creator',sourceTitle:'Original post',rightsBasis:'original'};

test('staged images still explain each missing submission field in all five locales',()=>{
 for(const locale of ['zh','zh-tw','zh-hk','ja','en']){
  const summary=galleryQueueSummary([set({})],[image()],{locale});
  assert.equal(summary.ready,false);
  assert.deepEqual(summary.issues.map(issue=>issue.field),['character','author','sourceTitle','rightsBasis']);
  for(const issue of summary.issues){
   assert.ok(issue.message.length>issue.name.length+2);
   assert.ok(!issue.message.includes('undefined'));
   assert.equal(galleryIssueSelector(issue),`[name="${issue.field}"]`);
  }
 }
 assert.equal(galleryQueueSummary([set(metadata)],[image()]).ready,true);
});

test('missing shared attribution is listed once even when several images inherit it',()=>{
 const summary=galleryQueueSummary([set({...metadata,author:''})],[image(),image({id:'photo-2'})]);
 assert.deepEqual(summary.issues.map(issue=>issue.field),['author']);
 assert.equal(summary.issues[0].file,undefined);
});

test('each photo can provide attribution when shared fields are blank',()=>{
 const summary=galleryQueueSummary([set({character:'kaf'})],[image(metadata)]);
 assert.equal(summary.ready,true);
 assert.deepEqual(summary.issues,[]);
});

test('official sources and authorization details are required by the effective usage basis',()=>{
 const official=galleryQueueSummary([set({...metadata,rightsBasis:'official'})],[image()]);
 assert.deepEqual(official.issues.map(issue=>issue.field),['sourceUrl']);
 assert.equal(official.issues[0].file,undefined);
 assert.equal(galleryQueueSummary([set({...metadata,rightsBasis:'official',sourceUrl:'https://example.com/source'})],[image()]).ready,true);
 const authorized=galleryQueueSummary([set(metadata)],[image({rightsBasis:'authorized'})]);
 assert.deepEqual(authorized.issues.map(issue=>issue.field),['rightsEvidence']);
 assert.equal(authorized.issues[0].file,'photo-1');
 assert.equal(galleryIssueSelector(authorized.issues[0]),'[data-file-field="rightsEvidence"]');
 assert.equal(galleryQueueSummary([set(metadata)],[image({rightsBasis:'authorized',rightsEvidence:'Creator granted permission'})]).ready,true);
});

test('malformed sources and dates point to the actual shared or per-photo input',()=>{
 const summary=galleryQueueSummary([set({...metadata,date:'10/9',sourceUrl:'javascript:alert(1)'})],[image({sourceUrl:'example.com/source'})]);
 assert.deepEqual(summary.issues.map(issue=>[issue.code,issue.field,Boolean(issue.file)]),[['invalidSource','sourceUrl',false],['invalidDate','date',false],['invalidSource','sourceUrl',true]]);
 assert.equal(galleryIssueSelector(summary.issues[0]),'[name="sourceUrl"]');
 assert.equal(galleryIssueSelector(summary.issues[1]),'[name="date"]');
 assert.equal(galleryIssueSelector(summary.issues[2]),'[data-file-field="sourceUrl"]');
});

test('missing messages have a readable fallback and file recovery focuses the photo',()=>{
 assert.equal(galleryIssueMessage({set:'set-1',field:'author'},'zh'),'set-1：请填写图片作者');
 assert.ok(galleryIssueMessage({set:'set-1',field:'unknown'},'en').includes('Add photos'));
 const summary=galleryQueueSummary([set(metadata)],[image({state:'queued',fileInfo:{name:'image.png'}})]);
 assert.equal(summary.issues[0].code,'missingFile');
 assert.equal(galleryIssueSelector(summary.issues[0]),'[data-file-inspect]');
 assert.equal(summary.ready,false);
});
