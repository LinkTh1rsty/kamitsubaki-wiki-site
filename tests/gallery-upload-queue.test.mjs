import test from 'node:test';
import assert from 'node:assert/strict';
import {uploadGalleryFiles} from '../src/lib/galleryUploadQueue.mjs';

// Exercise the real Uppy scheduler against a controlled transport; no account,
// network or storage bucket is involved.
function transport(t){
 const requests=[];
 class XHR {
  upload={};status=0;statusText='';headers={};responseText='';
  open(method,url){this.method=method;this.url=url;}
  setRequestHeader(k,v){this.headers[k]=v;}
  send(body){this.body=body;requests.push(this);}
  abort(){this.aborted=true;}
  progress(loaded=4,total=4){this.upload.onprogress({loaded,total,lengthComputable:true});}
  async finish(status=200,body={saved:true}){this.status=status;this.responseText=JSON.stringify(body);await this.onload();}
 }
 const old=globalThis.XMLHttpRequest;globalThis.XMLHttpRequest=XHR;
 t.after(()=>{if(old)globalThis.XMLHttpRequest=old;else delete globalThis.XMLHttpRequest;});
 return requests;
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const jobs=n=>Array.from({length:n},(_,i)=>({id:'file-'+i,name:'same.png',file:new Blob(['data'],{type:'image/png'}),url:'https://local.invalid/uploads/batch/file-'+i+'?accountId=owner',metadata:{name:'same.png',width:2,height:2}}));
async function waitFor(check){for(let i=0;i<50&&!check();i++)await tick();assert.ok(check(),'expected transport event');}

test('Uppy limits concurrency to three, preserves file IDs/metadata and waits for server confirmation',async t=>{
 const requests=transport(t),progress=[],results=[];let done=false;
 const pending=uploadGalleryFiles(jobs(5),{onProgress:(id,p)=>progress.push({id,...p}),onResult:r=>results.push(r)}).then(result=>{done=true;return result;});
 await waitFor(()=>requests.length===3);requests[0].progress();await tick();
 assert.equal(done,false);assert.equal(results.length,0);assert.equal(progress.at(-1).phase,'saving');
 assert.equal(requests[0].withCredentials,true);assert.equal(requests[0].timeout,120000);
 assert.equal(requests[0].method,'POST');assert.equal(requests[0].body.get('image').name,'same.png');
 assert.deepEqual(JSON.parse(requests[0].body.get('metadata')),{name:'same.png',width:2,height:2});
 assert.deepEqual([...requests[0].body.keys()].sort(),['image','metadata']);
 await requests[0].finish();await waitFor(()=>requests.length===4);await requests[1].finish();await waitFor(()=>requests.length===5);
 await Promise.all(requests.slice(2).map(request=>request.finish()));
 assert.deepEqual((await pending).map(r=>r.id).sort(),jobs(5).map(j=>j.id));
 assert.equal(results.every(r=>!r.error),true);
});

test('409 identifies the exact card and is never retried',async t=>{
 const requests=transport(t),pending=uploadGalleryFiles(jobs(1),{locale:'en'});await waitFor(()=>requests.length===1);
 await requests[0].finish(409,{error:{message:'Already exists',code:'duplicate_image',fileId:'file-0',itemId:'existing'}});
 const [result]=await pending;assert.equal(requests.length,1);assert.equal(result.id,'file-0');assert.equal(result.error.status,409);assert.equal(result.error.itemId,'existing');assert.equal(result.error.code,'duplicate_image');
});

test('account cancellation aborts active requests and never starts queued files or reports success',async t=>{
 const requests=transport(t),controller=new AbortController(),results=[];
 const pending=uploadGalleryFiles(jobs(5),{signal:controller.signal,onResult:r=>results.push(r)});await waitFor(()=>requests.length===3);
 controller.abort();await assert.rejects(pending,{name:'AbortError'});await tick();assert.equal(requests.length,3);assert.ok(requests.every(r=>r.aborted));assert.equal(results.length,0);
 await assert.rejects(uploadGalleryFiles(jobs(1),{signal:controller.signal}),{name:'AbortError'});assert.equal(requests.length,3);
});

test('invalid JSON cannot become a staged image',async t=>{
 const requests=transport(t),pending=uploadGalleryFiles(jobs(1),{locale:'en'});await waitFor(()=>requests.length===1);
 requests[0].status=200;requests[0].responseText='invalid';await requests[0].onload();
 const [result]=await pending;assert.match(result.error.message,/Unexpected server response/);
});

test('temporary 503 retries the same file endpoint before reporting success',async t=>{
 const requests=transport(t),pending=uploadGalleryFiles(jobs(1));await waitFor(()=>requests.length===1);
 await requests[0].finish(503,{});await new Promise(resolve=>setTimeout(resolve,200));await waitFor(()=>requests.length===2);
 assert.equal(requests[1].url,requests[0].url);await requests[1].finish();assert.equal((await pending)[0].error,null);
});

test('expired login is not retried and returns the service message',async t=>{
 const requests=transport(t),pending=uploadGalleryFiles(jobs(1));await waitFor(()=>requests.length===1);
 await requests[0].finish(401,{error:{message:'请重新登录'}});const [result]=await pending;
 assert.equal(result.error.status,401);assert.equal(result.error.message,'请重新登录');assert.equal(requests.length,1);
});

test('a corrupt restored file cannot strand valid files in the queue',async t=>{
 const requests=transport(t),input=jobs(2);input[0].file=new Blob(['bad'],{type:'text/plain'});
 const pending=uploadGalleryFiles(input,{locale:'en'});await waitFor(()=>requests.length===1);assert.match(requests[0].url,/file-1/);
 await requests[0].finish();const result=await pending;assert.equal(result[0].id,'file-0');assert.equal(result[0].error.message,'Upload did not complete');assert.equal(result[1].error,null);
});
