import type { APIRoute } from 'astro';
import { getBuildCollection as getCollection } from '../lib/contentAuditContext';
import {
  aiIndexCollections,
  buildAiIndexEntries,
  buildAiIndexShardDescriptors,
} from '../lib/aiIndex.mjs';
import { supportedLocales } from '../lib/i18n.mjs';

export const prerender = true;

type AiIndexCollection = 'artists' | 'albums' | 'songs' | 'projects' | 'logs';

type CompatibilityEntry = {
  title: string;
  text: string;
  url: string;
  locale: string;
};

const compatibilityTextLimit = 2400;

const collectionLoaders = {
  artists: () => getCollection('artists'),
  albums: () => getCollection('albums'),
  songs: () => getCollection('songs'),
  projects: () => getCollection('projects'),
  logs: () => getCollection('logs'),
} satisfies Record<AiIndexCollection, () => Promise<unknown[]>>;

export const GET: APIRoute = async ({ site }) => {
  const shards = buildAiIndexShardDescriptors(supportedLocales);
  const origin = (import.meta.env.PUBLIC_SITE_URL || site?.origin || 'https://kamitsubaki.wiki').replace(/\/$/u, '');
  const entries: CompatibilityEntry[] = [];

  // Keep only the fields consumed by the deployed v2 reader. Full metadata
  // remains available in shards without pushing this compatibility asset over
  // the Cloudflare Pages per-file limit.
  for (const collection of aiIndexCollections as readonly AiIndexCollection[]) {
    const group = await collectionLoaders[collection]();
    for (const locale of supportedLocales) {
      const shardEntries = await buildAiIndexEntries(group, { collection, locale, origin });
      entries.push(...shardEntries.map(({ title, text, url, locale: entryLocale }) => ({
        title,
        text: text.slice(0, compatibilityTextLimit),
        url,
        locale: entryLocale,
      })));
    }
  }

  return new Response(JSON.stringify({
    version: 3,
    schema: 'kamitsubaki-wiki-ai-index',
    generatedAt: new Date().toISOString(),
    layout: 'locale-collection-shards',
    shardCount: shards.length,
    locales: supportedLocales,
    collections: aiIndexCollections,
    shards,
    compatibility: 'v2-compact-entries',
    entries,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
