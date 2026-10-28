// Deterministic curation rules. Version markers survive normalization; no fuzzy title replacement.
const version=/\b(?:live|remix(?:ed)?|instrumental|inst|acoustic|piano|ver|version|cover|edit|mix)\b|现场|伴奏|混音|改编|合唱|独唱|版/i;
export function titleKey(value){
 let s=String(value||'').normalize('NFKC').trim().replace(/\s*\(cover\)\s*/gi,'');
 s=s.replace(/\s*\(([^()]*)\)\s*$/u,(all,inside)=>/[\p{Script=Han}]/u.test(inside)&&!/[\p{Script=Hiragana}\p{Script=Katakana}a-z]/iu.test(inside)&&!version.test(inside)?'':all);
 return s.toLowerCase().replace(/instrumental/g,'inst').replace(/[\p{P}\p{Z}\p{S}]/gu,'');
}
export const artistKey=value=>String(value||'').normalize('NFKC').replace(/\s*\([^)]*\)\s*$/u,'').toLowerCase().replace(/[\p{P}\p{Z}\p{S}]/gu,'');
export function seconds(value){if(typeof value==='number')return value;const parts=String(value||'').split(':').map(Number);return parts.length>1&&parts.every(Number.isFinite)?parts.reduce((n,x)=>n*60+x,0):null;}
export const durationMatches=(wiki,qq)=>seconds(wiki)!==null&&Math.abs(seconds(wiki)-Number(qq))<=2;
export const songMid=s=>s.mid||s.songmid;
export const albumMid=s=>s.album?.mid||s.albummid;
export const songTitle=s=>{
 let name=s.name||s.songorig||s.songname||s.title||'';
 // Legacy `songname` may append translations; `songorig` is the original title, but omits Inst/Live.
 const decorated=s.songname||s.title||'';
 for(const part of [...decorated.matchAll(/\(([^()]*)\)/g)].map(m=>m[1]).concat(s.subtitle||''))if(version.test(part)&&!titleKey(name).includes(titleKey(part)))name+=` (${part})`;
 return name;
};
export const songSeconds=s=>s.interval;
export const titleMatches=(wiki,value)=>[wiki.title,...(wiki.aliases||[]),...(wiki.titles||[])].some(t=>titleKey(t)===titleKey(value));
const featured=value=>{const text=String(value||'').normalize('NFKC');const m=text.match(/^(.*?)\s*(?:\(\s*feat\.?\s+(.+)\)|\s+feat\.?\s+(.+))$/i);return m?{name:m[1],credit:m[2]||m[3]}:{name:text,credit:null};};
// Only a fully identified release may fill in a missing feat credit; conflicting explicit guests stay distinct.
export const releaseTrackTitleMatches=(wiki,value)=>titleMatches(wiki,value)||[wiki.title,...(wiki.titles||[])].some(title=>{const a=featured(title),b=featured(value);return titleKey(a.name)===titleKey(b.name)&&(!a.credit||!b.credit||titleKey(a.credit)===titleKey(b.credit));});
export function sameTrack(wiki,qq){return titleMatches(wiki,songTitle(qq))&&durationMatches(wiki.duration,songSeconds(qq));}
export function sameRelease(wiki,qq){let name=qq.albumName||qq.name;if(qq.albumTranName&&name?.endsWith(` (${qq.albumTranName})`))name=name.slice(0,-qq.albumTranName.length-3);return titleMatches(wiki,name)&&wiki.releaseDate===String(qq.publishDate||qq.aDate||'').slice(0,10);}
export function checkTracklist(wiki,qq){
 const tracks=wiki.tracks||[],list=qq.list||[];
 if(!tracks.length||tracks.length!==list.length)return {ok:false,reason:'track-count'};
 for(let i=0;i<tracks.length;i++)if(!releaseTrackTitleMatches(tracks[i],songTitle(list[i]))||(seconds(tracks[i].duration)!==null&&!durationMatches(tracks[i].duration,songSeconds(list[i]))))return {ok:false,reason:'track-order-title-duration',index:i,wiki:tracks[i].title,qq:songTitle(list[i])};
 return {ok:true};
}
