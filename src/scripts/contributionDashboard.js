import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import {state,refreshAuth} from './accountStore.js';
import {createContextAction} from '../lib/contextAction.js';
import {creatorCenterCopy} from '../lib/creatorCenterCopy.mjs';

const root=document.querySelector('[data-contribution-dashboard]');
if(root){
 const copy=JSON.parse(root.dataset.copy),locale=root.dataset.locale,creatorCopy=creatorCenterCopy(locale),button=root.querySelector('[data-progress-load]'),results=root.querySelector('[data-progress-results]');
 const request=async(base,path)=>{const response=await fetch(base.replace(/\/$/,'')+path,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Object.assign(Error(copy.error),{status:response.status});return response.json();};
 const sources=[
  {title:copy.tasks[0],type:'entry',href:`/${locale}/contribute/editor/`},
  {title:copy.tasks[1],type:'article',href:`/${locale}/articles/submit/`},
  {title:copy.tasks[2],type:'gallery',href:`/${locale}/gallery/manage/`}
 ];
 sources.forEach(source=>{source.load=async()=>{const data=await request(root.dataset.api,'/api/account/contributions?type='+source.type);return data.items.map(item=>({title:item.title,status:item.state,phase:item.phase,note:item.note,id:item.id,type:item.type}));};});
 // Phase distinguishes 'approved, waiting to publish' from 'pending review'; never show raw codes.
 const statusLabel=item=>creatorCopy.phase?.[item.phase]||creatorCopy.status?.[item.status]||copy.states[item.status]||copy.states.open;
 const text=(tag,value,parent)=>{const node=document.createElement(tag);node.textContent=value;parent.append(node);return node;};
 button.addEventListener('click',async()=>{
  button.disabled=true;
  results.replaceChildren();
  try{
   await refreshAuth();
   if(!state.viewer){
    text('p',state.auth==='unavailable'?copy.serviceUnavailable:copy.loginHint,results);
    if(state.auth!=='unavailable')results.append(createContextAction(copy.login,`/${locale}/account/?returnTo=${encodeURIComponent(location.href)}`,{tone:'primary'}));
    return;
   }
   await Promise.allSettled(sources.map(async source=>{const section=document.createElement('section');results.append(section);text('h3',source.title,section);const status=text('p','',section);setLoadingStatus(status,copy.loading);try{const items=await source.load();status.textContent=items.length?'':copy.empty;for(const item of items){const card=document.createElement('article');text('strong',item.title,card);text('p',statusLabel(item),card);if(item.note)text('p',item.note,card);card.append(createContextAction(copy.open,`/${locale}/account/creator/?recordType=${item.type}&record=${encodeURIComponent(item.id)}`));section.append(card);}if(!items.length)section.append(createContextAction(copy.open,source.href));}catch(error){status.textContent=error.status===401?copy.login:copy.error;if(error.status===401)section.append(createContextAction(copy.login,`/${locale}/account/?returnTo=${encodeURIComponent(location.href)}`));}}));
  }finally{button.disabled=false;}
 });
 // Preserve previously shared guide anchors without duplicating the documents.
 const legacy={overview:'contribute/start',editor:'contribute/entry',github:'contribute/entry',files:'contribute/entry',licensing:'contribute/rights',syntax:'develop/content',format:'contribute/entry'};
 const key=location.hash.slice(1).split('--')[0];if(legacy[key])location.replace(`/${locale}/docs/${legacy[key]}/`);
}
