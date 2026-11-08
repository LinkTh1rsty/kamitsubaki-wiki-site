import {mountProfile,profileDirty as isProfileDirty,resetProfile} from './accountComponentBridge.js';
import {upgradeSavedEntryLink} from '../lib/savedEntryLink.mjs';
import {serviceAvailabilityCopy} from '../lib/serviceAvailabilityCopy.mjs';
import {confirmAccount} from './accountConfirm.js';
import {state,copy as c,locale,api,refreshAuth,loadAccount,guestLibrary,mergeGuest,download} from './accountStore.js';
import {readLibrary,libraryStorageKey} from '../lib/personalLibrary.mjs';
import {initializeLibrary} from './personalLibrary.js';
export function initializeAccountPage(){
const root=document.querySelector('[data-account-page]');
const $=selector=>root?.querySelector(selector);
const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
let rendered=null,loadedOwner=null,loading=false,profileOwner=null;
const profileHost=$('[data-profile-component]');
let profileMounted=false;
const ensureProfile=()=>profileMounted?Promise.resolve():mountProfile(profileHost).then(()=>{profileMounted=true;});
void ensureProfile().catch(error=>{console.error('Profile component load failed',error);$('[data-profile-status]').textContent=c.loadFailed;$('[data-account-reload]').hidden=false;});
const date=value=>{if(!value)return '';const iso=value.includes('T')?value:value.replace(' ','T')+'Z';const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleString(locale);};
const message=(target,error)=>{const code=error?.message;$(target).textContent=code==='account_changed'?c.accountChanged:code==='login_with_other_provider'?c.loginWithOther:code==='identity_changed'?c.identityChanged:error?.status===401?c.sessionExpired:c.error;};
async function action(button,target,fn){button.disabled=true;try{await fn();}catch(e){message(target,e);}finally{button.disabled=false;}}
function render() {
  if(!root)return;
  const recent=$('[data-account-recent]');
  if(recent){recent.replaceChildren();try{const items=readLibrary(localStorage).items.slice(-4).reverse();for(const item of items){const link=element('a',item.title);link.href=item.path;recent.append(link);void upgradeSavedEntryLink(link);}}catch{}if(!recent.children.length)recent.append(element('p',recent.dataset.emptyLabel));}
  if(profileOwner!==(state.viewer?.userId||null)){profileOwner=state.viewer?.userId||null;resetProfile(profileHost);rendered=null;}
  root.querySelectorAll('[data-account-member]').forEach(el=>{el.hidden=!state.viewer || !state.account;});
  if(!state.viewer){resetProfile(profileHost);loadedOwner=null;rendered=null;return;}
  if(loadedOwner!==state.viewer.userId && !loading && state.accountLoad!=='loading' && state.accountLoad!=='error'){
    loading=true;const owner=state.viewer.userId;
    loadAccount().then(()=>{if(state.viewer?.userId===owner){loadedOwner=owner;}}).catch(()=>{$('[data-account-action-status]').textContent=c.loadFailed;$('[data-account-reload]').hidden=false;}).finally(()=>{loading=false;if(state.viewer?.userId && state.viewer.userId!==owner)render();});
  }
  if(state.account && rendered!==state.account){
    $('[data-guest-preview-result]').hidden=true;$('[data-guest-items]').replaceChildren();
    rendered=state.account;$('[data-account-reload]').hidden=true;const profile=state.account.profile;
    const deletion=state.account.requests.find(r=>r.kind==='delete');
    $('[data-deletion-status]').textContent=deletion?c[deletion.status]||c.pending:'';
    $('[data-deletion-cancel]').hidden=deletion?.status!=='pending';
    $('[data-deletion-form]').hidden=['pending','processing'].includes(deletion?.status);
  }
}
if(root){
  const authResult=new URL(location.href).searchParams.get('aiAuth');
  if(authResult)$('[data-account-action-status]').textContent=authResult==='success'?c.loginSuccess:new URL(location.href).searchParams.get('aiAuthCode')==='database_daily_limit'?serviceAvailabilityCopy(locale).databaseLimit:c.loginError;
  initializeLibrary($('[data-account-library]'),JSON.parse($('[data-account-library]').dataset.copy));
  window.addEventListener('kamitsubaki-account-state',render);window.addEventListener('kamitsubaki-library-change',render);window.addEventListener('storage',event=>{if(event.key===libraryStorageKey())render();});render();
  window.addEventListener('beforeunload',event=>{if(isProfileDirty(profileHost)){event.preventDefault();event.returnValue='';}});
  $('[data-account-reload]').addEventListener('click',event=>void action(event.currentTarget,'[data-account-action-status]',async()=>{if(isProfileDirty(profileHost) && !await confirmAccount(c.confirmDiscard,c))return;resetProfile(profileHost);await ensureProfile();await loadAccount();loadedOwner=state.viewer?.userId;$('[data-account-action-status]').textContent='';$('[data-profile-status]').textContent='';}));
  $('[data-guest-preview]').addEventListener('click',event=>void action(event.currentTarget,'[data-account-action-status]',async()=>{
    const guest=guestLibrary();$('[data-guest-count]').textContent=guest.items.length?`${guest.items.length} ${c.items} · ${guest.lists.length} ${c.lists}`:c.noGuest;
    const list=$('[data-guest-items]');list.replaceChildren();for(const item of guest.items){const li=element('li'),a=element('a',item.title);a.href=item.path;li.append(a);list.append(li);}
    for(const collection of guest.lists)list.append(element('li',`${collection.name} (${collection.paths.length})`));
    $('[data-guest-preview-result]').hidden=false;$('[data-guest-merge]').disabled=!guest.items.length&&!guest.lists.length;
  }));
  $('[data-guest-cancel]').addEventListener('click',()=>{$('[data-guest-preview-result]').hidden=true;});
  $('[data-guest-merge]').addEventListener('click',event=>void action(event.currentTarget,'[data-account-action-status]',async()=>{mergeGuest();$('[data-guest-preview-result]').hidden=true;$('[data-account-action-status]').textContent=c.merged;}));
  for(const [selector,path,name] of [['[data-account-export]','/api/account/export','kamitsubaki-account.json'],['[data-ai-export]','/api/account/ai-export','kamitsubaki-ai.json']]){
    $(selector).addEventListener('click',event=>void action(event.currentTarget,'[data-data-status]',async()=>{const data=await api(path);download(name,data);$('[data-data-status]').textContent=c.saved;}));
  }
  $('[data-deletion-form]').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget,confirmation=form.elements.confirmation;void action(form.querySelector('button'),'[data-data-status]',async()=>{await api('/api/account/deletion',{method:'POST',body:{confirm:confirmation.value.trim()===confirmation.dataset.deleteWord?'DELETE':''}});await loadAccount();});});
  $('[data-deletion-cancel]').addEventListener('click',event=>void action(event.currentTarget,'[data-data-status]',async()=>{await api('/api/account/deletion/cancel',{method:'POST',body:{}});await loadAccount();}));
}

}
