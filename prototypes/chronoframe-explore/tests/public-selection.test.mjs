import test from 'node:test'
import assert from 'node:assert/strict'
import {fetchPublicSelection,fetchPublishedItem,publicSelectionQueries} from '../server/utils/public-selection.mjs'
import {projectCollection,capturedAt} from '../server/utils/wiki-gallery.mjs'

const item={id:'published-1',title:'Published',src:'https://images.kamitsubaki.wiki/gallery/published-1/image',entityIds:['kaf'],width:800,height:1200}
test('live selection is bounded, deduplicated, anonymous and rejects unsafe media URLs',async()=>{
 const calls=[]
 const result=await fetchPublicSelection(async(url,options)=>{
  calls.push({url,options})
  return Response.json({total:1000,items:[item,{...item,id:'unsafe',src:'https://private.example/image'}]})
 })
 assert.equal(calls.length,publicSelectionQueries.length)
 assert.equal(result.items.length,1)
 assert.equal(result.sourceTotal,1000)
 for(const {url,options} of calls){assert.match(url,/^https:\/\/api\.kamitsubaki\.wiki\/api\/gallery\/items\?/);assert.equal(options.credentials,'omit');assert.equal(options.method,'GET');assert.deepEqual(options.headers,{Accept:'application/json'})}
 const collection=projectCollection(result.items)
 assert.match(collection.photos[0].originalUrl,/^\/visuals\/api\/media\//)
 assert.match(collection.photos[0].thumbnailUrl,/^\/visuals\/api\/media\/.+\/thumbnail$/)
 assert.equal(collection.photos[0].dateTaken,null)
 assert.equal(collection.albums[0].createdAt,capturedAt)
})
test('withdrawn or unavailable live records cannot fall back to bundled snapshot',async()=>{
 assert.equal(await fetchPublishedItem('published-1',async()=>new Response(null,{status:404})),null)
 await assert.rejects(fetchPublicSelection(async()=>new Response(null,{status:503})),/503/)
 await assert.rejects(fetchPublishedItem('published-1',async()=>new Response(null,{status:503})),/503/)
 assert.equal(await fetchPublishedItem('published-1',async()=>Response.json({item:{...item,id:'different'}})),null)
})
