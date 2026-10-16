import {recordObservation} from '../lib/archiveClient.mjs';
for(const root of document.querySelectorAll('[data-entity-archive-actions]')){
 const c=JSON.parse(root.querySelector('[data-observation-copy]').textContent),status=root.querySelector('[data-observation-status]');
 for(const button of root.querySelectorAll('[data-observation-kind]'))button.addEventListener('click',async()=>{
  button.disabled=true;
  try{const result=await recordObservation({kind:button.dataset.observationKind,entityId:root.dataset.entityId});status.textContent=result.synced?c.synced:c.local;}
  catch{status.textContent=c.failed;}finally{button.disabled=false;}
 });
}
