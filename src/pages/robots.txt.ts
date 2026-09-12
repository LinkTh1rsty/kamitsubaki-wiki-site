import type { APIRoute } from 'astro';
import { productionOrigin } from '../lib/searchMetadata.mjs';

export const GET: APIRoute = ({ site }) => new Response(
  `User-agent: *\nAllow: /\n\nSitemap: ${site?.origin || productionOrigin}/sitemap.xml\n`,
  { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
