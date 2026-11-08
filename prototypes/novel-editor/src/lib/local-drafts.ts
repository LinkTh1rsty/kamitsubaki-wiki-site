import {editorHost} from './editor-host';
import type { StoredNodeEdit } from './node-edit-draft';
import type { ArticleBinding } from './article-document';
import type { ReviewResolution } from './review-service';
import type { ReviewAttachment } from './review-attachments';
export type LocalDraft = { key: string; path: string; source: string; baseSource?: string; create?: boolean; attachments?: ReviewAttachment[]; resolution?: ReviewResolution; article?: ArticleBinding; articleBase?:{articleId:string;version:number}; title: string; locale: string; savedAt: number; pendingSource?: string; pendingNode?: StoredNodeEdit };
const prototypePrefix='kamitsubaki-novel-local-prototype:v1:';
const prefix=editorHost()?'kamitsubaki-wiki-novel:v1:'+encodeURIComponent(editorHost()!.ownerId||'unverified')+':'+editorHost()!.mode+':':prototypePrefix;
const activeKey = prefix + 'active-document';
const withoutTab = ({ tabId: _tab, ...draft }: LocalDraft & { tabId?: string }): LocalDraft => draft;
export function readLastLocalDraft(): LocalDraft | null {
  try { const key = JSON.parse(localStorage.getItem(activeKey) || 'null'); return typeof key === 'string' ? readLocalDraft(key) : readLocalDraft('demo'); } catch { return readLocalDraft('demo'); }
}
export function readLocalDraft(key: string): LocalDraft | null {
  try { const value = JSON.parse(localStorage.getItem(prefix + encodeURIComponent(key)) || 'null'); return value && value.key === key && typeof value.source === 'string' ? withoutTab(value) : null; } catch { return null; }
}
export function listLocalDrafts(): LocalDraft[] {
  const drafts: LocalDraft[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index); if (!key?.startsWith(prefix)) continue;
    try { const value = JSON.parse(localStorage.getItem(key)!); if (typeof value.source === 'string' && typeof value.key === 'string') drafts.push(withoutTab(value)); } catch { /* Other versions stay untouched. */ }
  }
  return drafts.sort((a, b) => b.savedAt - a.savedAt);
}
// Each tab stamps its writes. Another tab's newer write to the same draft means a
// second editor is open; the caller must not silently overwrite it.
const tabId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random());
export class DraftConflictError extends Error { constructor() { super('draft_conflict'); this.name = 'DraftConflictError'; } }
const lastWrite = new Map<string, number>();
export function saveLocalDraft(draft: LocalDraft, { force = false }: { force?: boolean } = {}) {
  const storageKey = prefix + encodeURIComponent(draft.key);
  if (!force) {
    try {
      const existing = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const mine = lastWrite.get(storageKey);
      if (existing?.tabId && existing.tabId !== tabId && mine !== undefined && existing.savedAt > mine) throw new DraftConflictError();
    } catch (error) { if (error instanceof DraftConflictError) throw error; }
  }
  const stamped = { ...draft, tabId };
  localStorage.setItem(storageKey, JSON.stringify(stamped));
  localStorage.setItem(activeKey, JSON.stringify(draft.key));
  lastWrite.set(storageKey, stamped.savedAt);
}

/** Login never silently adopts an unclaimed draft. Recovery requires a click. */
export function unclaimedLocalDrafts():LocalDraft[]{
 const host=editorHost();if(!host||['guest','unverified'].includes(host.ownerId||''))return [];
 const drafts:LocalDraft[]=[];
 for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i)!;if(!['guest','unverified'].some(owner=>key.startsWith('kamitsubaki-wiki-novel:v1:'+owner+':'+host.mode+':')))continue;
  try{const draft=JSON.parse(localStorage.getItem(key)||'null');if(typeof draft?.source==='string'&&typeof draft.key==='string'&&!draft.article)drafts.push({...draft,unclaimedOwner:key.includes(':guest:')?'guest':'unverified'});}catch{}
 }
 return drafts.sort((a,b)=>b.savedAt-a.savedAt);
}
