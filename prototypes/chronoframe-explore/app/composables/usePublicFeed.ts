import type {Photo} from '@chronoframe/contracts/resources'
export interface FeedPage {photos:Photo[];total:number;offset:number;nextOffset:number|null}
export interface FeedState {photos:Photo[];total:number;nextOffset:number|null;limit:number;loading:boolean;loadingAll:boolean;error:string;epoch:number;initialized:boolean;stride:number;wantAll:boolean}
export function usePublicFeed(){
 const state=useState<FeedState>('wiki-public-catalog-v1',()=>({photos:[],total:0,nextOffset:0,limit:48,loading:false,loadingAll:false,error:'',epoch:0,initialized:false,stride:24,wantAll:false})).value
 const request=useRequestFetch(),baseURL=useRuntimeConfig().public.gallery.apiBase
 const read=(offset:number)=>request<FeedPage>('/api/catalog',{baseURL,query:{offset}})
 function merge(photos:Photo[]){state.photos=[...new Map([...state.photos,...photos].map(p=>[p.id,p])).values()]}
 async function next(){
  if(state.loading||state.loadingAll||state.nextOffset===null)return
  const epoch=state.epoch,offset=state.nextOffset;state.loading=true;state.error=''
  try{const page=await read(offset);if(epoch!==state.epoch)return
   merge(page.photos);state.total=page.total;state.nextOffset=page.nextOffset;state.initialized=true
   if(page.nextOffset!==null)state.stride=page.nextOffset-page.offset
  }catch{if(epoch===state.epoch)state.error='图片暂时无法加载，请重试。'}finally{if(epoch===state.epoch){state.loading=false;if(state.wantAll){state.wantAll=false;void all()}}}
 }
 async function all(){
  if(state.loadingAll)return
  if(state.loading){state.wantAll=true;return}
  state.error=''
  if(!state.initialized)await next()
  if(state.loading||state.loadingAll||state.nextOffset===null||state.error)return
  const epoch=state.epoch,start=state.nextOffset,stride=state.stride,total=state.total
  const offsets=Array.from({length:Math.ceil((total-start)/stride)},(_,i)=>start+i*stride)
  const completed=new Map<number,FeedPage>();let cursor=0,mergeOffset=start,failed=false
  state.loadingAll=true;state.error=''
  await Promise.allSettled(Array.from({length:Math.min(4,offsets.length)},async()=>{
   try{while(cursor<offsets.length&&state.epoch===epoch&&!failed){
    const offset=offsets[cursor++]!,page=await read(offset)
    if(state.epoch!==epoch)return
    completed.set(offset,page)
    const batch:Photo[]=[]
    while(completed.has(mergeOffset)){
     const ready=completed.get(mergeOffset)!
     completed.delete(mergeOffset);batch.push(...ready.photos);state.total=ready.total;state.nextOffset=ready.nextOffset
     if(ready.nextOffset===null)break
     mergeOffset=ready.nextOffset
    }
    if(batch.length)merge(batch)
   }}catch{failed=true}
  }))
  if(state.epoch!==epoch)return
  if(failed||state.nextOffset!==null)state.error='部分图片未能载入，请重试以完成筛选范围。'
  state.loadingAll=false
 }
 async function reveal(){state.limit+=48;if(state.nextOffset!==null&&state.limit>state.photos.length)await next()}
 async function refresh(){state.epoch++;state.photos=[];state.total=0;state.nextOffset=0;state.limit=48;state.loading=false;state.loadingAll=false;state.error='';state.initialized=false;state.wantAll=false;await next()}
 async function ensure(id:string){if(state.photos.some(p=>p.id===id))return
  const epoch=state.epoch
  try{const photo=await request<Photo>(`/api/photos/${encodeURIComponent(id)}`,{baseURL});if(epoch===state.epoch)merge([photo])}catch{}
 }
 return {state,next,all,reveal,refresh,ensure,merge}
}
