const stable=value=>Array.isArray(value)?value.map(stable):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const canonicalArchiveJSON=value=>JSON.stringify(stable(value));
export async function verifyArchiveSnapshot(snapshot,subtle=globalThis.crypto.subtle){
 if(snapshot?.version!==1 || !/^[a-f0-9]{64}$/.test(snapshot.snapshot || ''))return false;
 const {snapshot:expected,...payload}=snapshot;
 const hash=await subtle.digest('SHA-256',new TextEncoder().encode(canonicalArchiveJSON(payload)));
 return [...new Uint8Array(hash)].map(byte=>byte.toString(16).padStart(2,'0')).join('')===expected;
}
/** CSV formula text is escaped; numeric zero and negative numeric values remain numbers. */
export function archiveCSV(rows,columns=[...new Set(rows.flatMap(row=>Object.keys(row)))]){
 const cell=value=>{let text=value==null?'':typeof value==='object'?JSON.stringify(value):String(value);if(typeof value!=='number' && /^[\s\u0000-\u001f]*[=+\-@]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
 return '\ufeff'+[columns.map(cell).join(','),...rows.map(row=>columns.map(column=>cell(row[column])).join(','))].join('\r\n')+'\r\n';
}
export function archiveCitation(snapshot,ids=[],date=new Date()){
 const selected=new Set(ids),sources=[...new Set(snapshot.entities.filter(entity=>selected.has(entity.id)).flatMap(entity=>(entity.facts.sources || []).map(source=>source.url).filter(Boolean)))];
 return {archive:'KAMITSUBAKI Wiki contributors',snapshot:snapshot.snapshot,entities:[...selected],sources,url:'https://kamitsubaki.wiki/api/archive/v1/snapshots/'+snapshot.snapshot+'.json',accessedAt:date.toISOString().slice(0,10),textLicense:'CC-BY-NC-SA-4.0 unless a record specifies otherwise',mediaRights:'Images, recordings, videos and linked official embeds retain their respective rights.',missing:'Missing data means not recorded, never a confirmed absence.'};
}
export async function archiveZip(files){const {zipSync,strToU8}=await import('fflate');return zipSync(Object.fromEntries(Object.entries(files).map(([name,value])=>[name,strToU8(typeof value==='string'?value:JSON.stringify(value,null,2))])),{level:6});}
export function downloadArchiveFile(value,name,mime='application/json'){
 const blob=new Blob([value],{type:mime}),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=name.replace(/[^a-zA-Z0-9._-]/g,'-');anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export const flattenArchiveEntities=(snapshot,locale='zh')=>snapshot.entities.map(entity=>({id:entity.id,type:entity.type,title:entity.narratives[locale]?.title || entity.narratives.zh?.title || entity.id,date:entity.date,datePrecision:entity.datePrecision,path:entity.narratives[locale]?.path || entity.narratives.zh?.path || '',performers:(entity.facts.performers || []).map(p=>p.entity).join('|'),credits:(entity.facts.credits || []).length,sources:(entity.facts.sources || []).length,snapshot:snapshot.snapshot}));
const xml=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;');
const located=place=>place.world==='real' && Number.isFinite(place.coordinates?.lat) && Math.abs(place.coordinates.lat)<=90 && Number.isFinite(place.coordinates?.lng) && Math.abs(place.coordinates.lng)<=180;
export function pilgrimageGeoJSON(places,snapshot){
 return {type:'FeatureCollection',snapshot,features:places.filter(place=>place.world==='real').map((place,index)=>({type:'Feature',id:place.id,geometry:located(place)?{type:'Point',coordinates:[place.coordinates.lng,place.coordinates.lat]}:null,properties:{name:place.title,order:index+1,entities:place.entities,sourceIds:place.sourceIds || [],routeMeaning:'Selected stop order, not a road route'}}))};
}
export function pilgrimageGPX(places,snapshot){
 const points=places.filter(located).map(place=>`<rtept lat="${place.coordinates.lat}" lon="${place.coordinates.lng}"><name>${xml(place.title)}</name><desc>${xml(place.entities.join(', '))}</desc></rtept>`).join('');
 return `<?xml version="1.0" encoding="UTF-8"?><gpx version="1.1" creator="KAMITSUBAKI Wiki" xmlns="http://www.topografix.com/GPX/1/1"><metadata><desc>${xml('Snapshot '+snapshot+'; verified stops only; not a road route')}</desc></metadata><rte><name>Pilgrimage</name>${points}</rte></gpx>`;
}
