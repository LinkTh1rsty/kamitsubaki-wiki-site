import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {reactive,ref,computed,watch,nextTick} from 'vue'
const setup=readFileSync(new URL('../app/components/PublicFeedFooter.vue',import.meta.url),'utf8').split('<script setup lang="ts">')[1].split('</script>')[0]
function wall({available=1830,loaded=200,limit=48,error='',viewerOpen=false}={}){
 const state=reactive({photos:Array.from({length:loaded},(_,id)=>({id})),total:1830,nextOffset:loaded,loading:false,loadingAll:true,error,limit})
 let reveals=0;const mounted=[],frames=[],observers=[],exports={},viewer=reactive({isViewerOpen:viewerOpen})
 const props=reactive({feed:{state,reveal:async()=>{reveals++;state.limit+=48},all:async()=>{}},total:available,shown:Math.min(limit,available)})
 const compiled=ts.transpileModule(setup+'\nexports.harness={sentinel,extend};',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 class Observer{constructor(fn){this.fn=fn;observers.push(this)}observe(){this.fn([{isIntersecting:true}])}unobserve(){}disconnect(){}}
 vm.runInNewContext(compiled,{exports,defineProps:()=>props,ref,computed,watch,nextTick,useViewerState:()=>viewer,onMounted:fn=>mounted.push(fn),onUnmounted:()=>{},IntersectionObserver:Observer,requestAnimationFrame:fn=>{frames.push(fn);return frames.length},cancelAnimationFrame:()=>{},document:{hidden:false,addEventListener(){},removeEventListener(){}}})
 exports.harness.sentinel.value={};mounted.forEach(fn=>fn())
 return {state,props,viewer,frames,observers,get reveals(){return reveals}}
}
test('sparse filters never spend the render window on unrelated prepared photos',async()=>{
 const h=wall({available:0,loaded:1000});await nextTick();assert.equal(h.reveals,0);assert.equal(h.state.limit,48)
 h.props.total=5;await nextTick();assert.equal(h.reveals,0);assert.equal(h.state.limit,48)
 h.props.total=30;await nextTick();assert.equal(h.reveals,0);assert.equal(h.state.limit,48)
 h.props.total=1000;await nextTick();assert.equal(h.reveals,1);assert.equal(h.state.limit,96)
})
test('observer callbacks share one extension until layout frame completes',async()=>{
 const h=wall();h.observers[0].observe();h.observers[0].observe();await nextTick();assert.equal(h.reveals,1)
 h.props.total=0;await nextTick();h.frames.shift()?.();await nextTick();assert.equal(h.reveals,1)
})
test('metadata preparation, errors and the viewer do not trigger runaway mounting',async()=>{
 const waiting=wall({loaded:24});await nextTick();assert.equal(waiting.reveals,0)
 const failed=wall({error:'503'});await nextTick();assert.equal(failed.reveals,0)
 const viewing=wall({viewerOpen:true});await nextTick();assert.equal(viewing.reveals,0)
 viewing.viewer.isViewerOpen=false;await nextTick();assert.equal(viewing.reveals,1)
})
