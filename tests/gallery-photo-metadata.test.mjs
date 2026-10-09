import test from 'node:test';
import assert from 'node:assert/strict';
import {photoFieldLimits,updatePhotoTags,photoMetadataCopy} from '../src/lib/galleryPhotoMetadata.mjs';

test('blank override inherits shared tags while explicit clear survives JSON draft serialization',()=>{
 const metadata={tags:['prior override']};updatePhotoTags(metadata,'');assert.equal(Object.hasOwn(metadata,'tags'),false);
 assert.deepEqual({...{tags:['shared']},...metadata}.tags,['shared']);
 updatePhotoTags(metadata,'',{clear:true});const restored=JSON.parse(JSON.stringify(metadata));assert.deepEqual({...{tags:['shared']},...restored}.tags,[]);
 updatePhotoTags(metadata,'portrait， official,  live ');assert.deepEqual(metadata.tags,['portrait','official','live']);
});
test('per-photo provenance controls match allowed metadata lengths and all locales explain empty tags',()=>{
 assert.equal(photoFieldLimits.sourceTitle,300);assert.equal(photoFieldLimits.rightsEvidence,2000);assert.equal(photoFieldLimits.sourceUrl,2000);assert.equal(photoFieldLimits.title,200);assert.equal(photoFieldLimits.author,200);
 for(const locale of ['zh','zh-tw','zh-hk','ja','en'])assert.ok(photoMetadataCopy(locale).clearTags);
});
