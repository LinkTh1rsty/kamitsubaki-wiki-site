import test from 'node:test'
import assert from 'node:assert/strict'
import {fetchPublicPage,pageOffset} from '../server/utils/public-page.mjs'
const make=id=>({id:`photo-${id}`,src:`https://images.kamitsubaki.wiki/gallery/photo-${id}/original`})

test('all public records beyond the former selection are reachable through advancing page offsets',async()=>{
 const calls=[],all=[]
 const fake=async(url,options)=>{
  assert.equal(options.method,'GET');assert.equal(options.credentials,'omit');assert.equal(options.headers.Cookie,undefined)
  const offset=Number(new URL(url).searchParams.get('offset'));calls.push(offset)
  return Response.json({items:Array.from({length:Math.min(24,245-offset)},(_,i)=>make(offset+i)),total:245,nextOffset:offset+24<245?offset+24:null})
 }
 let offset=0
 do{const page=await fetchPublicPage({offset},fake);all.push(...page.items);offset=page.nextOffset}while(offset!==null)
 assert.equal(all.length,245);assert.equal(new Set(all.map(p=>p.id)).size,245);assert.deepEqual(calls,[0,24,48,72,96,120,144,168,192,216,240])
})
test('public paging fails closed for cycles, unsafe media, oversized responses, redirects and invalid offsets',async()=>{
 for(const value of [-1,1.5,100001,'private'])assert.throws(()=>pageOffset(value))
 await assert.rejects(fetchPublicPage({offset:24},async()=>Response.json({items:[make(1)],total:99,nextOffset:24})),/Non-progressing/)
 await assert.rejects(fetchPublicPage({},async()=>Response.json({items:[{id:'private',src:'https://private.example/image'}],total:1,nextOffset:null})),/unsafe/)
 await assert.rejects(fetchPublicPage({},async()=>new Response('x'.repeat(2_000_001))),/exceeds/)
 await assert.rejects(fetchPublicPage({},async()=>new Response(null,{status:302})),/unavailable/)
 await assert.rejects(fetchPublicPage({},async()=>new Response(null,{status:503})),/unavailable/)
})
