import type { APIRoute, GetStaticPaths } from 'astro';
import { getBuildCollection as getCollection } from '../../../lib/contentAuditContext';
import {
  aiIndexCollections,
  buildAiIndexEntries,
  buildAiIndexShardDescriptors,
} from '../../../lib/aiIndex.mjs';
import { supportedLocales } from '../../../lib/i18n.mjs';
import { buildIndexStats } from '../../../lib/searchIndex.mjs';

export const prerender = true;

type AiIndexCollection = 'artists' | 'albums' | 'songs' | 'projects' | 'logs';
type AiIndexShardDescriptor = { locale: string; collection: AiIndexCollection };

const collectionLoaders = {
  artists: () => getCollection('artists'),
  albums: () => getCollection('albums'),
  songs: () => getCollection('songs'),
  projects: () => getCollection('projects'),
  logs: () => getCollection('logs'),
} satisfies Record<AiIndexCollection, () => Promise<unknown[]>>;

// globalThis-backed so page-module re-evaluation cannot drop the shared snapshot.
const SHARED_KEY = Symbol.for('kamitsubaki.aiIndex.collectionCache');

function sharedCache(): Map<AiIndexCollection, Promise<unknown[]>> {
  const globalCache = globalThis as typeof globalThis & { [SHARED_KEY]?: Map<AiIndexCollection, Promise<unknown[]>> };
  globalCache[SHARED_KEY] ??= new Map();
  return globalCache[SHARED_KEY]!;
}

function loadAiIndexCollection(collection: AiIndexCollection) {
  const cache = sharedCache();
  let pending = cache.get(collection);
  if (!pending) {
    pending = collectionLoaders[collection]() as Promise<unknown[]>;
    cache.set(collection, pending);
  }
  return pending;
}

export const getStaticPaths: GetStaticPaths = () => buildAiIndexShardDescriptors(supportedLocales).map(
  ({ locale, collection }: AiIndexShardDescriptor) => ({ params: { locale, collection } }),
);

export const GET: APIRoute = async ({ params, site }) => {
  const locale = params.locale || 'zh';
  const requestedCollection = params.collection;

  if (
    !supportedLocales.includes(locale)
    || !requestedCollection
    || !aiIndexCollections.includes(requestedCollection)
  ) {
    return new Response('Not found', { status: 404 });
  }

  const collection = requestedCollection as AiIndexCollection;
  const origin = (import.meta.env.PUBLIC_SITE_URL || site?.origin || 'https://kamitsubaki.wiki').replace(/\/$/u, '');
  const entries = await buildAiIndexEntries(await loadAiIndexCollection(collection), { collection, locale, origin });

  return new Response(JSON.stringify({
    version: 3,
    schema: 'kamitsubaki-wiki-ai-index-shard',
    generatedAt: new Date().toISOString(),
    manifest: '/ai-index.json',
    locale,
    collection,
    kind: collection.replace(/s$/u, ''),
    stats: buildIndexStats(entries),
    entries,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
