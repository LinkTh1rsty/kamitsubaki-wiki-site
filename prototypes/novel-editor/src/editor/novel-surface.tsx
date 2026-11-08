import {workbenchText as t} from '@/lib/workbench-copy';
import { memo, useEffect, useMemo, useRef } from 'react';
import { EditorRoot, EditorContent, EditorCommand, EditorCommandEmpty, EditorCommandList, EditorCommandItem, EditorBubble, Command, createSuggestionItems, renderItems, handleCommandNavigation, handleImageDrop, handleImagePaste, createImageUpload } from 'novel';
import type { Editor } from '@tiptap/core';
import { Heading2, Heading3, Type, List, ListOrdered, ListTodo, Quote, Code, Image, Table2, Tv, Music2, Sigma, ChevronRight, EyeOff, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { createWikiExtensions, type EditNode } from './extensions';
import { loadWikiDocument, type LoadedWikiDocument } from '@/lib/wiki-document';
import { FormatActions, openInline, openDomain, openImage } from './toolbar';
import { uploadLocalImage, type NodeEditTarget } from './node-dialog';

export const NovelSurface = memo(function NovelSurface({ source, path, currentSource, onReady, onUpdate, onTransaction, open }: {
  source: string; path: string; currentSource: () => string; onReady: (editor: Editor, loaded: LoadedWikiDocument) => void; onUpdate: (editor: Editor) => void; onTransaction: (editor: Editor, docChanged: boolean) => void; open: (target: NodeEditTarget) => void;
}) {
  const ready = useRef(false);
  const callbacks = useRef({ currentSource, onReady, onUpdate, onTransaction, open }); callbacks.current = { currentSource, onReady, onUpdate, onTransaction, open };
  const onEdit = useMemo<EditNode>(() => (editor, position) => {
    const node = editor.state.doc.nodeAt(position);
    if (!node || !['wikiInline', 'wikiBlock', 'image'].includes(node.type.name)) return;
    callbacks.current.open({ editor, position, type: node.type.name as any, attrs: node.attrs, range: { from: position, to: position + node.nodeSize } });
  }, []);
  const items = useMemo(() => createSuggestionItems([
    { title: '正文', description: '普通段落', searchTerms: ['text', 'paragraph'], icon: <Type />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setParagraph().run() },
    { title: '标题 2', description: '章节标题', searchTerms: ['heading', 'h2'], icon: <Heading2 />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run() },
    { title: '标题 3', description: '小节标题', searchTerms: ['heading', 'h3'], icon: <Heading3 />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).setHeading({ level: 3 }).run() },
    { title: '项目列表', description: '无序列表', searchTerms: ['list', 'bullet'], icon: <List />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBulletList().run() },
    { title: '编号列表', description: '有序列表', searchTerms: ['list', 'ordered'], icon: <ListOrdered />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleOrderedList().run() },
    { title: '任务列表', description: '可勾选的任务', searchTerms: ['task', 'todo'], icon: <ListTodo />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleTaskList().run() },
    { title: '引用', description: '引用资料', searchTerms: ['quote'], icon: <Quote />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleBlockquote().run() },
    { title: '表格', description: '插入三列表格', searchTerms: ['table'], icon: <Table2 />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: '图片', description: '上传图片或使用链接', searchTerms: ['image', 'upload'], icon: <Image />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); openImage(editor, callbacks.current.open); } },
    { title: '注音', description: '振假名与罗马字', searchTerms: ['ruby', 'furigana'], icon: <Type />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); openInline(editor, 'ruby', callbacks.current.open); } },
    { title: '剧透', description: '遮罩需要展开的文字', searchTerms: ['spoiler'], icon: <EyeOff />, command: ({ editor, range }) => { editor.chain().focus().deleteRange(range).run(); openInline(editor, 'spoiler', callbacks.current.open); } },
    ...(['media-switcher', 'media', 'lyrics', 'details', 'math'] as const).map(type => ({ title: ({ 'media-switcher': '媒体切换', media: '媒体', lyrics: '歌词时间轴', details: '折叠说明', math: '公式' })[type], description: ({ 'media-switcher': '组合多个官方平台', media: '嵌入官方平台内容', lyrics: '歌词、翻译和逐字时间', details: '可折叠的补充资料', math: 'LaTeX 数学公式' })[type], searchTerms: [type], icon: type === 'lyrics' ? <Music2 /> : type === 'math' ? <Sigma /> : type === 'details' ? <ChevronRight /> : <Tv />, command: ({ editor, range }: any) => { editor.chain().focus().deleteRange(range).run(); openDomain(editor, type, callbacks.current.open); } })),
    { title: '代码块', description: '带语言标识的代码', searchTerms: ['code'], icon: <Code />, command: ({ editor, range }) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run() },
  ]), []);
  const extensions = useMemo(() => [...createWikiExtensions(onEdit), Command.configure({ suggestion: { items: () => items, render: renderItems } })], [onEdit, items]);
  const uploadController = useRef<AbortController | null>(null);
  // Allocate in the effect so React's mount probe never leaves paste/drop with
  // an already aborted controller. Remounts read the latest saved source.
  useEffect(() => { const controller = new AbortController(); uploadController.current = controller; return () => { controller.abort(); if (uploadController.current === controller) uploadController.current = null; }; }, []);
  const upload = useMemo(() => createImageUpload({ onUpload: async file => { try { const controller = uploadController.current; if (!controller) throw new DOMException(t('当前文档已关闭'), 'AbortError'); return await uploadLocalImage(file, controller.signal); } catch (error: any) { if (error.name !== 'AbortError') toast.error(t(error.message), { id: error.message }); throw error; } } }), []);
  const instance = useRef<Editor | null>(null);
  return <EditorRoot><EditorContent initialContent={{ type: 'doc', content: [{ type: 'paragraph' }] }} extensions={extensions} className="wiki-novel-surface"
    onCreate={({ editor }) => { instance.current = editor; try { const loaded = loadWikiDocument(editor, callbacks.current.currentSource() || source, path); ready.current = true; callbacks.current.onReady(editor, loaded); } catch (error: any) { toast.error(t(error.message), { id: error.message }); } }}
    onUpdate={({ editor }) => { if (ready.current) callbacks.current.onUpdate(editor); }}
    onTransaction={({ editor, transaction }) => { if (ready.current) callbacks.current.onTransaction(editor, transaction.docChanged); }}
    editorProps={{ attributes: { class: 'wiki-prose', role: 'textbox', 'aria-multiline': 'true', 'aria-label': t('词条正文'), 'data-testid': 'novel-editor' }, handleDOMEvents: { keydown: (_view, event) => handleCommandNavigation(event) }, handlePaste: (view, event) => handleImagePaste(view, event, upload), handleDrop: (view, event, _slice, moved) => handleImageDrop(view, event, moved, upload) }}
    >
    <EditorCommand className="wiki-slash-menu"><EditorCommandEmpty>{t("没有匹配的内容")}</EditorCommandEmpty><EditorCommandList>{items.map(item => <EditorCommandItem key={item.title} value={item.title} onCommand={props => item.command?.(props)} className="wiki-slash-item"><span className="wiki-slash-icon">{item.icon}</span><span><strong>{t(item.title)}</strong><small>{t(item.description)}</small></span></EditorCommandItem>)}</EditorCommandList></EditorCommand>
    <EditorBubble className="wiki-bubble-menu" tippyOptions={{ duration: 120 }}>
      {instance.current ? <FormatActions editor={instance.current} open={target => callbacks.current.open(target)} /> : null}
    </EditorBubble>
  </EditorContent></EditorRoot>;
});
