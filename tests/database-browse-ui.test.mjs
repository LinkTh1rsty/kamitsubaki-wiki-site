import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {collectDatabaseFacets,toDatabaseRecord} from '../src/lib/databaseBrowse.mjs';
import {databaseBrowseCopy} from '../src/lib/databaseBrowseCopy.mjs';

const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
// This must also bundle for a real browser: a server-only import in the query
// module would otherwise prevent every search/filter control from initializing.
const bundled=await build({entryPoints:['src/scripts/databaseBrowse.js'],platform:'browser',bundle:true,write:false,format:'iife'});
const peopleById=new Map([['kaf',{id:'kaf',entityType:'virtual-avatar',name:'花譜',romanizedName:'KAF'}]]);
const projectsById=new Map([['city',{id:'city',entityType:'project',title:'神椿市'}]]);
const wideImage={
  src:'/images/database-wide-1280.webp',
  srcset:'/images/database-wide-480.webp 480w, /images/database-wide-1280.webp 1280w',
  sizes:'(max-width: 700px) 45vw, 300px',width:1280,height:600,
};
const imageRecordIds=new Set(['track-0','track-24','kaf']);
const records=[...Array.from({length:50},(_,index)=>toDatabaseRecord({url:`/zh/database/music/songs/track-${index}/`,data:{
  id:`track-${index}`,entityType:'work-track',title:index===0?'魔女':'Song '+index,
  romanizedTitle:index===0?'Witch':undefined,releaseDate:index===0?'2023':'2022',
  performers:[{entity:'kaf',role:'lead-vocal'}],credits:[],
  genres:index===0?['literature-rock']:[],relations:index===0?[{type:'theme-song-for',target:'city'}]:[],
}},'zh',{peopleById,projectsById})),
  toDatabaseRecord({url:'/zh/database/artists/solo/kaf/',data:peopleById.get('kaf')},'zh',{peopleById,projectsById}),
  toDatabaseRecord({url:'/zh/database/projects/city/',data:projectsById.get('city')},'zh',{peopleById,projectsById}),
].map(record=>({...record,typeLabel:record.type,imageProps:imageRecordIds.has(record.id)?{...wideImage}:null}));
const facets=collectDatabaseFacets(records);
const copy=databaseBrowseCopy('zh');

function options(values) {
  return '<option value="">全部</option>'+values.map(value=>`<option value="${value}">${value}</option>`).join('');
}

function browser(search='') {
  const dom=new JSDOM(`<div class="site-nav__language-switcher"><a href="/en/database/" hreflang="en">EN</a></div><main data-database-catalog data-locale="zh" data-view="grid" data-filters-open="false">
    <nav><a href="/zh/database/" data-database-collection="">All</a><a href="?collection=people" data-database-collection="people">People</a><a href="?collection=music" data-database-collection="music">Music</a></nav>
    <form data-database-form><input name="q" type="search">
      <button type="button" data-database-filter-toggle aria-expanded="false" aria-controls="database-filters"><span>Filters</span></button>
      <div id="database-filters">
      <select name="type">${options(facets.types)}</select>
      <select name="artist">${options(facets.artists.map(value=>value.id))}</select>
      <select name="year">${options([...facets.years,'unknown'])}</select>
      <select name="genre">${options(facets.genres)}</select>
      <select name="project">${options(facets.projects.map(value=>value.id))}</select>
      </div>
      <select name="sort"><option value="catalog">Catalogue</option><option value="title">Name</option><option value="newest">Newest</option><option value="oldest">Oldest</option></select>
      <p data-database-count></p><button type="reset" data-database-clear hidden>Clear</button>
      <button type="button" data-database-view="grid">Grid</button><button type="button" data-database-view="list">List</button>
    </form><div data-database-active-filters hidden></div><ul data-database-records><li>Server-rendered first record</li></ul>
    <div data-database-empty hidden><button type="button" data-database-empty-clear>Clear</button></div>
    <button type="button" data-database-more>More</button>
    <details data-database-classification><summary>Classification</summary><button data-root-choice="people">People</button><button data-choose="city-project">City</button></details>
    <script type="application/json" data-database-record-data></script>
  </main>`,{url:'https://wiki.example/zh/database/'+search,runScripts:'outside-only'});
  const w=dom.window;
  const document=w.document;
  document.querySelector('[data-database-record-data]').textContent=JSON.stringify({records,facets,copy});
  const scrolled=[];
  w.HTMLElement.prototype.scrollIntoView=function(){scrolled.push(this);};
  w.requestAnimationFrame=callback=>{callback();return 1;};
  w.eval(bundled.outputFiles[0].text);
  const select=name=>document.querySelector(`[name="${name}"]`);
  const input=(name,value)=>{select(name).value=value;select(name).dispatchEvent(new w.Event(select(name).tagName==='SELECT'?'change':'input',{bubbles:true}));};
  const rows=()=>[...document.querySelectorAll('[data-database-records] [data-record-id]')];
  return {dom,w,document,select,input,rows,scrolled};
}

function assertCaption(row) {
  assert.ok(row);
  const record=records.find(value=>value.id===row.dataset.recordId);
  assert.ok(record);
  const link=row.querySelector(':scope > a');
  assert.equal(link.getAttribute('href'),record.url);
  assert.equal(link.dataset.cardKind,'entity');
  const caption=link.querySelector(':scope > .database-record-caption');
  assert.ok(caption,'the record title and metadata share a caption inside the entity link');
  assert.equal(row.querySelectorAll('.database-record-caption').length,1);
  assert.equal(caption.querySelector('.database-record-main .database-record-heading h3').textContent,record.title);
  assert.equal(caption.querySelector('.database-record-type').textContent,record.typeLabel);
  assert.equal(caption.querySelector('.database-record-artist').textContent,record.artistNames.join(' / ')||'—');
  assert.equal(caption.querySelector('.database-record-year').textContent,record.year||'—');
  assert.equal(caption.querySelector('.database-record-arrow').getAttribute('aria-hidden'),'true');
}

function assertWideImage(row,collection,view='grid') {
  assert.ok(row);
  assertCaption(row);
  assert.equal(row.dataset.recordCollection,collection);
  assert.equal(row.dataset.recordVisual,'image');
  const media=row.querySelector('.database-record-media');
  assert.ok(media,'an image record has its own media area');
  assert.equal(media.parentElement,row.querySelector(':scope > a'),'the image area stays independent of the overlay caption');
  const image=media.querySelector('img.database-record-image');
  assert.ok(image);
  for(const [name,value] of Object.entries(wideImage))if(name!=='sizes')assert.equal(image.getAttribute(name),String(value),`${name} survives rendering`);
  assert.equal(image.dataset.gridSizes,wideImage.sizes);
  assert.equal(image.getAttribute('sizes'),view==='list'?'(max-width:760px) 56px, 64px':wideImage.sizes);
  assert.equal(image.alt,'','the linked record title provides the accessible name');
  assert.equal(image.loading,'lazy');assert.equal(image.decoding,'async');
  assert.equal(image.width,1280);assert.equal(image.height,600);
  assert.equal(row.querySelector('[data-database-placeholder-label]').hidden,true);
  assert.equal(row.querySelector('.database-record-mark'),null);
}

function assertPlaceholder(row,collection) {
  assertCaption(row);
  assert.equal(row.dataset.recordCollection,collection);assert.equal(row.dataset.recordVisual,'placeholder');
  const media=row.querySelector(':scope > a > .database-record-media');
  assert.ok(media,'missing artwork still has a square media area');
  const image=media.querySelector('img.database-record-image');
  assert.ok(image);assert.equal(image.getAttribute('src'),'/images/database-placeholder.svg');
  assert.equal(image.width,960);assert.equal(image.height,960);
  assert.equal(image.alt,'');assert.equal(image.loading,'lazy');assert.equal(image.decoding,'async');
  const label=row.querySelector('[data-database-placeholder-label]');
  assert.equal(label.hidden,false);assert.equal(label.textContent,copy.imagePending);assert.equal(label.getAttribute('aria-hidden'),'true');
  assert.equal(row.querySelector('.database-record-mark'),null);
}

test('image records preserve responsive sources and missing artwork uses a decorative square placeholder',()=>{
  const b=browser();
  try {
    assertWideImage(b.rows().find(row=>row.dataset.recordId==='track-0'),'music');
    const textRow=b.rows().find(row=>row.dataset.recordId==='track-1');
    assertPlaceholder(textRow,'music');
    assert.equal(textRow.querySelector('h3').textContent,'Song 1');
  } finally {b.w.close();}
});

test('search, pagination and collection changes preserve images in Grid and List views',()=>{
  const b=browser();
  try {
    b.input('q','Witch');
    assert.equal(b.rows().length,1);assertWideImage(b.rows()[0],'music');
    b.input('q','');b.document.querySelector('[data-database-more]').click();
    assertWideImage(b.rows().find(row=>row.dataset.recordId==='track-24'),'music');
    b.document.querySelector('[data-database-view="list"]').click();
    assertWideImage(b.rows().find(row=>row.dataset.recordId==='track-24'),'music','list');
    b.document.querySelector('[data-database-more]').click();
    assertWideImage(b.rows().find(row=>row.dataset.recordId==='kaf'),'people','list');
    assertPlaceholder(b.rows().find(row=>row.dataset.recordId==='track-49'),'music');
    b.rows().forEach(assertCaption);
    b.document.querySelector('[data-database-collection="people"]').click();
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['kaf']);assertWideImage(b.rows()[0],'people','list');
    b.document.querySelector('[data-database-view="grid"]').click();
    assertWideImage(b.rows()[0],'people');
  } finally {b.w.close();}
});

test('missing artwork keeps its placeholder and caption after search and layout changes',()=>{
  const b=browser();
  try {
    b.input('type','project');assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['city']);
    assertPlaceholder(b.rows()[0],'projects');
    b.document.querySelector('[data-database-view="list"]').click();assertPlaceholder(b.rows()[0],'projects');
    b.document.querySelector('[data-database-view="grid"]').click();assertPlaceholder(b.rows()[0],'projects');
    b.document.querySelector('[data-database-clear]').click();
    assertPlaceholder(b.rows().find(row=>row.dataset.recordId==='track-1'),'music');
  } finally {b.w.close();}
});

test('failed artwork falls back once in either layout and placeholder errors do not rewrite sources',()=>{
  for(const view of ['grid','list']) {
    const b=browser(view==='list'?'?view=list':'');
    try {
      const row=b.rows().find(record=>record.dataset.recordId==='track-0');
      const image=row.querySelector('img');
      assertWideImage(row,'music',view);
      image.dispatchEvent(new b.w.Event('error'));
      assertPlaceholder(row,'music');
      assert.equal(image.hasAttribute('srcset'),false,'failed responsive sources are removed');
      assert.equal(image.hasAttribute('sizes'),false);assert.equal(image.dataset.gridSizes,'');
      b.document.querySelector(`[data-database-view="${view==='grid'?'list':'grid'}"]`).click();
      assertPlaceholder(row,'music');assert.equal(image.hasAttribute('srcset'),false);assert.equal(image.hasAttribute('sizes'),false);
      // Both a newly missing image and one that just fell back must stop at the
      // local placeholder, even if that asset itself emits an error.
      for(const placeholderRow of [row,b.rows().find(record=>record.dataset.recordId==='track-1')]) {
        const observer=new b.w.MutationObserver(()=>{});
        observer.observe(placeholderRow,{attributes:true,subtree:true});
        placeholderRow.querySelector('img').dispatchEvent(new b.w.Event('error'));
        assert.deepEqual(observer.takeRecords(),[],'a failed placeholder cannot trigger another source rewrite');
        observer.disconnect();assertPlaceholder(placeholderRow,'music');
      }
    } finally {b.w.close();}
  }
});

test('shared search and all five facets restore to controls, results and List view',()=>{
  const b=browser('?q=Witch&type=work-track&artist=kaf&year=2023&genre=literature-rock&project=city&collection=music&view=list');
  try {
    for(const [name,value] of Object.entries({q:'Witch',type:'work-track',artist:'kaf',year:'2023',genre:'literature-rock',project:'city'}))assert.equal(b.select(name).value,value);
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['track-0']);
    assert.equal(b.document.querySelector('main').dataset.view,'list');
    assert.equal(b.document.querySelector('[data-database-view="list"]').getAttribute('aria-pressed'),'true');
    assert.equal(b.document.querySelector('[data-database-collection="music"]').getAttribute('aria-current'),'true');
    assert.equal(b.document.querySelector('[data-database-count]').textContent,'已显示 1 / 1 条记录');
    assert.equal(b.document.querySelector('[data-database-more]').hidden,true);
    assertWideImage(b.rows()[0],'music','list');
  } finally {b.w.close();}
});

test('mobile filter disclosure keeps ARIA, open state and selected facet count in sync',()=>{
  const b=browser();
  try {
    const root=b.document.querySelector('main');
    const toggle=b.document.querySelector('[data-database-filter-toggle]');
    const label=toggle.querySelector('span');
    assert.equal(root.dataset.filtersOpen,'false');assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.equal(label.textContent,copy.filters);
    assert.ok(b.document.getElementById(toggle.getAttribute('aria-controls')));
    toggle.click();assert.equal(root.dataset.filtersOpen,'true');assert.equal(toggle.getAttribute('aria-expanded'),'true');
    b.input('artist','kaf');b.input('year','2023');
    assert.equal(label.textContent,`${copy.filters} (2)`);
    b.input('q','Witch');b.document.querySelector('[data-database-collection="music"]').click();
    assert.equal(label.textContent,`${copy.filters} (2)`,'search and collection do not count as advanced facets');
    toggle.click();assert.equal(root.dataset.filtersOpen,'false');assert.equal(toggle.getAttribute('aria-expanded'),'false');
    assert.equal(label.textContent,`${copy.filters} (2)`,'collapsing keeps selected filters visible in the label');
    b.document.querySelector('[data-database-clear]').click();
    assert.equal(label.textContent,copy.filters);assert.equal(root.dataset.filtersOpen,'false');assert.equal(toggle.getAttribute('aria-expanded'),'false');
  } finally {b.w.close();}
});

test('URL-restored filters show the correct count even while the disclosure starts collapsed',()=>{
  for(const [search,count] of [
    ['?type=work-track&artist=kaf&year=2023&genre=literature-rock&project=city&collection=music&q=Witch',5],
    ['?collection=music&type=virtual-avatar&artist=kaf',1],
  ]) {
    const b=browser(search);
    try {
      const toggle=b.document.querySelector('[data-database-filter-toggle]');
      assert.equal(toggle.querySelector('span').textContent,`${copy.filters} (${count})`);
      assert.equal(toggle.getAttribute('aria-expanded'),'false');assert.equal(b.document.querySelector('main').dataset.filtersOpen,'false');
    } finally {b.w.close();}
  }
});

test('search and selects combine, an empty result can be cleared, and filters persist in the URL',()=>{
  const b=browser();
  try {
    b.input('q','ＫＡＦ 魔女');b.input('artist','kaf');b.input('year','2023');b.input('genre','literature-rock');b.input('project','city');
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['track-0']);
    assert.equal(new URLSearchParams(b.w.location.search).get('project'),'city');
    b.input('year','2022');
    assert.equal(b.rows().length,0);assert.equal(b.document.querySelector('[data-database-empty]').hidden,false);
    b.document.querySelector('[data-database-empty-clear]').click();
    assert.equal(b.rows().length,24);assert.equal(b.select('q').value,'');assert.equal(b.w.location.search,'');
    assert.equal(b.document.querySelector('[data-database-empty]').hidden,true);
  } finally {b.w.close();}
});

test('changing collections clears incompatible Type and permits switching back to all types',()=>{
  const b=browser();
  try {
    b.input('type','virtual-avatar');
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['kaf']);
    b.document.querySelector('[data-database-collection="music"]').click();
    assert.equal(b.select('type').value,'');assert.equal(b.rows().length,24);
    assert.equal(new URLSearchParams(b.w.location.search).get('collection'),'music');
    assert.equal(new URLSearchParams(b.w.location.search).has('type'),false);
    assert.equal([...b.select('type').options].find(option=>option.value==='virtual-avatar').disabled,true);
    b.document.querySelector('[data-database-collection=""]').click();
    assert.equal([...b.select('type').options].find(option=>option.value==='virtual-avatar').disabled,false);
    b.input('type','virtual-avatar');assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['kaf']);
  } finally {b.w.close();}
});

test('an incompatible but individually valid collection and Type URL restores a usable collection',()=>{
  const b=browser('?collection=music&type=virtual-avatar&q=KAF');
  try {
    assert.equal(b.select('type').value,'');assert.equal(b.select('q').value,'KAF');
    assert.equal(b.document.querySelector('[data-database-collection="music"]').getAttribute('aria-current'),'true');
    assert.equal(b.rows().length,24);assert.ok(b.rows().every(row=>row.dataset.recordId.startsWith('track-')));
    assert.equal(b.document.querySelector('[data-database-empty]').hidden,true);
  } finally {b.w.close();}
});

test('reset preserves layout and unrelated legacy parameters; popstate restores rendered search',()=>{
  const b=browser('?section=city-project&from=home');
  try {
    b.document.querySelector('[data-database-view="list"]').click();b.input('q','Witch');
    b.document.querySelector('[data-database-clear]').click();
    const params=new URLSearchParams(b.w.location.search);
    assert.equal(params.get('view'),'list');assert.equal(params.get('section'),'city-project');assert.equal(params.get('from'),'home');assert.equal(params.has('q'),false);
    assert.equal(b.document.querySelector('main').dataset.view,'list');assert.equal(b.rows().length,24);
    b.w.history.replaceState(null,'','?q=Witch&view=grid');b.w.dispatchEvent(new b.w.PopStateEvent('popstate'));
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['track-0']);assert.equal(b.select('q').value,'Witch');
    assert.equal(b.document.querySelector('main').dataset.view,'grid');
  } finally {b.w.close();}
});

test('load more appends the next page once, moves keyboard focus and stops at the final page',()=>{
  const b=browser();
  try {
    assert.equal(b.rows().length,24);
    b.document.dispatchEvent(new b.w.Event('astro:page-load'));
    b.document.querySelector('[data-database-more]').click();
    assert.equal(b.rows().length,48);assert.equal(b.document.activeElement,b.rows()[24].querySelector('a'));
    assert.equal(new Set(b.rows().map(row=>row.dataset.recordId)).size,48);
    b.document.querySelector('[data-database-more]').click();
    assert.equal(b.rows().length,52);assert.equal(b.document.querySelector('[data-database-more]').hidden,true);
    assert.equal(b.document.querySelector('[data-database-count]').textContent,'已显示 52 / 52 条记录');
  } finally {b.w.close();}
});

test('only a valid legacy section opens and scrolls classification, while a hash keeps its own destination',()=>{
  for(const [search,open,scroll] of [['?section=city-project',true,true],['?section=missing',false,false],['?section=city-project#database-classification',true,false]]) {
    const b=browser(search);
    try {
      const tree=b.document.querySelector('[data-database-classification]');
      assert.equal(tree.open,open);assert.deepEqual(b.scrolled,scroll?[tree]:[]);
    } finally {b.w.close();}
  }
});

test('applied filters retain language links and each chip removes only its own condition',()=>{
  const b=browser('?q=Witch&artist=kaf&year=2023&collection=music&sort=newest&view=list&from=home');
  try {
    const language=new URL(b.document.querySelector('a[hreflang=en]').href);
    assert.equal(language.searchParams.get('artist'),'kaf');assert.equal(language.searchParams.get('sort'),'newest');
    assert.equal(language.searchParams.get('q'),'Witch');assert.equal(language.pathname,'/en/database/');
    const chips=b.document.querySelector('[data-database-active-filters]');
    assert.equal(chips.hidden,false);assert.equal(chips.querySelectorAll('button').length,4);
    chips.querySelector('[data-database-remove-filter=year]').click();
    const params=new URLSearchParams(b.w.location.search);
    assert.equal(params.has('year'),false);assert.equal(params.get('artist'),'kaf');assert.equal(params.get('q'),'Witch');
    assert.equal(params.get('sort'),'newest');assert.equal(params.get('from'),'home');
    b.document.querySelector('[data-database-clear]').click();
    assert.equal(new URLSearchParams(b.w.location.search).get('sort'),'newest');assert.equal(chips.hidden,true);
  } finally {b.w.close();}
});

test('discrete query changes form real history entries and browser Back restores results and sorting',async()=>{
  const b=browser('?from=home');
  try {
    b.input('sort','newest');
    b.document.querySelector('[data-database-collection=people]').click();
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['kaf']);
    const restored=new Promise(resolve=>b.w.addEventListener('popstate',resolve,{once:true}));
    b.w.history.back();await restored;
    assert.equal(b.select('sort').value,'newest');assert.equal(b.rows().length,24);
    assert.equal(new URLSearchParams(b.w.location.search).has('collection'),false);
    assert.equal(new URLSearchParams(b.w.location.search).get('from'),'home');
  } finally {b.w.close();}
});

test('IME drafts leave applied records alone until composition commits',()=>{
  const b=browser();
  try {
    b.select('q').value='Witch';
    b.select('q').dispatchEvent(new b.w.InputEvent('input',{bubbles:true,isComposing:true}));
    assert.equal(b.rows().length,24);assert.equal(b.w.location.search,'');
    b.select('q').dispatchEvent(new b.w.CompositionEvent('compositionend',{bubbles:true}));
    assert.deepEqual(b.rows().map(row=>row.dataset.recordId),['track-0']);
  } finally {b.w.close();}
});
