import {archiveRecord,selectArchive,parseArchiveQuestion,archiveStatistics,setlistStatistics,compareArchive,archiveOnThisDay,mysteryEntity,validBarcode,physicalCatalog,atlasPlaces,evidenceFor,genomePoints,visualRecords,unique} from '../lib/archiveResearch.mjs';
import {loadArchiveSnapshot,communityRequest,currentArchiveOwner,recordObservation,synchronizeObservatory,archiveAccount} from '../lib/archiveClient.mjs';
import {loadObservatory,saveObservatory,validateObservatory,mergeObservatory,observatoryYear,observatoryAchievements} from '../lib/archivePersonal.mjs';
import {addRadioTracks} from '../lib/archiveRadio.mjs';
import {updateLocaleQueries} from '../lib/localeQuery.mjs';
import {svgNode} from '../lib/archiveChart.mjs';
import {createArchiveScanner} from '../lib/archiveScanner.mjs';
import {musicConnections,compareLiveSetlists,archiveCollaborations,archiveCoverage} from '../lib/archiveInsights.mjs';
import {archiveCSV,archiveZip,archiveCitation,downloadArchiveFile,pilgrimageGeoJSON,pilgrimageGPX} from '../lib/archiveExports.mjs';
import {initializeArchiveOpenData} from './archiveOpenData.js';
import {initializeCollectionTools} from './archiveCollectionTools.js';
import {collectionEditorItems,collectionPresentation,collectionNoteLine} from '../lib/archiveCollectionDrafts.mjs';
import {archiveChoices} from '../lib/archiveSelection.mjs';
import {createArchiveEntityPicker} from './archiveEntityPicker.js';
import {archiveInteractionCopy} from '../lib/archiveInteractionCopy.mjs';
import {entityLabel} from '../lib/entityLabels.mjs';

const element=(tag,text='',className='')=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(className)node.className=className;return node;};
function link(text,path) {
 const node=element('a',text);
 try{const url=new URL(path,location.origin);if(url.protocol==='https:' || url.origin===location.origin){node.href=url.href;if(url.origin!==location.origin){node.target='_blank';node.rel='noopener noreferrer';}}}catch{}
 return node;
}
const button=(text,action)=>{const node=element('button',text);node.type='button';node.addEventListener('click',action);return node;};
const formObject=form=>Object.fromEntries(new FormData(form).entries());
const tokyoDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export async function initializeArchiveWorkspace(root,{loadSnapshot=loadArchiveSnapshot,request=communityRequest,owner=currentArchiveOwner,storage=localStorage}={}){
 const module=root.dataset.module,locale=root.dataset.locale || 'zh',c=JSON.parse(root.querySelector('[data-archive-copy]').textContent);
 const results=root.querySelector('[data-archive-results]'),status=root.querySelector('[data-archive-status]'),detail=root.querySelector('[data-archive-detail]'),more=root.querySelector('[data-archive-more]');
 const form=root.querySelector('[data-archive-filters]');
 const pendingControls=[...root.querySelectorAll('form input,form select,form textarea,form button')].filter(control=>!control.disabled);
 pendingControls.forEach(control=>control.disabled=true);root.setAttribute('aria-busy','true');
 let snapshot,limit=24,lastRows=[],renderToken=0,accountEpoch=0,roomGeneration=0,profile=null,community=null,taskStates=[],reviews=[],room=null,roomTimer=null,scanner=null,atlasMapHandle=null,atlasMapGeneration=0,atlasMapEnabled=false,detailTrigger=null,destroyed=false,collectionTools=null;
 const record=id=>archiveRecord(snapshot,id,locale),name=id=>record(id)?.title || id;
 const interaction=archiveInteractionCopy(locale),pickers=new Map();let roomPickerEpoch=0;
 const refreshPickers=()=>{for(const picker of pickers.values())picker.refresh();};
 function initializePickers(){
  const all=archiveChoices(snapshot,locale),people=archiveChoices(snapshot,locale,['person','virtual-avatar','unit','software-voice']);
  const named=[...new Set(snapshot.entities.flatMap(row=>(row.facts.credits || []).filter(credit=>!credit.entity && credit.name).map(credit=>credit.name)))].map(title=>({id:title,title,type:interaction.creator,terms:[title]}));
  for(const field of root.querySelectorAll('input[list="archive-entity-ids"],input[list="archive-live-ids"],select[name="artist"],textarea[name="interests"],[data-setlist-compare] textarea[name="lives"]')){
   const multiple=field.tagName==='TEXTAREA',items=field.name==='lives' || field.getAttribute('list')==='archive-live-ids'?all.filter(row=>snapshot.entities.find(entity=>entity.id===row.id)?.type==='live-event'):['artist','creator'].includes(field.name)?field.name==='creator'?[...people,...named]:people:all;
   pickers.set(field,createArchiveEntityPicker(field,{items,locale,multiple,max:field.name==='interests'?30:field.name==='lives'?4:multiple?100:1}));
  }
  const kind=root.querySelector('[data-room-position] [name=kind]'),field=root.querySelector('[data-room-position] [name=entityId]');
  if(kind && field)kind.addEventListener('change',()=>{const generation=++roomPickerEpoch,picker=pickers.get(field);picker.setValues([],{notify:false});if(kind.value==='entity')picker.setItems(all);else if(kind.value==='event')picker.setItems(snapshot.events.map(event=>({id:event.id,title:(event.text[locale] || event.text.zh || Object.values(event.text)[0]).title,type:interaction.year+' · '+event.date.start,terms:[event.id]})));else{picker.setItems([]);void request('collections').then(data=>{if(generation!==roomPickerEpoch || destroyed)return;picker.setItems((data.collections || []).filter(row=>row.status==='published').map(row=>({id:row.id,title:row.title,type:c.collection,terms:[row.description]})));}).catch(error=>report(errorMessage(error)));}});
 }
 function drawQueryConditions(){
  const confirm=root.querySelector('[data-confirm-query]');if(!confirm)return;
  let target=root.querySelector('[data-query-conditions]');if(!target){target=element('div','','archive-query-conditions');target.dataset.queryConditions='';target.setAttribute('aria-label',interaction.conditions);confirm.before(target);}
  target.replaceChildren();for(const [key,value]of Object.entries(formObject(confirm))){if(!value)continue;const field=confirm.elements.namedItem(key),caption=['artist','creator','entity'].includes(key)?name(value):['type','role'].includes(key)?entityLabel(value,locale):key==='media'?c.media:value;
   const chip=element('span','','archive-picker__chip');chip.append(button((interaction[key] || key)+' · '+caption,()=>{const input=pickers.get(field)?.input || field;input.focus();}));const remove=button('×',()=>{if(field.type==='checkbox')field.checked=false;else field.value='';refreshPickers();drawQueryConditions();});remove.setAttribute('aria-label',interaction.remove+' '+(interaction[key] || key));chip.append(remove);target.append(chip);
  }
 }
 function questionTemplates(){
  const question=root.querySelector('[data-question-form]');if(!question)return;const artist=record('kaf') || snapshot.entities.map(row=>record(row.id)).find(row=>['virtual-avatar','unit'].includes(row.type)),song=snapshot.entities.find(row=>row.type==='work-track' && row.facts.credits?.some(credit=>credit.role==='composer')),years=snapshot.entities.filter(row=>row.type==='work-track' && (row.facts.performers || []).some(performer=>performer.entity===artist?.id)).map(row=>row.date?.slice(0,4)).filter(Boolean).sort();
  const target=element('div','','archive-actions');target.dataset.questionTemplates='';target.setAttribute('aria-label',interaction.templates);
  for(const template of [interaction.songsTemplate,interaction.creditsTemplate,interaction.rangeTemplate]){const text=template.replace('{artist}',artist?.title || '').replace('{work}',song?name(song.id):'').replace('{year}',years.at(-1) || '').replace('{from}',years[0] || '');target.append(button(text,()=>{question.elements.question.value=text;question.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}));}question.after(target);
  root.querySelector('[data-confirm-query]').addEventListener('input',drawQueryConditions);root.querySelector('[data-confirm-query]').addEventListener('change',drawQueryConditions);
 }
 const report=message=>{status.textContent=message;};
 const errorMessage=error=>error.message==='profile_conflict'?c.conflict:['community_unavailable','identity_service_unavailable','catalogue_unavailable'].includes(error.message)?c.unavailable:error.status===401?c.signIn:c.failed;
 const action=async(callback,target)=>{if(target)target.disabled=true;try{return await callback();}catch(error){report(errorMessage(error));return null;}finally{if(target)target.disabled=false;}};
 const query=()=>form?formObject(form):{};
 const setQuery=(values,push=true)=>{
  const url=new URL(location.href);for(const [key,value] of Object.entries(values))value?url.searchParams.set(key,String(value)):url.searchParams.delete(key);
  if(url.href!==location.href)history[push?'pushState':'replaceState'](history.state,'',url);
  updateLocaleQueries(document,location.search);
 };
 const restoreForm=()=>{
  const params=new URL(location.href).searchParams;
  const scrub=root.querySelector('[data-visual-year]');if(scrub){const until=params.get('until');scrub.dataset.active=/^\d{4}$/.test(until || '')?'true':'false';scrub.value=until || scrub.max;root.querySelector('[data-visual-year-label]').textContent=scrub.value;}
  if(!form)return;
  for(const control of form.elements){if(!control.name)continue;const value=params.get(control.name) || (control.name==='type' && ['music','radio'].includes(module)?'work-track':control.name==='sort'?'newest':control.name==='language'?(module==='challenges'?(locale==='ja'?'ja':'en'):'zh'):'');
   if(control.tagName!=='SELECT' || [...control.options].some(o=>o.value===value))control.value=value;
  }
 };
 const reference=(id)=>record(id)?link(name(id),record(id).path):element('span',id+' · '+c.unknown);
 function sources(list,target){
  const ul=element('ul','','archive-source-list');
  for(const source of list || []){const li=element('li');li.append(source.url?link(source.title || source.url,source.url):element('span',source.title || source.reference || c.unknown));
   if(source.publishedAt)li.append(element('small',' · '+source.publishedAt));
   if(source.url)li.append(element('span',' · '),link(c.archiveLink,'https://web.archive.org/web/*/'+source.url));ul.append(li);}
  target.append(ul);
 }
 function listRecords(rows,target=results,actions=true){
  target.replaceChildren();
  if(!rows.length){target.append(element('p',c.empty));return;}
  for(const row of rows){
   const article=element('article','','archive-row'),body=element('div'),title=element('h2');
   title.append(row.path?link(row.title,row.path):element('span',row.title));body.append(element('small',(row.date || c.unknown)+' · '+(row.type || '')),title);
   if(row.summary)body.append(element('p',row.summary));
   if(row.fallback)body.append(element('small',c.fallback+' · '+row.sourceLocale));
   article.append(body);
   if(actions && row.id){const tools=element('div','','archive-row__actions');
    tools.append(button(c.open,()=>showDetail(row.id)));
    if(row.type==='work-track')tools.append(button(c.queue,()=>{if(!row.media?.length){report(c.radioUnavailable);return;}addRadioTracks(storage,[row.id]);report(c.saved);}),button(c.heard,event=>saveRecord({kind:'heard',entityId:row.id},event.currentTarget)));
    if(row.type==='live-event')tools.append(link(c.witness,'/'+locale+'/explore/observatory/?live='+encodeURIComponent(row.id)));
    if(['person','virtual-avatar','unit'].includes(row.type))tools.append(link(c.graph,'/'+locale+'/graph/?entry='+encodeURIComponent(row.id)+'&scope=neighborhood'));
    article.append(tools);}
   target.append(article);
  }
 }
 async function saveRecord(value,target){
  await action(async()=>{const result=await recordObservation(value,storage);if(module==='observatory')await renderObservatory();report(result.synced?c.synced:c.local+(result.error?' · '+errorMessage(result.error):''));},target);
 }
 function closeDetail({updateURL=true,restoreFocus=true}={}){detail.replaceChildren();detail.hidden=true;if(updateURL)setQuery({entry:''});if(restoreFocus)(detailTrigger?.isConnected?detailTrigger:root.querySelector('[data-archive-share]'))?.focus?.({preventScroll:true});}
 function showDetail(id){
  const row=record(id);if(!row){report(c.empty);return;}
  detailTrigger=document.activeElement;detail.replaceChildren();detail.hidden=false;
  detail.append(button(c.close,()=>closeDetail()));
  const heading=element('h2');heading.append(link(row.title,row.path));detail.append(heading,element('p',row.summary || ''));
  const data=element('dl');
  for(const [label,value] of [[c.date,row.date],[c.type,row.type],[c.duration,row.facts.duration],[c.snapshot,snapshot.snapshot]]){data.append(element('dt',label),element('dd',value || c.unknown));}
  detail.append(data);
  if(row.type==='work-track'){
   detail.append(link(c.addChapter,'/'+locale+'/explore/collections/?add='+encodeURIComponent(id)));
   detail.append(element('h3',c.versions),element('p',c.versionNote));
   const connections=musicConnections(snapshot,id,locale),ul=element('ul');for(const version of connections.versions){const li=element('li');li.append(reference(version.source.id),element('span',' → '),reference(version.target.id),element('span',' · '+(c[version.versionType] || c.unknown)));sources(version.sources,li);ul.append(li);}detail.append(ul.childElementCount?ul:element('p',c.empty));
   detail.append(element('h3',c.relatedReleases));const releases=element('ul');for(const release of connections.releases){const li=element('li');li.append(reference(release.id));releases.append(li);}detail.append(releases.childElementCount?releases:element('p',c.empty));
   if(row.facts.genome?.tags?.length){detail.append(element('h3',c.tags));for(const tag of row.facts.genome.tags){const p=element('div',c[tag.dimension]+' · '+tag.value);sources((row.facts.sources || []).filter((source,index)=>tag.sourceIds.includes(source.id || 'source-'+index)),p);detail.append(p);}}
   if(row.media?.length)for(const media of row.media){const frame=element('iframe');frame.src=media.embed.src;frame.title=row.title+' · '+media.embed.label;frame.loading='lazy';frame.allow=media.embed.allow;frame.allowFullscreen=true;if(media.embed.sandbox)frame.setAttribute('sandbox',media.embed.sandbox);detail.append(frame);}
   detail.append(element('h3',c.performances));
   const stats=setlistStatistics(snapshot),song=stats.songs.find(s=>s.id===id);
   detail.append(element('p',c.setlistCoverage+': '+stats.covered+' / '+stats.total));
   if(song){for(const performance of song.occurrences){const p=element('p');p.append(reference(performance.liveId),element('span',' · '+(performance.date || c.unknown)+' · '+performance.position));detail.append(p);}}
   else detail.append(element('p',c.empty));
  }
  if(row.facts.credits?.length){detail.append(element('h3',c.credits));const ul=element('ul');for(const credit of row.facts.credits){const li=element('li',credit.role+' · ');li.append(credit.entity?reference(credit.entity):element('span',credit.name));ul.append(li);}detail.append(ul);}
  if(row.type==='live-event'){
   detail.append(element('h3',c.lives),element('p',[row.facts.venue?.name,row.facts.venue?.city,row.facts.venue?.country].filter(Boolean).join(' · ') || c.unknown));
   const liveInfo=row.facts.liveInfo || {};
   for(const [key,list] of Object.entries(liveInfo)){detail.append(element('h3',c[key] || key));sources(list.map(item=>({title:item.title || item.name,url:item.url})),detail);}
   if(row.facts.setlistStatus)detail.append(element('p',row.facts.setlistStatus==='partial'?c.partialSetlist:c.completeSetlist));
   const ordered=element('ol');for(const track of row.facts.setlist || []){const li=element('li',(track.number || '')+' ');li.append(track.songId?reference(track.songId):element('span',track.title || c.unknown));ordered.append(li);}
   detail.append(ordered.childElementCount?ordered:element('p',c.empty));
   detail.append(link(c.witness,'/'+locale+'/explore/observatory/?live='+id));
   const witnesses=element('section');detail.append(witnesses);void request('witnesses/'+encodeURIComponent(id)).then(data=>{if(!witnesses.isConnected)return;witnesses.append(element('h3',c.witness));for(const witness of data.witnesses){const entry=element('p');entry.append(witness.passportId?link(witness.name,'/'+locale+'/explore/observatory/?passport='+encodeURIComponent(witness.passportId)):element('span',c.public),element('span',' · '+(witness.record.date || c.unknown)+' · '+(witness.record.note || '')));if(witness.record.ticketUrl)entry.append(element('span',' · '),link(c.ticket,witness.record.ticketUrl));witnesses.append(entry);}if(!data.witnesses.length)witnesses.append(element('p',c.empty));}).catch(()=>witnesses.append(element('p',c.unavailable)));
  }
  detail.append(element('h3',c.pageSources));sources(row.facts.sources,detail);
  detail.append(link(c.claims,'/'+locale+'/explore/evidence/?entity='+encodeURIComponent(id)),element('span',' · '),link(c.chronicle,'/'+locale+'/chronicle/?entity='+encodeURIComponent(id)),element('span',' · '),link(c.compare,'/'+locale+'/explore/compare/?left='+encodeURIComponent(id)));
  if(row.sourceFile)detail.append(element('p'),link(c.edit,'/'+locale+'/contribute/editor/?target='+encodeURIComponent(row.sourceFile)));
  setQuery({entry:id});detail.focus({preventScroll:true});detail.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
 }
 function renderStatistics(target=root.querySelector('[data-statistics]'),values=query()){
  const data=archiveStatistics(snapshot,values);target.replaceChildren();
  const grid=element('div','','archive-metrics');
  for(const [label,value] of [[c.songs,data.songs],[c.releases,data.releases],[c.lives,data.lives],[c.credited,data.credited+' / '+data.songs],[c.timed,data.withDuration+' / '+data.songs],[c.duration,data.durationSeconds],[c.setlistCoverage,data.setlists.covered+' / '+data.setlists.total]]){const metric=element('div');metric.append(element('strong',value),element('span',label));grid.append(metric);}target.append(grid,element('h3',c.trends));
  const bars=element('div','','archive-year-bars'),max=Math.max(1,...data.years.map(y=>y.songs+y.releases+y.lives));
  for(const year of data.years){const total=year.songs+year.releases+year.lives,row=link('', '/'+locale+'/explore/statistics/?year='+year.year);row.append(element('span',year.year));const bar=element('i');bar.style.width=String(total/max*100)+'%';row.append(bar,element('span',total));row.title=c.songs+': '+year.songs+' · '+c.releases+': '+year.releases+' · '+c.lives+': '+year.lives;bars.append(row);}target.append(bars,element('h3',c.performances));
  const wrap=element('div','','archive-table-scroll'),table=element('table','','archive-table'),head=element('tr');for(const value of [c.songs,c.eventCount,c.occurrences,c.latest])head.append(element('th',value));table.append(head);
  for(const song of data.setlists.songs.slice(0,100)){const row=element('tr'),title=element('td');title.append(reference(song.id));row.append(title,element('td',song.eventCount),element('td',song.occurrences.length),element('td',song.latest || c.unknown));table.append(row);}wrap.append(table);target.append(wrap);
  const coverage=archiveCoverage(snapshot,values),metrics=element('dl');target.append(element('h3',c.coverage));for(const [key,value]of Object.entries(coverage)){metrics.append(element('dt',c[key] || key),element('dd',value));}target.append(metrics,element('h3',c.partners),element('p',c.partnerNote));
  const pairs=archiveCollaborations(snapshot,values),partners=element('ul'),label=identity=>identity.startsWith('entity:')?name(identity.slice(7)):identity.slice(5);
  for(const pair of pairs.slice(0,20)){const item=element('li');item.append(link(label(pair.left)+' / '+label(pair.right),'/'+locale+'/explore/credits/?creator='+encodeURIComponent(pair.left)+'&collaborator='+encodeURIComponent(pair.right)),element('span',' · '+pair.count));partners.append(item);}target.append(partners.childElementCount?partners:element('p',c.empty));
  return data;
 }
 function renderGenome(){
  const target=root.querySelector('[data-genome]');if(!target)return;
  const dimension=root.querySelector('[data-genome-form] [name=dimension]').value,axes=dimension==='3'?['year','duration','bpm']:['year','duration'];
  const allowed=new Set(selectArchive(snapshot,{...query(),type:'work-track'},locale).map(e=>e.id));const points=genomePoints(snapshot,axes).filter(point=>allowed.has(point.id)),svg=svgNode('svg',{viewBox:'0 0 720 420',class:'archive-chart',role:'group','aria-label':c.genome});
  const min=axes.map((_,i)=>Math.min(...points.map(p=>p.coords[i]))),max=axes.map((_,i)=>Math.max(...points.map(p=>p.coords[i])));
  const fraction=(p,i)=>max[i]===min[i]?0.5:(p.coords[i]-min[i])/(max[i]-min[i] || 1);
  root.querySelectorAll('[data-three-d-control]').forEach(control=>control.hidden=dimension!=='3');
  const azimuth=Number(root.querySelector('[name=azimuth]').value)*Math.PI/180,elevation=Number(root.querySelector('[name=elevation]').value)*Math.PI/180;
  const project=coords=>{const [x,y,z]=coords.map(n=>n*2-1),rx=x*Math.cos(azimuth)+z*Math.sin(azimuth),rz=-x*Math.sin(azimuth)+z*Math.cos(azimuth),ry=y*Math.cos(elevation)-rz*Math.sin(elevation);return [360+rx*140,205-ry*140];};
  if(axes.length===3){svg.append(svgNode('text',{x:450,y:20},c.bpm));for(const start of [[0,0,0],[0,0,1],[0,1,0],[0,1,1],[1,0,0],[1,0,1],[1,1,0],[1,1,1]])for(let axis=0;axis<3;axis++)if(start[axis]===0){const end=[...start];end[axis]=1;const a=project(start),b=project(end);svg.append(svgNode('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'currentColor','stroke-opacity':.15}));}}
  let pointIndex=0;
  svg.append(svgNode('line',{x1:60,y1:370,x2:660,y2:370,stroke:'currentColor'}),svgNode('line',{x1:60,y1:370,x2:60,y2:35,stroke:'currentColor'}),svgNode('text',{x:330,y:407},c.year),svgNode('text',{x:10,y:20},c.duration));
  for(const point of points){const depth=axes.length===3?fraction(point,2):0,projected=axes.length===3?project(point.coords.map((_,i)=>fraction(point,i))):[60+fraction(point,0)*540,370-fraction(point,1)*300],x=projected[0],y=projected[1],circle=svgNode('circle',{cx:x,cy:y,r:axes.length===3?3+depth*4:4,class:'point',tabindex:pointIndex++===0?0:-1,role:'button','aria-label':name(point.id)+' · '+point.coords.join(' / ')});circle.append(svgNode('title',{},name(point.id)+' · '+point.coords.join(' / ')));circle.addEventListener('click',()=>showDetail(point.id));circle.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDetail(point.id);}else if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();const circles=[...svg.querySelectorAll('circle')],current=circles.indexOf(circle),next=(current+(event.key==='ArrowRight'?1:-1)+circles.length)%circles.length;circle.setAttribute('tabindex','-1');circles[next].setAttribute('tabindex','0');circles[next].focus();}});svg.append(circle);}
  if(points.length){svg.append(svgNode('text',{x:60,y:390},String(min[0])),svgNode('text',{x:620,y:390},String(max[0])));}
  target.replaceChildren(element('p',points.length+' / '+snapshot.entities.filter(e=>e.type==='work-track').length+' · '+c.sample),points.length?svg:element('p',c.empty));
 }
 function renderVisual(){
  const values=query(),year=root.querySelector('[data-visual-year]').dataset.active==='true'?root.querySelector('[data-visual-year]').value:'';
  const rows=visualRecords(snapshot,{...values,until:year},locale);
  results.replaceChildren();results.className='archive-visual-grid';
  for(const visual of rows.slice(0,limit)){const article=element('article');if(visual.image){const zoom=button(c.zoomIn+' · '+visual.title,async()=>{const {galleryImageViewer}=await import('../lib/galleryImageViewer.mjs');const images=rows.slice(0,limit).filter(row=>row.image).map(row=>({id:row.id,src:row.image,title:row.title,metadata:[{label:c.date,value:row.date || c.unknown},{label:c.designer,value:row.designer?name(row.designer):row.designerName || c.unknown}],links:[{href:row.path,label:c.open}]}));galleryImageViewer().open(images,images.findIndex(row=>row.id===visual.id),zoom,{locale});});zoom.className='archive-visual-zoom';zoom.setAttribute('aria-label',c.zoomIn+' · '+visual.title);const image=element('img');image.src=visual.image;image.alt=visual.title;image.loading='lazy';zoom.replaceChildren(image);article.append(zoom);}const title=element('h2');title.append(link(visual.title,visual.path));article.append(title,element('p',c.date+': '+(visual.date || c.unknown)),element('p',c.designer+': '+(visual.designer?name(visual.designer):visual.designerName || c.unknown)));
   if(visual.uses?.length){const uses=element('ul');for(const use of visual.uses){const li=element('li');li.append(reference(use.entity),element('span',' · '+(use.date || c.unknown)));uses.append(li);}article.append(uses);}
   article.append(link(c.gallery,'/'+locale+'/gallery/?entity='+visual.entityId),element('span',' · '),link(c.claims,'/'+locale+'/explore/evidence/?entity='+visual.entityId));results.append(article);}
  if(!rows.length)results.append(element('p',c.empty));
  const chronology=root.querySelector('[data-visual-chronology]');if(chronology){chronology.replaceChildren(element('h2',c.timeline));const list=element('ol','','archive-chronology');for(const row of rows.filter(row=>row.date).slice().sort((a,b)=>a.date.localeCompare(b.date))){const li=element('li');li.append(element('time',row.date),link(row.title,row.path));list.append(li);}chronology.append(list.childElementCount?list:element('p',c.empty),element('p',c.undated+' · '+rows.filter(row=>!row.date).length));}
  more.hidden=rows.length<=limit;report(Math.min(limit,rows.length)+' / '+rows.length+' '+c.results);
 }
 function renderAtlas(){
  const values=query(),terms=String(values.q || '').toLowerCase(),allowed=new Set(selectArchive(snapshot,{artist:values.artist,year:values.year},locale).map(row=>row.id)),places=atlasPlaces(snapshot,locale).map(place=>({...place,entities:place.entities.filter(id=>allowed.has(id))})).filter(place=>place.entities.length && (!values.world || place.world===values.world) && (!terms || [place.title,place.city,place.country,...place.entities.map(name)].join(' ').toLowerCase().includes(terms)));
  atlasMapGeneration++;atlasMapHandle?.destroy();atlasMapHandle=null;
  const map=root.querySelector('[data-atlas-map]'),physical=places.filter(p=>p.world==='real'),located=physical.filter(p=>p.coordinates);
  map.replaceChildren(element('h2',values.world==='virtual'?c.topology:c.placeMap),element('p',c.coordinates+': '+located.length+' / '+physical.length));
  const svg=svgNode('svg',{viewBox:'0 0 720 380',class:'archive-chart',role:'group','aria-label':c.placeMap});
  for(let lat=-60;lat<=60;lat+=30)svg.append(svgNode('line',{x1:0,y1:(90-lat)/180*360,x2:720,y2:(90-lat)/180*360,stroke:'currentColor','stroke-opacity':.1}));
  for(let lon=-180;lon<=180;lon+=60)svg.append(svgNode('line',{x1:(lon+180)*2,y1:0,x2:(lon+180)*2,y2:360,stroke:'currentColor','stroke-opacity':.1}));
  located.forEach(place=>{const circle=svgNode('circle',{cx:(place.coordinates.lng+180)*2,cy:(90-place.coordinates.lat)*2,r:6,class:'point',tabindex:0,role:'button','aria-label':place.title});circle.append(svgNode('title',{},place.title));circle.addEventListener('click',()=>showDetail(place.entities[0]));circle.addEventListener('keydown',event=>{if(event.key==='Enter')showDetail(place.entities[0]);});svg.append(circle);});
  if(located.length){map.append(svg);const target=element('div','','archive-map-view');target.hidden=true;target.dataset.archiveMap='';const load=button(c.interactiveMap,event=>action(async()=>{const epoch=atlasMapGeneration;atlasMapEnabled=true;load.disabled=true;target.hidden=false;const {mountArchiveMap}=await import('../lib/archiveLeaflet.mjs');const handle=await mountArchiveMap(target,located,{onOpen:showDetail,copy:c,...(root.dataset.mapTileUrl?{tileURL:root.dataset.mapTileUrl}:{}),...(root.dataset.mapAttribution?{attribution:root.dataset.mapAttribution}:{})});if(epoch!==atlasMapGeneration || destroyed){handle?.destroy();return;}atlasMapHandle=handle;svg.setAttribute('hidden','');load.hidden=true;map.append(element('p',c.routeLineNote));await renderRoute();},event.currentTarget));load.dataset.loadArchiveMap='';map.append(load,target);if(atlasMapEnabled)load.click();}
  if(places.some(p=>p.world==='virtual')){
   map.append(element('p',c.notGeographic));
   const fictional=places.filter(p=>p.world==='virtual'),ids=new Set(fictional.flatMap(p=>p.entities));
   const connections=snapshot.relations.filter(edge=>ids.has(edge.source) && ids.has(edge.target));
   const diagram=svgNode('svg',{viewBox:'0 0 720 440',class:'archive-chart',role:'group','aria-label':c.topology}),nodes=[...ids].slice(0,24),positions=new Map(nodes.map((id,index)=>[id,[360+280*Math.cos(index/nodes.length*Math.PI*2),220+170*Math.sin(index/nodes.length*Math.PI*2)]]));for(const edge of connections){const a=positions.get(edge.source),b=positions.get(edge.target);if(a&&b)diagram.append(svgNode('line',{x1:a[0],y1:a[1],x2:b[0],y2:b[1],stroke:'currentColor','stroke-opacity':.3}));}for(const id of nodes){const [x,y]=positions.get(id),node=svgNode('g',{tabindex:0,role:'button','aria-label':name(id)});node.append(svgNode('circle',{cx:x,cy:y,r:7,class:'point'}),svgNode('text',{x,y:y+20,'text-anchor':'middle'},name(id)));node.addEventListener('click',()=>showDetail(id));node.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();showDetail(id);}});diagram.append(node);}if(nodes.length)map.append(diagram);
   const list=element('ul');for(const edge of connections){const li=element('li');li.append(reference(edge.source),element('span',' — '+edge.type+' → '),reference(edge.target));list.append(li);}map.append(list.childElementCount?list:element('p',c.empty));
  }
  results.replaceChildren();for(const place of places){const article=element('article','','archive-row'),body=element('div');body.append(element('h2',place.title),element('p',[c[place.world] || c.worldUnknown,place.city,place.country].filter(Boolean).join(' · ')));
   const links=element('div','','archive-actions');for(const id of place.entities)links.append(reference(id));body.append(links);article.append(body);
   if(place.world==='real'){const actions=element('div','','archive-row__actions');actions.append(button(c.add+' · '+c.route,event=>action(async()=>{const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch)return;const local=loadObservatory(storage,currentOwner),route=local.data.routes.find(r=>r.id==='pilgrimage') || {id:'pilgrimage',places:[]};route.places=unique([...route.places,place.id]);const data={...local.data,routes:[route,...local.data.routes.filter(r=>r.id!==route.id)]};saveObservatory(storage,currentOwner,data,local.revision,true);await renderRoute();},event.currentTarget)),link(c.navigate,'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([place.title,place.city,place.country].filter(Boolean).join(' '))),link(c.visited,'/'+locale+'/explore/observatory/?live='+place.entities[0]));article.append(actions);}results.append(article);}
  more.hidden=true;report(places.length+' '+c.results);void renderRoute();
 }
 async function renderRoute(){
  const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const local=loadObservatory(storage,currentOwner),route=local.data.routes.find(r=>r.id==='pilgrimage'),allPlaces=atlasPlaces(snapshot,locale),rows=(route?.places || []).map(id=>allPlaces.find(p=>p.id===id)).filter(p=>p?.world==='real'),list=root.querySelector('[data-pilgrimage-route]');
  if(!list)return;list.replaceChildren();atlasMapHandle?.setRoute(rows);
  const save=async places=>{const latestOwner=await owner();if(epoch!==accountEpoch || destroyed || latestOwner!==currentOwner)return;const latest=loadObservatory(storage,currentOwner),data={...latest.data,routes:[{id:'pilgrimage',places},...latest.data.routes.filter(r=>r.id!=='pilgrimage')]};saveObservatory(storage,currentOwner,data,latest.revision,true);await renderRoute();};
  rows.forEach((place,index)=>{const li=element('li',place.title+' ');for(const [label,step]of [[c.up,-1],[c.down,1]]){const move=button(label,()=>{const ids=rows.map(r=>r.id),target=index+step;if(target<0 || target>=ids.length)return;[ids[index],ids[target]]=[ids[target],ids[index]];void save(ids);});move.disabled=index+step<0 || index+step>=rows.length;li.append(move);}li.append(button(c.remove,()=>void save(rows.filter(r=>r.id!==place.id).map(r=>r.id))));list.append(li);});
  const directions=root.querySelector('[data-route-directions]');directions.hidden=!rows.length;if(rows.length){const stops=rows.slice(0,10).map(p=>[p.title,p.city,p.country].filter(Boolean).join(' '));directions.href='https://www.google.com/maps/dir/?api=1&origin='+encodeURIComponent(stops[0])+'&destination='+encodeURIComponent(stops.at(-1))+(stops.length>2?'&waypoints='+encodeURIComponent(stops.slice(1,-1).join('|')):'');}
 }
 function renderComparison(ids){
  const comparison=compareArchive(snapshot,ids,locale);results.replaceChildren();
  if(comparison.rows.length<2){report(c.empty);return;}
  const wrap=element('div','','archive-table-scroll'),table=element('table','','archive-table'),head=element('tr');head.append(element('th',c.field));for(const row of comparison.rows){const th=element('th');th.append(reference(row.id));head.append(th);}table.append(head);
  for(const [label,value]of [[c.type,r=>r.type],[c.date,r=>r.date],[c.songs,r=>(r.facts.tracks || []).length],[c.credits,r=>(r.facts.credits || []).length],[c.performances,r=>snapshot.relations.filter(e=>e.target===r.id && ['headlined-by','guest-performer','performed-track'].includes(e.type)).length],[c.pageSources,r=>(r.facts.sources || []).length]]){const line=element('tr');line.append(element('th',label));for(const row of comparison.rows)line.append(element('td',value(row) ?? c.unknown));table.append(line);}wrap.append(table);results.append(wrap,element('h2',c.common));
  const common=element('div');listRecords(comparison.common,common,false);results.append(common);
  for(const difference of comparison.differences){results.append(element('h3',name(difference.id)+' · '+c.differences));const own=element('div');listRecords(difference.records.slice(0,50),own,false);results.append(own);}
  report(comparison.rows.length+' '+c.results);
 }
 function renderEvidence(id){
  const row=record(id);results.replaceChildren();if(!row){report(c.empty);return;}
  const h=element('h2');h.append(reference(id));results.append(h,element('h3',c.claims));
  const claims=evidenceFor(snapshot,id);
  if(claims.length){
   const sourceNodes=[...new Map(claims.flatMap(claim=>claim.sources).map(source=>[source.id,source])).values()];
   const height=Math.max(180,Math.max(claims.length,sourceNodes.length)*70+40),graph=svgNode('svg',{viewBox:'0 0 720 '+height,class:'archive-chart',role:'group','aria-label':c.claims});
   claims.forEach((claim,index)=>{
    const y=index*70+45;
    for(const sourceId of claim.sourceIds){const target=sourceNodes.findIndex(source=>source.id===sourceId);if(target>=0)graph.append(svgNode('line',{x1:255,y1:y,x2:460,y2:target*70+45,stroke:'currentColor','stroke-opacity':.4}));}
    graph.append(svgNode('rect',{x:10,y:y-22,width:245,height:44,fill:'transparent',stroke:'currentColor'}),svgNode('text',{x:22,y:y+4},claim.field+' · '+(c[claim.status] || c.unreviewed)));
   });
   sourceNodes.forEach((source,index)=>{
    const y=index*70+45,label=svgNode('text',{x:470,y:y+4,tabindex:0,role:'link','aria-label':source.title},source.id);
    label.append(svgNode('title',{},source.title));const open=()=>{if(source.url)window.open(source.url,'_blank','noopener,noreferrer');};label.addEventListener('click',open);label.addEventListener('keydown',event=>{if(event.key==='Enter')open();});
    graph.append(svgNode('rect',{x:460,y:y-22,width:250,height:44,fill:'transparent',stroke:'currentColor'}),label);
   });results.append(graph);
  }
  for(const claim of claims){const article=element('article','','archive-row'),content=element('div');content.append(element('h3',claim.field),element('span',c[claim.status] || c.unreviewed,'archive-badge'),element('p',c.checked+': '+(claim.checkedAt || c.unknown)));if(claim.note)content.append(element('p',claim.note));sources(claim.sources,content);article.append(content);results.append(article);}
  if(!claims.length)results.append(element('p',c.empty));
  results.append(element('h3',c.pageSources));sources(row.facts.sources,results);results.append(element('h3',c.sourceHistory));for(const historical of row.facts.sourceHistory || []){const p=element('p');p.append(link(historical.title,historical.archiveUrl),element('span',' · '+historical.capturedAt));results.append(p);}if(!row.facts.sourceHistory?.length)results.append(element('p',c.empty));results.append(element('h3',c.history));
  if(!row.history.length)results.append(element('p',c.empty));
  else{const ul=element('ul');for(const commit of row.history.slice(0,50)){const li=element('li');li.append(element('span',commit.date.slice(0,10)+' · '+commit.title+' '),link(commit.sha.slice(0,8),'https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/commit/'+commit.sha));ul.append(li);}results.append(ul);}
  const issueRows=snapshot.issues.filter(issue=>issue.id===id);if(issueRows.length){results.append(element('h3',c.issues));for(const issue of issueRows)results.append(element('p',[issue.kind,issue.locale,issue.field,issue.target].filter(Boolean).join(' · ')));}
  report(claims.length+' '+c.claims);
 }
 function renderLanguages(){
  const values=query(),rows=selectArchive(snapshot,{q:values.q,artist:values.artist},locale);
  results.replaceChildren();const wrap=element('div','','archive-table-scroll'),table=element('table','','archive-table'),header=element('tr');
  for(const title of [c.title,'zh','ja','en',c.drift])header.append(element('th',title));table.append(header);
  for(const row of rows.slice(0,limit)){const tr=element('tr'),th=element('th');th.append(reference(row.id));tr.append(th);for(const language of ['zh','ja','en']){const cell=element('td');if(row.narratives[language])cell.append(link(row.narratives[language].title,row.narratives[language].path));else cell.append(element('span',c.fallback),link(c.claim,'/'+locale+'/explore/challenges/?q='+encodeURIComponent(row.id)+'&field=translation&language='+language));tr.append(cell);}const drift=element('td');const issues=snapshot.issues.filter(issue=>issue.id===row.id && issue.kind==='fact-drift');drift.append(link(String(issues.length),'/'+locale+'/explore/evidence/?entity='+row.id));tr.append(drift);table.append(tr);}wrap.append(table);results.append(wrap,element('h3',c.terms));
  const terms=element('dl');for(const row of snapshot.entities.filter(e=>e.type==='lore-concept').slice(0,60)){terms.append(element('dt',row.id),element('dd',['zh','ja','en'].map(code=>row.narratives[code]?.title || c.unknown).join(' / ')));}results.append(terms);
  more.hidden=rows.length<=limit;report(rows.filter(row=>row.narratives[values.language]).length+' / '+rows.length+' · '+c.translationCoverage);
 }
 async function renderObservatory(){
  const token=++renderToken,currentOwner=await owner(),local=loadObservatory(storage,currentOwner),target=root.querySelector('[data-observatory]');
  if(token!==renderToken || !target)return;
  const data=local.data,year=new URL(location.href).searchParams.get('year') || String(new Date().getFullYear());
  target.replaceChildren();target.append(element('h2',c.passport),element('p',currentOwner?c.privacy:c.local));
  const grid=element('div','','archive-metrics');for(const kind of ['read','heard','visited','owned','guarding']){const row=element('div');row.append(element('strong',data.records.filter(r=>r.kind===kind).length),element('span',c[kind]));grid.append(row);}target.append(grid,element('h3',c.stamps));
  target.append(element('p',c.interests+': '+(data.interests || []).map(name).join(' · ')));
  if(data.passport?.published && profile?.publicId)target.append(link(c.share,'/'+locale+'/explore/observatory/?passport='+encodeURIComponent(profile.publicId)));
  const passport=root.querySelector('[data-passport-form]');if(passport){passport.elements.name.value=data.passport?.name || '';passport.elements.note.value=data.passport?.note || '';passport.elements.published.checked=data.passport?.published || false;passport.elements.interests.value=(data.interests || []).join('\n');refreshPickers();}
  const stampList=element('div');for(const row of data.records.filter(r=>r.kind==='visited').slice(0,50)){const stamp=element('p');stamp.append(element('span',row.date || new Date(row.at).toISOString().slice(0,10),'archive-badge'),reference(row.entityId));stampList.append(stamp);}target.append(stampList,element('h3',c.achievements));
  const approved=profile?.contributions?.approved ?? (profile?.tasks || []).filter(t=>t.status==='approved').length;for(const achievement of observatoryAchievements(data,approved)){target.append(element('p',(achievement.earned?c.achieved+' · ':'')+(c[achievement.kind] || c.contributions)+' · '+achievement.count+' / '+achievement.goal));}
  target.append(element('h3',year+' · '+c.personalYear));
  const annual=observatoryYear(data,year);for(const [kind,records]of Object.entries(annual)){target.append(element('p',c[kind]+': '+records.length));}
  const all=element('div');for(const row of data.records.slice(0,limit)){const article=element('article','','archive-row'),body=element('div');body.append(element('small',c[row.kind]+' · '+(row.date || new Date(row.at).toISOString().slice(0,10))+' · '+c[row.visibility]),reference(row.entityId));if(row.note)body.append(element('p',row.note));if(row.ticketUrl)body.append(link(c.ticket,row.ticketUrl));article.append(body,button(c.remove,event=>action(async()=>{const current=loadObservatory(storage,currentOwner);saveObservatory(storage,currentOwner,{...current.data,records:current.data.records.filter(r=>r.id!==row.id)},current.revision,true);await syncAndRender();},event.currentTarget)));all.append(article);}target.append(all);
  more.hidden=data.records.length<=limit;report(local.dirty?c.local:currentOwner && profile?c.synced:c.local);
 }
 async function syncAndRender(){
  const epoch=accountEpoch;let failure;
  try{const synchronized=await synchronizeObservatory(storage);if(epoch!==accountEpoch)return;profile=synchronized;}catch(error){if(epoch!==accountEpoch)return;failure=error;}
  if(module==='observatory')await renderObservatory();
  if(failure)report(errorMessage(failure));
 }
 function fillCollection(collection){
  const editor=root.querySelector('[data-collection-form]');if(!editor)return;
  for(const field of ['id','title','description','kind','revision'])editor.elements.namedItem(field).value=collection[field] || (field==='revision'?'0':'');
  editor.elements.namedItem('items').value=collection.items.map(item=>item.entityId).join('\n');editor.elements.namedItem('notes').value=collection.items.map(item=>collectionNoteLine(item.note)).join('\n');
  if(editor.elements.namedItem('presentation'))editor.elements.namedItem('presentation').value=collectionPresentation(collection.items);collectionTools?.filled();editor.scrollIntoView({block:'start'});
 }
 function collectionCard(collection,target,owned=false){
  const article=element('article','','archive-space');article.append(element('h2',collection.title),element('p',collection.description),element('span',c[collection.status] || collection.status,'archive-badge'));
  appendCollectionItems(collection,article);
  const tools=element('div','','archive-actions');
  if(collectionTools)tools.append(button(c.preview,()=>action(()=>collectionTools.preview(collection))));
  if(owned)tools.append(button(c.edit,()=>fillCollection(collection)),button(c.remove,event=>action(async()=>{await request('collections/'+collection.id,{method:'DELETE'});await loadCollections();},event.currentTarget)));
  else if(collection.status==='published'){const followed=profile?.follows?.includes(collection.id);tools.append(button(followed?c.unfollow:c.follow,event=>action(async()=>{await request('collections/'+collection.id+'/follow',{method:'POST',body:{follow:!followed}});await loadCollections();},event.currentTarget)),button(c.fork,event=>action(async()=>{const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const result=await request('collections/'+collection.id+'/fork',{method:'POST',body:{},expectedOwner:currentOwner});const latestOwner=await owner();if(epoch!==accountEpoch || destroyed || currentOwner!==latestOwner)return;fillCollection(result.collection);await loadCollections();},event.currentTarget)));}
  if(profile?.reviewer && collection.status==='pending' && !owned)for(const [label,decision]of [[c.approve,'approve'],[c.reject,'reject']])tools.append(button(label,event=>action(async()=>{const note=root.querySelector('[data-review-note]')?.value;if(!note?.trim()){report(c.note);return;}await request('collections/'+collection.id+'/review',{method:'POST',body:{action:decision,revision:collection.revision,note}});await loadCollections();},event.currentTarget)));
  tools.append(link(c.share,'/'+locale+'/explore/collections/?collection='+collection.id));article.append(tools);target.append(article);
 }
 function appendCollectionItems(collection,article){
  const cover=collection.items.find(item=>item.cover),image=cover && record(cover.entityId)?.image;if(image){const img=element('img');img.src=image;img.alt=name(cover.entityId);img.loading='lazy';img.className='archive-preview-cover';article.append(img);}
  const items=element('ol');let section;for(const item of collection.items){const li=element('li');if(item.section && item.section!==section)li.append(element('h3',item.section));section=item.section;li.append(reference(item.entityId));if(item.note){const note=element('p',item.note);note.style.whiteSpace='pre-wrap';li.append(note);}items.append(li);}article.append(items);
 }
 async function loadCollections(){
  const token=++renderToken;
  try{
   const publicData=await request('collections');if(token!==renderToken)return;
   const currentOwner=await owner();if(token!==renderToken)return;
   let me=null,pending=[],selected=null;
   try{if(currentOwner)me=await request('me',{expectedOwner:currentOwner});}catch{}
   if(token!==renderToken)return;
   const publicCollections=publicData.collections || [];
   if(me?.reviewer){pending=(await request('reviews',{expectedOwner:currentOwner})).collections;}
   if(token!==renderToken)return;
   const id=new URL(location.href).searchParams.get('collection');
   if(id && !publicCollections.some(row=>row.id===id) && !(me?.collections || []).some(row=>row.id===id))selected=(await request('collections/'+encodeURIComponent(id),{expectedOwner:currentOwner})).collection;
   const latestOwner=await owner();if(token!==renderToken || currentOwner!==latestOwner)return;
   community=publicCollections;profile=me;
   const target=root.querySelector('[data-community-collections]') || results;target.replaceChildren();
   for(const own of profile?.collections || [])collectionCard(own,target,true);
   for(const collection of community.filter(row=>!(profile?.collections || []).some(own=>own.id===row.id)))collectionCard(collection,target);
   if(pending.length){target.append(element('h2',c.review));const note=element('textarea');note.dataset.reviewNote='';note.maxLength=2000;note.placeholder=c.note;target.append(note);for(const collection of pending)collectionCard(collection,target);}
   if(selected)collectionCard(selected,target,false);
   report(community.length+' '+c.results);
  }catch(error){if(token===renderToken)report(errorMessage(error));}
 }
 function taskRows(){
  const values=query(),language=values.language || new URL(location.href).searchParams.get('language') || (locale==='ja'?'ja':'en');
  return selectArchive(snapshot,{q:values.q,artist:values.artist},locale).flatMap(entity=>{
   const rows=entity.completeness.missing.map(item=>({id:entity.id+':'+item.field,entityId:entity.id,field:item.field,locale:'',row:entity}));
   for(const lang of ['zh','ja','en'])if(!entity.narratives[lang])rows.push({id:entity.id+':translation:'+lang,entityId:entity.id,field:'translation',locale:lang,row:entity});
   return rows;
  }).filter(task=>{if(values.field && task.field!==values.field || values.field==='translation' && task.locale!==language)return false;const state=taskStates.find(row=>row.id===task.id),own=profile?.tasks?.some(row=>row.id===task.id);if(values.taskStatus==='mine')return own;if(values.taskStatus==='available')return Boolean(profile && (!state || state.status==='rejected' || state.status==='claimed' && state.expires_at<=Date.now()));return !values.taskStatus || state?.status===values.taskStatus;});
 }
 async function loadTasks(){
  const token=++renderToken;let failure;
  try{const currentOwner=await owner();if(token!==renderToken)return;
   if(currentOwner){const [me,state]=await Promise.all([request('me',{expectedOwner:currentOwner}),request('tasks',{expectedOwner:currentOwner})]);const latestOwner=await owner();if(token!==renderToken || currentOwner!==latestOwner)return;profile=me;taskStates=state.tasks;reviews=state.reviews;}
   else{profile=null;taskStates=[];reviews=[];}
  }catch(error){failure=error;}
  if(token!==renderToken)return;renderTasks();if(failure)report(errorMessage(failure));
 }
 function renderTasks(){
  const rows=taskRows();results.replaceChildren();
  const thisMonth=tokyoDay().slice(0,7),challenge=root.querySelector('[data-monthly-challenge]'),approved=(profile?.tasks || []).filter(t=>t.status==='approved' && new Date(t.updated_at).toISOString().startsWith(thisMonth));
  challenge.replaceChildren(element('h3',thisMonth+' · '+c.month),element('p',c.contributions+': '+(profile?.contributions?.month?.id===thisMonth?profile.contributions.month.approved:approved.length)),element('p',c.points+': '+(profile?.contributions?.approved ?? (profile?.tasks || []).filter(task=>task.status==='approved').length)),element('p',c.pointsNote));
  for(const task of rows.slice(0,limit)){const article=element('article','','archive-row'),body=element('div'),state=taskStates.find(t=>t.id===task.id),own=(profile?.tasks || []).find(t=>t.id===task.id);
   body.append(reference(task.entityId),element('p',(task.field==='translation'?c.translation:task.field)+(task.locale?' · '+task.locale:'')),element('span',state?c[state.status] || c.claimStatus:c.unknown,'archive-badge'));article.append(body);
   const tools=element('div','','archive-row__actions');
   if(!state || state.status==='claimed' && state.expires_at<Date.now() || state.status==='rejected')tools.append(button(c.claim,event=>action(async()=>{await request('tasks/'+encodeURIComponent(task.id)+'/claim',{method:'POST',body:{entityId:task.entityId,field:task.field,locale:task.locale,snapshot:snapshot.snapshot}});await loadTasks();},event.currentTarget)));
   if(own?.status==='claimed'){tools.append(button(c.submit,event=>action(async()=>{const proof=root.querySelector('[data-task-proof]').value;await request('tasks/'+encodeURIComponent(task.id)+'/submit',{method:'POST',body:{proofUrl:proof}});await loadTasks();},event.currentTarget)),button(c.release,event=>action(async()=>{await request('tasks/'+encodeURIComponent(task.id),{method:'DELETE'});await loadTasks();},event.currentTarget)));}
   if(task.row.sourceFile){let target=task.row.sourceFile;if(task.field==='translation')target=target.replace(/\/(zh|ja|en)\.md$/,'/'+task.locale+'.md');tools.append(link(c.edit,'/'+locale+'/contribute/editor/?target='+encodeURIComponent(target)));}
   article.append(tools);results.append(article);}
  if(profile?.reviewer && reviews.length){results.append(element('h2',c.review));const note=element('textarea');note.dataset.reviewNote='';note.placeholder=c.note;note.maxLength=2000;results.append(note);
   for(const task of reviews){const row=element('article','','archive-row');row.append(element('p',task.id),link(c.proof,task.proof_url));for(const [label,decision]of [[c.approve,'approve'],[c.reject,'reject']])row.append(button(label,event=>action(async()=>{await request('tasks/'+encodeURIComponent(task.id)+'/review',{method:'POST',body:{action:decision,note:note.value}});await loadTasks();},event.currentTarget)));results.append(row);}}
  more.hidden=rows.length<=limit;report(Math.min(limit,rows.length)+' / '+rows.length+' '+c.task);
 }
 function renderPhysical(){
  const values=query(),term=String(values.q || '').toLowerCase(),rows=physicalCatalog(snapshot,locale).filter(item=>!term || [item.id,item.title,item.edition,item.catalogNumber,item.barcode].join(' ').toLowerCase().includes(term));
  results.replaceChildren();for(const item of rows.slice(0,limit))physicalCard(item,results);
  if(!rows.length){results.append(element('p',c.empty),element('p',c.releaseOnly));listRecords(selectArchive(snapshot,{type:'work-release',q:values.q},locale).slice(0,12),root.querySelector('[data-barcode-results]'),false);}
  more.hidden=rows.length<=limit;report(rows.length+' '+c.results);
 }
 function physicalCard(item,target){
  const article=element('article','','archive-row'),body=element('div');body.append(element('h2',item.title+' · '+(item.edition || item.format || c.unknown)),element('p',c.catalogNumber+': '+(item.catalogNumber || c.unknown)),element('p',c.barcode+': '+(item.barcode || c.unknown)),element('p',c.bonus+': '+(item.bonusItems?.join(' · ') || c.unknown)));
  if(item.path)body.append(link(c.open,item.path));article.append(body);
  if(item.entityId)article.append(button(c.confirm+' · '+c.owned,event=>saveRecord({kind:'owned',entityId:item.entityId,editionId:item.id,...(item.barcode?{barcode:item.barcode}:{})},event.currentTarget)));
  target.append(article);
 }
 function findBarcode(value){
  const barcode=validBarcode(value),target=root.querySelector('[data-barcode-results]');target.replaceChildren();
  if(!barcode){report(c.barcodeInvalid);return;}
  const rows=physicalCatalog(snapshot,locale).filter(item=>item.barcode===barcode);for(const item of rows)physicalCard(item,target);
  report(rows.length?rows.length+' '+c.results:c.noBarcode);
 }
 async function startCamera(){
  if(!navigator.mediaDevices?.getUserMedia){report(c.cameraUnavailable);return;}
  const video=root.querySelector('[data-barcode-camera]');scanner??=createArchiveScanner({video,onCode:barcode=>{root.querySelector('[data-barcode-form] [name=barcode]').value=barcode;setQuery({barcode});findBarcode(barcode);},onState:value=>{root.querySelector('[data-stop-scan]').hidden=!['starting','active'].includes(value);root.querySelector('[data-start-scan]').disabled=['starting','active'].includes(value);if(value==='unavailable')report(c.cameraUnavailable);else if(['starting','active'].includes(value))report(c.scanning);}});
  await scanner.start();
 }
 function stopCamera(){scanner?.stop();}
 function renderToday(monthDay){
  const events=archiveOnThisDay(snapshot,monthDay,locale);listRecords(events.map(event=>({...event,date:event.date.start,type:'event',fallback:event.locale!==locale,sourceLocale:event.locale})),results,false);more.hidden=true;report(events.length+' '+c.results);
 }
 async function refreshRoom(){
  if(!room || destroyed || document.hidden)return;
  const generation=roomGeneration,epoch=accountEpoch,id=room.id;
  try{const current=await request('rooms/'+id+'/presence',{method:'POST',body:{}});if(generation!==roomGeneration || epoch!==accountEpoch || destroyed || !room || room.id!==current.id || current.revision<room.revision)return;room=current;drawRoom();}
  catch(error){if(generation!==roomGeneration || epoch!==accountEpoch || destroyed)return;clearInterval(roomTimer);if(error.status===404){room=null;roomGeneration++;drawRoom();}report(errorMessage(error));}
 }
 function drawRoom(){
  const panel=root.querySelector('[data-active-room]');panel.hidden=!room;if(!room){const current=panel.querySelector('[data-room-current]');current.replaceChildren();delete current.dataset.position;return;}
  panel.querySelector('[data-room-title]').textContent=room.title;
  panel.querySelector('[data-room-participants]').textContent=c.participants+': '+room.participants.join(' · ');
  panel.querySelector('[data-room-position]').hidden=!room.host;panel.querySelector('[data-end-room]').hidden=!room.host;
 const current=panel.querySelector('[data-room-current]'),signature=JSON.stringify([room.id,room.position,panel.querySelector('[data-follow-host]').checked]);
 if(current.dataset.position===signature){report(c.room+' · '+room.id+' · '+c.revision+' '+room.revision);return;}
 current.dataset.position=signature;current.replaceChildren();
  if(room.position){
   const position=room.position,kind=position.kind || 'entity',row=record(position.entityId);let href,title;
   if(kind==='entity' && row){href=row.path;title=row.title;}
   if(kind==='event'){const event=snapshot.events.find(event=>event.id===position.entityId);if(event){href='/'+locale+'/chronicle/?view=list#'+encodeURIComponent(event.id);title=(event.text[locale] || event.text.zh || Object.values(event.text)[0]).title;}}
   if(kind==='collection'){href='/'+locale+'/explore/collections/?collection='+encodeURIComponent(position.entityId);title=c.collection;}
   if(href){if(position.section && kind==='entity')href+='#'+position.section;current.append(link(title,href));if(panel.querySelector('[data-follow-host]').checked){const frame=element('iframe');frame.src=href;frame.title=title;frame.className='archive-room-frame';frame.loading='lazy';current.append(frame);}}
  }
  report(c.room+' · '+room.id+' · '+c.revision+' '+room.revision);
 }
 async function joinRoom(id){
  const currentOwner=await owner(),generation=++roomGeneration,epoch=accountEpoch;
  if(destroyed)return;
  const joined=await request('rooms/'+encodeURIComponent(id)+'/join',{method:'POST',body:{},expectedOwner:currentOwner});
  const latestOwner=await owner();if(generation!==roomGeneration || epoch!==accountEpoch || destroyed || currentOwner!==latestOwner)return;
  room=joined;setQuery({room:room.id});clearInterval(roomTimer);roomTimer=setInterval(()=>void refreshRoom(),15000);drawRoom();
 }
 async function render(){
  if(!snapshot)return;
  limit=Math.max(24,limit);
  if(module==='atlas'){renderAtlas();return;}
  if(['visual','museum'].includes(module)){renderVisual();return;}
  if(module==='languages'){renderLanguages();return;}
  if(module==='challenges'){renderTasks();return;}
  if(module==='physical'){renderPhysical();return;}
  if(module==='observatory'){if(new URL(location.href).searchParams.has('passport'))return;await renderObservatory();return;}
  if(module==='statistics'){renderStatistics();results.replaceChildren();report(c.sample);more.hidden=true;return;}
  if(module==='ask' && lastRows.length){listRecords(lastRows.slice(0,limit));more.hidden=lastRows.length<=limit;report(c.answer+': '+lastRows.length);return;}
  if(['ask','compare','evidence','today','collections','rooms','open-data'].includes(module))return;
  const values=query();lastRows=selectArchive(snapshot,{...values,...(module==='radio'?{type:'work-track',media:'yes'}:module==='live-mode'?{type:'live-event'}:{})},locale);
  listRecords(lastRows.slice(0,limit));more.hidden=lastRows.length<=limit;report(Math.min(limit,lastRows.length)+' / '+lastRows.length+' '+c.results);
 }
 function restoreQuestion(params){if(module!=='ask')return;const question=params.get('question');lastRows=[];results.replaceChildren();root.querySelector('[data-question-form] [name=question]').value=question || '';if(question)root.querySelector('[data-question-form]').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));else{root.querySelector('[data-query-plan]').hidden=true;report(c.queryNote);}if(params.get('confirmed')==='yes'){const confirm=root.querySelector('[data-confirm-query]');root.querySelector('[data-query-plan]').hidden=false;for(const control of confirm.elements){if(!control.name)continue;if(control.type==='checkbox')control.checked=params.get(control.name)==='yes';else control.value=params.get(control.name) || '';}confirm.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}}
 function restoreComparison(params){if(module!=='compare')return;const editor=root.querySelector('[data-compare-form]');for(const key of ['left','right'])editor.elements[key].value=params.get(key) || '';if(params.get('leftYear') && params.get('rightYear')){const years=root.querySelector('[data-year-compare-form]');for(const key of ['leftYear','rightYear'])years.elements[key].value=params.get(key);years.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}else if(params.get('left') && params.get('right'))renderComparison([params.get('left'),params.get('right')]);else{results.replaceChildren();report(c.compareNote);}}
 function listen(selector,event,handler){const node=root.querySelector(selector);if(node)node.addEventListener(event,handler);}
 root.querySelectorAll('[data-export-route]').forEach(control=>control.addEventListener('click',()=>action(async()=>{const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch)return;const local=loadObservatory(storage,currentOwner),places=atlasPlaces(snapshot,locale),ids=local.data.routes.find(route=>route.id==='pilgrimage')?.places || [],selected=ids.map(id=>places.find(place=>place.id===id)).filter(Boolean),latestOwner=await owner();if(epoch!==accountEpoch || currentOwner!==latestOwner)return;if(control.dataset.exportRoute==='gpx')downloadArchiveFile(pilgrimageGPX(selected,snapshot.snapshot),'pilgrimage.gpx','application/gpx+xml');else downloadArchiveFile(JSON.stringify(pilgrimageGeoJSON(selected,snapshot.snapshot),null,2),'pilgrimage.geojson','application/geo+json');},control)));
 root.querySelectorAll('[data-export-research]').forEach(control=>control.addEventListener('click',()=>action(async()=>{
  const values={...query(),...(root.querySelector('[data-visual-year]')?.dataset.active==='true'?{until:root.querySelector('[data-visual-year]').value}:{})},records=['visual','museum'].includes(module)?visualRecords(snapshot,values,locale).map(row=>({id:row.id,entityId:row.entityId,title:row.title,date:row.date,image:row.image,path:row.path})):selectArchive(snapshot,{...values,...(module==='live-mode'?{type:'live-event'}:{})},locale).map(row=>({id:row.id,type:row.type,title:row.title,date:row.date,path:row.path,credits:row.facts.credits?.length || 0}));
  const citation=archiveCitation(snapshot,records.map(row=>row.entityId || row.id)),data={version:1,snapshot:snapshot.snapshot,filters:values,records,citation,...(module==='statistics'?{statistics:archiveStatistics(snapshot,values),coverage:archiveCoverage(snapshot,values),collaborations:archiveCollaborations(snapshot,values)}:{})};
  const file='archive-'+module+'-'+snapshot.snapshot.slice(0,12);if(control.dataset.exportResearch==='json')downloadArchiveFile(JSON.stringify(data,null,2),file+'.json');else if(control.dataset.exportResearch==='csv')downloadArchiveFile(archiveCSV(module==='statistics'?data.statistics.years:records),file+'.csv','text/csv;charset=utf-8');else downloadArchiveFile(await archiveZip({'report.json':data,'records.csv':archiveCSV(records),'citation.json':citation}),file+'.zip','application/zip');
 },control)));
 listen('[data-setlist-compare]','submit',event=>{event.preventDefault();const ids=event.currentTarget.elements.lives.value.split(/\s+/).filter(Boolean);if(ids.length>4 || ids.some(id=>record(id)?.type!=='live-event')){report(c.empty);return;}const compared=compareLiveSetlists(snapshot,ids,locale),target=root.querySelector('[data-setlist-comparison]');target.replaceChildren();const wrap=element('div','','archive-table-scroll'),table=element('table','','archive-table'),head=element('tr');head.append(element('th',c.songs));for(const live of compared.lives){const th=element('th');th.append(reference(live.id),element('small',' · '+(c[live.facts.setlistStatus] || c.unknown)));head.append(th);}table.append(head);for(const song of compared.rows){const tr=element('tr'),label=element('th');label.append(reference(song.id));tr.append(label,...song.counts.map(count=>element('td',count)));table.append(tr);}const footer=element('tr');footer.append(element('th',c.unlinked),...compared.unlinked.map(count=>element('td',count)));table.append(footer);wrap.append(table);target.append(wrap,element('p',c.matrixNote));setQuery({lives:ids.join(',')});});
 listen('[data-archive-share]','click',event=>action(async()=>{await navigator.clipboard.writeText(location.href);report(c.shared);},event.currentTarget));
 if(form){
  form.addEventListener('submit',event=>{event.preventDefault();limit=24;setQuery(query());void render();});
  form.addEventListener('change',()=>{limit=24;setQuery(query());void render();});
  let searchTimer;form.addEventListener('input',event=>{if(event.target.name!=='q'||event.isComposing)return;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{limit=24;setQuery(query(),false);void render();},180);});
  form.addEventListener('compositionend',()=>{clearTimeout(searchTimer);limit=24;setQuery(query(),false);void render();});
  form.addEventListener('reset',()=>setTimeout(()=>{limit=24;setQuery({...query(),until:''});restoreForm();void render();},0));
 }
 listen('[data-archive-more]','click',()=>{limit+=24;void render();});
 listen('[data-question-form]','submit',event=>{
  event.preventDefault();const plan=parseArchiveQuestion(event.currentTarget.elements.question.value,snapshot),confirm=root.querySelector('[data-confirm-query]');
  for(const control of confirm.elements){if(!control.name)continue;if(control.type==='checkbox')control.checked=plan.query[control.name]==='yes';else control.value=plan.query[control.name] || '';}
  root.querySelector('[data-query-plan]').hidden=false;root.querySelector('[data-query-unresolved]').textContent=plan.unrecognizedText?interaction.remaining+': '+plan.unrecognizedText:plan.unresolved.length?c.unresolved+': '+plan.unresolved.map(key=>interaction[key] || key).join(' · '):c.parsed;
  let choices=root.querySelector('[data-query-candidates]');if(!choices){choices=element('div','','archive-actions');choices.dataset.queryCandidates='';root.querySelector('[data-query-unresolved]').after(choices);}choices.replaceChildren();
  for(const [key,ids]of Object.entries(plan.candidates || {})){choices.append(element('p',interaction.ambiguous+' · '+(interaction[key] || key)));for(const id of ids){const choice=button(name(id),()=>{confirm.elements.namedItem(key).value=id;for(const candidate of choices.querySelectorAll('[data-candidate-key]'))if(candidate.dataset.candidateKey===key)candidate.setAttribute('aria-pressed',String(candidate===choice));refreshPickers();drawQueryConditions();const pending=Object.keys(plan.candidates).filter(field=>!confirm.elements.namedItem(field).value);root.querySelector('[data-query-unresolved]').textContent=plan.unrecognizedText?interaction.remaining+': '+plan.unrecognizedText:pending.length?interaction.ambiguous:c.parsed;});choice.dataset.candidateKey=key;choice.setAttribute('aria-pressed','false');choices.append(choice);}}
  refreshPickers();drawQueryConditions();
  results.replaceChildren();report(c.parsed);
 });
 listen('[data-confirm-query]','submit',event=>{event.preventDefault();if(event.defaultPrevented && event.currentTarget.querySelector('[data-picker-search]:invalid'))return;const values={media:'',...formObject(event.currentTarget)};limit=24;lastRows=selectArchive(snapshot,values,locale);listRecords(lastRows.slice(0,limit));more.hidden=lastRows.length<=limit;report(c.answer+': '+lastRows.length);drawQueryConditions();if(values.entity && record(values.entity))showDetail(values.entity);setQuery({...values,confirmed:'yes',question:root.querySelector('[data-question-form] [name=question]').value});});
 listen('[data-compare-form]','submit',event=>{event.preventDefault();const values=formObject(event.currentTarget);renderComparison([values.left,values.right]);setQuery({...values,leftYear:'',rightYear:''});});
 listen('[data-year-compare-form]','submit',event=>{event.preventDefault();const values=formObject(event.currentTarget);results.replaceChildren();for(const year of [values.leftYear,values.rightYear]){const section=element('section','','archive-space');section.append(element('h2',year));const content=element('div');section.append(content);results.append(section);renderStatistics(content,{year});}setQuery({...values,left:'',right:''});report(c.compareYears);});
 listen('[data-evidence-form]','submit',event=>{event.preventDefault();const id=event.currentTarget.elements.entity.value;renderEvidence(id);setQuery({entity:id});});
 listen('[data-genome-form]','submit',event=>{event.preventDefault();renderGenome();});listen('[data-genome-form]','input',()=>renderGenome());
 listen('[data-visual-year]','input',event=>{event.target.dataset.active='true';root.querySelector('[data-visual-year-label]').textContent=event.target.value;setQuery({until:event.target.value},false);renderVisual();});
 listen('[data-create-station]','click',()=>{const ids=selectArchive(snapshot,{...query(),type:'work-track',media:'yes'},locale).slice(0,200).map(row=>row.id);if(!ids.length){report(c.empty);return;}addRadioTracks(storage,ids,{replace:true});report(c.saved);});
 listen('[data-witness-form]','submit',event=>{event.preventDefault();const values=formObject(event.currentTarget),row=record(values.entityId);if(row?.type!=='live-event'){report(c.empty);return;}void saveRecord({kind:'visited',entityId:row.id,date:values.date,note:values.note,ticketUrl:values.ticketUrl,visibility:values.visibility},event.submitter);});
 listen('[data-passport-form]','submit',event=>{event.preventDefault();const epoch=accountEpoch,values=formObject(event.currentTarget),published=event.currentTarget.elements.published.checked;void action(async()=>{const currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const local=loadObservatory(storage,currentOwner),interests=values.interests.split(/\r?\n/).map(id=>id.trim()).filter(Boolean);if(interests.some(id=>!record(id)))throw Error('invalid_entity');saveObservatory(storage,currentOwner,{...local.data,interests,passport:{name:values.name,note:values.note,published}},local.revision,true);await syncAndRender();},event.submitter);});
 listen('[data-reload-observatory]','click',event=>action(async()=>{const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch)return;if(!currentOwner){report(c.signIn);return;}const remote=await request('me',{expectedOwner:currentOwner});const latestOwner=await owner();if(epoch!==accountEpoch || currentOwner!==latestOwner)return;saveObservatory(storage,currentOwner,remote.data,remote.revision,false);profile=remote;await renderObservatory();},event.currentTarget));
 listen('[data-export-observatory]','click',event=>action(async()=>{const epoch=accountEpoch,currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const data=loadObservatory(storage,currentOwner).data,url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),anchor=link('','');anchor.href=url;anchor.download='kamitsubaki-observatory.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);},event.currentTarget));
 listen('[data-import-observatory]','change',event=>action(async()=>{const epoch=accountEpoch,file=event.currentTarget.files[0];if(!file || file.size>500000)throw Error('invalid_file');const currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const incoming=validateObservatory(JSON.parse(await file.text())),latestOwner=await owner();if(epoch!==accountEpoch || destroyed || currentOwner!==latestOwner)throw Error('account_changed');const current=loadObservatory(storage,currentOwner);saveObservatory(storage,currentOwner,mergeObservatory(current.data,incoming),current.revision,true);await syncAndRender();},event.currentTarget));
 listen('[data-collection-form]','submit',event=>{event.preventDefault();void action(async()=>{const epoch=accountEpoch,values=formObject(event.currentTarget),items=collectionEditorItems(values);if(!items.length || items.length>100 || new Set(items.map(item=>item.entityId)).size!==items.length || items.some(item=>!record(item.entityId)))throw Error('invalid_collection');const payload={title:values.title,description:values.description,kind:values.kind,revision:Number(values.revision),action:event.submitter?.value || 'draft',items},currentOwner=await owner();if(epoch!==accountEpoch || destroyed)return;const result=await request('collections'+(values.id?'/'+encodeURIComponent(values.id):''),{method:values.id?'PUT':'POST',body:payload,expectedOwner:currentOwner});const latestOwner=await owner();if(epoch!==accountEpoch || destroyed || currentOwner!==latestOwner)return;fillCollection(result.collection);await loadCollections();},event.submitter);});
 listen('[data-create-room]','submit',event=>{event.preventDefault();void action(async()=>{const epoch=accountEpoch,generation=roomGeneration,title=event.currentTarget.elements.title.value,currentOwner=await owner();if(epoch!==accountEpoch || generation!==roomGeneration || destroyed)return;const response=await request('rooms',{method:'POST',body:{title},expectedOwner:currentOwner});const latestOwner=await owner();if(epoch!==accountEpoch || generation!==roomGeneration || destroyed || currentOwner!==latestOwner)return;await joinRoom(response.id);},event.submitter);});
 listen('[data-join-room]','submit',event=>{event.preventDefault();void action(()=>joinRoom(event.currentTarget.elements.id.value),event.submitter);});
 listen('[data-room-position]','submit',event=>{event.preventDefault();if(!room)return;const values=formObject(event.currentTarget),active=room,generation=roomGeneration;void action(async()=>{const saved=await request('rooms/'+active.id+'/position',{method:'PUT',body:{entityId:values.entityId,kind:values.kind,section:values.section,revision:active.revision}});if(generation!==roomGeneration || !room || room.id!==active.id || saved.revision<room.revision)return;room={...room,...saved};drawRoom();},event.submitter);});
 const leaveRoom=async(end=false)=>{if(!room)return;const id=room.id,generation=roomGeneration;await request('rooms/'+id+(end?'':'/leave'),{method:'DELETE'});if(generation!==roomGeneration)return;roomGeneration++;room=null;clearInterval(roomTimer);setQuery({room:''});drawRoom();};
 listen('[data-leave-room]','click',event=>action(()=>leaveRoom(),event.currentTarget));
 listen('[data-end-room]','click',event=>action(()=>leaveRoom(true),event.currentTarget));
 listen('[data-follow-host]','change',()=>drawRoom());
 listen('[data-barcode-form]','submit',event=>{event.preventDefault();findBarcode(event.currentTarget.elements.barcode.value);setQuery({barcode:event.currentTarget.elements.barcode.value});});
 listen('[data-start-scan]','click',()=>void startCamera());listen('[data-stop-scan]','click',stopCamera);
 listen('[data-today-form]','submit',event=>{event.preventDefault();renderToday(event.currentTarget.elements.monthDay.value);setQuery({day:event.currentTarget.elements.monthDay.value});});
 listen('[data-mystery-form]','submit',event=>{event.preventDefault();const mystery=mysteryEntity(snapshot,tokyoDay()),answer=event.currentTarget.elements.guess.value.trim().toLowerCase(),entity=record(mystery?.id);root.querySelector('[data-mystery-answer]').textContent=entity && [entity.id,...Object.values(entity.narratives).map(n=>n.title)].some(value=>value.toLowerCase()===answer)?c.correct:c.incorrect;});
 listen('[data-mystery-reveal]','click',()=>{const mystery=mysteryEntity(snapshot,tokyoDay()),target=root.querySelector('[data-mystery-answer]');if(mystery)target.replaceChildren(reference(mystery.id));});
 window.addEventListener('pageshow',event=>{if(event.persisted){destroyed=false;if(module==='atlas')renderAtlas();if(room){clearInterval(roomTimer);roomTimer=setInterval(()=>void refreshRoom(),15000);void refreshRoom();}}});
 window.addEventListener('pagehide',()=>{destroyed=true;roomGeneration++;stopCamera();atlasMapGeneration++;atlasMapHandle?.destroy();atlasMapHandle=null;clearInterval(roomTimer);closeDetail({updateURL:false,restoreFocus:false});});
 root.addEventListener('keydown',event=>{if(event.key==='Escape' && !detail.hidden && !document.querySelector('.pswp--open')){event.preventDefault();closeDetail();}});
 let displayedOwner;
 window.addEventListener('kamitsubaki-account-state',event=>{
  const next=event.detail?.viewer?.userId || null;if(next===displayedOwner)return;displayedOwner=next;
  profile=null;renderToken++;accountEpoch++;roomGeneration++;if(!snapshot)return;
  if(collectionTools)void collectionTools.changeOwner().catch(error=>report(errorMessage(error)));
  if(module==='atlas'){root.querySelector('[data-pilgrimage-route]').replaceChildren();root.querySelector('[data-route-directions]').hidden=true;atlasMapHandle?.setRoute([]);void renderRoute();}
  if(module==='observatory' && !new URL(location.href).searchParams.has('passport')){root.querySelector('[data-observatory]').replaceChildren();root.querySelector('[data-passport-form]')?.reset();root.querySelector('[data-witness-form]')?.reset();void syncAndRender();}
  if(module==='collections'){root.querySelector('[data-community-collections]').replaceChildren();const editor=root.querySelector('[data-collection-form]');editor.reset();editor.elements.id.value='';editor.elements.revision.value='0';if(editor.elements.presentation)editor.elements.presentation.value='';void loadCollections();}
  if(module==='challenges'){reviews=[];taskStates=[];results.replaceChildren();void loadTasks();}
  if(module==='rooms'){room=null;clearInterval(roomTimer);root.querySelector('[data-room-current]').replaceChildren();root.querySelector('[data-active-room]').hidden=true;}
  roomPickerEpoch++;refreshPickers();
 });
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopCamera();else if(room)void refreshRoom();});
 function restoreSetlists(params){const editor=root.querySelector('[data-setlist-compare]');if(!editor)return;const lives=params.get('lives');editor.elements.lives.value=lives?lives.split(',').join('\n'):'';root.querySelector('[data-setlist-comparison]').replaceChildren();if(lives)editor.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));}
 window.addEventListener('popstate',()=>{limit=24;restoreForm();void render();const params=new URL(location.href).searchParams;restoreComparison(params);restoreQuestion(params);restoreSetlists(params);if(module==='evidence')renderEvidence(params.get('entity'));if(module==='today')renderToday(params.get('day') || tokyoDay().slice(5));if(params.get('entry'))showDetail(params.get('entry'));else closeDetail({updateURL:false,restoreFocus:false});refreshPickers();});
 try{
  snapshot=await loadSnapshot(root.dataset.snapshotUrl);pendingControls.forEach(control=>control.disabled=false);root.removeAttribute('aria-busy');restoreForm();await render();
  initializePickers();questionTemplates();
  const params=new URL(location.href).searchParams;
  if(module==='collections')collectionTools=await initializeCollectionTools(root,{snapshot,locale,owner,storage,onOpen:showDetail,onError:error=>report(errorMessage(error))});
  if(module==='open-data')await initializeArchiveOpenData(root.querySelector('[data-open-data]'),{snapshot,copy:c,locale,load:loadSnapshot});
  if(module==='music')renderGenome();
  if(module==='museum'){const target=root.querySelector('[data-published-exhibitions]');try{const published=await request('collections');target.replaceChildren();for(const exhibition of published.collections.filter(row=>row.kind==='exhibition')){const article=element('article','','archive-space');article.append(element('h2',exhibition.title),element('p',exhibition.description));appendCollectionItems(exhibition,article);article.append(link(c.share,'/'+locale+'/explore/collections/?collection='+exhibition.id));target.append(article);}if(!target.childElementCount)target.append(element('p',c.empty));}catch{target.replaceChildren(element('p',c.unavailable));}}
  restoreComparison(params);
  restoreSetlists(params);
  if(module==='evidence'){const id=params.get('entity') || snapshot.evidence[0]?.entityId || snapshot.entities[0]?.id;root.querySelector('[data-evidence-form] [name=entity]').value=id;renderEvidence(id);}
  restoreQuestion(params);
  if(module==='observatory'){const live=params.get('live');if(live)root.querySelector('[data-witness-form] [name=entityId]').value=live;const publicId=params.get('passport');if(publicId){const publicPassport=await request('passports/'+encodeURIComponent(publicId));const target=root.querySelector('[data-observatory]');target.replaceChildren(element('h2',publicPassport.passport.name),element('p',publicPassport.passport.note));for(const row of publicPassport.records){const paragraph=element('p',c[row.kind]+' · '+(row.date || new Date(row.at).toISOString().slice(0,10))+' · ');paragraph.append(reference(row.entityId));if(row.note)paragraph.append(element('span',' · '+row.note));target.append(paragraph);}for(const selector of ['[data-passport-form]','[data-witness-form]','[data-reload-observatory]','[data-export-observatory]','[data-import-observatory]'])root.querySelector(selector).hidden=true;root.querySelector('[data-import-observatory]').closest('label').hidden=true;more.hidden=true;report(c.public);}else void syncAndRender();}
  if(module==='collections'){const kind=params.get('kind');if(kind==='exhibition')root.querySelector('[data-collection-form] [name=kind]').value=kind;await loadCollections();}
  if(module==='challenges')await loadTasks();
  if(module==='rooms'){const id=params.get('room');if(id)await action(()=>joinRoom(id));else report(c.roomNote);}
  if(module==='physical' && params.get('barcode')){root.querySelector('[data-barcode-form] [name=barcode]').value=params.get('barcode');findBarcode(params.get('barcode'));}
  if(module==='today'){const day=params.get('day') || tokyoDay().slice(5);root.querySelector('[data-today-form] [name=monthDay]').value=day;renderToday(day);const mystery=mysteryEntity(snapshot,tokyoDay());if(mystery)root.querySelector('[data-mystery-clues]').append(element('p',c.year+': '+mystery.year),element('p',c.artist+': '+mystery.performers.map(name).join(' · ')),element('p',c.role+': '+mystery.credits.join(' · ')));}
  if(params.get('entry'))showDetail(params.get('entry'));
  if(module==='collections' && params.get('add') && record(params.get('add')))fillCollection({title:'',description:'',kind:'collection',revision:0,items:[{entityId:params.get('add'),note:''}]});
  refreshPickers();drawQueryConditions();
  if(!status.textContent || status.textContent===c.loading)report(c.coverage);
 }catch(error){report(errorMessage(error));status.append(button(c.apply,()=>location.reload()));}
 return {render,showDetail,getSnapshot:()=>snapshot};
}
const root=typeof document==='undefined'?null:document.querySelector('[data-archive-workspace]');if(root)void initializeArchiveWorkspace(root);
