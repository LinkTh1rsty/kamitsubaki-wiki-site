import {galleryDraft} from '../lib/galleryDraftStore.mjs';
import {articleCreationCopy} from '../lib/articleCreationCopy.mjs';
// A file selection is local and recoverable before the private upload starts.
export function mountArticleAssets(root,{api,owner,currentOwner,onInsert,onPublicInsert,onLocalChange=()=>{},storage=galleryDraft}={}){
 const $=s=>root.querySelector(s),form=$('[data-article-asset-form]'),c=articleCreationCopy(root.dataset.locale),status=$('[data-article-asset-status]'),preview=$('[data-article-asset-preview]');
 const identity=new URL(location.href).searchParams.get('draft')||new URL(location.href).searchParams.get('id')||'new',key=`article-images:${owner}:${identity}`;
 let file=null,asset=null,publicItem=null,busy=false,previewUrl=null,generation=0,localQueue=Promise.resolve();
 const fields=['alt','caption','author','sourceTitle','sourceUrl','rightsBasis','rightsEvidence'];
 const metadata=()=>Object.fromEntries(fields.map(name=>[name,form.elements[name].value.trim()]));
 const say=message=>{status.textContent=message;};
 const persist=()=>{onLocalChange();const value={owner,file,asset,metadata:metadata()};localQueue=localQueue.catch(()=>{}).then(()=>storage('put',key,value)).catch(()=>say(c.local));return localQueue;};
 const update=()=>{form.elements.author.required=!publicItem;form.elements.sourceTitle.required=!publicItem;form.elements.insert.disabled=busy||!(asset||publicItem);form.elements.retry.hidden=!file||busy||Boolean(asset);form.elements.rightsEvidence.required=!publicItem&&form.elements.rightsBasis.value==='authorized';form.elements.sourceUrl.required=!publicItem&&form.elements.rightsBasis.value==='official';};
 function showPreview(blob){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(blob);preview.src=previewUrl;preview.hidden=false;}
 async function upload(){if(!file||busy)return;if(!owner||['guest','unverified'].includes(owner)||currentOwner()!==owner){say(c.login);return;}busy=true;update();const token=++generation;const data=new FormData();data.set('image',file,file.name);data.set('metadata',JSON.stringify({declaredMime:file.type}));say(c.staging);
  try{const response=await fetch(api+'/api/articles/assets',{method:'POST',credentials:'include',body:data,signal:AbortSignal.timeout(60000)});const result=await response.json();if(!response.ok)throw Error(result.error?.message||c.failed);if(token!==generation||currentOwner()!==owner)throw Error(c.login);asset=result.asset;await persist();say(c.staged);}
  catch(error){say(error.message||c.failed);}finally{busy=false;update();}
 }
 async function selectFile(chosen){if(!chosen)return;if(chosen.size>20*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(chosen.type)){say(c.failed);return;}file=chosen;asset=null;publicItem=null;showPreview(file);await persist();void upload();}
 form.elements.image.addEventListener('change',()=>void selectFile(form.elements.image.files?.[0]));
 form.addEventListener('input',event=>{if(event.target.name!=='image'){update();if(!publicItem)void persist();}});
 form.elements.retry.onclick=()=>void upload();
 form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity()||busy)return;const ref=metadata();if(!ref.alt||!publicItem&&(!ref.author||!ref.sourceTitle||!ref.rightsBasis)){say(c.required);return;}
  if(publicItem){onPublicInsert?.(publicItem,ref);return;}
  if(!asset||currentOwner()!==owner){say(c.login);return;}onInsert({...ref,assetId:asset.id},asset.reference);localQueue=localQueue.catch(()=>{}).then(()=>storage('delete',key)).catch(()=>say(c.local));file=null;asset=null;form.reset();preview.hidden=true;update();
 };
 update();
 return {selectFile,async open(item){form.elements.rightsBasis.querySelector('[value="original"]').textContent=item?c.creatorOriginal:c.original;publicItem=item||null;$('#ve-article-asset-title').textContent=item?c.images:c.upload;$('[data-article-asset-hint]').textContent=item?c.reuse:c.private;form.elements.insert.textContent=item?c.insertPublic:c.insert;for(const name of ['author','sourceTitle','sourceUrl','rightsEvidence'])form.elements[name].readOnly=Boolean(item);form.elements.rightsBasis.disabled=Boolean(item);form.elements.rightsEvidence.required=!item&&form.elements.rightsBasis.value==='authorized';form.elements.image.closest('label').hidden=Boolean(item);if(item){asset=null;form.elements.retry.hidden=true;preview.src=item.src;preview.hidden=false;for(const name of fields)form.elements[name].value=item[name]||'';form.elements.alt.value=item.title||'';form.elements.rightsBasis.value=item.rightsBasis||'';say('');update();return;}
   if(currentOwner()!==owner){if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=null;preview.removeAttribute('src');preview.hidden=true;say(c.login);update();form.elements.insert.disabled=true;return;}
   await localQueue;const saved=await storage('get',key).catch(()=>null);if(saved?.owner===owner){file=saved.file;asset=saved.asset;for(const [name,value]of Object.entries(saved.metadata||{}))if(form.elements[name])form.elements[name].value=value;if(file)showPreview(file);say(asset?c.staged:file?c.failed:'');update();}else if(!file){asset=null;preview.hidden=true;say(c.private);update();}
  },dispose(){++generation;if(previewUrl)URL.revokeObjectURL(previewUrl);}};
}
