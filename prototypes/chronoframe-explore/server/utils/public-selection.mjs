import {boundedJSON} from './bounded-json.mjs'
const API='https://api.kamitsubaki.wiki/api/gallery'
// A bounded live selection, not an unbounded crawl of the entire archive.
export const publicSelectionQueries=['offset=0','entity=kaf','entity=rim','entity=harusaruhi','entity=isekaijoucho','entity=koko','entity=dustcell','type=portrait','type=promo','type=cover','type=event']
export function validPublicItem(item){
 if(!item||typeof item.id!=='string'||!/^[\w-]{1,160}$/.test(item.id))return false
 try{const url=new URL(item.src);return url.origin==='https://images.kamitsubaki.wiki'&&url.pathname.startsWith('/gallery/')&&!url.username&&!url.password&&!url.search&&!url.hash}catch{return false}
}
async function readPublic(path,fetcher){
 const response=await fetcher(API+path,{method:'GET',credentials:'omit',redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw new Error(`Public gallery returned ${response.status}`)
 const declared=Number(response.headers.get('content-length')||0)
 if(declared>2_000_000){await response.body?.cancel();throw new Error('Public response too large')}
 return boundedJSON(response)
}
export async function fetchPublicSelection(fetcher=fetch){
 const pages=await Promise.all(publicSelectionQueries.map(query=>readPublic('/items?'+query,fetcher)))
 const rows=new Map()
 for(const page of pages){
  if(!Array.isArray(page.items)||page.items.length>100)throw new Error('Invalid public gallery response')
  for(const item of page.items)if(validPublicItem(item))rows.set(item.id,item)
 }
 return {items:[...rows.values()],sourceTotal:pages[0].total??null,queriedAt:new Date().toISOString(),mode:'live-public-selection'}
}
export async function fetchPublishedItem(id,fetcher=fetch){
 if(!/^[\w-]{1,160}$/.test(id))return null
 const response=await fetcher(API+'/items/'+encodeURIComponent(id),{method:'GET',credentials:'omit',redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)})
 if(response.status===404){await response.body?.cancel();return null}
 if(!response.ok){await response.body?.cancel();throw new Error(`Public item returned ${response.status}`)}
 const payload=await boundedJSON(response),item=payload.item
 return validPublicItem(item)&&item.id===id?item:null
}
