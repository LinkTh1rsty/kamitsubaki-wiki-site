import type {FeedPage} from './usePublicFeed'
export function useAlbumFeed(initial:Ref<any>,albumId:Ref<number>){
 const state=reactive({photos:[] as Photo[],total:0,nextOffset:null as number|null,limit:48,loading:false,loadingAll:false,error:''})
 const api=useGalleryApi();let epoch=0
 let pending:Promise<void>|null=null
 watch(initial,value=>{epoch++;pending=null;Object.assign(state,{photos:value?.photos??[],total:value?.total??0,nextOffset:value?.nextOffset??null,limit:48,loading:false,loadingAll:false,error:''})},{immediate:true})
 function loadNext():Promise<void>{
  if(pending)return pending
  const work=readNext();pending=work
  void work.finally(()=>{if(pending===work)pending=null})
  return work
 }
 async function readNext(){
  if(state.loading||state.nextOffset===null)return
  const generation=epoch;state.loading=true;state.error=''
  try{const page=await api(`/api/albums/${albumId.value}?offset=${state.nextOffset}`,{timeout:20000}) as FeedPage
   if(generation!==epoch)return
   state.photos=[...new Map([...state.photos,...page.photos].map(p=>[p.id,p])).values()];state.total=page.total;state.nextOffset=page.nextOffset
  }catch{if(generation===epoch)state.error='相册暂时无法加载，请重试。'}finally{if(generation===epoch)state.loading=false}
 }
 async function all(){
  if(state.loadingAll)return
  const generation=epoch;state.loadingAll=true;state.error=''
  try{while(generation===epoch&&state.nextOffset!==null&&!state.error)await loadNext()}
  finally{if(generation===epoch)state.loadingAll=false}
 }
 let mounted=false
 onMounted(()=>{mounted=true;void all()})
 watch(initial,()=>{if(mounted)void all()},{flush:'post'})
 onScopeDispose(()=>{mounted=false;epoch++;pending=null;state.loading=false;state.loadingAll=false})
 async function reveal(){state.limit+=48;if(state.limit>state.photos.length)await loadNext()}
 return {state,reveal,loadNext,all,data:computed(()=>initial.value?{...initial.value,photos:state.photos.slice(0,state.limit)}:null)}
}
