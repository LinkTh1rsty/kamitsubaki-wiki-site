import legacyArticles from '../data/article-legacy.json' with {type:'json'};
import {entityRoute,entityEdges,authorableRelations} from './entityModel.mjs';
import {convertChineseContentValue} from './traditionalChinese.mjs';
import {canonicalEntityEntry,resolveSharedEntityData} from './sharedEntityFacts.mjs';
export function createEntityRegistry(entries,redirects={}){
 const entities=new Map(),incoming=new Map(),outgoing=new Map(),routes=new Map(Object.entries(redirects));
 for(const entry of entries){const d=entry.data;if(d.schemaVersion!==2)continue;let group=entities.get(d.id);if(!group){group=new Map();entities.set(d.id,group);}if(group.has(d.locale))throw Error(`Duplicate entity ${d.id}/${d.locale}`);group.set(d.locale,entry);}
 function resolveEntity(id,locale='zh'){
  const group=entities.get(id);if(!group){const legacy=legacyArticles.find(e=>e.id===id&&e.locale===locale)||legacyArticles.find(e=>e.id===id&&e.locale==='zh');return legacy?{data:{...legacy,entityType:'editorial-article'},body:'',sourceLocale:legacy.locale,requestedLocale:locale,fallback:legacy.locale!==locale,url:`/${locale}/articles/read/${encodeURIComponent(id)}/`}:undefined;}
  const source=group.get(locale)||group.get('zh')||group.values().next().value;
  const translated=locale.startsWith('zh-')&&source.data.locale==='zh';
  const canonical=canonicalEntityEntry(group),sharedData=resolveSharedEntityData(group,source.data);
  return {...source,factsLocale:canonical.data.locale,factSourceFilePath:canonical.filePath,data:translated?convertChineseContentValue(sharedData,locale):sharedData,sourceLocale:source.data.locale,requestedLocale:locale,fallback:source.data.locale!==locale&&!translated,url:`/${locale}${entityRoute(sharedData)}`};
 }
 for(const [id,group]of entities){const e=group.get('zh')||group.values().next().value;const edges=entityEdges(e.data);outgoing.set(id,edges);
  for(const edge of edges){if(!incoming.has(edge.target))incoming.set(edge.target,[]);incoming.get(edge.target).push(edge);}
  if(e.data.legacy)routes.set(`/${e.data.legacy.collection}/${e.data.legacy.entryPath}/`,id);
  for(const alias of e.data.aliases||[])routes.set(alias.startsWith('/')?alias:entityRoute({...e.data,id:alias}),id);
 }
 return {entities,legacyRoutes:routes,resolveEntity,
  resolveEntityUrl:(id,locale='zh')=>resolveEntity(id,locale)?.url,
  getIncomingRelations:id=>incoming.get(id)||[],getOutgoingRelations:id=>outgoing.get(id)||[],
  getRelations(id){return [...(outgoing.get(id)||[]),...(incoming.get(id)||[]).map(e=>({...e,source:id,target:e.source,type:authorableRelations[e.type]||e.type,inverse:true}))];},
  list:(locale='zh')=>[...entities.keys()].map(id=>resolveEntity(id,locale)),
  morphs:(id,locale='zh')=>{const group=resolveEntity(id,locale)?.data.presentation?.morphing?.group;return group?[...entities.keys()].map(key=>resolveEntity(key,locale)).filter(e=>e.data.presentation?.morphing?.group===group).sort((a,b)=>(a.data.presentation.morphing.order??999)-(b.data.presentation.morphing.order??999)||a.data.id.localeCompare(b.data.id)):[];},
 };
}
