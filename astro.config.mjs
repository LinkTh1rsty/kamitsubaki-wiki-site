import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import searchIndex from './scripts/search-index-integration.mjs';
import { productionOrigin } from './src/lib/searchMetadata.mjs';

import { unified } from '@astrojs/markdown-remark';
import tailwindcss from '@tailwindcss/vite';
import { siteMarkdownOptions } from './src/lib/markdown.mjs';
import thumbnails from './scripts/thumbnail-integration.mjs';

const { PUBLIC_SITE_URL } = loadEnv(process.env.NODE_ENV || 'production', process.cwd(), 'PUBLIC_');

export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || PUBLIC_SITE_URL || productionOrigin,
  output: 'static',
  integrations: [thumbnails(), searchIndex()],
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    syntaxHighlight: false,
    processor: unified(siteMarkdownOptions),
  },
});
