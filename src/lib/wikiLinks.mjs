const escape=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decodeText=s=>String(s||'').replace(/&(?:amp|lt|gt|quot|apos|#39|#x[0-9a-f]+|#\d+);/gi,entity=>{const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&#39;':"'"};const key=entity.toLowerCase();if(key in named)return named[key];const value=key.startsWith('&#x')?parseInt(key.slice(3,-1),16):parseInt(key.slice(2,-1),10);return Number.isInteger(value)&&value>=0&&value<=0x10ffff?String.fromCodePoint(value):entity;});
const referenceIndexes=new WeakMap();
function referenceIndex(registry,locale){
 let locales=referenceIndexes.get(registry);if(!locales){locales=new Map();referenceIndexes.set(registry,locales);}if(locales.has(locale))return locales.get(locale);
 const index=new Map();
 for(const entry of registry.list?.(locale)||[]){const d=entry.data;const kind={'work-track':'songs','work-release':'albums',person:'artists','virtual-avatar':'artists',unit:'artists','software-voice':'artists',project:'projects',organization:'organizations','live-event':'lives'}[d.entityType];if(!kind)continue;
  const owners=kind==='songs'?(d.performers||[]).map(p=>p.entity):kind==='albums'?[d.primaryArtist]:[''];
  for(const owner of owners)for(const title of [d.title,d.name,d.romanizedTitle,d.romanizedName].filter(Boolean)){
   const key=JSON.stringify([kind,owner,title.normalize('NFKC')]);if(!index.has(key))index.set(key,new Map());index.get(key).set(d.id,entry);
  }
 }
 locales.set(locale,index);return index;
}
/** Render canonical references and WikiLinks while preserving authored text. */
export function renderWikiLinks(html,registry,locale){const previews={},missing=[];let blocked=0;
 // Normalize authored references at render time; no public legacy URL routes exist.
 html=html.replace(/<a\b([^>]*?)href="([^"<>]+)"([^>]*)>([\s\S]*?)<\/a>/g,(tag,before,href,after,label,offset,source)=>{
  const localHref=href.replace(/^https?:\/\/kamitsubaki\.wiki(?=\/)/,'');
  let decodedHref=localHref;try{decodedHref=decodeURI(localHref);}catch{/* Leave malformed authored URLs to normal resolution. */}
  // The preserved Kaf biography uses a retired song URL while describing the live event.
  // Resolve only the live-show wording; the same title can name an actual song elsewhere.
  if(/^\/(?:zh|zh-tw|zh-hk|ja)\/songs\/kaf\/originals\/不可解-inexplicable\/?$/.test(decodedHref)&&decodeText(label.replace(/<[^>]*>/g,'')).trim()==='不可解'){
   const beforeText=source.slice(Math.max(0,offset-40),offset).replace(/<[^>]*>/g,'');
   const afterText=source.slice(offset+tag.length,offset+tag.length+30).replace(/<[^>]*>/g,'');
   if(/(?:ワンマンライブ|ライブ)『$/.test(beforeText)||/^」大巡演/.test(afterText)){
    const live=registry.resolveEntity('fukakai',locale);
    if(live)return `<a${before}href="${escape(live.url)}"${after} data-wiki-id="fukakai">${label}</a>`;
   }
  }
  const match=localHref.match(/^\/(zh|zh-tw|zh-hk|ja|en)(\/(?:artists|projects|songs|albums|organizations|lives)(?:\/[^?#]*)?)([?#].*)?$/);if(!match)return tag;
  let path;try{path=decodeURI(match[2]).replace(/\/?$/,'/');}catch{return tag;}
  const parts=path.split('/').filter(Boolean),kind=parts[0];
  const suffix=(match[3]||'').replaceAll('&amp;','&');
  const catalog={songs:'music/songs',albums:'music/albums',artists:'artists',projects:'projects',organizations:'studios',lives:'lives'};
  if(parts.length===1)return `<a${before}href="${escape('/'+match[1]+'/database/'+catalog[kind]+'/'+suffix)}"${after}>${label}</a>`;
  const id=registry.legacyRoutes?.get(path);
  let e=id&&registry.resolveEntity(id,match[1]);
  // Old artist/group directory names changed, but an exact stable ID remains reliable.
  if(!e&&['artists','projects','organizations','lives'].includes(kind)){
   const candidate=registry.resolveEntity(parts.at(-1),match[1]);
   const types={artists:['person','virtual-avatar','unit','software-voice'],projects:['project'],organizations:['organization'],lives:['live-event']}[kind];
   if(candidate&&types.includes(candidate.data.entityType))e=candidate;
  }
  if(!e){
   const title=decodeText(label.replace(/<rt\b[^>]*>[\s\S]*?<\/rt>/g,'').replace(/<[^>]*>/g,'')).trim();
   const candidates=referenceIndex(registry,match[1]).get(JSON.stringify([kind,['songs','albums'].includes(kind)?parts[1]:'',title.normalize('NFKC')]));
   if(candidates?.size===1)e=candidates.values().next().value;
  }
  if(!e){missing.push(href);const note=match[1]==='en'?'Entry not yet linked':match[1]==='ja'?'項目リンク未登録':match[1]==='zh'?'词条链接待补全':'詞條連結待補全';return `<span class="wiki-unresolved-link" title="${note}">${label}</span>`;}
  const d=e.data;previews[d.id]={id:d.id,title:d.name||d.title,url:e.url,type:d.entityType,summary:d.summary||'',image:d.presentation?.image};
  return `<a${before}href="${escape(e.url+suffix)}"${after} data-wiki-id="${d.id}">${label}</a>`;
 });
 const output=html.split(/(<[^>]*>)/g).map(part=>{if(part.startsWith('<')){if(/^<(a|code|pre|script|style)(\s|>)/i.test(part))blocked++;if(/^<\/(a|code|pre|script|style)\s*>/i.test(part))blocked=Math.max(0,blocked-1);return part;}if(blocked)return part;
  return part.replace(/\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]\n]+))?\]\]/g,(_all,id,label)=>{const e=registry.resolveEntity(id,locale);if(!e){missing.push(id);return label||id;}const d=e.data;previews[id]={id,title:d.name||d.title,url:e.url,type:d.entityType,summary:d.summary||d.description||d.profileTagline||e.body.replace(/<[^>]*>|[#*`]/g,'').trim().slice(0,180),image:d.presentation?.image};return `<a class="wiki-link" data-wiki-id="${id}" href="${escape(e.url)}">${label||escape(d.name||d.title)}</a>`;});}).join('');
 return {html:output,previews,missing};}
