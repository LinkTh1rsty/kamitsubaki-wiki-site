import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {archiveCopy} from '../src/lib/archiveCopy.mjs';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({entryPoints:['src/scripts/archiveBrowser.js'],bundle:true,write:false,format:'iife'});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(check){for(let i=0;i<40&&!check();i++)await sleep(10);assert.ok(check());}
const select=(key,values)=>`<select name="${key}"><option value="">All</option>${values.map(value=>`<option value="${value}">${value}</option>`).join('')}</select>`;
function page(kind,catalog,fields,query=''){
  const dom=new JSDOM(`<main data-archive-browser="${kind}"><script type="application/json" data-archive-data></script><form data-archive-form data-archive-controls hidden><input name="q">${fields}<select name="sort"><option value="newest">Newest</option><option value="oldest">Oldest</option></select><button type="reset">Reset</button></form><section data-creator-overview hidden></section><p data-archive-count></p><div data-archive-results></div><p data-archive-empty hidden></p><button data-archive-more data-archive-controls hidden>More</button></main>`,{url:`https://wiki.example/zh/explore/${kind}/${query}`,runScripts:'outside-only'});
  dom.window.document.querySelector('[data-archive-data]').textContent=JSON.stringify({catalog,locale:'zh',copy:archiveCopy('zh')});
  dom.window.eval(bundle.outputFiles[0].text); return dom;
}
const base={id:'one',title:'<img src=x onerror=alert(1)>',path:'/zh/database/one/',date:'2024',year:'2024',summary:'',search:'花谱 kaf',headliners:[{id:'kaf',title:'花譜',path:'/zh/database/kaf/'}],guests:[],venue:'Hall',location:'Tokyo',mode:'physical',eventType:'oneman-live',setlist:[],needsSetlist:true,editHref:'/zh/contribute/editor/?target=src/content/lives/one/zh.md',years:['2024']};

test('live browser restores combined filters, paginates, keeps titles as text and resets after native form reset',async()=>{
  const entries=Array.from({length:25},(_,i)=>({...base,id:`live-${i}`}));
  entries.push({...base,id:'virtual',mode:'virtual'});
  const dom=page('lives',{entries},select('artist',['kaf'])+select('mode',['physical','virtual'])+select('year',['2024'])+select('type',['oneman-live']),'?artist=kaf&mode=physical');
  const w=dom.window,d=w.document;
  try{
    assert.equal(d.querySelectorAll('.archive-record').length,12);
    assert.match(d.querySelector('[data-archive-count]').textContent,/12 \/ 25/);
    d.querySelector('[data-archive-more]').click();assert.equal(d.querySelectorAll('.archive-record').length,24);
    d.querySelector('[data-archive-more]').click();assert.equal(d.querySelectorAll('.archive-record').length,25);
    assert.equal(d.querySelectorAll('.archive-record img').length,0);
    assert.match(d.querySelector('.archive-record h2').textContent,/<img/);
    const mode=d.querySelector('[name=mode]'); mode.value='virtual';mode.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(d.querySelectorAll('.archive-record').length,1);
    w.history.back();await until(()=>d.querySelector('[name=mode]').value==='physical');
    assert.equal(d.querySelectorAll('.archive-record').length,12);
    d.querySelector('button[type=reset]').click();await until(()=>w.location.search==='');
    assert.match(d.querySelector('[data-archive-count]').textContent,/12 \/ 26/);
    const q=d.querySelector('[name=q]'); q.value='missing';q.dispatchEvent(new w.Event('input',{bubbles:true}));
    assert.equal(d.querySelector('[data-archive-empty]').hidden,false);
  }finally{w.close();}
});

test('creator overview links narrow collaborations and history restores roles and overview without inferring a profile',async()=>{
  const entries=[{...base,artists:base.headliners,credits:[{key:'entity:maker',title:'Maker',role:'composer',entityId:'maker'}]},
    {...base,id:'two',artists:[],credits:[{key:'name:Maker',title:'Maker',role:'lyricist',entityId:''}]}];
  const creators=[{key:'entity:maker',title:'Maker',path:'/zh/database/maker/',entityId:'maker',workCount:1,roles:['composer'],years:[{year:'2024',count:1}],collaborators:[{id:'kaf',title:'花譜',count:1}]},
    {key:'name:Maker',title:'Maker',path:null,workCount:1,roles:['lyricist'],years:[],collaborators:[]}];
  const dom=page('credits',{entries,creators},select('creator',['entity:maker','name:Maker'])+select('artist',['kaf'])+select('role',['composer','lyricist'])+select('year',['2024']),'?creator=entity%3Amaker');
  const w=dom.window,d=w.document;
  try{
    assert.equal(d.querySelector('[data-creator-overview]').hidden,false);
    assert.equal(d.querySelectorAll('.archive-record').length,1);
    d.querySelector('[data-creator-overview] [data-archive-filter-link]').click();
    assert.equal(new URL(w.location.href).searchParams.get('artist'),'kaf');
    w.history.back();await until(()=>d.querySelector('[name=artist]').value==='');
    const creator=d.querySelector('[name=creator]');creator.value='name:Maker';creator.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(d.querySelectorAll('.archive-record').length,1);
    assert.equal(d.querySelector('[data-creator-overview] a'),null);
    const role=d.querySelector('[name=role]');role.value='composer';role.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(d.querySelector('[data-archive-empty]').hidden,false);
    role.value='lyricist';role.dispatchEvent(new w.Event('change',{bubbles:true}));
    assert.equal(d.querySelectorAll('.archive-record').length,1);
  }finally{w.close();}
});
