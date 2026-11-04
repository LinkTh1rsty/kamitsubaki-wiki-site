import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundled=await build({entryPoints:['src/lib/gallery.ts'],bundle:true,write:false,format:'iife',globalName:'galleryAdapter',plugins:[{
  name:'gallery-viewer-fixture',setup(builder){
    builder.onResolve({filter:/(galleryImageViewer|imageViewer|disclosureMotion)\.mjs$/},args=>({path:args.path,namespace:'gallery-fixture'}));
    builder.onLoad({filter:/.*/,namespace:'gallery-fixture'},args=>({contents:/imageViewer|galleryImageViewer/.test(args.path)
      ?'export function imageViewer(){return window.qaViewer;} export const galleryImageViewer=imageViewer;'
      :'export function createDisclosureMotion(element){return {async setOpen(open){element.hidden=!open;},dispose(){}};}'}));
  },
}]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<100&&!check();i++)await sleep(10);assert.ok(check(),'gallery state did not settle');}
const photo=id=>({id,src:`https://images.example/${id}.webp`,title:id});

function browser(respond,search='',metadata){
  const dom=new JSDOM(`<main data-gallery data-api="https://api.example" data-locale="en">
    <div data-gallery-overview><section id="gallery-role-filters"><input data-gallery-role-search><select data-gallery-role-sort><option value="site">Site</option></select><div data-gallery-roles></div><p data-gallery-role-empty hidden></p><output data-gallery-role-count></output><button data-gallery-roles-toggle><span data-artist-expand-count></span></button><button data-artist-collapse hidden></button></section>
    <h2 data-gallery-section-title></h2><output data-gallery-count></output>
    <button data-gallery-view="photos"></button><button data-gallery-view="sets"></button>
    <button data-gallery-filter-toggle aria-expanded="false"><span data-gallery-filter-label></span></button><div id="gallery-filter-panel" hidden></div><div data-gallery-active-filters></div>
    <form data-gallery-search><input name="q"></form><button data-gallery-clear></button><select data-gallery-tag><option value=""></option></select><button data-gallery-select></button><a data-gallery-classify></a><div data-gallery-types></div><div data-gallery-forms></div>
    <div data-gallery-set-filter><span data-gallery-set-filter-name></span><button data-gallery-set-filter-clear></button></div>
    <p data-gallery-feedback></p><div data-gallery-grid></div><button data-gallery-more hidden></button><button data-gallery-retry hidden></button></div>
    <section data-gallery-detail hidden><button data-gallery-back></button><button data-gallery-photos-in-set></button><p data-gallery-detail-path></p><h1 data-gallery-detail-title></h1><p data-gallery-detail-meta></p><a data-gallery-edit></a><a data-gallery-related></a><dl data-gallery-properties></dl><div data-gallery-images></div></section>
  </main>`,{url:'https://wiki.example/en/gallery/'+search,runScripts:'outside-only'});
  const w=dom.window,root=w.document.querySelector('[data-gallery]'),calls=[];
  root.dataset.copy=JSON.stringify({filters:'Filters',clear:'Clear',photos:'Photos',sets:'Sets',photo:'Photo',images:'images',allRoles:'All',allTypes:'All types',unclassifiedType:'Unclassified',latestPhotos:'Latest photos',latest:'Latest sets',loaded:'Loaded',loading:'Loading',error:'Gallery error',more:'More',moreLoading:'Loading more',unknownPhoto:'Untitled',choose:'Select',cancelChoose:'Cancel',classify:'Classify'});
  w.AbortSignal=AbortSignal;w.AbortController=AbortController;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  let viewerOptions;
  w.qaViewer={isOpen:false,open(items,index,trigger,options){this.isOpen=true;this.items=items;viewerOptions=options;},close(){this.isOpen=false;viewerOptions?.onClose?.();}};
  w.fetch=async(url,options)=>{
    const target=new URL(url);calls.push(target);
    const endpoints={'/api/gallery/entities':{entities:[]},'/api/gallery/sets/facets':{facets:[]},'/api/gallery/facets':{facets:{}},'/api/gallery/types':{types:[]}};
    return target.pathname in endpoints?(metadata?metadata(target,endpoints[target.pathname]):Response.json(endpoints[target.pathname])):respond(target,options,calls);
  };
  w.eval(bundled.outputFiles[0].text+'\nwindow.galleryAdapter=galleryAdapter;');void w.galleryAdapter.initGallery();
  return {w,root,calls,find:selector=>root.querySelector(selector)};
}

test('opening and closing a photo during pagination does not strand the grid or disable Load more',async()=>{
  let releasePage;
  const b=browser(url=>url.searchParams.get('offset')==='0'
    ?Response.json({items:[photo('first'),photo('second')],total:3,nextOffset:2})
    :new Promise(resolve=>{releasePage=()=>resolve(Response.json({items:[photo('third')],total:3,nextOffset:null}));}));
  try {
    await until(()=>b.root.dataset.loadState==='ready');
    b.find('[data-gallery-more]').click();await until(()=>releasePage);
    assert.equal(b.root.dataset.loadState,'loading-more');assert.equal(b.find('[data-gallery-more]').disabled,true);
    b.find('.gallery-photo-card').click();assert.equal(b.w.qaViewer.isOpen,true);b.w.qaViewer.close();
    releasePage();await until(()=>b.root.dataset.loadState==='ready');
    assert.equal(b.root.querySelectorAll('.gallery-photo-card').length,3);
    assert.equal(b.find('[data-gallery-more]').disabled,false);assert.equal(b.find('[data-gallery-more]').dataset.loading,'false');
    assert.equal(b.find('[data-gallery-grid]').hasAttribute('aria-busy'),false);assert.equal(b.find('[data-gallery-more]').hidden,true);
    assert.equal(new URLSearchParams(b.w.location.search).get('page'),'1');
  } finally {b.w.close();}
});

test('a late photo failure from a previous route does not overwrite the current browse state',async()=>{
  let rejectPhoto;
  const b=browser(url=>url.pathname==='/api/gallery/items/delayed'
    ?new Promise((resolve,reject)=>{rejectPhoto=()=>reject(Error('Old photo failed'));})
    :Response.json({items:[photo('first'),photo('second')],total:2,nextOffset:null}),'?photo=delayed');
  try {
    await until(()=>rejectPhoto);
    b.w.history.replaceState(null,'','?q=current');b.w.dispatchEvent(new b.w.PopStateEvent('popstate'));
    await until(()=>b.root.dataset.loadState==='ready');rejectPhoto();await sleep(20);
    assert.equal(b.w.location.search,'?q=current');assert.equal(b.find('[data-gallery-feedback]').textContent,'');
    assert.equal(b.w.qaViewer.isOpen,false);assert.equal(b.root.querySelectorAll('.gallery-photo-card').length,2);
  } finally {b.w.close();}
});


test('photos become ready while catalog requests are slow, and survive a catalog failure',async()=>{
  let release;const delayed=new Promise(resolve=>{release=resolve;});
  const b=browser(()=>Response.json({items:[photo('first')],total:1,nextOffset:null}),'',async(url,data)=>{
    if(url.pathname.endsWith('/facets')){await delayed;throw Error('Facet outage');}return Response.json(data);
  });
  try{
    await until(()=>b.root.dataset.loadState==='ready');
    assert.equal(b.root.querySelectorAll('.gallery-photo-card').length,1);
    assert.notEqual(b.root.dataset.catalogState,'ready');
    release();await until(()=>b.root.dataset.catalogState==='partial');
    assert.equal(b.root.querySelectorAll('.gallery-photo-card').length,1);
    assert.equal(b.find('[data-gallery-retry]').hidden,false);
  }finally{release();b.w.close();}
});

for(const order of [['types','facets','entities','sets/facets'],['facets','sets/facets','entities','types']]){
 test(`type filters stay unique as catalogs settle in ${order.join(', ')} order and retry`,async()=>{
  const releases=new Map();
  const b=browser(()=>Response.json({items:[photo('first')],total:1,nextOffset:null}),'?type=portrait',(url,data)=>new Promise(resolve=>{
   const key=url.pathname.slice('/api/gallery/'.length);
   releases.set(key,()=>resolve(Response.json(key==='types'?{types:[{id:'portrait',labels:{en:'Portrait'}},{id:'cover',labels:{en:'Cover'}}]}:key==='facets'?{facets:{typeCounts:[{id:'portrait',count:7},{id:'cover',count:3}],unclassified:2}}:data)));
  }));
  try{
   await until(()=>releases.size===4);
   for(const key of order){releases.get(key)();await sleep(10);}
   await until(()=>b.root.dataset.catalogState==='ready');
   const filters=b.find('[data-gallery-types]');
   assert.equal(filters.querySelectorAll('button').length,4);
   assert.equal(filters.querySelectorAll('.gallery-count-scope').length,1);
   const active=filters.querySelector('[data-type="portrait"]');
   assert.equal(active.getAttribute('aria-pressed'),'true');assert.equal(active.querySelector('small').textContent,'7');
   active.focus();releases.clear();b.find('[data-gallery-retry]').click();await until(()=>releases.size===4);
   for(const key of [...order].reverse()){releases.get(key)();await sleep(10);}
   await until(()=>b.root.dataset.catalogState==='ready');
   assert.equal(filters.querySelectorAll('button').length,4);
   assert.equal(filters.querySelectorAll('.gallery-count-scope').length,1);
   assert.equal(b.w.document.activeElement.dataset.type,'portrait');
   b.w.history.pushState(null,'','?view=sets');b.w.dispatchEvent(new b.w.PopStateEvent('popstate'));await sleep(20);
   b.w.history.pushState(null,'','');b.w.dispatchEvent(new b.w.PopStateEvent('popstate'));await sleep(20);
   assert.equal(filters.querySelectorAll('button').length,4);
   assert.equal(filters.querySelectorAll('[aria-pressed="true"]').length,1);
  }finally{b.w.close();}
 });
}
