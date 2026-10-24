import {authorableRelations} from './entityContract.mjs';
import {navigationCategories,classificationNodeIds} from './classificationRules.mjs';
import {validBarcode} from './archiveResearch.mjs';
/** Schema v2 is the only authored encyclopedia model; no legacy transforms. */
export function createEntitySchema(z){
 const id=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
 const text=z.string().min(1);
 const date=z.string().regex(/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/);
 const url=z.string().refine(s=>/^https?:\/\/[^\s]+$/.test(s)||/^\/(?!\/)[^\s]*$/.test(s),'Expected HTTP URL or absolute site path');
 const roles=z.array(z.enum(['virtual-singer','singer-songwriter','vocalist','composer','lyricist','arranger','producer','illustrator','visual-director','scenario-writer','virtual-group','software-voice','mixer']));
 const lifecycle=z.object({activity:z.enum(['active','hiatus','ended','unknown']),startedAt:date.optional(),endedAt:date.nullable().optional(),archive:z.object({mode:z.enum(['none','permanent']),archiveDate:date.nullable().optional(),archiveNote:z.string().nullable().optional()}).optional()});
 const relations=z.array(z.object({type:z.enum(Object.keys(authorableRelations)),target:id,startDate:date.optional(),endDate:date.optional()}));
 const affiliations=z.array(z.object({organization:id,current:z.boolean(),type:z.string().optional(),startDate:date.optional(),endDate:date.optional(),endReason:z.enum(['independent','completed','transferred']).optional()}));
 const track=z.object({songId:id.optional(),title:z.string().optional(),disc:z.number().int().positive().optional(),number:z.string().optional(),artist:z.string().optional(),duration:z.string().optional(),legacySongId:z.string().optional()});
 const sourceIds=z.array(text).min(1);
 const credit=z.object({role:text,entity:id.optional(),name:text.optional(),sourceIds:sourceIds.optional()}).refine(c=>!!(c.entity||c.name),'Credit requires entity or name');
 const coordinates=z.object({lat:z.number().min(-90).max(90),lng:z.number().min(-180).max(180),sourceIds});
 const base={generated:z.boolean().optional(),generatedFrom:z.string().optional(),generatedFromHash:z.string().optional(),schemaVersion:z.literal(2),id,locale:z.enum(['zh','ja','en','zh-tw','zh-hk']),
  name:text.optional(),title:text.optional(),romanizedName:text.optional(),romanizedTitle:text.optional(),ruby:z.string().optional(),summary:z.string().optional(),aliases:z.array(z.string()).optional(),relations:relations.optional(),sources:z.array(z.object({id:z.string().optional(),title:text,url:url.optional(),type:z.string().optional(),publisher:z.string().optional(),page:z.string().optional(),publishedAt:date.optional()}).strict()).optional(),
  presentation:z.object({image:url.optional(),sortOrder:z.number().optional(),badge:z.string().optional(),theme:z.object({name:z.string().optional(),accentColor:z.string(),mutedColor:z.string().optional(),surfaceColor:z.string().optional(),highlightColor:z.string().optional(),palette:z.array(z.object({label:z.string(),value:z.string()})).optional()}).optional(),morphing:z.object({group:id,slot:z.string(),label:text.optional(),order:z.number().optional()}).optional()}).optional(),
  officialLinks:z.array(z.object({url,label:z.string().optional(),platform:z.string().optional()})).optional(),
  seo:z.object({titleOverride:z.string().optional(),description:z.string().optional(),image:z.string().optional(),keywords:z.array(z.string()).optional(),noindex:z.boolean().optional()}).optional(),
  license:z.object({code:z.enum(['CC-BY-NC-SA-4.0','CC-BY-NC-SA-3.0-CN','rights-reserved','authorized-use']),attribution:z.string().optional(),sourceTitle:z.string().optional(),sourceUrl:url.optional(),modifications:z.string().optional(),note:z.string().optional()}).optional(),
  contentStatus:z.enum(['stub','published']).optional(),researchImport:z.object({source:z.string(),sha256:z.string(),importedAt:date}).optional(),
  classification:z.object({primary:id.optional(),additional:z.array(id).optional(),group:id.optional()}).strict().optional(),
  tags:z.array(z.string()).optional(),
  credits:z.array(credit).optional(),
  evidence:z.array(z.object({id,field:text,sourceIds,checkedAt:date.optional(),status:z.enum(['unreviewed','reviewed','disputed']).default('unreviewed'),note:z.string().optional()})).optional(),
  visualHistory:z.array(z.object({id,title:text,date:date.optional(),image:url.optional(),designer:id.optional(),sourceIds,uses:z.array(z.object({entity:id,date:date.optional(),note:z.string().optional()})).optional()})).optional(),
  sourceHistory:z.array(z.object({id,url,title:text,capturedAt:z.string().datetime(),archiveUrl:url,sourceIds,note:z.string().optional()})).optional(),
 };
 const entity=(type,fields)=>z.object({...base,entityType:z.literal(type),...fields}).strict();
 const person={name:text,romanizedName:text,roles:roles.min(1),lifecycle,affiliations:affiliations.optional()};
 return z.discriminatedUnion('entityType',[
  entity('person',person),entity('virtual-avatar',person),entity('unit',person),
  entity('software-voice',{name:text,romanizedName:text,voiceEngines:z.array(z.object({engine:text,releaseDate:date.optional()})),relations,commercialLicense:z.object({url:url.optional(),summary:z.string().optional()}).optional(),roles:roles.optional(),lifecycle:lifecycle.optional(),affiliations:affiliations.optional()}),
  entity('work-track',{title:text,romanizedTitle:text,releaseDate:date.optional(),duration:z.string().regex(/^\d{1,3}:\d{2}(?::\d{2})?$/).optional(),performers:z.array(z.object({entity:id,role:text})),credits:z.array(credit),genres:z.array(z.string()).optional(),media:z.array(z.object({platform:text,type:text,id:z.string().optional(),url:url.optional()})).optional(),lyricsSources:z.array(z.object({label:text,href:url,provider:z.string(),checkedAt:date})).optional(),
   versions:z.array(z.object({entity:id,type:z.enum(['cover','remix','live','acoustic','instrumental','alternate']),sourceIds})).optional(),
   genome:z.object({bpm:z.object({value:z.number().positive().max(1000),sourceIds}).optional(),tags:z.array(z.object({dimension:z.enum(['mood','theme','tempo','style']),value:text,sourceIds})).optional()}).optional()}),
  entity('work-release',{title:text,romanizedTitle:z.string().optional(),releaseType:z.enum(['album','ep','single','soundtrack','live-album']),releaseDate:date.optional(),primaryArtist:id.optional(),label:id.optional(),catalogNumber:z.string().optional(),duration:z.string().optional(),tracks:z.array(track),editions:z.array(z.object({id,name:text,format:text,catalogNumber:z.string().optional(),barcode:z.string().regex(/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/).optional(),sourceIds:sourceIds.optional(),bonusItems:z.array(z.string()).optional()})).optional()}),
  entity('project',{status:z.enum(['active','completed','frozen']).optional(),subProjects:z.array(z.object({id:id.optional(),entity:id.optional(),name:z.string().optional(),type:z.string().optional(),url:url.optional()})).optional(),releaseDate:date.optional()}),
  entity('organization',{orgType:z.enum(['parent-company','creative-studio','creative-network','record-label','platform']),parentOrg:id.optional()}),
  entity('live-event',{eventType:z.enum(['oneman-live','joint-live','xr-sinka-live','exhibition','event']),dateRange:z.object({start:date,end:date.optional()}).optional(),venue:z.object({name:text,city:z.string().optional(),country:z.string().optional(),isVirtual:z.boolean().optional(),coordinates:coordinates.optional(),sourceIds:sourceIds.optional()}).optional(),headliners:z.array(id),guestPerformers:z.array(id).optional(),organizer:id.optional(),setlist:z.array(track).optional(),setlistStatus:z.enum(['partial','complete','unknown']).optional(),
   liveInfo:z.object({announcements:z.array(z.object({title:text,url,sourceIds})).optional(),tickets:z.array(z.object({name:text,url:url.optional(),price:z.string().optional(),sourceIds})).optional(),goods:z.array(z.object({name:text,url:url.optional(),sourceIds})).optional(),reports:z.array(z.object({title:text,url,sourceIds})).optional(),access:z.array(z.object({title:text,url,sourceIds})).optional()}).optional()}),
  entity('lore-concept',{loreCategory:z.enum(['glossary-term','fictional-resident','geography','concept']),belongToUniverse:id.optional()}),
  entity('editorial-article',{title:text,articleCategory:z.enum(['business','art-philosophy','profile','infrastructure','archival']),author:text.optional(),publishDate:date.optional(),relatedEntities:z.array(id).optional()}),
 ]).superRefine((d,c)=>{
  if(d.contentStatus!=='stub'){
   for(const key of ({'work-release':['releaseDate'],'project':['status'],'live-event':['dateRange'],'editorial-article':['author','publishDate']}[d.entityType]||[]))if(d[key]===undefined)c.addIssue({code:'custom',path:[key],message:'Required for published entries'});
  }
  const placement=d.classification;
  if(placement?.primary){const category=navigationCategories.find(c=>c.id===placement.primary);if(!category||!category.types.includes(d.entityType)&&!(category.id==='groups'&&placement.group&&['person','virtual-avatar'].includes(d.entityType)))c.addIssue({code:'custom',path:['classification','primary'],message:'Unknown or incompatible primary category'});}
  for(const category of placement?.additional||[])if(!classificationNodeIds.includes(category)&&!/^group-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category))c.addIssue({code:'custom',path:['classification','additional'],message:'Unknown classification node: '+category});
  if(placement?.group){
   if(!['person','virtual-avatar'].includes(d.entityType)||placement.primary&&placement.primary!=='groups')c.addIssue({code:'custom',path:['classification','group'],message:'A member folder requires a person/avatar and groups primary category'});
   if(!d.relations?.some(r=>r.type==='member-of'&&r.target===placement.group))c.addIssue({code:'custom',path:['classification','group'],message:'Primary group requires an explicit member-of relation'});
  }
  if(!d.name&&!d.title)c.addIssue({code:'custom',path:['name'],message:'An entity requires a name or title'});
  if(d.entityType==='software-voice'&&!d.relations.some(r=>r.type==='based-on-voice'))c.addIssue({code:'custom',path:['relations'],message:'Voice source required'});
  const knownSources=new Set((d.sources||[]).map((source,index)=>source.id||'source-'+index));
  if(knownSources.size!==(d.sources||[]).length)c.addIssue({code:'custom',path:['sources'],message:'Source IDs must be unique'});
  const inspect=(value,path=[])=>{
   if(!value||typeof value!=='object')return;
   for(const [key,item]of Object.entries(value)){
    if(key==='sourceIds'&&Array.isArray(item)){for(const [index,sourceId]of item.entries())if(!knownSources.has(sourceId))c.addIssue({code:'custom',path:[...path,key,index],message:'Unknown source ID: '+sourceId});}
    else if(item&&typeof item==='object')inspect(item,[...path,key]);
   }
  };
  inspect(d);
  for(const [index,edition]of (d.editions||[]).entries())if(edition.barcode&&!validBarcode(edition.barcode))c.addIssue({code:'custom',path:['editions',index,'barcode'],message:'Invalid barcode checksum'});
 });
}
