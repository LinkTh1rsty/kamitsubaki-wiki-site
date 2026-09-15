import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { supportedLocales } from '../../lib/i18n.mjs';
import { readContentEntryBody } from '../../lib/contentSource.mjs';
import { foldCjkSearchText } from '../../lib/cjkSearch.mjs';
import {
  buildIndexAliases,
  buildIndexDescription,
  buildIndexStats,
  cleanIndexText,
  extractIndexHeadings,
} from '../../lib/searchIndex.mjs';

export const prerender = true;

export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}

function articleRoute(collection: string, id: string) {
  const parts = id.split('/');
  const locale = parts.pop() || 'zh';
  return `/${locale}/${collection}/${parts.join('/')}/`;
}

function titleFor(entry: { data: Record<string, unknown> }) {
  return cleanIndexText(
    entry.data.name || entry.data.title || entry.data.heading || entry.data.translationKey || '',
    180,
  );
}

// Body full-text keys live in search-body.json; this index stays lightweight.
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
  const entries = [];

  for (const [groupIndex, group] of groups.entries()) {
    for (const entry of group) {
      if (entry.data.locale !== locale) continue;

      const data = entry.data as Record<string, any>;
      const { body } = await readContentEntryBody(entry);
      const kind = collectionNames[groupIndex].replace(/s$/u, '');
      const title = titleFor(entry as { data: Record<string, unknown> });
      const aliases = buildIndexAliases(data);
      const description = buildIndexDescription(data, body);
      const headings = extractIndexHeadings(body);
      const path = articleRoute(collectionNames[groupIndex], entry.id);

      entries.push({
        id: `${kind}:${entry.id}`,
        title,
        aliases,
        path,
        locale,
        kind,
        description,
        titleKey: foldCjkSearchText(title),
        aliasKey: foldCjkSearchText(aliases.join(' ')),
        descriptionKey: foldCjkSearchText(description),
        headingKey: foldCjkSearchText(headings.join(' ')),
      });
    }
  }

  return new Response(JSON.stringify({
    version: 1,
    schema: 'kamitsubaki-wiki-search-index',
    generatedAt: new Date().toISOString(),
    stats: buildIndexStats(entries),
    entries,
  }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
