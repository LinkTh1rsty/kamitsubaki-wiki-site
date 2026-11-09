import {applyGalleryPreview} from '../lib/galleryPreviewImage.mjs';
import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import {uploadStatusTarget} from '../lib/uploadStatusTarget.mjs';
import {galleryDraft} from '../lib/galleryDraftStore.mjs';
import {refreshAuth,state} from './accountStore.js';
import {uploadGalleryFiles} from '../lib/galleryUploadQueue.mjs';
import {submitSharedImages} from '../lib/sharedImageUpload.mjs';

export function mountImageLibrary(root,{onChoose,onCover}={}){
 if(!root)return null;
 const $=s=>root.querySelector(s),c=JSON.parse(root.dataset.copy),locale=root.dataset.locale,api=root.dataset.api.replace(/\/$/,''),form=$('[data-library-upload]');
 const allowUpload=root.dataset.allowUpload!=='false';
 const node=(tag,value='')=>Object.assign(document.createElement(tag),{textContent:value});
 let tab='public',next=null,epoch=0,searchTimer,controller,operation=null,busy=false,owner=null,selected=[],urls=[],saveQueue=Promise.resolve(),locallySaved=false,saveGeneration=0;
 const loadedIds=new Set();
 const status=(message,error=false)=>{const el=$('[data-library-status]');if(message===c.loading)setLoadingStatus(el,message);else el.textContent=message;el.dataset.error=String(error);};
 const safeUrl=value=>{try{const url=new URL(value,location.href);return ['https:','http:'].includes(url.protocol)?url.href:null;}catch{return null;}};
 function link(label,href){const a=node('a',label);a.href=href;if(onChoose){a.target='_blank';a.rel='noopener';}$('[data-library-links]').append(a);return a;}
 async function request(path,method='GET',body,publicRead=false,signal){
  const url=new URL(api+'/api/gallery'+path);const requestOwner=owner;
  if(!publicRead&&requestOwner)url.searchParams.set('accountId',requestOwner);
  const response=await fetch(url,{method,credentials:publicRead?'omit':'include',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:signal||AbortSignal.timeout(20000)});
  let data;try{data=await response.json();}catch{throw Error(c.error);}
  if(!publicRead&&requestOwner!==state.viewer?.userId)throw Error(c.login);
  if(!response.ok)throw Object.assign(Error(data.error?.message||c.error),{status:response.status,...data.error});return data;
 }
 const metadata=()=>Object.fromEntries(['author','sourceTitle','sourceUrl','rightsBasis','rightsEvidence','purpose'].map(key=>[key,form.elements[key].value.trim()]));
 const localKey=()=>`shared-images:${api}:${owner}:${root.dataset.picker}`;
 function persist(clear=false){
  if(!owner||!allowUpload||!selected.length&&!clear)return Promise.resolve();
  const generation=++saveGeneration,key=localKey(),savedOwner=owner,action=selected.length?'put':'delete',value=structuredClone({files:selected,metadata:metadata(),operation});locallySaved=false;
  saveQueue=saveQueue.catch(()=>{}).then(()=>galleryDraft(action,key,value)).then(()=>{if(owner===savedOwner&&generation===saveGeneration){locallySaved=true;$('[data-library-local-status]').textContent=value.files.length?c.localSaved:'';}}).catch(()=>{if(owner===savedOwner&&generation===saveGeneration){locallySaved=false;$('[data-library-local-status]').textContent=c.localFailed;}});
  return saveQueue;
 }
 async function offerRestore(){
  if(!owner||!allowUpload||selected.length)return;
  const savedOwner=owner,key=localKey(),saved=await galleryDraft('get',key).catch(()=>null);
  if(owner!==savedOwner||selected.length||tab!=='upload')return;
  const button=$('[data-library-restore]');button.hidden=!saved?.files?.length;
  button.onclick=()=>{if(owner!==savedOwner||busy)return;for(const [key,value] of Object.entries(saved.metadata||{}))if(form.elements[key])form.elements[key].value=value;
   evidence();setFiles(saved.files,false);operation=saved.operation||null;button.hidden=true;void persist();
   if(operation?.batch)link(c.recover,`/${locale}/gallery/manage/photos/?batch=${encodeURIComponent(operation.id)}`);
  };
 }
 async function signIn(){await refreshAuth(true);owner=state.viewer?.userId||null;if(owner)return true;status(state.auth==='unavailable'?(state.unavailableReason||c.error):c.login,state.auth==='unavailable');$('[data-library-links]').replaceChildren();if(state.auth!=='unavailable')link(c.loginAction,`/${locale}/account/?returnTo=${encodeURIComponent(location.href)}`);return false;}
 async function choose(item,cover=false){
  const current=(await request('/items/'+encodeURIComponent(item.id),'GET',null,true)).item;
  const src=safeUrl(current.src);if(!src)throw Error(c.error);
  if(cover&&onCover)onCover({...current,src});else if(onChoose)onChoose({...current,src});else {await navigator.clipboard.writeText(src);status(c.copied);}
 }
 function card(item,mine){
  const el=node('article');el.className='image-library-card';const body=node('div'),image=new Image(),meta=mine?item.metadata:item;
  image.alt=meta.title||'';image.loading='lazy';const src=safeUrl(mine?item.previewUrl:item.thumbnail||item.src);if(src){if(mine)image.src=src;else applyGalleryPreview(image,{...item,src},{api,sizes:'(max-width:700px) 40vw, 160px'});}
  body.append(node('strong',meta.title||item.item_id||item.id),node('p',meta.purpose==='entry'?c.entry:c.gallery));
  if(mine){body.append(node('p',item.status==='approved'&&!item.is_public?c.hidden:c[item.status]||item.status));if(item.review_note)body.append(node('p',item.review_note));}
  else {body.append(node('p',[meta.author,meta.sourceTitle].filter(Boolean).join(' · ')));}
  if(!mine||item.status==='approved'&&item.is_public){
   const button=node('button',onChoose?c.choose:c.copy);button.type='button';button.onclick=async()=>{button.disabled=true;try{await choose({id:mine?item.item_id:item.id});}catch(error){status(error.message,true);}finally{button.disabled=false;}};body.append(button);
   if(onCover){const cover=node('button',c.cover);cover.type='button';cover.onclick=async()=>{cover.disabled=true;try{await choose({id:mine?item.item_id:item.id},true);}catch(error){status(error.message,true);}finally{cover.disabled=false;}};body.append(cover);}
  }
  if(mine&&item.batch_id){const a=node('a',c.editBatch);a.href=`/${locale}/account/creator/?recordType=gallery&record=${encodeURIComponent(item.batch_id)}`;body.append(a);}
  if(!mine){const a=node('a',c.view);a.href=`/${locale}/gallery/?photo=${encodeURIComponent(item.id)}`;a.target='_blank';a.rel='noopener';body.append(a);}
  el.append(image,body);return el;
 }
 async function load(append=false){
  if(tab==='upload'||append&&next==null)return;
  clearTimeout(searchTimer);controller?.abort();controller=new AbortController();const token=++epoch;
  status(c.loading);$('[data-library-links]').replaceChildren();$('[data-library-more]').hidden=true;
  $('[data-library-more]').disabled=true;
  if(!append){$('[data-library-grid]').replaceChildren();loadedIds.clear();next=null;}
  try{
   if(tab==='mine'&&!await signIn())return;
   if(token!==epoch)return;
   const query=new URLSearchParams({offset:String(append?next||0:0)}),mine=tab==='mine';if(mine)query.set('uploadsOnly','1');
   if(!mine){if($('[data-library-search]').value.trim())query.set('q',$('[data-library-search]').value.trim());if($('[data-library-purpose]').value)query.set('purpose',$('[data-library-purpose]').value);}
   const data=await request((mine?'/revisions':'/items')+'?'+query,'GET',null,!mine,controller.signal);
   if(token!==epoch)return;
   const items=mine?data.revisions:data.items;for(const item of items){if(item.id&&loadedIds.has(item.id))continue;if(item.id)loadedIds.add(item.id);$('[data-library-grid]').append(card(item,mine));}next=data.nextOffset;
   $('[data-library-more]').hidden=next==null;status($('[data-library-grid]').children.length?'':c.empty);
  }catch(error){if(token===epoch){if(error.name!=='AbortError')status(error.message||c.error,true);if(append&&next!=null&&$('[data-library-grid]').childElementCount)$('[data-library-more]').hidden=false;}}
  finally{if(token===epoch)$('[data-library-more]').disabled=false;}
 }
 function show(nextTab){if(busy||nextTab==='upload'&&!allowUpload)return;tab=nextTab;++epoch;controller?.abort();clearTimeout(searchTimer);
  root.querySelectorAll('[data-library-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.libraryTab===tab)));
  form.hidden=tab!=='upload';$('[data-library-browse]').hidden=tab==='upload';$('[data-library-search]').closest('label').hidden=tab==='mine';$('[data-library-purpose]').closest('label').hidden=tab==='mine';$('[data-library-links]').replaceChildren();
  if(tab==='upload'){status('');form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);void signIn().then(ok=>{if(tab!=='upload')return;form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=!ok);if(ok){if(selected.length)void persist();else void offerRestore();}});}else { $('[data-library-restore]').hidden=true;void load();}
 }
 function setFiles(files,save=true){if(busy)return;selected=[...files];operation=null;locallySaved=false;$('[data-library-restore]').hidden=true;urls.forEach(URL.revokeObjectURL);urls=[];const list=$('[data-library-files]');list.replaceChildren();
  for(const file of selected){const figure=node('figure'),image=new Image(),url=URL.createObjectURL(file);urls.push(url);image.src=url;image.alt='';figure.append(image,node('figcaption',file.name));const remove=node('button',c.remove);remove.type='button';remove.onclick=()=>{if(busy)return;const prior=operation,index=selected.indexOf(file);setFiles(selected.filter((_,i)=>i!==index),false);if(prior){prior.files.splice(index,1);operation=prior;}void persist(!selected.length);};figure.append(remove);list.append(figure);}
  if(save)void persist(!selected.length);
 }
 root.querySelectorAll('[data-library-tab]').forEach(button=>button.onclick=()=>show(button.dataset.libraryTab));
 $('[data-library-refresh]').onclick=()=>void load();$('[data-library-more]').onclick=()=>void load(true);
 $('[data-library-search]').oninput=()=>{controller?.abort();++epoch;clearTimeout(searchTimer);searchTimer=setTimeout(()=>void load(),300);};$('[data-library-purpose]').onchange=()=>void load();
 form.addEventListener('input',event=>{if(event.target!==form.elements.images&&!busy)void persist();});
 form.elements.images.onchange=()=>setFiles(form.elements.images.files);
 const evidence=()=>{$('[data-library-evidence]').hidden=form.elements.rightsBasis.value!=='authorized';form.elements.rightsEvidence.required=form.elements.rightsBasis.value==='authorized';form.elements.sourceUrl.required=form.elements.rightsBasis.value==='official';};form.elements.rightsBasis.onchange=evidence;evidence();
 form.onsubmit=async event=>{event.preventDefault();if(!allowUpload||busy||!form.reportValidity()||!await signIn())return;
  if(busy)return;
  if(!selected.length||selected.length>100||selected.some(file=>file.size>20*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))){status(c.required+' '+c.limit,true);return;}
  const metadata=Object.fromEntries(['author','sourceTitle','sourceUrl','rightsBasis','rightsEvidence','purpose'].map(key=>[key,form.elements[key].value.trim()]));
  if(!operation)operation={id:crypto.randomUUID(),files:selected.map(file=>({id:crypto.randomUUID(),file})),metadata,owner};
  if(operation.owner!==owner){status(c.login,true);return;}operation.metadata=metadata;
  busy=true;const uploadController=new AbortController();const expectedOwner=owner;
  const accountChanged=()=>{if(state.viewer?.userId!==expectedOwner)uploadController.abort();};window.addEventListener('kamitsubaki-account-state',accountChanged);
  form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);status(c.sending);$('[data-library-links]').replaceChildren();
  try{
   const result=await submitSharedImages(operation,{request,onState:()=>persist(),onPhase:phase=>status(phase==='upload'?c.staging:c.reviewing),onBatch:batch=>link(c.recover,`/${locale}/gallery/manage/photos/?batch=${encodeURIComponent(batch.id)}`),upload:(files,batchId)=>uploadGalleryFiles(files.map(file=>({...file,url:`${api}/api/gallery/uploads/${batchId}/${file.id}?accountId=${encodeURIComponent(owner)}`,metadata:{name:file.file.name}})),{locale,signal:uploadController.signal,statusTarget:uploadStatusTarget(root)})});
   if(state.viewer?.userId!==expectedOwner)throw Error(c.login);
   status(c.submitted);$('[data-library-links]').replaceChildren();link(c.creator,`/${locale}/account/creator/?recordType=gallery&record=${encodeURIComponent(result.batchId||operation.id)}`);
   operation=null;busy=false;setFiles([]);form.elements.images.value='';
  }catch(error){status((error.message==='upload_incomplete'?c.failed:error.message)||c.failed,true);if(error.itemId)link(c.view,`/${locale}/gallery/?photo=${encodeURIComponent(error.itemId)}`);}
  finally{busy=false;window.removeEventListener('kamitsubaki-account-state',accountChanged);form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=!owner);}
 };
 window.addEventListener('kamitsubaki-account-state',()=>{if(owner&&state.viewer?.userId!==owner){owner=null;operation=null;selected=[];locallySaved=false;$('[data-library-restore]').hidden=true;$('[data-library-local-status]').textContent='';urls.forEach(URL.revokeObjectURL);urls=[];form.reset();evidence();$('[data-library-files]').replaceChildren();++epoch;controller?.abort();$('[data-library-grid]').replaceChildren();$('[data-library-links]').replaceChildren();status(c.login);}});
 const unload=event=>{if(busy||selected.length&&!locallySaved){event.preventDefault();event.returnValue='';}};window.addEventListener('beforeunload',unload);
 document.addEventListener('astro:before-swap',()=>{controller?.abort();clearTimeout(searchTimer);urls.forEach(URL.revokeObjectURL);window.removeEventListener('beforeunload',unload);},{once:true});
 return {open(files=[],initialTab=root.dataset.libraryStart||'public'){show(files.length&&allowUpload?'upload':initialTab);if(files.length&&allowUpload)setFiles(files);},refresh:load};
}
