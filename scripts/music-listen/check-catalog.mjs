import {readFileSync} from 'node:fs';
import {musicInventory} from './inventory.mjs';
import {titleMatches} from './catalog-match.mjs';

// Validate curated identity and canonical reverse links without contacting any service.
export function checkMusicCatalog(catalog,rows=musicInventory().rows){
 const byId=new Map(rows.map(row=>[row.id,row])),groups=new Map(),errors=[];
 if(catalog.version!==1||!catalog.entries)throw Error('Unsupported music catalog');
 for(const [id,entry] of Object.entries(catalog.entries)){
  const row=byId.get(id);
  if(!row||row.kind!==entry.kind)errors.push(`${id}: missing Wiki entry/kind`);
  if(!/^0[A-Za-z0-9]{13}$/.test(entry.mid))errors.push(`${id}: invalid MID`);
  const expected=`https://y.qq.com/n/ryqq/${entry.kind==='album'?'albumDetail':'songDetail'}/${entry.mid}`;
  if(entry.source!==expected)errors.push(`${id}: missing exact public source`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt))errors.push(`${id}: missing review date`);
  if(row&&!titleMatches(row,entry.title))errors.push(`${id}: title differs from authored Wiki identity`);
  if(entry.kind==='track'&&(!/^0[A-Za-z0-9]{13}$/.test(entry.albumMid)||!entry.albumTitle))errors.push(`${id}: missing album context`);
  const key=`${entry.kind}:${entry.mid}`,group=groups.get(key)||[];group.push(entry);groups.set(key,group);
 }
 for(const [key,group] of groups){
  if(group.filter(e=>e.canonical!==false).length!==1)errors.push(`${key}: canonical Wiki article is ambiguous`);
  if(new Set(group.map(e=>e.albumMid||'')).size!==1)errors.push(`${key}: conflicting recording edition`);
 }
 return {errors,entries:Object.keys(catalog.entries).length,identities:groups.size};
}
if(process.argv[1]?.endsWith('/check-catalog.mjs')){
 const result=checkMusicCatalog(JSON.parse(readFileSync('src/data/music-listen.json','utf8')));
 if(result.errors.length){console.error(result.errors.join('\n'));process.exitCode=1;}else console.log(JSON.stringify(result));
}
