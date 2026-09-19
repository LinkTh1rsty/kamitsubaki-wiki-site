import type { APIRoute } from 'astro';
import { getBuildCollection as getCollection } from '../../lib/contentAuditContext';
import { entrySourcePath } from '../../lib/editorSourceServer.mjs';
import { editorLocales } from '../../lib/editorSource.mjs';
export const prerender = true;
export function getStaticPaths() { return editorLocales.map(locale=>({params:{locale}})); }
export const GET: APIRoute = async ({params}) => {
  const kinds = ['artists','songs','albums','projects','logs'] as const;
  const groups = await Promise.all(kinds.map(async kind => (await getCollection(kind)).filter(entry=>entry.data.locale === params.locale).map(entry=>({kind,title:'name' in entry.data ? entry.data.name : entry.data.title,path:entrySourcePath(entry)}))));
  return new Response(JSON.stringify(groups.flat()),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
