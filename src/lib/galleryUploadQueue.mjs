import Uppy from '@uppy/core';
import XHRUpload from '@uppy/xhr-upload';
import {uploadLimits,uploadProgress,uploadErrorCopy} from './uploadPresentation.mjs';

// Only transport/queueing belongs to Uppy. Drafts, account ownership and review
// transitions stay in the workbench; a successful transfer is not publication.
export async function uploadGalleryFiles(jobs,{signal,locale='zh',onProgress=()=>{},onResult=()=>{}}={}) {
 const copy=uploadErrorCopy(locale),aborted=()=>new DOMException(copy.aborted,'AbortError');
 if(signal?.aborted)throw aborted();
 if(!jobs.length)return [];
 const queue=new Uppy({autoProceed:false,restrictions:{maxNumberOfFiles:uploadLimits.batchFiles,maxFileSize:uploadLimits.fileBytes,allowedFileTypes:['image/png','image/jpeg','image/webp','image/gif']}});
 const byId=new Map(),results=[],timedOut=new WeakSet();
 let stopped=false,rejectAbort;
 const cancelled=new Promise((_,reject)=>{rejectAbort=reject;});
 const abort=()=>{stopped=true;queue.cancelAll();rejectAbort(aborted());};
 const report=(file,error,response)=>{
  if(stopped||!file)return;
  const job=byId.get(file.id),result={id:job.id,error,response};results.push(result);onResult(result);
 };
 queue.use(XHRUpload,{
  endpoint:file=>byId.get(file.id).url,method:'POST',fieldName:'image',formData:true,
  allowedMetaFields:['metadata'],withCredentials:true,limit:uploadLimits.concurrency,
  // XHR's absolute deadline also covers waiting for the server after 100%.
  timeout:0,onBeforeRequest(xhr){xhr.timeout=120000;xhr.ontimeout=()=>{timedOut.add(xhr);xhr.onerror();};},
  shouldRetry:xhr=>!stopped&&(xhr.status===0||xhr.status===408||xhr.status===429||xhr.status>=500),
  getResponseData(xhr){try{return JSON.parse(xhr.responseText);}catch{throw Error(copy.badResponse);}},
 });
 queue.on('upload-progress',(file,progress)=>{if(!stopped&&file)onProgress(byId.get(file.id).id,uploadProgress(progress.bytesUploaded,progress.bytesTotal));});
 queue.on('upload-success',(file,response)=>report(file,null,response.body));
 queue.on('upload-error',(file,error,xhr)=>{
  let detail;try{detail=JSON.parse(xhr?.responseText||'{}').error;}catch{}
  const message=detail?.message||(xhr&&timedOut.has(xhr)?copy.timeout:xhr?.status===0?copy.network:error.message===copy.badResponse?copy.badResponse:copy.failed);
  report(file,Object.assign(Error(message),{status:xhr?.status,code:detail?.code,fileId:detail?.fileId,itemId:detail?.itemId}));
 });
 try {
  for(const job of jobs){
   // Uppy derives its own ID. relativePath distinguishes same-named files in
   // different sets; only metadata is sent, never this internal path.
   try{
    const id=queue.addFile({name:job.name||job.file.name,type:job.file.type,data:job.file,meta:{relativePath:job.id,metadata:JSON.stringify(job.metadata)}});
    byId.set(id,job);
   }catch(error){
    if(!error.isRestriction)throw error;
    const result={id:job.id,error:Error(copy.failed)};results.push(result);onResult(result);
   }
  }
  if(!byId.size)return results;
  signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)abort();
  await Promise.race([queue.upload(),cancelled]);
  return results;
 } finally {stopped=true;signal?.removeEventListener('abort',abort);queue.destroy();}
}
