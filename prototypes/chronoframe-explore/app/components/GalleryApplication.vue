<script setup lang="ts">
import dayjsLocale_zhCN from 'dayjs/locale/zh-cn'
import dayjsLocale_zhTW from 'dayjs/locale/zh-tw'
import dayjsLocale_zhHK from 'dayjs/locale/zh-hk'

const dayjs = useDayjs()
const colorMode = useColorMode()
const localeRef = ref('en')
try {
  const { locale } = useI18n()
  watch(
    locale,
    (value) => {
      localeRef.value = value
    },
    { immediate: true },
  )
} catch {
  // i18n context may be unavailable during early server-side error rendering
}

// 初始化设置系统 - 一次性加载所有设置
const settingsStore = useSettingsStore()
await settingsStore.initSettings()

const appTitle = useSettingRef('app:title')

colorMode.preference = useSettingRef('app:appearance.theme').value as string

useHead({
  htmlAttrs: { lang: localeRef },
  titleTemplate: (title) =>
    `${title ? title + ' | ' : ''}${appTitle.value || 'ChronoFrame'}`,
})

// 根据用户登录状态和当前路由决定使用哪个 API
// 登录用户或后台管理页面显示所有照片，未登录用户在前端页面只显示可见照片
const route = useRoute()
const { loggedIn } = useUserSession()
const apiEndpoint = computed(() => {
  // 后台管理页面始终显示所有照片
  if (route.path.startsWith('/dashboard')) {
    return '/api/photos'
  }
  // 前端页面：登录用户显示所有照片，未登录用户只显示可见照片
  return loggedIn.value ? '/api/photos' : '/api/photos/visible'
})
const feed=usePublicFeed()
if(!feed.state.initialized)await feed.next()
if(import.meta.client){
 let checked=Date.now()
 const revalidate=()=>{if(!document.hidden&&Date.now()-checked>60000){checked=Date.now();void feed.refresh().then(()=>{if(['/', '/photos'].includes(route.path)&&!feed.state.error)void feed.all()})}}
 onMounted(()=>document.addEventListener('visibilitychange',revalidate))
 onUnmounted(()=>document.removeEventListener('visibilitychange',revalidate))
}
// Match upstream's complete metadata list without blocking the first paint.
const catalogMounted=ref(false)
onMounted(()=>{catalogMounted.value=true})
watch([catalogMounted,()=>route.path],([mounted,path])=>{
 if(mounted&&['/','/photos'].includes(path)&&!feed.state.error)void feed.all()
},{immediate:true})
const photos=computed(()=>feed.state.photos)
const refresh=feed.refresh
const status=computed(()=>feed.state.loading?'pending':feed.state.error?'error':'success')
watch(()=>route.params.slug,async slug=>{const id=Array.isArray(slug)?slug[0]:slug;if(typeof id==='string'&&/^[\w-]+$/.test(id))await feed.ensure(id)},{immediate:true})
await useInstanceOpenGraph(photos)

const {
  viewerPhotos,
  currentPhotoIndex,
  isViewerOpen,
  handleClose,
  handleIndexChange,
} = useGalleryViewer(photos)

watchEffect(() => {
  dayjs.locale('zh-Hans', dayjsLocale_zhCN)
  dayjs.locale('zh-Hant-TW', dayjsLocale_zhTW)
  dayjs.locale('zh-Hant-HK', dayjsLocale_zhHK)
  dayjs.locale(localeRef.value)
})

// 在全局级别提供筛选功能的状态管理
provide(
  'photosFiltering',
  reactive({
    activeFilters: {
      tags: [],
      cameras: [],
      lenses: [],
      cities: [],
      ratings: [],
    },
  }),
)
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />
    <PhotosProvider
      :photos="photos"
      :refresh="refresh"
      :status="status"
    >
      <slot />
      <ClientOnly>
        <slot name="overlays" />
        <PhotoViewer
          :photos="viewerPhotos"
          :current-index="currentPhotoIndex"
          :is-open="isViewerOpen"
          @close="handleClose"
          @index-change="handleIndexChange"
        />
      </ClientOnly>
    </PhotosProvider>
  </UApp>
</template>

<style></style>
