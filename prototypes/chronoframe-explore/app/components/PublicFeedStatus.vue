<script setup lang="ts">
const feed=usePublicFeed()
</script>
<template>
 <div v-if="feed.state.loadingAll||feed.state.error" class="px-3 py-2 text-sm text-neutral-500" role="status" aria-live="polite">
  <span v-if="feed.state.loadingAll">正在准备全部筛选项（{{ feed.state.photos.length }} / {{ feed.state.total }}）…</span>
  <template v-else>{{ feed.state.error }} <UButton variant="link" size="sm" @click="feed.all">重试</UButton></template>
 </div>
</template>
