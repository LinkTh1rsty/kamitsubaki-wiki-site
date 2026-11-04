import test from 'node:test'
import assert from 'node:assert/strict'
import {ref,nextTick,watch} from 'vue'
import {stableWindow} from './photo-window-helper.mjs'
test('preparing offscreen metadata does not force an upstream masonry redraw',async()=>{
 const photos=ref([{id:'a'},{id:'b'}]),limit=ref(2),visible=stableWindow(()=>photos.value,()=>limit.value)
 let redraws=0;watch(visible,()=>redraws++)
 const before=visible.value;photos.value=[...photos.value,{id:'c'}];await nextTick()
 assert.equal(visible.value,before);assert.equal(redraws,0)
 limit.value=3;await nextTick();assert.equal(redraws,1);assert.equal(visible.value.length,3)
})
test('filter, order and visible metadata changes still redraw the wall',async()=>{
 const photos=ref([{id:'a'},{id:'b'}]),limit=ref(2),visible=stableWindow(()=>photos.value,()=>limit.value)
 const before=visible.value;photos.value=[photos.value[1],photos.value[0]];await nextTick();assert.notEqual(visible.value,before)
 const sorted=visible.value;photos.value=[{id:'b',title:'updated'},photos.value[1]];await nextTick();assert.notEqual(visible.value,sorted)
 photos.value=[];await nextTick();assert.equal(visible.value.length,0)
})
