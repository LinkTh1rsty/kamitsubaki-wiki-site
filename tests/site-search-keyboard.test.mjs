import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const source=await readFile('src/scripts/siteSearch.js','utf8');
const engineImport='import(/* @vite-ignore */ url)';
assert.ok(source.includes(engineImport));
const bundled=await build({stdin:{contents:source.replace(engineImport,'Promise.resolve(globalThis.testPagefind)'),resolveDir:fileURLToPath(new URL('../src/scripts/',import.meta.url))},bundle:true,write:false,platform:'browser',format:'iife'});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function browser(){
  const dom=new JSDOM(`<button data-search-open>Search</button><div data-site-search data-locale="en" hidden><button data-search-close>Close</button><form data-search-form><input data-search-input value="KAF"></form><button data-search-kind="song">Songs</button><p data-search-status></p><div data-search-results></div></div>`,{url:'https://wiki.example/en/',runScripts:'outside-only'});
  const w=dom.window;
  w.document.querySelector('[data-site-search]').dataset.copy=JSON.stringify({idle:'Search',loading:'Loading',empty:'Empty',resultCountTemplate:'{count} results',kinds:{song:'Song'},retry:'Retry'});
  w.matchMedia=()=>({matches:true});w.requestAnimationFrame=callback=>w.setTimeout(callback,0);w.HTMLElement.prototype.scrollIntoView=()=>{};
  w.testPagefind={options:async()=>{},search:async()=>({results:[{id:'kaf',data:async()=>({url:'/en/database/people/kaf/',meta:{title:'KAF',kind:'song'},excerpt:'KAF song'})}]})};
  w.eval(bundled.outputFiles[0].text);
  w.document.querySelector('[data-search-open]').click();
  for(let i=0;i<100&&!w.document.querySelector('.site-search__result');i++)await wait(10);
  assert.ok(w.document.querySelector('.site-search__result'));
  return {dom,w,input:w.document.querySelector('[data-search-input]'),root:w.document.querySelector('[data-site-search]')};
}

test('result keyboard navigation belongs to the search input, leaving dialog buttons usable',async()=>{
  const b=await browser();
  try{
    const down=new b.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});b.input.dispatchEvent(down);
    assert.equal(down.defaultPrevented,true);assert.ok(b.input.getAttribute('aria-activedescendant'));
    let opened=0;b.root.querySelector('.site-search__result').addEventListener('click',event=>{event.preventDefault();opened++;});
    const close=b.root.querySelector('[data-search-close]');close.focus();
    const enter=new b.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});close.dispatchEvent(enter);
    assert.equal(enter.defaultPrevented,false);assert.equal(opened,0);
    const buttonDown=new b.w.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true,cancelable:true});close.dispatchEvent(buttonDown);assert.equal(buttonDown.defaultPrevented,false);
    const composing=new b.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true,isComposing:true});b.input.dispatchEvent(composing);assert.equal(opened,0);
    close.click();await wait(10);assert.equal(b.root.hidden,true);assert.equal(b.w.document.activeElement,b.w.document.querySelector('[data-search-open]'));
  }finally{b.w.close();}
});

test('closing before the opening focus frame cannot focus a hidden search field',async()=>{
  const b=await browser();
  try{
    const frames=[];b.w.requestAnimationFrame=callback=>{frames.push(callback);return frames.length;};
    b.root.querySelector('[data-search-close]').click();await wait(10);
    b.w.document.querySelector('[data-search-open]').click();b.root.querySelector('[data-search-close]').click();await wait(10);
    frames.forEach(callback=>callback());
    assert.equal(b.root.hidden,true);assert.equal(b.w.document.activeElement,b.w.document.querySelector('[data-search-open]'));
  }finally{b.w.close();}
});
