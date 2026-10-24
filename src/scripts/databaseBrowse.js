import {setIconLabel} from '../lib/icons.mjs';
import {filterDatabaseRecords,sortDatabaseRecords,readDatabaseQuery,writeDatabaseQuery} from '../lib/databaseBrowse.mjs';
import {updateLocaleQueries} from '../lib/localeQuery.mjs';
import {DATABASE_PLACEHOLDER_IMAGE} from '../lib/databaseArtwork.mjs';

const PAGE_SIZE=24;

function textElement(tag,className,text) {
  const element=document.createElement(tag);
  element.className=className;
  setIconLabel(element,text);
  return element;
}

function renderRecord(record,view='grid',placeholderLabel='') {
  const item=textElement('li','database-record','');
  item.dataset.recordId=record.id;
  item.dataset.recordCollection=record.collection;
  item.dataset.recordVisual=record.imageProps?'image':'placeholder';
  const link=document.createElement('a');
  link.href=record.url;
  link.dataset.cardKind='entity';
  const placeholder=textElement('span','database-record-placeholder-label',placeholderLabel);
  placeholder.dataset.databasePlaceholderLabel='';
  placeholder.hidden=Boolean(record.imageProps);placeholder.setAttribute('aria-hidden','true');
  const imageProps=record.imageProps||DATABASE_PLACEHOLDER_IMAGE;
  const image=document.createElement('img');
  for(const [name,value] of Object.entries(imageProps))if(value!=null)image.setAttribute(name,String(value));
  image.dataset.gridSizes=imageProps.sizes||'';
  if(view==='list'&&image.srcset)image.sizes='(max-width:760px) 56px, 64px';
  image.className='database-record-image';
  image.alt='';image.loading='lazy';image.decoding='async';
  const media=textElement('div','database-record-media','');
  media.append(image);link.append(media);
  image.addEventListener('error',()=>{
    if(item.dataset.recordVisual==='placeholder')return;
    item.dataset.recordVisual='placeholder';placeholder.hidden=false;
    image.removeAttribute('srcset');image.removeAttribute('sizes');image.dataset.gridSizes='';
    for(const [name,value] of Object.entries(DATABASE_PLACEHOLDER_IMAGE))image.setAttribute(name,String(value));
  },{once:true});
  link.append(placeholder);
  const caption=textElement('div','database-record-caption','');
  const main=textElement('div','database-record-main','');
  const heading=textElement('div','database-record-heading','');
  heading.append(textElement('h3','',record.title));
  if(record.summary)heading.append(textElement('p','',record.summary));
  main.append(heading);
  const arrow=textElement('span','database-record-arrow','↗');
  arrow.setAttribute('aria-hidden','true');
  caption.append(main,textElement('span','database-record-type',record.typeLabel),textElement('span','database-record-artist',record.artistNames.join(' / ')||'—'),textElement('span','database-record-year',record.year||'—'),arrow);
  link.append(caption);
  item.append(link);
  return item;
}

export function initDatabaseBrowse(scope=document) {
  scope.querySelectorAll('[data-database-catalog]').forEach(root=>{
    if(root.dataset.databaseReady)return;
    const form=root.querySelector('[data-database-form]');
    const data=root.querySelector('[data-database-record-data]');
    if(!form||!data)return;
    const {records,facets,copy}=JSON.parse(data.textContent);
    const list=root.querySelector('[data-database-records]');
    const count=root.querySelector('[data-database-count]');
    const more=root.querySelector('[data-database-more]');
    const empty=root.querySelector('[data-database-empty]');
    const clear=root.querySelector('[data-database-clear]');
    const tree=root.querySelector('[data-database-classification]');
    const collections=[...root.querySelectorAll('[data-database-collection]')];
    const views=[...root.querySelectorAll('[data-database-view]')];
    const controls=[...form.querySelectorAll('input[name],select[name]')];
    const typeControl=form.querySelector('select[name=type]');
    const filterToggle=root.querySelector('[data-database-filter-toggle]');
    const activeFiltersRoot=root.querySelector('[data-database-active-filters]');
    let state=readDatabaseQuery(location.search,facets);
    let limit=PAGE_SIZE;
    let matched=[];
    root.dataset.databaseReady='true';

    const normalizeType=()=>{
      if(state.type&&state.collection&&!records.some(record=>record.collection===state.collection&&record.type===state.type))state.type='';
    };

    const syncControls=()=>{
      controls.forEach(control=>{control.value=state[control.name]||'';});
      collections.forEach(link=>{
        if(link.dataset.databaseCollection===state.collection)link.setAttribute('aria-current','true');
        else link.removeAttribute('aria-current');
      });
      root.dataset.view=state.view;
      list.querySelectorAll('img[srcset]').forEach(image=>{image.sizes=state.view==='list'?'(max-width:760px) 56px, 64px':image.dataset.gridSizes;});
      const activeFilters=['type','artist','year','genre','project'].filter(key=>state[key]).length;
      const filterLabel=filterToggle?.querySelector('span');
      if(filterLabel)filterLabel.textContent=`${copy.filters}${activeFilters?` (${activeFilters})`:''}`;
      views.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.databaseView===state.view)));
      [...typeControl.options].forEach(option=>{
        option.disabled=Boolean(option.value&&state.collection&&!records.some(record=>record.collection===state.collection&&record.type===option.value));
      });
      updateLocaleQueries(root.ownerDocument,writeDatabaseQuery(state,location.search).toString());
    };
    const saveUrl=(mode='replace')=>{
      const url=new URL(location.href);
      url.search=writeDatabaseQuery(state,url.search).toString();
      if(url.href!==location.href)history[mode==='push'?'pushState':'replaceState'](null,'',url);
    };
    const renderActiveFilters=()=>{
      if(!activeFiltersRoot)return;
      const keys=['q','collection','type','artist','year','genre','project'].filter(key=>state[key]);
      const buttons=keys.map(key=>{
        let value=state[key];
        if(key==='artist'||key==='project')value=facets[key==='artist'?'artists':'projects'].find(item=>item.id===value)?.label||value;
        else if(key==='collection')value=copy.collections[value]||value;
        else if(key==='type'||key==='genre')value=[...form.querySelectorAll(`select[name="${key}"] option`)].find(option=>option.value===value)?.textContent||value;
        else if(key==='year'&&value==='unknown')value=copy.unknownYear;
        const label=`${copy[key==='q'?'search':key]}: ${value}`;
        const button=document.createElement('button');button.type='button';button.dataset.databaseRemoveFilter=key;
        const text=document.createElement('span');text.textContent=label;
        const icon=textElement('span','','×');icon.setAttribute('aria-hidden','true');
        button.append(text,icon);button.setAttribute('aria-label',copy.removeFilter.replace('{label}',label));
        return button;
      });
      activeFiltersRoot.replaceChildren(...buttons);activeFiltersRoot.hidden=!keys.length;
    };
    const updateCount=()=>{
      count.textContent=`${copy.shown} ${Math.min(limit,matched.length).toLocaleString(root.dataset.locale)} / ${matched.length.toLocaleString(root.dataset.locale)} ${copy.records}`;
      more.hidden=matched.length<=limit;
      empty.hidden=matched.length>0;
      clear.hidden=!['q','type','artist','year','genre','project','collection'].some(key=>state[key]);
    };
    const apply=(save=false,mode='replace')=>{
      matched=sortDatabaseRecords(filterDatabaseRecords(records,state),state.sort,root.dataset.locale);
      list.replaceChildren(...matched.slice(0,limit).map(record=>renderRecord(record,state.view,copy.imagePending)));
      syncControls();updateCount();renderActiveFilters();
      if(save)saveUrl(mode);
    };
    const clearFilters=()=>{
      const {view,sort}=state;
      state=readDatabaseQuery('',facets);state.view=view;state.sort=sort;limit=PAGE_SIZE;apply(true,'push');
    };
    const restore=()=>{
      state=readDatabaseQuery(location.search,facets);limit=PAGE_SIZE;
      normalizeType();
      const section=new URLSearchParams(location.search).get('section');
      if(section&&[...tree.querySelectorAll('[data-root-choice],[data-choose]')].some(button=>(button.dataset.rootChoice||button.dataset.choose)===section)) {
        tree.open=true;
        if(!location.hash)requestAnimationFrame(()=>tree.scrollIntoView({block:'start'}));
      }
      apply();
    };
    collections.forEach(link=>link.addEventListener('click',event=>{
      if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
      event.preventDefault();
      state.collection=link.dataset.databaseCollection;
      normalizeType();
      limit=PAGE_SIZE;apply(true,'push');
    }));
    views.forEach(button=>button.addEventListener('click',()=>{
      state.view=button.dataset.databaseView;syncControls();saveUrl('push');
    }));
    filterToggle?.addEventListener('click',()=>{
      const open=filterToggle.getAttribute('aria-expanded')!=='true';
      filterToggle.setAttribute('aria-expanded',String(open));root.dataset.filtersOpen=String(open);
    });
    const readControls=(mode)=>{
      controls.forEach(control=>{state[control.name]=control.value;});
      normalizeType();limit=PAGE_SIZE;apply(true,mode);
    };
    form.addEventListener('input',event=>{
      if(event.isComposing||event.target.tagName==='SELECT')return;
      readControls('replace');
    });
    form.addEventListener('change',event=>{if(event.target.tagName==='SELECT')readControls('push');});
    form.addEventListener('compositionend',()=>readControls('replace'));
    form.addEventListener('submit',event=>event.preventDefault());
    form.addEventListener('reset',event=>{event.preventDefault();clearFilters();});
    root.querySelector('[data-database-empty-clear]').addEventListener('click',clearFilters);
    activeFiltersRoot?.addEventListener('click',event=>{
      const button=event.target.closest('[data-database-remove-filter]');if(!button)return;
      state[button.dataset.databaseRemoveFilter]='';normalizeType();limit=PAGE_SIZE;apply(true,'push');
      (activeFiltersRoot.querySelector('button')||form.querySelector('input[name=q]')).focus({preventScroll:true});
    });
    more.addEventListener('click',()=>{
      const start=limit;limit+=PAGE_SIZE;
      const additions=matched.slice(start,limit).map(record=>renderRecord(record,state.view,copy.imagePending));
      list.append(...additions);updateCount();
      // The button follows the new rows: keep keyboard users at the first added record.
      additions[0]?.querySelector('a')?.focus({preventScroll:true});
    });
    window.addEventListener('popstate',restore);
    window.addEventListener('pageshow',event=>{if(event.persisted)restore();});
    restore();
  });
}

initDatabaseBrowse();
document.addEventListener('astro:page-load',()=>initDatabaseBrowse());
