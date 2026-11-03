import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import {reviewEditorPath} from '../lib/reviewEditor.mjs';
import {state,refreshAuth} from './accountStore.js';
const root=document.querySelector('[data-own-review]');
if(root){
 const c=JSON.parse(root.dataset.copy),view=root.querySelector('[data-review-content]'),status=root.querySelector('[data-review-status]'),reload=root.querySelector('[data-review-reload]');
 let owner=null,initialized=false,busy=false,generation=0,dirty=false;
 const drafts=new Map(),operations=new Map();
 const updateDirty=()=>{dirty=[...drafts.values()].some(value=>value.trim());};
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
 const el=(tag,text,parent=view)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(tag==='button'){n.className='workspace-button dui-btn dui-btn-ghost';n.dataset.uiKit='';}if(tag==='input'||tag==='textarea'){n.className='workspace-control '+(tag==='textarea'?'dui-textarea':'dui-input');n.dataset.uiKit='';}parent.append(n);return n;};
 const action=(text,fn,parent=view)=>{const b=el('button',text,parent);b.type='button';b.addEventListener('click',fn);return b;};
 async function call(path,body){
  const epoch=generation,actor=owner;
  if(!actor)throw Error(c.login);
  const response=await fetch(root.dataset.api.replace(/\/$/,'')+'/api/reviews'+path,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(20000),...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  if(epoch!==generation||state.viewer?.userId!==actor)throw Error(c.change);
  if(!(response.headers.get('content-type')||'').includes('application/json'))throw Error(c.failure);
  const result=await response.json();
  if(epoch!==generation||state.viewer?.userId!==actor)throw Error(c.change);
  if(!response.ok)throw Error(result.error?.message||c.failure);
  return result.data;
 }
 async function perform(task){
  if(busy)return;
  const epoch=generation;busy=true;reload.disabled=true;setLoadingStatus(status,c.loading);
  try{const message=await task();if(epoch===generation)status.textContent=message||'';}
  catch(e){if(epoch===generation)status.textContent=e.message||c.failure;}
  finally{if(epoch===generation){busy=false;reload.disabled=false;}}
 }
 async function load(){
  const epoch=generation;
  await perform(async()=>{
   await refreshAuth();if(epoch!==generation)return;
   owner=state.viewer?.userId||null;initialized=true;
   if(!owner){view.replaceChildren();const a=el('a',c.login);a.href=`/${root.dataset.locale}/account/?returnTo=${encodeURIComponent(location.href)}`;return c.login;}
   const params=new URL(location.href).searchParams,id=params.get('id');
   if(id)await open(id);
   else if(params.has('resource')){
    const resolved=await call('/resolve/'+encodeURIComponent(params.get('kind'))+'/'+encodeURIComponent(params.get('resource')));
    history.replaceState(history.state,'','?id='+encodeURIComponent(resolved.id));await open(resolved.id);
   }else{
    const records=await call(''),seen=new Set();view.replaceChildren();
    const append=rows=>{for(const q of rows){if(seen.has(q.id))continue;seen.add(q.id);const card=el('article');el('h2',q.title,card);el('p',c.status+'：'+(c.states[q.status]||q.status),card);const a=el('a',c.open,card);a.href=`?id=${encodeURIComponent(q.id)}`;}};
    if(!records.items.length)el('p',c.empty);append(records.items);
    if(records.nextOffset!==null){let offset=records.nextOffset;const more=action(c.more||c.retry,()=>void perform(async()=>{const next=await call('?offset='+offset);append(next.items);offset=next.nextOffset;more.disabled=offset===null;}));}
   }
  });
 }
 async function open(id){
  // Keep the existing form intact until readback succeeds.
  const data=await call('/'+encodeURIComponent(id)),q=data.request;
  void call('/'+encodeURIComponent(id)+'/seen',{}).catch(()=>{});
  view.replaceChildren();el('h2',q.title);el('p',c.status+'：'+(c.states[q.status]||q.status));el('p',c.note);
  const editorPath=reviewEditorPath(root.dataset.locale,q.kind,data.editor);
  if(editorPath&&(q.kind!=='articles'||['rejected','withdrawn'].includes(q.status))){const needsChanges=['rejected','withdrawn','changes','closed','conflict'].includes(q.status);const a=el('a',needsChanges?c.draft:c.source);a.href=editorPath;}
  el('h3',c.discussion);
  for(const event of data.events){if(event.data.note)el('p',event.data.note);}
  for(const thread of data.threads){
   const card=el('article');for(const message of thread.messages){el('strong',message.actor_name||message.actor_id,card);el('p',message.body,card);}
   const key=id+':'+thread.id,form=el('form',undefined,card),label=el('label',c.reply,form),input=el('textarea',undefined,label);
   input.required=true;input.maxLength=10000;input.rows=3;input.value=drafts.get(key)||'';
   input.addEventListener('input',()=>{drafts.set(key,input.value);updateDirty();});
   const submit=el('button',c.send,form);submit.type='submit';
   form.addEventListener('submit',e=>{
    e.preventDefault();if(busy||!input.value.trim())return;
    const body=input.value,previous=operations.get(key);
    const operation=previous?.body===body?previous:{body,id:crypto.randomUUID()};operations.set(key,operation);
    void perform(async()=>{
     submit.disabled=true;
     try{
      await call('/'+encodeURIComponent(id)+'/messages',{threadId:thread.id,body,operationId:operation.id});
      if(drafts.get(key)===body){drafts.delete(key);input.value='';}
      operations.delete(key);updateDirty();
      try{await open(id);return c.saved;}catch(error){return `${c.saved} · ${error.message||c.failure}`;}
     }finally{if(submit.isConnected)submit.disabled=false;}
    });
   });
  }
  el('h3',c.versions);
  for(const revision of data.revisions){const details=el('details');el('summary',`${revision.round} · ${revision.snapshot.title} · ${revision.snapshot.sourceCreatedAt||c.unrecorded}`,details);const body=revision.snapshot.content;el('pre',body.body||body.content||JSON.stringify(body,null,2),details);}
 }
 reload.addEventListener('click',()=>{if(!dirty||window.confirm(c.discard)){drafts.clear();operations.clear();dirty=false;void load();}});
 window.addEventListener('kamitsubaki-account-state',()=>{
  const next=state.viewer?.userId||null;
  if(initialized&&next!==owner){generation++;owner=next;dirty=false;busy=false;reload.disabled=false;drafts.clear();operations.clear();view.replaceChildren();status.textContent=c.change;}
 });
 void load();
}
