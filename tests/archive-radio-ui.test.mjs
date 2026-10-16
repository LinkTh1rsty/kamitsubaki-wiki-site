import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {archiveFixture} from './helpers/archive-fixture.mjs';
import {archiveFeatureCopy} from '../src/lib/archiveFeatureCopy.mjs';
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite'))('esbuild');
const bundle=await build({entryPoints:['src/scripts/archiveRadio.js'],bundle:true,write:false,format:'iife',define:{'import.meta.env':'{}'}});
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
async function radioPage(callback){
 const dom=new JSDOM('<details data-archive-radio data-locale="en"><script data-radio-copy type="application/json"></script><p data-radio-status></p><div data-radio-player></div><span data-radio-count></span><a data-radio-title></a><ol data-radio-queue></ol><button data-radio-play></button><button data-radio-previous></button><button data-radio-next></button><button data-radio-clear></button><button data-radio-window></button><div class="archive-radio__body"></div></details>',{url:'https://wiki.test/en/explore/radio/',runScripts:'outside-only'});
 const w=dom.window,snapshot=archiveFixture(),players=[],intervals=new Map();let intervalId=0;
 for(const id of ['song-a','song-b'])snapshot.entities.find(e=>e.id===id).media=[{embed:{provider:'youtube',src:'https://www.youtube-nocookie.com/embed/'+id}}];
 w.document.querySelector('[data-radio-copy]').textContent=JSON.stringify(archiveFeatureCopy('en'));
 w.fetch=async url=>Response.json(String(url).includes('manifest')?{snapshotUrl:'/snapshot.json'}:snapshot);
 w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
 w.setInterval=fn=>{intervals.set(++intervalId,fn);return intervalId;};w.clearInterval=id=>intervals.delete(id);
 w.YT={PlayerState:{ENDED:0},Player:class{
  constructor(target,options){this.options=options;this.element=w.document.createElement('iframe');target.append(this.element);players.push(this);queueMicrotask(()=>options.events.onReady({target:this}));}
  playVideo(){}getCurrentTime(){return 42;}destroy(){this.element.remove();}
 }};
 w.localStorage.setItem('kamitsubaki-radio-v1',JSON.stringify({version:1,ids:['song-a','song-b'],index:0}));
 try{w.eval(bundle.outputFiles[0].text);for(let i=0;i<20&&!w.document.querySelector('[data-radio-title]').textContent;i++)await tick();assert.equal(w.document.querySelector('[data-radio-title]').textContent,'song-a');await callback(w,players,intervals);}
 finally{w.close();}
}

test('saving player progress does not overwrite a queue changed by another window',async()=>{
 await radioPage(async(w,players,intervals)=>{
  w.document.querySelector('[data-radio-play]').click();await tick();assert.equal(players.length,1);
  w.localStorage.setItem('kamitsubaki-radio-v1',JSON.stringify({version:1,ids:['song-b'],index:0}));
  for(const capture of intervals.values())capture();
  assert.deepEqual(JSON.parse(w.localStorage.getItem('kamitsubaki-radio-v1')).ids,['song-b']);
 });
});

test('callbacks from a destroyed player cannot advance a replay of the same song',async()=>{
 await radioPage(async(w,players)=>{
  const play=w.document.querySelector('[data-radio-play]');play.click();await tick();const stale=players[0];play.click();await tick();assert.equal(players.length,2);
  stale.options.events.onStateChange({data:0});await tick();
  assert.equal(JSON.parse(w.localStorage.getItem('kamitsubaki-radio-v1')).index,0);
  players[1].options.events.onStateChange({data:0});await tick();
  assert.equal(JSON.parse(w.localStorage.getItem('kamitsubaki-radio-v1')).index,1);
 });
});

test('returning from the browser cache resumes position saving without duplicate timers',async()=>{
 await radioPage(async(w,_players,intervals)=>{
  assert.equal(intervals.size,1);w.dispatchEvent(new w.PageTransitionEvent('pagehide',{persisted:true}));assert.equal(intervals.size,0);
  w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(intervals.size,1);
  w.dispatchEvent(new w.PageTransitionEvent('pageshow',{persisted:true}));await tick();assert.equal(intervals.size,1);
 });
});
