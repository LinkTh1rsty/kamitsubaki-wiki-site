import {setLoadingStatus} from './loadingStatus.mjs';
import {applyGalleryPreview} from './galleryPreviewImage.mjs';
import {setIconLabel} from './icons.mjs';
import {galleryDisplayText,galleryPhotoPresentation} from './galleryPresentation.mjs';
import {createGalleryAlbumPreview} from './galleryAlbumPreview.mjs';
import {createDisclosureMotion} from './disclosureMotion.mjs';
import {galleryImageViewer as imageViewer} from './galleryImageViewer.mjs';
import {readableGalleryPhotoName} from './galleryPhotoName.mjs';
import {sortGalleryRoles,createGalleryRoleControls} from './galleryRoles.mjs';
import {galleryCharacterName,galleryCharacterAliases,galleryRoleRows} from './galleryRoleCatalog.mjs';
import galleryEntities from '../data/gallery-entities.json';

interface GalleryCharacter {id:string;name:string;url:string|null;image?:string|null;labels?:Record<string,string>}
interface GalleryFacet {character:string;form:string;count:number;coverUrl?:string}
interface GalleryImage {width?:number;height?:number;id:string;src:string;thumbnail?:string;title?:string;name?:string;notes?:string;author?:string;rightsBasis?:string;sourceTitle?:string;sourceUrl?:string;form?:string;date?:string;setId?:string|null;setTitle?:string;character?:string;setSourceTitle?:string;setSourceUrl?:string;mediaType?:string|null;entityIds?:string[];tags?:string[];archiveProvenance?:string;attributionStatus?:string}
interface GallerySet {id:string;character:string;title?:string;form?:string;date?:string;notes?:string;publisher?:string;sourceTitle?:string;sourceUrl?:string;coverUrl?:string;imageCount?:number;coverImageId?:string;images?:GalleryImage[]}

export async function initGallery(){
 const root=document.querySelector<HTMLElement>('[data-gallery]');if(!root)return;
 const $=<T extends Element=HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const copy:Record<string,string>=JSON.parse(root.dataset.copy||'{}'),api=(root.dataset.api||'').replace(/\/$/,''),locale=root.dataset.locale||'zh';
 const text=(tag:string,value:string,className?:string)=>{const node=document.createElement(tag);setIconLabel(node,value);if(className)node.className=className;return node;};
 const request=async(path:string,signal?:AbortSignal)=>{const response=await fetch(api+'/api/gallery'+path,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000),cache:'no-store'});if(!response.ok)throw Error(copy.error);return response.json();};
 const previewOptions={api,imageOrigin:root.dataset.imageOrigin||'https://images.kamitsubaki.wiki',local:JSON.parse(document.querySelector('[data-gallery-image-assets]')?.textContent||'{}')};
 const preview=(image:HTMLImageElement,item:{src:string;thumbnail?:string;width?:number;height?:number})=>applyGalleryPreview(image,item,previewOptions);
 const viewer=imageViewer();let characters:GalleryCharacter[]=galleryEntities,facets:GalleryFacet[]=[],archiveFacets:{entityCounts?:{id:string;count:number;coverUrl?:string}[];typeCounts?:{id:string;count:number}[];tag?:string[];unclassified?:number}={},mediaTypes:{id:string;labels:Record<string,string>}[]=[],sets:GallerySet[]=[],photos:GalleryImage[]=[],suggestedPhotos:GalleryImage[]=[],nextOffset:number|null=null,total=0,controller:AbortController|undefined,routeId=0,photoRequestId=0,searchTimer:number|undefined,overviewScroll=0,selecting=false;
 const roleControls=createGalleryRoleControls($('#gallery-role-filters'),{locale});
 const selected=new Set<string>();
 let catalogVersion=0,archiveReady=false,setFacetsReady=false,initialization=0;
 const albumDisposals:Array<()=>void>=[];
 const clearAlbums=()=>{for(const dispose of albumDisposals.splice(0))dispose();};
 const setRequests=new Map<string,Promise<{set:GallerySet}>>();
 const getSet=(id:string)=>{let pending=setRequests.get(id);if(!pending){pending=request('/sets/'+encodeURIComponent(id)).catch(error=>{setRequests.delete(id);throw error;});if(setRequests.size>=32)setRequests.delete(setRequests.keys().next().value!);setRequests.set(id,pending);}return pending;};
 const setNames=new Map<string,string>();
 const params=()=>new URLSearchParams(location.search);
 const mode=()=>params().get('view')==='sets'?'sets':'photos';
 const characterName=(id:string)=>galleryCharacterName(id,characters,locale);
 const formName=(value:string)=>value||copy.unclassified;
 const displayNames=()=>characters.flatMap(role=>galleryCharacterAliases(role.id,characters,locale).filter(alias=>alias!==role.id).map(alias=>[alias,characterName(role.id)]));
 const displayText=(value:string)=>galleryDisplayText(value,displayNames(),locale);
 const setTitle=(set:GallerySet)=>{const person=characterName(set.character),form=displayText(set.form||'');if(person===set.character&&set.title)return displayText(set.title);return form?`${person}｜${form}`:displayText(set.title||'')||person;};
 const setUrl=(changes:Record<string,string|null>,replace=false)=>{const url=new URL(location.href);for(const [key,value]of Object.entries(changes)){if(value)url.searchParams.set(key,value);else url.searchParams.delete(key);}if(Object.hasOwn(changes,'set')||Object.hasOwn(changes,'photo'))url.hash='';(replace?history.replaceState:history.pushState).call(history,null,'',url);};
 const feedback=(message:string)=>{const target=$('[data-gallery-feedback]');if(message===copy.loading||message===copy.moreLoading)setLoadingStatus(target,message);else target.textContent=message;};
 const restoreFocus=(selector:string)=>root?.querySelector<HTMLButtonElement>(selector)?.focus({preventScroll:true});
 const newButton=(label:string,click:()=>void,className?:string)=>{const button=text('button',label,className) as HTMLButtonElement;button.type='button';button.onclick=click;return button;};
 const activeSet=()=>params().get('filterSet')||'';
 const hasGridFilters=()=>['character','entity','form','q','year','publisher','tag','type','unclassified','filterSet'].some(key=>params().has(key));
 const updateFilterLabel=()=>{const p=params(),parts=[copy.filters],entity=p.get('entity')||p.get('character');if(entity)parts.push(characterName(entity));if(p.get('type'))parts.push(typeName(p.get('type')!));if(p.get('unclassified'))parts.push(copy.unclassifiedType);if(p.get('form'))parts.push(formName(p.get('form')!));if(p.get('q'))parts.push(p.get('q')!);$('[data-gallery-filter-label]').textContent=copy.filters;$('[data-gallery-filter-toggle]').setAttribute('aria-label',parts.join(' · '));const chips=$('[data-gallery-active-filters]');chips.replaceChildren();const active:[string,string][]=[['entity',entity?characterName(entity):''],['filterSet',p.get('filterSet')?setNames.get(p.get('filterSet')!)||p.get('filterSet')!:''],['form',p.get('form')?formName(p.get('form')!):''],['type',p.get('type')?typeName(p.get('type')!):''],['unclassified',p.has('unclassified')?copy.unclassifiedType:''],['q',p.get('q')||''],['year',p.get('year')||''],['publisher',p.get('publisher')||''],['tag',p.get('tag')||'']];for(const [key,label]of active){if(!label)continue;const changes:Record<string,string|null>={[key]:null,page:null};if(key==='filterSet')changes.form=null;if(key==='entity'){changes.character=null;changes.form=null;}const button=newButton(`${label} ×`,()=>{setUrl(changes);void route();},'gallery-active-filter');button.setAttribute('aria-label',`${copy.clear} · ${label}`);chips.append(button);}chips.toggleAttribute('hidden',!chips.childElementCount);};
 const typeName=(id:string)=>mediaTypes.find(type=>type.id===id)?.labels?.[locale]||({setting:copy.typeSetting,portrait:copy.typePortrait,cover:copy.typeCover,promo:copy.typePromo,event:copy.typeEvent} as Record<string,string>)[id]||id;
 const readablePhotoName=readableGalleryPhotoName;
 const photoSubject=(photo:GalleryImage)=>photo.entityIds?.map(characterName).join(' / ')||characterName(photo.character||'');
 const presentation=(photo:GalleryImage)=>galleryPhotoPresentation({...photo,title:readablePhotoName(photo)||photo.setTitle||''},{subject:photoSubject(photo),type:photo.mediaType?typeName(photo.mediaType):copy.unclassifiedType,locale,names:displayNames()});
 const photoTitle=(photo:GalleryImage)=>presentation(photo).fullTitle||copy.unknownPhoto;
 function renderRoles(){
  const target=$('[data-gallery-roles]'),active=params().get('entity')||params().get('character')||'';
  const view=mode(),unit=view==='sets'?copy.sets:copy.images;
  const ready=view==='sets'?setFacetsReady:archiveReady,version=`${view}:${catalogVersion}:${ready}`;
  if(target.dataset.rendered!==view||target.dataset.catalogVersion!==version){
   const focused=(document.activeElement as HTMLElement)?.dataset.role;
   target.replaceChildren();target.dataset.rendered=view;target.dataset.catalogVersion=version;
   const choose=(id:string|null)=>{
    const view=mode();
    setUrl({entity:view==='photos'?id:null,character:view==='sets'?id:null,form:null,page:null,set:null,photo:null,filterSet:null});
    void route().then(()=>{
     if((params().get('entity')||params().get('character')||'')!==(id||''))return;
     const heading=$<HTMLElement>('[data-gallery-section-title]');heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});
    });
   };
   const all=newButton('',()=>choose(null),'gallery-role-card gallery-role-card--all');all.dataset.role='';all.append(text('strong',copy.allRoles),text('small',view==='sets'?copy.viewSets:copy.photos));target.append(all);
   const available=ready?galleryRoleRows(view,archiveFacets.entityCounts||[],facets):characters.map(role=>({id:role.id,count:0,coverUrl:role.image||undefined}));
   for(const [index,row] of sortGalleryRoles(available,characterName,locale).entries()){
    const role=characters.find(value=>value.id===row.id),name=characterName(row.id);
    const button=newButton('',()=>choose(row.id),'gallery-role-card');button.dataset.role=row.id;
    button.dataset.search=galleryCharacterAliases(row.id,characters,locale).join(' ').toLocaleLowerCase(locale);
    button.dataset.name=name;button.dataset.count=String(row.count);button.dataset.siteOrder=String(index);
    button.setAttribute('aria-label',ready?`${name} · ${row.count} ${unit}`:name);
    const image=role?.image||galleryEntities.find(value=>value.id===row.id)?.image||row.coverUrl;
    if(image){const img=document.createElement('img');preview(img,{src:image});img.alt='';img.loading='lazy';img.decoding='async';img.addEventListener('error',()=>img.replaceWith(text('span',name.slice(0,1),'gallery-role-initial')),{once:true});button.append(img);}
    else button.append(text('span',name.slice(0,1),'gallery-role-initial'));
    const inner=document.createElement('div');inner.append(text('strong',name),text('small',ready?`${row.count} ${unit}`:'…'));button.append(inner);target.append(button);
   }
   if(focused!==undefined)[...target.querySelectorAll<HTMLButtonElement>('[data-role]')].find(button=>button.dataset.role===focused)?.focus({preventScroll:true});
  }
  roleControls.render(active);
 }
 function renderForms(){const selectedRole=params().get('character')||'',selected=params().get('form')||'',target=$('[data-gallery-forms]');target.replaceChildren();target.hidden=mode()==='photos'||!selectedRole;if(target.hidden)return;const options=facets.filter(row=>row.character===selectedRole);const add=(value:string,label:string,count:number)=>{const button=newButton(label,()=>{setUrl({form:value||null,page:null,set:null,photo:null,filterSet:null});void route().then(()=>restoreFocus('[data-gallery-forms] button[aria-current="true"]'));});button.setAttribute('aria-current',String(selected===value));button.append(text('small',String(count)));target.append(button);};add('',copy.allForms,options.reduce((sum,row)=>sum+Number(row.count),0));for(const row of options)add(row.form||'__unclassified__',formName(row.form),Number(row.count));}
 function renderTypes(){
  const target=$('[data-gallery-types]');target.hidden=mode()!=='photos';if(target.hidden)return;
  if(!target.hasAttribute('data-rendered')){
   const focused=document.activeElement instanceof HTMLButtonElement&&target.contains(document.activeElement)?{type:document.activeElement.dataset.type,unknown:document.activeElement.dataset.unknown}:null;
   target.replaceChildren();
   target.setAttribute('data-rendered','');
   const add=(label:string,type:string|null,unknown=false,count?:number)=>{
    const button=newButton(label,()=>{setUrl({type,unclassified:unknown?'1':null,page:null,photo:null});void route();});
    button.dataset.type=type||'';button.dataset.unknown=String(unknown);
    if(count!==undefined){button.append(text('small',String(count)));button.title=`${copy.globalCount||copy.allTypes}: ${count}`;}target.append(button);
   };
   add(copy.allTypes,null);add(copy.unclassifiedType,null,true,archiveFacets.unclassified||0);
   for(const type of mediaTypes)add(typeName(type.id),type.id,false,archiveFacets.typeCounts?.find(row=>row.id===type.id)?.count||0);
   target.append(text('small',copy.globalCount||copy.allTypes,'gallery-count-scope'));
   if(focused)[...target.querySelectorAll<HTMLButtonElement>('button')].find(button=>button.dataset.type===focused.type&&button.dataset.unknown===focused.unknown)?.focus({preventScroll:true});
  }
  const active=params().get('type')||'',uncategorized=params().has('unclassified');
  for(const button of target.querySelectorAll<HTMLButtonElement>('button'))button.setAttribute('aria-pressed',String(button.dataset.unknown==='true'?uncategorized:!uncategorized&&button.dataset.type===active));
 }
 function renderSets(appendFrom=0){
  const target=$('[data-gallery-grid]');target.dataset.view=sets.length?'sets':'sets-empty';
  if(!appendFrom){clearAlbums();target.replaceChildren();}
  for(const set of sets.slice(appendFrom)){
   const card=newButton('',()=>{overviewScroll=window.scrollY;setUrl({set:set.id,photo:null});void route().then(()=>restoreFocus('[data-gallery-back]'));},'gallery-set-card');card.dataset.setId=set.id;
   const album=text('article','','gallery-album'),image=text('span','','gallery-set-image');
   const img=document.createElement('img');if(set.coverUrl){preview(img,{src:set.coverUrl});img.alt='';img.loading='lazy';img.decoding='async';image.append(img);}
   if((set.imageCount||1)>1)album.dataset.multiple='true';
   image.append(text('small',`${set.imageCount||1} ${copy.images}`,'gallery-set-count'));card.append(image,text('span',characterName(set.character),'gallery-set-kicker'));
   const title=text('strong',displayText(set.form||'')||setTitle(set));title.append(text('span',' →','gallery-set-arrow'));card.append(title);card.setAttribute('aria-label',setTitle(set));album.append(card);
   if((set.imageCount||1)>1){const controls=text('div','','gallery-album-controls');album.append(controls);albumDisposals.push(createGalleryAlbumPreview({previewImage:(image:HTMLImageElement,item:GalleryImage)=>preview(image,item),card:album,frame:image,image:img,controls,count:set.imageCount,locale,load:async()=>{const data=await getSet(set.id);return data.set.images||[];}}));}
   target.append(album);
  }
  if(!sets.length){
   const empty=text('div','','gallery-empty-state');empty.append(text('small','CURATED COLLECTIONS'),text('h3',facets.length?copy.noMatch:copy.noSets),text('p',facets.length?copy.noMatch:copy.noSetsHint));
   const actions=text('div','','gallery-empty-actions');actions.append(newButton(copy.browsePhotos,()=>{setUrl({view:null,character:null,form:null,page:null});void route();}));
   const create=text('a',copy.createSet) as HTMLAnchorElement;create.href=`/${locale}/gallery/manage/`;actions.append(create);empty.append(actions);target.append(empty);
   if(!facets.length&&suggestedPhotos.length){const section=text('section','','gallery-suggestions');section.append(text('h3',copy.suggestedPhotos));const grid=text('div','','gallery-suggestion-grid');for(const photo of suggestedPhotos)grid.append(photoCard(photo));section.append(grid);target.append(section);}
  }
  const role=params().get('character');$('[data-gallery-section-title]').textContent=role?`${characterName(role)} · ${copy.roleSets}`:copy.latest;
  $('[data-gallery-count]').textContent=`${sets.length} / ${total} ${copy.sets}`;$<HTMLButtonElement>('[data-gallery-more]').hidden=nextOffset===null;feedback('');
 }
 async function loadSets(){
  controller?.abort();
  const current=controller=new AbortController(),stamp=++routeId,p=params(),targetPage=Math.min(50,Math.max(0,Number(p.get('page'))||0));
  root!.dataset.loadState='loading';$('[data-gallery-grid]').setAttribute('aria-busy','true');
  feedback(copy.loading);$<HTMLButtonElement>('[data-gallery-retry]').hidden=true;
  const query=new URLSearchParams({summary:'1'});
  for(const key of ['character','form','q','year','publisher','tag']){const value=p.get(key);if(value)query.set(key,value);}
  try{
   let offset=0,nextSets:GallerySet[]=[],nextTotal=0,nextPage:number|null=null;
   for(let page=0;page<=targetPage;page++){
    query.set('offset',String(offset));const result=await request('/sets?'+query,current.signal);
    if(current.signal.aborted||stamp!==routeId)return;
    nextSets.push(...result.sets);nextTotal=Number(result.total)||0;nextPage=result.nextOffset;
    if(nextPage===null)break;offset=nextPage;
   }
   sets=nextSets;total=nextTotal;nextOffset=nextPage;
   if(!sets.length&&!facets.length){try{const result=await request('/items?offset=0',current.signal);suggestedPhotos=(result.items||[]).slice(0,6);}catch{suggestedPhotos=[];}}
   if(current.signal.aborted||stamp!==routeId)return;
   renderSets();
   root!.dataset.loadState='ready';$('[data-gallery-grid]').removeAttribute('aria-busy');
  }catch{
   if(current.signal.aborted||stamp!==routeId)return;
   root!.dataset.loadState='error';$('[data-gallery-grid]').removeAttribute('aria-busy');
   feedback(copy.error);$<HTMLButtonElement>('[data-gallery-retry]').hidden=false;
  }
 }
 function classifyHref(ids:string[]){const url=new URL(`/${locale}/gallery/classify/`,location.origin),back=new URL(location.href);back.searchParams.delete('photo');url.searchParams.set('ids',ids.join(','));url.searchParams.set('returnTo',back.pathname+back.search);return url.pathname+url.search;}
 function updateSelection(){const button=$<HTMLButtonElement>('[data-gallery-select]'),action=$<HTMLAnchorElement>('[data-gallery-classify]');button.textContent=selecting?copy.cancelChoose:copy.choose;button.setAttribute('aria-pressed',String(selecting));action.hidden=!selecting||!selected.size;if(selected.size){action.href=classifyHref([...selected]);action.textContent=`${copy.classify} (${selected.size})`;}}
 function photoCard(photo:GalleryImage){
  const card=newButton('',()=>{if(selecting&&mode()==='photos'){selected.has(photo.id)?selected.delete(photo.id):selected.add(photo.id);card.setAttribute('aria-pressed',String(selected.has(photo.id)));updateSelection();return;}overviewScroll=window.scrollY;setUrl({photo:photo.id,set:null});void showPhoto(photo.id,card);},'gallery-photo-card');
  card.dataset.photoId=photo.id;card.setAttribute('aria-pressed',String(selected.has(photo.id)));const image=document.createElement('img');preview(image,photo);image.alt='';image.loading='lazy';image.decoding='async';
  const caption=text('span','','gallery-photo-caption'),info=presentation(photo),meta=text('span','','gallery-photo-meta');
  meta.append(text('span',info.subject),text('span',info.type));caption.append(meta,text('strong',info.title||copy.unknownPhoto));
  if(photo.author&&!/未署名|未明确|unknown/i.test(photo.author))caption.append(text('small',photo.author,'gallery-photo-author'));
  const frame=text('span','','gallery-photo-frame');frame.append(image);card.setAttribute('aria-label',info.fullTitle||copy.unknownPhoto);card.append(frame,caption);return card;
 }
 function renderPhotos(appendFrom=0){
  const target=$('[data-gallery-grid]');target.dataset.view='photos';if(!appendFrom){clearAlbums();target.replaceChildren();}for(const photo of photos.slice(appendFrom))target.append(photoCard(photo));
  const selectedSet=activeSet(),chip=$('[data-gallery-set-filter]');chip.toggleAttribute('hidden',!selectedSet);$('[data-gallery-set-filter-name]').textContent=selectedSet?(setNames.get(selectedSet)||selectedSet):'';
  const p=params(),heading=[selectedSet?(setNames.get(selectedSet)||copy.latestPhotos):p.get('entity')?`${characterName(p.get('entity')!)} · ${copy.photos}`:copy.latestPhotos];if(p.get('type'))heading.push(typeName(p.get('type')!));if(p.has('unclassified'))heading.push(copy.unclassifiedType);if(p.get('q'))heading.push(p.get('q')!);$('[data-gallery-section-title]').textContent=heading.join(' · ');
  $('[data-gallery-count]').textContent=`${copy.loaded} ${photos.length} / ${total} ${copy.images}`;$<HTMLButtonElement>('[data-gallery-more]').hidden=nextOffset===null;updateSelection();feedback(photos.length?'':(total||hasGridFilters()?copy.noMatch:copy.empty));
 }
 async function loadPhotos(){
  controller?.abort();
  const current=controller=new AbortController(),stamp=++routeId,p=params(),targetPage=Math.min(50,Math.max(0,Number(p.get('page'))||0));
  root!.dataset.loadState='loading';$('[data-gallery-grid]').setAttribute('aria-busy','true');
  feedback(copy.loading);$<HTMLButtonElement>('[data-gallery-retry]').hidden=true;
  const query=new URLSearchParams();
  for(const key of ['character','entity','form','q','year','publisher','tag','type','unclassified']){const value=p.get(key);if(value)query.set(key,value);}
  const setId=activeSet();if(setId)query.set('set',setId);
  try{
   if(setId&&!setNames.has(setId)){
    const result=await request('/sets/'+encodeURIComponent(setId),current.signal);
    if(current.signal.aborted||stamp!==routeId)return;
    if(result.set)setNames.set(setId,setTitle(result.set));
   }
   let offset=0,nextPhotos:GalleryImage[]=[],nextTotal=0,nextPage:number|null=null;
   for(let page=0;page<=targetPage;page++){
    query.set('offset',String(offset));const result=await request('/items?'+query,current.signal);
    if(current.signal.aborted||stamp!==routeId)return;
    nextPhotos.push(...result.items);nextTotal=Number(result.total)||0;nextPage=result.nextOffset;
    if(nextPage===null)break;offset=nextPage;
   }
   photos=nextPhotos;total=nextTotal;nextOffset=nextPage;renderPhotos();
   root!.dataset.loadState='ready';$('[data-gallery-grid]').removeAttribute('aria-busy');
  }catch{
   if(current.signal.aborted||stamp!==routeId)return;
   root!.dataset.loadState='error';$('[data-gallery-grid]').removeAttribute('aria-busy');
   feedback(copy.error);$<HTMLButtonElement>('[data-gallery-retry]').hidden=false;
  }
 }
 const loadGrid=()=>mode()==='photos'?loadPhotos():loadSets();
 async function loadMore(){
  if(nextOffset===null||root!.dataset.loadState!=='ready')return false;
  controller?.abort();const current=controller=new AbortController(),stamp=++routeId,offset=nextOffset,p=params(),view=mode();
  const button=$<HTMLButtonElement>('[data-gallery-more]');button.disabled=true;button.dataset.loading='true';setLoadingStatus(button,copy.moreLoading||copy.loading);
  root!.dataset.loadState='loading-more';$('[data-gallery-grid]').setAttribute('aria-busy','true');feedback(copy.moreLoading);
  const query=new URLSearchParams({offset:String(offset)});
  for(const key of view==='photos'?['character','entity','form','q','year','publisher','tag','type','unclassified']:['character','form','q','year','publisher','tag']){const value=p.get(key);if(value)query.set(key,value);}
  if(view==='photos'&&activeSet())query.set('set',activeSet());
  if(view==='sets')query.set('summary','1');
  try{
   const result=await request(view==='photos'?'/items?'+query:'/sets?'+query,current.signal);
   if(current.signal.aborted||stamp!==routeId)return false;
   if(view==='photos'){
    const before=photos.length,known=new Set(photos.map(photo=>photo.id));
    for(const photo of result.items||[])if(!known.has(photo.id)){known.add(photo.id);photos.push(photo);}
    total=Number(result.total)||0;nextOffset=result.nextOffset;renderPhotos(before);
   }else{
    const before=sets.length,known=new Set(sets.map(set=>set.id));
    for(const set of result.sets||[])if(!known.has(set.id)){known.add(set.id);sets.push(set);}
    total=Number(result.total)||0;nextOffset=result.nextOffset;renderSets(before);
   }
   setUrl({page:String((Number(p.get('page'))||0)+1)},true);
   feedback(`${copy.loaded} ${view==='photos'?photos.length:sets.length} / ${total} ${view==='photos'?copy.images:copy.sets}`);
   root!.dataset.loadState='ready';
   return true;
  }catch{if(current.signal.aborted||stamp!==routeId)return false;root!.dataset.loadState='ready';feedback(copy.error);return false;}
  finally{if(stamp===routeId){button.disabled=false;button.dataset.loading='false';button.textContent=copy.more;$('[data-gallery-grid]').removeAttribute('aria-busy');}}
 }
 const property=(list:Element,label:string,value:string,href?:string)=>{if(!value)return;const row=document.createElement('div');row.append(text('dt',label));const dd=text('dd',href?'':value);if(href){const link=text('a',value) as HTMLAnchorElement;link.href=href;link.target='_blank';link.rel='noopener noreferrer';dd.append(link);}row.append(dd);list.append(row);};
 const photoMetadata=(image:GalleryImage,set?:GallerySet)=>[
  {label:copy.imageType,value:image.mediaType?typeName(image.mediaType):copy.unclassifiedType},
  {label:copy.subject,value:photoSubject(image)||set&&characterName(set.character)},
  {label:copy.setName,value:set?setTitle(set):displayText(image.setTitle||'')},
  {label:copy.author,value:image.author||''},
  {label:copy.source,value:image.sourceTitle||image.setSourceTitle||set?.sourceTitle||''},
  {label:copy.date,value:image.date||set?.date||''},
  {label:copy.notes,value:image.notes||set?.notes||''},
  {label:copy.attribution,value:image.archiveProvenance?.startsWith('existing-')&&image.attributionStatus==='incomplete'?copy.existingSiteNote:''}
 ].filter(row=>Boolean(row.value));
 const viewerItems=(set:GallerySet)=>set.images?.map(image=>({id:image.id,src:image.src,width:image.width,height:image.height,downloadUrl:`${api}/api/gallery/items/${encodeURIComponent(image.id)}/download`,downloadLabel:copy.download,title:photoTitle({...image,character:set.character,setId:set.id,setTitle:setTitle(set)}),metadata:photoMetadata(image,set),links:[{href:classifyHref([image.id]),label:copy.classifyPhoto},{href:`/${locale}/gallery/?view=sets&set=${encodeURIComponent(set.id)}`,label:`${copy.viewSets} · ${setTitle(set)}`},...(image.sourceUrl||set.sourceUrl?[{href:image.sourceUrl||set.sourceUrl||'',label:image.sourceTitle||set.sourceTitle||copy.source}]:[]),{href:image.src,label:copy.original}]}))||[];
 function openImage(set:GallerySet,index:number,trigger:Element){const items=viewerItems(set);viewer.open(items,index,trigger,{onChange:(item:{id:string})=>{const url=new URL(location.href);url.hash=item.id;history.replaceState(null,'',url);},onClose:()=>{const url=new URL(location.href);url.hash='';history.replaceState(null,'',url);}});}
 async function showPhoto(id:string,trigger?:Element){
  // Opening an existing photo does not replace the grid request. Its own token
  // prevents a late photo response from reopening a previous route.
  const stamp=++photoRequestId;
  try{
   const available=mode()==='sets'?suggestedPhotos:photos;
   const inPhotoGrid=mode()==='photos'&&available.some(item=>item.id===id);
   const photo=available.find(item=>item.id===id)||(await request('/items/'+encodeURIComponent(id))).item as GalleryImage;
   const photoItems=(list:GalleryImage[])=>list.map(item=>({
    id:item.id,src:item.src,width:item.width,height:item.height,downloadUrl:`${api}/api/gallery/items/${encodeURIComponent(item.id)}/download`,downloadLabel:copy.download,title:photoTitle(item),metadata:photoMetadata(item),
    links:[{href:classifyHref([item.id]),label:copy.classifyPhoto},
     ...(item.sourceUrl&&item.archiveProvenance!=='existing-file'?[{href:item.sourceUrl,label:item.archiveProvenance==='existing-site'?copy.siteEntry:item.sourceTitle||copy.source}]:[]),
     ...(item.setId?[{href:`/${locale}/gallery/?view=sets&set=${encodeURIComponent(item.setId)}`,label:displayText(item.setTitle||'')||copy.viewSets}]:[]),
     {href:item.src,label:copy.original}]
   }));
   let items=available.length>1&&available.some(item=>item.id===id)?photoItems(available):photoItems([photo]);
   if(items.length===1&&photo.setId&&!inPhotoGrid){const data=await request('/sets/'+encodeURIComponent(photo.setId));items=viewerItems(data.set);}
   if(stamp!==photoRequestId||params().get('photo')!==id)return;
   const index=Math.max(0,items.findIndex(item=>item.id===id));
   viewer.open(items,index,trigger||$('[data-gallery-grid]'),{photoFirst:true,
    totalCount:inPhotoGrid?total:items.length,
    onNeedMore:inPhotoGrid&&nextOffset!==null?async()=>{const before=photos.length;if(!await loadMore())throw Error('Could not load more photos');return {items:photoItems(photos.slice(before)),hasMore:nextOffset!==null,totalCount:total};}:undefined,
    onChange:(image:{id:string})=>{const url=new URL(location.href);url.searchParams.set('photo',image.id);history.replaceState(null,'',url);},
    onClose:()=>{if(params().has('photo'))setUrl({photo:null},true);window.scrollTo({top:overviewScroll,behavior:'instant'});root?.querySelector<HTMLElement>('[data-photo-id="'+CSS.escape(id)+'"]')?.focus({preventScroll:true});}
   });
  }catch{if(stamp!==photoRequestId)return;feedback(copy.error);setUrl({photo:null},true);}
 }
 async function showDetail(id:string,initialImage?:string){
  const stamp=++routeId;controller?.abort();$('[data-gallery-grid]').removeAttribute('aria-busy');feedback(copy.loading);
  try{
   clearAlbums();const data=await getSet(id);if(stamp!==routeId)return;
   const set:GallerySet=data.set,images=set.images||[];setNames.set(id,setTitle(set));
   const detail=$('[data-gallery-detail]');
   $<HTMLButtonElement>('[data-gallery-photos-in-set]').onclick=()=>{setUrl({set:null,view:null,filterSet:id,character:set.character||null,form:set.form||null,page:null,photo:null});void route().then(()=>{const heading=$('[data-gallery-section-title]');window.scrollTo({top:Math.max(0,heading.getBoundingClientRect().top+window.scrollY-132),behavior:'instant'});});};
   const role=characters.find(value=>value.id===set.character);
   $('[data-gallery-detail-path]').textContent=`${characterName(set.character)} / ${formName(set.form||'')}`;
   $('[data-gallery-detail-title]').textContent=setTitle(set);
   $('[data-gallery-detail-meta]').textContent=`${images.length} ${copy.images}`;
   $<HTMLAnchorElement>('[data-gallery-edit]').href=`/${locale}/gallery/manage/?set=${encodeURIComponent(set.id)}`;
   const related=$<HTMLAnchorElement>('[data-gallery-related]');related.hidden=!role?.url;
   if(role?.url)related.href=role.url.replace(/^\/(zh|ja|en)\//,`/${locale}/`);
   else related.removeAttribute('href');
   const properties=$('[data-gallery-properties]');properties.replaceChildren();
   property(properties,copy.date,set.date||'');property(properties,copy.publisher,set.publisher||'');
   property(properties,copy.notes,set.notes||'');property(properties,copy.source,set.sourceTitle||set.sourceUrl||'',set.sourceUrl);
   const grid=$('[data-gallery-images]');grid.replaceChildren();
   for(const [index,image]of images.entries()){
    const button=newButton('',()=>openImage(set,index,button));const img=document.createElement('img');
    preview(img,image);img.alt=image.title||setTitle(set);img.loading='lazy';
    const label=photoTitle({...image,character:set.character,setId:set.id,setTitle:setTitle(set)});img.alt=label;button.append(img,text('span',label||`${String(index+1).padStart(2,'0')} / ${images.length}`));grid.append(button);
   }
   root!.classList.add('gallery-detail-open');$('[data-gallery-overview]').setAttribute('hidden','');
   detail.removeAttribute('hidden');window.scrollTo({top:0,behavior:'instant'});feedback('');
   if(initialImage){const index=images.findIndex(image=>image.id===initialImage);if(index>=0)openImage(set,index,grid.children[index]);}
  }catch{
   if(stamp!==routeId)return;
   feedback(copy.error);$<HTMLButtonElement>('[data-gallery-retry]').hidden=false;
  }
 }
 async function route(){
  photoRequestId++;
  window.clearTimeout(searchTimer);searchTimer=undefined;
  const p=params(),set=p.get('set');if(!set)root!.classList.remove('gallery-detail-open');
  const more=$<HTMLButtonElement>('[data-gallery-more]');more.disabled=false;more.dataset.loading='false';more.textContent=copy.more;
  if(viewer.isOpen&&!p.get('photo'))viewer.close();
  $<HTMLInputElement>('[data-gallery-search] input').value=p.get('q')||'';
  if(set){root!.dataset.loadState='ready';await showDetail(set,location.hash.slice(1));return;}
  $('[data-gallery-overview]').removeAttribute('hidden');$('[data-gallery-detail]').setAttribute('hidden','');
  $<HTMLSelectElement>('[data-gallery-tag]').value=p.get('tag')||'';
  $('[data-gallery-select]').toggleAttribute('hidden',mode()!=='photos');
  $('[data-gallery-classify]').toggleAttribute('hidden',mode()!=='photos'||!selected.size);
  for(const view of ['photos','sets'])$<HTMLButtonElement>(`[data-gallery-view="${view}"]`).setAttribute('aria-pressed',String(mode()===view));
  renderRoles();renderForms();renderTypes();updateFilterLabel();
  const loading=loadGrid(),stamp=routeId;
  await loading;
  if(stamp!==routeId||root!.dataset.loadState!=='ready')return;
  const photo=params().get('photo');
  if(photo)await showPhoto(photo);
  else if(location.hash){
   const imageId=decodeURIComponent(location.hash.slice(1));
   try{const data=await request('/items/'+encodeURIComponent(imageId));if(data.item?.setId){setUrl({set:data.item.setId},true);await showDetail(data.item.setId,imageId);}else{setUrl({photo:imageId},true);await showPhoto(imageId);}}
   catch{feedback(copy.error);}
  }
 }
 async function initialize(){
  const generation=++initialization;
  renderRoles();
  // The first gallery page is independent of catalog/count/filter requests.
  const firstPage=route();
  const current=()=>generation===initialization;
  const refresh=()=>{catalogVersion++;renderRoles();renderForms();$('[data-gallery-types]').removeAttribute('data-rendered');renderTypes();updateFilterLabel();
   for(const card of root!.querySelectorAll<HTMLElement>('.gallery-photo-card')){const photo=photos.find(photo=>photo.id===card.dataset.photoId);if(!photo)continue;const info=presentation(photo);card.setAttribute('aria-label',info.fullTitle||copy.unknownPhoto);card.querySelector('.gallery-photo-caption strong')!.textContent=info.title||copy.unknownPhoto;const meta=card.querySelector('.gallery-photo-meta')!;meta.firstElementChild!.textContent=info.subject;meta.lastElementChild!.textContent=info.type;}
  };
  const jobs=[
   request('/entities').catch(()=>request('/characters')).then(data=>{if(!current())return;characters=data.entities||data.characters||galleryEntities;refresh();}),
   request('/sets/facets').then(data=>{if(!current())return;facets=data.facets||[];setFacetsReady=true;refresh();}),
   request('/facets').then(data=>{if(!current())return;archiveFacets=data.facets||{};archiveReady=true;const tags=$<HTMLSelectElement>('[data-gallery-tag]'),selectedTag=params().get('tag')||'';tags.replaceChildren(new Option(copy.tags,''));for(const tag of archiveFacets.tag||[])tags.add(new Option(tag,tag));tags.value=selectedTag;refresh();}),
   request('/types').then(data=>{if(!current())return;mediaTypes=data.types||[];refresh();})
  ];
  const results=await Promise.allSettled(jobs);
  if(current()&&results.some(result=>result.status==='rejected')){$<HTMLButtonElement>('[data-gallery-retry]').hidden=false;root!.dataset.catalogState='partial';}
  else if(current())root!.dataset.catalogState='ready';
  await firstPage;
 }

 const backToRecord=params().get('returnTo');const safeReturn=backToRecord?.startsWith(`/${locale}/account/creator/`)&&!backToRecord.startsWith('//')?backToRecord:null;if(safeReturn)setIconLabel($('[data-gallery-back]'),`← ${copy.backToRecord}`);
 for(const view of ['photos','sets'])$<HTMLButtonElement>(`[data-gallery-view="${view}"]`).onclick=()=>{if(mode()===view)return;const selectedRole=params().get(view==='sets'?'entity':'character'),role=selectedRole&&(!(view==='sets'?setFacetsReady:archiveReady)||galleryRoleRows(view,archiveFacets.entityCounts||[],facets).some(row=>row.id===selectedRole))?selectedRole:null;selecting=false;selected.clear();setUrl({view:view==='photos'?null:view,page:null,set:null,photo:null,filterSet:null,type:null,unclassified:null,entity:view==='photos'?role:null,character:view==='sets'?role:null});void route().then(()=>restoreFocus(`[data-gallery-view="${view}"]`));};
 const filterToggle=$<HTMLButtonElement>('[data-gallery-filter-toggle]'),filterPanel=$<HTMLElement>('#gallery-filter-panel'),filterMotion=createDisclosureMotion(filterPanel);filterToggle.onclick=()=>{const open=filterToggle.getAttribute('aria-expanded')!=='true';root!.dataset.mobileFilters=open?'open':'closed';filterToggle.setAttribute('aria-expanded',String(open));void filterMotion.setOpen(open);};
 $<HTMLButtonElement>('[data-gallery-retry]').onclick=()=>void initialize();$<HTMLButtonElement>('[data-gallery-more]').onclick=()=>void loadMore();$<HTMLButtonElement>('[data-gallery-clear]').onclick=()=>{setUrl({character:null,entity:null,type:null,unclassified:null,form:null,q:null,page:null,set:null,photo:null,filterSet:null,year:null,publisher:null,tag:null});void route();};$<HTMLButtonElement>('[data-gallery-select]').onclick=()=>{selecting=!selecting;if(!selecting)selected.clear();renderPhotos();};$<HTMLSelectElement>('[data-gallery-tag]').onchange=event=>{setUrl({tag:(event.target as HTMLSelectElement).value||null,page:null,photo:null});void route();};$<HTMLButtonElement>('[data-gallery-set-filter-clear]').onclick=()=>{setUrl({filterSet:null,form:null,page:null,photo:null});void route();};$<HTMLButtonElement>('[data-gallery-back]').onclick=()=>{if(safeReturn){location.assign(safeReturn);return;}const setId=params().get('set');setUrl({set:null});const returning=route();window.scrollTo({top:overviewScroll,behavior:'instant'});void returning.then(()=>{const card=[...root!.querySelectorAll<HTMLButtonElement>('.gallery-set-card')].find(item=>item.dataset.setId===setId);card?.focus({preventScroll:true});});};$<HTMLFormElement>('[data-gallery-search]').onsubmit=event=>event.preventDefault();$<HTMLInputElement>('[data-gallery-search] input').oninput=event=>{window.clearTimeout(searchTimer);const value=(event.target as HTMLInputElement).value;searchTimer=window.setTimeout(()=>{setUrl({q:value||null,page:null,set:null,photo:null},true);void route();},260);};window.addEventListener('popstate',()=>void route());window.addEventListener('hashchange',()=>{if(!params().get('set')&&!params().get('photo'))void route();});void initialize();
}
