import test from 'node:test';
import assert from 'node:assert/strict';
import {LocalArticleService,type ArticleRevision} from '../src/lib/article-service';
import {articleSnapshot,type ArticleImage} from '../src/lib/article-document';
const source='---\nschemaVersion: 2\nid: local-article\nlocale: zh\nentityType: editorial-article\ntitle: 本地文章\n---\n\n{{ruby::花譜::かふ}}\n';
const picture='/images/novel-prototype/'+'a'.repeat(64)+'.png';
const image:ArticleImage={alt:'测试图片',caption:'配文',author:'测试作者',sourceTitle:'原创测试',sourceUrl:'',rightsBasis:'original',rightsEvidence:''};
class MemoryStorage {values=new Map<string,string>();getItem(key:string){return this.values.get(key)??null;}setItem(key:string,value:string){this.values.set(key,value);}removeItem(key:string){this.values.delete(key);}}
function fakeServer(){
 const state={owner:'alice',lose:false,editAfterPost:false,reviewAfterSubmit:false,flipOnImage:false,publishedVersion:0,writes:[] as any[],revisions:new Map<string,ArticleRevision>(),operations:new Map<string,string>()};
 const request:typeof fetch=async(url,options={})=>{
  const path=String(url),method=options.method||'GET';
  if(path==='/api/editor/session')return Response.json({account:{id:state.owner,name:state.owner},mode:'local'});
  if(path===picture){if(state.flipOnImage)state.owner='bob';return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'image/png'}});}
  if(path==='/api/articles/mine')return Response.json({revisions:[...state.revisions.values()].filter(row=>row.author_id===state.owner),nextOffset:null});
  if(method==='GET'&&path.startsWith('/api/articles/revisions/')){const revision=state.revisions.get(path.split('/').at(-1)!);return revision?.author_id===state.owner?Response.json({revision}):Response.json({error:{message:'稿件不存在'}},{status:404});}
  if(method==='GET'&&path.startsWith('/api/articles/items/'))return state.publishedVersion?Response.json({article:{version:state.publishedVersion},permissions:{canEdit:true}}):Response.json({error:{message:'文章未发布'}},{status:404});
  const body=options.body instanceof FormData?options.body:JSON.parse(String(options.body||'null'));
  state.writes.push({path,body});
  if(path==='/api/articles/assets')return Response.json({asset:{id:'b'.repeat(64),reference:'/_private/article-assets/'+'b'.repeat(64)}});
  if(path.endsWith('/submit')){const revision=state.revisions.get(path.split('/').at(-2)!)!;if(revision.draft_version!==body.expectedVersion||revision.fingerprint!==body.expectedFingerprint)return Response.json({error:{code:'draft_conflict',message:'账号草稿已更新'}},{status:409});revision.status='pending';if(state.reviewAfterSubmit){state.reviewAfterSubmit=false;revision.status='approved';throw new TypeError('Lost response');}return Response.json({status:'pending'});}
  if(path.startsWith('/api/articles/drafts')){
   let revision=body.revisionId?state.revisions.get(body.revisionId):state.revisions.get(state.operations.get(body.operationId)||'');
   if(body.revisionId&&revision&&(revision.draft_version!==body.expectedVersion||revision.fingerprint!==body.expectedFingerprint))return Response.json({error:{code:'draft_conflict',message:'账号草稿已更新',server:{content:revision.content,fingerprint:revision.fingerprint,draftVersion:revision.draft_version,updatedAt:revision.updated_at}}},{status:409});
   if(!revision||body.revisionId){
    const version=body.revisionId?revision!.draft_version+1:1,id=revision?.id||'revision-'+state.revisions.size;
    const c=body.content;
    revision={id,article_id:body.articleId||revision?.article_id||'article-'+state.revisions.size,locale:'zh',base_version:body.baseVersion||0,content:{body:c.body,category:c.category,relatedEntities:c.relatedEntities,title:c.title,summary:c.summary,...(c.mediaRefs?{mediaRefs:c.mediaRefs}:{})},fingerprint:'fingerprint-'+id+'-'+version,draft_version:version,status:'draft',updated_at:'2026-10-14T00:00:0'+version+'Z',author_id:state.owner,author_name:state.owner};
    state.revisions.set(id,revision);state.operations.set(body.operationId,id);
   }
   if(state.lose){state.lose=false;throw new TypeError('Lost response');}
   const receipt={revisionId:revision.id,fingerprint:revision.fingerprint,draftVersion:revision.draft_version,content:revision.content};
   if(state.editAfterPost){state.editAfterPost=false;state.revisions.set(revision.id,{...revision,content:{...revision.content,body:'另一页面在保存之后修改了正文。'},fingerprint:revision.fingerprint+'-new',draft_version:revision.draft_version+1});}
   return Response.json(receipt);
  }
  throw Error('Unexpected request: '+path);
 };
 return {state,request};
}
test('directly staged article images reuse their receipt and cannot be adopted by another author',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),id='d'.repeat(64),url='/_private/article-assets/'+id;
 const image={assetId:id,alt:'内容',caption:'配文',author:'作者',sourceTitle:'本人创作',sourceUrl:'',rightsBasis:'original',rightsEvidence:''};
 const ledger=[{url,alt:image.alt,source:'',staged:{purpose:'article' as const,id,ownerId:'alice',mime:'image/png',size:100,image}}];
 const snapshot=articleSnapshot('doc',source+'\n![内容]('+url+')\n',ledger),account=(await service.load(snapshot)).account;
 const receipt=await service.saveDraft(snapshot,account,{[url]:{...image,author:'修正作者'}});assert.equal(receipt.content.mediaRefs?.[0].assetId,id);assert.equal(state.writes.filter(row=>row.path==='/api/articles/assets').length,0);
 assert.equal(receipt.attachments[0].staged?.image?.author,'修正作者');assert.equal(articleSnapshot('doc',receipt.source,receipt.attachments,receipt.binding).content.mediaRefs?.[0].author,'修正作者');
 state.owner='bob';const writes=state.writes.length;
 await assert.rejects(service.saveDraft({...snapshot,key:'foreign'}, {id:'bob',name:'Bob'}),/另一位上传者/);assert.equal(state.writes.length,writes);
});
test('lost article responses restore one immutable operation and recognize reordered API fields on update',async()=>{
 const {state,request}=fakeServer(),store=new MemoryStorage(),service=new LocalArticleService(request,store);
 let snapshot=articleSnapshot('doc',source),loaded=await service.load(snapshot);state.lose=true;
 await assert.rejects(service.saveDraft(snapshot,loaded.account),/连接中断/);
 loaded=await service.load({...snapshot,source:source+'之后的写作。',content:{...snapshot.content,body:snapshot.content.body+'之后的写作。'}});
 assert.ok(loaded.pending);let receipt=await service.retryDraft(loaded);
 assert.equal(receipt.originalSource,source);assert.equal(state.revisions.size,1);
 snapshot=articleSnapshot('doc',receipt.source,receipt.attachments,receipt.binding);
 const newer=articleSnapshot('doc',snapshot.source+'\n新补充。\n',snapshot.attachments,snapshot.binding);state.lose=true;
 await assert.rejects(service.saveDraft(newer,loaded.account),/连接中断/);
 loaded=await service.load(newer);assert.equal(loaded.recovered?.binding.draftVersion,2);assert.equal(loaded.conflict,undefined);assert.equal(loaded.pending,undefined);
 assert.equal(state.writes.filter(row=>row.path.startsWith('/api/articles/drafts')).length,3);
});
test('the POST receipt preserves the saved prose even when another page edits before the following GET',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),snapshot=articleSnapshot('doc',source),account=(await service.load(snapshot)).account;
 state.editAfterPost=true;const receipt=await service.saveDraft(snapshot,account);assert.equal(receipt.content.body,snapshot.content.body);assert.equal(receipt.binding.draftVersion,1);
 const loaded=await service.load(articleSnapshot('doc',receipt.source,receipt.attachments,receipt.binding));assert.equal(loaded.conflict?.content.body,'另一页面在保存之后修改了正文。');
 await assert.rejects(service.submit(account,{...loaded.revision!,content:receipt.content,fingerprint:receipt.binding.fingerprint,draft_version:receipt.binding.draftVersion}),/草稿已更新/);assert.equal(state.revisions.get(receipt.binding.revisionId)?.status,'draft');
});
test('a lost submission acknowledgement can recover an already reviewed version only when its content and version match',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),snapshot=articleSnapshot('doc',source),account=(await service.load(snapshot)).account;
 const receipt=await service.saveDraft(snapshot,account),revision=await service.detail(account,receipt.binding.revisionId);state.reviewAfterSubmit=true;
 assert.equal((await service.submit(account,revision)).status,'approved');
});
test('revision forks cannot silently adopt a newer public version as the base of stale local prose',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),snapshot=articleSnapshot('doc',source),account=(await service.load(snapshot)).account;
 const first=await service.saveDraft(snapshot,account),revision=state.revisions.get(first.binding.revisionId)!;revision.status='approved';state.publishedVersion=2;
 const saved=articleSnapshot('doc',first.source,first.attachments,{...first.binding,status:'approved'}),writes=state.writes.length;
 await assert.rejects(service.fork(account,saved,revision),/新的公开版本/);assert.equal(state.writes.length,writes);
 state.publishedVersion=1;assert.equal((await service.fork(account,saved,revision)).binding.baseVersion,1);
});
test('stale article pages keep their expected version and never replace a newer account draft',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),snapshot=articleSnapshot('doc',source),account=(await service.load(snapshot)).account;
 const first=await service.saveDraft(snapshot,account),stale=articleSnapshot('doc',first.source,first.attachments,first.binding);
 const newer=articleSnapshot('doc',first.source+'\n其他页面的补充。\n',first.attachments,first.binding);await service.saveDraft(newer,account);
 const loaded=await service.load(stale);assert.ok(loaded.conflict);assert.equal(loaded.binding?.draftVersion,1);
 await assert.rejects(service.saveDraft(stale,account),/草稿已更新/);
 assert.equal(state.revisions.get(first.binding.revisionId)?.content.body,newer.content.body);
});
test('new images are staged for revision forks and an account change during image reading stops every write',async()=>{
 const {state,request}=fakeServer(),service=new LocalArticleService(request,new MemoryStorage()),snapshot=articleSnapshot('doc',source),account=(await service.load(snapshot)).account;
 const first=await service.saveDraft(snapshot,account),revision=state.revisions.get(first.binding.revisionId)!;revision.status='rejected';
 const next=articleSnapshot('doc',first.source+'\n![测试图片]('+picture+')\n',first.attachments,{...first.binding,status:'rejected'});
 const receipt=await service.fork(account,next,revision,{[picture]:image});assert.equal(receipt.binding.articleId,revision.article_id);
 assert.equal(state.writes.find(row=>row.path.startsWith('/api/articles/drafts')&&row.body.parentRevisionId)?.body.parentRevisionId,revision.id);assert.equal(revision.status,'rejected');
 assert.ok(receipt.content.body.includes('/_private/article-assets/'));assert.ok(!receipt.content.body.includes('/images/novel-prototype/'));assert.equal(receipt.content.mediaRefs?.[0].author,image.author);assert.equal(receipt.attachments[0].originalUrl,picture);
 const staged=articleSnapshot('doc',receipt.source,receipt.attachments,receipt.binding),reference='/_private/article-assets/'+'b'.repeat(64);
 const revised=await service.saveDraft(staged,account,{[reference]:{...image,author:'暂存后补充的作者'}});
 assert.equal(revised.content.mediaRefs?.[0].author,'暂存后补充的作者');assert.equal(revised.content.mediaRefs?.[0].assetId,'b'.repeat(64));assert.equal(state.writes.filter(row=>row.path==='/api/articles/assets').length,1);
 const samePicture='/images/novel-prototype/'+'b'.repeat(64)+'.png',duplicate=articleSnapshot('doc',revised.source+'\n![再次使用同一图]('+samePicture+')\n',revised.attachments,revised.binding);
 const reused=await service.saveDraft(duplicate,account);assert.equal(reused.content.mediaRefs?.length,1);assert.ok(!reused.source.includes('/images/novel-prototype/'));assert.equal(state.writes.filter(row=>row.path==='/api/articles/assets').length,1);
 const writes=state.writes.length;state.flipOnImage=true;
 await assert.rejects(service.saveDraft(articleSnapshot('new',source+'\n![测试图片]('+picture+')\n'),account,{[picture]:image}),/账号已变化/);
 assert.equal(state.writes.length,writes);
 assert.equal((await service.load({...next,binding:receipt.binding})).foreign,true);
});


test('the admin host submits articles for review instead of publishing them', async () => {
 const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
 try {
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {__WIKI_EDITOR_HOST__: {admin: true, transport: 'local', locale: 'en'}}});
  const {state, request} = fakeServer(), service = new LocalArticleService(request, new MemoryStorage());
  const snapshot = articleSnapshot('admin-host', source, []);
  const saved = await service.saveDraft(snapshot, {id:'alice',name:'alice'});
  const result = await service.submit({id:'alice',name:'alice'}, state.revisions.get(saved.binding.revisionId)!);
  assert.equal(result.status, 'pending');
  assert.ok(state.writes.some(row => row.path.endsWith('/submit')));
  assert.ok(state.writes.every(row => !row.path.endsWith('/publish')));
 } finally {
  if (previous) Object.defineProperty(globalThis, 'window', previous);
  else Reflect.deleteProperty(globalThis, 'window');
 }
});
