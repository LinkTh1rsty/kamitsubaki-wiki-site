import workspaceBoundary from './scripts/workspace-boundary.mjs';
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import searchIndex from './scripts/search-index-integration.mjs';
import pagefind from './scripts/pagefind-integration.mjs';
import localPagefind from './scripts/local-pagefind-plugin.mjs';
import {visualExplorerProxy} from './scripts/visual-explorer-proxy.mjs';
import { productionOrigin } from './src/lib/searchMetadata.mjs';

import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { siteMarkdownOptions } from './src/lib/markdown.mjs';
import thumbnails from './scripts/thumbnail-integration.mjs';

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), 'PUBLIC_');
const stableFontDisplay=()=>({
  name:'wiki-stable-font-display',enforce:'pre',
  transform(source,id){
    if(!id.includes('/@fontsource-variable/')||!id.endsWith('.css'))return;
    return {code:source.replaceAll('font-display: swap','font-display: block'),map:null};
  },
  generateBundle(_options,bundle){
    for(const asset of Object.values(bundle)){
      if(asset.type==='asset'&&asset.fileName.endsWith('.css')&&typeof asset.source==='string'&&asset.source.includes('Noto Sans SC Variable'))
        asset.source=asset.source.replaceAll('font-display:swap','font-display:block');
    }
  }
});

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || PUBLIC_SITE_URL || productionOrigin,
  output: 'static',
  cacheDir: process.env.WIKI_ASTRO_CACHE_DIR,
  integrations: [thumbnails(), searchIndex(), pagefind()],
  vite: {
    // Separate caches when running an isolated preview beside the main dev server.
    cacheDir: process.env.VITE_CACHE_DIR,
    server: { strictPort: process.env.ONLINE_INTEGRATION === 'true', proxy: visualExplorerProxy() },
    plugins: [workspaceBoundary(),localPagefind(),stableFontDisplay(),tailwindcss()],
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified(siteMarkdownOptions),
  },
});
