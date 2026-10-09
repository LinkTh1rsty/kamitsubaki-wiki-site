import { newDraft } from './visualEditor.mjs';

const withoutBlockIds = blocks => blocks.map(({ id, ...block }) => block);

/** A pending source edit or any change from a blank draft is local work. */
export function hasEditorLocalWork(draft, sourcePending = null) {
  if (sourcePending !== null) return true;
  if (!draft || typeof draft !== 'object') return false;
  if (!draft.meta || !Array.isArray(draft.blocks)) return true;
  const blank = newDraft(draft.kind, draft.meta.locale);
  return Boolean(draft.path || draft.create || draft.originalDocument || draft.assets?.length ||
    JSON.stringify(draft.meta) !== JSON.stringify(blank.meta) ||
    JSON.stringify(withoutBlockIds(draft.blocks)) !== JSON.stringify(withoutBlockIds(blank.blocks)));
}

/** History must not discard source text that failed to reach the draft. */
export function canTraverseEditorHistory(sourcePending, applySource) {
  return sourcePending === null || applySource();
}

/** Accepting an older local article draft cancels any pending source parse first. */
export function acceptRecoveredArticleDraft(recovered, ownerId, clearPendingSource) {
  clearPendingSource();
  return { ...recovered, ownerId: ownerId === 'guest' || ownerId === 'unverified' ? null : ownerId };
}

/** Prevent edits while a remote article action may replace or save this draft. */
export async function withLockedEditorWorkspace(workspace, action, {allowDialogs=false}={}) {
  if (!workspace) return action();
  // Non-modal confirmation bubbles must stay interactive during an awaited action.
  const targets=allowDialogs&&workspace.children
    ? [...workspace.children].filter(child=>child.tagName!=='DIALOG') : [workspace];
  const previous=targets.map(target=>target.inert);
  targets.forEach(target=>{target.inert=true;});
  try { return await action(); }
  finally { targets.forEach((target,index)=>{target.inert=previous[index];}); }
}
