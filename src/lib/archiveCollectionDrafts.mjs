const fields={id:180,title:120,description:3000,kind:20,revision:20,items:15000,notes:40000};
export function validateCollectionEditor(value){
 if(!value || typeof value!=='object' || Array.isArray(value))throw Error('invalid_draft');
 const editor={};for(const [key,max]of Object.entries(fields)){const text=value[key] ?? (key==='kind'?'collection':key==='revision'?'0':'');if(typeof text!=='string' || text.length>max)throw Error('invalid_draft');editor[key]=text;}
 if(!['collection','exhibition'].includes(editor.kind) || !/^\d{1,16}$/.test(editor.revision))throw Error('invalid_draft');return editor;
}
export function collectionEditorItems(editor){const notes=editor.notes.split(/\r?\n/);return editor.items.split(/\r?\n/).map((entityId,index)=>({entityId:entityId.trim(),note:notes[index] || ''})).filter(row=>row.entityId);}
export const collectionDraftKey=owner=>'kamitsubaki-collection-drafts-v1:'+ (owner || 'guest');
export function readCollectionDrafts(storage,owner){
 try{const raw=storage.getItem(collectionDraftKey(owner));if(!raw)return [];if(raw.length>1500000)throw Error('large_drafts');const store=JSON.parse(raw);if(store.version!==1 || !Array.isArray(store.drafts) || store.drafts.length>50)throw Error('invalid_drafts');const seen=new Set();return store.drafts.map(draft=>{if(typeof draft.localId!=='string' || !/^local-[a-f0-9-]{36}$/.test(draft.localId) || seen.has(draft.localId) || !Number.isSafeInteger(draft.updatedAt))throw Error('invalid_draft');seen.add(draft.localId);return {...draft,editor:validateCollectionEditor(draft.editor)};});}catch{return [];}
}
export function saveCollectionDraft(storage,owner,editor,localId=null){
 const draft={localId:localId || 'local-'+crypto.randomUUID(),updatedAt:Date.now(),editor:validateCollectionEditor(editor)},current=readCollectionDrafts(storage,owner);if(current.length>=50 && !current.some(row=>row.localId===draft.localId))throw Error('draft_limit');const drafts=[draft,...current.filter(row=>row.localId!==draft.localId)],json=JSON.stringify({version:1,drafts});if(json.length>1500000)throw Error('large_drafts');storage.setItem(collectionDraftKey(owner),json);return draft;
}
export function removeCollectionDraft(storage,owner,localId){storage.setItem(collectionDraftKey(owner),JSON.stringify({version:1,drafts:readCollectionDrafts(storage,owner).filter(row=>row.localId!==localId)}));storage.removeItem(collectionDraftKey(owner)+':progress:'+localId);}
export function importCollectionEditor(raw){if(!raw || raw.format!=='archive-exhibition-draft' || raw.version!==1)throw Error('invalid_draft');return validateCollectionEditor(raw.editor);}
export const exportCollectionEditor=editor=>({format:'archive-exhibition-draft',version:1,editor:validateCollectionEditor(editor)});
