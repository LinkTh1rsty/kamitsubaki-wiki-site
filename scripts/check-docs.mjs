import {access, readFile, readdir} from 'node:fs/promises';
import {dirname, extname, join, relative, resolve} from 'node:path';
import {getManualCatalog,manualBooks,retiredDocTargets} from '../src/lib/docsCenter.mjs';
import {supportedLocales} from '../src/lib/i18n.mjs';
import {documentContentDigest} from './doc-migration-integrity.mjs';

const root=resolve(import.meta.dirname,'..');
const sources=[join(root,'README.md'),join(root,'README.en.md'),join(root,'README.ja.md'),join(root,'src/content/README.md')];

async function walk(directory){
 const files=[];
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name);
  if(entry.isDirectory())files.push(...await walk(path));
  else if(['.md','.mdx'].includes(extname(entry.name)))files.push(path);
 }
 return files;
}

sources.push(...await walk(join(root,'docs')));
const missing=[];
const manualPaths=new Set();
let reference;
for(const locale of supportedLocales){
 const books=await getManualCatalog(locale,{includeBody:true});
 const inventory=books.flatMap(book=>book.chapters.map(chapter=>`${book.id}/${chapter.slug}:${chapter.order}`));
 if(reference&&JSON.stringify(inventory)!==JSON.stringify(reference))missing.push(`${locale}: chapter inventory/order differs from zh`);
 reference??=inventory;
 for(const book of books){
  if(!book.chapters.length)missing.push(`docs/manuals/${book.id}: empty book for ${locale}`);
  const orders=new Set();
  for(const chapter of book.chapters){
   if(orders.has(chapter.order))missing.push(`docs/manuals/${book.id}: duplicate order ${chapter.order} for ${locale}`);
   orders.add(chapter.order);
   manualPaths.add(`${book.id}/${chapter.slug}`);
   if(!chapter.title.trim()||!chapter.summary.trim()||!chapter.body.trim())missing.push(`${locale}/${book.id}/${chapter.slug}: empty chapter`);
   const prose=chapter.body.replace(/```[\s\S]*?```/g,'');
   for(const [,target] of prose.matchAll(/\]\((\/(?:zh|ja|en|zh-tw|zh-hk)\/docs\/[^)\s]*)\)/g)){
    const path=target.split(/[?#]/)[0].replace(/\/$/,'').split('/');
    if(path[1]!==locale)missing.push(`${locale}/${book.id}/${chapter.slug}: cross-language link ${target}`);
    if(path.length>3&&!manualBooks.includes(path[3]))missing.push(`Unknown documentation section ${target}`);
    if(path.length>4&&!books.find(item=>item.id===path[3])?.chapters.some(item=>item.slug===path[4]))missing.push(`Unknown documentation chapter ${target}`);
   }
  }
 }
}
const migration=JSON.parse(await readFile(join(root,'docs/migration-map.json'),'utf8'));
for(const entry of migration.entries){
 try{
  const archived=await readFile(join(root,entry.archive),'utf8');
  if(documentContentDigest(archived.replace(/^>[^\r\n]*\r?\n\r?\n/,''))!==entry.contentSha256)missing.push(`Archive content changed: ${entry.archive}`);
 }catch{missing.push(`Missing archive ${entry.archive}`);}
 for(const chapter of entry.chapters)if(!manualPaths.has(chapter))missing.push(`Missing migration target ${chapter}`);
}
if(manualBooks.some(book=>![...manualPaths].some(path=>path.startsWith(`${book}/`))))missing.push('A manual book has no chapters');
for(const [old,target] of Object.entries(retiredDocTargets))if(!manualPaths.has(target))missing.push(`retired /docs/${old}/ -> missing ${target}`);
for(const file of sources){
 const source=await readFile(file,'utf8');
 const content=source.replace(/```[\s\S]*?```/g,'');
 for(const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
  let target=match[1].trim().replace(/^<|>$/g,'').split(/\s+["']/)[0];
  if(!target||target.startsWith('#')||target.startsWith('/')||/^[a-z][a-z0-9+.-]*:/i.test(target))continue;
  target=target.split('#')[0].split('?')[0];
  if(!target)continue;
  if(!target.includes('/')&&!/^\.?\.?\//.test(target)&&!/[.][a-z0-9]{1,8}$/i.test(target))continue;
  try{target=decodeURIComponent(target);}catch{}
  const path=resolve(dirname(file),target);
  try{await access(path);}catch{missing.push(`${relative(root,file)} -> ${match[1]}`);}
 }
}

if(missing.length){
 if(missing.length)console.error(`Documentation contains ${missing.length} broken local link(s):\n${missing.join('\n')}`);
 process.exitCode=1;
}else console.log(`Checked ${sources.length} Markdown documents; local links resolve.`);
