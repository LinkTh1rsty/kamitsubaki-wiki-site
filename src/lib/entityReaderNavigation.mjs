import {resolveLocaleCopy} from './i18n.mjs';
import {concertEventTypes} from './entityContract.mjs';

const navigationCopy = {
  zh: {overview:'概览',music:'音乐',albums:'专辑',live:'演出',chronicle:'编年史',gallery:'图库',relations:'关系',listen:'试听',lyrics:'歌词',tracks:'曲目',credits:'制作名单',setlist:'演出曲目',performances:'演出记录'},
  ja: {overview:'概要',music:'楽曲',albums:'アルバム',live:'ライブ',chronicle:'年代記',gallery:'ギャラリー',relations:'関連',listen:'再生',lyrics:'歌詞',tracks:'収録曲',credits:'クレジット',setlist:'セットリスト',performances:'歌唱履歴'},
  en: {overview:'Overview',music:'Music',albums:'Albums',live:'Live',chronicle:'Chronicle',gallery:'Gallery',relations:'Relations',listen:'Listen',lyrics:'Lyrics',tracks:'Track list',credits:'Credits',setlist:'Setlist',performances:'Performances'},
};
const mediaClasses = new Set(['wiki-media-switcher','wiki-embed']);
const mediaTags = new Set(['div','section','figure']);
const literalTags = new Set(['script','style','textarea','title','pre','code']);

/** Read attributes on an opening tag, without matching attribute-like text in values. */
function attributes(tag) {
  const values = new Map();
  const source = tag.replace(/^<[a-z][a-z0-9:-]*\b/i,'').replace(/\/?\s*>$/,'');
  const pattern = /(?:^|\s)([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    const key = match[1].toLowerCase();
    if (!values.has(key)) values.set(key,match[2] ?? match[3] ?? match[4] ?? '');
  }
  return values;
}

/** Only tokenize tags; comments and literal/code contents cannot become navigation targets. */
function htmlTags(html) {
  const pattern = /<!--[\s\S]*?(?:-->|$)|<\/?([a-z][a-z0-9:-]*)\b(?:[^"'<>]|"[^"]*"|'[^']*')*>/gi;
  const tags = [];
  let match;
  while ((match = pattern.exec(html))) {
    if (!match[1]) continue;
    const raw = match[0],name = match[1].toLowerCase(),closing = raw.startsWith('</');
    tags.push({raw,name,closing,start:match.index,end:pattern.lastIndex,attrs:closing ? new Map() : attributes(raw)});
    if (!closing && literalTags.has(name)) {
      const close = new RegExp(`</${name}\\s*>`,'gi');
      close.lastIndex = pattern.lastIndex;
      const end = close.exec(html);
      if (!end) break;
      tags.push({raw:end[0],name,closing:true,start:end.index,end:close.lastIndex,attrs:new Map()});
      pattern.lastIndex = close.lastIndex;
    }
  }
  return tags;
}

function hasClass(tag,name) {
  return !tag.closing && (tag.attrs.get('class') || '').split(/\s+/).includes(name);
}

function firstMedia(tags) {
  return tags.find(tag => mediaTags.has(tag.name) && [...mediaClasses].some(name => hasClass(tag,name)));
}

function firstLyrics(tags) {
  return tags.find(tag => ['div','section'].includes(tag.name) && hasClass(tag,'my-lyric-box'));
}

function addAnchor(html,anchor,findTarget) {
  const tags = htmlTags(html);
  if (tags.some(tag => !tag.closing && tag.attrs.get('id') === anchor)) return html;
  const target = findTarget(tags);
  if (!target) return html;
  if (!target.attrs.has('id')) {
    const opening = target.raw.replace(/\/?>$/,ending => ` id="${anchor}"${ending}`);
    return html.slice(0,target.start) + opening + html.slice(target.end);
  }
  // Preserve authored ids and any links to them by wrapping the complete original node.
  let depth = 0,end = target.end;
  for (const tag of tags.filter(tag => tag.start >= target.start)) {
    if (tag.name !== target.name) continue;
    if (!tag.closing && !/\/\s*>$/.test(tag.raw)) depth += 1;
    else if (tag.closing) depth -= 1;
    if (!depth) {end = tag.end;break;}
  }
  return html.slice(0,target.start) + `<div id="${anchor}">` + html.slice(target.start,end) + '</div>' + html.slice(end);
}

/** Add stable reader anchors to existing media and lyrics; never change authored ids. */
export function prepareEntityReaderHtml(html = '') {
  const source = String(html || '');
  return addAnchor(addAnchor(source,'entry-listen',firstMedia),'entry-lyrics',firstLyrics);
}

function groupHasRecords(value) {
  return Array.isArray(value) ? value.length > 0 : typeof value === 'number' && value > 0;
}

/**
 * @param {{kind:string|null,data?:{id?:string,tracks?:unknown[],credits?:unknown[],setlist?:unknown[],eventType?:string},headings?:unknown[],html?:string,groups?:Partial<Record<'music'|'albums'|'live'|'other',unknown[]|number>>,locale?:string,hasGallery?:boolean,footprintCount?:number,performanceCount?:number}} options
 * @returns {{key:string,label:string,href:string}[]}
 */
export function buildEntityReaderNavigation({kind,data = {},html = '',groups = {},locale = 'zh',hasGallery = false,footprintCount = 0,performanceCount = 0}) {
  if (!['artist','music','live'].includes(kind)) return [];
  const copy = resolveLocaleCopy(navigationCopy,locale);
  const items = [{key:'overview',label:copy.overview,href:'#entry-overview'}];
  const add = (key,href = `#entry-${key}`) => items.push({key,label:copy[key],href});
  if (kind === 'artist') {
    if (groupHasRecords(groups.music)) add('music');
    if (groupHasRecords(groups.albums)) add('albums');
    if (groupHasRecords(groups.live)) add('live');
    if (data.id && footprintCount > 0) add('chronicle',`/${locale}/chronicle/?entity=${encodeURIComponent(data.id)}`);
    if (data.id && hasGallery) add('gallery',`/${locale}/gallery/?entity=${encodeURIComponent(data.id)}`);
  } else if (kind === 'live') {
    if (data.setlist?.length || concertEventTypes.includes(data.eventType || '')) add('setlist');
  } else {
    const tags = htmlTags(String(html || ''));
    if (firstMedia(tags)) add('listen');
    if (firstLyrics(tags)) add('lyrics');
    if (data.tracks?.length) add('tracks');
    if (data.credits?.length) add('credits');
    if (performanceCount > 0) add('performances');
  }
  if (groupHasRecords(groups.other)) add('relations');
  return items;
}

const musicPlatforms = [
  {hosts:['music.apple.com','embed.music.apple.com'],label:'Apple Music'},
  {hosts:['open.spotify.com'],label:'Spotify'},
  {hosts:['youtube.com','www.youtube.com','music.youtube.com','youtu.be'],label:'YouTube'},
  {hosts:['bilibili.com','www.bilibili.com','m.bilibili.com','b23.tv'],label:'bilibili'},
  {hosts:['music.163.com'],label:'网易云音乐'},
  {hosts:['y.qq.com','i.y.qq.com'],label:'QQ 音乐'},
];

/**
 * Only authored links to recognized listening platforms become music actions.
 * @param {{officialLinks?:{url:string,label?:string,platform?:string}[]}} data
 * @returns {{label:string,url:string}[]}
 */
export function musicListenLinks(data = {}) {
  const links = [],seen = new Set();
  for (const link of data.officialLinks || []) {
    let url;
    try {url = new URL(link.url);} catch {continue;}
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.port) continue;
    const platform = musicPlatforms.find(item => item.hosts.includes(url.hostname.toLowerCase()));
    if (!platform || seen.has(url.href)) continue;
    seen.add(url.href);
    links.push({label:link.label?.trim() || platform.label,url:url.href});
  }
  return links;
}
