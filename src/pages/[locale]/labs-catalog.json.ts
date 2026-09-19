import type { APIRoute } from 'astro';
import { getBuildCollection as getCollection } from '../../lib/contentAuditContext';
import { supportedLocales } from '../../lib/i18n.mjs';
import { getLocalizedEntries } from '../../lib/homeData.mjs';
import { buildLabsCatalog } from '../../lib/labsCatalog.mjs';
import { thumbnailUrl } from '../../lib/imageAssets.mjs';
export const prerender = true;
export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}
export const GET: APIRoute = async ({ params }) => {
  const locale = params.locale || 'zh';
  const kinds = ['artists', 'songs', 'albums', 'projects', 'logs'] as const;
  const groups = Object.fromEntries(
    await Promise.all(
      kinds.map(async (kind) => [
        kind,
        getLocalizedEntries(await getCollection(kind), locale),
      ]),
    ),
  );
  const catalog = buildLabsCatalog(groups, locale);
  for (const node of catalog.nodes) if (node.image) node.image = thumbnailUrl(node.image, 192);
  return new Response(JSON.stringify(catalog), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
