const name='kamitsubaki-gallery-uploads-v1';
function open(){return new Promise((resolve,reject)=>{const request=indexedDB.open(name,1);request.onupgradeneeded=()=>request.result.createObjectStore('drafts');request.onerror=()=>reject(request.error);request.onsuccess=()=>resolve(request.result);});}
export const galleryDraftKey=(owner,id)=>`gallery:${encodeURIComponent(owner)}:${id}`;
export async function galleryDraft(action,owner,value){const db=await open();try{return await new Promise((resolve,reject)=>{const transaction=db.transaction('drafts',action==='get'?'readonly':'readwrite'),store=transaction.objectStore('drafts');const request=action==='get'?store.get(owner):action==='delete'?store.delete(owner):store.put({...value,updatedAt:new Date().toISOString()},owner);let result;request.onsuccess=()=>result=request.result;transaction.oncomplete=()=>resolve(result);transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||Error('本机存储被取消'));});}finally{db.close();}}

// Migrate only this account's old active drafts. Each draft keeps its stable
// batch ID, so a lost creation response or a refresh cannot fork an upload.
export async function listGalleryDrafts(owner){
 const db=await open();
 try{return await new Promise((resolve,reject)=>{
  const transaction=db.transaction('drafts','readwrite'),store=transaction.objectStore('drafts'),drafts=[];
  const cursor=store.openCursor();
  cursor.onsuccess=()=>{
   const row=cursor.result;if(!row)return;
   const key=String(row.key),legacy=key===owner||key===`photos:${owner}`;
   if(legacy||key.startsWith(galleryDraftKey(owner,''))&&row.value.ownerId===owner){
    const value=row.value,id=value.id||crypto.randomUUID(),kind=value.kind||(value.manifest?.kind==='photos'||key===`photos:${owner}`?'photos':'sets');
    const nextKey=galleryDraftKey(owner,id),draft={...value,id,kind,ownerId:owner,key:nextKey};
    if(legacy){
     // An old active key can coexist with a newer multi-draft snapshot. Never
     // let migration replace that snapshot; preserve a differing legacy copy
     // as a separate draft that can stage its retained files again.
     const existing=store.get(nextKey);
     existing.onsuccess=()=>{
      if(existing.result){
       draft.id=crypto.randomUUID();draft.key=galleryDraftKey(owner,draft.id);draft.version=0;draft.cloudPending=true;draft.conflict=null;
      }
      drafts.push(draft);store.put(draft,draft.key);row.delete();row.continue();
     };
     return;
    }
    drafts.push(draft);
   }
   row.continue();
  };
  transaction.oncomplete=()=>resolve([...new Map(drafts.map(draft=>[draft.id,draft])).values()].sort((a,b)=>String(b.updatedAt||'').localeCompare(String(a.updatedAt||''))));
  transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error);
 });}finally{db.close();}
}
