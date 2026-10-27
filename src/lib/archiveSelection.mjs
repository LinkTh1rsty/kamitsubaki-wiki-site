import {foldCjkSearchText} from './cjkSearch.mjs';
import {entityLabel} from './entityLabels.mjs';
const searchable=new WeakMap();

export function archiveChoices(snapshot,locale='zh',types=null){
 return snapshot.entities.filter(row=>!types || types.includes(row.type)).map(row=>{
  const n=row.narratives[locale] || row.narratives.zh || Object.values(row.narratives)[0];
  return {id:row.id,title:n.title,type:entityLabel(row.type,locale),image:row.image || '',path:n.path,
   terms:[row.id,...Object.values(row.narratives).flatMap(value=>[value.title,value.romanized,...(value.aliases || [])])].filter(Boolean)};
 });
}
export function searchArchiveChoices(items,text,excluded=[],limit=12){
 const query=foldCjkSearchText(text).trim(),words=query.split(/\s+/).filter(Boolean),omit=new Set(excluded);
 const data=item=>{if(!searchable.has(item))searchable.set(item,{text:foldCjkSearchText([item.title,...(item.terms || []),item.type].join(' ')),exact:new Set([item.id,item.title,...(item.terms || [])].map(foldCjkSearchText))});return searchable.get(item);};
 return items.filter(item=>!omit.has(item.id) && words.every(word=>data(item).text.includes(word)))
  .map((item,index)=>({item,index,rank:words.length && data(item).exact.has(query)?0:1}))
  .sort((a,b)=>a.rank-b.rank || a.index-b.index).slice(0,limit).map(row=>row.item);
}
