import {readFile,readdir,stat} from 'node:fs/promises';
import {resolve,join,sep} from 'node:path';
import YAML from 'yaml';
import {entityCollections} from './entityModel.mjs';
import {createEntityRegistry} from './entityRegistryCore.mjs';
export {createEntityRegistry} from './entityRegistryCore.mjs';
import {convertChineseContentValue,convertChineseMarkdown} from './traditionalChinese.mjs';
const locales=['zh','ja','en','zh-tw','zh-hk'];
async function walk(dir){const paths=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())paths.push(...await walk(p));else paths.push(p);}return paths;}
let cached,signature='',pending;
export async function getEntityRegistry(){
 if(import.meta.env?.PROD&&cached)return cached;
 if(pending)return pending;
 pending=(async()=>{
  const root=resolve('src/content');const collections=new Set(entityCollections);
  const paths=(await walk(root)).map(p=>p.split(sep).join('/')).filter(p=>collections.has(p.slice(root.length+1).split('/')[0])&&/\/(zh|ja|en)\.md$/.test(p));
  const redirectsPath=resolve('src/data/entity-redirects.json');
  const nextSignature=import.meta.env?.PROD?'production':(await Promise.all([...paths,redirectsPath].map(async p=>{const info=await stat(p);return p+':'+info.mtimeMs+':'+info.size;}))).join('|');
  if(cached&&signature===nextSignature)return cached;
  const entries=await Promise.all(paths.map(async filePath=>{const source=await readFile(filePath,'utf8');const m=source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!m)throw Error('Missing frontmatter '+filePath);return {filePath,data:YAML.parse(m[1]),body:source.slice(m[0].length)};}));
  const redirects=JSON.parse(await readFile(redirectsPath,'utf8'));cached=createEntityRegistry(entries,redirects);signature=nextSignature;return cached;
 })();
 try{return await pending;}finally{pending=undefined;}
}
export function entityBody(entry){return entry.requestedLocale?.startsWith('zh-')?convertChineseMarkdown(entry.body,entry.requestedLocale):entry.body;}
export {locales as entityLocales};
