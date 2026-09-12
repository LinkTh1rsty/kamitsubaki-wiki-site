import type { APIRoute } from 'astro';
import type { CollectionEntry } from 'astro:content';
import { getCollection } from 'astro:content';
import { supportedLocales } from '../../lib/i18n.mjs';
import {
  buildContentIndex,
  dedupeIssues,
  detectEntryIssues,
} from '../../lib/missingData.mjs';

export const prerender = true;

type ContentCollectionName = 'songs' | 'albums' | 'artists';
type AnyMusicEntry =
  | CollectionEntry<'songs'>
  | CollectionEntry<'albums'>
  | CollectionEntry<'artists'>;
type MissingIssue = { kind: string; severity: 'info' | 'warning'; refs?: string[] };

export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}

function splitIdPath(entryId: string) {
  const parts = String(entryId).split('/');
  parts.pop();
  return parts.join('/');
}

export const GET: APIRoute = async () => {
  const [songs, albums, artists] = await Promise.all([
    getCollection('songs'),
    getCollection('albums'),
    getCollection('artists'),
  ]);

  const index = buildContentIndex({ songs, albums, artists });
  const byCollection = new Map<ContentCollectionName, Map<string, MissingIssue[]>>();
  const groups: Array<[ContentCollectionName, AnyMusicEntry[]]> = [
    ['songs', songs],
    ['albums', albums],
    ['artists', artists],
  ];

  for (const [collection, entries] of groups) {
    if (!byCollection.has(collection)) byCollection.set(collection, new Map());
    const byIdPath = byCollection.get(collection)!;

    for (const entry of entries) {
      const idPath = splitIdPath(entry.id);
      if (!idPath) continue;
      if (!byIdPath.has(idPath)) byIdPath.set(idPath, []);
      byIdPath.get(idPath)!.push(
        ...detectEntryIssues({
          collection,
          entry: entry as { id: string; data?: Record<string, unknown> },
          index,
        }),
      );
    }
  }

  const results: Array<{
    idPath: string;
    collection: ContentCollectionName;
    issues: Array<{ kind: string; refs?: string[] }>;
  }> = [];

  for (const [collection, byIdPath] of byCollection) {
    for (const [idPath, issues] of byIdPath) {
      const unique = dedupeIssues(issues);
      if (unique.length === 0) continue;
      results.push({
        idPath,
        collection,
        issues: unique.map((issue) => (
          issue.refs?.length
            ? { kind: issue.kind, refs: issue.refs }
            : { kind: issue.kind }
        )),
      });
    }
  }

  results.sort((a, b) => (
    a.collection.localeCompare(b.collection) || a.idPath.localeCompare(b.idPath)
  ));

  return new Response(JSON.stringify({ entries: results }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
