import {editorHost} from '@/lib/editor-host';
import {workbenchText as t} from '@/lib/workbench-copy';
import { memo } from 'react';
import { FileText, SquarePen, Search, FolderOpen, Upload, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { CatalogEntry } from '../../server/local-api';

const pinnedIds = ['kaf', 'vwp', 'rim', 'harusaruhi', 'isekaijoucho', 'koko'];
export const collectionLabels: Record<string, string> = { people: '艺人', artists: '艺人', units: '组合', isotopes: '音乐同位体', songs: '歌曲', releases: '唱片', projects: '企划', organizations: '组织', lives: '演出', lore: '设定', logs: '记录', articles: '文章' };
export const LibrarySidebar = memo(function LibrarySidebar({ catalog, loading, search, onSearch, selectedPath, selectedKey, onSelect, onDemo, onNew, onImport, onDrafts, locale, onLocale }: {
  catalog: CatalogEntry[]; loading: boolean; search: string; onSearch: (value: string) => void; selectedPath: string; selectedKey: string;
  onSelect: (entry: CatalogEntry) => void; onDemo: () => void; onNew: () => void; onImport: () => void; onDrafts: () => void; locale: string; onLocale: (locale: string) => void;
}) {
  const normalized = search.trim().toLowerCase();
  const entries = catalog.filter(entry => entry.locale === locale && (!normalized || `${entry.title} ${entry.romanized} ${entry.id}`.toLowerCase().includes(normalized)))
    .sort((a, b) => { const ai = pinnedIds.indexOf(a.id), bi = pinnedIds.indexOf(b.id); return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi) || a.title.localeCompare(b.title, 'zh'); }).slice(0, normalized ? 60 : 24);
  return <nav className="wiki-library" aria-label={t("词条库")}>
    <div className="wiki-library-brand"><strong>{t("神椿 Wiki")}</strong><span>{t("编辑器")}</span></div>
    <Button className="w-full" onClick={onNew}><SquarePen data-icon="inline-start" />{t("新建词条")}</Button>
    <div className="wiki-library-search"><Search aria-hidden="true" /><Input aria-label={t("搜索词条")} placeholder={t("搜索词条")} value={search} onChange={event => onSearch(event.target.value)} /></div>
    <div className="wiki-library-languages" role="group" aria-label={t("词条语言")}>{[['zh', '中文'], ['ja', '日本語'], ['en', 'English']].map(([key, label]) => <Button key={key} size="xs" variant={locale === key ? 'secondary' : 'ghost'} aria-pressed={locale === key} onClick={() => onLocale(key)}>{label}</Button>)}</div>
    {!editorHost()?<>    <div className="wiki-library-section">{t("功能示例")}</div>
    <Button className={cn('wiki-library-row', selectedKey === 'demo' && 'bg-accent')} variant="ghost" onClick={onDemo}><FlaskConical data-icon="inline-start" /><span>{t("花譜 · 功能示例")}</span></Button>
</>:null}
    <div className="wiki-library-section">{normalized ? t("搜索结果") : t("词条库")}</div>
    <div className="wiki-library-scroll">{loading ? Array.from({ length: 6 }, (_item, index) => <Skeleton className="h-9 w-full" key={index} />) : entries.length ? entries.map(entry => <Button key={entry.path} className={cn('wiki-library-row', selectedPath === entry.path && 'bg-accent')} variant="ghost" aria-current={selectedPath === entry.path ? 'page' : undefined} onClick={() => onSelect(entry)}><FileText data-icon="inline-start" /><span className="truncate">{entry.title}</span></Button>) : <p className="wiki-library-empty">{t("没有找到匹配的词条")}</p>}</div>
    <div className="wiki-library-footer"><Separator /><Button variant="ghost" className="wiki-library-row" onClick={onImport}><Upload data-icon="inline-start" />{t("导入 Markdown")}</Button><Button variant="ghost" className="wiki-library-row" onClick={onDrafts}><FolderOpen data-icon="inline-start" />{t("本地草稿")}</Button></div>
  </nav>;
});
