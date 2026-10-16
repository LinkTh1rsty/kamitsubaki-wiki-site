import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {getEntityRegistry} from '../src/lib/entityRegistry.mjs';

const registry=await getEntityRegistry();
const backend=resolve('../kamitsubaki-wiki-site-backend/src/gallery');
const frontendTarget=resolve('src/data/gallery-entities.json');
const frontendOnly=process.argv.includes('--frontend-only');
const backendCharacters=frontendOnly?null:await readFile(resolve(backend,'characters.json'),'utf8').catch(error=>{
 if(error.code==='ENOENT')return null;
 throw error;
});
const check=process.argv.includes('--check');
if(!backendCharacters&&!check&&!frontendOnly)throw Error('同步图库词条目录需要后端仓库；仅更新本站目录时使用 --frontend-only');
const previous=JSON.parse(backendCharacters??await readFile(frontendTarget,'utf8'));
const retained=new Set(previous.map(row=>row.id));
const eligible=new Set(['person','virtual-avatar','software-voice','unit']);
const entities=registry.list('zh').filter(entry=>eligible.has(entry.data.entityType)||retained.has(entry.data.id)).map(entry=>{
 const id=entry.data.id;
 const labels=Object.fromEntries(['zh','ja','en'].map(locale=>{
  const localized=registry.resolveEntity(id,locale);
  return [locale,localized?.data.name||localized?.data.title||entry.data.name||id];
 }));
 return {id,type:entry.data.entityType,name:labels.zh,url:entry.url,image:entry.data.presentation?.image||null,labels};
}).sort((a,b)=>a.id.localeCompare(b.id));
const output=JSON.stringify(entities,null,2)+'\n';
// The Worker catalog also contains reviewed gallery-only characters and
// localized labels. Keep them when syncing the article-backed subset.
const targets=new Map([[frontendTarget,output]]);
if(backendCharacters){
 const curated=new Map(previous.map(row=>[row.id,row]));
 const backendCatalog=JSON.parse(await readFile(resolve(backend,'entities.json'),'utf8').catch(error=>{
  if(error.code==='ENOENT')return '[]';
  throw error;
 }));
 const reviewed=new Map(backendCatalog.map(row=>[row.id,row]));
 const reviewedOrder=new Map(backendCatalog.map((row,index)=>[row.id,index]));
 const ids=new Set(entities.map(row=>row.id));
 const backendEntities=entities.map(row=>({...row,labels:{...row.labels,...(reviewed.get(row.id)?.labels||curated.get(row.id)?.labels)}}));
 for(const row of previous)if(!ids.has(row.id))backendEntities.push({...row,type:'lore-concept',image:null});
 backendEntities.sort((a,b)=>(reviewedOrder.get(a.id)??Number.MAX_SAFE_INTEGER)-(reviewedOrder.get(b.id)??Number.MAX_SAFE_INTEGER)||a.id.localeCompare(b.id));
 targets.set(resolve(backend,'entities.json'),JSON.stringify(backendEntities,null,2)+'\n');
}
if(check){
 for(const [target,expected] of targets)if((await readFile(target,'utf8').catch(()=>null)||'').replace(/\r\n/g,'\n')!==expected)throw Error(`图库词条目录需要同步：${target}`);
}else for(const [target,expected] of targets)await writeFile(target,expected);
console.log(`图库词条目录：${entities.length} 个对象`);
