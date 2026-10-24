import type {APIRoute} from 'astro';
import {getEntityRegistry,entityLocales} from '../../lib/entityRegistry.mjs';
import {buildKnowledgeReport,knowledgeIssue} from '../../lib/knowledgeStatus.mjs';
export function getStaticPaths(){return entityLocales.map(locale=>({params:{locale}}));}
export const GET:APIRoute=async({params})=>{
 const locale=params.locale||'zh';const report=buildKnowledgeReport(await getEntityRegistry(),locale);
 const entries=report.entries.map(e=>({id:e.id,path:e.path,entityType:e.entityType,score:e.score,issues:e.missing.map(item=>knowledgeIssue(item,locale))}));
 return new Response(JSON.stringify({version:2,locale,summary:report.summary,fields:report.fields,entries}),{headers:{'Content-Type':'application/json; charset=utf-8'}});
};
