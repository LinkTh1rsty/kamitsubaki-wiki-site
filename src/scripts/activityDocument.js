import {activityCopy} from '../lib/activityCopy.mjs';
import {activityDetailMarkup,annotateActivityDeadlines} from '../lib/activityPresentation.mjs';
import {contentText,enhanceCommunityImages} from '../lib/communityClient.js';
import {activityBase,trackActivity} from '../lib/activityClient.js';
import {adaptActivityPoster,openActivityPoster} from '../lib/activityPoster.mjs';
import {mountActivityShareTools} from '../lib/activityShare.js';
import '../styles/activityCenter.css';

export async function enhanceActivityDocument(root){
 if(!root||root.dataset.communityDocument!=='activity'||root.dataset.communityUnavailable==='true'||root.dataset.enhanced)return;
 const id=root.dataset.communityId||new URLSearchParams(location.search).get('id');if(!id)return;
 const locale=root.dataset.locale,base=root.dataset.api,c=activityCopy(locale),entry=['home','center','floating','dashboard'].includes(new URLSearchParams(location.search).get('entry'))?new URLSearchParams(location.search).get('entry'):'detail';
 try{
  const r=await fetch(activityBase(base)+'/api/activity-center/community/items/'+encodeURIComponent(id),{credentials:'omit',headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});if(!r.ok)return;const {activity:item}=await r.json();item.source='community';
  const content=root.querySelector('[data-community-content]'),body=content?.querySelector('.community-detail-body'),facts=content?.querySelector('.community-facts');if(!body||!facts)return;
  const creditHtml=[...content.querySelectorAll('.community-image-credit')].map(n=>n.outerHTML).join('');
  // Reuse the server presentation while preserving the original rendered body.
  content.innerHTML=activityDetailMarkup(item,{locale,copy:c,api:base,bodyHtml:body.innerHTML,factsHtml:facts.outerHTML,creditHtml,text:value=>contentText(value,item,locale),originalHtml:item.sourceLocale!==locale&&!(item.sourceLocale==='zh'&&locale.startsWith('zh'))?`<p>${c.originalLanguage}</p>`:''});
  for(const n of content.querySelectorAll('[data-community-local-time]'))try{n.textContent=(n.matches('small')?c.localTime+' · ':'')+new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short'}).format(new Date(n.dataset.communityLocalTime));}catch{}
  annotateActivityDeadlines(content,c);
  for(const a of content.querySelectorAll('[data-activity-outbound]'))a.onclick=()=>trackActivity(base,item,entry,'outbound');
  const tools=content.querySelector('[data-activity-detail-tools]'),status=content.querySelector('[data-activity-share-status]');
  const exported=root.querySelector('[data-community-export]');if(exported)exported.addEventListener('click',()=>trackActivity(base,item,entry,'export'));
  mountActivityShareTools(tools,item,{locale,copy:c,base,placement:entry,statusElement:status,exportAnchor:exported});
  enhanceCommunityImages(content,{api:base});
  const poster=content.querySelector('.community-detail-poster'),opener=content.querySelector('.activity-poster-open');if(poster&&opener){if(!root.querySelector('.reader-artwork')){const bg=document.createElement('div'),bgImg=document.createElement('img');bg.className='reader-artwork';bg.setAttribute('aria-hidden','true');bg.style.cssText='position:fixed;inset:0;z-index:-1;overflow:hidden;pointer-events:none';bgImg.src=poster.currentSrc||poster.src;bgImg.alt='';bgImg.style.cssText='width:100%;height:100%;object-fit:cover;object-position:center 30%;filter:blur(40px) saturate(.85);transform:scale(1.14)';bg.append(bgImg);root.prepend(bg);}adaptActivityPoster(poster,{onError:()=>{poster.closest('figure')?.remove();root.querySelector('.reader-artwork')?.remove();}});opener.onclick=async e=>{if(!poster.complete||!poster.naturalWidth)return;e.preventDefault();try{await openActivityPoster(poster,opener,{closeLabel:c.closePoster,zoomLabel:c.viewPoster,keyboard:e.detail===0});}catch{location.assign(opener.href);}};}
  root.dataset.enhanced='true';trackActivity(base,item,entry,'detail');
 }catch{/* The server-rendered activity remains usable when enhancement is unavailable. */}
}
