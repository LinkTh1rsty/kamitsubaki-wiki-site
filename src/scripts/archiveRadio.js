import {loadArchiveSnapshot,recordObservation} from '../lib/archiveClient.mjs';
import {archiveRecord} from '../lib/archiveResearch.mjs';
import {readRadioQueue,writeRadioQueue,radioStorageKey,editRadioQueue,nextRadioIndex,readRadioPlaylists,saveRadioPlaylist,removeRadioPlaylist,radioPlaylistsKey} from '../lib/archiveRadio.mjs';
import {archiveInteractionCopy} from '../lib/archiveInteractionCopy.mjs';

let youtubeAPI;
function loadYouTubeAPI(){
 if(window.YT?.Player)return Promise.resolve(window.YT);
 if(youtubeAPI)return youtubeAPI;
 youtubeAPI=new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('player_api_timeout')),12000),previous=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=()=>{clearTimeout(timeout);previous?.();resolve(window.YT);};
  const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.async=true;script.onerror=()=>{clearTimeout(timeout);reject(Error('player_api_unavailable'));};document.head.append(script);
 }).catch(error=>{youtubeAPI=undefined;throw error;});return youtubeAPI;
}

export async function initializeArchiveRadio(root){
 const locale=root.dataset.locale,c={...JSON.parse(root.querySelector('[data-radio-copy]').textContent),...archiveInteractionCopy(locale)},player=root.querySelector('[data-radio-player]'),status=root.querySelector('[data-radio-status]'),list=root.querySelector('[data-radio-queue]');
 const make=(tag,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const safe=async callback=>{try{await callback();}catch{status.textContent=c.failed;}};
 const button=(text,callback)=>{const node=make('button',text);node.type='button';node.addEventListener('click',()=>void safe(callback));return node;};
 let snapshot,loading,queue,playingId=null,ytPlayer=null,playEpoch=0,renderEpoch=0,sorter,disposed=false,lastRenderedKey;
 const queueKey=value=>JSON.stringify([value.ids,value.index,value.repeat || 'off']);
 const popup=new URL(location.href).searchParams.get('player')==='1';if(popup){document.body.classList.add('archive-player-window');root.open=true;}
 const tools=make('div');tools.className='archive-radio-tools';tools.dataset.radioTools='';
 const modes=make('select');modes.dataset.radioRepeat='';modes.setAttribute('aria-label',c.repeat);for(const [value,key]of [['off','repeatOff'],['all','repeatAll'],['one','repeatOne']]){const option=make('option',c[key]);option.value=value;modes.append(option);}
 modes.addEventListener('change',()=>void safe(()=>{writeRadioQueue(localStorage,{...readRadioQueue(localStorage),repeat:modes.value});}));
 const shuffle=button(c.shuffle,()=>mutate({type:'shuffle'}));shuffle.dataset.radioShuffle='';tools.append(shuffle,modes);
 const saved=make('select');saved.dataset.radioPlaylists='';saved.setAttribute('aria-label',c.playlists);
 const playlistName=make('input');playlistName.maxLength=120;playlistName.placeholder=c.playlistName;playlistName.setAttribute('aria-label',c.playlistName);playlistName.dataset.radioPlaylistName='';
 const playlistActions=make('div');playlistActions.className='archive-actions';
 playlistActions.append(button(c.savePlaylist,()=>{if(!playlistName.value.trim()){playlistName.focus();return;}if(!readRadioQueue(localStorage).ids.length){status.textContent=c.playlistEmpty;return;}const value=saveRadioPlaylist(localStorage,playlistName.value,saved.value || null);drawPlaylists(value.id);status.textContent=c.playlistSaved;}),button(c.loadPlaylist,async()=>{
  const selected=readRadioPlaylists(localStorage).find(row=>row.id===saved.value);if(!selected)return;await load();const ids=selected.queue.ids.filter(id=>archiveRecord(snapshot,id,locale)?.media?.length);if(!ids.length){status.textContent=c.radioUnavailable;return;}
  destroyPlayer();writeRadioQueue(localStorage,{...selected.queue,ids,index:0,seconds:0});await render();
 }),button(c.deletePlaylist,()=>{if(!saved.value)return;removeRadioPlaylist(localStorage,saved.value);playlistName.value='';drawPlaylists();void render();}));
 saved.addEventListener('change',()=>{playlistName.value=readRadioPlaylists(localStorage).find(row=>row.id===saved.value)?.name || '';});
 const savedPanel=make('details');savedPanel.dataset.radioSaved='';savedPanel.append(make('summary',c.playlists),saved,playlistName,playlistActions,make('small',c.queueLimit));tools.append(savedPanel);root.querySelector('.archive-radio__body').append(tools);
 const failures=make('div');failures.className='archive-actions';failures.hidden=true;failures.dataset.radioFailure='';failures.append(button(c.retry,()=>play()),button(c.skip,()=>advance()));tools.append(failures);
 function fail(){status.textContent=c.failedTrack;failures.hidden=false;}
 function drawPlaylists(selected=saved.value){saved.replaceChildren();const blank=make('option',c.playlistChoose);blank.value='';saved.append(blank);for(const row of readRadioPlaylists(localStorage)){const option=make('option',row.name);option.value=row.id;saved.append(option);}saved.value=selected;}
 function destroyPlayer(){playEpoch++;try{ytPlayer?.destroy();}catch{}ytPlayer=null;player.replaceChildren();playingId=null;}
 function capturePosition(){if(!ytPlayer || !playingId)return;try{const latest=readRadioQueue(localStorage);if(latest.ids[latest.index]!==playingId)return;const seconds=ytPlayer.getCurrentTime();if(Number.isFinite(seconds))writeRadioQueue(localStorage,{...latest,seconds});}catch{}}
 async function load(){if(snapshot)return;if(!loading)loading=(async()=>{const response=await fetch('/api/archive/v1/manifest.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('manifest');const manifest=await response.json();snapshot=await loadArchiveSnapshot(manifest.snapshotUrl);})().catch(error=>{loading=null;throw error;});await loading;}
 async function render({continuePlaying=false}={}){
  const generation=++renderEpoch;
  try{
   queue=readRadioQueue(localStorage);drawPlaylists();root.hidden=!queue.ids.length && !readRadioPlaylists(localStorage).length;modes.value=queue.repeat || 'off';
   root.querySelector('[data-radio-count]').textContent=String(queue.ids.length);
   for(const selector of ['[data-radio-play]','[data-radio-previous]','[data-radio-next]'])root.querySelector(selector).disabled=!queue.ids.length;
   if(!queue.ids.length){destroyPlayer();list.replaceChildren();root.querySelector('[data-radio-title]').textContent=c.playlistEmpty;lastRenderedKey=queueKey(queue);return;}
   await load();if(generation!==renderEpoch || disposed)return;queue=readRadioQueue(localStorage);
   const record=archiveRecord(snapshot,queue.ids[queue.index],locale),title=root.querySelector('[data-radio-title]');title.textContent=record?.title || c.radioUnavailable;if(record)title.href=record.path;else title.removeAttribute('href');
   const resume=Boolean(playingId && playingId!==record?.id && popup && continuePlaying);if(playingId && playingId!==record?.id)destroyPlayer();
   list.replaceChildren();for(const [index,id]of queue.ids.entries()){
    const item=make('li');item.dataset.radioId=id;
    const drag=button('↕',()=>{});drag.dataset.radioDrag='';drag.setAttribute('aria-label',c.moveUp+' / '+c.moveDown);
    const track=button(archiveRecord(snapshot,id,locale)?.title || id,async()=>{const latest=readRadioQueue(localStorage),index=latest.ids.indexOf(id);if(index<0)return;writeRadioQueue(localStorage,{...latest,index,seconds:0});await render();await play();});track.setAttribute('aria-current',index===queue.index?'true':'false');track.className='archive-radio-track';item.append(drag,track);
    for(const [label,step]of [[c.moveUp,-1],[c.moveDown,1]]){const move=button(label,()=>mutate({type:'move',id,step}));move.disabled=index+step<0 || index+step>=queue.ids.length;item.append(move);}
    item.append(button(c.remove,()=>mutate({type:'remove',id})));list.append(item);
   }
   lastRenderedKey=queueKey(queue);if(!sorter)void mountSorter();if(resume)void safe(()=>play());
  }catch{status.textContent=c.failed;}
 }
 async function mutate(operation){const current=playingId;editRadioQueue(localStorage,operation);await render();if(current && !readRadioQueue(localStorage).ids.includes(current) && readRadioQueue(localStorage).ids.length)await play();}
 async function advance({automatic=false,step=1}={}){
  const latest=readRadioQueue(localStorage),index=nextRadioIndex(latest,{automatic,step});if(index===null)return;
  writeRadioQueue(localStorage,{...latest,index,seconds:0});await render();await play();
 }
 async function play(){
  const started=playEpoch;await load();if(disposed || started!==playEpoch)return;queue=readRadioQueue(localStorage);const record=archiveRecord(snapshot,queue.ids[queue.index],locale),media=(record?.media.find(item=>item.embed.provider==='youtube') || record?.media[0])?.embed;
  if(!media){fail();return;}destroyPlayer();playingId=record.id;const epoch=playEpoch;failures.hidden=true;status.textContent=c.radioNote;root.open=true;
  if(media.provider==='youtube'){
   try{
    const YT=await loadYouTubeAPI();if(epoch!==playEpoch || playingId!==record.id || readRadioQueue(localStorage).ids[readRadioQueue(localStorage).index]!==record.id)return;
    const target=make('div');player.replaceChildren(target);const videoId=new URL(media.src).pathname.split('/').at(-1);
    ytPlayer=new YT.Player(target,{host:'https://www.youtube-nocookie.com',videoId,width:'100%',height:220,playerVars:{origin:location.origin,playsinline:1,start:Math.floor(queue.seconds || 0)},events:{
     onReady:event=>{if(epoch===playEpoch && playingId===record.id)event.target.playVideo();},
     onStateChange:event=>{if(epoch!==playEpoch || playingId!==record.id || event.data!==YT.PlayerState.ENDED)return;const latest=readRadioQueue(localStorage);if(latest.ids[latest.index]===record.id)void safe(()=>advance({automatic:true}));},
     onError:()=>{if(epoch===playEpoch)fail();}
    }});return;
   }catch{if(epoch!==playEpoch)return;fail();return;}
  }
  const frame=make('iframe');frame.src=media.src;frame.title=record.title;frame.allow=media.allow;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';if(media.sandbox)frame.setAttribute('sandbox',media.sandbox);player.replaceChildren(frame);
 }
 async function mountSorter(){try{const {default:Sortable}=await import('sortablejs');if(disposed || sorter)return;let started;sorter=new Sortable(list,{handle:'[data-radio-drag]',animation:matchMedia('(prefers-reduced-motion:reduce)').matches?0:150,onStart:()=>{started=JSON.stringify(readRadioQueue(localStorage).ids);},onEnd:()=>{if(disposed || started!==JSON.stringify(readRadioQueue(localStorage).ids)){void render();return;}void safe(()=>mutate({type:'order',ids:[...list.children].map(row=>row.dataset.radioId)}));}});}catch{ /* The move buttons remain available. */ }}
 root.querySelector('[data-radio-play]').addEventListener('click',()=>void safe(()=>play()));
 for(const [selector,step]of [['[data-radio-previous]',-1],['[data-radio-next]',1]])root.querySelector(selector).addEventListener('click',()=>void safe(()=>advance({step})));
 root.querySelector('[data-radio-clear]').addEventListener('click',()=>void safe(()=>writeRadioQueue(localStorage,{version:1,ids:[],index:0})));
 root.querySelector('[data-radio-window]').addEventListener('click',()=>{capturePosition();const child=window.open('/'+locale+'/explore/radio/?player=1','kamitsubaki-radio','popup,width=500,height=720');if(child)destroyPlayer();else status.textContent=c.failed;});
 const heard=button(c.heard,async()=>{const current=readRadioQueue(localStorage);if(!current.ids.length)return;heard.disabled=true;try{const result=await recordObservation({kind:'heard',entityId:current.ids[current.index]});status.textContent=result.synced?c.synced:c.local;}finally{heard.disabled=false;}});root.querySelector('.archive-radio__body').append(heard);
 window.addEventListener('storage',event=>{if(event.key===radioStorageKey && queueKey(readRadioQueue(localStorage))!==lastRenderedKey)void render({continuePlaying:true});if(event.key===radioPlaylistsKey)void render();});
 window.addEventListener('kamitsubaki-radio-change',()=>{if(queueKey(readRadioQueue(localStorage))!==lastRenderedKey)void render();});
 let progress;const startProgress=()=>{clearInterval(progress);progress=setInterval(capturePosition,5000);};
 startProgress();window.addEventListener('pagehide',()=>{disposed=true;renderEpoch++;capturePosition();clearInterval(progress);destroyPlayer();sorter?.destroy();sorter=null;});
 window.addEventListener('pageshow',event=>{if(event.persisted){disposed=false;startProgress();void render();}});await render();
}
const root=document.querySelector('[data-archive-radio]');if(root)void initializeArchiveRadio(root);
