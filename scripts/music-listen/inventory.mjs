import {readFileSync,readdirSync} from 'node:fs';
import {parse} from 'yaml';

// Read public frontmatter only; no lyrics, private account data or generated deployment output.
export function musicInventory(root='src/content'){
 const rows=[],artists={},titlesById=new Map();
 for(const kind of ['releases','songs','people','units','isotopes'])for(const name of readdirSync(`${root}/${kind}`,{recursive:true})){
  if(!/\/(zh|ja|en)\.md$/.test(name))continue;
  const text=readFileSync(`${root}/${kind}/${name}`,'utf8'),front=text.split(/^---\s*$/m)[1];if(!front)continue;
  const d=parse(front);if(!d?.id)continue;
  if(d.title){const titles=titlesById.get(d.id)||new Set();titles.add(d.title);if(d.romanizedTitle)titles.add(d.romanizedTitle);titlesById.set(d.id,titles);}
  if(['people','units','isotopes'].includes(kind)){
   const item=artists[d.id]??={id:d.id,names:[],queries:[]};
   for(const value of [d.name,d.romanizedName,...(d.aliases||[])])if(typeof value==='string')for(const part of [value,...value.split(/\s*\/\s*/)])if(part&&!item.names.includes(part))item.names.push(part);
   if(name.endsWith('/ja.md')&&d.name)item.queries.unshift(d.name.split(/\s*\/\s*/)[0]);
   if(name.endsWith('/zh.md')&&d.name)item.queries.push(d.name.split(/\s*\/\s*/)[0]);
   if(d.romanizedName)item.queries.push(d.romanizedName);
  }else if(name.endsWith('/zh.md')&&['work-release','work-track'].includes(d.entityType))rows.push({id:d.id,kind:d.entityType==='work-release'?'album':'track',title:d.title,aliases:d.aliases||[],duration:d.duration,releaseDate:d.releaseDate,artist:d.primaryArtist,performers:(d.performers||[]).map(p=>p.entity),tracks:d.tracks||[],file:`${root}/${kind}/${name}`});
 }
 for(const row of rows)row.titles=[...(titlesById.get(row.id)||[])];
 for(const row of rows.filter(r=>r.kind==='album'))for(const track of row.tracks){const song=rows.find(r=>r.kind==='track'&&r.id===track.songId);if(song)track.titles=song.titles;}
 return {rows,artists};
}
