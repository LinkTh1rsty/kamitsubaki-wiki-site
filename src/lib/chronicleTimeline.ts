import {resolveChroniclePreset} from './chroniclePresets.mjs';
import {setIconLabel} from './icons.mjs';
import {dateBounds, eventBounds, timelineBounds, clusterEvents} from './chronicleTimeline.mjs';
import {createChronicleZoomScheduler} from './chronicleZoomScheduler.mjs';
import {updateLocaleQueries} from './localeQuery.mjs';
interface TimelineEvent {id:string;title:string;summary:string;era?:string;date:{start:string;end?:string;precision:string};tracks:string[];eventTypes:string[];importance:string;sourceLocale?:string;translationPending?:boolean;related?:{entity:string}[];links:{label:string;url:string}[];sources?:{url?:string;title?:string;publisher?:string;page?:string}[]}
export function initTimeline(){
 const root=document.querySelector<HTMLElement>('[data-timeline]');if(!root)return;
 const saveLocation=(url:URL)=>{history.replaceState(null,'',url);updateLocaleQueries(root.ownerDocument,url.search,url.hash);};
 const data=JSON.parse(root.querySelector('[data-timeline-data]')!.textContent!);
 const events:TimelineEvent[]=data.events, eras:{id:string;start:string;end:string}[]=data.eras;
 const ui=data.ui, domain=timelineBounds(events,eras), duration=domain.end-domain.start;
 const get=<T extends Element=HTMLElement>(s:string)=>root.querySelector<T>(s)!;
 const viewport=get<HTMLElement>('[data-time-scroll]'),canvas=get<HTMLElement>('[data-time-canvas]');
 const zoom=get<HTMLInputElement>('[data-time-zoom]'),form=get<HTMLFormElement>('form');
 const maxZoom=160;
 const zoomLevel=()=>Math.exp(Number(zoom.value)/100*Math.log(maxZoom));
 const setZoomLevel=(value:number)=>{zoom.value=String(Math.log(Math.max(1,Math.min(maxZoom,value)))/Math.log(maxZoom)*100);};
 const checks=[...root.querySelectorAll<HTMLInputElement>('[data-track]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let width=1, filtered=events, selected:TimelineEvent|undefined, group:TimelineEvent[]=[], activeEra='', previousWidth=0, scrubTime=domain.start, scope:'chronicle'|'site'='chronicle';
 const el=(tag:string,text?:string,cls?:string)=>{const e=document.createElement(tag);if(text!==undefined)setIconLabel(e,text);if(cls)e.className=cls;return e;};
 const pos=(time:number)=>(time-domain.start)/duration*width;
 const dateLabel=(event:TimelineEvent)=>event.date.start+(event.date.end?' — '+event.date.end:'')+(event.date.precision!=='day'?` · ${ui.uncertain}`:'');
 const enabled=()=>checks.filter(c=>c.checked).map(c=>c.value);
 const scopeTrack=(track:string)=>scope==='site'?track==='site-updates':track!=='site-updates';
 const resetTracks=()=>checks.forEach(check=>check.checked=scopeTrack(check.value));
 const viewportState=()=>{
   const start=domain.start+viewport.scrollLeft/width*duration,end=Math.min(domain.end,start+viewport.clientWidth/width*duration);
   const format=(t:number)=>new Date(t).toISOString().slice(0,end-start<90*86400000?10:7);
   get('[data-window]').textContent=`${format(start)} — ${format(end)}`;
   const marker=get<HTMLElement>('[data-window-marker]');marker.style.left=`${viewport.scrollLeft/width*100}%`;marker.style.width=`${Math.min(100,viewport.clientWidth/width*100)}%`;
   marker.setAttribute('aria-valuenow',String(Math.round(viewport.scrollLeft/Math.max(1,width-viewport.clientWidth)*100)));
   const current=root.querySelector<HTMLSelectElement>('[data-timeline-view]')?.value==='list'?activeEra:eras.find(e=>start>=dateBounds(e.start).start&&start<dateBounds(e.end).end)?.id||'';
   root.querySelectorAll<HTMLButtonElement>('[data-era]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.era===current)));
 };
 const focusEvent=(event:TimelineEvent,animate=true)=>viewport.scrollTo({left:Math.max(0,pos(eventBounds(event).start)-viewport.clientWidth*.35),behavior:animate&&!reduced.matches?'smooth':'instant'});
 const setPlayhead=(time:number)=>{scrubTime=Math.max(domain.start,Math.min(domain.end,time));const head=get<HTMLElement>('[data-playhead]');head.style.left=pos(scrubTime)+'px';get('[data-playhead-time]').textContent=new Date(scrubTime).toISOString().slice(0,10);};
 const revealDetail=(keyboard=false)=>{const detail=get<HTMLElement>('[data-detail]');if(keyboard)detail.focus();else if(matchMedia('(max-width:1050px)').matches)detail.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});};
 let previewed:TimelineEvent|undefined,previousDetail:Node[]|undefined,previousGroupTitle='';
 const clearPreview=(event?:TimelineEvent)=>{if(!previewed||event&&previewed.id!==event.id)return;previewed=undefined;get('[data-detail]').replaceChildren(...(previousDetail||[]));get('[data-group-title]').textContent=previousGroupTitle;previousDetail=undefined;};
 const preview=(event:TimelineEvent)=>{if(selected?.id===event.id||previewed?.id===event.id)return;clearPreview();const detail=get('[data-detail]');previousDetail=[...detail.childNodes];previousGroupTitle=get('[data-group-title]').textContent||'';previewed=event;const time=el('time',dateLabel(event));time.setAttribute('datetime',event.date.start);detail.replaceChildren(time,el('h2',event.title),el('p',event.summary),el('small',ui.preview,'timeline-preview-hint'));get('[data-group-title]').textContent=ui.preview;};
 const select=(event:TimelineEvent,save=true,locate=false)=>{
   clearPreview();
   selected=event;
   if(!group.some(e=>e.id===event.id))group=[event];
   get('[data-group-title]').textContent=`${group.length} ${ui.events}`;
   const list=get('[data-event-list]');list.replaceChildren();
   let shown=0;const more=el('button',ui.more) as HTMLButtonElement;more.type='button';more.className='timeline-events-more';
   const reveal=()=>{const batch=group.slice(shown,shown+12);shown+=batch.length;
   batch.forEach(e=>{const b=el('button',`${dateLabel(e)} · ${e.title}`) as HTMLButtonElement;b.type='button';b.setAttribute('aria-pressed',String(e.id===event.id));b.addEventListener('click',()=>select(e,true,true));list.insertBefore(b,more.isConnected?more:null);});more.hidden=shown>=group.length;};
   list.append(more);more.addEventListener('click',()=>{reveal();});do{reveal();}while(shown<=group.findIndex(e=>e.id===event.id));
   const detail=get('[data-detail]');detail.replaceChildren();
   const time=el('time',dateLabel(event));time.setAttribute('datetime',event.date.start);
   const eraIndex=eras.findIndex(e=>e.id===event.era);
   detail.append(time,el('p',[eraIndex>=0?data.eraLabels[eraIndex]:'',...event.tracks.map(t=>data.trackLabels[data.tracks.indexOf(t)])].filter(Boolean).join(' / ')),el('h2',event.title));
   if(event.translationPending)detail.append(el('p',`${ui.sourceLanguage}：${event.sourceLocale?.toUpperCase()} · ${ui.translationPending}`,'timeline-translation-note'));
   if(event.summary!==event.title)detail.append(el('p',event.summary));
   const links=el('div',undefined,'timeline-detail-links');event.links.forEach(link=>{const a=el('a',link.label) as HTMLAnchorElement;a.href=link.url;links.append(a);});detail.append(links);
   if(event.sources?.length){const sources=el('details');sources.append(el('summary',ui.sources));event.sources.forEach(s=>{const label=[s.title,s.publisher,s.page].filter(Boolean).join(' · ');if(s.url){const a=el('a',label||new URL(s.url).hostname) as HTMLAnchorElement;a.href=s.url;a.target='_blank';a.rel='noopener noreferrer';sources.append(a);}else sources.append(el('p',label));});detail.append(sources);}
   const nav=el('nav'),index=filtered.findIndex(e=>e.id===event.id);
   [-1,1].forEach(delta=>{const b=el('button',delta<0?'← '+ui.previous:ui.next+' →') as HTMLButtonElement;b.type='button';b.disabled=!filtered[index+delta];b.addEventListener('click',()=>{group=[filtered[index+delta]];select(filtered[index+delta],true,true);});nav.append(b);});if(!event.id.startsWith('site-')){const revise=el('a',ui.revise) as HTMLAnchorElement;revise.href=`/${data.locale}/chronicle/submit/?event=${encodeURIComponent(event.id)}&year=${encodeURIComponent(event.date.start.slice(0,4))}`;nav.append(revise);}detail.append(nav);
   setPlayhead(eventBounds(event).start);
   root.querySelectorAll<HTMLElement>('[data-event-ids]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.eventIds!.split(' ').includes(event.id))));
   if(!reduced.matches)detail.animate([{opacity:.35,transform:'translateY(5px)'},{opacity:1,transform:'none'}],{duration:220,easing:'ease-out'});
   if(save){const url=new URL(location.href);url.hash=event.id;saveLocation(url);}
   if(locate)focusEvent(event);
 };
 const draw=()=>{
   clearPreview();
   const scale=zoomLevel();width=Math.max(1,viewport.clientWidth)*scale;canvas.style.width=width+'px';get('[data-scale]').textContent=(scale<10?scale.toFixed(1):Math.round(scale))+'×';
   root.querySelectorAll<HTMLButtonElement>('[data-zoom-preset]').forEach(button=>button.setAttribute('aria-pressed',String(Math.abs(scale-Number(button.dataset.zoomPreset))/scale<.025)));
   const ruler=get('[data-ruler]');ruler.replaceChildren();
   const monthPixels=width/(duration/(365.25*86400000))*1/12;
   const step=monthPixels>60?1:monthPixels>20?3:12;
   const d=new Date(domain.start);
   while(d.getTime()<domain.end){const tick=el('span',d.toISOString().slice(0,step===12?4:7),'timeline-tick');tick.style.left=pos(d.getTime())+'px';ruler.append(tick);d.setUTCMonth(d.getUTCMonth()+step);}
   const enabledTracks=enabled();
   root.querySelectorAll<HTMLElement>('[data-lane]').forEach((lane,index)=>{
     lane.replaceChildren();const track=lane.dataset.lane!;lane.dataset.muted=String(!enabledTracks.includes(track));
     const visible=enabledTracks.includes(track)?filtered.filter(e=>e.tracks.includes(track)):[];
     const rowEnds:number[]=[];
     const clusters=track==='site-updates'&&scale>=16?visible.map(event=>({events:[event],x:pos(eventBounds(event).start)})):clusterEvents(visible,domain.start,domain.end,width);
     for(const cluster of clusters){
       const first=cluster.events[0] as TimelineEvent;
       const multiple=cluster.events.length>1,bounds=eventBounds(first);
       const kind=multiple?'cluster':first.date.precision!=='day'?'uncertain':first.date.end?'period':'point';
       const b=el('button',undefined,'timeline-clip') as HTMLButtonElement;b.type='button';
       b.dataset.kind=kind;b.dataset.eventIds=cluster.events.map((e:TimelineEvent)=>e.id).join(' ');b.dataset.milestone=String(cluster.events.some((e:TimelineEvent)=>e.importance==='milestone'));
       const left=pos(bounds.start);b.style.left=left+'px';
       const last=cluster.events.at(-1) as TimelineEvent;
       const span=Math.max(2,pos(multiple?eventBounds(last).end:bounds.end)-left);
       const ranged=multiple||kind==='period'||kind==='uncertain';
       const blockWidth=ranged?Math.max(32,span):132;
       if(ranged){b.style.width=blockWidth+'px';b.style.setProperty('--duration-width',span+'px');}
       b.dataset.compact=String(ranged&&blockWidth<72);
       let row=rowEnds.findIndex(end=>end+12<=left);if(row<0)row=rowEnds.length;
       rowEnds[row]=left+blockWidth;b.style.top=(12+row*68)+'px';
       const date=multiple?first.date.start+' — '+cluster.events.at(-1).date.start:dateLabel(first);
       const name=multiple?`${cluster.events.length} ${ui.events}`:first.title;
       b.setAttribute('aria-label',`${date} · ${name}`);
       b.append(el('small',date),el('strong',name));
       if(multiple)b.append(el('span',`+${cluster.events.length}`,'timeline-clip-count'));
       if(ranged)b.append(el('span',undefined,'timeline-duration'));
       b.setAttribute('aria-pressed',String(cluster.events.some((e:TimelineEvent)=>e.id===selected?.id)));
       b.addEventListener('pointerenter',()=>preview(first));b.addEventListener('pointerleave',()=>clearPreview(first));
       b.addEventListener('focus',()=>preview(first));b.addEventListener('blur',()=>clearPreview(first));
       b.addEventListener('click',event=>{group=cluster.events;select(group.find(e=>e.id===selected?.id)||first);revealDetail(event.detail===0);});lane.append(b);
     }
     const height=enabledTracks.includes(track)?Math.max(104,24+rowEnds.length*68):36;lane.style.height=height+'px';
     const label=root.querySelectorAll<HTMLElement>('.timeline-track-label')[index];if(label){label.style.height=height+'px';label.dataset.muted=String(!enabledTracks.includes(track));}
   });
   setPlayhead(scrubTime);
   viewportState();
 };
 const zoomScheduler=createChronicleZoomScheduler({
  render:(anchor:{time:number;x:number}|null)=>{draw();if(anchor)viewport.scrollLeft=pos(anchor.time)-anchor.x;viewportState();},
  commit:()=>{const url=new URL(location.href);url.searchParams.delete('era');saveLocation(url);}
 });
 const commitZoomUrl=()=>zoomScheduler.finish();
 const saveEra=(id='')=>{zoomScheduler.cancel();activeEra=id;const url=new URL(location.href);id?url.searchParams.set('era',id):url.searchParams.delete('era');saveLocation(url);if(viewControl.value==='list'){renderList();viewportState();}};
 const scheduleZoom=(time:number,x:number)=>{activeEra='';const scale=zoomLevel();get('[data-scale]').textContent=(scale<10?scale.toFixed(1):Math.round(scale))+'×';zoomScheduler.schedule({time,x});};
 const fitRange=(start:number,end:number,animate=true)=>{
   const range=Math.max(86400000,Math.min(domain.end,end)-Math.max(domain.start,start));setZoomLevel(duration/range);draw();setPlayhead(Math.max(domain.start,start));viewport.scrollTo({left:pos(Math.max(domain.start,start)),behavior:animate&&!reduced.matches?'smooth':'instant'});
 };
 const fitSiteRange=()=>{const siteEvents=events.filter(e=>e.tracks.includes('site-updates'));if(!siteEvents.length)return fitRange(domain.start,domain.end,false);const starts=siteEvents.map(e=>eventBounds(e).start),ends=siteEvents.map(e=>eventBounds(e).end);fitRange(Math.min(...starts)-14*86400000,Math.max(...ends)+14*86400000,false);};
 const listView=get<HTMLElement>('[data-chronicle-list]'),viewControl=get<HTMLSelectElement>('[data-timeline-view]'),orderControl=get<HTMLSelectElement>('[data-timeline-order]');
 const renderList=()=>{listView.replaceChildren();const ordered=filtered.filter(event=>viewControl.value!=='list'||!activeEra||event.era===activeEra).sort((a,b)=>a.date.start.localeCompare(b.date.start)||a.id.localeCompare(b.id));if(orderControl.value==='desc')ordered.reverse();let shown=0;const more=el('button',ui.more) as HTMLButtonElement;more.type='button';const reveal=()=>{for(const event of ordered.slice(shown,shown+12)){const button=el('button',`${dateLabel(event)} · ${event.title}`) as HTMLButtonElement;button.type='button';button.onclick=()=>{group=[event];select(event);get('[data-detail]').scrollIntoView({block:'nearest',behavior:'instant'});};listView.insertBefore(button,more);}shown+=12;more.hidden=shown>=ordered.length;collapse.hidden=shown<=12;};const collapse=el('button',ui.collapse) as HTMLButtonElement;collapse.type='button';collapse.onclick=()=>{renderList();listView.scrollIntoView({block:'nearest',behavior:'instant'});};listView.append(more,collapse);more.onclick=reveal;reveal();};
 const changeListView=(save=true)=>{listView.hidden=viewControl.value!=='list';get<HTMLElement>('.timeline-console').hidden=!listView.hidden;renderList();if(listView.hidden)draw();if(save){const url=new URL(location.href);url.searchParams.set('view',viewControl.value);url.searchParams.set('order',orderControl.value);saveLocation(url);}};
 viewControl.onchange=()=>changeListView();orderControl.onchange=()=>changeListView();
 const apply=(save=false)=>{
   const values=Object.fromEntries(new FormData(form)),on=enabled();
   filtered=events.filter(e=>on.some(t=>scopeTrack(t)&&e.tracks.includes(t))&&(!values.q||`${e.title} ${e.summary}`.toLowerCase().includes(String(values.q).toLowerCase()))&&(!values.entity||e.related?.some(r=>r.entity===values.entity))&&(!values.type||e.eventTypes.includes(String(values.type)))&&(!values.year||e.date.start.startsWith(String(values.year)))&&(!values.from||(e.date.end||e.date.start)>=String(values.from))&&(!values.to||e.date.start.slice(0,String(values.to).length)<=String(values.to))).sort((a,b)=>eventBounds(a).start-eventBounds(b).start||a.id.localeCompare(b.id));
   get('[data-count]').textContent=`${filtered.length} / ${events.length} ${ui.events}`;get('[data-filter-count]').textContent=filtered.length===events.length?'':`${filtered.length} / ${events.length}`;
   get<HTMLElement>('[data-empty]').hidden=filtered.length>0;
   root.querySelectorAll<HTMLElement>('[data-solo]').forEach(b=>b.setAttribute('aria-pressed',String(on.length===1&&on[0]===b.dataset.solo)));
   if(selected&&!filtered.some(e=>e.id===selected!.id)){selected=undefined;group=[];get('[data-event-list]').replaceChildren();get('[data-detail]').replaceChildren(el('p',ui.select));get('[data-group-title]').textContent=ui.select;}
   if(selected){group=group.filter(e=>filtered.some(f=>f.id===e.id));select(selected,false);}
   draw();renderList();
   if(values.year){activeEra='';fitRange(Date.UTC(Number(values.year),0,1),Date.UTC(Number(values.year)+1,0,1));if(save)saveEra();}
   if(save){const url=new URL(location.href);for(const [key,value]of Object.entries(values))value?url.searchParams.set(key,String(value)):url.searchParams.delete(key);const defaultTracks=scope==='site'?on.length===1&&on[0]==='site-updates':on.length===checks.length-1&&!on.includes('site-updates');defaultTracks?url.searchParams.delete('tracks'):url.searchParams.set('tracks',on.join(','));if(!selected)url.hash='';saveLocation(url);}
 };
 const restore=()=>{
   updateLocaleQueries(root.ownerDocument,location.search,location.hash);
   const params=new URLSearchParams(location.search);const preset=resolveChroniclePreset(params.get('preset'));if(preset)for(const [key,value]of Object.entries(preset))if(!params.has(key))params.set(key,String(value));viewControl.value=params.get('view')==='list'?'list':'timeline';orderControl.value=params.get('order')==='desc'?'desc':'asc';
   let id='';try{id=decodeURIComponent(location.hash.slice(1));}catch{}
   scope=params.get('scope')==='site'||id.startsWith('site-')?'site':'chronicle';root.dataset.timelineScope=scope;root.querySelectorAll<HTMLButtonElement>('[data-timeline-scope]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.timelineScope===scope)));
   form.querySelectorAll<HTMLInputElement|HTMLSelectElement>('[name]').forEach(c=>c.value=params.get(c.name)||'');checks.forEach(c=>c.checked=params.has('tracks')?(params.get('tracks')||'').split(',').includes(c.value)&&scopeTrack(c.value):scopeTrack(c.value));apply();
   changeListView(false);const era=scope==='chronicle'?eras.find(e=>e.id===params.get('era')):undefined;activeEra=era?.id||'';renderList();if(era)fitRange(dateBounds(era.start).start,dateBounds(era.end).end,false);else if(scope==='site'&&viewControl.value==='timeline')fitSiteRange();
   const event=filtered.find(e=>e.id===id);if(event){group=[event];select(event,false);focusEvent(event,false);
     const reveal=()=>{const consoleTop=get<HTMLElement>('.timeline-console').getBoundingClientRect().top;window.scrollTo({top:window.scrollY+consoleTop-100,behavior:'instant'});};
     if(document.readyState==='complete')requestAnimationFrame(reveal);else window.addEventListener('load',reveal,{once:true});
   }
 };
 eras.forEach((era,i)=>{const start=Math.max(domain.start,dateBounds(era.start).start),end=Math.min(domain.end,dateBounds(era.end).end);const span=el('span',`0${i+1}`);span.style.position='absolute';span.style.left=(start-domain.start)/duration*100+'%';span.style.width=Math.max(0,(end-start)/duration*100)+'%';get('[data-overview-eras]').append(span);});
 root.querySelectorAll<HTMLButtonElement>('[data-era]').forEach(b=>b.addEventListener('click',()=>{const year=form.querySelector<HTMLSelectElement>('[name=year]')!;if(year.value){year.value='';apply(true);}const era=eras.find(e=>e.id===b.dataset.era)!;fitRange(dateBounds(era.start).start,dateBounds(era.end).end);saveEra(era.id);}));
 root.querySelectorAll<HTMLButtonElement>('[data-timeline-scope]').forEach(button=>button.addEventListener('click',()=>{const next=button.dataset.timelineScope==='site'?'site':'chronicle';if(next===scope)return;scope=next;root.dataset.timelineScope=scope;root.querySelectorAll<HTMLButtonElement>('[data-timeline-scope]').forEach(item=>item.setAttribute('aria-pressed',String(item.dataset.timelineScope===scope)));resetTracks();activeEra='';apply(true);saveEra();const url=new URL(location.href);scope==='site'?url.searchParams.set('scope','site'):url.searchParams.delete('scope');saveLocation(url);if(viewControl.value==='timeline'){scope==='site'?fitSiteRange():fitRange(domain.start,domain.end,false);}}));
 get('[data-fit]').addEventListener('click',()=>{saveEra();scope==='site'?fitSiteRange():fitRange(domain.start,domain.end);});
 zoom.addEventListener('input',()=>{
   const playheadX=pos(scrubTime)-viewport.scrollLeft;
   const anchorTime=playheadX>=0&&playheadX<=viewport.clientWidth?scrubTime:domain.start+(viewport.scrollLeft+viewport.clientWidth/2)/width*duration;
   const anchorX=playheadX>=0&&playheadX<=viewport.clientWidth?playheadX:viewport.clientWidth/2;
   scheduleZoom(anchorTime,anchorX);
 });
 zoom.addEventListener('change',commitZoomUrl);zoom.addEventListener('pointerup',commitZoomUrl);window.addEventListener('pagehide',commitZoomUrl);
 root.querySelectorAll<HTMLButtonElement>('[data-zoom-preset]').forEach(button=>button.addEventListener('click',()=>{setZoomLevel(Number(button.dataset.zoomPreset));zoom.dispatchEvent(new Event('input',{bubbles:true}));zoom.focus({preventScroll:true});}));
 viewport.addEventListener('scroll',viewportState,{passive:true});
 const ruler=get<HTMLElement>('[data-ruler]');
 const scrub=(clientX:number)=>{const x=clientX-canvas.getBoundingClientRect().left;setPlayhead(domain.start+x/width*duration);};
 ruler.addEventListener('pointerdown',event=>{if(event.button!==0)return;ruler.setPointerCapture(event.pointerId);ruler.dataset.dragging='true';scrub(event.clientX);event.preventDefault();});
 ruler.addEventListener('pointermove',event=>{if(ruler.hasPointerCapture(event.pointerId))scrub(event.clientX);});
 const stopScrub=(event:PointerEvent)=>{if(ruler.hasPointerCapture(event.pointerId))ruler.releasePointerCapture(event.pointerId);delete ruler.dataset.dragging;};
 ruler.addEventListener('pointerup',stopScrub);ruler.addEventListener('pointercancel',stopScrub);
 const grip=get<HTMLElement>('.timeline-playhead-grip');let gripOffset=0;
 grip.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.stopPropagation();gripOffset=event.clientX-(canvas.getBoundingClientRect().left+pos(scrubTime));grip.setPointerCapture(event.pointerId);grip.dataset.dragging='true';event.preventDefault();});
 grip.addEventListener('pointermove',event=>{if(!grip.hasPointerCapture(event.pointerId))return;const rect=viewport.getBoundingClientRect();if(event.clientX>rect.right-20)viewport.scrollLeft+=Math.min(24,event.clientX-rect.right+20);else if(event.clientX<rect.left+20)viewport.scrollLeft-=Math.min(24,rect.left+20-event.clientX);scrub(event.clientX-gripOffset);});
 const stopGrip=(event:PointerEvent)=>{if(grip.hasPointerCapture(event.pointerId))grip.releasePointerCapture(event.pointerId);delete grip.dataset.dragging;};
 grip.addEventListener('pointerup',stopGrip);grip.addEventListener('pointercancel',stopGrip);
 let panStartX=0,panStartY=0,panStartScroll=0,pinchStart=0,pinchScale=1,pinchTime=domain.start;const touches=new Map<number,{x:number;y:number}>();
 viewport.addEventListener('pointerdown',event=>{if(event.button!==0||!(event.target instanceof Element)||event.target.closest('.timeline-clip,.timeline-ruler,.timeline-playhead-grip'))return;if(event.pointerType==='touch'){touches.set(event.pointerId,{x:event.clientX,y:event.clientY});if(touches.size===2){const [a,b]=[...touches.values()];pinchStart=Math.hypot(a.x-b.x,a.y-b.y)||1;pinchScale=zoomLevel();const rect=viewport.getBoundingClientRect(),center=(a.x+b.x)/2-rect.left;pinchTime=domain.start+(viewport.scrollLeft+center)/width*duration;}}panStartX=event.clientX;panStartY=event.clientY;panStartScroll=viewport.scrollLeft;viewport.dataset.dragging='true';viewport.setPointerCapture(event.pointerId);if(event.pointerType==='mouse')event.preventDefault();});
 viewport.addEventListener('pointermove',event=>{if(!viewport.hasPointerCapture(event.pointerId))return;if(event.pointerType==='touch'&&touches.has(event.pointerId)){touches.set(event.pointerId,{x:event.clientX,y:event.clientY});if(touches.size===2){const [a,b]=[...touches.values()],rect=viewport.getBoundingClientRect();setZoomLevel(pinchScale*Math.hypot(a.x-b.x,a.y-b.y)/pinchStart);scheduleZoom(pinchTime,(a.x+b.x)/2-rect.left);event.preventDefault();return;}if(Math.abs(event.clientY-panStartY)>Math.abs(event.clientX-panStartX))return;}viewport.scrollLeft=panStartScroll-(event.clientX-panStartX);if(event.pointerType==='touch')event.preventDefault();});
 const stopPan=(event:PointerEvent)=>{touches.delete(event.pointerId);if(viewport.hasPointerCapture(event.pointerId))viewport.releasePointerCapture(event.pointerId);if(touches.size===1){const remaining=touches.values().next().value!;panStartX=remaining.x;panStartY=remaining.y;panStartScroll=viewport.scrollLeft;}if(!touches.size){delete viewport.dataset.dragging;commitZoomUrl();}};
 viewport.addEventListener('pointerup',stopPan);viewport.addEventListener('pointercancel',stopPan);
 const overview=get<HTMLElement>('[data-window-marker]');let overviewX=0,overviewScroll=0;
 overview.addEventListener('pointerdown',event=>{if(event.button!==0)return;overviewX=event.clientX;overviewScroll=viewport.scrollLeft;overview.setPointerCapture(event.pointerId);overview.dataset.dragging='true';event.preventDefault();});
 overview.addEventListener('pointermove',event=>{if(!overview.hasPointerCapture(event.pointerId))return;const full=overview.parentElement!.clientWidth;viewport.scrollLeft=overviewScroll+(event.clientX-overviewX)/full*width;});
 const stopOverview=(event:PointerEvent)=>{if(overview.hasPointerCapture(event.pointerId))overview.releasePointerCapture(event.pointerId);delete overview.dataset.dragging;};
 overview.addEventListener('pointerup',stopOverview);overview.addEventListener('pointercancel',stopOverview);
 overview.addEventListener('keydown',event=>{const page=viewport.clientWidth*.8;const step=event.key==='ArrowLeft'?-page*.2:event.key==='ArrowRight'?page*.2:event.key==='PageUp'?-page:event.key==='PageDown'?page:0;if(!step)return;event.preventDefault();viewport.scrollLeft+=step;});
 form.addEventListener('input',()=>apply(true));form.addEventListener('submit',e=>e.preventDefault());form.addEventListener('reset',()=>requestAnimationFrame(()=>{resetTracks();apply(true);}));checks.forEach(c=>c.addEventListener('change',()=>{if(c.checked&&!scopeTrack(c.value))c.checked=false;apply(true);}));
 root.querySelectorAll<HTMLButtonElement>('[data-solo]').forEach(b=>b.addEventListener('click',()=>{const all=enabled().length===1&&enabled()[0]===b.dataset.solo;checks.forEach(c=>c.checked=all||c.value===b.dataset.solo);apply(true);const trackEvents=events.filter(e=>e.tracks.includes(b.dataset.solo!));if(!all&&trackEvents.length){const start=Math.min(...trackEvents.map(e=>eventBounds(e).start)),end=Math.max(...trackEvents.map(e=>eventBounds(e).end));fitRange(start-14*86400000,end+14*86400000);}else if(all)fitRange(domain.start,domain.end);}));
 addEventListener('popstate',restore);addEventListener('hashchange',restore);
 new ResizeObserver(()=>{if(previousWidth===viewport.clientWidth)return;const center=(viewport.scrollLeft+previousWidth/2)/width;previousWidth=viewport.clientWidth;draw();if(activeEra){const era=eras.find(e=>e.id===activeEra)!;fitRange(dateBounds(era.start).start,dateBounds(era.end).end);}else viewport.scrollLeft=Math.max(0,center*width-viewport.clientWidth/2);}).observe(viewport);
 restore();previousWidth=viewport.clientWidth;
}
