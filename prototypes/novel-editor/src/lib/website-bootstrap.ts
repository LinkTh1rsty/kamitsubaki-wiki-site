import {normalizeYamlDates} from './yaml-compat';
import {parseDocument} from 'yaml';
import type {LocalDraft} from './local-drafts';
import type {ReviewAttachment} from './review-attachments';
import {editorHost,editorFetch,registerStagedImages,restoreBrowserImages} from './editor-host';
import {newDocumentSource} from './wiki-document';
import {articleSourceWithContent} from './article-document';
import {readLastLocalDraft,readLocalDraft,saveLocalDraft,unclaimedLocalDrafts} from './local-drafts';
import {exportMarkdown} from '../../../../src/lib/visualEditor.mjs';
import {entryDraftStorageKeys,mayOpenScopedEntryDraft,legacyEntryDraftDisposition} from '../../../../src/lib/editorDraftStorage.mjs';
import {articleLocalDraftRecord} from '../../../../src/lib/articleDraftStorage.mjs';
import {attachmentFile} from '../../../../src/lib/editorAttachments.mjs';
async function json(path:string){const r=await editorFetch(path,{signal:AbortSignal.timeout(15000)}),d=await r.json();if(!r.ok)throw Error(typeof d.error==='string'?d.error:d.error?.message||'无法读取原有记录。');return d;}
function properties(source:string,values:Record<string,any>){const match=source.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!match)throw Error('文档属性无法读取。');const doc=parseDocument(match[1]);for(const [key,value] of Object.entries(values))doc.set(key,value);return normalizeYamlDates('---\n'+doc.toString({lineWidth:0})+'---\n'+source.slice(match[0].length));}
type Classic={key:string;raw:any;automatic:boolean;identity?:string;novel?:LocalDraft};
export function classicDrafts():Classic[]{
 const host=editorHost()!,owner=host.ownerId!;if(owner==='unverified')return [];
 const results:Classic[]=unclaimedLocalDrafts().map(novel=>({key:novel.key,raw:{meta:{name:novel.title,locale:novel.locale}},novel,automatic:false}));
 for(let i=0;i<localStorage.length;i++){
  const key=localStorage.key(i)!;let raw:any;try{raw=JSON.parse(localStorage.getItem(key)||'null');}catch{continue;}
  if(!raw?.meta||!Array.isArray(raw.blocks))continue;
  if(host.mode==='article'){
   const known=articleLocalDraftRecord(key,JSON.stringify(raw),owner);
   const unowned=key.match(/^kamitsubaki-article-workbench-v[12]:(?:guest|unverified):([^:]+):(zh|ja|en)$/);
   if(known||unowned&&!raw.ownerId)results.push({key,raw,identity:known?.id||unowned?.[1],automatic:Boolean(known)});
  }else if(/^kamitsubaki-visual-editor(?:-pr-demo)?-v[12]:/.test(key)){
   const keys=[true,false].map(demo=>entryDraftStorageKeys(demo,owner,host.contentLocale));
   const scoped=keys.some(item=>item.key===key),legacy=keys.some(item=>item.legacyKey===key||key===item.legacyKey+':previous');
   const unowned=key.match(/-v2:(guest|unverified):/)&&!raw.ownerId;
   const disposition=legacyEntryDraftDisposition(raw,owner);
   if(scoped&&mayOpenScopedEntryDraft(raw,owner)||legacy&&disposition!=='foreign'||unowned)results.push({key,raw,automatic:Boolean(scoped&&mayOpenScopedEntryDraft(raw,owner)||legacy&&disposition==='migrate')});
  }
 }
 return results;
}
export async function restoreClassicDraft(candidate:Classic):Promise<LocalDraft>{
 const host=editorHost()!,owner=host.ownerId!,raw=candidate.raw;
 if(candidate.novel){const original=candidate.novel as LocalDraft&{unclaimedOwner:string};for(const url of new Set(original.source.match(/\/images\/novel-prototype\/[a-f0-9]{64}\.(?:png|jpg|webp|gif)/g)||[])){const blob=await attachmentFile('novel:'+original.unclaimedOwner+':'+url).catch(()=>null);if(blob)await attachmentFile('novel:'+owner+':'+url,blob);}const draft={...original,key:'recovered:'+crypto.randomUUID(),attachments:original.attachments?.map(({staged,...asset})=>asset),savedAt:Date.now()};saveLocalDraft(draft);await restoreBrowserImages(draft.source);return draft;}
 let source=exportMarkdown(raw);const attachments:ReviewAttachment[]=[];
 for(const asset of raw.assets||[]){
  if(!asset.url)continue;let url=asset.url;
  if(!asset.serverUploaded){const blob=await attachmentFile(asset.id).catch(()=>null);const ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'} as any)[blob?.type];if(blob&&ext){url='/images/novel-prototype/'+asset.id+'.'+ext;await attachmentFile('novel:'+owner+':'+url,blob);source=source.split(asset.url).join(url);}}
  attachments.push({url,alt:asset.alt||'',source:asset.source||'',...(asset.serverUploaded&&candidate.automatic?{staged:{id:asset.id,purpose:host.mode==='article'?'article' as const:'entry' as const,ownerId:owner,size:asset.size,mime:asset.mime,image:asset.image}}:{})});
 }
 const path=raw.path||'',draft:LocalDraft={key:'legacy:'+candidate.key,path,source,baseSource:raw.baseContent,create:raw.create,attachments,title:raw.meta.name||raw.meta.title||'',locale:raw.meta.locale||host.contentLocale,savedAt:Date.now(),pendingSource:localStorage.getItem(candidate.key+':source')||undefined};
 if(host.mode==='article'&&candidate.automatic){
  const stateKey=`article-submission-v2:${owner}:${host.admin?'admin:':''}${draft.locale}:${candidate.identity||'new'}`;
  let state:any;try{state=JSON.parse(localStorage.getItem(stateKey)||'null');}catch{}
  if(state?.articleId){draft.articleBase={articleId:state.articleId,version:state.baseVersion||0};if(state.revisionId&&state.fingerprint&&Number.isInteger(state.draftVersion)){
   const {revision:r}=await json('/api/articles/revisions/'+encodeURIComponent(state.revisionId));if(r.author_id===owner)draft.article={ownerId:owner,articleId:state.articleId,revisionId:state.revisionId,locale:state.locale||draft.locale,baseVersion:state.baseVersion||0,fingerprint:state.fingerprint,draftVersion:state.draftVersion,status:r.status,updatedAt:r.updated_at};
  }}
 }
 // The original old-version keys and blobs remain intact as a migration backup.
 saveLocalDraft(draft);registerStagedImages(attachments);await restoreBrowserImages(source);return draft;
}
function setupRecovery(candidates:Classic[]){
 const button=document.querySelector<HTMLButtonElement>('[data-legacy-recovery]'),dialog=document.querySelector<HTMLDialogElement>('[data-legacy-dialog]');if(!button||!dialog||!candidates.length)return;
 button.hidden=false;button.onclick=()=>dialog.showModal();dialog.querySelector<HTMLButtonElement>('[data-legacy-close]')!.onclick=()=>dialog.close();
 dialog.addEventListener('close',()=>button.focus());
 const list=dialog.querySelector('[data-legacy-list]')!;
 for(const candidate of candidates){const action=document.createElement('button');action.type='button';action.textContent=(candidate.raw.meta.name||candidate.raw.meta.title||'未命名草稿')+' · '+candidate.raw.meta.locale;action.onclick=async()=>{action.disabled=true;try{await restoreClassicDraft(candidate);location.assign(location.pathname+'?restored=1');}catch(error:any){action.textContent=error.message;action.disabled=false;}};list.append(action);}
}
export async function initializeWebsiteDocument(){
 const host=editorHost();if(!host)return;
 const query=new URLSearchParams(location.search),candidates=classicDrafts();setupRecovery(candidates);
 const revisionId=query.get('revision'),articleId=query.get('id'),submissionId=query.get('submission'),draftPath=query.get('draftPath');
 const localDraft=query.get('localDraft');
 if(host.mode==='article'&&!revisionId&&!articleId&&localDraft){
  const key='article-local:'+localDraft;
  host.initialDocument=readLocalDraft(key)||{key,path:'',source:newDocumentSource(host.contentLocale)};
 }
 if(!host.initialDocument&&!readLastLocalDraft()&&!revisionId&&!articleId&&!submissionId&&!draftPath){const identity=query.get('draft');const known=candidates.find(item=>item.automatic&&(!host.initialTarget||item.raw.path===host.initialTarget)&&(!identity||item.identity===identity));if(known)host.initialDocument=await restoreClassicDraft(known);}
 if(host.mode==='article'&&revisionId){
  const {revision:r}=await json('/api/articles/revisions/'+encodeURIComponent(revisionId));if(r.author_id!==host.ownerId)throw Error('请在内容管理中审核其他作者的稿件。');
  const key='article:'+host.ownerId+':'+r.article_id,saved=readLocalDraft(key);const source=r.status==='draft'&&saved&&saved.article&&saved.article.revisionId===r.id&&saved.article.fingerprint===r.fingerprint?saved.source:properties(articleSourceWithContent(newDocumentSource(r.locale),r.content),{id:r.article_id});
  if(saved&&saved.source!==source)saveLocalDraft({...saved,key:saved.key+':before-account-load:'+crypto.randomUUID(),savedAt:Date.now()});
  host.initialDocument={key,path:'',source,attachments:saved?.attachments,article:{ownerId:host.ownerId,articleId:r.article_id,revisionId:r.id,locale:r.locale,baseVersion:r.base_version,fingerprint:r.fingerprint,draftVersion:r.draft_version,status:r.status,updatedAt:r.updated_at,withdrawnAt:r.withdrawn_at}};
 }else if(host.mode==='article'&&articleId){
  const {article,permissions}=await json('/api/articles/items/'+encodeURIComponent(articleId)+'?locale='+host.contentLocale);if(!permissions?.canEdit)throw Error('当前账号没有编辑这篇文章的权限。');
  const key='article:'+host.ownerId+':'+article.id,saved=readLocalDraft(key),source=saved?.source||properties(articleSourceWithContent(newDocumentSource(article.locale),article),{id:article.id});
  host.initialDocument={key,path:'',source,attachments:saved?.attachments,article:saved?.article,articleBase:saved?.articleBase||{articleId:article.id,version:article.version}};
 }else if(host.mode==='entry'&&submissionId){
  const s=await json('/api/editor/submissions/'+encodeURIComponent(submissionId));host.initialTarget=undefined;
  host.initialDocument={key:s.path,path:s.path,source:s.content,baseSource:s.baseContent,create:s.create,attachments:(s.assets||[]).map((a:any)=>({url:a.url,alt:a.alt||'',source:a.source||'',staged:{id:a.id,purpose:'entry',ownerId:host.ownerId,size:a.size,mime:a.mime}}))};
 }else if(host.mode==='entry'&&draftPath){const d=await json('/api/editor/draft?path='+encodeURIComponent(draftPath));if(!d?.content)throw Error('账号草稿不存在。');host.initialTarget=undefined;host.initialDocument={key:d.path,path:d.path,source:d.content,baseSource:d.baseContent,create:d.create};}
 if(host.mode==='article'&&!host.initialDocument&&query.get('related'))host.initialDocument={key:crypto.randomUUID(),path:'',source:properties(newDocumentSource(host.contentLocale),{relatedEntities:[query.get('related')]})};
 const draft=host.initialDocument||readLastLocalDraft();if(draft){registerStagedImages(draft.attachments);await restoreBrowserImages(draft.source);}
}
