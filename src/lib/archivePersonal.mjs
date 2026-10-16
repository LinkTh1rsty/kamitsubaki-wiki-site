import {stableIdPattern} from './entityContract.mjs';
import {validBarcode} from './archiveBarcode.mjs';
export const emptyObservatory=()=>({version:1,records:[],routes:[],interests:[],passport:{published:false,name:'',note:''}});
const kinds=['heard','visited','owned','read','guarding'];
export function validateObservatory(value) {
 if(!value || value.version!==1 || !Array.isArray(value.records) || value.records.length>4000 || !Array.isArray(value.routes) || value.routes.length>100)throw new Error('invalid_observatory');
 const seen=new Set();
 const records=value.records.map(raw=>{
  if(!raw || !kinds.includes(raw.kind) || typeof raw.entityId!=='string' || !stableIdPattern.test(raw.entityId) || typeof raw.id!=='string' || raw.id.length>220 || seen.has(raw.id))throw new Error('invalid_record');
  seen.add(raw.id);
  if(!Number.isSafeInteger(raw.at) || raw.at<0 || raw.at>Date.now()+60000)throw new Error('invalid_timestamp');
  if(raw.visibility && !['private','public'].includes(raw.visibility))throw new Error('invalid_visibility');
  for(const [key,max] of [['note',3000],['editionId',180],['ticketUrl',1000],['date',10]])if(raw[key]!==undefined && (typeof raw[key]!=='string' || raw[key].length>max))throw new Error('invalid_'+key);
  if(raw.ticketUrl){const url=new URL(raw.ticketUrl);if(url.protocol!=='https:' || url.username || url.password)throw new Error('invalid_ticket');}
  if(raw.date && (!/^\d{4}-\d{2}-\d{2}$/.test(raw.date) || !Number.isFinite(Date.parse(raw.date+'T00:00:00Z')) || new Date(raw.date+'T00:00:00Z').toISOString().slice(0,10)!==raw.date))throw new Error('invalid_date');
  if(raw.barcode && !validBarcode(raw.barcode))throw new Error('invalid_barcode');
  return {id:raw.id,kind:raw.kind,entityId:raw.entityId,at:raw.at,visibility:raw.visibility || 'private',
   ...(raw.note?{note:raw.note}:{}),...(raw.editionId?{editionId:raw.editionId}:{}),...(raw.ticketUrl?{ticketUrl:raw.ticketUrl}:{}),...(raw.date?{date:raw.date}:{}),...(raw.barcode?{barcode:raw.barcode}:{})};
 });
 const routeIds=new Set();
 const routes=value.routes.map(raw=>{
  if(!raw || typeof raw.id!=='string' || raw.id.length>100 || routeIds.has(raw.id) || !Array.isArray(raw.places) || raw.places.length>100 || raw.places.some(id=>typeof id!=='string' || id.length>200))throw new Error('invalid_route');
  routeIds.add(raw.id);return {id:raw.id,places:[...new Set(raw.places)]};
 });
 const interests=value.interests || [];
 if(!Array.isArray(interests) || interests.length>30 || interests.some(id=>typeof id!=='string' || !stableIdPattern.test(id)))throw new Error('invalid_interests');
 const passport=value.passport || {published:false,name:'',note:''};
 if(typeof passport.published!=='boolean' || typeof passport.name!=='string' || passport.name.length>120 || typeof passport.note!=='string' || passport.note.length>1000 || passport.published && !passport.name.trim())throw new Error('invalid_passport');
 const result={version:1,records,routes,interests:[...new Set(interests)],passport:{published:passport.published,name:passport.name.trim(),note:passport.note.trim()}};
 if(new TextEncoder().encode(JSON.stringify(result)).length>400000)throw new Error('observatory_too_large');
 return result;
}
export function observatoryKey(owner){return 'kamitsubaki-observatory-v1:'+(owner || 'guest');}
export function loadObservatory(storage,owner=null){
 try{const parsed=JSON.parse(storage.getItem(observatoryKey(owner)) || 'null');if(!parsed)return {data:emptyObservatory(),revision:0,dirty:false};return {data:validateObservatory(parsed.data),revision:Number.isSafeInteger(parsed.revision)?parsed.revision:0,dirty:parsed.dirty===true};}
 catch{return {data:emptyObservatory(),revision:0,dirty:false};}
}
export function saveObservatory(storage,owner,data,revision=0,dirty=true) {
 const record={data:validateObservatory(data),revision,dirty};
 storage.setItem(observatoryKey(owner),JSON.stringify(record));
 if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('kamitsubaki-observatory-change',{detail:{owner}}));
 return record;
}
export function upsertObservation(data,record,now=Date.now()){
 const id=record.id || record.kind+':'+record.entityId+(record.editionId?':'+record.editionId:'');
 return validateObservatory({...data,records:[{...record,id,at:now},...data.records.filter(r=>r.id!==id)].slice(0,4000)});
}
export function completeObservatorySave(storage,owner,sentData,remote){
 const latest=loadObservatory(storage,owner),changed=JSON.stringify(latest.data)!==JSON.stringify(sentData);
 const data=changed?latest.data:remote.data;
 saveObservatory(storage,owner,data,remote.revision,changed);
 return {data,synced:!changed};
}
export function mergeObservatory(a,b){
 const merged=new Map(a.records.map(r=>[r.id,r]));
 for(const record of b.records)if(!merged.has(record.id) || record.at>merged.get(record.id).at)merged.set(record.id,record);
 const routes=new Map(a.routes.map(r=>[r.id,r]));for(const route of b.routes)routes.set(route.id,route);
 return validateObservatory({version:1,records:[...merged.values()].sort((x,y)=>y.at-x.at).slice(0,4000),routes:[...routes.values()].slice(0,100),interests:[...new Set([...(a.interests || []),...(b.interests || [])])].slice(0,30),passport:a.passport || {published:false,name:'',note:''}});
}
export function observatoryYear(data,year) {
 const rows=data.records.filter(record=>(record.kind==='visited'&&record.date?record.date:new Date(record.at).toISOString()).startsWith(String(year)));
 return Object.fromEntries(kinds.map(kind=>[kind,rows.filter(r=>r.kind===kind)]));
}
export function observatoryAchievements(data,approvedContributions=0) {
 const count=kind=>new Set(data.records.filter(r=>r.kind===kind).map(r=>r.entityId)).size;
 return [{id:'first-reading',kind:'read',goal:1,count:count('read')},{id:'ten-songs',kind:'heard',goal:10,count:count('heard')},{id:'first-visit',kind:'visited',goal:1,count:count('visited')},{id:'first-collection',kind:'owned',goal:1,count:count('owned')},{id:'first-contribution',kind:'approved',goal:1,count:approvedContributions}].map(row=>({...row,earned:row.count>=row.goal}));
}
