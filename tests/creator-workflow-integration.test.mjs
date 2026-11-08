import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {backendURL} from './backend-root.mjs';
import {JSDOM} from 'jsdom';
import {creatorCenterCopy} from '../src/lib/creatorCenterCopy.mjs';
// The same integration suite supports normal sibling checkouts and auth worktrees.
const backendRoot=backendURL('');
const {fixture}=await import(new URL('tests/accountFixture.mjs',backendRoot));
const {default:worker}=await import(new URL('src/index.js',backendRoot));
const {adminRuntime}=await import(new URL('src/generated/adminRuntime.js',backendRoot));
const {installContentAdmin,renderContentAdminBody}=await import(new URL('src/contentAdmin.js',backendRoot));
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const source=await build({entryPoints:[resolve('src/scripts/creatorCenter.js')],bundle:true,write:false,format:'iife',plugins:[{name:'account-fixture',setup(b){
 b.onResolve({filter:/accountStore\.js$/},()=>({path:'account',namespace:'fixture'}));
 b.onResolve({filter:/galleryDraftStore\.mjs$/},()=>({path:'storage',namespace:'fixture'}));
 b.onLoad({filter:/.*/,namespace:'fixture'},a=>({contents:a.path==='account'?'export const state=window.qaAccount;export async function refreshAuth(){return state.viewer;}export function loginUrl(){return \"https://api.example/auth/sign-in\";}':'export async function galleryDraft(){return null;}export async function listGalleryDrafts(){return [];}'}));
}}]});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(fn())return;await sleep(10);}assert.ok(fn(),'UI state did not settle');}
async function setup(intercept){
 const {db,env}=await fixture();env.ADMIN_IDENTITIES='github:alice';
 const copy=creatorCenterCopy('zh');
 const dom=new JSDOM(`<main data-creator-center data-locale="zh" data-api="https://api.example" data-editor-api="https://api.example">
 <div class="creator-main"></div><nav class="account-sections"></nav><div data-creator-guest></div><p data-creator-status></p>
 <form data-creator-filters><input name="q"><select name="type"><option value=""></option><option value="article">Article</option></select><select name="state"><option value=""></option></select></form>
 <button data-detail-close></button><div data-detail-backdrop hidden></div><aside data-creator-detail hidden><div data-detail-content></div><footer data-detail-footer></footer></aside>
 <h2 id="creator-records-title"></h2><div data-creator-rows></div><div data-records-status></div><button data-page-previous></button><button data-page-next></button><button data-creator-refresh></button>
 <div data-creator-drafts></div><div data-creator-todo></div><div data-todo-count></div><div data-creator-notifications></div><div data-notification-count></div>
 ${['attention','draft','review','published'].map(k=>`<b data-metric-count="${k}"></b>`).join('')}</main>`,{url:'https://wiki.example/zh/account/creator/',runScripts:'outside-only'});
 const w=dom.window;w.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};Object.defineProperty(w.HTMLElement.prototype,'offsetWidth',{get(){return 800;}});Object.defineProperty(w.HTMLElement.prototype,'offsetHeight',{get(){return 40;}});w.eval(adminRuntime);w.document.querySelector('main').dataset.copy=JSON.stringify(copy);w.qaAccount={viewer:{userId:'bob'}};w.AbortSignal=AbortSignal;w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value;this.open=false;this.dispatchEvent(new w.Event('close'));};
 const call=(path,method='GET',body,owner='bob')=>worker.fetch(new Request('https://api.example'+path,{method,headers:{Cookie:`kfw_auth_session=${owner}`,Origin:'https://wiki.example',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),env,{waitUntil(){}});
 const calls=[];w.fetch=async(url,options={})=>{const path=new URL(url).pathname+new URL(url).search,body=options.body?JSON.parse(options.body):undefined,record={path,method:options.method,body};calls.push(record);const invoke=()=>call(path,options.method,body,w.qaAccount.viewer?.userId||'');const response=await(intercept?intercept({path,options,invoke,w}):invoke());if(options.method==='POST'&&path.startsWith('/api/articles/drafts'))record.result=await response.clone().json();return response;};
 return {db,w,copy,call,calls,start(){w.eval(source.outputFiles[0].text);},async close(){await sleep(40);w.dispatchEvent(new w.Event('pagehide'));w.close();db.sqlite.close();}};
}
test('Creator Center actual buttons delete article and photo drafts through real Worker handlers',async()=>{
 const q=await setup();try{
 const created=await(await q.call('/api/articles/drafts','POST',{content:{locale:'zh',title:'QA article',category:'archival',summary:'QA summary',body:'QA content'}})).json();assert.ok(created.revisionId);
 const photo=await q.call('/api/gallery/batches','POST',{id:'qa-photo-draft',kind:'photos'});assert.equal(photo.status,201);
 q.start();await until(()=>q.w.document.querySelectorAll('.creator-record').length===2);
 for(const title of ['QA article',null]){
  const cards=[...q.w.document.querySelectorAll('.creator-record')];const card=title?cards.find(c=>c.textContent.includes(title)):cards[0];
  card.querySelector('.creator-delete-draft').click();await until(()=>q.w.document.querySelector('[data-confirm-dialog]'));
  const dialog=q.w.document.querySelector('[data-confirm-dialog]');assert.ok(dialog.open);dialog.querySelector('.creator-delete-confirm').click();
  await until(()=>q.w.document.querySelectorAll('.creator-record').length===cards.length-1);
 }
 assert.equal((await q.call('/api/articles/revisions/'+created.revisionId)).status,404);
 assert.equal((await q.call('/api/gallery/batches/qa-photo-draft')).status,404);
 assert.equal(q.calls.filter(c=>c.method==='DELETE').length,2);
 }finally{await q.close();}
});
test('Back navigation cancels queued Creator Center search',async()=>{
 const q=await setup();try{q.start();await until(()=>q.calls.length>=4);const input=q.w.document.querySelector('[name=q]');input.value='stale';input.dispatchEvent(new q.w.Event('input',{bubbles:true}));q.w.history.replaceState(null,'','?type=article');q.w.dispatchEvent(new q.w.PopStateEvent('popstate'));await sleep(300);assert.equal(q.w.location.search,'?type=article');assert.ok(!q.calls.some(c=>c.path.includes('q=stale')));}finally{await q.close();}
});
test('Late notifications from the previous account never appear after sign out',async()=>{
 let release;const q=await setup(async({path,invoke})=>path==='/api/account/notifications'?new Promise(r=>{release=()=>r(Response.json({items:[{event_type:'returned',review_note:'private previous account',source_type:'article',record_id:'old'}],unread:1}));}):invoke());
 try{q.start();await until(()=>release);q.w.qaAccount.viewer=null;q.w.dispatchEvent(new q.w.CustomEvent('kamitsubaki-account-state'));release();await sleep(40);assert.ok(!q.w.document.querySelector('[data-creator-notifications]').textContent.includes('private previous account'));}finally{await q.close();}
});
test('Timeline detail keeps external GitHub URLs and public event anchors intact',async()=>{
 const q=await setup(({path,invoke})=>path==='/api/chronicle/submissions/timeline-proof'?Response.json({title:'Timeline QA',status:'published',url:'https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/pull/123',eventId:'event-qa'}):invoke());
 try{q.w.history.replaceState(null,'','?recordType=timeline&record=timeline-proof');q.start();await until(()=>q.w.document.querySelector('[data-detail-footer] a'));
 const links=[...q.w.document.querySelectorAll('[data-detail-footer] a')];assert.ok(links.some(a=>a.href==='https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/pull/123'));assert.ok(links.some(a=>new URL(a.href).hash==='#event-qa'));
 }finally{await q.close();}
});
test('pending articles delete from their card, and returned articles expose revise and delete together',async()=>{
 for(const returned of [false,true]){
 const q=await setup();try{
  const created=await(await q.call('/api/articles/drafts','POST',{content:{locale:'zh',title:'QA lifecycle',category:'archival',summary:'QA summary',body:'QA body'}})).json();
  const path='/api/articles/revisions/'+created.revisionId;
  assert.equal((await q.call(path+'/submit','POST',{})).status,200);
  if(returned){assert.equal((await q.call('/api/admin/articles/revisions/'+created.revisionId+'/reject','POST',{note:'QA source needed'},'alice')).status,200);q.w.history.replaceState(null,'','?recordType=article&record='+created.revisionId);}
  q.start();await until(()=>q.w.document.querySelector('.creator-record .creator-delete-draft'));
  if(returned){await until(()=>q.w.document.querySelector('[data-detail-footer] .creator-delete-draft'));const footer=q.w.document.querySelector('[data-detail-footer]');assert.ok([...footer.querySelectorAll('a')].some(a=>a.textContent.includes(q.copy.revise)&&a.search.includes(created.revisionId)));assert.ok(footer.textContent.includes(q.copy.close));}
  q.w.document.querySelector('.creator-record .creator-delete-draft').click();await until(()=>q.w.document.querySelector('[data-confirm-dialog]'));q.w.document.querySelector('.creator-delete-confirm').click();await until(()=>!q.w.document.querySelector('.creator-record'));
  assert.equal((await q.call(path)).status,404);
  assert.equal((await(await q.call('/api/admin/articles/revisions','GET',null,'alice')).json()).revisions.length,0);
 }finally{await q.close();}
 }
});
test('an HTML authentication page is reported as an API error rather than an empty contribution list',async()=>{
 const q=await setup(({path,invoke})=>path.startsWith('/api/account/contributions?')?new Response('<html>Sign in</html>',{headers:{'Content-Type':'text/html'}}):invoke());
 try{q.start();await until(()=>q.w.document.querySelector('[data-creator-status]').textContent===q.copy.error);assert.ok(!q.w.document.querySelector('.creator-record'));}finally{await q.close();}
});
test('legacy records without a title remain identifiable in the contribution list',async()=>{
 const q=await setup(({path,invoke})=>path.startsWith('/api/account/contributions?')?Response.json({items:[{id:'legacy-photo-123',type:'gallery',kind:'photos',title:'',state:'published',phase:'hidden'}],nextOffset:null}):invoke());
 try{q.start();await until(()=>q.w.document.querySelector('.creator-record h3'));assert.equal(q.w.document.querySelector('.creator-record h3').textContent,q.copy.gallery+' · legacy-p');}finally{await q.close();}
});
test('content cards keep filters and detail actions connected to the Worker',async()=>{
 const q=await setup();try{
  const created=await(await q.call('/api/admin/articles/drafts','POST',{content:{title:'QA card',body:'Body',summary:'Summary',category:'archival'}},'alice')).json();
  assert.equal((await q.call('/api/admin/articles/revisions/'+created.revisionId+'/publish','POST',{},'alice')).status,200);
  q.w.history.replaceState(null,'','?type=article&q=QA');
  q.w.document.body.innerHTML=renderContentAdminBody('https://wiki.example');
  q.w.fetch=(url,opts={})=>q.call(url,opts.method,opts.body?JSON.parse(opts.body):undefined,'alice');
  q.w.eval(`(${installContentAdmin.toString()})();`);
  await until(()=>q.w.document.querySelector('.content-admin-card'));
  const filters=q.w.document.querySelector('[data-filter-disclosure]');assert.equal(filters.open,false);
  assert.equal(q.w.document.querySelector('[data-active-filters]').textContent,'QA');
  q.w.document.querySelector('.content-admin-card').click();await until(()=>q.w.document.querySelector('.content-admin-detail-body').textContent.includes('Summary'));
  assert.equal(q.w.document.querySelector('.content-admin-card').getAttribute('aria-pressed'),'true');
  q.w.document.querySelector('[data-close-detail]').click();assert.equal(q.w.document.activeElement.className,'content-admin-card');
  const form=q.w.document.querySelector('[data-filters]');form.elements.namedItem('q').value='Missing';form.dispatchEvent(new q.w.Event('submit',{cancelable:true}));
  await until(()=>q.w.document.querySelector('[data-list]').textContent.includes('没有匹配'));
  assert.equal(new URL(q.w.location.href).searchParams.get('q'),'Missing');assert.equal(q.w.document.querySelector('[data-active-filters]').textContent,'Missing');
 }finally{await q.close();}
});

test('content character deep link survives delayed options without restoring a cleared filter',async()=>{
 const q=await setup();let release;const requests=[];
 try{
  q.w.history.replaceState(null,'','?type=photos&character=kaf');
  q.w.document.body.innerHTML=renderContentAdminBody('https://wiki.example');
  q.w.fetch=async url=>{requests.push(url);if(url.includes('gallery/entities'))return new Promise(resolve=>{release=()=>resolve(Response.json({entities:[{id:'kaf',labels:{zh:'花譜'}}]}));});return Response.json({items:[],total:0,nextOffset:null});};
  q.w.eval(`(${installContentAdmin.toString()})();`);
  await until(()=>requests.some(url=>url.includes('entity=kaf')));
  assert.equal(new URL(q.w.location.href).searchParams.get('character'),'kaf');
  q.w.document.querySelector('[data-reset]').click();release();
  await until(()=>q.w.document.querySelector('option[value=kaf]').textContent==='花譜');
  assert.equal(q.w.document.querySelector('select[name=character]').value,'');
  assert.equal(new URL(q.w.location.href).searchParams.has('character'),false);
 }finally{await q.close();}
});

// Account UI uses real Worker authorization and account queries; only the remote AI service is simulated.
const {renderAccountAdmin,installAccountAdmin}=await import(new URL('src/accountAdmin.js',backendRoot));
const {installCompanionAdmin}=await import(new URL('src/companionAdminClient.js',backendRoot));
const {installAdminUI}=await import(new URL('src/adminClient.js',backendRoot));
async function unifiedAccountUI(gateway){
 const q=await setup();
 // Route the browser through fixture Worker. The remote AI protocol is stubbed at the UI boundary here.
 q.w.document.body.innerHTML=renderAccountAdmin();
 q.w.fetch=async(url,opts={})=>{const parsed=new URL(url,q.w.location.href),path=parsed.pathname+parsed.search;return path.startsWith('/api/admin/companion/')?gateway(path,opts):q.call(path,opts.method,opts.body?JSON.parse(opts.body):undefined,'alice');};
 q.w.eval(`(${installAdminUI.toString()})();`);q.w.AdminUI.confirm=async()=>true;
 q.w.eval(`(${installAccountAdmin.toString()})();(${installCompanionAdmin.toString()})();`);
 await until(()=>q.w.document.querySelectorAll('[data-users] button').length===2);return q;
}
const aiData=id=>({user:{userId:id,displayName:id,provider:'github',providerUserId:id,status:'active'},conversations:[{id:'chat-'+id,title:'Chat '+id,messageCount:2,agentId:'observer'}],memories:[{id:'memory-'+id,title:'Memory '+id,content:'Original',agentId:'',enabled:true}]});
test('unified account UI loads AI inline and preserves conversation, memory and AI permission controls',async()=>{
 const calls=[];const q=await unifiedAccountUI(async(url,opts)=>{calls.push([url,opts.method,opts.body]);return Response.json(url.includes('/conversations/')?{conversation:{title:'Chat alice'},messages:[{role:'user',content:'Hello'}]}:aiData('alice'));});
 try{
  q.w.document.querySelector('[data-user-view]').click();await until(()=>q.w.document.querySelector('[data-admin-memory-save]'));
  const ai=q.w.document.querySelector('[data-account-ai-user]');assert.match(ai.textContent,/AI 使用：正常/);assert.equal(q.w.document.querySelector('[data-companion-dialog]').open,false);
  ai.querySelector('[name=content]').value='Updated';ai.querySelector('[data-admin-memory-save]').click();await until(()=>calls.some(c=>c[1]==='PUT'));
  assert.equal(JSON.parse(calls.find(c=>c[1]==='PUT')[2]).content,'Updated');
  await until(()=>q.w.document.querySelector('[data-user-status]'));
  q.w.document.querySelector('[data-user-status]').click();await until(()=>calls.some(c=>c[1]==='PATCH'));assert.equal(JSON.parse(calls.find(c=>c[1]==='PATCH')[2]).status,'suspended');
  await until(()=>q.w.document.querySelector('[data-conversation-view]'));
  q.w.document.querySelector('[data-conversation-view]').click();await until(()=>q.w.document.querySelector('[data-companion-dialog]').open);assert.match(q.w.document.querySelector('[data-dialog-body]').textContent,/Hello/);assert.equal(q.w.document.querySelector('[data-admin-navigation]').open,false);
  q.w.document.querySelector('[data-dialog-close]').click();assert.equal(q.w.document.querySelector('[data-companion-dialog]').open,false);
  q.w.document.querySelector('[data-admin-memory-delete]').click();await until(()=>calls.some(c=>c[1]==='DELETE'));
 }finally{await q.close();}
});
test('switching accounts discards late AI results and AI errors leave account actions usable',async()=>{
 let release;const q=await unifiedAccountUI(url=>url.endsWith('/alice')?new Promise(resolve=>{release=()=>resolve(Response.json(aiData('alice')));}):Promise.resolve(Response.json({error:{code:'user_not_found'}},{status:404})));
 try{
  q.w.document.querySelector('[data-user-view]').click();await until(()=>release);
  q.w.document.querySelectorAll('[data-users] button')[1].click();release();await sleep(20);
  assert.equal(q.w.document.querySelector('[data-account-ai-user]').dataset.accountAiUser,'bob');assert.doesNotMatch(q.w.document.querySelector('[data-account-detail]').textContent,/Memory alice/);
  q.w.document.querySelector('[data-user-view]').click();await until(()=>q.w.document.querySelector('[data-account-ai-user]').textContent.includes('尚未建立'));
  assert.match(q.w.document.querySelector('[data-account-detail]').textContent,/撤销全部会话/);
  const form=q.w.document.querySelector('[data-search]');form.elements.q.value='bob';form.dispatchEvent(new q.w.Event('submit',{cancelable:true}));await until(()=>q.w.document.querySelectorAll('[data-users] button').length===1);
 }finally{await q.close();}
});

const {renderCommunityAdmin}=await import(new URL('src/community/admin.js',backendRoot));
async function communityAdminUI(){
 const q=await setup();q.w.Intl=Intl;q.w.structuredClone=structuredClone;q.w.confirm=()=>false;
 const html=renderCommunityAdmin('https://wiki.example');q.w.document.body.innerHTML=html;
 q.w.fetch=async(url,opts={})=>{const parsed=new URL(url,q.w.location.href);return q.call(parsed.pathname+parsed.search,opts.method,opts.body?JSON.parse(opts.body):undefined,'alice');};
 q.w.eval(`(${installAdminUI.toString()})();`);q.w.AdminUI.confirm=async()=>true;
 q.w.eval(q.w.document.querySelector('script').textContent);
 await until(()=>q.w.document.querySelector('[data-queue]').getAttribute('aria-busy')==='false'&&q.w.document.querySelector('[data-list-count]').textContent==='0 项');
 return {...q,root:q.w.document.querySelector('[data-community-admin]')};
}
test('community admin actual controls save, publish, protect unsaved input and return to the current version',async()=>{
 const q=await communityAdminUI();try{
 assert.equal(q.root.querySelector('[data-detail]').hidden,true);q.root.querySelector('[data-manager-new]').click();await until(()=>!q.root.querySelector('[data-edit-surface]').hidden);
 const form=q.root.querySelector('[data-activity-editor] form');for(const [name,value]of Object.entries({title:'UI integration project',summary:'Test only',organizer:'QA',sourceUrl:'https://example.org/source'})){form.elements[name].value=value;form.elements[name].dispatchEvent(new q.w.Event('input',{bubbles:true}));}
 q.w.AdminUI.confirm=async()=>false;q.root.querySelector('[data-manager-view=activities]').click();await sleep(15);assert.equal(q.root.dataset.view,'drafts');assert.equal(form.elements.title.value,'UI integration project');
 form.querySelector('[data-editor-save]').click();await until(()=>q.root.querySelector('[data-record-id]')&&form.querySelector('[data-editor-save]').disabled===false);assert.match(q.w.location.search,/revision=/);assert.match(form.querySelector('[data-editor-status]').textContent,/草稿已保存/);
 q.w.AdminUI.confirm=async()=>true;form.querySelector('[data-editor-publish]').click();await until(()=>q.root.dataset.view==='activities'&&q.root.querySelector('[data-detail-state]').textContent.includes('公开版本 1')&&!form.elements.title.disabled);
 assert.equal(q.root.querySelector('[data-management-controls]').hidden,false);const link=new URL(q.root.querySelector('[data-public-link]').href),id=link.pathname.split('/').filter(Boolean).at(-1);const publicDoc=await(await q.call('/api/community-activities/items/'+id)).json();assert.equal(publicDoc.activity.title,'UI integration project');
 await q.call('/api/admin/community-activities/items/'+id+'/promotion','POST',{accountId:'alice',version:1,featuredRank:null},'alice');form.elements.title.value='Retain conflict input';form.elements.title.dispatchEvent(new q.w.Event('input',{bubbles:true}));form.querySelector('[data-editor-save]').click();await until(()=>form.querySelector('[data-editor-save]').disabled===false&&form.querySelector('[data-editor-status]').textContent.includes('版本'));
 assert.equal(form.elements.title.value,'Retain conflict input');assert.equal((await(await q.call('/api/community-activities/items/'+id)).json()).activity.title,'UI integration project');
 }finally{await q.close();}
});

test('series UI can save a hidden draft, restore its public version and publish another revision',async()=>{
 const q=await communityAdminUI();try{
 q.root.querySelector('[data-manager-view=series]').click();await until(()=>q.root.dataset.view==='series'&&q.root.querySelector('[data-queue]').getAttribute('aria-busy')==='false');q.root.querySelector('[data-manager-new]').click();await until(()=>!q.root.querySelector('[data-edit-surface]').hidden);const form=q.root.querySelector('[data-series-editor] form');form.elements.title.value='Series first edition';form.querySelector('[data-editor-publish]').click();await until(()=>q.root.querySelector('[data-series-hide]').hidden===false&&!form.elements.title.disabled);
 const id=new URL(q.root.querySelector('[data-public-link]').href).pathname.split('/').filter(Boolean).at(-1);assert.ok(q.root.querySelector('[data-activity-editor] [name=seriesId] option[value=\"'+id+'\"]'),'new series must become available without a page reload');q.root.querySelector('[data-series-hide]').click();await until(()=>q.root.querySelector('[data-series-hide]').textContent==='恢复系列');form.elements.title.value='Series next draft';form.elements.title.dispatchEvent(new q.w.Event('input',{bubbles:true}));form.querySelector('[data-editor-save]').click();await until(()=>form.querySelector('[data-editor-status]').textContent==='草稿已保存'&&!form.querySelector('[data-editor-save]').disabled);q.root.querySelector('[data-series-hide]').click();await until(()=>q.root.querySelector('[data-series-hide]').textContent==='下架系列');assert.equal((await(await q.call('/api/community-activities/series/'+id)).json()).series.title,'Series first edition');
 form.querySelector('[data-editor-publish]').click();await until(()=>!form.elements.title.disabled&&(q.root.querySelector('[data-detail-state]').textContent==='已公开'));assert.equal((await(await q.call('/api/community-activities/series/'+id)).json()).series.title,'Series next draft');
 }finally{await q.close();}
});

test('queued PR deletion is visible, cannot be submitted again, and disappears after refresh readback',async()=>{
 let phase='pending_review',removed=false;
 const q=await setup(async({path,options,invoke})=>{
  if(path.startsWith('/api/account/contributions?'))return Response.json({items:removed?[]:[{id:'pr-delete',type:'entry',kind:'entry',title:'羽累',state:'review',phase,raw_status:'open',updated_at:'2026-10-25'}],nextOffset:null});
  if(path==='/api/editor/submissions/pr-delete'){
   if(options.method==='DELETE'){phase='deleting';return Response.json({deleting:true},{status:202});}
   return Response.json({id:'pr-delete',title:'羽累',status:'open',sync:phase==='deleting'?'pending':'synced',version:1});
  }
  if(path==='/api/editor/submissions/pr-delete/refresh'){removed=true;return Response.json({status:'closed'});}
  return invoke();
 });
 try{
  q.start();await until(()=>q.w.document.querySelector('.creator-record .creator-delete-draft'));
  q.w.document.querySelector('.creator-record .creator-delete-draft').click();await until(()=>q.w.document.querySelector('[data-confirm-dialog]'));
  q.w.document.querySelector('.creator-delete-confirm').click();await until(()=>q.w.document.querySelector('.creator-state')?.textContent===q.copy.phase.deleting);
  assert.equal(q.w.document.querySelector('.creator-record .creator-delete-draft'),null);
  q.w.document.querySelector('[data-creator-refresh]').click();await until(()=>q.w.document.querySelectorAll('.creator-record').length===0);
  assert.equal(q.calls.filter(call=>call.method==='DELETE').length,1);
 }finally{await q.close();}
});

test('merged and failed-publication PRs keep their publication phase and never offer deletion',async()=>{
 const q=await setup(async({path,invoke})=>path.startsWith('/api/account/contributions?')?Response.json({items:[{id:'merged',type:'entry',kind:'entry',title:'已合并',state:'review',phase:'approved_syncing',raw_status:'merged'},{id:'failed',type:'entry',kind:'entry',title:'公开失败',state:'attention',phase:'publish_failed',raw_status:'failed'}],nextOffset:null}):invoke());
 try{q.start();await until(()=>q.w.document.querySelectorAll('.creator-record').length===2);assert.equal(q.w.document.querySelector('.creator-record .creator-delete-draft'),null);assert.match(q.w.document.querySelector('[data-creator-rows]').textContent,/已合并 · 公开失败/);assert.ok(!q.w.document.querySelector('[data-creator-rows]').textContent.includes(q.copy.reviewProgress),'merged records must not offer review progress');}finally{await q.close();}
});

test('pending deletion polls until completion without a manual refresh',async()=>{
 let removed=false,reads=0;
 const q=await setup(async({path,invoke})=>path.startsWith('/api/account/contributions?')?Response.json({items:++reads&&removed?[]:[{id:'poll-delete',type:'entry',kind:'entry',title:'自动刷新',state:'withdrawn',phase:'deleting'}],nextOffset:null}):invoke());
 try{
  Object.defineProperty(q.w.document,'hidden',{value:false,configurable:true});
  const timeout=q.w.setTimeout.bind(q.w);q.w.setTimeout=(fn,ms,...args)=>timeout(fn,ms===3000?80:ms,...args);
  q.start();await until(()=>q.w.document.querySelector('.creator-record'));
  removed=true;await until(()=>!q.w.document.querySelector('.creator-record'));
  assert.ok(reads>=2);assert.equal(q.calls.filter(call=>call.method==='DELETE').length,0);
 }finally{await q.close();}
});

test('pending deletion detail never offers synchronization retry',async()=>{
 const q=await setup(async({path,invoke})=>path.startsWith('/api/account/contributions?')?Response.json({items:[{id:'deleting',type:'entry',kind:'entry',title:'Deleting',state:'review',phase:'deleting'}],nextOffset:null}):path.startsWith('/api/editor/submissions/deleting')?Response.json({id:'deleting',title:'Deleting',status:'open',sync:'pending',deleteAfterClose:true,version:1}):invoke());
 try{q.w.history.replaceState(null,'','?record=deleting&recordType=entry');q.start();await until(()=>q.w.document.querySelector('#creator-detail-title')?.textContent==='Deleting');assert.ok(!q.w.document.querySelector('[data-detail-footer]').textContent.includes(q.copy.retrySync));}finally{await q.close();}
});
