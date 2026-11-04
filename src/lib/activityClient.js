import {applyGalleryPreview} from './galleryPreviewImage.mjs';
import {scheduleText,formatActivityTimeForDay} from './activityPresentation.mjs';
export {scheduleText} from './activityPresentation.mjs';
import {formatCommunityLocation} from './communityLocationFormat.mjs';
import {contentText} from './communityClient.js';
import {adaptActivityPoster} from './activityPoster.mjs';
import {iconMarkup} from './icons.mjs';

export const activityBase=value=>String(value||'https://api.kamitsubaki.wiki').replace(/\/$/,'');
export const activityHref=(item,locale,entry='')=>item.source==='official'?item.sourceUrl:`/${locale}/community/activities/${encodeURIComponent(item.id)}/`+(entry?'?entry='+encodeURIComponent(entry):'');
export const element=(tag,text,className)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(className)n.className=className;return n;};
export function nextDeadline(item,locale,copy,now=Date.now()){
 const dayInZone=zone=>new Intl.DateTimeFormat('en-CA',{timeZone:zone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
 const list=(item.deadlines||[]).filter(d=>d.schedule?.kind==='timed'?Date.parse(d.schedule.startAt)>now:d.schedule?.startDate>=dayInZone(d.schedule?.timeZone)).sort((a,b)=>(a.schedule.startAt||a.schedule.startDate).localeCompare(b.schedule.startAt||b.schedule.startDate));
 const d=list[0];return d?(d.label||copy[d.type]||copy.supportDeadline)+' · '+scheduleText({schedule:d.schedule},locale,copy):'';
}
const activityQuery=(base,params)=>{const url=new URL(activityBase(base)+'/api/activity-center');for(const [key,value]of Object.entries(params))if(value)url.searchParams.set(key,value);return url;};
export function cachedActivities(base,params,maxAge=300000){
 try{const saved=JSON.parse(localStorage.getItem('activity-center:v1:'+activityQuery(base,params)));if(Array.isArray(saved?.data?.items)&&Date.now()-Date.parse(saved.at)<maxAge)return {...saved.data,cache:{...saved.data.cache,fetchedAt:saved.at}};}catch{}return null;
}
export async function getActivities(base,params,{signal}={}){
 const url=activityQuery(base,params);
 const key='activity-center:v1:'+url;
 try{
  const r=await fetch(url,{headers:{Accept:'application/json'},credentials:'omit',signal:signal||AbortSignal.timeout(12000)});if(!r.ok)throw Error('unavailable');const data=await r.json();
  if(data.cache?.stale&&!data.cache?.available)throw Error('unavailable');
  try{if(!data.cache?.stale)localStorage.setItem(key,JSON.stringify({data,at:new Date().toISOString()}));}catch{}
  return data;
 }catch(e){if(e.name==='AbortError')throw e;try{const saved=JSON.parse(localStorage.getItem(key));if(saved?.data&&Date.now()-Date.parse(saved.at)<86400000)return {...saved.data,cache:{stale:true,available:true,fetchedAt:saved.at}};}catch{}throw e;}
}
export function trackActivity(base,item,placement,event){
 if(!item.id)return;
 // A failed metric must never delay navigation or participation.
 void fetch(activityBase(base)+'/api/activity-center/metrics',{method:'POST',credentials:'omit',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify({source:item.source||'community',id:item.id,placement,event})}).catch(()=>{});
}
const seenImpressions=new Set();
if(typeof document!=='undefined')document.addEventListener('astro:before-swap',()=>seenImpressions.clear());
export function observeActivities(root,base,placement){
 const nodes=[...root.querySelectorAll('[data-activity-id]')];if(!globalThis.IntersectionObserver)return ()=>{};
 const timers=new Map(),observer=new IntersectionObserver(entries=>{for(const entry of entries){const n=entry.target,key=placement+':'+n.dataset.activitySource+':'+n.dataset.activityId;if(!entry.isIntersecting||entry.intersectionRatio<.5||document.hidden){clearTimeout(timers.get(n));timers.delete(n);continue;}if(seenImpressions.has(key)||timers.has(n))continue;timers.set(n,setTimeout(()=>{timers.delete(n);if(document.hidden||!n.isConnected)return;seenImpressions.add(key);trackActivity(base,{source:n.dataset.activitySource,id:n.dataset.activityId},placement,'impression');observer.unobserve(n);},1000));}},{threshold:[0,.5]});
 const observe=()=>nodes.forEach(n=>observer.observe(n));const visibility=()=>{for(const timer of timers.values())clearTimeout(timer);timers.clear();observer.disconnect();if(!document.hidden)observe();};observe();document.addEventListener('visibilitychange',visibility);const stop=()=>{observer.disconnect();for(const timer of timers.values())clearTimeout(timer);document.removeEventListener('visibilitychange',visibility);};document.addEventListener('astro:before-swap',stop,{once:true});return stop;
}
export function activityCard(item,{locale,copy,base,placement='center',compact=false,dayKey='',onJump=null,archive=false}){
 const card=element('article',null,'activity-card'+(compact?' activity-card--compact':'')+(placement==='dashboard'?' activity-card--dashboard':''));card.dataset.activityId=item.id;card.dataset.activitySource=item.source||'community';
 const href=activityHref(item,locale,placement),link=element('a',null,'activity-card__link');if(href)link.href=href;
 if(item.source==='official'){link.target='_blank';link.rel='noopener noreferrer';}
 if(item.poster){const art=element('div',null,'activity-card__art dui-skeleton'),img=element('img');img.alt=contentText(item.title,item,locale);img.loading='lazy';img.decoding='async';applyGalleryPreview(img,{src:item.poster},{api:activityBase(base),sizes:'(max-width:700px) 90vw, 400px'});adaptActivityPoster(img,{onError:()=>{art.remove();card.classList.remove('activity-card--poster');}});img.addEventListener('load',()=>{art.classList.remove('dui-skeleton');img.classList.add('is-loaded');});art.append(img);link.append(art);card.classList.add('activity-card--poster');}
 const body=element('div',null,'activity-card__body');
 const title=element('h3',contentText(item.title,item,locale)),date=element('p',dayKey&&item.schedule?.kind==='allDay'&&item.schedule.startDate===dayKey&&(item.schedule.endDate||dayKey)===dayKey?'':dayKey?formatActivityTimeForDay(item,dayKey,locale,undefined,copy):scheduleText(item,locale,copy,{compact:true}),'activity-date');
 body.append(title);if(date.textContent)body.append(date);
 if(!dayKey&&item.schedule?.kind==='timed')body.append(element('p',scheduleText(item,locale,copy,{local:true}),'activity-local'));
 const location=item.source==='official'?[item.artist,item.location].filter(Boolean).join(' · '):[copy[item.mode],formatCommunityLocation(item,locale)].filter(Boolean).join(' · ');if(location)body.append(element('p',location,'activity-card__location'));
 const state=item.eventStatus&&item.eventStatus!=='scheduled'?item.eventStatus:item.status;
 const status=['ongoing','ended','cancelled','postponed'].includes(state)?copy[state]:'';if(status){const badge=element('span',status,'activity-status activity-card__status');badge.dataset.state=state;body.append(badge);}if(item.cooperation)body.append(element('span',copy.cooperation,'activity-status'));
 const deadline=nextDeadline(item,locale,copy);if(deadline)body.append(element('p',deadline,'activity-deadline'));
 if(!compact&&item.summary)body.append(element('p',contentText(item.summary,item,locale),'activity-card__summary'));
 link.append(body);
 if((placement==='center'||placement==='dashboard'&&item.source!=='official'&&!compact)&&href){const action=element('span',item.source==='official'?copy.sourceLink:copy.details,'activity-card__primary');action.insertAdjacentHTML('beforeend',iconMarkup('arrow-up-right'));(placement==='center'?body:link).append(action);}
 link.addEventListener('click',()=>{if(item.source==='official')trackActivity(base,item,placement,'outbound');});card.append(link);
 if(placement==='dashboard')return card;
 const actions=element('div',null,'activity-card__actions'),share=element('button',copy.shareShort,'activity-text-action');share.type='button';share.dataset.uiKit='';share.onclick=async()=>{const {copyActivity}=await import('./activityShare.js');await copyActivity(item,{locale,copy,base,placement},share);};const detail=element('a',item.source==='official'?copy.sourceLink:copy.details,'activity-text-action');if(href)detail.href=href;if(item.source==='official'){detail.target='_blank';detail.rel='noopener noreferrer';detail.onclick=()=>trackActivity(base,item,placement,'outbound');}if(href&&placement!=='center')actions.append(detail);if(onJump&&item.schedule?.kind!=='undated'){const jump=element('button',copy.jump,'activity-text-action activity-jump');jump.type='button';jump.dataset.uiKit='';jump.onclick=()=>onJump(item);actions.append(jump);}if(!archive)actions.append(share);
 const exported=element('a',copy.calendarShort,'activity-text-action');exported.dataset.uiKit='';exported.href=activityBase(base)+(item.source==='official'?'/api/activity-center/official/items/':'/api/community-activities/items/')+encodeURIComponent(item.id)+'/calendar.ics?locale='+locale;exported.onclick=()=>trackActivity(base,item,placement,'export');if(!archive&&item.schedule?.kind!=='undated')actions.append(exported);
 if(actions.children.length)card.append(actions);return card;
}
