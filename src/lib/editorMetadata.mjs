import {navigationCategories,classificationNodeIds} from './classificationRules.mjs';
import morphSlots from '../data/morph-slots.json' with {type:'json'};
import {authorableRelations} from './entityContract.mjs';
export const metadataDefaults = {
  seo:{titleOverride:'',description:'',image:'',keywords:[],noindex:false},
  theme:{name:'',accentColor:'#6bd7c3',mutedColor:'#397c70',surfaceColor:'#111211',highlightColor:'#f1faf7',palette:[{label:'',value:'#6bd7c3'}]},
  license:{code:'CC-BY-NC-SA-4.0',attribution:'',sourceTitle:'',sourceUrl:'',modifications:'',note:''},
  officialLinks:[{label:'',href:''}], featuredEntries:[{label:'',href:'',kind:'artist'}],
  tracks:[{disc:1,number:'1',title:'',artist:'',duration:'',songId:''}],
  lyricsSources:[{label:'',href:'',provider:'official',checkedAt:''}],
  artistIds:[],affiliations:[],designCredits:[],contentStatus:'published',inactive:false,
  debutDate:'',categoryOrder:0,itemOrder:0,categorySubtitle:'',code:'',meta:'',romanizedTitle:'',duration:'',
};
const legacyMetadataOptions = kind => ['seo','license', ...(['artists','songs','albums'].includes(kind)?['theme','categoryOrder','itemOrder','categorySubtitle','code']:[]), ...({artists:['officialLinks','featuredEntries','affiliations','designCredits','inactive','debutDate','meta','contentStatus'],songs:['artistIds','lyricsSources','contentStatus'],albums:['officialLinks','tracks','romanizedTitle','duration'],projects:['officialLinks'],logs:[]}[kind]||[])];
const names = {
  seo:['搜索与分享','Search and sharing','検索・共有'],theme:['主题配色','Theme colors','テーマ配色'],license:['授权与署名','License and attribution','ライセンス・帰属'],officialLinks:['官方链接','Official links','公式リンク'],featuredEntries:['相关词条','Related articles','関連記事'],tracks:['曲目列表','Track list','収録曲'],lyricsSources:['歌词来源','Lyric sources','歌詞の出典'],artistIds:['参与艺人标识','Contributing artist IDs','参加アーティスト ID'],affiliations:['所属组合 / 厂牌','Affiliations','所属'],designCredits:['设计人员','Design credits','デザイン担当'],contentStatus:['完善状态','Completeness','整備状況'],inactive:['停止活动','Inactive','活動終了'],debutDate:['出道日期','Debut date','デビュー日'],categoryOrder:['分类排序','Category order','カテゴリ順'],itemOrder:['词条排序','Entry order','記事順'],categorySubtitle:['分类副标题','Category subtitle','カテゴリ副題'],code:['编号','Code','コード'],meta:['附注','Note','備考'],romanizedTitle:['罗马字标题','Romanized title','ローマ字タイトル'],duration:['时长','Duration','長さ'],
  title:['标题','Title','タイトル'],description:['说明','Description','説明'],image:['图片地址','Image URL','画像 URL'],keywords:['关键词','Keywords','キーワード'],noindex:['不被搜索引擎收录','Hide from search engines','検索エンジンから除外'],name:['名称','Name','名前'],accentColor:['主色','Accent color','メイン色'],mutedColor:['辅助色','Muted color','補助色'],surfaceColor:['背景色','Surface color','背景色'],highlightColor:['高光色','Highlight color','強調色'],palette:['色板','Palette','パレット'],label:['显示名称','Label','表示名'],value:['颜色值','Color value','色値'],attribution:['原作者署名','Attribution','著者名'],sourceTitle:['原文标题','Source title','原文タイトル'],sourceUrl:['原文链接','Source URL','原文 URL'],modifications:['修改说明','Modifications','変更点'],note:['补充说明','Note','備考'],href:['链接','Link','リンク'],kind:['类型','Kind','種類'],disc:['碟号','Disc','ディスク番号'],number:['曲序','Track number','曲順'],artist:['艺人','Artist','アーティスト'],songId:['歌曲词条路径','Song entry path','楽曲記事パス'],provider:['来源类型','Source type','出典種別'],checkedAt:['核对日期','Checked on','確認日'],
};
export function metadataLabel(key,locale) { return names[key]?.[locale==='en'?1:locale==='ja'?2:0] || key; }
export const metadataChoices = {
  'license.code':['CC-BY-NC-SA-4.0','CC-BY-NC-SA-3.0-CN','rights-reserved','authorized-use'],
  contentStatus:['published','stub'],provider:['official','publisher','lyrics-service'],kind:['artist','project','album','song'],
};
export function newMetadataItem(path, array, meta={}) {
  const key=path.split('.')[0];
  if(path.endsWith('.palette'))return {label:'',value:'#8eaaa8'};
  if(path.endsWith('.bonusItems'))return '';
  if(key==='subProjects')return {name:''};
  if(key==='theme'&&path.endsWith('palette'))return {label:'',value:'#6bd7c3'};
  if(key==='affiliations'&&meta.schemaVersion===2)return {organization:'',current:true};
  if(key==='officialLinks'&&meta.schemaVersion===2)return {platform:'official-site',label:'',url:''};
  const exemplar=metadataDefaults[key]?.[0];
  if(exemplar&&typeof exemplar==='object')return structuredClone(exemplar);
  const existing=array.find(item=>item&&typeof item==='object');
  return existing ? Object.fromEntries(Object.entries(existing).map(([key,value])=>[key,typeof value==='number'?0:typeof value==='boolean'?false:Array.isArray(value)?[]:''])) : '';
}
export function advancedErrors(meta) {
  const errors=[];
  const link = value => /^(?:https?:\/\/[^\s]+|\/(?!\/)[^\s]*)$/.test(value || '');
  if(meta.schemaVersion===2)return [];
  if(meta.schemaVersion===2){for(const r of meta.relations||[])if(!r.type||!r.target)errors.push('relations');for(const r of meta.performers||[])if(!r.entity||!r.role)errors.push('performers');}
  if(meta.theme) {
    if(!meta.theme.accentColor||!Array.isArray(meta.theme.palette)) errors.push('theme');
    for(const row of meta.theme.palette||[])if(!row.label||!/^#[0-9a-f]{6}$/i.test(row.value))errors.push('theme');
  }
  if(meta.license) {
    if(!metadataChoices['license.code'].includes(meta.license.code))errors.push('license');
    if(meta.license.sourceUrl&&!link(meta.license.sourceUrl))errors.push('license');
    if(meta.license.code==='CC-BY-NC-SA-3.0-CN'&&['attribution','sourceTitle','sourceUrl','modifications'].some(key=>!meta.license[key]))errors.push('license');
  }
  for(const key of ['officialLinks','featuredEntries','lyricsSources'])for(const row of meta[key]||[]) {
    if((meta.schemaVersion!==2&&!row.label)||!link(row.url||row.href))errors.push(key);
    if(key==='lyricsSources'&&(!row.href.startsWith('https://')||!metadataChoices.provider.includes(row.provider)||!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(row.checkedAt)))errors.push(key);
    if(key==='featuredEntries'&&!metadataChoices.kind.includes(row.kind))errors.push(key);
  }
  if(meta.artistIds && (!meta.artistIds.includes(meta.artistId)||new Set(meta.artistIds).size!==meta.artistIds.length||meta.artistIds.some(id=>! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))))errors.push('artistIds');
  for(const row of meta.tracks||[])if(!row.title||(row.disc!==undefined&&(!Number.isInteger(row.disc)||row.disc<1)))errors.push('tracks');
  return [...new Set(errors)];
}

Object.assign(metadataDefaults,{
  relations:[{type:'related-project',target:''}],performers:[{entity:'',role:'lead-vocal'}],credits:[{name:'',role:'composer'}],
  lifecycle:{activity:'unknown',archive:{mode:'none',archiveNote:''}},roles:[],genres:[],tags:[],relatedEntities:[],
  presentation:{sortOrder:0,theme:{accentColor:'#8eaaa8'}},
  sources:[{title:'',type:'official-site',url:''}],media:[{platform:'youtube',type:'music-video',url:''}],
  voiceEngines:[{engine:''}],dateRange:{start:''},headliners:[],setlist:[{number:'1',songId:''}],
});
const domainOptions={person:['roles','lifecycle','affiliations'], 'virtual-avatar':['roles','lifecycle','affiliations'],unit:['roles','lifecycle','affiliations'],'software-voice':['voiceEngines','commercialLicense','roles','lifecycle','affiliations'],'work-track':['releaseDate','duration','performers','credits','genres','media','lyricsSources'],'work-release':['releaseType','releaseDate','primaryArtist','label','catalogNumber','tracks','editions'],project:['status','subProjects','releaseDate'],organization:['orgType','parentOrg'],'live-event':['eventType','dateRange','venue','headliners','guestPerformers','organizer','setlist'],'lore-concept':['loreCategory','belongToUniverse'],'editorial-article':['articleCategory','author','publishDate','relatedEntities']};
export const metadataOptions=(kind,meta={})=>meta.schemaVersion===2?['aliases','summary','classification','relations','tags','presentation','sources','officialLinks','seo','license','contentStatus',...(domainOptions[meta.entityType]||[])]:legacyMetadataOptions(kind);

Object.assign(metadataChoices,{activity:['active','hiatus','ended','unknown'],mode:['none','permanent'],releaseType:['album','ep','single','soundtrack','live-album'],endReason:['independent','completed','transferred']});

export function metadataDefault(key,meta={}){if(meta.schemaVersion===2&&key==='officialLinks')return [{platform:'official-site',label:'',url:''}];if(meta.schemaVersion===2&&key==='affiliations')return [{organization:'',current:true}];return structuredClone(metadataDefaults[key]);}

Object.assign(metadataDefaults,{aliases:[],releaseDate:'',releaseType:'album',primaryArtist:'',label:'',catalogNumber:'',editions:[{id:'',name:'',format:''}],status:'active',subProjects:[],orgType:'creative-studio',parentOrg:'',eventType:'oneman-live',venue:{name:'',city:'',country:'',isVirtual:false},guestPerformers:[],organizer:'',loreCategory:'glossary-term',belongToUniverse:'',articleCategory:'archival',author:'',publishDate:'',commercialLicense:{summary:''}});
Object.assign(metadataChoices,{roles:['virtual-singer','singer-songwriter','vocalist','composer','lyricist','arranger','producer','illustrator','visual-director','scenario-writer','virtual-group','software-voice','mixer'], 'relations.type':Object.keys(authorableRelations),orgType:['parent-company','creative-studio','creative-network','record-label','platform'],eventType:['oneman-live','joint-live','xr-sinka-live','exhibition','event'],loreCategory:['glossary-term','fictional-resident','geography','concept'],articleCategory:['business','art-philosophy','profile','infrastructure','archival'],status:['active','completed','frozen']});
Object.assign(names,{relations:['实体关系','Relations','関連'],performers:['演唱者','Performers','歌唱'],credits:['制作名单','Credits','制作'],lifecycle:['活动与归档','Activity and archive','活動・アーカイブ'],roles:['身份与职能','Roles','役割'],presentation:['图片与呈现','Presentation','表示'],sources:['资料来源','Sources','出典'],entity:['关联实体 ID','Entity ID','項目 ID'],target:['目标实体 ID','Target entity ID','関連先 ID'],organization:['组织 ID','Organization ID','組織 ID'],current:['当前所属','Current affiliation','現在の所属'],url:['链接地址','URL','URL'],activity:['活动状态','Activity','活動状況'],archive:['归档','Archive','アーカイブ'],mode:['归档方式','Archive mode','アーカイブ種別'],releaseType:['发行形式','Release type','形式'],orgType:['组织类型','Organization type','組織種別'],loreCategory:['设定分类','Lore category','設定分類'],articleCategory:['专栏分类','Article category','記事分類'],author:['作者','Author','著者'],publishDate:['发布日期','Published','公開日'],releaseDate:['发行日期','Release date','発売日'],titleOverride:['搜索标题','Search title','検索用タイトル'],voiceEngines:['声库引擎','Voice engines','音声エンジン'],dateRange:['活动日期','Dates','開催日'],headliners:['主要出演者','Headliners','出演者'],genres:['曲风','Genres','ジャンル']});

// Nested optional fields remain addable after importing a minimal entity.
export const nestedMetadataDefaults = {
 classification:{primary:'solo',additional:[],group:''},
 'presentation.morphing':{group:'',slot:'virtual-artist',label:'',order:0},
 presentation:{image:'',sortOrder:0,badge:'',theme:{accentColor:'#8eaaa8'},morphing:{group:'',slot:'virtual-artist',order:0}},
 'presentation.theme':metadataDefaults.theme,
 lifecycle:{activity:'unknown',startedAt:'',endedAt:'',archive:{mode:'none'}},
 'lifecycle.archive':{mode:'none',archiveDate:'',archiveNote:''},
 affiliations:{organization:'',current:true,type:'',startDate:'',endDate:'',endReason:'independent'},
 relations:{type:'related-project',target:'',startDate:'',endDate:''},
 credits:{role:'composer',entity:'',name:''},voiceEngines:{engine:'',releaseDate:''},
 tracks:{songId:'',title:'',disc:1,number:'1',artist:'',duration:''},setlist:{songId:'',title:'',number:'1'},
 media:{platform:'youtube',type:'music-video',id:'',url:''},
 sources:{title:'',url:'',type:'',publisher:'',page:'',publishedAt:''},
 dateRange:{start:'',end:''},venue:{name:'',city:'',country:'',isVirtual:false},
 subProjects:{entity:'',name:'',type:'',url:''},editions:{id:'',name:'',format:'',catalogNumber:'',bonusItems:[]},
 commercialLicense:{url:'',summary:''},
};
export function nestedMetadataOptions(path,value){const template=nestedMetadataDefaults[path.filter(k=>typeof k!=='number').join('.')];return Object.keys(template||{}).filter(k=>!(k in value));}
export function nestedMetadataDefault(path,key){return structuredClone(nestedMetadataDefaults[path.filter(k=>typeof k!=='number').join('.')][key]);}
Object.assign(metadataChoices,{'presentation.morphing.slot':Object.keys(morphSlots)});

Object.assign(metadataDefaults,{classification:{additional:[]}});
Object.assign(metadataChoices,{'classification.primary':navigationCategories.map(c=>c.id),'classification.additional':classificationNodeIds});
Object.assign(names,{classification:['分类与归档','Classification & filing','分類と配置'],primary:['主分类（唯一地址）','Primary category (canonical URL)','主分類（正規URL）'],additional:['附加分类入口','Additional categories','追加分類'],group:['分组 ID','Group ID','グループ ID'],morphing:['观测形态分组','Observation family','観測形態グループ'],slot:['形态类型','Form type','形態種別'],order:['显示顺序','Display order','表示順'],label:['显示名称','Display label','表示名']});
