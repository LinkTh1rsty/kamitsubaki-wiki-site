import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getLocalizedEntries } from '../../lib/homeData.mjs';
import { buildCatalogIndex } from '../../lib/catalogIndex.mjs';
import { defaultLocale, supportedLocales } from '../../lib/i18n.mjs';

export const prerender = true;

export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}

export const GET: APIRoute = async ({ params }) => {
  const requestedLocale = params.locale ?? defaultLocale;
  const locale = supportedLocales.includes(requestedLocale) ? requestedLocale : defaultLocale;
  const [songs, albums, artists] = await Promise.all([
    getCollection('songs'),
    getCollection('albums'),
    getCollection('artists'),
  ]);

  const index = buildCatalogIndex({
    locale,
    songs: getLocalizedEntries(songs, locale, defaultLocale),
    albums: getLocalizedEntries(albums, locale, defaultLocale),
    artists: getLocalizedEntries(artists, locale, defaultLocale),
  });

  return new Response(JSON.stringify(index), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
