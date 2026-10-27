import {foldCjkSearchText} from './cjkSearch.mjs';
export {validBarcode} from './archiveBarcode.mjs';

export const archiveVersion = 1;
export const archiveModules = ['music','atlas','visual','statistics','observatory','collections','challenges','ask','compare','evidence','languages','radio','rooms','physical','today','museum','live-mode','open-data'];
export const unique = values => [...new Set(values.filter(Boolean))];
export const isDay = date => /^\d{4}-\d{2}-\d{2}$/.test(date || '') && Number.isFinite(Date.parse(date + 'T00:00:00Z')) && new Date(date + 'T00:00:00Z').toISOString().slice(0,10) === date;
export function durationSeconds(value) {
  if (!/^\d{1,3}:\d{2}(?::\d{2})?$/.test(value || '')) return null;
  const parts=value.split(':').map(Number);
  if (parts.slice(1).some(part=>part>59)) return null;
  return parts.reduce((seconds,part)=>seconds*60+part,0);
}
export function archiveRecord(snapshot,id,locale='zh') {
  const entity=snapshot.entities.find(row=>row.id===id);
  if (!entity) return null;
  const translated=entity.narratives[locale] || entity.narratives.zh || Object.values(entity.narratives)[0];
  return {...entity,...translated,sourceLocale:translated.locale,fallback:translated.locale!==locale};
}
export function selectArchive(snapshot,query={},locale='zh') {
  const words=foldCjkSearchText(query.q || '').split(/\s+/).filter(Boolean);
  const year=String(query.year || '');
  const rows=snapshot.entities.filter(row=>{
    const d=row.facts;
    if(query.entity && row.id!==query.entity)return false;
    if (query.type && row.type!==query.type) return false;
    if (year && (!row.date || row.date.slice(0,4)>year || (d.dateRange?.end || row.date).slice(0,4)<year)) return false;
    if (query.from && (!row.date || row.date < query.from)) return false;
    if (query.to && (!row.date || row.date.slice(0,query.to.length)>query.to)) return false;
    if (query.artist && ![d.primaryArtist,...(d.performers || []).map(p=>p.entity),...(d.headliners || []),...(d.guestPerformers || [])].includes(query.artist)) return false;
    if (query.creator && !(d.credits || []).some(c=>(c.entity===query.creator || c.name===query.creator) && (!query.role || c.role===query.role))) return false;
    if (query.role && !query.creator && !(d.credits || []).some(c=>c.role===query.role)) return false;
    if (query.tag && ![...(d.tags || []),...(d.genres || []),...(d.genome?.tags || []).map(t=>t.value)].includes(query.tag)) return false;
    if (query.media==='yes' && !row.media?.length) return false;
    if(query.version && !snapshot.relations.some(edge=>['version-of','derived-from'].includes(edge.type) && (edge.source===row.id || edge.target===row.id) && (query.version==='any' || edge.versionType===query.version)))return false;
    const haystack=foldCjkSearchText([row.id,...Object.values(row.narratives).flatMap(n=>[n.title,n.romanized,n.summary,...(n.aliases || [])]),...(d.credits || []).map(c=>c.name),d.venue?.name].join(' '));
    return words.every(word=>haystack.includes(word));
  }).map(row=>archiveRecord(snapshot,row.id,locale));
  return rows.sort((a,b)=>query.sort==='title'?a.title.localeCompare(b.title):query.sort==='oldest'?(a.date || '9999').localeCompare(b.date || '9999') || a.id.localeCompare(b.id):(b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
}
/** Only recognize a bounded grammar. Unrecognized input remains a search; never silently invent constraints. */
export function parseArchiveQuestion(text,snapshot) {
  const input=String(text || '').trim().slice(0,500), query={}, recognized=[], unresolved=[],candidates={};
  let remaining=foldCjkSearchText(input);
  const consume=pattern=>{remaining=remaining.replace(pattern,'\u0000');};
  const put=(key,value,label)=>{query[key]=value;recognized.push(label);};
  const typeRules=[['work-track',/\b(songs?|tracks?|music)\b|歌曲|楽曲|曲目/i],['work-release',/\b(albums?|releases?)\b|专辑|專輯|发行|發行|アルバム/i],['live-event',/\b(lives?|concerts?|events?)\b|演出|演唱会|演唱會|ライブ|公演/i],['person',/\b(creators?|people)\b|创作者|創作者|クリエイター/i]];
  const kinds=typeRules.filter(([,rule])=>rule.test(input));
  if(kinds.length===1){put('type',kinds[0][0],kinds[0][0]);remaining=foldCjkSearchText(input.replace(new RegExp(kinds[0][1].source,'gi'),'\u0000'));}
  else if(kinds.length>1)unresolved.push('type');
  const years=unique(input.match(/\b(?:19|20)\d{2}\b/g) || []);
  if(years.length===1)put('year',years[0],years[0]);
  else if(years.length===2 && /到|至|から|to|through|[-–~]/i.test(input)) {put('from',years.slice().sort()[0],years[0]);put('to',years.slice().sort()[1],years[1]);}
  else if(years.length>1)unresolved.push('year');
  if(query.year || query.from)for(const year of years)consume(new RegExp(year+'(?:\\s*年(?:の)?)?','g'));
  const folded=foldCjkSearchText(input);
  const matchesName=name=>{
    if(!name || name.length<2)return false;
    const needle=foldCjkSearchText(name),start=folded.indexOf(needle);
    if(start<0)return false;
    if(/^[\x00-\x7F]+$/.test(needle))return !/[a-z0-9]/i.test(folded[start-1] || '') && !/[a-z0-9]/i.test(folded[start+needle.length] || '');
    return true;
  };
  const names=snapshot.entities.filter(e=>['person','virtual-avatar','unit','software-voice'].includes(e.type)).filter(e=>[e.id,...Object.values(e.narratives).flatMap(n=>[n.title,n.romanized,...(n.aliases || [])])].some(matchesName));
  const exact=names;
  const personKey=/作曲|作词|作詞|编曲|編曲|created|composed|written|composer/i.test(input)?'creator':'artist';
  if(exact.length===1)put(personKey,exact[0].id,exact[0].id);
  else if(exact.length>1){unresolved.push(personKey);candidates[personKey]=exact.map(row=>row.id);}
  const consumeNames=rows=>{for(const row of rows)for(const name of [row.id,...Object.values(row.narratives).flatMap(n=>[n.title,n.romanized,...(n.aliases || [])])].filter(Boolean).sort((a,b)=>b.length-a.length)){
   const foldedName=foldCjkSearchText(name);if(!matchesName(name))continue;
   const escaped=foldedName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');consume(new RegExp(/^[\x00-\x7F]+$/.test(foldedName)?'(?<![a-z0-9])'+escaped+'(?![a-z0-9])':escaped,'gi'));
  }};
  consumeNames(exact);
  const roleRules=[['composer',/作曲|compos/i],['lyricist',/作词|作詞|lyric/i],['arranger',/编曲|編曲|arrang/i]];
  for(const [role,rule] of roleRules)if(rule.test(input)){put('role',role,role);consume(/(?:作曲|作词|编曲)\s*したのは\s*谁|作曲|作词|作詞|编曲|編曲|\b(?:composed?|composer|composing|written|lyricist|lyrics?|arranged?|arranger|arranging|created)\b/gi);break;}
  if(/MV|ミュージックビデオ|music video/i.test(input)){put('media','yes','media');consume(/\bMV\b|みゅーじっくびでお|music video|\bvideo\b/gi);}
  const targets=snapshot.entities.filter(e=>!['person','virtual-avatar','unit','software-voice'].includes(e.type) && [e.id,...Object.values(e.narratives).map(n=>n.title)].some(matchesName));
  if(targets.length===1 && /谁|誰|who|版本|バージョン|version|remix|歌詞|歌词|credit|制作|作曲|作词|作詞|演唱|performed/i.test(input)){put('entity',targets[0].id,targets[0].id);consumeNames(targets);}
  else if(targets.length>1 && /谁|誰|who|version|credit|制作|作曲|作词|作詞/i.test(input)){unresolved.push('entity');candidates.entity=targets.map(row=>row.id);consumeNames(targets);}
  // Keep every unconsumed description visible and searchable instead of broadening a partly recognized question.
  const filler=/^(?:(?:in|from|to|through|by|the|a|an|of|for|and|who|what|which|show|find|me|please|are|is|has|have)\s*|请问|请|查找|查询|列出|有哪些|哪些|的|年|谁为|谁|は|が|を|の|に|から|まで|到|至|[-–~])+$/i;
  remaining=remaining.split('\u0000').map(part=>part.replace(/^[\s，。！？、：；,.!?;:「」『』“”"'()（）]+|[\s，。！？、：；,.!?;:「」『』“”"'()（）]+$/g,'')).map((part,index,parts)=>{
   if(filler.test(part))return '';let value=part.replace(/^(?:(?:show|find|please|about|regarding|containing|named|called)\b\s*|请问|请|查找|查询|列出|关于)+/i,'');
   if(index<parts.length-1)value=value.replace(/\s+\b(?:in|from|to|by|the|of|for)\b\s*$/i,'').replace(/的$/,'');return value.trim();
  }).filter(Boolean).join(' ');
  if(!recognized.length && !unresolved.length)query.q=input;
  else if(remaining){query.q=remaining;unresolved.push('q');}
  return {version:archiveVersion,input,query,recognized:unique(recognized),unresolved:unique(unresolved),candidates,unrecognizedText:remaining,requiresConfirmation:true};
}
export function musicVersions(snapshot,id) {
  const seen=new Set([id]), edges=[];
  for(let depth=0;depth<20;depth++){
    let grew=false;
    for(const edge of snapshot.relations.filter(e=>['derived-from','version-of'].includes(e.type))){
      if(seen.has(edge.source)||seen.has(edge.target)){
        if(!edges.includes(edge))edges.push(edge);
        for(const endpoint of [edge.source,edge.target])if(!seen.has(endpoint)){seen.add(endpoint);grew=true;}
      }
    }
    if(!grew)break;
  }
  return {ids:[...seen],edges};
}
export function setlistStatistics(snapshot,ids=null) {
  const lives=snapshot.entities.filter(e=>e.type==='live-event' && ['oneman-live','joint-live','xr-sinka-live'].includes(e.facts.eventType) && (ids===null || ids.includes(e.id)));
  const withSetlist=lives.filter(e=>e.facts.setlist?.length);
  const songs=new Map();
  for(const live of withSetlist)for(const [position,track] of live.facts.setlist.entries()){
    if(!track.songId)continue;
    if(!songs.has(track.songId))songs.set(track.songId,{id:track.songId,occurrences:[],events:new Set()});
    const song=songs.get(track.songId);
    song.occurrences.push({liveId:live.id,date:live.date,position:position+1,number:track.number || ''});
    song.events.add(live.id);
  }
  return {total:lives.length,covered:withSetlist.length,unlinked:withSetlist.reduce((n,live)=>n+live.facts.setlist.filter(t=>!t.songId).length,0),
    songs:[...songs.values()].map(song=>({...song,eventCount:song.events.size,events:[...song.events],latest:song.occurrences.map(o=>o.date).filter(isDay).sort().at(-1) || null})).sort((a,b)=>b.eventCount-a.eventCount || a.id.localeCompare(b.id))};
}
export function archiveStatistics(snapshot,query={}) {
  const records=selectArchive(snapshot,query);
  const songs=records.filter(e=>e.type==='work-track'), lives=records.filter(e=>e.type==='live-event');
  const years=new Map();
  for(const entity of records)if(entity.date){const value=entity.date.slice(0,4);if(!years.has(value))years.set(value,{year:value,songs:0,releases:0,lives:0});const key={'work-track':'songs','work-release':'releases','live-event':'lives'}[entity.type];if(key)years.get(value)[key]++;}
  const timed=songs.map(e=>durationSeconds(e.facts.duration)).filter(n=>n!==null);
  return {records:records.length,songs:songs.length,releases:records.filter(e=>e.type==='work-release').length,lives:lives.length,
    credited:songs.filter(e=>e.facts.credits?.length).length,dated:records.filter(e=>e.date).length,withDuration:timed.length,durationSeconds:timed.reduce((a,b)=>a+b,0),
    years:[...years.values()].sort((a,b)=>a.year.localeCompare(b.year)),
    setlists:setlistStatistics(snapshot,lives.map(e=>e.id))};
}
export function compareArchive(snapshot,ids,locale='zh') {
  const rows=unique(ids).slice(0,4).map(id=>archiveRecord(snapshot,id,locale)).filter(Boolean);
  const related=rows.map(row=>new Set(snapshot.relations.filter(e=>e.source===row.id || e.target===row.id).map(e=>e.source===row.id?e.target:e.source)));
  const common=related.length>1?[...related[0]].filter(id=>related.every(set=>set.has(id))):[];
  return {rows,common:common.map(id=>archiveRecord(snapshot,id,locale)).filter(Boolean),
    differences:rows.map((row,index)=>({id:row.id,records:[...related[index]].filter(id=>!common.includes(id)).map(id=>archiveRecord(snapshot,id,locale)).filter(Boolean)}))};
}
/** Month/day matching includes only dates actually known to day precision. */
export function archiveOnThisDay(snapshot,monthDay,locale='zh') {
  if(!/^\d{2}-\d{2}$/.test(monthDay || '') || !isDay('2000-'+monthDay))return [];
  return snapshot.events.filter(e=>e.date.precision==='day' && isDay(e.date.start) && e.date.start.slice(5)===monthDay).map(event=>{
    const text=event.text[locale] || event.text.zh || Object.values(event.text)[0];
    return {...event,...text,path:'/'+locale+'/chronicle/?view=list#'+encodeURIComponent(event.id)};
  }).sort((a,b)=>a.date.start.localeCompare(b.date.start)||a.id.localeCompare(b.id));
}
export function mysteryEntity(snapshot,day) {
  const eligible=snapshot.entities.filter(e=>e.type==='work-track' && e.date && e.facts.performers?.length).sort((a,b)=>a.id.localeCompare(b.id));
  if(!eligible.length)return null;
  let seed=0;for(const char of day)seed=(seed*31+char.charCodeAt(0))>>>0;
  const entity=eligible[seed%eligible.length];
  return {id:entity.id,year:entity.date.slice(0,4),performers:entity.facts.performers.map(p=>p.entity),credits:entity.facts.credits?.map(c=>c.role) || []};
}
export function physicalCatalog(snapshot,locale='zh') {
  return snapshot.entities.filter(e=>e.type==='work-release').flatMap(entity=>{
    const release=archiveRecord(snapshot,entity.id,locale), editions=entity.facts.editions || [];
    return editions.map(edition=>({id:entity.id+':'+edition.id,entityId:entity.id,title:release.title,edition:edition.name,format:edition.format,
      date:entity.date,path:release.path,catalogNumber:edition.catalogNumber || entity.facts.catalogNumber || '',barcode:edition.barcode || '',
      bonusItems:edition.bonusItems || [],sources:edition.sourceIds || [],type:'release'}));
  }).concat((snapshot.physical || []).map(item=>({...item,title:item.names?.[locale] || item.names?.zh || item.title,entityId:item.relatedEntities?.[0] || '',path:'/'+locale+'/explore/physical/?item='+encodeURIComponent(item.id)})));
}
export function atlasPlaces(snapshot,locale='zh') {
  const places=new Map();
  for(const entity of snapshot.entities.filter(e=>e.type==='live-event' && e.facts.venue)){
    const venue=entity.facts.venue,key=[venue.name,venue.city,venue.country,venue.isVirtual].join('|');
    if(!places.has(key))places.set(key,{id:'venue:'+entity.id,title:venue.name,world:venue.isVirtual===true?'virtual':venue.isVirtual===false?'real':'unknown',city:venue.city || '',country:venue.country || '',coordinates:venue.coordinates || null,sourceIds:venue.sourceIds || [],entities:[]});
    const place=places.get(key);place.entities.push(entity.id);
    if(!place.coordinates && venue.coordinates)place.coordinates=venue.coordinates;
    place.sourceIds=unique([...place.sourceIds,...(venue.sourceIds || [])]);
  }
  for(const entity of snapshot.entities.filter(e=>e.type==='lore-concept' && e.facts.loreCategory==='geography')){
    const row=archiveRecord(snapshot,entity.id,locale);
    places.set(entity.id,{id:entity.id,title:row.title,world:'virtual',universe:entity.facts.belongToUniverse,entities:[entity.id],coordinates:null});
  }
  return [...places.values()];
}
export function evidenceFor(snapshot,id,field='') {
  return snapshot.evidence.filter(e=>e.entityId===id && (!field || e.field===field));
}
export function genomePoints(snapshot,axes=['year','duration','bpm']) {
  const values={year:e=>e.date?Number(e.date.slice(0,4)):null,duration:e=>durationSeconds(e.facts.duration),bpm:e=>e.facts.genome?.bpm?.value ?? null};
  return snapshot.entities.filter(e=>e.type==='work-track').flatMap(entity=>{
    const coords=axes.map(axis=>values[axis]?.(entity));
    return coords.every(n=>Number.isFinite(n))?[{id:entity.id,coords}]:[];
  });
}
export function visualRecords(snapshot,query={},locale='zh'){
 const entities=selectArchive(snapshot,{...query,year:'',entity:query.visualEntity || ''},locale).filter(entity=>!query.lineage || entity.morphing?.group===query.lineage);
 return entities.flatMap(entity=>{
  const rows=(entity.facts.visualHistory || []).map(visual=>({...visual,entityId:entity.id,record:entity,path:entity.path}));
  if(!entity.image || rows.some(row=>row.image===entity.image))return rows;
  const credit=(entity.facts.credits || []).find(row=>row.role==='illustrator');
  const designer=entity.facts.relations?.find(row=>row.type==='character-designed-by')?.target || credit?.entity;
  return [...rows,{id:entity.id,title:entity.title,image:entity.image,date:null,entityId:entity.id,record:entity,path:entity.path,designer,designerName:credit?.name,sourceIds:credit?.sourceIds || []}];
 }).filter(visual=>(!query.year || visual.date?.startsWith(query.year)) && (!query.until || visual.date && visual.date.slice(0,4)<=query.until)).sort((a,b)=>query.sort==='title'?a.title.localeCompare(b.title) || a.id.localeCompare(b.id):query.sort==='oldest'?(a.date || '9999').localeCompare(b.date || '9999') || a.id.localeCompare(b.id):(b.date || '').localeCompare(a.date || '') || a.id.localeCompare(b.id));
}
