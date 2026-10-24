import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join,relative,resolve,sep} from 'node:path';
import YAML from 'yaml';
import entities from '../src/data/gallery-entities.json' with {type:'json'};

const posix=p=>p.split(sep).join('/');
const contentRoot=resolve('src/content'),publicRoot=resolve('public'),entityIds=new Set(entities.map(entity=>entity.id));
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=posix(join(dir,entry.name));if(entry.isDirectory())result.push(...await walk(path));else if(entry.name.endsWith('.md'))result.push(path);}return result;}
async function walkImages(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=posix(join(dir,entry.name));if(entry.isDirectory())result.push(...await walkImages(path));else if(/\.(?:png|jpe?g|webp|gif|avif)$/i.test(entry.name))result.push(path);}return result;}
const digest=value=>createHash('sha256').update(value).digest('hex');
const sources=new Map(),missing=[];
for(const path of (await walk(contentRoot)).sort()){
 const source=await readFile(path,'utf8'),front=source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!front)continue;
 const data=YAML.parse(front[1])||{},locale=data.locale||path.split('/').at(-1)?.replace(/\.md$/,''),contentPath=relative(resolve('.'),path).replaceAll('\\','/');
 const matches=[...source.matchAll(/(?:\/images\/[^\s"'<>()[\]{}]+?\.(?:png|jpe?g|webp|gif|avif)|https:\/\/[^\s"'<>()[\]{}]+?\.(?:png|jpe?g|webp|gif|avif))(?:\?[^\s"'<>()[\]{}]*)?/gi)].map(match=>match[0]);
 const suggestions=new Set();if(entityIds.has(data.id))suggestions.add(data.id);
 for(const id of [data.primaryArtist,data.artist,data.group,...(Array.isArray(data.performers)?data.performers:[]).map(performer=>typeof performer==='string'?performer:performer?.entity)])if(entityIds.has(id))suggestions.add(id);
 for(const relation of data.relations||[])if(entityIds.has(relation.target))suggestions.add(relation.target);
 for(const sourceUrl of new Set(matches)){
  if(sourceUrl.startsWith('/images/contributors/')||/placehold\.co|placeholder/i.test(sourceUrl))continue;
  let hash=null;if(sourceUrl.startsWith('/images/')){const file=posix(resolve(publicRoot,'.'+sourceUrl));if(!file.startsWith(posix(publicRoot)+'/'))continue;try{hash=digest(await readFile(file));}catch{missing.push({sourceUrl,contentPath});continue;}}
  const key=hash||'url-'+digest(sourceUrl);let item=sources.get(key);
  if(!item){item={id:'asset-'+key.slice(0,64),sourceUrl,sha256:hash,references:[],suggestedEntities:[]};sources.set(key,item);}
  item.references.push({kind:'content',path:contentPath,locale,entityId:data.id||null});
  item.suggestedEntities.push(...suggestions);
 }
}
// Keep one record per file content, including old song/album art that remains in
// the site's public assets but is no longer referenced by a current entry.
// Contributor avatars describe site users and are outside the KAMITSUBAKI archive.
for(const file of (await walkImages(resolve(publicRoot,'images'))).sort()){
 const sourceUrl='/'+relative(publicRoot,file).replaceAll('\\','/');
 if(sourceUrl.startsWith('/images/contributors/'))continue;
 const hash=digest(await readFile(file));if(sources.has(hash))continue;
 const folder=sourceUrl.split('/')[3],suggested=entityIds.has(folder)?folder:sourceUrl==='/images/artists/grp.jpg'||sourceUrl==='/images/albums/fate-vwp-1400x1400.jpg'?'vwp':null;
 sources.set(hash,{id:'asset-'+hash,sourceUrl,sha256:hash,references:[{kind:'asset',path:relative(resolve('.'),file).replaceAll('\\','/'),locale:null,entityId:suggested}],suggestedEntities:suggested?[suggested]:[]});
}
const items=[...sources.values()].map(item=>({...item,references:[...new Map(item.references.map(ref=>[JSON.stringify(ref),ref])).values()],suggestedEntities:[...new Set(item.suggestedEntities)]})).sort((a,b)=>a.id.localeCompare(b.id));
const output=JSON.stringify({schemaVersion:1,items},null,2)+'\n',target=resolve('public/gallery-import-manifest.json');
if(process.argv.includes('--check')){if((await readFile(target,'utf8').catch(()=>null)||'').replace(/\r\n/g,'\n')!==output)throw Error('图库旧图扫描清单需要更新');}else await writeFile(target,output);
console.log(`旧图候选 ${items.length} 张（其中未关联词条的站内素材 ${items.filter(item=>item.references.every(ref=>ref.kind==='asset')).length} 张）；缺失文件引用 ${missing.length} 条。`);
if(missing.length)console.log(missing.slice(0,5));
