import test from 'node:test';
import assert from 'node:assert/strict';
import {GalleryDraftController} from '../src/lib/galleryDraftController.mjs';
const deferred=()=>{let resolve;const promise=new Promise(done=>resolve=done);return {promise,resolve};};
function fixture(options={}){
 let content={kind:'photos',defaults:{sourceTitle:'First'},photos:[]},remote={id:'stable-batch',version:0,status:'draft'},local;
 const calls=[];
 const request=async(path,method='GET',body)=>{calls.push({path,method,body:structuredClone(body)});if(method==='POST')return {batch:{...remote}};if(method==='GET')return {batch:{...remote,manifest:{kind:'photos',defaults:{sourceTitle:'Other device'},photos:[]}},files:[]};if(body.version!==remote.version)throw Object.assign(Error('changed'),{status:409});remote={...remote,version:remote.version+1,manifest:structuredClone(body.manifest)};return {batch:{...remote}};};
 const controller=new GalleryDraftController({id:remote.id,kind:'photos',readManifest:()=>content,readSnapshot:()=>({manifest:content,files:[]}),saveLocal:async value=>{local=structuredClone(value);},request,delay:100000,...options});
 return {controller,calls,get local(){return local;},get remote(){return remote;},set content(value){content=value;},set remoteVersion(value){remote.version=value;}};
}
test('stable batch ID is persisted before creation; a lost response reuses it',async()=>{
 const f=fixture();const normal=f.controller.request;let lose=true;
 f.controller.request=async(...args)=>{assert.equal(f.local.id,'stable-batch');const response=await normal(...args);if(args[1]==='POST'&&lose){lose=false;throw Error('offline');}return response;};
 f.controller.changed();await assert.rejects(f.controller.sync(),/offline/);assert.equal(f.controller.cloudState,'offline');
 await f.controller.sync();assert.deepEqual(f.calls.filter(call=>call.method==='POST').map(call=>call.body.id),['stable-batch','stable-batch']);assert.equal(f.remote.manifest.defaults.sourceTitle,'First');f.controller.close();
});
test('typing during an in-flight cloud save is sent in a second CAS write',async()=>{
 const f=fixture(),gate=deferred(),normal=f.controller.request;let waiting=true;
 f.controller.request=async(...args)=>{if(args[1]==='PUT'&&waiting){waiting=false;await gate.promise;}return normal(...args);};
 f.controller.changed();const saving=f.controller.sync();while(waiting)await new Promise(resolve=>setImmediate(resolve));
 f.content={kind:'photos',defaults:{sourceTitle:'Typed while uploading'},photos:[]};f.controller.changed();gate.resolve();await saving;
 assert.deepEqual(f.calls.filter(call=>call.method==='PUT').map(call=>call.body.version),[0,1]);assert.equal(f.remote.manifest.defaults.sourceTitle,'Typed while uploading');assert.equal(f.local.cloudPending,false);f.controller.close();
});
test('two callers share one write flight and never duplicate the batch',async()=>{
 const f=fixture();f.controller.changed();await Promise.all([f.controller.sync(),f.controller.sync(),f.controller.ensureBatch()]);
 assert.equal(f.calls.filter(call=>call.method==='POST').length,1);assert.equal(f.calls.filter(call=>call.method==='PUT').length,1);f.controller.close();
});
test('409 preserves local content and pauses automatic writes until explicit resolution',async()=>{
 const f=fixture();f.remoteVersion=2;f.controller.changed();await assert.rejects(f.controller.sync(),{status:409});
 assert.equal(f.local.manifest.defaults.sourceTitle,'First');assert.equal(f.controller.cloudState,'conflict');const before=f.calls.length;await assert.rejects(f.controller.sync(),{status:409});assert.equal(f.calls.length,before);
 await f.controller.resolve('local');assert.equal(f.remote.manifest.defaults.sourceTitle,'First');assert.equal(f.remote.version,3);assert.equal(f.controller.conflict,null);f.controller.close();
});
test('choosing the remote conflict copy applies it without overwriting the server',async()=>{
 const f=fixture();let chosen;f.controller.applyRemote=async remote=>{chosen=remote.batch.manifest;f.content=chosen;};f.remoteVersion=1;f.controller.changed();await assert.rejects(f.controller.sync());const writes=f.calls.filter(call=>call.method==='PUT').length;
 await f.controller.resolve('remote');assert.equal(chosen.defaults.sourceTitle,'Other device');assert.equal(f.calls.filter(call=>call.method==='PUT').length,writes);assert.equal(f.local.manifest.defaults.sourceTitle,'Other device');f.controller.close();
});
test('offline content is local and resumes without losing metadata or replacing files',async()=>{
 const f=fixture(),normal=f.controller.request;f.controller.request=async()=>{throw Error('network');};f.controller.changed();await assert.rejects(f.controller.sync());assert.equal(f.local.manifest.defaults.sourceTitle,'First');
 f.controller.request=normal;await f.controller.sync();assert.equal(f.controller.cloudState,'saved');f.controller.close();
});
test('a failed local checkpoint cannot start a cloud operation',async()=>{
 const f=fixture({saveLocal:async()=>{throw Error('quota');}});f.controller.changed();await assert.rejects(f.controller.sync(),/quota/);assert.equal(f.calls.length,0);assert.equal(f.controller.localState,'error');f.controller.close();
});
test('an account change during a write cannot replace the saved draft with cleared UI data',async()=>{
 const f=fixture(),gate=deferred(),normal=f.controller.request;let waiting=true;
 f.controller.request=async(...args)=>{if(args[1]==='PUT'){waiting=false;await gate.promise;}return normal(...args);};
 f.controller.changed();const flight=f.controller.sync();while(waiting)await new Promise(resolve=>setImmediate(resolve));
 f.controller.close();f.content={kind:'photos',defaults:{},photos:[]};await f.controller.persist();gate.resolve();await flight;
 assert.equal(f.local.manifest.defaults.sourceTitle,'First');assert.equal(f.local.cloudPending,true);
});
test('a restored version conflict still writes the chosen local copy without new typing',async()=>{
 const f=fixture();f.remoteVersion=3;f.controller.conflict={batch:{version:3}};
 await f.controller.resolve('local');assert.equal(f.remote.version,4);assert.equal(f.remote.manifest.defaults.sourceTitle,'First');f.controller.close();
});

test('local state stays saving until the latest queued snapshot has completed',async()=>{
 const first=deferred(),second=deferred();let writes=0;
 const f=fixture({saveLocal:async()=>{await (++writes===1?first.promise:second.promise);}});
 const a=f.controller.persist(),b=f.controller.persist();
 await new Promise(resolve=>setImmediate(resolve));first.resolve();await a;
 assert.equal(f.controller.localState,'saving');second.resolve();await b;
 assert.equal(f.controller.localState,'saved');f.controller.close();
});

test('an account change while fetching a conflict copy cannot restore private UI content',async()=>{
 const f=fixture(),gate=deferred();let applied=false;
 f.controller.conflict={batch:{version:1}};f.controller.request=async()=>{await gate.promise;return {batch:{status:'draft',version:1,manifest:{}}};};f.controller.applyRemote=async()=>{applied=true;};
 const resolving=f.controller.resolve('remote');f.controller.close();gate.resolve();await resolving;
 assert.equal(applied,false);assert.equal(f.local,undefined);
});
