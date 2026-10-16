import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {getEntityRegistry} from './entityRegistry.mjs';
import {loadFeatureData,featureText} from './featureData.mjs';
import {storyMedia} from './storyCatalog.mjs';
import {entityRoute,entityEdges} from './entityModel.mjs';
import {entityCompleteness} from './entityCompleteness.mjs';
import {normalizeDate} from './labsCatalog.mjs';
import {convertChineseContentValue} from './traditionalChinese.mjs';
import {unique,archiveVersion} from './archiveResearch.mjs';
import {sharedFactFields,canonicalEntityEntry} from './sharedEntityFacts.mjs';
import {validatePhysicalItems} from './archivePhysical.mjs';

// Narrative fields never override canonical fact values. Conflicting translated facts are reported.
export {sharedFactFields} from './sharedEntityFacts.mjs';
const stable = value => Array.isArray(value)?value.map(stable):value && typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable(value[key])])):value;
export const stableArchiveJSON=value=>JSON.stringify(stable(value));
export const archiveDigest=value=>createHash('sha256').update(stableArchiveJSON(value)).digest('hex');
function getHistory() {
  try {
    const raw=execFileSync('git',['log','--no-renames','-1500','--format=COMMIT%x09%H%x09%aI%x09%s','--name-only','--','src/content','src/data/chronicle'],{encoding:'utf8',maxBuffer:8*1024*1024,stdio:['ignore','pipe','ignore']});
    const files=new Map();let commit;
    for(const line of raw.split(/\r?\n/)){
      if(line.startsWith('COMMIT\t')){const [,sha,date,...title]=line.split('\t');commit={sha,date,title:title.join('\t')};}
      else if(line && commit){if(!files.has(line))files.set(line,[]);files.get(line).push(commit);}
    }
    return files;
  } catch { return new Map(); }
}
export async function buildArchiveSnapshot(registry,feature) {
  const history=getHistory(),entities=[],relations=[],evidence=[],issues=[];
  for(const [id,translations] of [...registry.entities].sort((a,b)=>a[0].localeCompare(b[0]))){
    const entry=canonicalEntityEntry(translations);
    const d=entry.data;
    if(d.schemaVersion!==2)continue;
    const facts=Object.fromEntries(sharedFactFields.filter(key=>d[key]!==undefined).map(key=>[key,d[key]]));
    const narratives={};
    for(const [locale,translation] of translations){
      const t=translation.data;
      narratives[locale]={locale,title:t.name || t.title || id,romanized:t.romanizedName || t.romanizedTitle || '',summary:t.summary || '',aliases:t.aliases || [],path:'/'+locale+entityRoute(d)};
      for(const field of sharedFactFields.filter(key=>!['sources','venue','credits','tracks','setlist','subProjects','liveInfo','evidence','visualHistory'].includes(key))){
        if(t[field]!==undefined && d[field]!==undefined && stableArchiveJSON(t[field])!==stableArchiveJSON(d[field]))issues.push({id,locale,field,kind:'fact-drift'});
      }
    }
    if(narratives.zh)for(const locale of ['zh-tw','zh-hk'])narratives[locale]={...convertChineseContentValue(narratives.zh,locale),locale,path:'/'+locale+entityRoute(d),generated:true};
    const file=String(entry.filePath || '').replaceAll('\\','/').split('src/content/')[1];
    const sourceFile=file?'src/content/'+file:null;
    const media=storyMedia(d,entry.body || '',{includeLinks:false,maxItems:6,allowIdentifiers:true}).map(item=>({platform:item.provider,type:'recorded-embed',url:item.href,embed:{provider:item.provider,src:item.src,kind:item.kind,label:item.label,allow:item.allow,...(item.sandbox?{sandbox:item.sandbox}:{}),...(item.height?{height:item.height}:{})}}));
    // Same-ID field claims require explicit evidence. An article's source list alone is not verification.
    const sourceMap=new Map((d.sources || []).map((source,index)=>[source.id || 'source-'+index,source]));
    for(const claim of d.evidence || []){
      const sources=claim.sourceIds.map(sourceId=>({id:sourceId,...sourceMap.get(sourceId)})).filter(source=>source.title);
      if(sources.length!==claim.sourceIds.length)issues.push({id,field:claim.field,kind:'missing-evidence-source'});
      evidence.push({...claim,id:id+':'+claim.id,entityId:id,sources,status:claim.status || 'unreviewed'});
    }
    entities.push({id,type:d.entityType,canonicalLocale:d.locale,facts,narratives,media,
      image:d.presentation?.image || '',morphing:d.presentation?.morphing || null,date:d.releaseDate || d.dateRange?.start || d.lifecycle?.startedAt || '',
      datePrecision:normalizeDate(d.releaseDate || d.dateRange?.start || d.lifecycle?.startedAt)?.precision || null,
      status:d.contentStatus || 'published',completeness:entityCompleteness(d),sourceFile,history:history.get(sourceFile) || []});
    for(const edge of entityEdges(d))relations.push({...edge,recordId:id,path:'/'+d.locale+entityRoute(d)});
  }
  const known=new Set(entities.map(e=>e.id));
  for(const edge of relations)if(!known.has(edge.target))issues.push({id:edge.source,field:edge.type,target:edge.target,kind:'unresolved-relation'});
  const events=feature.events.map(event=>({...event,text:Object.fromEntries(['zh','zh-tw','zh-hk','ja','en'].map(locale=>[locale,{...featureText(event.text,locale),locale: event.text[locale] || ['zh-tw','zh-hk'].includes(locale) && event.text.zh?locale:event.text.zh?'zh':Object.keys(event.text)[0]}]))}));
  let physical=[];try{physical=JSON.parse(await readFile('src/data/physical-items.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  validatePhysicalItems(physical,known);
  const payload={version:archiveVersion,entities,relations,events,evidence,physical,issues};
  return {snapshot:archiveDigest(payload),...payload};
}
let cached,pending;
export async function getArchiveSnapshot() {
  if(import.meta.env?.PROD && cached)return cached;
  if(pending)return pending;
  pending=(async()=>{
  const [registry,feature]=await Promise.all([getEntityRegistry(),loadFeatureData()]);
  const snapshot=await buildArchiveSnapshot(registry,feature);
  if(import.meta.env?.PROD)cached=snapshot;
  return snapshot;
  })();
  try{return await pending;}finally{pending=undefined;}
}
export function archiveManifest(snapshot) {
  return {version:archiveVersion,snapshot:snapshot.snapshot,identity:'stable entity IDs',canonicalFacts:snapshot.entities[0]?.canonicalLocale || 'zh',
    locales:['zh','zh-tw','zh-hk','ja','en'],endpoints:['entities','relations','events','calendar','physical','credits','evidence','translations','issues','schema','catalogue'],
    snapshotUrl:'/api/archive/v1/snapshots/'+snapshot.snapshot+'.json',
    counts:{entities:snapshot.entities.length,relations:snapshot.relations.length,events:snapshot.events.length,evidence:snapshot.evidence.length,issues:snapshot.issues.length},
    license:{text:'CC-BY-NC-SA-4.0 unless a record specifies otherwise',media:'Media and linked official embeds retain their respective rights.'},
    citation:{required:['entity ID','snapshot SHA-256','source URL','access date'],credit:'KAMITSUBAKI Wiki contributors'},
    missing:'Missing values mean not recorded, never a confirmed absence.'};
}
