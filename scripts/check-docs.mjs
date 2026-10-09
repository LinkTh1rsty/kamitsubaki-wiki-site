import {access, readFile, readdir} from 'node:fs/promises';
import {dirname, extname, join, relative, resolve} from 'node:path';
import {getManualCatalog,manualBooks,retiredDocTargets} from '../src/lib/docsCenter.mjs';

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
const privateDetails=[];
const privateImplementation=/kamitsubaki-wiki-site-backend|\b(?:D1|R2|Worker|Wrangler)\b|AI_OBSERVER_DB|GALLERY_(?:STAGING|IMAGES)|migrations\/[0-9]+|数据库迁移|存储桶|后端部署/iu;
// This engineering audit is outside docs/manuals and is not a public manual route.
const engineeringAuditPath=join(root,'docs/upload-funnel-audit.md');
const manualPaths=new Set();
for(const locale of ['zh','ja','en','zh-tw','zh-hk']){
 const books=await getManualCatalog(locale);
 for(const book of books){
  if(!book.chapters.length)missing.push(`docs/manuals/${book.id}: empty book for ${locale}`);
  const orders=new Set();
  for(const chapter of book.chapters){
   if(orders.has(chapter.order))missing.push(`docs/manuals/${book.id}: duplicate order ${chapter.order} for ${locale}`);
   orders.add(chapter.order);
   manualPaths.add(`${book.id}/${chapter.slug}`);
  }
 }
}
if(manualBooks.some(book=>![...manualPaths].some(path=>path.startsWith(`${book}/`))))missing.push('A manual book has no chapters');
for(const [old,target] of Object.entries(retiredDocTargets))if(!manualPaths.has(target))missing.push(`retired /docs/${old}/ -> missing ${target}`);
for(const file of sources){
 const source=await readFile(file,'utf8');
 if(file!==engineeringAuditPath&&privateImplementation.test(source))privateDetails.push(relative(root,file));
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

if(missing.length||privateDetails.length){
 if(missing.length)console.error(`Documentation contains ${missing.length} broken local link(s):\n${missing.join('\n')}`);
 if(privateDetails.length)console.error(`Public documentation names private implementation details in ${privateDetails.length} file(s):\n${privateDetails.join('\n')}`);
 process.exitCode=1;
}else console.log(`Checked ${sources.length} Markdown documents; local links resolve.`);
