import {workbenchText as t} from '@/lib/workbench-copy';
import { useEffect, useId, useRef, useState } from 'react';

import { MetadataFields } from './metadata-fields';
import { Plus, X, SlidersHorizontal, Check, PanelRightClose } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FieldGroup, FieldSet, FieldLegend, FieldDescription } from '@/components/ui/field';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TextField, ChoiceField } from './form-fields';
import { cn } from '@/lib/utils';

import type { WikiMetadata } from '@/lib/wiki-document';
import { newDraft } from '../../../../src/lib/visualEditor.mjs';
import { collectionByType } from '../../../../src/lib/contentLayout.mjs';
import { metadataSections, metadataGuide } from '@/lib/metadata-guide';
import { Input } from '@/components/ui/input';

export const entityTypeLabels: Record<string, string> = { 'virtual-avatar': '虚拟艺人', person: '人物', unit: '组合', 'software-voice': '音乐同位体', 'work-track': '歌曲', 'work-release': '唱片', project: '企划', organization: '组织', 'live-event': '演出', 'lore-concept': '设定', 'editorial-article': '文章' };
export type OutlineItem = { text: string; level: number; position: number };
export function PropertiesPanel({ metadata, onChange, locked, pending = false, onClose }: { onClose?: () => void; metadata: WikiMetadata; onChange: (value: WikiMetadata) => void; locked: boolean; pending?: boolean }) {
  const [tag, setTag] = useState('');
  const prefix = useId(); const root = useRef<HTMLElement>(null);
  const articleMode = metadata.entityType === 'editorial-article';
  const originalSections = metadataSections(metadata);
  const sections = articleMode ? { basic: [], domain: ['articleCategory'], relations: ['relatedEntities'], display: [], other: Object.keys(metadata).filter(key => !['schemaVersion','id','locale','entityType','title','summary','articleCategory','relatedEntities','articleMediaRefs'].includes(key)) } : originalSections;
  const [activeSection, setActiveSection] = useState('basic');
  const section = (key: string, title: string, fields: string[]) => <section id={prefix + key} data-section={key} className="wiki-property-section" key={key}><FieldSet><FieldLegend>{title}</FieldLegend><MetadataFields value={metadata} onChange={onChange} locked={locked} include={fields} /></FieldSet></section>;
  const scrollParent = () => { let scroll = root.current?.parentElement; while (scroll && !/auto|scroll/.test(getComputedStyle(scroll).overflowY)) scroll = scroll.parentElement; return scroll; };
  useEffect(() => {
    const scroll = scrollParent(); if (!scroll || pending) return;
    const update = () => { const headerBottom = root.current?.querySelector('.wiki-property-header')?.getBoundingClientRect().bottom || 0; let current = 'basic'; root.current?.querySelectorAll<HTMLElement>('[data-section]').forEach(element => { if (element.getBoundingClientRect().top <= headerBottom + 48) current = element.dataset.section || current; }); setActiveSection(current); };
    scroll.addEventListener('scroll', update, { passive: true }); return () => scroll.removeEventListener('scroll', update);
  }, [pending]);
  const navigate = (key: string) => {
    setActiveSection(key);
    const section = root.current?.querySelector<HTMLElement>(`[id="${prefix + key}"]`);
    if (!section) return;
    const scroll = scrollParent();
    if (!scroll) return;
    const headerHeight = root.current?.querySelector('.wiki-property-header')?.getBoundingClientRect().height || 0;
    scroll.scrollTo({ top: scroll.scrollTop + section.getBoundingClientRect().top - scroll.getBoundingClientRect().top - headerHeight - 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  const changeType = (entityType: string) => {
    const template = newDraft((collectionByType as Record<string, string>)[entityType], metadata.locale || 'zh').meta as WikiMetadata;
    const next: WikiMetadata = { ...template, ...metadata, entityType };
    const previousTemplate = newDraft((collectionByType as Record<string, string>)[metadata.entityType] || 'articles', metadata.locale || 'zh').meta as WikiMetadata;
    for (const key of Object.keys(previousTemplate)) if (!(key in template) && JSON.stringify(metadata[key]) === JSON.stringify(previousTemplate[key])) delete next[key];
    const title = metadata.name || metadata.title || '';
    const romanized = metadata.romanizedName || metadata.romanizedTitle || '';
    if (template.name !== undefined) { next.name = title; delete next.title; if (romanized) next.romanizedName = romanized; delete next.romanizedTitle; }
    else { next.title = title; delete next.name; if (romanized) next.romanizedTitle = romanized; delete next.romanizedName; }
    onChange(next);
  };
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  const addTag = () => { const value = tag.trim(); if (value && !tags.includes(value)) onChange({ ...metadata, tags: [...tags, value] }); setTag(''); };
  if (pending) return <aside className="wiki-properties-content"><header className="wiki-property-header"><h2>{t("词条属性")}</h2>{onClose ? <Button variant="ghost" onClick={onClose}>{t("收起词条属性")}</Button> : null}</header><Alert><AlertDescription>{t("请先应用或放弃源码修改，再调整文档属性。")}</AlertDescription></Alert></aside>;
  return <aside ref={root} className="wiki-properties-content" aria-label={t("词条属性表单")}>
    <header className="wiki-property-header"><div className="flex items-center justify-between gap-2"><h2>{articleMode?t("文章属性"):t("词条属性")}</h2>{onClose ? <Button variant="ghost" size="icon-sm" aria-label={t("收起词条属性")} onClick={onClose}><PanelRightClose /></Button> : null}</div><nav aria-label={t("属性分区")} role="tablist">{(articleMode?[['basic','基本'],['domain','分类'],['relations','相关词条']]:[['basic', '基本'], ['domain', '专属'], ['relations', '关系与来源'], ['display', '展示']]).map(([key, label]) => <Button key={key} role="tab" variant="ghost" size="sm" aria-selected={activeSection === key} data-state={activeSection === key ? 'active' : 'inactive'} className={cn('wiki-property-tab')} onClick={() => navigate(key)}>{t(label)}</Button>)}</nav></header>
    <div className="wiki-property-body">
    <section id={prefix + 'basic'} data-section="basic" className="wiki-property-section"><FieldSet><FieldLegend>{t("基本资料")}</FieldLegend><FieldGroup>
      <FieldGroup className="wiki-property-pair"><div data-field-path="locale"><ChoiceField label={t("词条语言")} value={metadata.locale || 'zh'} disabled={locked} description={locked ? t("已有词条的语言与文件对应。繁体页面由简体原文自动生成。") : t("选择简体中文、日文或英文。繁体页面由简体原文自动生成。")} onChange={locale => onChange({ ...metadata, locale })} options={Array.from(new Map([['zh', '简体中文'], ['ja', '日本語'], ['en', 'English'], ...(metadata.locale && !['zh', 'ja', 'en'].includes(metadata.locale) ? [[metadata.locale, metadata.locale]] : [])] as [string, string][]))} /></div>
      <div data-field-path="entityType"><ChoiceField label={t("词条类型")} value={metadata.entityType || 'editorial-article'} disabled={locked} description={locked ? t("已有词条的类型与目录对应。") : t("决定下方需要填写的专属资料。")} onChange={changeType} options={Object.entries(entityTypeLabels)} /></div></FieldGroup>
      <div data-field-path="summary"><TextField label={t("一句话简介")} value={metadata.summary || ''} multiline placeholder={t("用一两句话说明这是谁、是什么作品或记录了什么。")} description={t("显示在词条列表和链接预览中，帮助读者快速了解内容。")} onChange={summary => onChange({ ...metadata, summary })} /></div>
      <MetadataFields value={metadata} onChange={onChange} locked={locked} include={sections.basic} />
      {!articleMode ? <FieldSet className="wiki-property-tags" data-field-path="tags"><FieldLegend variant="label">{t("标签")}</FieldLegend><FieldDescription>{t("每个标签只填一个词。")}</FieldDescription><div className="flex flex-wrap gap-2">{tags.map((value: string, index: number) => <Badge variant="secondary" key={value + index}>{value}<Button variant="ghost" size="icon-xs" aria-label={`${t("移除标签")} ${value}`} onClick={() => onChange({ ...metadata, tags: tags.filter((_tag: string, key: number) => key !== index) })}><X /></Button></Badge>)}</div><div className="flex gap-2"><Input aria-label={t("新标签")} placeholder={t("输入标签，按 Enter 添加")} value={tag} onChange={event => setTag(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.nativeEvent.isComposing) { event.preventDefault(); addTag(); } }} /><Button variant="outline" size="icon" aria-label={t("添加标签")} disabled={!tag.trim()} onClick={addTag}><Plus /></Button></div></FieldSet> : null}
    </FieldGroup></FieldSet></section>
    {section('domain', articleMode ? t("文章资料") : t(entityTypeLabels[metadata.entityType] || '词条') + t("资料"), sections.domain)}
    {section('relations', articleMode?t("相关词条"):t("关系与来源"), sections.relations)}
    {!articleMode?section('display', t('展示与收录'), sections.display):null}
    <details className="wiki-property-advanced"><summary><SlidersHorizontal aria-hidden="true" />{t("高级与兼容属性")}</summary><FieldGroup><div data-field-path="id"><TextField label={t("永久 ID")} value={metadata.id || ''} disabled={locked} description={metadataGuide('id').description} placeholder={metadataGuide('id').placeholder} onChange={id => onChange({ ...metadata, id })} /></div>{sections.other.length ? <><FieldDescription>{articleMode ? t("以下属性保留在本地 Markdown 中。文章投稿仅保存标题、简介、正文、分类、相关词条与图片说明；原作者和原始日期仍保留在导出文件。") : t("以下为导入文件的其他属性。编辑器会保留这些内容；不确定用途时可保持原值。")}</FieldDescription><MetadataFields value={metadata} onChange={onChange} locked={locked} include={sections.other} /></> : null}</FieldGroup></details>
    <p className="wiki-property-save-note"><Check aria-hidden="true" />{t("修改自动保存在当前浏览器，可用撤销恢复。")}</p>
    </div>
  </aside>;
}
