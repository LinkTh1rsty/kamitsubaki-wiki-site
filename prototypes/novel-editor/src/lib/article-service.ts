import {editorFetch,localEditorHost} from './editor-host';
import {LocalReviewService,type ReviewAccount} from './review-service';
import {articleImageUrl,articleLocalImages,articleSourceWithContent,sameArticleContent,validateArticleContent,validateArticleImage,type ArticleBinding,type ArticleSnapshot,type ArticleContent,type ArticleImage} from './article-document';
import type {ReviewAttachment} from './review-attachments';
export type ArticleRevision = {id:string;article_id:string;locale:string;base_version:number;content:ArticleContent;fingerprint:string;draft_version:number;status:string;updated_at:string;withdrawn_at?:string|null;review_note?:string;author_id:string;author_name:string;public?:boolean};
export type ArticleReceipt = {binding:ArticleBinding;content:ArticleContent;source:string;originalSource:string;attachments:ReviewAttachment[]};
export type ArticlePage = {revisions:ArticleRevision[];nextOffset:number|null};
export type ArticleState = {account:ReviewAccount;binding?:ArticleBinding;revision?:ArticleRevision;page:ArticlePage;foreign:boolean;conflict?:any;recovered?:ArticleReceipt;pending?:ArticleOperation};
export class ArticleError extends Error {constructor(message:string,public status=0,public code?:string,public server?:any){super(message);}}
type Store=Pick<Storage,'getItem'|'setItem'|'removeItem'>;
type ArticleOperation={accountId:string;key:string;originalSource:string;source:string;content:ArticleContent;locale:string;attachments:ReviewAttachment[];body:any};
const keyFor=(owner:string,key:string)=>'kamitsubaki-novel-local-prototype:article:'+encodeURIComponent(owner)+':'+encodeURIComponent(key);
const bindingFor=(revision:ArticleRevision):ArticleBinding=>({ownerId:revision.author_id,articleId:revision.article_id,revisionId:revision.id,locale:revision.locale,baseVersion:revision.base_version,fingerprint:revision.fingerprint,draftVersion:revision.draft_version,status:revision.status,updatedAt:revision.updated_at,withdrawnAt:revision.withdrawn_at});
export class LocalArticleService {
 private sessions:LocalReviewService;
 constructor(private request:typeof fetch=(url,options)=>editorFetch(url,options),private storage:Store=localStorage){this.sessions=new LocalReviewService(request,storage);}
 private async call<T>(account:ReviewAccount,path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>{
  await this.sessions.localAccount(account.id,signal);
  const multipart=body instanceof FormData;
  let response:Response;try{response=await this.request(path,{method,credentials:'same-origin',signal,headers:{...(body&&!multipart?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&localEditorHost()?{'X-Novel-Local-Account':account.id}:{})},body:body?multipart?body:JSON.stringify(body):undefined});}catch(error:any){if(error.name==='AbortError')throw error;throw new ArticleError('连接中断，文章仍保存在本地。恢复后可重试。');}
  let data:any;try{data=await response.json();}catch{throw new ArticleError('文章测试服务暂未连接，正文仍保存在本地。',response.status>=400&&response.status<500?response.status:0);}
  if(!response.ok)throw new ArticleError(typeof data.error==='string'?data.error:data.error?.message||'文章请求未完成，请保留草稿后重试。',response.status,data.error?.code,data.error?.server);
  return data;
 }
 private read<T>(key:string):T|undefined{try{return JSON.parse(this.storage.getItem(key)||'null')||undefined;}catch{return undefined;}}
 private save(key:string,value:unknown){try{this.storage.setItem(key,JSON.stringify(value));}catch{throw new ArticleError('浏览器暂时无法保存恢复记录，请先导出 Markdown 备份。');}}
 private bound(account:ReviewAccount,snapshot:ArticleSnapshot){const binding=snapshot.binding||this.read<ArticleBinding>(keyFor(account.id,snapshot.key)+':binding');if(binding&&binding.ownerId!==account.id)throw new ArticleError('这份文章属于另一位作者，请切回原作者或新建自己的文章。',409);return binding;}
 async load(snapshot:ArticleSnapshot,signal?:AbortSignal):Promise<ArticleState>{
  const account=await this.sessions.localAccount(undefined,signal),page=await this.call<ArticlePage>(account,'/api/articles/mine','GET',undefined,signal);
  const foreign=Boolean(snapshot.binding&&snapshot.binding.ownerId!==account.id);
  let binding=foreign?undefined:this.bound(account,snapshot),revision:ArticleRevision|undefined,recovered:ArticleReceipt|undefined,conflict:any;
  if(binding){revision=(await this.call<{revision:ArticleRevision}>(account,'/api/articles/revisions/'+encodeURIComponent(binding.revisionId),'GET',undefined,signal)).revision;if(binding.fingerprint!==revision.fingerprint){conflict={content:revision.content,fingerprint:revision.fingerprint,draftVersion:revision.draft_version,updatedAt:revision.updated_at};}else{binding=bindingFor(revision);this.save(keyFor(account.id,snapshot.key)+':binding',binding);}}
  const pending=this.read<ArticleOperation>(keyFor(account.id,snapshot.key)+':pending');
  if(!foreign&&pending?.body.revisionId&&revision&&revision.id===pending.body.revisionId&&revision.draft_version===pending.body.expectedVersion+1&&sameArticleContent(revision.content,pending.content)) {
   recovered=this.receipt(account,pending,revision);binding=recovered.binding;conflict=undefined;this.storage.removeItem(keyFor(account.id,snapshot.key)+':pending');
  }
  const prior=this.read<ArticleReceipt>(keyFor(account.id,snapshot.key)+':receipt');
  if(!conflict&&!recovered&&!pending&&prior&&revision&&prior.binding.revisionId===revision.id&&(snapshot.source===prior.originalSource||snapshot.source===prior.source)) {
   const source=articleSourceWithContent(prior.source,revision.content);
   if(source!==snapshot.source)recovered={...prior,binding:bindingFor(revision),source,content:revision.content};
  }
  return {account,page,binding,revision,foreign,conflict,pending:foreign||recovered?undefined:pending,recovered};
 }
 rememberRevision(snapshot:ArticleSnapshot,account:ReviewAccount,revision:ArticleRevision):ArticleReceipt {
  if(revision.author_id!==account.id)throw new ArticleError('稿件不属于当前账号。',409);
  return this.receipt(account,{accountId:account.id,key:snapshot.key,originalSource:snapshot.source,source:snapshot.source,content:revision.content,locale:revision.locale,attachments:snapshot.attachments,body:{}},revision);
 }
 async detail(account:ReviewAccount,id:string){return (await this.call<{revision:ArticleRevision;original:ArticleContent|null}>(account,'/api/articles/revisions/'+encodeURIComponent(id))).revision;}
 async published(account:ReviewAccount,revision:ArticleRevision){return (await this.call<{article:ArticleContent&{version:number;author:string}}>(account,'/api/articles/items/'+encodeURIComponent(revision.article_id)+'?locale='+encodeURIComponent(revision.locale))).article;}
 async page(account:ReviewAccount,offset:number){return this.call<ArticlePage>(account,'/api/articles/mine?offset='+offset);}
 async saveDraft(snapshot:ArticleSnapshot,account:ReviewAccount,images:Record<string,ArticleImage>={}):Promise<ArticleReceipt>{
  validateArticleContent(snapshot.content);
  await this.sessions.localAccount(account.id);
  const binding=this.bound(account,snapshot);if(binding&&binding.status!=='draft')throw new ArticleError('这份稿件已提交审核。请先撤回并创建修改稿，原记录会保留。',409);
  const pending=this.read<ArticleOperation>(keyFor(account.id,snapshot.key)+':pending');if(pending)throw new ArticleError('上次保存的结果还未确认，请先恢复上次保存。');
  const {content,source,attachments}=await this.prepare(snapshot,account,images);
  const body={operationId:crypto.randomUUID(),content,...(binding?{revisionId:binding.revisionId,expectedVersion:binding.draftVersion,expectedFingerprint:binding.fingerprint}:snapshot.base?{articleId:snapshot.base.articleId,baseVersion:snapshot.base.version}:{})};
  const operation:ArticleOperation={accountId:account.id,key:snapshot.key,originalSource:snapshot.source,source,content,locale:snapshot.locale,attachments,body};
  this.save(keyFor(account.id,snapshot.key)+':pending',operation);return this.sendDraft(account,operation);
 }
 private async prepare(snapshot:ArticleSnapshot,account:ReviewAccount,images:Record<string,ArticleImage>={}) {
  validateArticleContent(snapshot.content);
  const content=structuredClone(snapshot.content);content.title=content.title.trim();content.summary=content.summary.trim();const attachments:ReviewAttachment[]=[];
  const refs=(content.mediaRefs||[]).map(ref=>{const note=images[articleImageUrl(ref)];if(!note)return ref;validateArticleImage(note);return {...ref,...Object.fromEntries(['alt','caption','author','sourceTitle','sourceUrl','rightsBasis','rightsEvidence'].map(key=>[key,String((note as any)[key]||'')]))};});
  const identities=new Set(refs.map(ref=>ref.galleryId?'gallery:'+ref.galleryId:'asset:'+ref.assetId));
  if(snapshot.attachments.some(asset=>asset.staged&&asset.staged.ownerId!==account.id))throw new ArticleError('图片属于另一位上传者，请切回原账号或重新选择图片。',409);
  for(const asset of snapshot.attachments)if(asset.url.startsWith('/images/novel-prototype/'))identities.add('asset:'+(asset.url.match(/\/([a-f0-9]{64})\./)?.[1]||asset.url));
  if(identities.size>20)throw new ArticleError('一篇文章最多登记 20 张图片。');
  for(const asset of snapshot.attachments){
   if(!asset.url.startsWith('/images/novel-prototype/')){const image=asset.staged?.purpose==='article'?refs.find(ref=>ref.assetId===asset.staged!.id):undefined;attachments.push(image?{...asset,staged:{...asset.staged!,image}}:asset);continue;}
   const existing=refs.find(ref=>ref.assetId===asset.url.match(/\/([a-f0-9]{64})\./)?.[1]);
   if(existing){const reference=articleImageUrl(existing);content.body=content.body.split(asset.url).join(reference);attachments.push({...asset,url:reference,originalUrl:asset.url});continue;}
   const image=images[asset.url];if(!image)throw new ArticleError('请先检查每张新图片的说明。');validateArticleImage(image);
   let response:Response;try{response=await this.request(asset.url,{credentials:'same-origin'});}catch{throw new ArticleError('本机图片读取中断，请保留原图后重试。');}if(!response.ok)throw new ArticleError('本机原图暂时找不到，请返回正文重新选择图片。');
   const blob=await response.blob(),form=new FormData();form.set('image',blob,asset.alt||'article-image');form.set('metadata',JSON.stringify({declaredMime:blob.type}));
   const {asset:uploaded}=await this.call<{asset:{id:string;reference:string}}>(account,'/api/articles/assets','POST',form);
   const reused=refs.find(ref=>ref.assetId===uploaded.id),reference=reused?articleImageUrl(reused):uploaded.reference;
   content.body=content.body.split(asset.url).join(reference);if(!reused)refs.push({...image,assetId:uploaded.id});attachments.push({...asset,url:reference,originalUrl:asset.url});
  }
  if(refs.length)content.mediaRefs=refs;
  if(articleLocalImages(content.body).length)throw new ArticleError('文章还有未暂存的本机图片，请返回正文检查图片后重试。');
  return {content,source:articleSourceWithContent(snapshot.source,content),attachments};
 }
 private receipt(account:ReviewAccount,operation:ArticleOperation,revision:ArticleRevision):ArticleReceipt {
  const binding=bindingFor(revision),receipt={binding,content:revision.content,source:articleSourceWithContent(operation.source,revision.content),originalSource:operation.originalSource,attachments:operation.attachments};
  this.save(keyFor(account.id,operation.key)+':binding',binding);this.save(keyFor(account.id,operation.key)+':receipt',receipt);return receipt;
 }
 private async sendDraft(account:ReviewAccount,operation:ArticleOperation):Promise<ArticleReceipt>{
  try{
   let revision:ArticleRevision|undefined;
   if(operation.body.revisionId){const current=await this.detail(account,operation.body.revisionId);if(current.draft_version===operation.body.expectedVersion+1&&sameArticleContent(current.content,operation.content))revision=current;}
   if(!revision){
    const result=await this.call<{revisionId:string;fingerprint?:string;draftVersion?:number;content?:ArticleContent}>(account,'/api/articles/drafts?locale='+encodeURIComponent(operation.locale),'POST',operation.body);
    const fresh=await this.detail(account,result.revisionId);
    // The POST receipt describes this save; a later GET may already contain
    // another page's edit. Keep our saved version and let load show that conflict.
    revision=result.content&&result.fingerprint&&result.draftVersion?{...fresh,content:result.content,fingerprint:result.fingerprint,draft_version:result.draftVersion}:fresh;
   }
   const receipt=this.receipt(account,operation,revision);this.storage.removeItem(keyFor(account.id,operation.key)+':pending');return receipt;
  }catch(error){if(error instanceof ArticleError&&error.status>=400&&error.status<500)this.storage.removeItem(keyFor(account.id,operation.key)+':pending');throw error;}
 }
 async retryDraft(state:ArticleState){if(!state.pending)throw new ArticleError('没有待恢复的文章保存，请刷新记录。');return this.sendDraft(state.account,state.pending);}
 async submit(account:ReviewAccount,revision:ArticleRevision){
  validateArticleContent(revision.content,true);for(const image of revision.content.mediaRefs||[])validateArticleImage(image,true);
  if(articleLocalImages(revision.content.body).length)throw new ArticleError('文章还有未暂存的本机图片，请先保存账号草稿。');
  try{await this.call(account,'/api/articles/revisions/'+revision.id+'/submit','POST',{expectedVersion:revision.draft_version,expectedFingerprint:revision.fingerprint});}catch(error){const fresh=await this.detail(account,revision.id).catch(()=>null);if(!fresh||!['pending','approved','rejected'].includes(fresh.status)||fresh.fingerprint!==revision.fingerprint||fresh.draft_version!==revision.draft_version)throw error;}
  return this.detail(account,revision.id);
 }
 async withdraw(account:ReviewAccount,revision:ArticleRevision){await this.call(account,'/api/articles/revisions/'+revision.id+'/withdraw','POST',{updatedAt:revision.updated_at,fingerprint:revision.fingerprint});return this.detail(account,revision.id);}
 async fork(account:ReviewAccount,snapshot:ArticleSnapshot,revision:ArticleRevision,images:Record<string,ArticleImage>={}){
  const expected=this.bound(account,snapshot);if(expected?.articleId!==revision.article_id||revision.locale!==snapshot.locale)throw new ArticleError('请先在记录中打开要修改的文章，再创建修改稿。',409);
  let baseVersion=revision.base_version;try{const item=await this.call<{article:{version:number};permissions:{canEdit:boolean}}>(account,'/api/articles/items/'+revision.article_id+'?locale='+revision.locale);if(!item.permissions.canEdit)throw new ArticleError('当前账号没有编辑这篇文章的权限。',403);const expected=revision.base_version+(revision.status==='approved'?1:0);if(item.article.version!==expected)throw new ArticleError('文章已有新的公开版本。当前本地修改仍保留，请先核对最新公开正文，再创建修改稿。',409);baseVersion=item.article.version;}catch(error){if(!(error instanceof ArticleError&&error.status===404&&baseVersion===0))throw error;}
  if(this.read<ArticleOperation>(keyFor(account.id,snapshot.key)+':pending'))throw new ArticleError('上次保存的结果还未确认，请先恢复上次保存。');
  const {content,source,attachments}=await this.prepare(snapshot,account,images);
  const operation:ArticleOperation={accountId:account.id,key:snapshot.key,originalSource:snapshot.source,source,content,locale:snapshot.locale,attachments,body:{operationId:crypto.randomUUID(),articleId:revision.article_id,baseVersion,content,...(revision.status==='rejected'||revision.withdrawn_at?{parentRevisionId:revision.id}:{})}};
  this.save(keyFor(account.id,snapshot.key)+':pending',operation);return this.sendDraft(account,operation);
 }
 async simulate(account:ReviewAccount,revision:ArticleRevision,action:'approve'|'reject',note:string){if(!localEditorHost())throw new ArticleError('正式审核请使用管理工作区。',403);await this.call(account,'/__local/article-event','POST',{accountId:account.id,id:revision.id,action,note});return this.detail(account,revision.id);}
 async switchAccount(account:ReviewAccount){await this.sessions.switchAccount(account);}
}
