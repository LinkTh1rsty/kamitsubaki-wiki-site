import {entityLabel} from './entityLabels.mjs';
import {resolveLocaleCopy} from './i18n.mjs';
import {entityArtwork,entityLeadArtists,entityPresentationKind} from './entityPresentation.mjs';
import {detectExternalPlatform} from './externalPlatforms.mjs';

const copies={
 zh:{card:'资料卡',roles:'身份 / 职能',activity:'活动状态',start:'开始活动',end:'结束活动',date:'发行日期',eventDate:'演出日期',duration:'时长',affiliations:'所属 / 厂牌',links:'官方链接',theme:'词条配色',credits:'制作名单',engine:'声库引擎',venue:'场地',release:'发行形式',more:'更多资料',joined:'加入',left:'离开'},
 ja:{card:'情報欄',roles:'役割',activity:'活動状況',start:'活動開始',end:'活動終了',date:'発売日',eventDate:'公演日程',duration:'長さ',affiliations:'所属',links:'公式リンク',theme:'テーマ配色',credits:'クレジット',engine:'音声エンジン',venue:'会場',release:'リリース形式',more:'詳しい情報',joined:'所属開始',left:'所属終了'},
 en:{card:'Record details',roles:'Roles',activity:'Activity',start:'Active since',end:'Active until',date:'Release date',eventDate:'Event dates',duration:'Duration',affiliations:'Affiliations',links:'Official links',theme:'Palette',credits:'Credits',engine:'Voice engines',venue:'Venue',release:'Release type',more:'More details',joined:'Joined',left:'Left'},
};
const safeHref=value=>typeof value==='string'&&/^(?:https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(value);

/** @typedef {{key:string,label:string,value:string}} InfoFact */
/** @typedef {{
 * copy:Record<string,string>,kind:'artist'|'music'|null,title:string,type:string,typeLabel:string,romanized:string,
 * artwork:{src:string,placeholder:boolean},showArtwork:boolean,artists:{id:string,title:string,url:string}[],
 * coreFacts:InfoFact[],extraFacts:InfoFact[],
 * affiliations:{title:string,url:string,historical:boolean,historicalLabel:string,dates:string}[],
 * credits:{role:string,title:string,url?:string}[],
 * links:{url:string,label:string,platform:{id:string,name:string,color:string,icon:string|null}}[],
 * palette:{value:string,label:string}[],hasMore:boolean
 * }} EntityInfoModel */

/** Shared reader/authoring display model. Both surfaces resolve names and select
 * facts from this function rather than interpreting metadata independently.
 * @param {Record<string,any>} data
 * @param {Pick<import('./entityRegistry.mjs').EntityRegistry,'resolveEntity'>} registry
 * @param {string} locale
 * @returns {EntityInfoModel}
 */
export function entityInfoModel(data,registry,locale='zh'){
 const d=data,kind=entityPresentationKind(d),copy=resolveLocaleCopy(copies,locale);
 const facts=[
  {key:'roles',label:copy.roles,value:d.roles?.map(role=>entityLabel(role,locale)).join(' / ')},
  {key:'activity',label:copy.activity,value:d.lifecycle?.activity&&entityLabel(d.lifecycle.activity,locale)},
  {key:'start',label:copy.start,value:d.lifecycle?.startedAt},
  {key:'end',label:copy.end,value:d.lifecycle?.endedAt},
  {key:'date',label:d.entityType==='live-event'?copy.eventDate:copy.date,value:d.releaseDate||(d.dateRange?.start?[d.dateRange.start,d.dateRange.end!==d.dateRange.start&&d.dateRange.end].filter(Boolean).join(' — '):undefined)},
  {key:'duration',label:copy.duration,value:d.duration},
  {key:'release',label:copy.release,value:d.releaseType&&entityLabel(d.releaseType,locale)},
  {key:'engine',label:copy.engine,value:d.voiceEngines?.map(e=>e.engine).join(' / ')},
  {key:'venue',label:copy.venue,value:d.venue?.name},
 ].filter(f=>f.value);
 const coreKeys=kind==='artist'?['roles','activity','start','end']:kind==='music'?['date','duration','release']:facts.map(f=>f.key);
 const affiliations=(d.affiliations||[]).flatMap(a=>{
  const e=registry.resolveEntity(a.organization,locale);if(!e)return [];
  const dates=[a.startDate&&`${copy.joined} ${a.startDate}`,a.endDate&&`${copy.left} ${a.endDate}`].filter(Boolean).join(' · ');
  return [{title:e.data.name||e.data.title,url:e.url,historical:!a.current,historicalLabel:entityLabel('historical',locale),dates}];
 });
 const credits=(d.credits||[]).map(c=>{
  const e=c.entity?registry.resolveEntity(c.entity,locale):undefined;
  return {role:entityLabel(c.role,locale),title:e?.data.name||e?.data.title||c.name||'',url:e?.url};
 });
 const links=(d.officialLinks||[]).filter(link=>safeHref(link.url)).map(link=>{
  const label=link.label||link.platform||link.url,platform=detectExternalPlatform({href:link.url,label});
  return {url:link.url,label,platform:{id:platform.id,name:platform.name,color:platform.color,icon:platform.icon?.path||null}};
 });
 const palette=(d.presentation?.theme?.palette||[]).filter(swatch=>/^#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i.test(swatch.value));
 const coreFacts=facts.filter(f=>coreKeys.includes(f.key)),extraFacts=facts.filter(f=>!coreKeys.includes(f.key));
 return {copy,kind,title:d.name||d.title,type:d.entityType,typeLabel:entityLabel(d.entityType,locale),romanized:d.romanizedName||d.romanizedTitle||'',artwork:entityArtwork(d),showArtwork:Boolean(d.presentation?.image||kind),artists:kind==='music'?entityLeadArtists(d,registry,locale):[],coreFacts,extraFacts,affiliations,credits,links,palette,hasMore:extraFacts.length>0||affiliations.length>0||credits.length>0||links.length>0||palette.length>0};
}
