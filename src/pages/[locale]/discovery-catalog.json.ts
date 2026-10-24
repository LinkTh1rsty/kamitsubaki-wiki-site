import type { APIRoute } from 'astro';
import { getEntityRegistry, entityLocales } from '../../lib/entityRegistry.mjs';
import { loadFeatureData } from '../../lib/featureData.mjs';
import { buildDiscoveryCatalog } from '../../lib/discoveryCatalog.mjs';
import { loadDiscoveryArticles } from '../../lib/discoveryArticles.mjs';
export function getStaticPaths() { return entityLocales.map(locale => ({ params: { locale } })); }
export const GET: APIRoute = async ({ params }) => new Response(JSON.stringify(buildDiscoveryCatalog(await getEntityRegistry(), await loadFeatureData(), params.locale || 'zh', await loadDiscoveryArticles())),
  { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
