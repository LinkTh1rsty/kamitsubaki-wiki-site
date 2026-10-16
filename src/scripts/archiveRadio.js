import {loadArchiveSnapshot} from '../lib/archiveClient.mjs';
import {archiveRecord} from '../lib/archiveResearch.mjs';
import {readRadioQueue,writeRadioQueue,radioStorageKey} from '../lib/archiveRadio.mjs';
import {recordObservation} from '../lib/archiveClient.mjs';

let youtubeAPI;
function loadYouTubeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(youtubeAPI)return youtubeAPI;
 youtubeAPI=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('player_api_timeout')),12000),previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);previous?.();resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timeout);reject(Error('player_api_unavailable'));};document.head.append(script);
 }).catch(error=>{youtubeAPI=undefined;throw error;});
 return youtubeAPI;
}

export async function initializeArchiveRadio(root){
 const locale=root.dataset.locale,c=JSON.parse(root.querySelector('[data-radio-copy]').textContent),player=root.querySelector('[data-radio-player]'),status=root.querySelector('[data-radio-status]');
 let snapshot,queue,playingId=null,ytPlayer=null,playEpoch=0;
 const popup=new URL(location.href).searchParams.get('player')==='1';
 if(popup){document.body.classList.add('archive-player-window');root.open=true;}
 function destroyPlayer(){playEpoch++;try{ytPlayer?.destroy();}catch{}ytPlayer=null;player.replaceChildren();playingId=null;}
 function capturePosition(){if(!ytPlayer || !playingId)return;try{const latest=readRadioQueue(localStorage);if(latest.ids[latest.index]!==playingId)return;const seconds=ytPlayer.getCurrentTime();if(Number.isFinite(seconds))writeRadioQueue(localStorage,{...latest,seconds});}catch{}}
 async function render({continuePlaying=false}={}){
  try{
   queue=readRadioQueue(localStorage);root.hidden=!queue.ids.length;
   if(!queue.ids.length){destroyPlayer();return;}
   root.querySelector('[data-radio-count]').textContent=String(queue.ids.length);
   if(!snapshot){const response=await fetch('/api/archive/v1/manifest.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('manifest');const manifest=await response.json();snapshot=await loadArchiveSnapshot(manifest.snapshotUrl);}
   const record=archiveRecord(snapshot,queue.ids[queue.index],locale);
   const title=root.querySelector('[data-radio-title]');title.textContent=record?.title || c.radioUnavailable;if(record)title.href=record.path;else title.removeAttribute('href');
   const resume=Boolean(playingId && playingId!==record?.id && popup && continuePlaying);
   if(playingId && playingId!==record?.id)destroyPlayer();
   const list=root.querySelector('[data-radio-queue]');list.replaceChildren();
   queue.ids.forEach((id,index)=>{
    const item=document.createElement('li'),button=document.createElement('button');button.type='button';button.textContent=archiveRecord(snapshot,id,locale)?.title || id;button.setAttribute('aria-current',index===queue.index?'true':'false');
    button.addEventListener('click',()=>{writeRadioQueue(localStorage,{...queue,index,seconds:0});void play();});item.append(button);list.append(item);
   });
   if(resume)void play();
  }catch{status.textContent=c.failed;}
 }
 async function play(){
  const record=archiveRecord(snapshot,queue.ids[queue.index],locale),media=(record?.media.find(item=>item.embed.provider==='youtube') || record?.media[0])?.embed;
  if(!media){status.textContent=c.radioUnavailable;return;}
  destroyPlayer();playingId=record.id;const epoch=playEpoch;status.textContent=c.radioNote;root.open=true;
  if(media.provider==='youtube'){
   try{
    const YT=await loadYouTubeAPI();if(epoch!==playEpoch || !playingId)return;
    const target=document.createElement('div');player.replaceChildren(target);
    const videoId=new URL(media.src).pathname.split('/').at(-1);
    ytPlayer=new YT.Player(target,{host:'https://www.youtube-nocookie.com',videoId,width:'100%',height:220,playerVars:{origin:location.origin,playsinline:1,start:Math.floor(queue.seconds || 0)},events:{
     onReady:event=>{if(epoch===playEpoch && playingId===record.id)event.target.playVideo();},
     onStateChange:event=>{if(epoch!==playEpoch || playingId!==record.id || event.data!==YT.PlayerState.ENDED)return;const latest=readRadioQueue(localStorage);if(latest.ids[latest.index]!==record.id)return;if(latest.index<latest.ids.length-1){writeRadioQueue(localStorage,{...latest,index:latest.index+1,seconds:0});void play();}},
     onError:()=>{if(epoch===playEpoch)status.textContent=c.radioUnavailable;},
    }});return;
   }catch{if(epoch!==playEpoch)return;}
  }
  const frame=document.createElement('iframe');frame.src=media.src;frame.title=record.title;frame.allow=media.allow;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';if(media.sandbox)frame.setAttribute('sandbox',media.sandbox);
  player.replaceChildren(frame);
 }
 root.querySelector('[data-radio-play]').addEventListener('click',()=>{if(snapshot)void play();});
 for(const [selector,step] of [['[data-radio-previous]',-1],['[data-radio-next]',1]])root.querySelector(selector).addEventListener('click',()=>{writeRadioQueue(localStorage,{...queue,index:(queue.index+step+queue.ids.length)%queue.ids.length,seconds:0});if(snapshot)void play();});
 root.querySelector('[data-radio-clear]').addEventListener('click',()=>writeRadioQueue(localStorage,{version:1,ids:[],index:0}));
 root.querySelector('[data-radio-window]').addEventListener('click',()=>{capturePosition();const child=window.open('/'+locale+'/explore/radio/?player=1','kamitsubaki-radio','popup,width=500,height=720');if(child)destroyPlayer();else status.textContent=c.failed;});
 const heard=document.createElement('button');heard.type='button';heard.textContent=c.heard;heard.addEventListener('click',async()=>{if(!queue.ids.length)return;heard.disabled=true;try{const result=await recordObservation({kind:'heard',entityId:queue.ids[queue.index]});status.textContent=result.synced?c.synced:c.local;}catch{status.textContent=c.failed;}finally{heard.disabled=false;}});root.querySelector('.archive-radio__body').append(heard);
 window.addEventListener('storage',event=>{if(event.key===radioStorageKey)void render({continuePlaying:true});});
 window.addEventListener('kamitsubaki-radio-change',()=>void render());
 let progress;
 const startProgress=()=>{clearInterval(progress);progress=setInterval(capturePosition,5000);};
 startProgress();window.addEventListener('pagehide',()=>{capturePosition();clearInterval(progress);destroyPlayer();});
 window.addEventListener('pageshow',event=>{if(event.persisted){startProgress();void render();}});
 await render();
}
const root=document.querySelector('[data-archive-radio]');if(root)void initializeArchiveRadio(root);
