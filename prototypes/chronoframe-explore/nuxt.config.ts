import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  extends: ['./vendor/gallery'],
  workspaceDir: fileURLToPath(new URL('.', import.meta.url)),
  compatibilityDate: '2026-10-26',
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@pinia/nuxt', '@vueuse/nuxt', 'motion-v/nuxt', 'dayjs-nuxt', '@nuxtjs/i18n', 'nuxt-mapbox', 'nuxt-maplibre', 'nuxt-og-image', 'nuxt-gtag'],
  dir: { shared: 'vendor/gallery/shared' },
  imports: { dirs: ['vendor/gallery/app/composables', 'vendor/gallery/app/stores', 'vendor/gallery/app/utils'] },
  css: ['~/assets/fonts.css'],
  ui: { fonts: false },
  ogImage: { enabled: false },
  gtag: { enabled: false },
  colorMode: { preference: 'dark', fallback: 'dark', storageKey: 'wiki-explore-color-mode' },
  site: { url: 'https://kamitsubaki.wiki' },
  i18n: { baseUrl: 'https://kamitsubaki.wiki', defaultLocale: 'zh-Hans', detectBrowserLanguage: false },
  dayjs: { locales: ['zh-cn', 'zh-tw', 'zh-hk', 'en', 'ja', 'ru'], plugins: ['relativeTime', 'utc', 'timezone', 'duration', 'localizedFormat', 'isBetween'] },
  icon: { serverBundle: { collections: ['tabler', 'mdi'] }, clientBundle: { scan: { globInclude: [fileURLToPath(new URL('./vendor/gallery/app/**/*.{vue,ts}', import.meta.url))] } } },
  runtimeConfig: { public: { VERSION: 'Wiki 0.1.0', gallery: { apiBase: '/visuals', sourceUrl: 'https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/tree/main/prototypes/chronoframe-explore' }, app: { title: '神椿影像馆', author: 'KAMITSUBAKI Wiki', slogan: '从另一种视角，遇见神椿。', avatarUrl: '/visuals/wiki-avatar.svg' }, map: { provider: 'maplibre', mapbox: { style: '' }, maplibre: { token: '', style: '' } } } },
  nitro: { serverAssets: [{baseName:'gallery-thumbnails',dir:fileURLToPath(new URL('./server/assets/thumbnail-fallback',import.meta.url))}], preset: 'cloudflare-module', cloudflare: { deployConfig: true, nodeCompat: true, wrangler: { name: 'kamitsubaki-visual-roam', compatibility_date: '2026-10-26', observability: { enabled: false } } } },
  vite: { optimizeDeps: { include: ['maplibre-gl', 'file-type', 'swiper/modules', 'swiper/vue', 'tailwind-merge', 'thumbhash', 'dayjs', 'dayjs/locale/en', 'dayjs/locale/ja', 'dayjs/locale/ru', 'dayjs/locale/zh-cn', 'dayjs/locale/zh-hk', 'dayjs/locale/zh-tw', 'dayjs/plugin/duration', 'dayjs/plugin/updateLocale', 'dayjs/plugin/relativeTime', 'dayjs/plugin/utc', 'dayjs/plugin/timezone', 'dayjs/plugin/localizedFormat', 'dayjs/plugin/isBetween', '@indoorequal/vue-maplibre-gl', '@yeger/vue-masonry-wall'] }, ssr: { noExternal: ['@indoorequal/vue-maplibre-gl'] } },
  app: { baseURL: '/visuals/', head: { title: '神椿影像馆', htmlAttrs: { lang: 'zh-CN' }, link: [{ rel: 'icon', href: '/visuals/wiki-avatar.svg' }] } },
})
