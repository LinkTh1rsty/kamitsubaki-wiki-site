/** Editorial hints, derived only from the canonical V3 contract. */
import {concertEventTypes} from './entityContract.mjs';
export function entityCompleteness(data){
 /** @type {Array<[string,number]>} */
 const rules=[['summary',2],['sources',2],['presentation.image',1]];
 if(['person','virtual-avatar','unit'].includes(data.entityType))rules.push(['roles',2],['lifecycle.startedAt',1],['officialLinks',1]);
 if(data.entityType==='work-track')rules.push(['performers',2],['credits',2],['releaseDate',1],['lyricsSources',1]);
 if(data.entityType==='work-release')rules.push(['tracks',2],['releaseDate',1],['primaryArtist',1]);
 if(data.entityType==='live-event'){
  rules.push(['dateRange.start',1],['venue.name',1],['headliners',1]);
  if(concertEventTypes.includes(data.eventType))rules.push(['setlist',2]);
 }
 const missing=rules.filter(([key])=>{const v=key.split('.').reduce((o,k)=>o?.[k],data);return v==null||typeof v==='string'&&!v.trim()||Array.isArray(v)&&v.length===0||key==='presentation.image'&&/^https?:\/\/(?:www\.)?placehold\.co(?:[/?#]|$)/i.test(v);}).map(([field,weight])=>({field,weight}));
 const total=rules.reduce((n,[,w])=>n+w,0);const score=Math.round(100*(total-missing.reduce((n,r)=>n+r.weight,0))/total);
 return {score,tier:score>=90?'complete':score>=60?'good':score>=30?'brief':'stub',missing};
}
