import {serviceAvailabilityCopy} from '../lib/serviceAvailabilityCopy.mjs';
import {lockModalScroll} from '../lib/modalScroll.mjs';
import {isLocalEditorMode} from '../lib/localEditorMode.mjs';
import {confirmAccount} from './accountConfirm.js';
import { LIBRARY_KEY, libraryOwner, setLibraryOwner, readLibrary, readLibraryRecord, saveLibraryRecord, writeLibrary, mergeLibraries, validateLibrary } from '../lib/personalLibrary.mjs';
import { libraryChanges, applyLibraryChanges } from '../lib/accountLibrary.mjs';
import {safeAccountReturnTo} from '../lib/accountReturn.mjs';
import {centralAccountUIOrigin,centralAccountReturnOrigins,centralAccountReturnTo} from '../lib/centralAccountOrigins.mjs';

const config = document.querySelector('[data-account-config]');
export const locale = config?.dataset.locale || 'zh';
export const copy = JSON.parse(config?.dataset.copy || '{}');
export const apiBase = (config?.dataset.apiBase || 'https://api.kamitsubaki.wiki').replace(/\/$/,'');
export const state = {viewer:null,auth:'checking',sync:'guest',account:null,accountLoad:'idle'};
let authPromise, lastChecked=0, syncPromise, timer, generation=0;
export const getAccountGeneration=()=>generation;
// Shared module has a real-link fallback when the central host is unavailable.
let canonicalClient=null;
const centralClient=import(/* @vite-ignore */ `${apiBase}/auth/client/v1.mjs?ui=modal-1`).then(module=>{canonicalClient=module.createAccountAuthClient({apiBase,locale});queueMicrotask(renderChrome);return canonicalClient;}).catch(()=>null);
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('kamitsubaki-account') : null;
const notify = () => window.dispatchEvent(new CustomEvent('kamitsubaki-account-state',{detail:state}));
export async function api(path, {method='GET',body,owner=state.viewer?.userId}={}) {
  const requestGeneration=generation;
  const url = new URL(apiBase + path);
  if(owner) url.searchParams.set('accountId',owner);
  const response = await fetch(url,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({...body,accountId:owner}):undefined});
  if(!(response.headers.get('content-type')||'').includes('application/json')) throw new Error('service_unavailable');
  const data=await response.json();
  if((path.startsWith('/api/account')||path.startsWith('/api/supporter-benefits')) && owner && (state.viewer?.userId!==owner||requestGeneration!==generation))throw new Error('account_changed');
  if(!response.ok && (path.startsWith('/api/account')||path.startsWith('/api/supporter-benefits')) && response.status===401)queueMicrotask(()=>void refreshAuth(true));
  if(!response.ok) throw Object.assign(new Error(data.error?.code || 'request_failed'),{status:response.status,data});
  return data;
}
export async function refreshAuth(force=false) {
  if(isLocalEditorMode()){state.auth='guest';return null;}
  if(authPromise) return authPromise;
  if(!force && Date.now()-lastChecked<30000) return state.viewer;
  const authEpoch=generation;
  authPromise=(async()=>{
    try {
      const client=await centralClient;
      const data=client?{viewer:await client.refresh()}:await api('/api/account-auth/me',{owner:null});
      if(authEpoch!==generation)return state.viewer;
      const viewer=data.viewer?.kind==='user'?data.viewer:null;
      const changed=viewer?.userId!==state.viewer?.userId;
      state.viewer=viewer;state.unavailableReason='';state.auth=viewer?'user':'guest';lastChecked=Date.now();
      if(changed || libraryOwner()!==(viewer?.userId||null)) {
        generation++;state.account=null;state.accountLoad='idle';state.sync=viewer?'saving':'guest';
        setLibraryOwner(viewer?.userId);
      }
      notify();
      if(viewer) void syncLibrary();
      return viewer;
    } catch(error) { if(authEpoch!==generation)return state.viewer;state.auth='unavailable';state.unavailableReason=error.message==='database_daily_limit'?serviceAvailabilityCopy(locale).databaseLimit:copy.unavailable;notify();return null; }
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
  const owner=state.viewer?.userId,epoch=generation;if(!owner)return;
  state.accountLoad='loading';notify();
  try {
    const account=await api('/api/account',{owner});
    if(state.viewer?.userId!==owner||epoch!==generation)return;
    state.account=account;state.accountLoad='ready';notify();return account;
  } catch(error) {
    if(state.viewer?.userId===owner&&epoch===generation){state.accountLoad='error';notify();}
    throw error;
  }
}
export async function logout() {
  const client=await centralClient;
  if(client)await client.logout();else await api('/api/account-auth/sign-out',{method:'POST',body:{locale},owner:null});
  generation++;state.viewer=null;state.account=null;state.accountLoad='idle';state.auth='guest';state.sync='guest';
  setLibraryOwner(null);notify();channel?.postMessage('auth-changed');
  window.dispatchEvent(new Event('kamitsubaki-auth-changed'));
}
export function loginUrl(provider,link=false) {
  const url=new URL(`${centralAccountUIOrigin(apiBase)}/auth/${link?'security':'sign-in'}`);
  let back=new URL(window.location.href);back=safeAccountReturnTo(back.searchParams.get('returnTo'),location.origin)||back;for(const key of ['returnTo','aiAuth','aiAuthProvider','aiAuthCode'])if(back.searchParams.has(key))back.searchParams.delete(key);
  if(typeof canonicalClient?.[link?'securityUrl':'signInUrl']==='function')return canonicalClient[link?'securityUrl':'signInUrl']({returnTo:back.toString(),theme:document.documentElement.dataset.theme==='dark'?'dark':'light'});
  url.searchParams.set('theme',document.documentElement.dataset.theme==='dark'?'dark':'light');
  url.searchParams.set('locale',locale);url.searchParams.set('returnTo',centralAccountReturnTo(back.toString(),apiBase,locale));return url.toString();
}
export function securityUrl(){if(typeof canonicalClient?.securityUrl==='function'){const back=new URL(location.href);back.hash='#overview';return canonicalClient.securityUrl({returnTo:back.toString(),theme:document.documentElement.dataset.theme==='dark'?'dark':'light'});}const url=new URL(loginUrl('',true));const back=new URL(location.href);back.hash='#overview';url.searchParams.set('returnTo',centralAccountReturnTo(back.toString(),apiBase,locale));return url.toString();}
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
window.addEventListener('pageshow',()=>void refreshAuth(true));
void centralClient.then(client=>client?.subscribe(()=>void refreshAuth(true)));

export function renderAccountIdentity(container){
  const name=state.account?.profile?.display_name||state.viewer?.displayName||copy.title;
  const raw=state.account?.profile?.avatar_url||state.viewer?.avatarUrl;
  const avatar=document.createElement('span');avatar.className='account-identity-avatar';avatar.textContent=Array.from(name)[0]||'·';avatar.setAttribute('aria-hidden','true');
  try{const url=new URL(raw,apiBase);if(raw&&['https:',...(location.protocol==='http:'?['http:']:[])].includes(url.protocol)){const img=document.createElement('img');img.className=avatar.className;img.src=url.href;img.alt='';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.replaceWith(avatar),{once:true});container.replaceChildren(img);}else container.replaceChildren(avatar);}catch{container.replaceChildren(avatar);}
  const label=document.createElement('span');label.className='account-identity-name';label.textContent=name;container.append(label);
}
function renderChrome() {
  document.querySelectorAll('[data-account-guest-menu]').forEach(el=>{el.hidden=!!state.viewer;});
  document.querySelectorAll('[data-account-nav]').forEach(a=>{
    if(state.viewer){renderAccountIdentity(a);a.setAttribute('aria-label',(state.viewer.displayName||copy.title)+' · '+copy.title);a.setAttribute('aria-haspopup','dialog');}else{a.textContent=state.auth==='checking'?copy.checking:copy.login;a.removeAttribute('aria-label');a.removeAttribute('aria-haspopup');}
  });
  document.querySelectorAll('[data-account-status]').forEach(el=>{
    el.textContent=state.auth==='checking'?copy.checking:state.auth==='unavailable'?(state.unavailableReason||copy.unavailable):copy[state.sync]||copy.guest;
  });
  document.querySelectorAll('[data-account-retry]').forEach(el=>{el.hidden=!['unavailable'].includes(state.auth)&&!['offline','conflict'].includes(state.sync);});
  document.querySelectorAll('[data-account-local]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-sync-now]').forEach(el=>{el.hidden=state.auth!=='user';el.disabled=state.sync==='saving';});
  document.querySelectorAll('[data-account-cloud]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-backup]').forEach(el=>{el.hidden=state.sync!=='conflict';});
  document.querySelectorAll('[data-account-login]').forEach(el=>{el.hidden=!!state.viewer;});
  document.querySelectorAll('[data-account-logout]').forEach(el=>{el.hidden=!state.viewer;});
  document.querySelectorAll('[data-account-login-provider]').forEach(a=>{a.href=loginUrl(a.dataset.accountLoginProvider,a.dataset.accountLoginIntent==='link');});
  document.querySelectorAll('[data-account-sign-in],[data-ai-oauth],[data-creator-login]').forEach(a=>{a.href=loginUrl();});
  document.querySelectorAll('[data-account-security]').forEach(a=>{a.href=securityUrl();});
}
// Keep copied links and modified clicks aligned with the current draft/anchor.
for(const name of ['hashchange','popstate'])window.addEventListener(name,renderChrome);
for(const name of ['pointerdown','focusin','contextmenu'])document.addEventListener(name,event=>{
  const link=event.target instanceof Element?event.target.closest('[data-account-sign-in],[data-ai-oauth],[data-creator-login],[data-account-security]'):null;
  if(link instanceof HTMLAnchorElement)link.href=link.matches('[data-account-security]')?securityUrl():loginUrl();
},true);
// A modal dialog paints above every ordinary z-index. Keep the decorative
// cursor inside its top layer while open, then restore its original position.
const accountDialog=document.querySelector('[data-account-dialog]');
let dialogTrigger=null,backdropPress=false,releaseModalScroll=null;
async function openAccountDialog(trigger){
  if(state.viewer){const {openAccountComponentMenu}=await import('./accountComponentBridge.js');await openAccountComponentMenu(trigger);return;}
  const client=await centralClient;
  const returnTo=new URL(loginUrl()).searchParams.get('returnTo');
  if(client?.openSignIn?.({returnTo,theme:document.documentElement.dataset.theme==='dark'?'dark':'light',trigger}))return;
  if(!accountDialog || accountDialog.open)return;
  renderChrome();
  dialogTrigger=trigger;releaseModalScroll=lockModalScroll();
  try{accountDialog.showModal();}catch(error){releaseModalScroll?.();releaseModalScroll=null;throw error;}
  accountDialog.setAttribute('aria-label',state.viewer?copy.title:copy.loginTitle);accountDialog.removeAttribute('aria-labelledby');accountDialog.removeAttribute('aria-describedby');
  accountDialog.querySelector('[data-account-sign-in]')?.focus({preventScroll:true});

}
accountDialog?.addEventListener('close',()=>{
  if(accountDialog.open)return;
  releaseModalScroll?.();releaseModalScroll=null;
  const target=dialogTrigger?.getClientRects().length?dialogTrigger:document.querySelector('.home-chrome__actions > [data-account-nav]');target?.focus({preventScroll:true});dialogTrigger=null;
});
window.addEventListener('pagehide',()=>{if(accountDialog?.open)accountDialog.close();releaseModalScroll?.();releaseModalScroll=null;});
const outsideDialog=event=>{const r=accountDialog.getBoundingClientRect();return event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom;};
accountDialog?.addEventListener('pointerdown',event=>{backdropPress=event.target===accountDialog && outsideDialog(event);});
accountDialog?.addEventListener('click',event=>{if(backdropPress && event.target===accountDialog && outsideDialog(event))accountDialog.close();backdropPress=false;});
new MutationObserver(renderChrome).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('kamitsubaki-account-state',renderChrome);

document.addEventListener('click',async event=>{
  const trigger=event.target.closest('[data-account-nav],[data-account-login],[data-account-sign-in],[data-ai-oauth],[data-creator-login],[data-account-login-provider],[data-account-retry],[data-account-cloud],[data-account-backup],[data-account-local],[data-account-sync-now],[data-account-logout],[data-account-close]');
  if(!trigger)return;
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(trigger.matches('[data-account-login-provider]')&&trigger.dataset.accountLoginIntent==='link')return;
  const dialog=document.querySelector('[data-account-dialog]');
  event.preventDefault();
  const actionOwner=state.viewer?.userId;
  try {
    if(trigger.matches('[data-account-nav],[data-account-login]'))await openAccountDialog(trigger);
    if(trigger.matches('[data-account-sign-in],[data-ai-oauth],[data-creator-login],[data-account-login-provider]')){
      const client=await centralClient;
      if(accountDialog?.open)accountDialog.close();
      if(!client?.openSignIn?.({returnTo:new URL(loginUrl()).searchParams.get('returnTo'),theme:document.documentElement.dataset.theme==='dark'?'dark':'light',trigger}))window.location.assign(loginUrl());
    }
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
