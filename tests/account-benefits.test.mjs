import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {benefitsCopy} from '../src/lib/benefitsCopy.mjs';
const script=readFileSync(new URL('../src/scripts/accountBenefits.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(api){
 const dom=new JSDOM('<div data-account-page><a href="#benefits">benefits</a><section data-account-benefits><button data-benefit-refresh>refresh</button><p data-benefit-status></p><div data-benefit-view></div></section></div>',{url:'https://wiki.example.test/zh/account/#benefits',runScripts:'outside-only'}),state={viewer:{userId:'alice'}};
 Object.assign(dom.window,{api,state,locale:'zh',benefitsCopy});dom.window.eval(script);dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));return {dom,state,root:dom.window.document.querySelector('[data-benefit-view]')};
}
const index={eligibility:{rank:3,tiers:['joint'],validUntil:'2030-01-01T00:00:00Z'},items:[{id:'post',title:'Earned post',published_at:'2026-10-18T00:00:00Z'}],history:[],preferences:{version:0,content_updates:1,review_updates:1,expiry_reminders:1},page:1,hasMore:false};
test('account benefits fetches the canonical authenticated route, renders private content as text and clears it immediately on sign-out',async()=>{
 const paths=[],f=fixture(async path=>{paths.push(path);return {data:path==='/api/supporter-benefits'?structuredClone(index):{id:'post',kind:'log',title:'Earned post',body:'<img src=x onerror=alert(1)> private text'}};});
 try{await tick();assert.equal(paths[0],'/api/supporter-benefits');f.root.querySelector('ul button').click();await tick();assert.match(f.root.textContent,/private text/);assert.equal(f.root.querySelector('img'),null);f.state.viewer=null;f.dom.window.dispatchEvent(new f.dom.window.Event('kamitsubaki-account-state'));assert.equal(f.root.textContent,'');}finally{f.dom.window.close();}
});
test('switching accounts while a private request is pending never renders the previous owner response',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));try{await tick();f.state.viewer={userId:'bob'};f.dom.window.dispatchEvent(new f.dom.window.Event('kamitsubaki-account-state'));finish({data:structuredClone(index)});await tick();assert.equal(f.root.textContent,'');}finally{f.dom.window.close();}
});
test('earned content pagination appends later pages through authenticated calls',async()=>{
 const paths=[],f=fixture(async path=>{paths.push(path);return {data:path.includes('?page=2')?{...structuredClone(index),page:2,items:[{id:'second',title:'Second page',published_at:'2026-10-17T00:00:00Z'}]}:{...structuredClone(index),hasMore:true}};});
 try{await tick();[...f.root.querySelectorAll('button')].find(b=>b.textContent==='加载更多').click();await tick();assert.ok(paths.includes('/api/supporter-benefits?page=2'));assert.match(f.root.textContent,/Earned post/);assert.match(f.root.textContent,/Second page/);}finally{f.dom.window.close();}
});
