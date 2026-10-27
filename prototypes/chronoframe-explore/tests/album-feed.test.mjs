import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import {reactive,ref,watch,computed,nextTick} from 'vue'
const source=readFileSync(new URL('../app/composables/useAlbumFeed.ts',import.meta.url),'utf8')
function albumFeed(api){
 const mounted=[],disposed=[],exports={},initial=ref({photos:[{id:'first'}],total:3,nextOffset:1}),id=ref(1)
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(compiled,{exports,reactive,watch,computed,onMounted:fn=>mounted.push(fn),onScopeDispose:fn=>disposed.push(fn),useGalleryApi:()=>api})
 return {feed:exports.useAlbumFeed(initial,id),initial,id,mount:()=>mounted.forEach(fn=>fn()),dispose:()=>disposed.forEach(fn=>fn())}
}
test('album page failure clears loading and retry keeps its cursor',async()=>{
 let fail=true
 const {feed}=albumFeed(async(path,options)=>{
  assert.equal(options.timeout,20000)
  assert.equal(path,'/api/albums/1?offset=1')
  if(fail){fail=false;throw Error('503')}
  return {photos:[{id:'second'},{id:'third'}],total:3,nextOffset:null}
 })
 await feed.reveal();assert.equal(feed.state.loading,false);assert.ok(feed.state.error);assert.equal(feed.state.nextOffset,1)
 await feed.reveal();assert.equal(feed.state.error,'');assert.equal(feed.state.nextOffset,null);assert.equal(feed.data.value.photos.map(p=>p.id).join(','),'first,second,third')
})
test('a late old album page cannot replace a newly resolved album',async()=>{
 let resolvePage
 const {feed,initial,id}=albumFeed(()=>new Promise(resolve=>{resolvePage=resolve}))
 const pending=feed.reveal();id.value=2;initial.value={photos:[{id:'new-album'}],total:1,nextOffset:null};await nextTick()
 resolvePage({photos:[{id:'old-album'}],total:2,nextOffset:null});await pending
 assert.equal(feed.state.photos.map(p=>p.id).join(','),'new-album');assert.equal(feed.state.loading,false)
})

test('album metadata stays prepared while the wall mounts only its current window',async()=>{
 const {feed}=albumFeed(async path=>{const offset=Number(path.split('offset=')[1]);return {photos:[{id:'photo-'+offset}],total:75,nextOffset:offset+1<75?offset+1:null}})
 for(let i=0;i<74;i++)await feed.loadNext()
 assert.equal(feed.state.photos.length,75)
 assert.equal(feed.state.nextOffset,null)
 assert.equal(feed.data.value.photos.length,48)
 await feed.reveal()
 assert.equal(feed.data.value.photos.length,75)
})

 test('automatic album metadata starts only after mount and shares in-flight pages with deep links',async()=>{
 let calls=0,resolvePage
 const {feed,mount}=albumFeed(()=>{calls++;return new Promise(resolve=>{resolvePage=resolve})})
 assert.equal(calls,0)
 const deep=feed.loadNext();mount();assert.equal(calls,1)
 resolvePage({photos:[{id:'second'},{id:'third'}],total:3,nextOffset:null});await deep
 await new Promise(resolve=>setTimeout(resolve,0))
 assert.equal(feed.state.photos.length,3);assert.equal(feed.state.loadingAll,false)
 })
 test('automatic album load stops on failure until explicitly retried',async()=>{
 let calls=0
 const {feed,mount}=albumFeed(async()=>{calls++;if(calls===1)throw Error('503');return {photos:[{id:'second'},{id:'third'}],total:3,nextOffset:null}})
 mount();await new Promise(resolve=>setTimeout(resolve,0));assert.equal(calls,1);assert.ok(feed.state.error)
 await feed.all();assert.equal(calls,2);assert.equal(feed.state.photos.length,3);assert.equal(feed.state.error,'')
 })

 test('leaving an album stops automatic preparation and rejects the pending page',async()=>{
 let calls=0,resolvePage
 const {feed,mount,dispose}=albumFeed(()=>{calls++;return new Promise(resolve=>{resolvePage=resolve})})
 mount();assert.equal(calls,1);dispose();resolvePage({photos:[{id:'late'}],total:100,nextOffset:2})
 await new Promise(resolve=>setTimeout(resolve,0))
 assert.equal(calls,1);assert.equal(feed.state.photos.map(p=>p.id).join(','),'first');assert.equal(feed.state.loadingAll,false)
 })
