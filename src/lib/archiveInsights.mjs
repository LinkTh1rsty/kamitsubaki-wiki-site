import {archiveRecord,selectArchive,isDay} from './archiveResearch.mjs';
export function musicConnections(snapshot,id,locale='zh'){
 const known=new Map(snapshot.entities.filter(row=>row.type==='work-track').map(row=>[row.id,row])),seen=new Set([id]),edges=[];
 for(let grew=true;grew;){grew=false;for(const edge of snapshot.relations){if(!['version-of','derived-from'].includes(edge.type) || !known.has(edge.source) || !known.has(edge.target) || !seen.has(edge.source) && !seen.has(edge.target))continue;if(!edges.includes(edge))edges.push(edge);for(const key of [edge.source,edge.target])if(!seen.has(key)){seen.add(key);grew=true;}}}
 const versions=edges.map(edge=>({...edge,source:archiveRecord(snapshot,edge.source,locale),target:archiveRecord(snapshot,edge.target,locale),versionType:edge.versionType || known.get(edge.source)?.facts.versions?.find(version=>version.entity===edge.target)?.type || '',sources:(known.get(edge.source)?.facts.sources || []).filter((source,index)=>(edge.sourceIds || []).includes(source.id || 'source-'+index))}));
 return {versions,releases:snapshot.entities.filter(row=>row.type==='work-release' && row.facts.tracks?.some(track=>track.songId===id)).map(row=>archiveRecord(snapshot,row.id,locale))};
}
export function compareLiveSetlists(snapshot,ids,locale='zh'){
 const lives=[...new Set(ids)].slice(0,4).map(id=>archiveRecord(snapshot,id,locale)).filter(row=>row?.type==='live-event'),songs=new Map();
 for(const live of lives)for(const track of live.facts.setlist || [])if(track.songId && snapshot.entities.some(row=>row.id===track.songId && row.type==='work-track'))songs.set(track.songId,archiveRecord(snapshot,track.songId,locale));
 return {lives,rows:[...songs.values()].map(song=>({id:song.id,title:song.title,path:song.path,counts:lives.map(live=>(live.facts.setlist || []).filter(track=>track.songId===song.id).length)})),unlinked:lives.map(live=>(live.facts.setlist || []).filter(track=>!track.songId || !songs.has(track.songId)).length)};
}
export function archiveCollaborations(snapshot,query={}){
 const pairs=new Map();
 for(const work of selectArchive(snapshot,query)){
  const identities=[...new Map((work.facts.credits || []).map(credit=>[credit.entity?'entity:'+credit.entity:'name:'+String(credit.name || '').trim(),credit])).entries()].filter(([id])=>id!=='name:');
  for(let i=0;i<identities.length;i++)for(let j=i+1;j<identities.length;j++){
   const keys=[identities[i][0],identities[j][0]].sort(),key=JSON.stringify(keys);if(!pairs.has(key))pairs.set(key,{left:keys[0],right:keys[1],works:new Set()});pairs.get(key).works.add(work.id);
  }
 }
 return [...pairs.values()].map(pair=>({...pair,works:[...pair.works],count:pair.works.size})).sort((a,b)=>b.count-a.count || a.left.localeCompare(b.left) || a.right.localeCompare(b.right));
}
export function archiveCoverage(snapshot,query={}){
 const rows=selectArchive(snapshot,query),ids=new Set(rows.map(row=>row.id));
 return {total:rows.length,sourced:rows.filter(row=>row.facts.sources?.length).length,evidenced:new Set(snapshot.evidence.filter(claim=>ids.has(claim.entityId)).map(claim=>claim.entityId)).size,versioned:new Set(snapshot.relations.filter(edge=>['version-of','derived-from'].includes(edge.type) && ids.has(edge.source)).map(edge=>edge.source)).size,preciseDates:rows.filter(row=>isDay(row.date)).length};
}
