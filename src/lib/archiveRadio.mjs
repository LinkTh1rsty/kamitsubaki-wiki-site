export const radioStorageKey='kamitsubaki-radio-v1';
export function validateRadioQueue(value) {
 if(!value || value.version!==1 || !Array.isArray(value.ids) || value.ids.length>200 || value.ids.some(id=>typeof id!=='string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))throw new Error('invalid_queue');
 const ids=[...new Set(value.ids)];
 return {version:1,ids,index:ids.length?Math.min(ids.length-1,Math.max(0,Number.isInteger(value.index)?value.index:0)):0,
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
 return writeRadioQueue(storage,{version:1,ids:[...(replace?[]:queue.ids),...ids].slice(0,200),index:replace?0:queue.index,...(!replace && queue.seconds!==undefined?{seconds:queue.seconds}:{})});
}
