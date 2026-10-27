import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
const source=readFileSync(new URL('../app/composables/usePublicFeed.ts',import.meta.url),'utf8')
function feed(fetchPage){
 const cells=new Map(),exports={}
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
 vm.runInNewContext(compiled,{exports,useState:(key,init)=>{if(!cells.has(key))cells.set(key,{value:init()});return cells.get(key)},useRequestFetch:()=>async(path,opts)=>fetchPage(opts.query?.offset,path),useRuntimeConfig:()=>({public:{gallery:{apiBase:'/visuals'}}})})
 return exports.usePublicFeed()
}
const page=(offset,total=100)=>({offset,total,photos:Array.from({length:Math.min(24,total-offset)},(_,i)=>({id:String(offset+i)})),nextOffset:offset+24<total?offset+24:null})
test('out-of-order catalog completion preserves order and retry resumes at the missing page',async()=>{
 let fail=true
 const catalog=feed(async offset=>{
  if(offset===48&&fail){fail=false;throw Error('temporarily unavailable')}
  await new Promise(resolve=>setTimeout(resolve,offset===24?8:1))
  return page(offset)
 })
 await catalog.next();await catalog.all()
 assert.ok(catalog.state.error)
 assert.equal(catalog.state.nextOffset,48)
 await catalog.all()
 assert.equal(catalog.state.error,'')
 assert.equal(catalog.state.nextOffset,null)
 assert.equal(catalog.state.photos.length,100)
 assert.equal(catalog.state.photos.map(p=>p.id).join(','),Array.from({length:100},(_,i)=>String(i)).join(','))
})
test('refresh prevents a late previous generation from restoring old photos',async()=>{
 let resolveOld,calls=0
 const catalog=feed(()=>++calls===1?new Promise(resolve=>{resolveOld=resolve}):Promise.resolve({offset:0,total:1,nextOffset:null,photos:[{id:'new'}]}))
 const old=catalog.next();await catalog.refresh()
 resolveOld({offset:0,total:1,nextOffset:null,photos:[{id:'withdrawn-old'}]});await old
 assert.equal(catalog.state.photos.map(p=>p.id).join(','),'new')
 assert.equal(catalog.state.loading,false)
})
test('opening filters while a page is in flight still completes the full catalog',async()=>{
 const catalog=feed(async offset=>{await new Promise(resolve=>setTimeout(resolve,1));return page(offset,52)})
 const initial=catalog.next();await catalog.all();await initial
 for(let i=0;i<30&&catalog.state.nextOffset!==null;i++)await new Promise(resolve=>setTimeout(resolve,2))
 assert.equal(catalog.state.nextOffset,null)
 assert.equal(catalog.state.photos.length,52)
})

test('refresh also rejects a late direct-photo detail from the previous generation',async()=>{
 let resolveDetail
 const catalog=feed((_offset,path)=>path.startsWith('/api/photos/')?new Promise(resolve=>{resolveDetail=resolve}):Promise.resolve(page(0,0)))
 const detail=catalog.ensure('withdrawn-old');await catalog.refresh()
 resolveDetail({id:'withdrawn-old'});await detail
 assert.equal(catalog.state.total,0)
 assert.equal(catalog.state.photos.length,0)
})

test('overlapping initialization shares one set of background metadata requests',async()=>{
 let resolveInitial;const calls=[]
 const catalog=feed(offset=>{calls.push(offset);return offset===0?new Promise(resolve=>{resolveInitial=resolve}):Promise.resolve(page(offset,52))})
 const first=catalog.all();const second=catalog.all();resolveInitial(page(0,52));await Promise.all([first,second])
 for(let i=0;i<20&&catalog.state.loadingAll;i++)await new Promise(resolve=>setTimeout(resolve,1))
 assert.deepEqual(calls,[0,24,48]);assert.equal(catalog.state.photos.length,52);assert.equal(catalog.state.nextOffset,null)
})
