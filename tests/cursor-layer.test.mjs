import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {installCursorLayer} from '../src/lib/cursorLayer.mjs';
import {mountFilterPopover} from '../src/lib/filterPopover.js';
function setup(){const dom=new JSDOM('<body><div id="cursor"></div><button id="button">Open</button><select><option>Country</option></select><input list="zones"><dialog></dialog><div id="surface" popover="manual"></div></body>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,cursor=w.document.querySelector('#cursor'),calls=[];let open=false;cursor.matches=selector=>selector===':popover-open'?open:w.Element.prototype.matches.call(cursor,selector);cursor.showPopover=()=>{open=true;calls.push('show');};cursor.hidePopover=()=>{open=false;calls.push('hide');};w.eval('window.installCursorLayer='+installCursorLayer.toString());w.installCursorLayer(cursor);return {dom,w,cursor,calls};}
test('custom pointer is raised above newly opened popovers and stays in the active dialog',async()=>{const f=setup();try{const surface=f.w.document.querySelector('#surface'),event=new f.w.Event('toggle');event.newState='open';surface.dispatchEvent(event);assert.deepEqual(f.calls,['show','hide','show']);const dialog=f.w.document.querySelector('dialog');dialog.setAttribute('open','');await new Promise(r=>f.w.setTimeout(r,0));assert.equal(f.cursor.parentElement,dialog);dialog.removeAttribute('open');await new Promise(r=>f.w.setTimeout(r,0));assert.equal(f.cursor.parentElement,f.w.document.body);}finally{f.w.close();}});
test('select and datalist pickers retain the native pointer, with custom pointer recovery and navigation cleanup',()=>{const f=setup();try{const move=target=>{const e=new f.w.Event('pointermove',{bubbles:true});Object.assign(e,{pointerType:'mouse',clientX:20,clientY:30});target.dispatchEvent(e);};move(f.w.document.querySelector('button'));assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),true);for(const target of f.w.document.querySelectorAll('select,input[list]')){move(target);assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),false);assert.equal(f.cursor.style.visibility,'hidden');}move(f.w.document.querySelector('button'));assert.equal(f.cursor.style.visibility,'visible');f.w.document.dispatchEvent(new f.w.Event('astro:before-swap'));move(f.w.document.querySelector('button'));assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),false);}finally{f.w.close();}});
test('top-layer filters close on Escape and outside click, returning keyboard focus to their trigger',async()=>{const dom=new JSDOM('<details><summary>Filters</summary><div data-filter-surface><select><option>Country</option></select></div></details><button>Outside</button>',{runScripts:'outside-only',pretendToBeVisual:true}),w=dom.window,details=w.document.querySelector('details'),surface=details.querySelector('div');let open=false,stops=0,positions=0;surface.matches=selector=>selector===':popover-open'?open:w.Element.prototype.matches.call(surface,selector);surface.showPopover=()=>{open=true;};surface.hidePopover=()=>{open=false;};w.eval('window.mountFilterPopover='+mountFilterPopover.toString());try{w.mountFilterPopover(details,{watch(anchor,panel,position){position();return ()=>stops++;},place(){positions++;}});details.open=true;await new Promise(r=>w.setTimeout(r,0));assert.equal(open,true);assert.equal(positions,1);surface.querySelector('select').focus();surface.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));assert.equal(open,false);assert.equal(w.document.activeElement,details.querySelector('summary'));details.open=true;await new Promise(r=>w.setTimeout(r,0));w.document.querySelector('button').dispatchEvent(new w.Event('pointerdown',{bubbles:true}));assert.equal(open,false);assert.equal(details.open,false);assert.ok(stops>=2);details.open=true;await new Promise(r=>w.setTimeout(r,0));w.document.querySelector('button').focus();assert.equal(open,false);assert.equal(details.open,false);}finally{w.close();}});

test('editable text uses one native pointer; checkbox, readonly and nested editor buttons never become an input cursor',()=>{
 const f=setup();try{
  f.w.document.body.insertAdjacentHTML('beforeend','<input id="text" type="text"><input id="readonly" readonly><input id="checkbox" type="checkbox"><input id="month" type="month"><div contenteditable="true" id="editor"><button id="inline-button">Edit image</button><span id="prose">Editable</span></div>');
  const move=id=>{const e=new f.w.Event('pointermove',{bubbles:true});Object.assign(e,{pointerType:'mouse',clientX:20,clientY:30});f.w.document.getElementById(id).dispatchEvent(e);};
  for(const id of ['text','prose','month']){move(id);assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),false,id);assert.equal(f.cursor.style.visibility,'hidden');}
  for(const id of ['checkbox','readonly','inline-button']){move(id);assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),true,id);assert.equal(f.cursor.classList.contains('text-entry'),false,id);}
  move('inline-button');assert.equal(f.cursor.classList.contains('hovering'),true);
  const count=f.calls.length;f.w.installCursorLayer(f.cursor);assert.equal(f.calls.length,count,'Installing twice cannot create duplicate cursor layers');
 }finally{f.w.close();}
});

test('all pages share the custom cursor without important native-cursor overrides or label-input conflicts',()=>{
 const f=setup();try{
  f.w.document.body.insertAdjacentHTML('beforeend','<label id="bound-label" for="opt"><span id="label-copy">Toggle</span></label><input id="opt" type="checkbox"><label id="text-wrap">Email <input id="wrapped-email" type="email"></label><span id="spoiler" class="wiki-spoiler">Secret</span><button id="disabled-btn" disabled>Locked</button>');
  const dispatch=(id,type)=>{const e=new f.w.Event(type,{bubbles:true});Object.assign(e,{pointerType:'mouse',clientX:44,clientY:66});f.w.document.getElementById(id).dispatchEvent(e);};
  dispatch('label-copy','pointermove');
  assert.equal(f.cursor.classList.contains('hovering'),true,'associated label triggers hover ring');
  assert.equal(f.cursor.style.getPropertyValue('--cursor-x'),'44px');
  dispatch('label-copy','pointerdown');
  assert.equal(f.cursor.classList.contains('is-pressing'),true,'pointerdown shrinks cursor smoothly');
  dispatch('label-copy','pointerup');
  assert.equal(f.cursor.classList.contains('is-pressing'),false,'pointerup restores cursor scale');
  dispatch('wrapped-email','pointermove');
  assert.equal(f.w.document.documentElement.hasAttribute('data-custom-cursor'),false,'text input inside label retains native I-beam');
  dispatch('spoiler','pointermove');
  assert.equal(f.cursor.classList.contains('hovering'),true,'unrevealed wiki spoiler triggers hover ring');
  dispatch('disabled-btn','pointermove');
  assert.equal(f.cursor.classList.contains('hovering'),false,'disabled button does not expand');
  assert.equal(f.cursor.classList.contains('is-disabled'),true,'disabled button dims custom cursor');
  const globalCss=readFileSync(new URL('../src/styles/global.css',import.meta.url),'utf8');
  assert.doesNotMatch(globalCss,/body:not\(\.site-home\)\s*#cursor/,'custom cursor is never hidden on subpages');
  const cursorRule=globalCss.slice(globalCss.indexOf('#cursor[popover]:popover-open'));
  assert.doesNotMatch(cursorRule,/--cursor-scale|\bscale\s*:/,'cursor never mixes standalone scale with viewport translate3d (prevents click drift)');
  assert.match(cursorRule,/transform-origin:\s*0\s+0/,'cursor locks transform-origin to 0 0 for zero-drift size transitions');
  for(const stylePath of ['src/styles/polish.css','src/styles/reader.css','src/styles/editorWorkbench.css']){
   const css=readFileSync(new URL(`../${stylePath}`,import.meta.url),'utf8');
   assert.doesNotMatch(css,/cursor\s*:[^;}]*!important/i,`${stylePath} must not override custom cursor:none`);
  }
 }finally{f.w.close();}
});

test('persisted pointer state keeps custom cursor visible immediately across page loads and window blur',()=>{
 const dom=new JSDOM('<body><div id="cursor"></div><a id="nav-link" href="/zh/articles/">Articles</a></body>',{url:'http://127.0.0.1:4321/zh/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,cursor=w.document.querySelector('#cursor');
 let open=false;
 cursor.matches=s=>s===':popover-open'?open:w.Element.prototype.matches.call(cursor,s);
 cursor.showPopover=()=>{open=true;};
 cursor.hidePopover=()=>{open=false;};
 w.document.elementFromPoint=()=>w.document.getElementById('nav-link');
 w.sessionStorage.setItem('kamitsubaki-cursor-state',JSON.stringify({x:320,y:240}));
 w.eval('window.installCursorLayer='+installCursorLayer.toString());
 try{
  w.installCursorLayer(cursor);
  assert.equal(w.document.documentElement.hasAttribute('data-custom-cursor'),true,'restores custom cursor immediately on load without waiting for pointermove');
  assert.equal(cursor.style.visibility,'visible');
  assert.equal(cursor.style.getPropertyValue('--cursor-x'),'320px');
  assert.equal(cursor.style.getPropertyValue('--cursor-y'),'240px');
  assert.equal(cursor.classList.contains('hovering'),true,'immediately reflects interactive element under persisted coordinates');
  const down=new w.Event('pointerdown',{bubbles:true});Object.assign(down,{pointerType:'mouse',clientX:320,clientY:240});
  w.document.getElementById('nav-link').dispatchEvent(down);
  assert.equal(cursor.classList.contains('is-pressing'),true);
  w.dispatchEvent(new w.Event('blur'));
  assert.equal(cursor.classList.contains('is-pressing'),false,'blur releases press state');
  assert.equal(w.document.documentElement.hasAttribute('data-custom-cursor'),true,'blur does not revert to OS cursor');
 }finally{w.close();}
});
