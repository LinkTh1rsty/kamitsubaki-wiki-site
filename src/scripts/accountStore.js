import {confirmAccount} from './accountConfirm.js';
import { LIBRARY_KEY, libraryOwner, setLibraryOwner, readLibrary, readLibraryRecord, saveLibraryRecord, writeLibrary, mergeLibraries, validateLibrary } from '../lib/personalLibrary.mjs';
import { libraryChanges, applyLibraryChanges } from '../lib/accountLibrary.mjs';

const config = document.querySelector('[data-account-config]');
export const locale = config?.dataset.locale || 'zh';
export const copy = JSON.parse(config?.dataset.copy || '{}');
export const apiBase = (config?.dataset.apiBase || 'https://api.kamitsubaki.wiki').replace(/\/$/,'');
export const state = {viewer:null,auth:'checking',sync:'guest',account:null,accountLoad:'idle'};
let authPromise, lastChecked=0, syncPromise, timer, generation=0;
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kamitsubaki-account') : null;
const notify = () => window.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:state}));
export async function api(path, {method='GET',body,owner=state.viewer?.userId}={}) {
  const url = new URL(apiBase + path);
  if(owner) url.searchParams.set('accountId',owner);
  const response = await fetch(url,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({...body,accountId:owner}):undefined});
  if(!(response.headers.get('content-type')||'').includes('application/json')) throw new Error('service_unavailable');
  const data=await response.json();
  if(path.startsWith('/api/account') && owner && state.viewer?.userId!==owner)throw new Error('account_changed');
  if(!response.ok && path.startsWith('/api/account') && response.status===401)queueMicrotask(()=>void refreshAuth(true));
  if(!response.ok) throw Object.assign(new Error(data.error?.code || 'request_failed'),{status:response.status,data});
  return data;
}
export async function refreshAuth(force=false) {
  if(authPromise) return authPromise;
  if(!force && Date.now()-lastChecked<30000) return state.viewer;
  const authEpoch=generation;
  authPromise=(async()=>{
    try {
      const data=await api('/api/auth/me',{owner:null});
      if(authEpoch!==generation)return state.viewer;
      const viewer=data.viewer?.kind==='user'?data.viewer:null;
      const changed=viewer?.userId!==state.viewer?.userId;
      state.viewer=viewer;state.auth=viewer?'user':'guest';lastChecked=Date.now();
      if(changed || libraryOwner()!==(viewer?.userId||null)) {
        generation++;state.account=null;state.accountLoad='idle';state.sync=viewer?'saving':'guest';
        setLibraryOwner(viewer?.userId);
      }
      notify();
      if(viewer) void syncLibrary();
      return viewer;
    } catch { state.auth='unavailable';notify();return null; }
    finally { authPromise=null; }
  })();
  return authPromise;
}
export async function syncLibrary({discard=false,keepLocal=false}={}) {
  if(!state.viewer || state.auth!=='user') return;
  if(syncPromise) return syncPromise;
  const owner=state.viewer.userId, epoch=generation;
  state.sync='saving';notify();
  syncPromise=(async()=>{
    try {
      for(let attempt=0;attempt<3;attempt++) {
        const remote=await api('/api/account/library',{owner});
        if(epoch!==generation) return;
        const local=readLibraryRecord(localStorage);
        let rebased;
        try { rebased=discard?remote.library:keepLocal?local.library:applyLibraryChanges(remote.library,libraryChanges(local.base,local.library)); }
        catch { state.sync='conflict';return; }
        saveLibraryRecord(localStorage,{library:rebased,base:remote.library,revision:remote.revision});
        const operations=libraryChanges(remote.library,rebased);
        if(!operations.length) {state.sync='synced';return;}
        let saved;
        try { saved=await api('/api/account/library',{method:'PATCH',body:{revision:remote.revision,operations},owner}); }
        catch(e) { if(e.message==='library_conflict') continue;throw e; }
        if(epoch!==generation) return;
        // Preserve edits made while the network request was in flight.
        const latest=readLibraryRecord(localStorage);
        const withNewChanges=applyLibraryChanges(saved.library,libraryChanges(rebased,latest.library));
        saveLibraryRecord(localStorage,{library:withNewChanges,base:saved.library,revision:saved.revision});
        if(!libraryChanges(saved.library,withNewChanges).length) {state.sync='synced';return;}
      }
      state.sync='offline';
    } catch(e) {
      if(epoch!==generation) return;
      state.sync=e.code==='library_conflict'?'conflict':'offline';
      if(e.status===401 || e.message==='account_changed') void refreshAuth(true);
    } finally { syncPromise=null;notify();if(epoch!==generation && state.viewer)queueMicrotask(()=>void syncLibrary()); }
  })();
  return syncPromise;
}
export async function loadAccount() {
  const owner=state.viewer?.userId;if(!owner)return;
  state.accountLoad='loading';notify();
  try {
    const account=await api('/api/account',{owner});
    if(state.viewer?.userId!==owner)return;
    state.account=account;state.accountLoad='ready';notify();return account;
  } catch(error) {
    if(state.viewer?.userId===owner){state.accountLoad='error';notify();}
    throw error;
  }
}
export async function logout() {
  await api('/api/auth/logout',{method:'POST',body:{}});
  generation++;state.viewer=null;state.account=null;state.accountLoad='idle';state.auth='guest';state.sync='guest';
  setLibraryOwner(null);notify();channel?.postMessage('auth-changed');
  window.dispatchEvent(new Event('kamitsubaki-auth-changed'));
}
export function loginUrl(provider,link=false) {
  const url=new URL(`${apiBase}/api/auth/oauth/${provider}/start`);
  const back=new URL(window.location.href);back.searchParams.delete('aiAuth');back.searchParams.delete('aiAuthProvider');back.searchParams.delete('aiAuthCode');
  url.searchParams.set('theme',document.documentElement.dataset.theme==='dark'?'dark':'light');
  url.searchParams.set('returnTo',back.toString());if(link)url.searchParams.set('intent','link');return url.toString();
}
export function guestLibrary() { const raw=localStorage.getItem(LIBRARY_KEY);return raw?validateLibrary(JSON.parse(raw)):{version:1,items:[],lists:[]}; }
export function mergeGuest() {
  if(!state.viewer || state.auth!=='user')throw new Error('login_required');
  writeLibrary(localStorage,mergeLibraries(readLibrary(localStorage),guestLibrary()));
  void syncLibrary();
}
export function download(name,data) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function backupLibrary(){download('kamitsubaki-local-library.json',readLibrary(localStorage));}
window.addEventListener('kamitsubaki-library-change',()=>{
  if(!state.viewer || syncPromise)return;
  state.sync='saving';notify();
  clearTimeout(timer);timer=setTimeout(()=>void syncLibrary(),1000);
});
window.addEventListener('storage',e=>{
  if(e.key?.startsWith(LIBRARY_KEY)) {window.dispatchEvent(new Event('kamitsubaki-library-change'));}
});
channel?.addEventListener('message',()=>void refreshAuth(true));
window.addEventListener('online',()=>void refreshAuth(true));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void refreshAuth();});
window.addEventListener('kamitsubaki-auth-changed',()=>void refreshAuth(true));

function renderChrome() {
  document.querySelectorAll('[data-account-nav]').forEach(a=>{
    a.textContent=state.viewer?copy.title:state.auth==='checking'?copy.checking:copy.login;
  });
  document.querySelectorAll('[data-account-status]').forEach(el=>{
    el.textContent=state.auth==='checking'?copy.checking:state.auth==='unavailable'?copy.unavailable:copy[state.sync]||copy.guest;
  });
  document.querySelectorAll('[data-account-retry]').forEach(el=>{el.hidden=!['unavailable'].includes(state.auth)&&!['offline','conflict'].includes(state.sync);});
  document.querySelectorAll('[data-account-local]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-sync-now]').forEach(el=>{el.hidden=state.auth!=='user';el.disabled=state.sync==='saving';});
  document.querySelectorAll('[data-account-cloud]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-backup]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-login]').forEach(el=>{el.hidden=!!state.viewer;});
  document.querySelectorAll('[data-account-logout]').forEach(el=>{el.hidden=!state.viewer;});
  document.querySelectorAll('[data-account-login-provider]').forEach(a=>{a.href=loginUrl(a.dataset.accountLoginProvider,a.dataset.accountLoginIntent==='link');});
}
// A modal dialog paints above every ordinary z-index. Keep the decorative
// cursor inside its top layer while open, then restore its original position.
const accountDialog=document.querySelector('[data-account-dialog]');
let cursorHome=null,dialogTrigger=null,backdropPress=false;
function openAccountDialog(trigger){
  if(!accountDialog)return;
  renderChrome();
  dialogTrigger=trigger;document.documentElement.classList.add('account-modal-open');
  accountDialog.showModal();
  accountDialog.querySelector('[data-account-login-provider]')?.focus();
  const cursor=document.getElementById('cursor');
  if(cursor && !cursorHome){
    const marker=document.createComment('account-cursor-home');
    cursor.before(marker);cursorHome={cursor,marker};accountDialog.append(cursor);
  }
}
accountDialog?.addEventListener('close',()=>{
  if(accountDialog.open)return;
  document.documentElement.classList.remove('account-modal-open');
  if(cursorHome){const {cursor,marker}=cursorHome;cursorHome=null;marker.replaceWith(cursor);cursor.classList.remove('hovering','text-entry');}
  const target=dialogTrigger?.getClientRects().length?dialogTrigger:document.querySelector('.home-chrome__actions > [data-account-nav]');target?.focus();dialogTrigger=null;
});
const outsideDialog=event=>{const r=accountDialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
accountDialog?.addEventListener('pointerdown',event=>{backdropPress=event.target===accountDialog && outsideDialog(event);});
accountDialog?.addEventListener('click',event=>{if(backdropPress && event.target===accountDialog && outsideDialog(event))accountDialog.close();backdropPress=false;});
new MutationObserver(renderChrome).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('kamitsubaki-account-state',renderChrome);

document.addEventListener('click',async event=>{
  const trigger=event.target.closest('[data-account-nav],[data-account-login],[data-account-retry],[data-account-cloud],[data-account-backup],[data-account-local],[data-account-sync-now],[data-account-logout],[data-account-close]');
  if(!trigger)return;
  const dialog=document.querySelector('[data-account-dialog]');
  if(trigger.matches('[data-account-nav]') && state.viewer)return;
  event.preventDefault();
  const actionOwner=state.viewer?.userId;
  try {
    if(trigger.matches('[data-account-nav],[data-account-login]'))openAccountDialog(trigger);
    if(trigger.matches('[data-account-close]'))dialog?.close();
    if(trigger.matches('[data-account-retry]')){await refreshAuth(true);await syncLibrary();}
    if(trigger.matches('[data-account-sync-now]')){await refreshAuth(true);await syncLibrary();}
    if(trigger.matches('[data-account-local]') && await confirmAccount(copy.confirmLocal,copy) && state.viewer?.userId===actionOwner)await syncLibrary({keepLocal:true});
    if(trigger.matches('[data-account-cloud]') && await confirmAccount(copy.confirmCloud,copy) && state.viewer?.userId===actionOwner)await syncLibrary({discard:true});
    if(trigger.matches('[data-account-backup]'))backupLibrary();
    if(trigger.matches('[data-account-logout]'))await logout();
  } catch {document.querySelector('[data-account-action-status]')?.replaceChildren(document.createTextNode(copy.error));}
});
renderChrome();void refreshAuth();
