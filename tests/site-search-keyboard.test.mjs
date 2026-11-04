import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
const require=createRequire(import.meta.url);
const {build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({entryPoints:['src/scripts/siteSearch.js'],bundle:true,write:false,format:'iife'});
function browser(){
 const dom=new JSDOM(`<button data-search-open>Open</button><section data-site-search data-locale="en" hidden><button data-search-close>Close</button><form data-search-form><input data-search-input></form><p data-search-status></p><div data-search-results></div><a data-article-search-link>Articles</a></section>`,{url:'https://wiki.example/en/chronicle/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window;w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.eval(bundle.outputFiles[0].text);w.document.querySelector('[data-search-open]').click();
 const input=w.document.querySelector('input'),results=w.document.querySelector('[data-search-results]');
 results.innerHTML='<a class="site-search__result" id="r0" href="/en/first/">First</a><a class="site-search__result" id="r1" href="/en/second/">Second</a>';
 let clicks=[];results.querySelectorAll('a').forEach(link=>link.onclick=event=>{event.preventDefault();clicks.push(link.id);});
 const key=(target,key,extra={})=>{const event=new w.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,...extra});target.dispatchEvent(event);return event;};
 return{w,input,results,clicks,key};
}
test('search navigation keys apply only to the query field, leaving focused controls native',()=>{
 const b=browser();try{
  b.input.focus();b.key(b.input,'ArrowDown');assert.equal(b.input.getAttribute('aria-activedescendant'),'r0');
  for(const target of [b.w.document.querySelector('[data-search-close]'),b.w.document.querySelector('.site-search__more'),b.w.document.querySelector('[data-article-search-link]'),b.results.lastChild]){
   target.focus();assert.equal(b.key(target,'Enter').defaultPrevented,false);assert.equal(b.key(target,'ArrowDown').defaultPrevented,false);
  }
  assert.deepEqual(b.clicks,[]);
  b.input.focus();assert.equal(b.key(b.input,'Enter').defaultPrevented,true);assert.deepEqual(b.clicks,['r0']);
  b.key(b.input,'ArrowDown');b.key(b.input,'Enter');assert.deepEqual(b.clicks,['r0','r1']);
  b.w.document.querySelector('[data-search-close]').focus();b.key(b.w.document.activeElement,'Escape');
  assert.equal(b.w.document.querySelector('[data-site-search]').classList.contains('is-closing'),true);
 }finally{b.w.close();}
});
test('composing and already handled query keys do not navigate',()=>{
 const b=browser();try{
  b.key(b.input,'ArrowDown',{isComposing:true});assert.equal(b.input.hasAttribute('aria-activedescendant'),false);
  b.input.addEventListener('keydown',event=>event.preventDefault());b.key(b.input,'ArrowDown');assert.equal(b.input.hasAttribute('aria-activedescendant'),false);
 }finally{b.w.close();}
});
