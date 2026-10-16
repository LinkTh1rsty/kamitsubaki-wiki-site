import {primaryNavigationCategory,memberNavigationGroup} from './entityNavigation.mjs';
export {entityTypes,entityCollections,authorableRelations,stableIdPattern} from './entityContract.mjs';
export function entityRoute(data) {
 if(data.entityType==='editorial-article')return `/articles/${data.articleCategory}/${data.id}/`;
 const group=memberNavigationGroup(data);
 if(group)return `/database/artists/groups/${group}/members/${data.id}/`;
 const category=primaryNavigationCategory(data);
 if(!category)throw new Error(`No navigation category for ${data.id}`);
 return `/database/${category.path}/${data.id}/`;
}
export function entityEdges(data) {
  const edges=[];
  const add=(target,type,extra={})=>{if(target)edges.push({source:data.id,target,type,...extra});};
  for(const r of data.relations||[])add(r.target,r.type,{startDate:r.startDate,endDate:r.endDate});
  for(const p of data.performers||[])add(p.entity,'performed-by',{role:p.role});
  for(const c of data.credits||[])add(c.entity,'credited-to',{role:c.role});
  for(const a of data.affiliations||[])if(typeof a==='object')add(a.organization,'affiliated-with',{...a});
  for(const t of data.tracks||[])add(t.songId,'includes-track',{disc:t.disc,number:t.number});
  for(const t of data.setlist||[])add(t.songId,'performed-track',{number:t.number});
  for(const version of data.versions||[])add(version.entity,'version-of',{versionType:version.type,sourceIds:version.sourceIds});
  for(const id of data.headliners||[])add(id,'headlined-by');
  for(const id of data.guestPerformers||[])add(id,'guest-performer');
  for(const id of data.relatedEntities||[])add(id,'discusses');
  for(const key of ['primaryArtist','label','parentOrg','organizer','belongToUniverse'])add(data[key],key);
  return edges;
}
