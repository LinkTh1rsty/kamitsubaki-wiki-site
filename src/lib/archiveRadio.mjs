export const radioStorageKey='kamitsubaki-radio-v1';
export function validateRadioQueue(value) {
 if(!value || value.version!==1 || !Array.isArray(value.ids) || value.ids.length>200 || value.ids.some(id=>typeof id!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))throw new Error('invalid_queue');
 const ids=[...new Set(value.ids)];
 if(value.repeat!==undefined && !['off','all','one'].includes(value.repeat))throw new Error('invalid_repeat');
 return {version:1,ids,index:ids.length?Math.min(ids.length-1,Math.max(0,Number.isInteger(value.index)?value.index:0)):0,...(value.repeat?{repeat:value.repeat}:{}),
  ...(Number.isFinite(value.seconds) && value.seconds>=0 && value.seconds<86400?{seconds:value.seconds}:{})};
}
export function readRadioQueue(storage) {
 try{return validateRadioQueue(JSON.parse(storage.getItem(radioStorageKey) || 'null'));}catch{return {version:1,ids:[],index:0};}
}
export function writeRadioQueue(storage,value) {
 const queue=validateRadioQueue(value);storage.setItem(radioStorageKey,JSON.stringify(queue));
 if(typeof window!=='undefined')window.dispatchEvent(new Event('kamitsubaki-radio-change'));
 return queue;
}
export function addRadioTracks(storage,ids,{replace=false}={}) {
 const queue=readRadioQueue(storage);
 return writeRadioQueue(storage,{version:1,ids:[...new Set([...(replace?[]:queue.ids),...ids])].slice(0,200),index:replace?0:queue.index,...(queue.repeat?{repeat:queue.repeat}:{}),...(!replace && queue.seconds!==undefined?{seconds:queue.seconds}:{})});
}

export function editRadioQueue(storage,operation){
 const queue=readRadioQueue(storage),current=queue.ids[queue.index],ids=[...queue.ids];
 if(operation.type==='remove'){const at=ids.indexOf(operation.id);if(at<0)return queue;ids.splice(at,1);}
 if(operation.type==='move'){const at=ids.indexOf(operation.id),next=at+operation.step;if(at<0 || next<0 || next>=ids.length)return queue;[ids[at],ids[next]]=[ids[next],ids[at]];}
 if(operation.type==='shuffle')for(let index=ids.length-1;index>0;index--){const next=Math.floor(Math.random()*(index+1));[ids[index],ids[next]]=[ids[next],ids[index]];}
 if(operation.type==='order'){if(!Array.isArray(operation.ids) || operation.ids.length!==ids.length || new Set(operation.ids).size!==ids.length || operation.ids.some(id=>!ids.includes(id)))return queue;ids.splice(0,ids.length,...operation.ids);}
 const kept=ids.indexOf(current),index=kept<0?Math.min(queue.index,Math.max(0,ids.length-1)):kept;
 return writeRadioQueue(storage,{...queue,ids,index,seconds:kept<0?0:queue.seconds || 0});
}
export function nextRadioIndex(queue,{automatic=false,step=1}={}){
 if(!queue.ids.length)return null;
 if(automatic && queue.repeat==='one')return queue.index;
 const next=queue.index+step;
 if(next>=0 && next<queue.ids.length)return next;
 return !automatic || queue.repeat==='all'?(next+queue.ids.length)%queue.ids.length:null;
}
export const radioPlaylistsKey='kamitsubaki-radio-playlists-v1';
export function readRadioPlaylists(storage){
 try{const raw=storage.getItem(radioPlaylistsKey);if(!raw || raw.length>1500000)return [];const data=JSON.parse(raw);if(data.version!==1 || !Array.isArray(data.playlists) || data.playlists.length>30)return [];
  const ids=new Set();return data.playlists.map(row=>{if(typeof row.id!=='string' || !/^playlist-[a-f0-9-]{36}$/.test(row.id) || ids.has(row.id) || typeof row.name!=='string' || !row.name.trim() || row.name.length>120 || !Number.isSafeInteger(row.updatedAt))throw Error('invalid_playlist');ids.add(row.id);return {id:row.id,name:row.name,updatedAt:row.updatedAt,queue:validateRadioQueue(row.queue)};});
 }catch{return [];}
}
export function saveRadioPlaylist(storage,name,id=null){
 const queue=readRadioQueue(storage);if(!queue.ids.length || typeof name!=='string' || !name.trim() || name.length>120)throw Error('invalid_playlist');
 const current=readRadioPlaylists(storage);if(current.length>=30 && !current.some(row=>row.id===id))throw Error('playlist_limit');
 const playlist={id:id || 'playlist-'+crypto.randomUUID(),name:name.trim(),updatedAt:Date.now(),queue:{...queue,seconds:0}};
 storage.setItem(radioPlaylistsKey,JSON.stringify({version:1,playlists:[playlist,...current.filter(row=>row.id!==playlist.id)]}));return playlist;
}
export function removeRadioPlaylist(storage,id){storage.setItem(radioPlaylistsKey,JSON.stringify({version:1,playlists:readRadioPlaylists(storage).filter(row=>row.id!==id)}));}
