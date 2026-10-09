import test from 'node:test';
import assert from 'node:assert/strict';
import {galleryFileHash,findExistingGalleryFile} from '../src/lib/galleryFileIdentity.mjs';
test('same filename and byte size are not duplicate identity',async()=>{
 const a={id:'a',file:new Blob(['one'])},b={id:'b',file:new Blob(['two'])};a.sha256=await galleryFileHash(a.file);
 assert.equal(await findExistingGalleryFile(b,[a,b],async()=>({matches:[]})),null);assert.notEqual(a.sha256,b.sha256);
});
test('actual byte duplicates are identified before a private upload',async()=>{
 const a={id:'a',file:new Blob(['same'])},b={id:'b',file:new Blob(['same'])};a.sha256=await galleryFileHash(a.file);
 assert.deepEqual(await findExistingGalleryFile(b,[a,b],async()=>assert.fail('local duplicates do not need lookup')),{kind:'batch',id:'a'});
});
test('public hash matches are explicit; an unavailable additive endpoint allows staging',async()=>{
 const file={id:'file',file:new Blob(['content'])};const result=await findExistingGalleryFile(file,[file],async(path,method,body)=>{assert.equal(path,'/assets/lookup');assert.equal(method,'POST');return {matches:[{sha256:body.hashes[0],id:'public',src:'https://example.test/image'}]};});assert.equal(result.kind,'public');
 assert.equal(await findExistingGalleryFile(file,[file],async()=>{throw Error('offline');}),null);
});
