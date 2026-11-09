import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {galleryCharacterName,galleryCharacterAliases,galleryRoleRows} from '../src/lib/galleryRoleCatalog.mjs';

const catalog=[
  {id:'kaf',name:'花譜',labels:{zh:'花譜',ja:'花譜',en:'KAF'}},
  {id:'garasumiya',name:'硝子宮',labels:{zh:'硝子宮',ja:'硝子宮',en:'GARASUMIYA'}},
  {id:'rime',name:'裏命',labels:{zh:'裏命',ja:'裏命',en:'RIME'}},
  {id:'isekaijoucho',name:'ヰ世界情緒',labels:{zh:'ヰ世界情緒',ja:'ヰ世界情緒',en:'ISEKAIJOUCHO'}},
  {id:'palow',name:'PALOW.',labels:{zh:'PALOW.',ja:'PALOW.',en:'PALOW.'}},
];
const photoRows=[{id:'kaf',count:145},{id:'palow',count:10}];
const setFacets=[{character:'kaf',form:'青雀',count:1},{character:'kaf',form:'梟',count:1},{character:'kaf',form:'雏鸟',count:1}];

test('the design-set role directory counts sets and omits photo-only subjects',()=>{
  const rows=galleryRoleRows('sets',photoRows,setFacets);
  assert.deepEqual(rows.map(({id,count})=>({id,count})),[{id:'kaf',count:3}]);
  assert.deepEqual(galleryRoleRows('photos',photoRows,setFacets),photoRows);
});

test('Chinese role names agree with curated sets and retain Japanese and English search aliases',()=>{
  assert.equal(galleryCharacterName('kaf',catalog,'zh'),'花谱');
  assert.equal(galleryCharacterName('garasumiya',catalog,'zh'),'硝子宫');
  assert.equal(galleryCharacterName('isekaijoucho',catalog,'zh'),'异世界情绪');
  assert.equal(galleryCharacterName('rime',catalog,'zh'),'裏命');
  assert.equal(galleryCharacterName('kaf',catalog,'ja'),'花譜');
  assert.equal(galleryCharacterName('kaf',catalog,'en'),'KAF');
  assert.ok(galleryCharacterAliases('kaf',catalog,'zh').includes('花譜'));
  assert.ok(galleryCharacterAliases('kaf',catalog,'zh').includes('花谱'));
  assert.ok(galleryCharacterAliases('rime',catalog,'zh').includes('里命'));
  assert.ok(galleryCharacterAliases('garasumiya',catalog,'zh').includes('硝子宮'));
});

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundled=await build({entryPoints:['src/lib/gallery.ts'],bundle:true,write:false,format:'iife',globalName:'galleryAdapter',plugins:[{
  name:'gallery-viewer-fixture',setup(builder){
    builder.onResolve({filter:/(galleryImageViewer|imageViewer|disclosureMotion)\.mjs$/},args=>({path:args.path,namespace:'gallery-fixture'}));
    builder.onLoad({filter:/.*/,namespace:'gallery-fixture'},args=>({contents:/imageViewer|galleryImageViewer/.test(args.path)
      ?'export function galleryImageViewer(){return {isOpen:false,open(items,index){this.isOpen=true;window.galleryViewerCalls.push({items,index});},close(){this.isOpen=false;}};}'
      :'export function createDisclosureMotion(element){return {async setOpen(open){element.hidden=!open;},dispose(){}};}'}));
  },
}]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<100&&!check();i++)await sleep(10);assert.ok(check(),'gallery state did not settle');}
function browser({search='',extraEntities=[],respond}={}){
  const dom=new JSDOM(`<main data-gallery data-api="https://api.example" data-locale="zh">
    <div data-gallery-overview><section id="gallery-role-filters"><input data-gallery-role-search><select data-gallery-role-sort><option value="site">Site</option></select><div data-gallery-roles></div><p data-gallery-role-empty hidden></p><output data-gallery-role-count></output><button data-gallery-roles-toggle><span data-artist-expand-count></span></button><button data-artist-collapse hidden></button></section>
    <h2 data-gallery-section-title></h2><output data-gallery-count></output>
    <button data-gallery-view="photos"></button><button data-gallery-view="sets"></button>
    <button data-gallery-filter-toggle aria-expanded="false"><span data-gallery-filter-label></span></button><div id="gallery-filter-panel" hidden></div><div data-gallery-active-filters><span data-gallery-filter-chips></span></div>
    <form data-gallery-search><input name="q"></form><button data-gallery-clear></button><select data-gallery-tag><option value=""></option></select><button data-gallery-select></button><a data-gallery-classify></a><div data-gallery-types></div><div data-gallery-forms></div>
    <div data-gallery-set-filter><span data-gallery-set-filter-name></span><button data-gallery-set-filter-clear></button></div>
    <p data-gallery-feedback></p><div data-gallery-grid></div><button data-gallery-more hidden></button><button data-gallery-retry hidden></button></div>
    <section data-gallery-detail hidden><button data-gallery-back></button><button data-gallery-photos-in-set></button><p data-gallery-detail-path></p><h1 data-gallery-detail-title></h1><p data-gallery-detail-meta></p><a data-gallery-edit></a><a data-gallery-related></a><dl data-gallery-properties></dl><div data-gallery-images></div></section>
  </main>`,{url:'https://wiki.example/zh/gallery/'+search,runScripts:'outside-only'});
  const w=dom.window,root=w.document.querySelector('[data-gallery]'),calls=[];
  root.dataset.copy=JSON.stringify({filters:'筛选',clear:'清除',photos:'全部照片',viewSets:'设定组',sets:'套设定',photo:'照片',images:'张图片',allRoles:'全部对象',allTypes:'全部类型',unclassifiedType:'待分类',latestPhotos:'最新照片',latest:'最新设定组',loaded:'已载入',loading:'载入中',error:'错误',more:'更多',unknownPhoto:'未命名',noMatch:'没有资料',source:'来源',original:'原图',download:'下载',classifyPhoto:'分类图片'});
  w.galleryViewerCalls=[];
  w.AbortSignal=AbortSignal;w.AbortController=AbortController;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.fetch=async url=>{
    const target=new URL(url);calls.push(target);
    const endpoints={'/api/gallery/entities':{entities:[...catalog,...extraEntities]},'/api/gallery/sets/facets':{facets:setFacets},'/api/gallery/facets':{facets:{entityCounts:photoRows}},'/api/gallery/types':{types:[]}};
    return target.pathname in endpoints?Response.json(endpoints[target.pathname]):respond?.(target)||Response.json({items:[],sets:[],total:0,nextOffset:null});
  };
  w.eval(bundled.outputFiles[0].text+'\nwindow.galleryAdapter=galleryAdapter;');void w.galleryAdapter.initGallery();
  return {w,root,calls,find:selector=>root.querySelector(selector)};
}

test('switching photos to sets rebuilds the directory, counts groups and keeps the selected canonical role',async()=>{
  const b=browser();
  try{
    await until(()=>b.root.dataset.loadState==='ready');
    assert.equal(b.find('[data-role="kaf"] strong').textContent,'花谱');
    assert.equal(b.find('[data-role="kaf"] small').textContent,'145 张图片');
    assert.ok(b.find('[data-role="palow"]'));
    b.find('[data-role="kaf"]').click();await until(()=>b.w.location.search.includes('entity=kaf')&&b.root.dataset.loadState==='ready');
    b.find('[data-gallery-view="sets"]').click();await until(()=>b.find('[data-gallery-roles]').dataset.rendered==='sets'&&b.root.dataset.loadState==='ready');
    assert.equal(b.find('[data-role="palow"]'),null);
    assert.equal(b.find('[data-role="kaf"] small').textContent,'3 套设定');
    assert.equal(b.find('[data-role="kaf"]').getAttribute('aria-pressed'),'true');
    assert.ok(b.calls.some(url=>url.pathname==='/api/gallery/sets'&&url.searchParams.get('character')==='kaf'));
    b.find('[data-gallery-view="photos"]').click();await until(()=>b.find('[data-gallery-roles]').dataset.rendered==='photos'&&b.root.dataset.loadState==='ready');
    assert.ok(b.find('[data-role="palow"]'));
    assert.equal(b.find('[data-role="kaf"] small').textContent,'145 张图片');
    assert.equal(b.find('[data-role="kaf"]').getAttribute('aria-pressed'),'true');
    assert.equal(b.root.querySelectorAll('[data-role="kaf"]').length,1);
  }finally{b.w.close();}
});

test('Japanese spelling still finds the Chinese role after switching the directory view',async()=>{
  const b=browser();
  try{
    await until(()=>b.root.dataset.loadState==='ready');
    b.find('[data-gallery-view="sets"]').click();await until(()=>b.find('[data-gallery-roles]').dataset.rendered==='sets'&&b.root.dataset.loadState==='ready');
    const search=b.find('[data-gallery-role-search]');search.value='花譜';search.dispatchEvent(new b.w.Event('input'));
    assert.equal(b.find('[data-role="kaf"]').hidden,false);
    assert.equal(b.find('[data-gallery-role-empty]').hidden,true);
  }finally{b.w.close();}
});


test('switching a photo-only subject to design sets clears its unavailable filter',async()=>{
  const b=browser();
  try{
    await until(()=>b.root.dataset.loadState==='ready');
    b.find('[data-role="palow"]').click();await until(()=>b.w.location.search.includes('entity=palow')&&b.root.dataset.loadState==='ready');
    b.find('[data-gallery-view="sets"]').click();await until(()=>b.find('[data-gallery-roles]').dataset.rendered==='sets'&&b.root.dataset.loadState==='ready');
    const params=new URLSearchParams(b.w.location.search);
    assert.equal(params.has('entity'),false);assert.equal(params.has('character'),false);
    assert.equal(b.find('[data-role=""]').getAttribute('aria-pressed'),'true');
    assert.ok(b.calls.some(url=>url.pathname==='/api/gallery/sets'&&!url.searchParams.has('character')));
  }finally{b.w.close();}
});


test('a gallery-only character with no article URL retains complete images, source and viewer controls',async()=>{
  const sourceUrl='https://x.com/Guiano/status/123',src='https://images.example/mascot.png';
  const b=browser({search:'?view=sets&set=mascot-set',extraEntities:[{id:'guiano-guo',name:'ぐおー',labels:{zh:'Guo',ja:'ぐおー',en:'Guo'},url:null}],respond:url=>url.pathname==='/api/gallery/sets/mascot-set'?Response.json({set:{id:'mascot-set',character:'guiano-guo',title:'Guo｜初始形态',form:'初始形态',sourceUrl,sourceTitle:'原作者公开设定',images:[{id:'mascot-reference',src,title:'Guo｜初始形态',mediaType:'setting',author:'Guiano'}]}}):null});
  try{
    await until(()=>b.root.dataset.loadState==='ready'&&b.find('[data-gallery-detail-title]').textContent==='Guo｜初始形态');
    assert.equal(b.find('[data-gallery-related]').hidden,true);
    assert.equal(b.find('[data-gallery-related]').hasAttribute('href'),false);
    assert.equal(b.find('[data-gallery-feedback]').textContent,'');
    assert.equal(b.find('[data-gallery-detail]').hidden,false);
    assert.equal(b.find('[data-gallery-images] img').src,src);
    assert.equal(b.find('[data-gallery-properties] a').href,sourceUrl);
    assert.equal(b.find('[data-gallery-properties] a').textContent,'原作者公开设定');
    b.find('[data-gallery-images] button').click();
    const {items,index}=b.w.galleryViewerCalls.at(-1);assert.equal(index,0);assert.equal(items[0].src,src);
    assert.equal(items[0].downloadUrl,'https://api.example/api/gallery/items/mascot-reference/download');
    assert.ok(items[0].links.some(link=>link.href===sourceUrl&&link.label==='原作者公开设定'));
    assert.ok(items[0].links.some(link=>link.href===src&&link.label==='原图'));
    assert.ok(items[0].metadata.some(row=>row.value==='Guiano'));
    b.find('[data-gallery-photos-in-set]').click();
    await until(()=>b.root.dataset.loadState==='ready'&&b.w.location.search.includes('filterSet=mascot-set'));
    assert.equal(new URLSearchParams(b.w.location.search).get('character'),'guiano-guo');
    assert.ok(b.calls.some(url=>url.pathname==='/api/gallery/items'&&url.searchParams.get('set')==='mascot-set'));
  }finally{b.w.close();}
});
