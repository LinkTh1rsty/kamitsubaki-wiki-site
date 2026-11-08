import {HostNavigation} from './host-navigation';
import {workbenchText as t} from '@/lib/workbench-copy';
import { useMemo, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { Plus, Image, Link, ChevronLeft, ChevronRight } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { OutlineItem } from './properties-panel';
import { findTextMatches } from '@/lib/document-search';
export type ResourceItem = { label: string; kind: 'image' | 'media' | 'link'; position: number; url?: string };
export function WorkspaceSidebar({ editor, outline, resources, onNavigate, onNew, onReveal, activePosition, version }: { editor: Editor | null; outline: OutlineItem[]; resources: ResourceItem[]; onNavigate: (position: number) => void; onNew: () => void; onReveal: () => void; version: number; activePosition: number | null }) {
  const [query, setQuery] = useState(''); const [matchIndex, setMatchIndex] = useState(0);
  const matches = useMemo(() => editor ? findTextMatches(editor.state.doc, query) : [], [editor, query, version]);
  const find = (direction: number) => {
    if (!editor || !matches.length) return;
    const index = (matchIndex + direction + matches.length) % matches.length; setMatchIndex(index);
    onReveal(); requestAnimationFrame(() => editor.chain().focus().setTextSelection(matches[index]).scrollIntoView().run());
  };
  return <div className="wiki-workspace-nav"><nav className="wiki-workspace-doc" aria-label={t("当前写作导航")}><div className="wiki-workspace-brand"><div className="wiki-library-brand"><strong>{t("神椿 Wiki")}</strong><span>{t("编辑器")}</span></div><Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" aria-label={t("新建词条")} onClick={onNew}><Plus /></Button></TooltipTrigger><TooltipContent>{t("新建词条")}</TooltipContent></Tooltip></div>
    <Tabs defaultValue="outline" className="wiki-workspace-tabs"><TabsList variant="line"><TabsTrigger value="outline">{t("大纲")}</TabsTrigger><TabsTrigger value="resources">{t("素材")}</TabsTrigger><TabsTrigger value="find">{t("查找")}</TabsTrigger></TabsList>
      <TabsContent value="outline"><div className="wiki-nav-heading">{t("当前文档")} · {outline.length} {t("个章节")}</div>{outline.length ? outline.map((item, index) => <Button key={item.position + ':' + index} variant={activePosition === item.position ? 'secondary' : 'ghost'} aria-current={activePosition === item.position ? 'location' : undefined} className="wiki-nav-row" style={{ paddingLeft: 8 + Math.max(0, item.level - 2) * 12 }} onClick={() => onNavigate(item.position)}><span className="truncate">{item.text || t('未命名章节')}</span></Button>) : <p className="wiki-library-empty">{t("添加章节标题后，可在这里快速定位。")}</p>}</TabsContent>
      <TabsContent value="resources"><div className="wiki-nav-heading">{t("文中图片、媒体与链接")}</div>{resources.length ? resources.map((item, index) => <Button key={index} variant="ghost" className="wiki-nav-row" onClick={() => onNavigate(item.position)}>{item.kind === 'image' ? <Image data-icon="inline-start" /> : <Link data-icon="inline-start" />}<span className="truncate">{item.label}</span></Button>) : <p className="wiki-library-empty">{t("通过“插入”添加素材后，在这里定位和编辑。")}</p>}</TabsContent>
      <TabsContent value="find"><div className="flex flex-col gap-3"><Input aria-label={t("查找正文")} placeholder={t("输入要查找的文字")} value={query} onChange={event => { setQuery(event.target.value); setMatchIndex(0); }} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); find(event.shiftKey ? -1 : 0); } }} /><span role="status">{query ? matches.length ? t('找到 {count} 处').replace('{count}', String(matches.length)) : t("没有匹配的正文") : t("搜索当前文档正文")}</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={!matches.length} onClick={() => find(-1)}><ChevronLeft data-icon="inline-start" />{t("上一处")}</Button><Button variant="outline" size="sm" disabled={!matches.length} onClick={() => find(1)}>{t("下一处")}<ChevronRight data-icon="inline-end" /></Button></div></div></TabsContent>
    </Tabs></nav><HostNavigation footer/>
  </div>;
}
