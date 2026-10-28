import catalog from '../data/music-listen.json' with {type:'json'};

// Only verified identifiers become playback links. Keep authored QQ links as the first source.
export const FOLIA_PREVIEW_ORIGIN='https://wiki-folia-qq-preview.linkth1rstyg.workers.dev';
export function foliaOrigin(raw=import.meta.env?.PUBLIC_FOLIA_ORIGIN){
 if(!raw)return null;
 try{const u=new URL(raw);if(u.username||u.password||u.search||u.hash||u.pathname!=='/')return null;
  if(u.origin===FOLIA_PREVIEW_ORIGIN||u.origin==='https://music.kamitsubaki.wiki')return u.origin;
 }catch{}
 return null;
}
const midPattern=/^0[A-Za-z0-9]{13}$/;
export function qqListenTarget(data){
 const kind=data.entityType==='work-track'?'track':data.entityType==='work-release'?'album':null;
 if(!kind)return null;
 for(const link of data.officialLinks||[]){
  try{const u=new URL(link.url);if(u.protocol!=='https:'||!['y.qq.com','i.y.qq.com'].includes(u.hostname)||u.username||u.password||u.port)continue;
   const mid=u.searchParams.get(kind==='track'?'songmid':'albummid')||u.pathname.match(kind==='track'?/^\/n\/ryqq\/songDetail\/(0[A-Za-z0-9]{13})\/?$/:/^\/n\/ryqq\/albumDetail\/(0[A-Za-z0-9]{13})\/?$/)?.[1];
   if(mid&&midPattern.test(mid))return {kind,mid};
  }catch{}
 }
 const mapped=catalog.entries[data.id];
 return mapped?.kind===kind&&midPattern.test(mapped.mid)?{kind,mid:mapped.mid}:null;
}
/** @param {Record<string, any>} data
 * @param {{locale?:string,wikiPath?:string,origin?:string}} options */
export function foliaListenUrl(data,{locale='zh',wikiPath,origin}={}){
 const base=foliaOrigin(origin),target=qqListenTarget(data);
 if(!base||!target||!['zh','zh-tw','zh-hk','ja','en'].includes(locale))return null;
 const category=target.kind==='track'?'songs':'albums';
 if(!new RegExp(`^/${locale}/database/music/${category}/[a-z0-9]+(?:-[a-z0-9]+)*/$`).test(wikiPath||''))return null;
 const u=new URL('/listen',base);u.search=new URLSearchParams({provider:'qq',type:target.kind,id:target.mid,lang:locale,wiki:wikiPath}).toString();return u.href;
}
