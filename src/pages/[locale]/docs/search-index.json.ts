import type {APIRoute} from 'astro';
import {supportedLocales} from '../../../lib/i18n.mjs';
import {getManualSearchIndex} from '../../../lib/docsCenter.mjs';
export const prerender=true;
export function getStaticPaths(){return supportedLocales.map(locale=>({params:{locale}}));}
export const GET: APIRoute=async({params})=>{
 return new Response(JSON.stringify(await getManualSearchIndex(params.locale||'zh')),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
