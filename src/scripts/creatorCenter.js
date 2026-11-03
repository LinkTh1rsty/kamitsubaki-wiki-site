import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import {reviewCopy} from '../lib/reviewCopy.mjs';
import {confirmDialog} from '../lib/confirmDialog.mjs';
import {state,refreshAuth,loginUrl} from './accountStore.js';
import {createContextAction} from '../lib/contextAction.js';
import {articleLocalDraftRecord,articleLocalKeysForRevision} from '../lib/articleDraftStorage.mjs';
import {galleryDraft,listGalleryDrafts} from '../lib/galleryDraftStore.mjs';

const root=document.querySelector('[data-creator-center]');
if(root){
 const $=selector=>root.querySelector(selector),c=JSON.parse(root.dataset.copy),locale=root.dataset.locale;
 const api=root.dataset.api.replace(/\/$/,''),editorApi=root.dataset.editorApi.replace(/\/$/,'');
 const text=(tag,value,className)=>{const node=document.createElement(tag);node.textContent=String(value??'');if(className)node.className=className;return node;};
 let owner=null,ownerGeneration=0,listGeneration=0,localDraftGeneration=0,items=[],notifications=[],unreadCount=0,nextOffset=null,detailTrigger=null,searchTimer,pollTimer,pollCount=0;
 const request=async(base,path,method='GET',body)=>{
  const response=await fetch(base+path,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  if(!(response.headers.get('content-type')||'').includes('application/json'))throw Object.assign(Error(c.error),{status:response.status});
  const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error?.message||data.error?.code||(typeof data.error==='string'?data.error:null)||c.error),{status:response.status});return data;
 };
 const account=(path,method,body)=>request(api,'/api/account'+path,method,body);
 const params=()=>new URLSearchParams(location.search);
 const normalizeLegacy=()=>{const p=params();if(p.has('batch')){p.set('recordType','gallery');p.set('record',p.get('batch'));p.delete('batch');history.replaceState(history.state,'',location.pathname+'?'+p);}else if(p.has('revision')){p.set('recordType','gallery');p.set('record',p.get('revision'));p.delete('revision');history.replaceState(history.state,'',location.pathname+'?'+p);}};
 const filters=()=>{const p=params();return {q:p.get('q')||'',type:p.get('type')||'',state:p.get('state')||'',offset:Math.max(0,Number(p.get('offset'))||0)};};
 const setUrl=(changes,replace=false)=>{const url=new URL(location.href);for(const [key,value]of Object.entries(changes)){if(value===null||value===''||value===0)url.searchParams.delete(key);else url.searchParams.set(key,String(value));}(replace?history.replaceState:history.pushState).call(history,{creatorScroll:window.scrollY},'',url);};
 const returnTo=()=>location.pathname+location.search;
 const withReturn=href=>{const url=new URL(href,location.origin);if(url.origin!==location.origin)return url.href;url.searchParams.set('returnTo',returnTo());return url.pathname+url.search+url.hash;};
 const typeName=type=>c[type]||type;
 const stateName=row=>c.phase?.[row.phase]||c.status[row.state]||row.raw_status;
 const nextTarget=row=>{
  if(row.type==='community')return `/${row.locale||locale}/community/activities/apply/?revision=${encodeURIComponent(row.id)}`;
  if(row.state==='draft'){
   if(row.type==='entry'&&row.kind==='draft')return `/${row.locale||locale}/contribute/editor/?draftPath=${encodeURIComponent(row.id)}`;
   if(row.type==='timeline')return `/${locale}/chronicle/submit/?draft=${encodeURIComponent(row.id)}`;
   if(row.type==='article')return `/${row.locale||locale}/articles/submit/?revision=${encodeURIComponent(row.id)}&draft=${encodeURIComponent(row.id)}`;
   if(row.type==='gallery'&&row.kind==='batch')return `/${locale}/gallery/manage/?batch=${encodeURIComponent(row.id)}`;
   if(row.type==='gallery'&&row.kind==='photos')return `/${locale}/gallery/manage/photos/?batch=${encodeURIComponent(row.id)}`;
  }
  if(row.state==='attention'){
   if(row.type==='timeline')return `/${locale}/chronicle/submit/?submission=${encodeURIComponent(row.id)}`;
   if(row.type==='entry')return `/${locale}/contribute/editor/?view=submissions&submission=${encodeURIComponent(row.id)}`;
   if(row.type==='article')return `/${row.locale||locale}/articles/submit/?revision=${encodeURIComponent(row.id)}&draft=${encodeURIComponent(row.id)}`;
   if(row.type==='gallery'&&row.kind==='set')return `/${locale}/gallery/manage/?revision=${encodeURIComponent(row.id)}`;
   if(row.type==='gallery'&&row.kind==='photos')return `/${locale}/gallery/manage/photos/?retry=${encodeURIComponent(row.id)}`;
   if(row.type==='gallery'&&row.kind==='legacy')return `/${locale}/gallery/manage/legacy/?revision=${encodeURIComponent(row.id)}`;
  }
  return null;
 };
 const openButton=(row,label)=>{if(row.type==='gallery'&&row.kind==='classification'&&row.state==='attention'){const button=text('button',label||c.revise);button.type='button';button.onclick=async()=>{const accountId=owner,generation=ownerGeneration;button.disabled=true;try{const {revisions}=await request(api,'/api/gallery/batches/'+encodeURIComponent(row.id)+'/submissions');if(owner!==accountId||ownerGeneration!==generation)return;const ids=revisions.filter(item=>item.status==='rejected').map(item=>item.item_id);if(!ids.length)throw Error(c.error);location.assign(withReturn(`/${locale}/gallery/classify/?ids=${encodeURIComponent(ids.join(','))}`));}catch(error){$('[data-creator-status]').textContent=error.message;button.disabled=false;}};return button;}const target=nextTarget(row),actionLabel=label||(row.state==='draft'?c.continue:row.state==='attention'?(target?c.revise:c.open):row.phase==='pending_review'?c.reviewProgress:c.open);if(target)return createContextAction(actionLabel,withReturn(target));const button=text('button',actionLabel);button.type='button';button.onclick=()=>openRecord(row.type,row.id,button);return button;};
 const canDeleteDraft=row=>row.state==='draft'&&(row.type==='entry'&&row.kind==='draft'||row.type==='article'||row.type==='timeline'||row.type==='gallery'&&['batch','photos','classification'].includes(row.kind));
 const confirmRecordAction=(title,prompt,label)=>confirmDialog(prompt.replace('{title}',title||c.untitled),{title:label,accept:label,cancel:c.cancel,className:'creator-delete-dialog',actionsClass:'creator-delete-dialog-actions',acceptClass:'creator-delete-confirm',cancelClass:''});
 const confirmDraftDeletion=(title,withUploads=false)=>confirmRecordAction(title,withUploads?c.deleteGalleryDraftPrompt:c.deleteDraftPrompt,c.deleteDraft);
 async function deleteRemoteDraft(type,id,kind,title,button,withdrawn=false,detailRecordId=id){
  const current=ownerGeneration,accountId=owner;
  button.disabled=true;
  try{
   let base,path,body,revisionLocale;
   if((type==='entry'||type==='timeline')&&withdrawn){
    base=editorApi;path='/api/editor/submissions/'+encodeURIComponent(id);
    const data=await request(base,path);body={accountId,version:data.version};
   }else if(type==='entry'){
    base=editorApi;path='/api/editor/draft';
    const data=await request(base,path+'?path='+encodeURIComponent(id));
    if(!data)throw Error(c.error);
    body={accountId,path:id,version:data.version};
   }else if(type==='article'){
    base=api;path='/api/articles/revisions/'+encodeURIComponent(id);
    const data=await request(base,path);
    body={updatedAt:data.revision.updated_at,fingerprint:data.revision.fingerprint};
    revisionLocale=data.revision.locale;
   }else if(type==='timeline'){
    base=editorApi;path='/api/chronicle/drafts/'+encodeURIComponent(id);
    const data=await request(base,path);
    body={accountId,version:data.version};
   }else if(type==='gallery'&&kind==='legacy'){
    base=api;path='/api/gallery/revisions/'+encodeURIComponent(id);const {revision}=await request(base,path);body={status:revision.status,createdAt:revision.created_at};
   }else if(type==='gallery'&&kind==='set'){
    base=api;path='/api/gallery/set-revisions/'+encodeURIComponent(id);const detail=await request(base,path);body={version:detail.revision.review_version};
   }else{
    base=api;path='/api/gallery/batches/'+encodeURIComponent(id);
    const data=await request(base,path);
    if(data.batch.kind!==kind&&!(kind==='batch'&&data.batch.kind==='sets'))throw Error(c.error);
    body={version:data.batch.version};
   }
   if(current!==ownerGeneration||accountId!==owner)return;
   if(!await (withdrawn?confirmRecordAction(title,['entry','timeline'].includes(type)?c.deleteEntrySubmissionPrompt:c.deleteSubmissionPrompt,c.deleteSubmission):confirmDraftDeletion(title,type==='gallery')))return;
   if(current!==ownerGeneration||accountId!==owner)return;
   button.setAttribute('aria-busy','true');
   $('[data-creator-status]').textContent=withdrawn?c.deletingSubmission:c.deletingDraft;
   const deletion=await request(base,path,'DELETE',body);
   pollCount=0;
   if(current!==ownerGeneration||accountId!==owner)return;
   try{
    if(type==='timeline'){
     const key=`kamitsubaki-chronicle-draft-v1:${accountId}:${id}`,saved=JSON.parse(localStorage.getItem(key)||'null');
     if(saved?.ownerId===accountId)localStorage.removeItem(key);
    }
   if(type==='article'&&revisionLocale){
     for(const storedKey of articleLocalKeysForRevision(localStorage,accountId,id))localStorage.removeItem(storedKey);
     const key=`kamitsubaki-article-workbench-v1:${id}:${revisionLocale}`,saved=JSON.parse(localStorage.getItem(key)||'null');
     if(saved?.ownerId===accountId)localStorage.removeItem(key);
     localStorage.removeItem(`article-submission:${revisionLocale}:${id}`);
    }
    if(type==='gallery'&&['batch','photos'].includes(kind)){for(const draft of await listGalleryDrafts(accountId))if(draft.id===id)await galleryDraft('delete',draft.key);}
   }catch{}
   localDrafts();
   if(params().get('record')===detailRecordId)closeDetail();
   await Promise.all([loadRows(),loadSummary(),loadNotifications()]);
   $('[data-creator-status]').textContent=deletion.deleting?c.deletionQueued:withdrawn?c.deletedSubmission:c.deleted;
  }catch(error){if(current===ownerGeneration)$('[data-creator-status]').textContent=error.message||c.error;}
  finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
 }
 async function withdrawRemote(type,id,kind,title,button,batchId=null){
  const current=ownerGeneration,accountId=owner;
  try{
   let base,path,body;
   if(type==='article'){base=api;path='/api/articles/revisions/'+encodeURIComponent(id);const {revision}=await request(base,path);body={updatedAt:revision.updated_at,fingerprint:revision.fingerprint};}
   else if(type==='entry'||type==='timeline'){base=editorApi;path='/api/editor/submissions/'+encodeURIComponent(id);const submission=await request(base,path);body={accountId,version:submission.version};}
   else{base=api;const target=batchId||id;path='/api/gallery/batches/'+encodeURIComponent(target);const {batch}=await request(base,path);body={version:batch.version};}
   if(current!==ownerGeneration||accountId!==owner)return;
   if(!await confirmRecordAction(title,c.withdrawPrompt,c.withdraw))return;
   if(current!==ownerGeneration||accountId!==owner)return;
   button.disabled=true;button.setAttribute('aria-busy','true');$('[data-creator-status]').textContent=c.withdrawPending;
   await request(base,path+'/withdraw','POST',body);
   if(current!==ownerGeneration||accountId!==owner)return;
   if(params().get('record')===id)closeDetail();
   await Promise.all([loadRows(),loadSummary(),loadNotifications()]);
   $('[data-creator-status]').textContent=c.withdrawSuccess;
  }catch(error){if(current===ownerGeneration)$('[data-creator-status]').textContent=error.message||c.error;}
  finally{if(button.isConnected){button.disabled=false;button.removeAttribute('aria-busy');}}
 }
 function addDetailWithdraw(parent,type,id,kind,title,batchId=null){const button=text('button',c.withdraw,'creator-detail-action creator-withdraw');button.type='button';button.onclick=()=>withdrawRemote(type,id,kind,title,button,batchId);parent.append(button);}
 function deleteDraftButton(row){const button=text('button',c.deleteDraft,'creator-delete-draft');button.type='button';button.onclick=()=>deleteRemoteDraft(row.type,row.id,row.kind,recordTitle(row),button);return button;}
 const recordTitle=row=>{if(row.type==='entry'&&row.kind==='draft'&&row.title===row.id)return row.id.split('/').at(-2)?.replace(/[-_]/g,' ')||c.untitled;if(row.type==='gallery'&&row.kind==='photos'&&row.title?.startsWith('照片 · '))return `${c.photoRecord} · ${row.title.slice('照片 · '.length)}`;if(row.type==='gallery'&&row.kind==='classification'){const count=Number(row.title?.match(/\d+/)?.[0]||0);return `${c.classificationRecord} · ${count} ${count===1?c.photoCountUnit:c.photoCountPlural}`;}return row.title?.trim()||`${typeName(row.type)} · ${String(row.id||'').slice(0,8)}`;};
 const canDeleteSubmission=row=>['attention','review','withdrawn'].includes(row.state)&&!['partially_public','approved_syncing','published','hidden','deleting','publish_failed'].includes(row.phase);
 function submissionDeleteButton(row){const button=text('button',c.deleteSubmission,'creator-delete-draft');button.type='button';button.onclick=()=>deleteRemoteDraft(row.type,row.id,row.kind,recordTitle(row),button,true);return button;}
 function recordActions(row){const actions=text('div','','creator-record-action ui-record-actions');actions.append(openButton(row));if(row.state!=='draft'&&!(row.type==='gallery'&&['photos','batch','classification'].includes(row.kind))){const kind=row.type==='article'?'articles':row.type==='entry'?'entries':row.type==='gallery'&&row.kind==='set'?'sets':row.type;actions.append(createContextAction(reviewCopy(locale).discussion,`/${locale}/contribute/review/?kind=${kind}&resource=${encodeURIComponent(row.id)}`));}if(row.state==='attention'&&(nextTarget(row)||row.kind==='classification')){const detail=text('button',c.open);detail.type='button';detail.onclick=()=>openRecord(row.type,row.id,detail);actions.append(detail);}if(canDeleteDraft(row))actions.append(deleteDraftButton(row));else if(canDeleteSubmission(row))actions.append(submissionDeleteButton(row));return actions;}
 function renderRows(){const list=$('[data-creator-rows]');list.replaceChildren();for(const row of items){const card=text('article','','creator-record');const meta=text('div','','creator-record-meta');meta.append(text('span',typeName(row.type)),text('time',(row.updated_at||'').slice(0,16)));const pill=text('span',stateName(row),'creator-state');pill.dataset.state=row.state;meta.append(pill);const title=text('h3',recordTitle(row));card.append(meta,title);if(row.note)card.append(text('p',row.note,'creator-row-note'));else if(row.comment_count)card.append(text('p',`${row.comment_count} ${c.feedback}`,'creator-row-note'));const action=recordActions(row);card.append(action);list.append(card);}if(!items.length)list.append(text('p',c.empty,'creator-record-empty'));const f=filters();$('[data-page-previous]').disabled=f.offset===0;$('[data-page-next]').disabled=nextOffset===null;$('[data-records-status]').textContent=items.length?`${f.offset+1}–${f.offset+items.length}`:c.empty;}
 async function loadRows(){const current=++listGeneration,f=filters(),query=new URLSearchParams({offset:String(f.offset)});if(f.q)query.set('q',f.q);if(f.type)query.set('type',f.type);if(f.state)query.set('state',f.state);if(!owner){items=[];nextOffset=null;renderRows();$('[data-creator-status]').textContent='';$('[data-records-status]').textContent=c.loginHint;return;}setLoadingStatus($('[data-records-status]'),c.loading);try{const data=await account('/contributions?'+query);if(current!==listGeneration)return;items=data.items;nextOffset=data.nextOffset;renderRows();clearTimeout(pollTimer);if(pollCount<20&&items.some(row=>['deleting','syncing'].includes(row.phase))){pollCount++;pollTimer=setTimeout(()=>{if(!document.hidden)void Promise.all([loadRows(),loadSummary()]);},3000);}$('[data-creator-status]').textContent='';}catch(error){if(current!==listGeneration)return;items=[];nextOffset=null;renderRows();$('[data-creator-status]').textContent=error.status===401?c.login:c.error;}}
 function renderTodo(rows){const target=$('[data-creator-todo]');target.replaceChildren();$('[data-todo-count]').textContent=rows.length?String(rows.length):'';if(!rows.length){target.append(text('p',owner?c.todoEmpty:c.loginHint));return;}for(const row of rows.slice(0,5)){const item=text('article','','creator-todo-row'),copy=text('div','','creator-todo-copy');copy.append(text('small',`${typeName(row.type)} · ${stateName(row)}`),text('h3',recordTitle(row)));if(row.note)copy.append(text('p',row.note));item.append(copy,recordActions(row));target.append(item);}}
 async function loadSummary(){const current=ownerGeneration;if(!owner){for(const key of ['attention','review','published','draft'])$(`[data-metric-count="${key}"]`).textContent='—';renderTodo([]);return;}try{const [summary,todo]=await Promise.all([account('/contributions/summary'),account('/contributions?state=attention')]);if(current!==ownerGeneration)return;for(const key of ['attention','review','published','draft'])$(`[data-metric-count="${key}"]`).textContent=summary.summary[key]??0;renderTodo(todo.items);}catch{if(current===ownerGeneration)$('[data-creator-todo]').replaceChildren(text('p',c.error));}}
 function renderNotifications(data){notifications=data.items||[];unreadCount=data.unread||0;const target=$('[data-creator-notifications]');target.replaceChildren();$('[data-notification-count]').textContent=unreadCount?`${unreadCount} ${c.unread}`:'';root.querySelectorAll('[data-creator-unread]').forEach(badge=>{badge.hidden=!unreadCount;badge.textContent=unreadCount||'';});if(!notifications.length){target.append(text('p',owner?c.noNotifications:c.loginHint));return;}for(const event of notifications){const row=text('div','','creator-notification-row');row.dataset.unread=String(!event.read_at);row.dataset.event=event.event_type;const content=document.createElement('div');content.append(text('strong',c.events[event.event_type]||event.event_type),text('small',' · '+(event.created_at||'').slice(0,16)));if(event.review_note)content.append(text('p',event.review_note,'creator-notification-note'));const button=text('button',event.event_type==='returned'||event.event_type==='comment'?c.viewFeedback:c.open);button.type='button';button.onclick=()=>event.review_id?location.assign(`/${locale}/contribute/review/?id=${encodeURIComponent(event.review_id)}`):openRecord(event.source_type,event.record_id,button);row.append(content,button);target.append(row);}}
 async function loadNotifications(){const current=ownerGeneration;if(!owner){renderNotifications({items:[],unread:0});return;}try{const data=await account('/notifications');if(current!==ownerGeneration)return;renderNotifications(data);}catch{if(current===ownerGeneration)$('[data-creator-notifications]').replaceChildren(text('p',c.error));}}
 async function localDrafts(){
  const target=$('[data-creator-drafts]');target.replaceChildren();
  if(!owner){target.append(text('p',c.login));return;}
  const currentOwner=owner,currentGeneration=ownerGeneration,currentDraftGeneration=++localDraftGeneration;
  let found=0;
  const addLocal=(key,title,href)=>{
   const row=text('div','','creator-local-row'),actions=text('div','','creator-local-actions'),remove=text('button',c.deleteDraft,'creator-delete-draft');
   remove.type='button';remove.onclick=async()=>{if(!await confirmDraftDeletion(title))return;try{const draft=JSON.parse(localStorage.getItem(key)||'null');if(draft?.ownerId!==owner)throw Error(c.error);localStorage.removeItem(key);localStorage.removeItem(key+':source');$('[data-creator-status]').textContent=c.deleted;localDrafts();}catch(error){$('[data-creator-status]').textContent=error.message||c.error;}};
   actions.append(createContextAction(c.continue,withReturn(href)),remove);row.append(text('strong',title),actions);target.append(row);found++;
  };
  try{for(let i=0;i<localStorage.length;i++){
   const key=localStorage.key(i);
   const article=articleLocalDraftRecord(key,localStorage.getItem(key),owner);if(article){addLocal(key,article.title||c.untitled,`/${article.locale}/articles/submit/?draft=${encodeURIComponent(article.id)}`);continue;}
   if(key?.startsWith(`kamitsubaki-chronicle-draft-v1:${owner}:`)){
    const draft=JSON.parse(localStorage.getItem(key)||'null'),id=key.split(':').at(-1),title=draft?.event?.text?.[draft.event.sourceLocale]?.title;
    if(draft?.ownerId===owner)addLocal(key,title||c.untitled,`/${locale}/chronicle/submit/?draft=${encodeURIComponent(id)}`);
    continue;
   }
   const match=key?.match(/^kamitsubaki-(?:visual-editor(?:-pr-demo)?-v1|article-workbench-v1:([^:]+)):(zh|ja|en)$/);
   if(!match)continue;
   const draft=JSON.parse(localStorage.getItem(key)||'null');if(draft?.ownerId!==owner)continue;
   const isArticle=key.startsWith('kamitsubaki-article-'),href=isArticle?`/${match[2]}/articles/submit/?draft=${encodeURIComponent(match[1])}`:`/${match[2]}/contribute/editor/`;
   addLocal(key,draft.meta?.title||draft.meta?.name||c.untitled,href);
  }}catch{}
  const galleryDrafts=await listGalleryDrafts(currentOwner).catch(()=>[]);
  if(currentGeneration!==ownerGeneration||currentDraftGeneration!==localDraftGeneration||currentOwner!==owner)return;
  galleryDrafts.forEach(draft=>{
   if(!draft)return;
   const key=draft.key,photos=draft.kind==='photos'||draft.manifest?.kind==='photos';
   const count=photos?draft.manifest?.photos?.length||draft.files?.length||0:draft.manifest?.sets?.length||0;
   const title=count?`${photos?c.photoRecord:c.gallery} · ${count} ${photos?(count===1?c.photoCountUnit:c.photoCountPlural):c.setCountUnit}`:photos?c.photoRecord:c.gallery;
   const base=`/${locale}/gallery/manage/${photos?'photos/':''}`,href=draft.id?`${base}?batch=${encodeURIComponent(draft.id)}`:base;
   const row=text('div','','creator-local-row'),actions=text('div','','creator-local-actions'),remove=text('button',c.deleteLocalCopy,'creator-delete-draft');
   remove.type='button';remove.onclick=async()=>{if(!await confirmRecordAction(title,c.deleteLocalGalleryPrompt,c.deleteLocalCopy))return;if(currentOwner!==owner||currentGeneration!==ownerGeneration)return;try{await galleryDraft('delete',key);$('[data-creator-status]').textContent=c.localGalleryDeleted;void localDrafts();}catch(error){$('[data-creator-status]').textContent=error.message||c.error;}};
   actions.append(createContextAction(c.continue,withReturn(href)),remove);row.append(text('strong',title),actions);target.append(row);found++;
  });
  if(!found)target.append(text('p',c.todoEmpty));
 }
 function addDetailAction(parent,label,href,secondary=false){const link=createContextAction(label,withReturn(href),{tone:secondary?'quiet':'primary'});link.classList.add('creator-detail-action');if(label===c.revise||label===c.continue)link.dataset.detailPrimary='';parent.append(link);}
 function addDetailDelete(parent,type,id,kind,title,withdrawn=false,detailRecordId=id){const button=text('button',withdrawn?c.deleteSubmission:c.deleteDraft,'creator-detail-action creator-delete-draft');button.type='button';button.onclick=()=>deleteRemoteDraft(type,id,kind,title,button,withdrawn,detailRecordId);parent.append(button);}
 function addImages(parent,images){if(!images?.length)return;parent.append(text('h3',c.images));for(const item of images){const row=text('div','','creator-detail-image');if(item.previewUrl){const img=document.createElement('img');img.src=item.previewUrl;img.alt=item.metadata?.title||'';img.loading='lazy';row.append(img);}else row.append(text('span',''));const detail=document.createElement('div');detail.append(text('strong',item.metadata?.title||item.metadata?.name||item.id),text('small',item.hidden?c.phase.hidden:item.published?c.phase.published:c.imageStatus?.[item.status]||item.status));if(item.review_note)detail.append(text('p',item.review_note,'creator-image-feedback'));row.append(detail);parent.append(row);}}
 async function detailData(type,id){if(type==='entry'){if(id.startsWith('src/content/')){const data=await request(editorApi,'/api/editor/draft?path='+encodeURIComponent(id));if(!data)throw Error(c.error);return {kind:'entry-draft',data};}return {kind:'entry',data:await request(editorApi,'/api/editor/submissions/'+encodeURIComponent(id))};}if(type==='timeline'){try{return {kind:'timeline',data:await request(editorApi,'/api/chronicle/submissions/'+encodeURIComponent(id))};}catch(error){if(error.status!==404)throw error;return {kind:'timeline-draft',data:await request(editorApi,'/api/chronicle/drafts/'+encodeURIComponent(id))};}}if(type==='article')return {kind:'article',data:(await request(api,'/api/articles/revisions/'+encodeURIComponent(id))).revision};try{return {kind:'set',data:await request(api,'/api/gallery/set-revisions/'+encodeURIComponent(id))};}catch(error){if(error.status!==404)throw error;}try{return {kind:'batch',data:await request(api,'/api/gallery/batches/'+encodeURIComponent(id)+'/submissions')};}catch(error){if(error.status!==404)throw error;}return {kind:'legacy',data:(await request(api,'/api/gallery/revisions/'+encodeURIComponent(id))).revision};}
 function editorPhase(data){return data.deleteAfterClose&&data.sync==='pending'?c.phase.deleting:data.sync==='pending'?c.phase.syncing:data.sync==='paused'||data.sync==='conflict'?c.attention:({open:c.phase.pending_review,changes:c.phase.changes_requested,closed:c.withdrawn,merged:c.phase.approved_syncing,failed:c.phase.publish_failed,published:c.phase.published})[data.status]||data.status;}
 function addSyncAction(target,type,id,data){
  const button=text('button',['pending','paused'].includes(data.sync)?c.retrySync:c.refreshStatus,'creator-detail-action');button.type='button';
  button.onclick=async()=>{const current=ownerGeneration,accountId=owner;button.disabled=true;try{await request(editorApi,'/api/editor/submissions/'+encodeURIComponent(id)+(['pending','paused'].includes(data.sync)?'/retry':'/refresh'),'POST',{accountId});if(current!==ownerGeneration)return;pollCount=0;await Promise.all([loadRows(),loadSummary()]);if(params().get('record')===id)await showDetail(type,id);}catch(error){if(current===ownerGeneration)$('[data-creator-status]').textContent=error.message||c.error;}finally{button.disabled=false;}};
  target.append(button);
 }
 function buildDetail(type,id,result){const target=$('[data-detail-content]');target.replaceChildren();const {kind,data}=result;let title='',status='',note='';const meta=text('p','','creator-detail-meta');if(kind==='entry-draft'){title=data.title||id.split('/').at(-2)||id;status='draft';meta.append(text('span',`${typeName(type)} · ${c.phase.draft}`));}else if(kind==='entry'){title=data.title||data.path||id;status=data.status||data.sync;note=data.syncError||'';meta.append(text('span',`${typeName(type)} · ${editorPhase(data)}`));if(data.commentCount)meta.append(text('span',`${data.commentCount} ${c.feedback}`));}else if(kind==='timeline'||kind==='timeline-draft'){title=data.title||data.event?.text?.[data.event?.sourceLocale]?.title||data.eventId||id;status=kind==='timeline-draft'?'draft':data.status||data.sync;note=data.syncError||'';meta.append(text('span',`${typeName(type)} · ${status==='merged'?c.phase.approved_syncing:c.phase?.[status]||status}`));}else if(kind==='article'){title=data.content?.title||id;status=data.withdrawn_at?'withdrawn':data.status;note=data.review_note;meta.append(text('span',`${typeName(type)} · ${c.phase?.[status]||c.imageStatus?.[status]||status} · ${data.locale}`));}else if(kind==='set'){title=data.revision.metadata.title||data.revision.metadata.character||id;status=data.revision.status;note=data.revision.review_note;meta.append(text('span',`${typeName(type)} · ${c.phase?.[status]||status}`));}else if(kind==='batch'){title=data.revisions.map(r=>r.metadata.title||r.metadata.character).join(' / ')||c.newGallery;status=data.batch.status;meta.append(text('span',`${typeName(type)} · ${c.phase?.[status]||status} · ${data.revisions.length} ${c.gallery}`));}else{title=data.metadata.title||data.metadata.character||id;status=data.status;note=data.review_note;meta.append(text('span',`${typeName(type)} · ${status}`));}
  if(kind==='entry'||kind==='timeline')meta.replaceChildren(text('span',`${typeName(type)} · ${editorPhase(data)}`));
  const h=text('h2',title);h.id='creator-detail-title';target.append(h,meta,text('p',`${c.recordId} · ${id}`));if(note){target.append(text('h3',c.feedback),text('p',note,'creator-detail-note'));}
  if(kind==='entry-draft'){addDetailAction(target,c.continue,`/${id.split('/').at(-1).slice(0,-3)||locale}/contribute/editor/?draftPath=${encodeURIComponent(id)}`);addDetailDelete(target,type,id,'draft',title);}
  if(kind==='entry'||kind==='timeline')addSyncAction(target,type,id,data);
  if(kind==='entry'){const comments=data.comments?.items||data.comments||[];if(Array.isArray(comments)&&comments.length){target.append(text('h3',c.feedback));for(const comment of comments.slice(-5))target.append(text('p',comment.body||comment.text||'','creator-detail-note'));}addDetailAction(target,['changes','closed'].includes(status)?c.revise:c.open,`/${locale}/contribute/editor/?view=submissions&submission=${encodeURIComponent(id)}`);if(['open','changes','closed'].includes(data.status)&&!(data.deleteAfterClose&&data.sync==='pending'))addDetailDelete(target,type,id,kind,title,true);}
  if(kind==='timeline-draft'){addDetailAction(target,c.continue,`/${locale}/chronicle/submit/?draft=${encodeURIComponent(id)}`);addDetailDelete(target,type,id,'draft',title);}
  if(kind==='timeline'){const event=data.structuredEvent||{};if(event.date)target.append(text('p',[event.date.start,event.date.end].filter(Boolean).join(' — ')));const comments=data.comments?.items||data.comments||[];if(Array.isArray(comments)&&comments.length){target.append(text('h3',c.feedback));for(const comment of comments.slice(-5))target.append(text('p',comment.body||comment.text||'','creator-detail-note'));}if(data.url&&/^https:\/\/github\.com\//.test(data.url))addDetailAction(target,c.open,data.url,true);if(status==='changes'||data.sync==='conflict')addDetailAction(target,c.revise,`/${locale}/chronicle/submit/?submission=${encodeURIComponent(id)}`);if(['open','changes','closed'].includes(data.status)&&!(data.deleteAfterClose&&data.sync==='pending'))addDetailDelete(target,type,id,kind,title,true);if(status==='published')addDetailAction(target,c.viewPublic,`/${locale}/chronicle/#${encodeURIComponent(data.eventId)}`,true);}
  if(kind==='article'){if(status==='draft'||status==='rejected')addDetailAction(target,status==='rejected'?c.revise:c.continue,`/${data.locale||locale}/articles/submit/?revision=${encodeURIComponent(id)}&draft=${encodeURIComponent(id)}`);if(status==='draft')addDetailDelete(target,type,id,'draft',title);else if(['pending','rejected','withdrawn'].includes(status))addDetailDelete(target,type,id,kind,title,true);if(data.public)addDetailAction(target,c.viewPublic,`/${data.locale||locale}/articles/read/${encodeURIComponent(data.article_id)}/`,true);}
  if(kind==='set'){const publicImages=data.images?.filter(image=>image.published)||[];const pendingPublish=data.images?.some(image=>image.status==='approved'&&!image.published);const pendingReview=data.images?.some(image=>image.status==='pending');const returned=status==='rejected'||data.images?.some(image=>image.status==='rejected');const phase=status==='withdrawn'?'withdrawn':data.setVisibility==='hidden'?'hidden':publicImages.length?pendingPublish||pendingReview||returned?'partially_public':'published':pendingPublish?'approved_syncing':returned?'changes_requested':'pending_review';meta.replaceChildren(text('span',`${typeName(type)} · ${c.phase?.[phase]||status}`));if(pendingPublish)target.append(text('p',c.phase.approved_syncing,'creator-detail-note'));addImages(target,data.images);if(publicImages.length&&data.setVisibility!=='hidden')addDetailAction(target,c.viewPublic,`/${locale}/gallery/?set=${encodeURIComponent(data.revision.set_id)}`,true);if(status!=='pending'&&status!=='withdrawn'&&!pendingReview)addDetailAction(target,c.revise,`/${locale}/gallery/manage/?revision=${encodeURIComponent(id)}`);if(['pending','rejected','withdrawn'].includes(status)&&!data.images?.some(image=>image.status==='approved'))addDetailDelete(target,type,id,'set',title,true);else if(data.revision.batch_id&&['pending','rejected'].includes(status)){addDetailWithdraw(target,type,id,kind,title,data.revision.batch_id);target.append(text('p',c.deleteUnavailable,'creator-detail-note'));}}
  if(kind==='batch'&&data.batch.kind!=='sets'){
   const revisions=data.revisions||[],published=revisions.filter(item=>item.published),hidden=revisions.filter(item=>item.hidden),returned=revisions.filter(item=>item.status==='rejected'),pending=revisions.filter(item=>item.status==='pending');
   const phase=status==='draft'?'draft':status==='withdrawn'?published.length?'partially_public':'withdrawn':returned.length?'changes_requested':pending.length&&published.length?'partially_public':pending.length?'pending_review':hidden.length&&!published.length&&revisions.every(item=>item.status==='approved')?'hidden':published.length<revisions.length&&published.length?'partially_public':revisions.length&&published.length===revisions.length?'published':'approved_syncing';
   meta.replaceChildren(text('span',`${typeName(type)} · ${c.phase?.[phase]||phase} · ${revisions.length} ${revisions.length===1?c.photoCountUnit:c.photoCountPlural}`));
   if(status==='draft'){if(data.batch.kind==='photos')addDetailAction(target,c.continue,`/${locale}/gallery/manage/photos/?batch=${encodeURIComponent(id)}`);addDetailDelete(target,type,id,data.batch.kind,title);}
   if(['submitted','withdrawn'].includes(status)&&!revisions.some(item=>item.status==='approved'))addDetailDelete(target,type,id,data.batch.kind,title,true);else if(status==='submitted'&&(returned.length||pending.length)){addDetailWithdraw(target,type,id,data.batch.kind,title);target.append(text('p',c.deleteUnavailable,'creator-detail-note'));}
   addImages(target,revisions);
   if(published.length)addDetailAction(target,c.viewPublic,`/${locale}/gallery/?photo=${encodeURIComponent(published[0].item_id)}`,true);
   if(returned.length)target.append(text('p',c.returnedPhotoHint,'creator-detail-note'));
   if(returned.length)addDetailAction(target,c.revise,data.batch.kind==='photos'?`/${locale}/gallery/manage/photos/?retry=${encodeURIComponent(id)}`:`/${locale}/gallery/classify/?ids=${encodeURIComponent(returned.map(item=>item.item_id).join(','))}`);
   return;
  }
  if(kind==='batch'){const phases=[];for(const revision of data.revisions){const section=document.createElement('section'),publicImages=revision.images?.filter(image=>image.published)||[],pendingPublish=revision.images?.some(image=>image.status==='approved'&&!image.published),pendingReview=revision.images?.some(image=>image.status==='pending'),returned=revision.status==='rejected'||revision.images?.some(image=>image.status==='rejected');const phase=revision.status==='withdrawn'?'withdrawn':publicImages.length?pendingPublish||pendingReview||returned?'partially_public':'published':pendingPublish?'approved_syncing':returned?'changes_requested':'pending_review';phases.push(phase);section.append(text('h3',revision.metadata.title||revision.metadata.character||revision.id),text('p',revision.review_note||c.phase[phase],revision.review_note?'creator-detail-note':''));addImages(section,revision.images);if(publicImages.length&&revision.set_id)addDetailAction(section,c.viewPublic,`/${locale}/gallery/?set=${encodeURIComponent(revision.set_id)}`,true);if(returned&&!pendingReview)addDetailAction(section,c.revise,`/${locale}/gallery/manage/?revision=${encodeURIComponent(revision.id)}`);target.append(section);}const batchPhase=status==='draft'?'draft':status==='withdrawn'?phases.includes('published')?'partially_public':'withdrawn':phases.includes('changes_requested')?'changes_requested':phases.includes('partially_public')||phases.includes('published')&&phases.some(value=>value!=='published')?'partially_public':phases.includes('approved_syncing')?'approved_syncing':phases.every(value=>value==='published')?'published':'pending_review';meta.replaceChildren(text('span',`${typeName(type)} · ${c.phase[batchPhase]} · ${data.revisions.length} ${c.setCountUnit}`));if(status==='draft'){addDetailAction(target,c.continue,`/${locale}/gallery/manage/?batch=${encodeURIComponent(id)}`);addDetailDelete(target,type,id,data.batch.kind,title);}if(['submitted','withdrawn'].includes(status)&&!data.revisions.some(revision=>revision.status==='approved'||revision.images?.some(image=>image.status==='approved')))addDetailDelete(target,type,id,data.batch.kind,title,true);}
  if(kind==='legacy'){if(['pending','rejected','withdrawn'].includes(status))addDetailDelete(target,type,id,'legacy',title,true);if(data.previewUrl)addImages(target,[data]);if(status!=='pending')addDetailAction(target,c.revise,`/${locale}/gallery/manage/legacy/?revision=${encodeURIComponent(id)}`);}
 }
 async function markRecordRead(type,id){const current=ownerGeneration;for(const event of notifications.filter(item=>item.source_type===type&&item.record_id===id&&!item.read_at)){try{await account('/notifications/'+encodeURIComponent(event.id)+'/read','POST',{accountId:owner});if(current!==ownerGeneration)return;event.read_at=new Date().toISOString();unreadCount=Math.max(0,unreadCount-1);}catch{}}if(current===ownerGeneration)renderNotifications({items:notifications,unread:unreadCount});}
 function syncDetailFooter(){const footer=$('[data-detail-footer]'),content=$('[data-detail-content]');footer.replaceChildren();for(const action of [...content.querySelectorAll(':scope > .creator-detail-action')].sort((a,b)=>Number(a.classList.contains('creator-delete-draft'))-Number(b.classList.contains('creator-delete-draft'))))footer.append(action);const close=text('button',c.close);close.type='button';close.onclick=closeDetail;footer.append(close);}
 function syncDetailPresentation(){const pane=$('[data-creator-detail]'),modal=!pane.hidden;pane.setAttribute('aria-modal',String(modal));$('[data-detail-backdrop]').hidden=!modal;document.documentElement.classList.toggle('creator-detail-open',modal);$('.creator-main').inert=modal;$('.account-sections').inert=modal;}
 async function showDetail(type,id){const pane=$('[data-creator-detail]');pane.hidden=false;pane.scrollTop=0;syncDetailPresentation();const loading=text('h2','');setLoadingStatus(loading,c.loading);loading.id='creator-detail-title';$('[data-detail-content]').replaceChildren(loading);syncDetailFooter();$('[data-detail-close]').focus({preventScroll:true});const current=ownerGeneration;try{const data=await detailData(type,id);if(current!==ownerGeneration||params().get('record')!==id)return;buildDetail(type,id,data);syncDetailFooter();await markRecordRead(type,id);}catch(error){if(current!==ownerGeneration||params().get('record')!==id)return;const title=text('h2',error.status===401?c.login:c.error),retry=text('button',c.retry,'creator-detail-action');title.id='creator-detail-title';retry.type='button';retry.onclick=()=>void showDetail(type,id);$('[data-detail-content]').replaceChildren(title,retry);syncDetailFooter();}}
 function openRecord(type,id,trigger){if(type==='community'){location.assign(withReturn(`/${locale}/community/activities/apply/?revision=${encodeURIComponent(id)}`));return;}detailTrigger=trigger;setUrl({recordType:type,record:id,batch:null,revision:null});void showDetail(type,id);}
 function closeDetail(){$('[data-creator-detail]').hidden=true;syncDetailPresentation();setUrl({recordType:null,record:null},true);const target=detailTrigger?.isConnected?detailTrigger:$('#creator-records-title');if(target?.tagName==='H2')target.tabIndex=-1;target?.focus({preventScroll:true});detailTrigger=null;}
 function route(){clearTimeout(searchTimer);normalizeLegacy();const login=$('[data-creator-login]');if(login)login.href=loginUrl();const p=params(),type=p.get('recordType'),id=p.get('record');if(owner&&type==='community'&&id){openRecord(type,id,null);return;}if(owner&&type&&id&&['entry','article','gallery','timeline'].includes(type)){void showDetail(type,id);}else{$('[data-creator-detail]').hidden=true;syncDetailPresentation();}const f=filters(),form=$('[data-creator-filters]');form.elements.q.value=f.q;form.elements.type.value=f.type;form.elements.state.value=f.state;void loadRows();}
 $('[data-detail-close]').onclick=closeDetail;$('[data-detail-backdrop]').onclick=closeDetail;document.addEventListener('keydown',event=>{const pane=$('[data-creator-detail]');if(pane.hidden)return;if(event.key==='Escape'){closeDetail();return;}if(event.key!=='Tab')return;const focusable=Array.from(pane.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(node=>node.getClientRects().length);if(!focusable.length)return;const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 window.addEventListener('pagehide',()=>{clearTimeout(pollTimer);clearTimeout(searchTimer);});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&owner&&items.some(row=>['deleting','syncing'].includes(row.phase))){pollCount=0;void Promise.all([loadRows(),loadSummary()]);}});
 window.addEventListener('popstate',route);
 $('[data-creator-filters]').addEventListener('submit',event=>event.preventDefault());
 $('[data-creator-filters]').addEventListener('input',event=>{if(event.target.name!=='q')return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{setUrl({q:event.target.value,offset:null,record:null,recordType:null});route();},240);});
 $('[data-creator-filters]').addEventListener('change',event=>{if(event.target.name==='q')return;const form=event.currentTarget;setUrl({type:form.elements.type.value,state:form.elements.state.value,offset:null,record:null,recordType:null});route();});
 $('[data-page-previous]').onclick=()=>{setUrl({offset:Math.max(0,filters().offset-20)});route();};
 $('[data-page-next]').onclick=()=>{if(nextOffset!==null){setUrl({offset:nextOffset});route();}};
 $('[data-creator-refresh]').onclick=async event=>{const button=event.currentTarget,current=ownerGeneration,accountId=owner;button.disabled=true;try{const outcomes=await Promise.allSettled(items.filter(row=>['entry','timeline'].includes(row.type)&&row.state!=='draft'&&!['published','withdrawn'].includes(row.phase)).slice(0,5).map(row=>request(editorApi,'/api/editor/submissions/'+encodeURIComponent(row.id)+'/refresh','POST',{accountId})));if(current!==ownerGeneration)return;pollCount=0;await Promise.all([loadRows(),loadSummary(),loadNotifications()]);const p=params();if(p.get('record'))await showDetail(p.get('recordType'),p.get('record'));if(outcomes.some(result=>result.status==='rejected'))$('[data-creator-status]').textContent=c.error;}finally{button.disabled=false;}};
 root.querySelectorAll('[data-metric]').forEach(button=>button.onclick=()=>{setUrl({state:button.dataset.metric,offset:null,record:null,recordType:null});route();});
 function syncOwner(next){clearTimeout(pollTimer);pollCount=0;owner=next;ownerGeneration++;listGeneration++;items=[];notifications=[];unreadCount=0;$('[data-creator-guest]').hidden=Boolean(owner);root.querySelectorAll('.creator-section').forEach(section=>{section.hidden=!owner;});localDrafts();route();void loadSummary();void loadNotifications();}
 window.addEventListener('kamitsubaki-account-state',()=>{const next=state.viewer?.userId||null;if(next!==owner)syncOwner(next);});
 void refreshAuth().then(viewer=>{if((viewer?.userId||null)!==owner)syncOwner(viewer?.userId||null);else if(!owner)syncOwner(null);}).catch(()=>{$('[data-creator-status]').textContent=c.error;});
}
