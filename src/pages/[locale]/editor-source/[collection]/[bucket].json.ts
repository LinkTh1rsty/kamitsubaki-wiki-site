import type { APIRoute } from 'astro';
import { getBuildCollection as getCollection } from '../../../../lib/contentAuditContext';
import { entrySourcePath, readEditorSource } from '../../../../lib/editorSourceServer.mjs';
import { editorCollections, editorLocales, sourceBucket } from '../../../../lib/editorSource.mjs';
export const prerender = true;
export function getStaticPaths() {
  return editorLocales.flatMap(locale => editorCollections.flatMap(collection => Array.from({length:8},(_,bucket)=>({params:{locale,collection,bucket:String(bucket)}}))));
}
export const GET: APIRoute = async ({params}) => {
  const collection = params.collection as 'artists'|'songs'|'albums'|'projects'|'logs';
  const entries = (await getCollection(collection)).filter(entry => entry.data.locale === params.locale);
  const files: Record<string,string> = {};
  const selected = entries.map(entry => ({entry,path:entrySourcePath(entry)})).filter(({path}) => sourceBucket(path) === params.bucket && path.startsWith(`src/content/${collection}/`));
  for (let i = 0; i < selected.length; i += 16) {
    await Promise.all(selected.slice(i,i+16).map(async ({path}) => { files[path] = await readEditorSource(path); }));
  }
  return new Response(JSON.stringify({files}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
