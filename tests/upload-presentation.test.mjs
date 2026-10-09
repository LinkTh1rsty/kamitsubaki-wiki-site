import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadProgress,formatBytes} from '../src/lib/uploadPresentation.mjs';
import {normalizeAccent,normalizeTheme,resolveTheme} from '../src/lib/appearance.mjs';
test('unknown transfer length does not invent a percentage',()=>{assert.equal(uploadProgress(256,0).percent,null);assert.equal(formatBytes(220160),'215.0 KB');});
test('appearance defaults to monochrome while preserving the system light preference',()=>{assert.equal(normalizeAccent('invalid'),'mono');assert.equal(normalizeTheme('light'),'light');assert.equal(resolveTheme('system',true),'dark');assert.equal(resolveTheme('system',false),'light');});

test('gallery workflow only permits submit when every set is valid and every image is staged',async()=>{
 const {galleryQueueSummary}=await import('../src/lib/galleryQueue.mjs');const sets=[{id:'a',title:'设定 A',character:'kaf'},{id:'b',title:'设定 B',character:''}],files=[{id:'one',set:'a',state:'staged',file:{name:'one.png'}}];
 const incomplete=galleryQueueSummary(sets,files);assert.equal(incomplete.ready,false);assert.equal(incomplete.issues.length,2);assert.equal(incomplete.staged,1);
 const complete=galleryQueueSummary(sets.slice(0,1),files);assert.equal(complete.ready,true);
 files.push({id:'two',set:'a',state:'failed',file:{name:'two.png'}});const failed=galleryQueueSummary(sets.slice(0,1),files);assert.equal(failed.pending,1);assert.equal(failed.failed,1);assert.equal(failed.ready,false);
});
