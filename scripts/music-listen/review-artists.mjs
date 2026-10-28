import {readFileSync,writeFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {publicCatalog} from './qq-public-catalog.mjs';
import {sameTrack,artistKey,sameRelease} from './catalog-match.mjs';

// Search hints only nominate candidates; two distinct Wiki recordings must verify an override.
const arg=(name,fallback)=>process.argv.includes(name)?process.argv[process.argv.indexOf(name)+1]:fallback;
const out=resolve(arg('--out','.music-catalog-audit')),inventory=JSON.parse(readFileSync(join(out,'inventory.json'),'utf8'));
const artists=JSON.parse(readFileSync(join(out,'artists.json'),'utf8')),songs=JSON.parse(readFileSync(join(out,'songs.json'),'utf8'));
const api=publicCatalog({cacheDir:join(out,'public-cache'),proxy:arg('--proxy',''),maxRequests:150});
const hints={yunosuke:['雄之助'],ren:['廉'],toa:['とあ'],kuusou:['空爽'],'musical-isotope':['音楽的同位体']};
const ids=new Set([...Object.keys(hints),...artists.unresolved.map(r=>r.id),'hitogoto']);const decisions=[];
for(const id of ids){
 const base=artists.unresolved.find(r=>r.id===id),candidates=new Map((base?.candidates||[]).map(c=>[c.mid,c.name]));
 if(artists.selected[id])candidates.set(artists.selected[id].mid,artists.selected[id].name);
 for(const query of hints[id]||[])for(const c of await api.singers(query))if(artistKey(c.singerName)===artistKey(query))candidates.set(c.singerMID,c.singerName);
 const checks=[];
 for(const [mid,name] of candidates){
  try{
   const list=[];let total=0;
   for(let begin=0;begin<90;begin+=30){const d=await api.songs(mid,begin),page=d.songList||[];list.push(...page.map(s=>s.songInfo||s));total=d.totalNum??d.total;if(!page.length||list.length>=total)break;}
   const wiki=inventory.filter(r=>r.kind==='track'&&(r.performers||[]).includes(id));
   const matched=wiki.filter(w=>list.some(s=>sameTrack(w,s))).map(w=>w.id);
   checks.push({mid,name,matched,songs:list,total});
  }catch(error){checks.push({mid,name,error:error.message,matched:[]});}
 }
 const approved=checks.filter(c=>new Set(c.matched).size>=2);
 if(approved.length){
  const chosen=approved[0],albums=[];
  for(const profile of approved){let begin=0;do{const d=await api.albums(profile.mid,begin);albums.push(...(d.albumList||[]));begin+=(d.albumList||[]).length;if(!d.albumList?.length||begin>=d.total)break;}while(begin<640);}
  const mids=approved.map(p=>p.mid),allSongs=[...new Map(approved.flatMap(p=>p.songs).map(s=>[s.mid||s.songmid,s])).values()],proof=[...new Set(approved.flatMap(p=>p.matched))];
  artists.selected[id]={mid:chosen.mid,mids,name:chosen.name,releaseEvidence:[],singleEvidence:proof,albums:[...new Map(albums.map(a=>[a.albumMid,a])).values()],reviewRule:'each-profile-at-least-two-exact-recordings'};
  const previous=songs[id]?.mid===chosen.mid?songs[id].songs:[];
  if(approved.length===1&&previous.length>=allSongs.length)songs[id]={...songs[id],mid:chosen.mid};
  else songs[id]={mid:chosen.mid,songs:allSongs,total:approved.reduce((n,p)=>n+(p.total||p.songs.length),0),partial:approved.some(p=>p.songs.length<p.total)};
  artists.unresolved=artists.unresolved.filter(r=>r.id!==id);
  console.log(JSON.stringify({artist:id,selected:mids,name:chosen.name,proof:proof.length}));
 }else if(hints[id]&&artists.selected[id]&&!artists.selected[id].releaseEvidence.length&&!artists.selected[id].singleEvidence.length){
  delete artists.selected[id];delete songs[id];artists.unresolved.push({id,reason:'profile-not-verified'});
 }
 decisions.push({id,approved:approved.map(p=>p.mid),candidates:checks.map(({songs,...c})=>c)});
 writeFileSync(join(out,'artists.json'),JSON.stringify(artists,null,2));writeFileSync(join(out,'songs.json'),JSON.stringify(songs,null,2));writeFileSync(join(out,'artist-review.json'),JSON.stringify(decisions,null,2));
}
console.log(JSON.stringify({artists:Object.keys(artists.selected).length,unresolved:artists.unresolved.length,requests:api.requests}));
