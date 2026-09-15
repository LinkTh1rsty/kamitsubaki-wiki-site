import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { supportedLocales } from '../../lib/i18n.mjs';
import { readContentEntryBody } from '../../lib/contentSource.mjs';
import { foldCjkSearchText } from '../../lib/cjkSearch.mjs';
import {
  cleanIndexText,
  flattenIndexMetadata,
} from '../../lib/searchIndex.mjs';

export const prerender = true;

export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}

function buildSearchKey(metadata: string, body: string) {
  return foldCjkSearchText(cleanIndexText(`${metadata} ${body}`, 1100));
}

export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale || 'zh';
  const groups = await Promise.all([
    getCollection('artists'),
    getCollection('albums'),
    getCollection('songs'),
    getCollection('projects'),
    getCollection('logs'),
  ]);
  const collectionNames = ['artists', 'albums', 'songs', 'projects', 'logs'];
  const bodies: Record<string, string> = {};

  for (const [groupIndex, group] of groups.entries()) {
    for (const entry of group) {
      if (entry.data.locale !== locale) continue;

      const data = entry.data as Record<string, any>;
      const { body } = await readContentEntryBody(entry);
      const kind = collectionNames[groupIndex].replace(/s$/u, '');
      const metadata = flattenIndexMetadata(data).join(' ');
      const id = `${kind}:${entry.id}`;

      bodies[id] = buildSearchKey(metadata, body);
    }
  }

  return new Response(JSON.stringify({
    version: 1,
    schema: 'kamitsubaki-wiki-search-body',
    generatedAt: new Date().toISOString(),
    locale,
    bodies,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};

