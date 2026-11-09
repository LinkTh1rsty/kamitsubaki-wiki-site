import {editorHost} from './editor-host';

/** No document text, account data or credentials cross the frame boundary. */
export function notifyEditorHost(state: 'ready' | 'error' | 'dirty' | 'saved') {
  const host = editorHost();
  if (!host?.embedded || !host.parentOrigin || window.parent === window) return;
  window.parent.postMessage({type: 'wiki-editor:state', version: 1, state}, host.parentOrigin);
}
