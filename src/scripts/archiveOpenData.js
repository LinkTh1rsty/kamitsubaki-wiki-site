import {loadArchiveSnapshot} from '../lib/archiveClient.mjs';
import {verifyArchiveSnapshot,archiveCSV,archiveZip,archiveCitation,flattenArchiveEntities,downloadArchiveFile} from '../lib/archiveExports.mjs';
import {readBoundedJson} from '../lib/boundedJson.mjs';
import {updateLocaleQueries} from '../lib/localeQuery.mjs';
export async function initializeArchiveOpenData(root,{snapshot,copy:c,locale='zh',load=loadArchiveSnapshot}={}){
 const select=root.querySelector('[data-data-snapshot]'),resource=root.querySelector('[data-data-resource]'),status=root.querySelector('[data-data-status]'),downloads=[...root.querySelectorAll('[data-data-download]')];
 let active=snapshot,token=0,verified=false;
 const rows=()=>resource.value==='credits'?active.entities.flatMap(entity=>(entity.facts.credits || []).map(credit=>({entityId:entity.id,...credit}))):active[resource.value];
 const csvRows=()=>resource.value==='entities'?flattenArchiveEntities(active,locale):rows();
 async function show(){
  const generation=++token;verified=false;downloads.forEach(button=>button.disabled=true);status.textContent=c.exporting;
  root.querySelector('[data-data-preview]').textContent='';root.querySelector('[data-data-citation]').textContent='';
  try{const selected=select.value,loaded=selected===snapshot.snapshot?snapshot:await load('/api/archive/v1/snapshots/'+selected+'.json');if(generation!==token)return;
   if(loaded.snapshot!==selected || !await verifyArchiveSnapshot(loaded))throw Error('invalid_snapshot');if(generation!==token)return;
   active=loaded;verified=true;status.textContent=c.verified+' · '+rows().length+' '+c.rows;downloads.forEach(button=>button.disabled=false);
   root.querySelector('[data-data-preview]').textContent=JSON.stringify({version:1,snapshot:active.snapshot,preview:rows().slice(0,8)},null,2);
   root.querySelector('[data-data-citation]').textContent=JSON.stringify(archiveCitation(active),null,2);
  }catch{if(generation===token){verified=false;downloads.forEach(button=>button.disabled=true);root.querySelector('[data-data-preview]').textContent='';root.querySelector('[data-data-citation]').textContent='';status.textContent=c.invalidSnapshot;}}
 }
 function update(){const url=new URL(location.href);url.searchParams.set('snapshot',select.value);url.searchParams.set('resource',resource.value);history.pushState(history.state,'',url);updateLocaleQueries(document,location.search);void show();}
 select.addEventListener('change',update);resource.addEventListener('change',update);root.querySelector('[data-data-verify]').addEventListener('click',()=>void show());
 downloads.forEach(button=>button.addEventListener('click',async()=>{
  if(!verified)return;button.disabled=true;const selected=active,kind=resource.value;
  try{const file='archive-'+selected.snapshot.slice(0,12)+'-'+kind;
   if(button.dataset.dataDownload==='csv')downloadArchiveFile(archiveCSV(csvRows()),file+'.csv','text/csv;charset=utf-8');
   else if(button.dataset.dataDownload==='json')downloadArchiveFile(JSON.stringify({version:1,snapshot:selected.snapshot,records:rows()},null,2),file+'.json');
   else{const zip=await archiveZip({'snapshot.json':selected,'entities.csv':archiveCSV(flattenArchiveEntities(selected,locale)),'relations.csv':archiveCSV(selected.relations),'citation.json':archiveCitation(selected),'README.txt':c.openDataIntro+'\n'+c.coverage+'\n'+archiveCitation(selected).textLicense+'\n'+archiveCitation(selected).mediaRights});downloadArchiveFile(zip,file+'.zip','application/zip');}
  }catch{status.textContent=c.failed;}finally{button.disabled=!verified;}
 }));
 const restore=()=>{const params=new URL(location.href).searchParams,hash=params.get('snapshot'),kind=params.get('resource');if([...select.options].some(option=>option.value===hash))select.value=hash;else select.value=snapshot.snapshot;if([...resource.options].some(option=>option.value===kind))resource.value=kind;else resource.value='entities';void show();};
 try{const response=await fetch('/api/archive/v1/catalogue.json',{signal:AbortSignal.timeout(10000)});if(!response.ok)throw Error('catalogue');const catalogue=await readBoundedJson(response,100000);for(const entry of catalogue.snapshots || [])if(/^[a-f0-9]{64}$/.test(entry.hash) && entry.hash!==snapshot.snapshot){const option=document.createElement('option');option.value=entry.hash;option.textContent=c.history+' · '+entry.hash.slice(0,12);select.append(option);}}catch{ /* Current snapshot remains usable when historical discovery is unavailable. */ }
 window.addEventListener('popstate',restore);restore();
}
