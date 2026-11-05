import {SpeechRolePanel} from './speech-tools';
import {HostNavigation} from './host-navigation';
import {workbenchText as t} from '@/lib/workbench-copy';
import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { FolderOpen, Plus, FileText, Search, Image, Link, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { OutlineItem } from './properties-panel';
import { findTextMatches } from '@/lib/document-search';
export type ResourceItem = { label: string; kind: 'image' | 'media' | 'link'; position: number; url?: string };
export function WorkspaceSidebar({ editor, outline, resources, onNavigate, onBrowse, onNew, onDrafts, onReveal, activePosition, version }: { editor: Editor | null; outline: OutlineItem[]; resources: ResourceItem[]; onNavigate: (position: number) => void; onBrowse: () => void; onNew: () => void; onDrafts: () => void; onReveal: () => void; version: number; activePosition: number | null }) {
  const [query, setQuery] = useState(''); const [matchIndex, setMatchIndex] = useState(0);
  const matches = useMemo(() => editor ? findTextMatches(editor.state.doc, query) : [], [editor, query, version]);
  const find = (direction: number) => {
    if (!editor || !matches.length) return;
    const index = (matchIndex + direction + matches.length) % matches.length; setMatchIndex(index);
    onReveal(); requestAnimationFrame(() => editor.chain().focus().setTextSelection(matches[index]).scrollIntoView().run());
  };
  return <nav className="wiki-workspace-nav" aria-label={t("当前写作导航")}><div className="wiki-library-brand"><strong>{t("神椿 Wiki")}</strong><span>{t("写作工作台")}</span></div>
    <div className="flex gap-2"><Button variant="outline" onClick={onBrowse}><FolderOpen data-icon="inline-start" />{t("打开词条")}</Button><Button variant="ghost" size="icon" aria-label={t("新建词条")} onClick={onNew}><Plus /></Button></div>
    <SpeechRolePanel editor={editor}/><Tabs defaultValue="outline" className="wiki-workspace-tabs"><TabsList variant="line"><TabsTrigger value="outline">{t("大纲")}</TabsTrigger><TabsTrigger value="resources">{t("素材")}</TabsTrigger><TabsTrigger value="find">{t("查找")}</TabsTrigger></TabsList>
      <TabsContent value="outline"><div className="wiki-nav-heading">{t("当前文档 ·")}{outline.length} {t("个章节")}</div>{outline.length ? outline.map((item, index) => <Button key={item.position + ':' + index} variant={activePosition === item.position ? 'secondary' : 'ghost'} aria-current={activePosition === item.position ? 'location' : undefined} className="wiki-nav-row" style={{ paddingLeft: 8 + Math.max(0, item.level - 2) * 12 }} onClick={() => onNavigate(item.position)}><span className="truncate">{item.text || '未命名章节'}</span></Button>) : <p className="wiki-library-empty">{t("添加章节标题后，可在这里快速定位。")}</p>}</TabsContent>
      <TabsContent value="resources"><div className="wiki-nav-heading">{t("文中图片、媒体与链接")}</div>{resources.length ? resources.map((item, index) => <Button key={index} variant="ghost" className="wiki-nav-row" onClick={() => onNavigate(item.position)}>{item.kind === 'image' ? <Image data-icon="inline-start" /> : <Link data-icon="inline-start" />}<span className="truncate">{item.label}</span></Button>) : <p className="wiki-library-empty">{t("通过“插入”添加素材后，在这里定位和编辑。")}</p>}</TabsContent>
      <TabsContent value="find"><div className="flex flex-col gap-3"><Input aria-label={t("查找正文")} placeholder={t("输入要查找的文字")} value={query} onChange={event => { setQuery(event.target.value); setMatchIndex(0); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(event.shiftKey ? -1 : 0); } }} /><span role="status">{query ? matches.length ? `找到 ${matches.length} 处` : t("没有匹配的正文") : t("搜索当前文档正文")}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!matches.length} onClick={() => find(-1)}><ChevronLeft data-icon="inline-start" />{t("上一处")}</Button><Button variant="outline" size="sm" disabled={!matches.length} onClick={() => find(1)}>{t("下一处")}<ChevronRight data-icon="inline-end" /></Button></div></div></TabsContent>
    </Tabs><Separator /><HostNavigation/><Button variant="ghost" className="wiki-nav-row" onClick={onDrafts}><FileText data-icon="inline-start" />{t("本地草稿")}</Button>
  </nav>;
}
