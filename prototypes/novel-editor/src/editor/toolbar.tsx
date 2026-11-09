import {SpeechImportDialog} from '@/components/speech-tools';
import {documentSpeechRoles} from '@/lib/speech-editor';
import {workbenchText as t} from '@/lib/workbench-copy';
import { useContext, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { Bold, Italic, Strikethrough, Underline, Code, SquareCode, Link, Link2, Image, List, ListOrdered, ListTodo, Quote, Table2, Undo2, Redo2, Plus, Highlighter, Languages, EyeOff, ChevronDown, Music2, Tv, Sigma, ChevronRight, Eraser, RemoveFormatting, MessageSquare, FileInput, CalendarDays, Keyboard, Subscript, Superscript, ALargeSmall, BookOpen, TextQuote, PanelTop } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuShortcut } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { inlineLabels } from './extensions';
import type { NodeEditTarget } from './node-dialog';
import { TableControls, TableInsertDialog } from './table-controls';
import { createDomainBlock } from '@/lib/wiki-document';
import { useContainerWidth } from '@/lib/use-container-width';
import { visibleToolbarShortcuts, toolbarShortcutPriority } from '@/lib/toolbar-layout';
const inlineIcons: Record<string, any> = { 'wiki-link': BookOpen, mark: Highlighter, abbr: TextQuote, kbd: Keyboard, time: CalendarDays, small: ALargeSmall, sub: Subscript, sup: Superscript, 'zh-variant': Languages, ja: Languages, math: Sigma };
const mod = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+';
import { clearSelectedFormatting, directEffectMarks, toggleInlineEffect } from '@/lib/wiki-effects';

import { CatalogContext } from '@/components/entity-picker';
function useTitleResolver() { const { entries, locale } = useContext(CatalogContext); return (id: string) => (entries.find(entry => entry.id === id && entry.locale === locale) || entries.find(entry => entry.id === id))?.title; }

type OpenTarget = (target: NodeEditTarget) => void;
function insertionRange(editor: Editor) {
  const selection = editor.state.selection;
  return selection instanceof NodeSelection && selection.node.isBlock ? { from: selection.to, to: selection.to } : { from: selection.from, to: selection.to };
}
export function openInline(editor: Editor, kind: string, open: OpenTarget) {
  if (directEffectMarks[kind]) { toggleInlineEffect(editor, kind); return; }
  const { from, to } = insertionRange(editor);
  const selected = editor.state.doc.textBetween(from, to, ' ');
  open({ editor, type: 'wikiInline', range: { from, to }, attrs: { kind, args: kind === 'wiki-link' ? ['', selected] : [selected, '', ''], syntax: kind === 'wiki-link' ? 'wiki-link' : kind === 'math' ? 'math' : 'shortcode', source: '' } });
}
export function openDomain(editor: Editor, type: string, open: OpenTarget) {
  const { from, to } = insertionRange(editor);
  open({ editor, type: 'wikiBlock', range: { from, to }, attrs: { data: {...createDomainBlock(type),...(type==='speech'?{roleId:documentSpeechRoles(editor)[0]?.id||''}: {})}, source: '', edited: true } });
}
export function openImage(editor: Editor, open: OpenTarget) {
  const { from, to } = insertionRange(editor);
  open({ editor, type: 'image', range: { from, to }, attrs: { src: '', alt: '', caption: '', title: null } });
}
export function openLink(editor: Editor, open: OpenTarget) {
  if (editor.isActive('link') && editor.state.selection.empty) editor.commands.extendMarkRange('link');
  const { from, to } = insertionRange(editor);
  open({ editor, type: 'link', range: { from, to }, attrs: { href: editor.getAttributes('link').href || '', text: editor.state.doc.textBetween(from, to, ' ') } });
}
function Action({ label, icon: Icon, onClick, active = false, disabled = false }: { label: string; icon: any; onClick: () => void; active?: boolean; disabled?: boolean }) {
  return <Tooltip><TooltipTrigger asChild><Button variant={active ? 'secondary' : 'ghost'} size="icon-sm" aria-label={t(label)} disabled={disabled} onClick={onClick}><Icon /></Button></TooltipTrigger><TooltipContent>{t(label)}</TooltipContent></Tooltip>;
}
export function FormatActions({ editor, open }: { editor: Editor; open: OpenTarget }) {
  const resolveTitle = useTitleResolver();
  return <><Action label={t("加粗")} icon={Bold} active={editor.isActive('bold')} disabled={!editor.can().toggleBold()} onClick={() => editor.chain().focus().toggleBold().run()} />
    <Action label={t("斜体")} icon={Italic} active={editor.isActive('italic')} disabled={!editor.can().toggleItalic()} onClick={() => editor.chain().focus().toggleItalic().run()} />
    <Action label={t("下划线")} icon={Underline} active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} />
    <Action label={t("删除线")} icon={Strikethrough} active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()} />
    <Action label={t("行内代码")} icon={Code} active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()} />
    <Action label={t("链接")} icon={Link} active={editor.isActive('link')} onClick={() => openLink(editor, open)} />
    <Action label={t("高亮")} icon={Highlighter} active={editor.isActive('highlight')} onClick={() => editor.chain().focus().toggleHighlight().run()} />
    <Action label={t("振假名注音")} icon={Languages} onClick={() => openInline(editor, 'ruby', open)} /><Action label={t("剧透遮罩")} icon={EyeOff} active={editor.isActive("wikiSpoiler")} onClick={() => openInline(editor, 'spoiler', open)} />
    <Action label={t("取消特殊效果")} icon={RemoveFormatting} onClick={() => clearSelectedFormatting(editor, false, resolveTitle)} />
  </>;
}
export function EditorToolbar({ editor, open, editingContent = false }: { editor: Editor | null; open: OpenTarget; editingContent?: boolean }) {
  const resolveTitle = useTitleResolver();
  const [tableOpen, setTableOpen] = useState(false);
  const [speechImportOpen, setSpeechImportOpen] = useState(false);
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const visible = visibleToolbarShortcuts(width, window.matchMedia('(max-width: 820px), (pointer: coarse)').matches);
  if (!editor) return <div ref={ref} className="wiki-format-toolbar" />;
  const heading = editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'paragraph';
  const formats = [
    { id: 'bold', label: '加粗', icon: Bold, shortcut: mod + 'B', run: () => editor.chain().focus().toggleBold().run(), can: editor.can().toggleBold(), active: editor.isActive('bold') },
    { id: 'italic', label: '斜体', icon: Italic, shortcut: mod + 'I', run: () => editor.chain().focus().toggleItalic().run(), can: editor.can().toggleItalic(), active: editor.isActive('italic') },
    { id: 'underline', label: '下划线', icon: Underline, shortcut: mod + 'U', run: () => editor.chain().focus().toggleUnderline().run(), can: editor.can().toggleUnderline(), active: editor.isActive('underline') },
    { id: 'strike', label: '删除线', icon: Strikethrough, run: () => editor.chain().focus().toggleStrike().run(), can: editor.can().toggleStrike(), active: editor.isActive('strike') },
    { id: 'highlight', label: '高亮', icon: Highlighter, run: () => editor.chain().focus().toggleHighlight().run(), can: editor.can().toggleHighlight(), active: editor.isActive('highlight') },
    { id: 'link', label: '链接', icon: Link, run: () => openLink(editor, open), can: true, active: editor.isActive('link') },
    { id: 'code', label: '行内代码', icon: Code, run: () => editor.chain().focus().toggleCode().run(), can: editor.can().toggleCode(), active: editor.isActive('code') },
    { id: 'bulletList', label: '项目列表', icon: List, run: () => editor.chain().focus().toggleBulletList().run(), can: editor.can().toggleBulletList(), active: editor.isActive('bulletList') },
    { id: 'orderedList', label: '编号列表', icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run(), can: editor.can().toggleOrderedList(), active: editor.isActive('orderedList') },
    { id: 'taskList', label: '任务列表', icon: ListTodo, run: () => editor.chain().focus().toggleTaskList().run(), can: editor.can().toggleTaskList(), active: editor.isActive('taskList') },
    { id: 'blockquote', label: '引用', icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run(), can: editor.can().toggleBlockquote(), active: editor.isActive('blockquote') },
    { id: 'codeBlock', label: '代码块', icon: SquareCode, run: () => editor.chain().focus().toggleCodeBlock().run(), can: editor.can().toggleCodeBlock(), active: editor.isActive('codeBlock') },
    { id: 'remove-effects', label: '取消特殊效果', icon: RemoveFormatting, run: () => clearSelectedFormatting(editor, false, resolveTitle), can: !editingContent, active: false },
    { id: 'clear', label: '清除文字格式', icon: Eraser, run: () => clearSelectedFormatting(editor, true, resolveTitle), can: !editingContent, active: false },
  ];
  const inserts = [
    { id: 'image', label: '图片与来源', icon: Image, run: () => openImage(editor, open) },
    { id: 'table', label: '表格', icon: Table2, run: () => setTableOpen(true) },
    ...(!editingContent ? [
      { id: 'speech', label: '发言', icon: MessageSquare, run: () => openDomain(editor, 'speech', open) },
      { id: 'speech-import', label: '快速导入发言', icon: FileInput, run: () => setSpeechImportOpen(true) },
    ] : []),
    { id: 'ruby', label: '振假名注音', icon: Languages, run: () => openInline(editor, 'ruby', open) },
    { id: 'spoiler', label: '剧透遮罩', icon: EyeOff, run: () => openInline(editor, 'spoiler', open) },
    { id: 'details', label: '折叠说明', icon: ChevronRight, run: () => openDomain(editor, 'details', open) },
    { id: 'media', label: '媒体', icon: Tv, run: () => openDomain(editor, 'media', open) },
    { id: 'media-switcher', label: '媒体切换', icon: PanelTop, run: () => openDomain(editor, 'media-switcher', open) },
    { id: 'lyrics', label: '歌词时间轴', icon: Music2, run: () => openDomain(editor, 'lyrics', open) },
    { id: 'math', label: '独立公式', icon: Sigma, run: () => openDomain(editor, 'math', open) },
  ];
  const shortcuts = [...formats, ...inserts.map(action => ({ ...action, can: true, active: action.id === 'spoiler' && editor.isActive('wikiSpoiler') }))];
  return <div className="wiki-toolbar-stack"><div ref={ref} className="wiki-format-toolbar" role="toolbar" aria-label={t("正文格式工具栏")} data-shortcuts={visible.size}>
    <Select disabled={!editor.can().setParagraph() && !editor.can().setHeading({ level: 2 })} value={heading} onValueChange={value => value === 'paragraph' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().setHeading({ level: Number(value) as any }).run()}><Tooltip><TooltipTrigger asChild><SelectTrigger size="sm" aria-label={t("段落样式")} style={{ width: width < 400 ? 84 : 100 }}><SelectValue /></SelectTrigger></TooltipTrigger><TooltipContent>{t("段落样式")}</TooltipContent></Tooltip><SelectContent><SelectGroup><SelectItem value="paragraph">{t("正文")}</SelectItem>{[1, 2, 3, 4, 5, 6].map(level => <SelectItem value={String(level)} key={level}>{t("标题")} {level}</SelectItem>)}</SelectGroup></SelectContent></Select>
    {toolbarShortcutPriority.filter(id => visible.has(id)).map(id => {
      const action = shortcuts.find(action => action.id === id)!;
      return <Action key={id} label={action.label} icon={action.icon} active={action.active} disabled={!action.can} onClick={action.run} />;
    })}
    <DropdownMenu><Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" aria-label={t("更多格式")}>{t("格式")}<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent>{t("更多格式")}</TooltipContent></Tooltip><DropdownMenuContent className="min-w-52"><DropdownMenuGroup>
      <DropdownMenuItem disabled={!editor.can().undo()} onSelect={() => editor.chain().focus().undo().run()}><Undo2 />{t("撤销")}<DropdownMenuShortcut>{mod}Z</DropdownMenuShortcut></DropdownMenuItem>
      <DropdownMenuItem disabled={!editor.can().redo()} onSelect={() => editor.chain().focus().redo().run()}><Redo2 />{t("重做")}<DropdownMenuShortcut>{mod === '⌘' ? '⇧⌘Z' : 'Ctrl+Y'}</DropdownMenuShortcut></DropdownMenuItem>
    </DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>
      {formats.map(action => <DropdownMenuItem key={action.id} disabled={!action.can} aria-checked={action.id === 'remove-effects' || action.id === 'clear' ? undefined : action.active} onSelect={action.run}><action.icon />{t(action.label)}{action.shortcut ? <DropdownMenuShortcut>{action.shortcut}</DropdownMenuShortcut> : action.active ? <DropdownMenuShortcut aria-hidden="true">✓</DropdownMenuShortcut> : null}</DropdownMenuItem>)}
    </DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
    <DropdownMenu><Tooltip><TooltipTrigger asChild><DropdownMenuTrigger asChild><Button variant="secondary" size="sm" aria-label={t("插入内容")}><Plus data-icon="inline-start" />{t("插入")}<ChevronDown data-icon="inline-end" /></Button></DropdownMenuTrigger></TooltipTrigger><TooltipContent>{t("插入内容")}</TooltipContent></Tooltip><DropdownMenuContent className="min-w-52"><DropdownMenuGroup>
      {inserts.map(action => <DropdownMenuItem key={action.id} onSelect={action.run}><action.icon />{t(action.label)}</DropdownMenuItem>)}
    </DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup>{Object.entries(inlineLabels).filter(([kind]) => !['ruby', 'spoiler'].includes(kind)).map(([kind, label]) => { const Icon = inlineIcons[kind] || Link2; return <DropdownMenuItem key={kind} onSelect={() => openInline(editor, kind, open)}><Icon />{t(label)}</DropdownMenuItem>; })}</DropdownMenuGroup></DropdownMenuContent></DropdownMenu>
</div><SpeechImportDialog editor={editor} open={speechImportOpen} onClose={() => setSpeechImportOpen(false)} /><TableControls editor={editor} /><TableInsertDialog editor={editor} open={tableOpen} onClose={() => setTableOpen(false)} /></div>;
}
