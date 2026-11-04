<script setup lang="ts">
// The stable original randomizes its waterfall on mount. Render that original
// component on the client to keep SSR's desktop guess out of the mobile tree.
// This wrapper changes neither its template, styles nor motion logic.
</script>
<template><ClientOnly><AlbumListing /></ClientOnly></template>
