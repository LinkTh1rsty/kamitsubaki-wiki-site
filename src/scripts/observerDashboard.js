import {dashboardDay,reminderKey,dashboardShouldOpen,dashboardPreferences} from '../lib/dashboardPolicy.mjs';
import {activityCard,element,getActivities,cachedActivities,observeActivities} from '../lib/activityClient.js';
import {readBoundedJson} from '../lib/boundedJson.mjs';
import {claimFloatingPanel,onFloatingPanelChange} from '../lib/floatingPanels.js';
import {lockModalScroll} from '../lib/modalScroll.mjs';

export function initObserverDashboard(root){
 if(!root||root.dataset.ready)return;root.dataset.ready='true';
 const $=s=>root.querySelector(s),dialog=$('[data-dashboard-dialog]'),launcher=$('[data-dashboard-open]'),scroll=$('[data-dashboard-scroll]'),locale=root.dataset.locale,base=root.dataset.api,c=JSON.parse(root.dataset.copy);
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 let index,noticeId='',indexFlight,section='overview',interacted=false,releaseScroll,closeMotion,openMotion,buttonMotion,restore=true,trigger=launcher,aiFlight,active=true,hashOpened=false,motionVersion=0;
 let preferences=dashboardPreferences(window,root.dataset.preview==='true'),stops=[],controllers=[],generation=0,activitySource='community';
 const lastActivities={community:0,official:0};
 const renderedActivities={community:'',official:''};
 const bodyCache=new Map(),noticeGeneration={value:0};
 const viewport=window.visualViewport;
 // Mobile keyboards can shrink only the visual viewport, leaving dvh unchanged.
 // Keep the composer above that keyboard without changing ordinary tab dimensions.
 function fitKeyboard(){
  const focused=dialog.open&&document.activeElement?.matches('[data-ai-input]');
  const inset=focused&&viewport?.scale===1?Math.max(0,window.innerHeight-viewport.height-viewport.offsetTop):0;
  if(inset>80){dialog.style.setProperty('--dashboard-keyboard-inset',inset+'px');dialog.style.setProperty('--dashboard-visible-height',viewport.height+'px');}
  else{dialog.style.removeProperty('--dashboard-keyboard-inset');dialog.style.removeProperty('--dashboard-visible-height');}
 }
 const fitAfterFocus=()=>queueMicrotask(fitKeyboard);
 viewport?.addEventListener('resize',fitKeyboard);viewport?.addEventListener('scroll',fitKeyboard);
 dialog.addEventListener('focusin',fitKeyboard);dialog.addEventListener('focusout',fitAfterFocus);
 launcher.hidden=false;
 const noticeKey=()=>reminderKey(index?.items?.find(n=>n.id===index.featuredId));
 const acknowledge=()=>{if(!dialog.open)return;const stored=preferences.read();preferences.write({...stored,day:dashboardDay(),...(index?{reminder:noticeKey()}: {})});updateDot();};
 const updateDot=()=>{$('[data-dashboard-dot]').hidden=!noticeKey()||preferences.read()?.reminder===noticeKey();};
 const animate=(node,frames,options)=>{try{const motion=node.animate?.(frames,options);void motion?.finished.catch(()=>{});return motion;}catch{return null;}};
 const stopActivities=()=>{for(const stop of stops)stop();stops=[];for(const controller of controllers)controller.abort();controllers=[];generation++;};
 function close({instant=false,focus=true}={}){
  if(!dialog.open)return;const currentMotion=++motionVersion;interacted=true;restore=focus;openMotion?.cancel();closeMotion?.cancel();buttonMotion?.cancel();stopActivities();
  const finish=()=>{if(currentMotion===motionVersion&&dialog.open)dialog.close();};
  if(instant||reduced()){finish();return;}
  closeMotion=animate(dialog,[{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(8px)'}],{duration:160,easing:'cubic-bezier(.23,1,.32,1)'});
  if(closeMotion)void closeMotion.finished.then(finish).catch(()=>{});else finish();
 }
 dialog.addEventListener('close',()=>{
  releaseScroll?.();releaseScroll=null;launcher.setAttribute('aria-expanded','false');stopActivities();openMotion?.cancel();closeMotion?.cancel();dialog.style.removeProperty('opacity');fitKeyboard();
  if(restore){const target=trigger?.isConnected&&trigger.getClientRects().length?trigger:launcher;target.focus({preventScroll:true});}
 });
 dialog.addEventListener('cancel',event=>{event.preventDefault();close({instant:true});});
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)close({instant:event.detail===0});});
 async function select(next,{focus=false}={}){
  if(!$('[data-dashboard-panel="'+next+'"]'))return;section=next;root.dataset.section=next;scroll.dataset.section=next;
  root.querySelectorAll('[data-dashboard-panel]').forEach(n=>n.hidden=n.dataset.dashboardPanel!==next);
  root.querySelectorAll('[data-dashboard-tab]').forEach(n=>{const chosen=n.dataset.dashboardTab===next;n.setAttribute('aria-selected',String(chosen));n.tabIndex=chosen?0:-1;});
  dialog.scrollTop=0;scroll.scrollTop=0;if(focus)$('[data-dashboard-tab="'+next+'"]').focus({preventScroll:true});
  observeSelected();
  if(next==='announcements')await loadNotice(noticeId||index?.featuredId);
  if(next==='ai'){
   const status=$('[data-dashboard-ai-status]'),retry=$('[data-dashboard-ai-retry]'),spinner=$('[data-dashboard-ai-skeleton]'),feedback=$('[data-dashboard-ai-feedback]');status.hidden=true;status.textContent='';if(spinner)spinner.hidden=false;retry.hidden=true;
   // A loaded controller keeps its own state; only the first import needs the shell skeleton.
   if(feedback)feedback.hidden=!!$('[data-ai-chat]')?.dataset.aiControllerReady;
   try{await(aiFlight||=import('./aiChatWidget.js').catch(error=>{aiFlight=null;throw error;}));if(!active)return;status.hidden=true;if(spinner)spinner.hidden=true;if(feedback)feedback.hidden=true;if(dialog.open&&section==='ai')$('[data-ai-chat]')?.dispatchEvent(new CustomEvent('ai-widget:open'));}
   catch{status.textContent=c.aiError;status.hidden=false;if(spinner)spinner.hidden=true;if(feedback)feedback.hidden=false;retry.hidden=false;}
  }
 }
 /** @param {string} next @param {{automatic?: boolean, event?: {currentTarget: HTMLElement | null, detail: number}}} options */
 async function open(next='overview',{automatic=false,event}={}){
  motionVersion++;if(!automatic)interacted=true;trigger=automatic?launcher:event?.currentTarget||(document.activeElement===document.body?launcher:document.activeElement)||launcher;restore=true;
  closeMotion?.cancel();closeMotion=null;
  if(!dialog.open){
   claimFloatingPanel('dashboard');dialog.showModal();releaseScroll=lockModalScroll();launcher.setAttribute('aria-expanded','true');
   if(!reduced()&&event?.detail!==0){
    openMotion?.cancel();openMotion=animate(dialog,[{opacity:0,transform:'translateY(12px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:240,easing:'cubic-bezier(.23,1,.32,1)'});
    if(!automatic){buttonMotion?.cancel();buttonMotion=animate(launcher.querySelector('.dashboard-launcher__cards'),[{transform:'rotate(0) scale(1)'},{transform:'rotate(-12deg) scale(.94)',offset:.45},{transform:'rotate(0) scale(1)'}],{duration:120,easing:'ease-out'});launcher.classList.add('is-opening');setTimeout(()=>launcher.classList.remove('is-opening'),240);}
   }
   $('#observer-dashboard-title').focus({preventScroll:true});
  }
  await select(next);if(!dialog.open)return;acknowledge();void loadActivities();void loadIndex();
 }
 launcher.onclick=event=>{
  if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(dialog.open&&!closeMotion){close({instant:event.detail===0});return;}
  void open('overview',{event}).catch(()=>{if(launcher.href)location.assign(launcher.href);});
 };
 root.querySelectorAll('[data-dashboard-close]').forEach(n=>n.onclick=event=>close({instant:event.detail===0}));
 root.querySelectorAll('[data-dashboard-go]').forEach(n=>n.onclick=()=>select(n.dataset.dashboardGo));
 root.querySelectorAll('[data-dashboard-tab]').forEach(tab=>{
  tab.onclick=()=>select(tab.dataset.dashboardTab);
  tab.onkeydown=event=>{const tabs=[...root.querySelectorAll('[data-dashboard-tab]')],i=tabs.indexOf(tab);let next;if(event.key==='ArrowRight')next=(i+1)%tabs.length;else if(event.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;if(next!==undefined){event.preventDefault();void select(tabs[next].dataset.dashboardTab,{focus:true});}};
 });
 function observeSelected(){
  for(const stop of stops)stop();stops=[];
  if(dialog.open&&section==='overview')stops.push(observeActivities($('[data-dashboard-activities="'+activitySource+'"]'),base,'dashboard'));
 }
 function selectSource(source,{focus=false}={}){
  if(!['community','official'].includes(source))return;activitySource=source;
  root.querySelectorAll('[data-dashboard-source-panel]').forEach(panel=>panel.hidden=panel.dataset.dashboardSourcePanel!==source);
  root.querySelectorAll('[data-dashboard-source]').forEach(tab=>{const chosen=tab.dataset.dashboardSource===source;tab.setAttribute('aria-selected',String(chosen));tab.classList.toggle('dui-tab-active',chosen);tab.tabIndex=chosen?0:-1;if(chosen&&focus)tab.focus({preventScroll:true});});
  const all=$('[data-dashboard-view-all]');if(all)all.href=source==='community'?'/'+locale+'/community/activities/':'/'+locale+'/events/?source=official';
  observeSelected();
 }
 root.querySelectorAll('[data-dashboard-source]').forEach(tab=>{
  tab.onclick=()=>selectSource(tab.dataset.dashboardSource);
  tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();selectSource(event.key==='Home'?'community':event.key==='End'?'official':activitySource==='community'?'official':'community',{focus:true});};
 });
 function activityState(source,{busy=false,message=''}={}){
  const cards=$('[data-dashboard-activities="'+source+'"]'),panel=$('[data-dashboard-source-panel="'+source+'"]'),skeleton=$('[data-dashboard-activity-skeleton="'+source+'"]'),status=$('[data-dashboard-activity-status="'+source+'"]');
  panel?.setAttribute('aria-busy',String(busy));if(skeleton)skeleton.hidden=!busy||cards.dataset.loaded==='true';status.textContent=message;status.hidden=!message;
 }
 function renderActivities(source,data,{fade=false}={}){
  const cards=$('[data-dashboard-activities="'+source+'"]');
  const items=data.items.slice(0,2),signature=JSON.stringify(items),changed=renderedActivities[source]!==signature;
  // Keep loaded artwork and keyboard focus when a background refresh returns
  // the same records. Cache revalidation should not restart image skeletons.
  if(changed){cards.replaceChildren(...items.map((item,i)=>activityCard(source==='official'?{...item,poster:''}:item,{locale,copy:c,base,placement:'dashboard',compact:source==='community'&&i>0})));renderedActivities[source]=signature;}cards.dataset.loaded='true';
  activityState(source,{message:data.cache?.stale?c.cached+(data.cache.fetchedAt?' · '+c.fetched+' '+new Date(data.cache.fetchedAt).toLocaleString(locale):''):data.items.length?'':c.emptyRange});
  if(changed&&fade&&!reduced())animate(cards,[{opacity:0},{opacity:1}],{duration:180,easing:'cubic-bezier(.23,1,.32,1)'});
  observeSelected();
 }
 async function loadActivities(force=false){
  if(!dialog.open)return;stopActivities();const current=generation;
  await Promise.allSettled(['community','official'].map(async source=>{
   if(!force&&Date.now()-lastActivities[source]<30000){observeSelected();return;}
   const cards=$('[data-dashboard-activities="'+source+'"]'),retry=$('[data-dashboard-activity-retry="'+source+'"]'),params={source,recommend:'1',placement:'dashboard',locale},controller=new AbortController();controllers.push(controller);retry.hidden=true;
   if(cards.dataset.loaded!=='true'){const cached=cachedActivities(base,params);if(cached)renderActivities(source,cached);}
   const cold=cards.dataset.loaded!=='true';activityState(source,{busy:true});
   try{
    const data=await getActivities(base,params,{signal:controller.signal});if(!active||current!==generation||!dialog.open)return;
    renderActivities(source,data,{fade:cold});lastActivities[source]=Date.now();
   }catch(error){if(error.name==='AbortError'||current!==generation)return;activityState(source,{message:c.unavailable});retry.hidden=false;}
  }));
 }
 root.querySelectorAll('[data-dashboard-activity-retry]').forEach(n=>n.onclick=()=>loadActivities(true));
 function renderNotices(){
  const summary=$('[data-dashboard-notice-summary]'),list=$('[data-dashboard-notice-list]'),recent=$('[data-dashboard-recent-notices]')||summary;summary.replaceChildren();if(recent!==summary)recent.replaceChildren();list.replaceChildren();
  if(!index.items.length){summary.append(element('p',c.noNotices));return;}
  for(const [i,n]of index.items.entries()){
   const a=element('button',null,'dashboard-notice-preview'+(i===0?' is-featured':''));a.type='button';a.append(element('span',n.draft?c.preview:i===0&&n.important?c.important:n.date,'dashboard-notice-meta'),element(i===0?'h4':'strong',n.title));if(i===0)a.append(element('p',n.summary));a.onclick=()=>{noticeId=n.id;void select('announcements');};(i===0?summary:recent).append(a);
   const b=element('button',null,'dashboard-notice-index');b.type='button';b.append(element('time',n.date),element('strong',n.title));b.onclick=()=>loadNotice(n.id);b.dataset.noticeId=n.id;list.append(b);
  }
 }
 function tryAuto(){
  if(!active)return;
  const stored=preferences.read();if(dashboardShouldOpen({home:root.dataset.home==='true',hash:location.hash,visible:document.visibilityState==='visible',intro:document.documentElement.classList.contains('site-intro-enabled'),interacted,stored,day:dashboardDay(),important:noticeKey()}))void open('overview',{automatic:true});
 }
 async function loadIndex(force=false){
  if(index&&!force)return index;if(indexFlight)return indexFlight;
  indexFlight=(async()=>{
   try{
    const r=await fetch('/'+locale+'/dashboard/announcements.json',{credentials:'omit',cache:'no-cache',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();const data=await readBoundedJson(r);if(!Array.isArray(data.items)||!active)throw Error();index=data;preferences=dashboardPreferences(window,root.dataset.preview==='true'||!!index.preview);renderNotices();updateDot();if(dialog.open)acknowledge();if(section==='announcements'&&dialog.open)void loadNotice(noticeId||index.featuredId);return data;
   }catch{
    const area=$('[data-dashboard-notice-summary]');area.replaceChildren(element('p',c.noticeError));const retry=element('button',c.retry,'activity-text-action');retry.type='button';retry.onclick=()=>loadIndex(true);area.append(retry);$('[data-dashboard-notice-status]').textContent=c.noticeError;$('[data-dashboard-notice-status]').hidden=false;$('[data-dashboard-notice-retry]').hidden=false;
   }finally{indexFlight=null;tryAuto();}
  })();return indexFlight;
 }
 async function loadNotice(id){
  if(!id){if(!index)await loadIndex();id=index?.featuredId;if(!id){$('[data-dashboard-notice-status]').textContent=c.noNotices;$('[data-dashboard-notice-status]').hidden=false;return;}}
  if(!index?.items.some(n=>n.id===id))return;noticeId=id;const current=++noticeGeneration.value,status=$('[data-dashboard-notice-status]'),body=$('[data-dashboard-notice-body]'),retry=$('[data-dashboard-notice-retry]');status.textContent='';status.hidden=true;retry.hidden=true;const skeleton=$('[data-dashboard-notice-skeleton]');if(skeleton)skeleton.hidden=bodyCache.has(id);body.hidden=true;body.setAttribute('aria-busy','true');
  root.querySelectorAll('[data-notice-id]').forEach(n=>n.setAttribute('aria-current',String(n.dataset.noticeId===id)));
  try{
   let data=bodyCache.get(id);if(!data){const r=await fetch('/'+locale+'/dashboard/announcements/'+encodeURIComponent(id)+'.json',{credentials:'omit',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error();data=await readBoundedJson(r,524288);bodyCache.set(id,data);}if(!active||current!==noticeGeneration.value)return;
   body.replaceChildren();body.append(element('p',data.draft?c.preview:data.date,'dashboard-notice-meta'),element('h2',data.title),element('p',data.summary));const prose=element('div');prose.innerHTML=data.html;body.append(prose);body.hidden=false;body.setAttribute('aria-busy','false');if(skeleton)skeleton.hidden=true;status.textContent='';
   // Notice links remain regular links; generated heading IDs are scoped to this reader.
   for(const n of prose.querySelectorAll('[id]'))n.id='dashboard-notice-'+id+'--'+n.id;
   for(const a of prose.querySelectorAll('a[href^="#"]'))a.setAttribute('href','#dashboard-notice-'+id+'--'+a.hash.slice(1));
  }catch{if(current===noticeGeneration.value){status.textContent=c.noticeError;status.hidden=false;if(skeleton)skeleton.hidden=true;body.setAttribute('aria-busy','false');retry.hidden=false;}}
 }
 $('[data-dashboard-notice-retry]').onclick=()=>index?loadNotice(noticeId):loadIndex(true);
 if($('[data-dashboard-ai-retry]'))$('[data-dashboard-ai-retry]').onclick=()=>select('ai');
 $('[data-dashboard-search]').onclick=()=>{close({instant:true,focus:false});document.querySelector('[data-search-open]')?.click();};
 const openContact=()=>{if(location.hash!=='#social-contact')return;interacted=true;hashOpened=true;const run=()=>open('tools').then(()=>{const contact=$('[data-dashboard-contact]');$('[data-dashboard-tab=tools]').focus({preventScroll:true});if(contact)scroll.scrollTop+=contact.getBoundingClientRect().top-scroll.getBoundingClientRect().top;dialog.scrollTop=0;});if(document.documentElement.classList.contains('site-intro-enabled'))window.addEventListener('wiki-site-intro-complete',run,{once:true});else void run();};
 const onIntent=event=>{if(event.target.closest?.('[data-site-intro]'))return;if(!dialog.contains(event.target)&&event.target.closest?.('button,a,summary,input'))interacted=true;};
 document.addEventListener('pointerdown',onIntent,true);
 const onBrowse=event=>{if(!dialog.open&&!document.documentElement.classList.contains('site-intro-enabled')&&!event.target.closest?.('[data-site-intro]'))interacted=true;};
 document.addEventListener('wheel',onBrowse,{passive:true});document.addEventListener('touchstart',onBrowse,{passive:true});document.addEventListener('keydown',onBrowse);
 document.addEventListener('click',event=>{const a=event.target.closest?.('a[href]');if(!a)return;const u=new URL(a.href);if(u.origin===location.origin&&u.pathname===location.pathname&&u.hash==='#social-contact'){event.preventDefault();history.pushState(null,'',u);openContact();}else if(dialog.contains(a)&&!a.hash.startsWith('#dashboard-notice-'))close({instant:true,focus:false});});
 document.addEventListener('keydown',event=>{if(dialog.open&&(event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k')close({instant:true,focus:false});},true);
 const stopPanels=onFloatingPanelChange(id=>{if(id!=='dashboard'){interacted=true;close({instant:true,focus:false});}});
 const onSection=event=>{if(dialog.open)void select(event.detail?.section||'overview',{focus:true});};
 const onClose=()=>close({instant:true});
 const onHistory=()=>{if(location.hash==='#social-contact')openContact();else if(hashOpened){hashOpened=false;close({instant:true});}};
 window.addEventListener('wiki-dashboard-section',onSection);window.addEventListener('wiki-dashboard-close',onClose);window.addEventListener('hashchange',onHistory);window.addEventListener('popstate',onHistory);
 window.addEventListener('wiki-site-intro-complete',tryAuto);document.addEventListener('visibilitychange',tryAuto);
 const cleanup=()=>{viewport?.removeEventListener('resize',fitKeyboard);viewport?.removeEventListener('scroll',fitKeyboard);dialog.removeEventListener('focusin',fitKeyboard);dialog.removeEventListener('focusout',fitAfterFocus);active=false;stopActivities();stopPanels();releaseScroll?.();openMotion?.cancel();closeMotion?.cancel();document.removeEventListener('pointerdown',onIntent,true);document.removeEventListener('wheel',onBrowse);document.removeEventListener('touchstart',onBrowse);document.removeEventListener('keydown',onBrowse);window.removeEventListener('wiki-dashboard-section',onSection);window.removeEventListener('wiki-dashboard-close',onClose);window.removeEventListener('wiki-site-intro-complete',tryAuto);document.removeEventListener('visibilitychange',tryAuto);window.removeEventListener('hashchange',onHistory);window.removeEventListener('popstate',onHistory);};
 document.addEventListener('astro:before-swap',cleanup,{once:true});window.addEventListener('pagehide',event=>{if(event.persisted){close({instant:true,focus:false});stopActivities();releaseScroll?.();releaseScroll=null;}else cleanup();});
 openContact();tryAuto();void loadIndex();
 return {open,close,select};
}
