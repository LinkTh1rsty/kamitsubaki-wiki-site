<script setup lang="ts">
interface State {photos:unknown[];total:number;nextOffset:number|null;loading:boolean;loadingAll?:boolean;error:string;limit:number}
const props=defineProps<{feed:{state:State;reveal:()=>Promise<void>;all:()=>Promise<void>};shown?:number;total?:number}>()
const sentinel=ref<HTMLElement>()
const viewer=useViewerState()
const available=computed(()=>Math.min(props.total??props.feed.state.photos.length,props.feed.state.photos.length))
const hasMore=computed(()=>(props.shown??Math.min(props.feed.state.limit,props.feed.state.photos.length))<(props.total??props.feed.state.total)||props.feed.state.nextOffset!==null)
let observer:IntersectionObserver|undefined,frame=0,mounted=false,near=false,busy=false
async function extend(){
 const state=props.feed.state
 if(!mounted||!near||busy||!hasMore.value||state.error||state.loading||viewer.isViewerOpen||document.hidden)return
 // Metadata preparation is independent of scrolling. Wait for available cards
 // rather than repeatedly growing the window while its page is still in flight.
 if(state.limit>=available.value)return
 busy=true
 try{await props.feed.reveal();await nextTick()}
 finally{if(mounted)frame=requestAnimationFrame(()=>{
  busy=false
  if(sentinel.value){observer?.unobserve(sentinel.value);observer?.observe(sentinel.value)}
 });else busy=false}
}
watch(()=>[props.feed.state.photos.length,props.feed.state.loading,props.feed.state.loadingAll,props.feed.state.error,props.shown,props.total,viewer.isViewerOpen],()=>{void extend()},{flush:'post'})
const resume=()=>{if(!document.hidden&&sentinel.value){observer?.unobserve(sentinel.value);observer?.observe(sentinel.value)}}
onMounted(()=>{
 mounted=true
 observer=new IntersectionObserver(([entry])=>{near=!!entry?.isIntersecting;void extend()},{rootMargin:'1800px 0px'})
 if(sentinel.value)observer.observe(sentinel.value)
 document.addEventListener('visibilitychange',resume)
})
onUnmounted(()=>{mounted=false;observer?.disconnect();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',resume)})
</script>
<template>
 <div ref="sentinel" class="min-h-px" aria-live="polite">
  <div v-if="feed.state.error" class="flex flex-col items-center gap-3 px-4 py-4 text-sm text-neutral-500"><span role="alert">{{ feed.state.error }}</span><UButton variant="soft" color="neutral" @click="props.feed.all">重新加载</UButton></div>
  <span v-else-if="(feed.state.loading||feed.state.loadingAll)&&hasMore" class="sr-only" role="status">正在加载…</span>
 </div>
</template>
