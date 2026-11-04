import {boundedJSON} from './bounded-json.mjs'
import {validPublicItem} from './public-selection.mjs'
const API='https://api.kamitsubaki.wiki/api/gallery/items'
export function pageOffset(value=0){
 const offset=Number(value)
 if(!Number.isSafeInteger(offset)||offset<0||offset>100000)throw new Error('Invalid page offset')
 return offset
}
export async function fetchPublicPage({offset=0,entity='',type=''}={},fetcher=fetch){
 offset=pageOffset(offset)
 if((entity&&!/^[a-z0-9-]{1,80}$/.test(entity))||(type&&!/^[a-z-]{1,40}$/.test(type)))throw new Error('Invalid collection')
 const query=new URLSearchParams({offset:String(offset)});if(entity)query.set('entity',entity);if(type)query.set('type',type)
 const response=await fetcher(API+'?'+query,{method:'GET',credentials:'omit',redirect:'manual',headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)})
 if(!response.ok){await response.body?.cancel();throw new Error(`Public page unavailable (${response.status})`)}
 const data=await boundedJSON(response)
 if(!Array.isArray(data.items)||data.items.length>100||!Number.isSafeInteger(data.total)||data.total<0||data.total>100000)throw new Error('Invalid public page')
 const nextOffset=data.nextOffset==null?null:pageOffset(data.nextOffset)
 if(nextOffset!==null&&(nextOffset<=offset||nextOffset>data.total||!data.items.length))throw new Error('Non-progressing public page')
 if(!data.items.every(validPublicItem))throw new Error('Public page contains unsafe media')
 return {items:data.items,total:data.total,nextOffset,offset,queriedAt:new Date().toISOString()}
}
