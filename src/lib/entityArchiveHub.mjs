/** Counts describe recorded, distinct identities; credits and track entries retain their own grain. */
export function entityArchiveHub(registry,id,locale='zh',timeline=[]){
 const entity=registry.resolveEntity(id,locale);if(!entity)return [];
 const data=entity.data,incoming=registry.getIncomingRelations(id),outgoing=registry.getOutgoingRelations(id);
 const refs=(ids,type)=>[...new Set(ids)].flatMap(key=>{const entry=registry.resolveEntity(key,locale);return entry && (!type || entry.data.entityType===type)?[{id:key,title:entry.data.title || entry.data.name || key,path:entry.url}]:[];});
 const metrics=[];
 const add=(key,ids,href,type,count)=>{const records=refs(ids,type);metrics.push({key,labelKey:key==='credits'?(data.entityType==='work-track'?'creditEntries':'creditedWorks'):key==='songs'?'performedSongs':key,count:count ?? records.length,records,href});};
 if(['person','virtual-avatar','unit','software-voice'].includes(data.entityType)){
  add('songs',incoming.filter(edge=>edge.type==='performed-by').map(edge=>edge.source),'/'+locale+'/explore/music/?artist='+id,'work-track');
  add('releases',incoming.filter(edge=>edge.type==='primaryArtist').map(edge=>edge.source),'/'+locale+'/explore/music/?type=work-release&artist='+id,'work-release');
  add('lives',incoming.filter(edge=>['headlined-by','guest-performer'].includes(edge.type)).map(edge=>edge.source),'/'+locale+'/explore/live-mode/?artist='+id,'live-event');
  add('credits',incoming.filter(edge=>edge.type==='credited-to').map(edge=>edge.source),'/'+locale+'/explore/credits/?creator='+encodeURIComponent('entity:'+id));
 }
 if(data.entityType==='work-track'){
  add('releases',incoming.filter(edge=>edge.type==='includes-track').map(edge=>edge.source),'/'+locale+'/explore/music/?entry='+id,'work-release');
  add('performances',incoming.filter(edge=>edge.type==='performed-track').map(edge=>edge.source),'/'+locale+'/explore/music/?entry='+id,'live-event');
  add('credits',outgoing.filter(edge=>edge.type==='credited-to').map(edge=>edge.target),'/'+locale+'/explore/music/?entry='+id,undefined,(data.credits || []).length);
 }
 if(data.entityType==='work-release')add('trackEntries',(data.tracks || []).map(track=>track.songId).filter(Boolean),'#entry-tracks','work-track',(data.tracks || []).length);
 if(data.entityType==='live-event')add('setlistEntries',(data.setlist || []).map(track=>track.songId).filter(Boolean),'/'+locale+'/explore/live-mode/?entry='+id,'work-track',(data.setlist || []).length);
 const events=[...new Map(timeline.map(event=>[event.id,event])).values()];
 metrics.push({key:'chronicle',count:events.length,records:[],href:'/'+locale+'/chronicle/?view=list&entity='+id});
 return metrics;
}
