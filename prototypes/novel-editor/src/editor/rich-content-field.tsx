import {workbenchText as t} from '@/lib/workbench-copy';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import { createWikiExtensions } from './extensions';
import { EditorToolbar } from './toolbar';
import { NodeEditor, type NodeEditTarget } from './node-dialog';
import { loadWikiDocument, exportWikiDocument, type LoadedWikiDocument } from '@/lib/wiki-document';
import { restoreNodeEdit, type StoredNodeEdit } from '@/lib/node-edit-draft';

// A nested Wiki document uses the same parser, semantic nodes, and native history.
// Its local state is committed only when the enclosing edit is applied.
export function RichContentField({ value, onChange, locale = 'zh', pendingDraft, onPendingChange, onPendingDraft }: { value: string; onChange: (value: string) => void; locale?: string; pendingDraft?: StoredNodeEdit; onPendingChange?: (pending: boolean) => void; onPendingDraft?: (draft: StoredNodeEdit | null) => void }) {
  const original = useRef(value); const loaded = useRef<LoadedWikiDocument>();
  const change = useRef(onChange); change.current = onChange;
  const [target, setTarget] = useState<NodeEditTarget | null>(null);
  const [isReady, setReady] = useState(false);
  const pendingCallbacks = useRef({ onPendingChange, onPendingDraft }); pendingCallbacks.current = { onPendingChange, onPendingDraft };
  const savePending = useCallback((draft: StoredNodeEdit | null) => pendingCallbacks.current.onPendingDraft?.(draft), []);
  const closePending = useCallback(() => { setTarget(null); pendingCallbacks.current.onPendingDraft?.(null); }, []);
  useEffect(() => { pendingCallbacks.current.onPendingChange?.(Boolean(target)); return () => pendingCallbacks.current.onPendingChange?.(false); }, [target]);
  const [, refresh] = useState(0);
  const extensions = useMemo(() => createWikiExtensions((editor, position) => {
    const node = editor.state.doc.nodeAt(position);
    if (node) setTarget({ editor, position, type: node.type.name as NodeEditTarget['type'], attrs: node.attrs, range: { from: position, to: position + node.nodeSize } });
  }, true, false), []);
  const editor = useEditor({ extensions, content: '', editable: false,
    editorProps: { attributes: { class: 'wiki-prose wiki-rich-field-prose', role: 'textbox', 'aria-label': '说明正文', 'aria-multiline': 'true' } },
    onCreate: ({ editor }) => { loaded.current = loadWikiDocument(editor as Editor, `---\nschemaVersion: 2\nid: nested-content\nlocale: ${locale}\nentityType: editorial-article\ntitle: 说明\n---\n\n${original.current}`); editor.setEditable(true); setReady(true); if (pendingDraft) setTarget(restoreNodeEdit(editor as Editor, pendingDraft)); },
    onTransaction: () => refresh(previous => previous + 1),
    onUpdate: ({ editor }) => {
      if (!loaded.current) return;
      const source = exportWikiDocument(editor as Editor, loaded.current.context, loaded.current.metadata);
      const separator = source.indexOf('\n---\n', 4);
      change.current(source.slice(separator + 5).replace(/^\n/, ''));
    },
  });
  return <div className="wiki-rich-field" aria-busy={!isReady}><EditorToolbar editor={isReady ? editor as Editor | null : null} open={setTarget} editingContent={Boolean(target)} />{!isReady ? <p role="status">{t("正在准备说明正文…")}</p> : null}<EditorContent editor={editor} /><NodeEditor target={target} locale={locale} onClose={closePending} onDraft={savePending} /></div>;
}
