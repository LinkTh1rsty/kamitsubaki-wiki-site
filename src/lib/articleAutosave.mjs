// Cloud writes serialize snapshots; typing remains enabled while a write runs.
export function createArticleAutosave({snapshot,save,onState=()=>{},onError=()=>{},canSave=()=>true,delay=1200,setTimer=setTimeout,clearTimer=clearTimeout}){
 let timer=null,flight=null,dirty=false,paused=false,lastSaved=null,disposed=false;
 const signature=value=>JSON.stringify(value);
 function notify(){if(disposed)return;dirty=true;onState(paused?'conflict':'pending');clearTimer(timer);timer=setTimer(()=>{void flush().catch(()=>{});},delay);}
 async function flush(){
  clearTimer(timer);if(disposed||paused||!canSave()){if(!paused)onState('local');return;}
  if(flight)return flight;
  flight=Promise.resolve().then(async()=>{
   try{do{const current=snapshot(),key=signature(current);dirty=false;if(key===lastSaved){onState('saved');break;}onState('saving');await save(current);lastSaved=key;if(signature(snapshot())!==key)dirty=true;}while(dirty&&!paused&&!disposed&&canSave());onState(dirty?'pending':'saved');}
   catch(error){dirty=true;if(error.status===409){paused=true;onState('conflict');}else onState(error.status===401?'login':'offline');onError(error);throw error;}
   finally{flight=null;}
  });return flight;
 }
 return {notify,flush,resume(){paused=false;lastSaved=null;notify();},retry(){if(!paused&&dirty)void flush().catch(()=>{});},pause(){paused=true;clearTimer(timer);},accept(){lastSaved=signature(snapshot());dirty=false;paused=false;onState('saved');},dispose(){disposed=true;clearTimer(timer);},get pending(){return dirty||Boolean(flight);},get paused(){return paused;}};
}
