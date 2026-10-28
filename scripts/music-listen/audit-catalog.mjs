import {readFileSync,writeFileSync,readdirSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {musicInventory} from './inventory.mjs';
import {publicCatalog} from './qq-public-catalog.mjs';
import {artistKey,titleKey,titleMatches,releaseTrackTitleMatches,durationMatches,seconds,sameRelease,sameTrack,checkTracklist,songMid,albumMid,songTitle} from './catalog-match.mjs';

// Curate public Wiki↔QQ identities offline. Evidence and cache stay outside the published catalog.
const argv=process.argv.slice(2),arg=(name,fallback)=>argv.includes(name)?argv[argv.indexOf(name)+1]:fallback;
const stage=arg('--stage','artists'),out=resolve(arg('--out','.music-catalog-audit'));
mkdirSync(out,{recursive:true});
const save=(name,data)=>writeFileSync(join(out,name+'.json'),JSON.stringify(data,null,2)+'\n');
const load=name=>JSON.parse(readFileSync(join(out,name+'.json'),'utf8'));
const {rows,artists}=musicInventory();
save('inventory',rows);
const wanted=[...new Set(rows.flatMap(r=>r.artist?[r.artist]:r.performers))].sort();
const api=publicCatalog({cacheDir:join(out,'public-cache'),proxy:arg('--proxy',''),maxRequests:Number(arg('--max-requests','600')),onRequest:({requests,path})=>{if(requests%10===1)console.log(JSON.stringify({requests,path}));}});
const named=id=>artists[id]||{id,names:[id],queries:[id]};
const aliases=id=>new Set(named(id).names.map(artistKey));
const catalogOf=async mid=>{const all=[];let begin=0,total;do{const d=await api.albums(mid,begin);const page=d.albumList||[];all.push(...page);total=Number(d.total);begin+=page.length;if(!page.length)break;}while(begin<total&&begin<640);return all;};
if(stage==='artists'){
 const selected={},unresolved=[];
 for(const id of wanted){
  const profile=named(id),queries=[...new Set(profile.queries)].slice(0,3),candidates=new Map();
  try{
   for(const query of queries){for(const s of await api.singers(query))if(aliases(id).has(artistKey(s.singerName)))candidates.set(s.singerMID,s);if(candidates.size)break;}
   const matches=[];
   for(const [mid,s] of candidates){
    const albums=await catalogOf(mid);
    const releaseEvidence=rows.filter(r=>r.kind==='album'&&r.artist===id).filter(r=>albums.some(a=>sameRelease(r,a))).map(r=>r.id);
    const singleEvidence=rows.filter(r=>r.kind==='track'&&r.performers.includes(id)).filter(r=>albums.some(a=>titleKey(r.title)===titleKey(a.albumName)&&r.releaseDate===a.publishDate)).map(r=>r.id);
    matches.push({mid,name:s.singerName,releaseEvidence,singleEvidence,albums});
   }
   const proved=matches.filter(m=>m.releaseEvidence.length||m.singleEvidence.length>=2);
   const choice=proved.length===1?proved[0]:matches.length===1?matches[0]:null;
   if(choice){selected[id]=choice;console.log(JSON.stringify({artist:id,mid:choice.mid,albums:choice.albums.length,evidence:choice.releaseEvidence.length+choice.singleEvidence.length}));}
   else unresolved.push({id,reason:matches.length?'ambiguous-artist':'artist-not-found',candidates:matches.map(({albums,...m})=>m)});
  }catch(error){unresolved.push({id,reason:'lookup-failed',message:error.message});}
  save('artists',{selected,unresolved,requests:api.requests});
 }
 console.log(JSON.stringify({stage,artists:Object.keys(selected).length,unresolved:unresolved.length,requests:api.requests}));
}else if(stage==='songs'){
 const {selected}=load('artists'),all={};
 for(const [id,artist] of Object.entries(selected)){
  try{const songs=[];let total=0,partial=false;
   for(const mid of artist.mids||[artist.mid]){let begin=0,count;do{const d=await api.songs(mid,begin);const page=d.songList||[];songs.push(...page.map(s=>s.songInfo||s));count=Number(d.totalNum??d.total??d.totalSongNum);begin+=page.length;if(!page.length)break;}while((!Number.isFinite(count)?begin%30===0:begin<count)&&begin<1500);total+=count||begin;partial ||= begin<count;}
   all[id]={mid:artist.mid,songs:[...new Map(songs.map(s=>[songMid(s),s])).values()],total,partial};console.log(JSON.stringify({artist:id,songs:all[id].songs.length,total,partial}));}
  catch(error){all[id]={mid:artist.mid,songs:[],error:error.message};}
  save('songs',all);
 }
 console.log(JSON.stringify({stage,artists:Object.keys(all).length,requests:api.requests}));
}else if(stage==='match'){
 const {selected,unresolved:artistUnresolved}=load('artists'),songCatalog=load('songs');
 const previous=JSON.parse(readFileSync('src/data/music-listen.json','utf8')),entries={...previous.entries},evidence=[],unresolved=[];
 const albumDetails=new Map(),detail=async mid=>{if(!albumDetails.has(mid))albumDetails.set(mid,await api.album(mid));return albumDetails.get(mid);};
 const make=(row,song,album,proof)=>({kind:row.kind,mid:row.kind==='album'?album.mid:songMid(song),title:row.title,qqTitle:row.kind==='album'?album.name:songTitle(song),artist:album.singername||selected[row.artist||row.performers[0]]?.name,...(row.kind==='track'?{albumMid:album.mid,albumTitle:album.name}:{}),source:`https://y.qq.com/n/ryqq/${row.kind==='album'?'albumDetail':'songDetail'}/${row.kind==='album'?album.mid:songMid(song)}`,verifiedAt:'2026-10-28',match:proof});
 for(const row of rows.filter(r=>r.kind==='album')){
  try{
   const artist=selected[row.artist];if(!artist){unresolved.push({id:row.id,kind:row.kind,reason:'artist-unresolved'});continue;}
   const candidates=artist.albums.filter(a=>sameRelease(row,a)),accepted=[];
   for(const a of candidates){const album=await detail(a.albumMid),check=checkTracklist(row,album);if(check.ok)accepted.push(album);else evidence.push({id:row.id,albumMid:a.albumMid,rejected:check});}
   if(accepted.length!==1){unresolved.push({id:row.id,kind:row.kind,reason:accepted.length?'ambiguous-release':candidates.length?'tracklist-mismatch':'release-not-found'});continue;}
   const album=accepted[0];entries[row.id]=make(row,null,album,'artist-title-date-ordered-tracklist');evidence.push({id:row.id,mid:album.mid,rule:'artist-title-date-ordered-tracklist'});
   for(let i=0;i<row.tracks.length;i++){
    const wikiSong=rows.find(r=>r.kind==='track'&&r.id===row.tracks[i].songId);if(!wikiSong||!releaseTrackTitleMatches(wikiSong,songTitle(album.list[i]))||(seconds(wikiSong.duration)!==null&&!durationMatches(wikiSong.duration,album.list[i].interval)))continue;
    // Keep previously reviewed edition choices when a Wiki song occurs on several releases.
    if(!entries[wikiSong.id])entries[wikiSong.id]=make(wikiSong,album.list[i],album,'verified-release-track-position-title-duration');
   }
  }catch(error){unresolved.push({id:row.id,kind:row.kind,reason:'lookup-failed',message:error.message});}
 }
 for(const row of rows.filter(r=>r.kind==='track')){
  if(entries[row.id])continue;
  try{
   const pools=row.performers.flatMap(id=>(songCatalog[id]?.songs||[]).map(song=>({song,owner:id})));
   const unique=new Map();for(const {song,owner} of pools)if(sameTrack(row,song))unique.set(songMid(song),{song,owner});
   const candidates=[...unique.values()],accepted=[];
   for(const c of candidates){
    const mid=albumMid(c.song);if(!mid)continue;
    const listed=selected[c.owner]?.albums.find(a=>a.albumMid===mid);
    const publication=listed?.publishDate||c.song.album?.time_public||c.song.time_public;
    if(publication&&publication!==row.releaseDate)continue;
    const album=await detail(mid);
    if(album.aDate!==row.releaseDate)continue;
    const real=album.list?.find(s=>songMid(s)===songMid(c.song));
    if(!real||!sameTrack(row,real))continue;
    const singerMids=new Set((real.singer||[]).map(s=>s.mid));
    if(!(selected[c.owner]?.mids||[selected[c.owner]?.mid]).some(mid=>singerMids.has(mid)))continue;
    accepted.push({song:real,album});
   }
   if(!accepted.length&&candidates.length){
    const fileIds=candidates.map(c=>c.song.file?.media_mid).filter(Boolean);
    const oneFile=candidates.length>1&&fileIds.length===candidates.length&&new Set(fileIds).size===1;
    const unambiguous=candidates.length===1&&!songCatalog[candidates[0].owner]?.partial;
    if(candidates.every(c=>!songCatalog[c.owner]?.partial)&&(oneFile||unambiguous)){
     const c=[...candidates].sort((a,b)=>String(a.song.album?.time_public||'').localeCompare(String(b.song.album?.time_public||''))||songMid(a.song).localeCompare(songMid(b.song)))[0];
     const album=await detail(albumMid(c.song)),real=album.list?.find(s=>songMid(s)===songMid(c.song));
     const allowed=new Set(selected[c.owner]?.mids||[selected[c.owner]?.mid]);
     if(real&&sameTrack(row,real)&&(real.singer||[]).some(s=>allowed.has(s.mid)))accepted.push({song:real,album,proof:oneFile&&candidates.length>1?'same-audio-file-across-releases':'unique-artist-original-title-duration'});
    }
   }
   if(accepted.length===1){const {song,album,proof}=accepted[0];entries[row.id]=make(row,song,album,proof||'artist-title-duration-release-date');}
   else unresolved.push({id:row.id,kind:row.kind,reason:accepted.length?'ambiguous-song':candidates.length?'edition-date-unconfirmed':'song-not-found'});
  }catch(error){unresolved.push({id:row.id,kind:row.kind,reason:'lookup-failed',message:error.message});}
 }
 const groups=new Map();for(const [id,entry] of Object.entries(entries)){const key=`${entry.kind}:${entry.mid}`;const group=groups.get(key)||[];group.push(id);groups.set(key,group);if(entry.kind==='track'&&!entry.albumTitle)entry.albumTitle=albumDetails.get(entry.albumMid)?.name||Object.values(entries).find(a=>a.kind==='album'&&a.mid===entry.albumMid)?.title||'';}
 for(const ids of groups.values()){
  const preferred=ids.find(id=>previous.entries[id]?.canonical===true)||ids.find(id=>previous.entries[id]&&previous.entries[id].canonical!==false)||[...ids].sort((a,b)=>(/-track-\d+|-\d{7,}$/.test(a)?10:0)-(/-track-\d+|-\d{7,}$/.test(b)?10:0)||a.localeCompare(b))[0];
  for(const id of ids)entries[id].canonical=id===preferred;
 }
 save('proposed',{version:1,entries});save('review',{inventory:{albums:rows.filter(r=>r.kind==='album').length,tracks:rows.filter(r=>r.kind==='track').length},matched:{albums:Object.values(entries).filter(e=>e.kind==='album').length,tracks:Object.values(entries).filter(e=>e.kind==='track').length},unresolved,artistUnresolved,evidence,requests:api.requests});
 console.log(JSON.stringify({stage,mapped:Object.keys(entries).length,unresolved:unresolved.length,requests:api.requests}));
}else throw Error('Unknown stage');
