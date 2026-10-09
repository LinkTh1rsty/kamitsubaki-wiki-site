export function articleLocalDraftRecord(key,raw,owner){
 const current=key?.match(/^kamitsubaki-article-workbench-v2:([^:]+):([^:]+):(zh|ja|en)$/),legacy=key?.match(/^kamitsubaki-article-workbench-v1:([^:]+):(zh|ja|en)$/);
 if(!current&&!legacy||current&&current[1]!==owner)return null;
 let draft;try{draft=JSON.parse(raw||'null');}catch{return null;}if(!draft||draft.ownerId!==owner||draft.kind!=='articles')return null;
 return {id:current?current[2]:legacy[1],locale:current?current[3]:legacy[2],title:draft.meta?.title||'',key};
}
export function articleLocalKeysForRevision(storage,owner,revisionId){
 const keys=[];for(let i=0;i<storage.length;i++){
  const key=storage.key(i);if(!key?.startsWith(`article-submission-v2:${owner}:`))continue;
  let state;try{state=JSON.parse(storage.getItem(key)||'null');}catch{continue;}if(state?.revisionId!==revisionId)continue;
  const parts=key.split(':'),identity=parts.at(-1),locale=parts.at(-2),workbench=`kamitsubaki-article-workbench-v2:${owner}:${identity}:${locale}`;
  const draft=articleLocalDraftRecord(workbench,storage.getItem(workbench),owner);if(draft)keys.push(workbench,workbench+':source',key);
 }return keys;
}
