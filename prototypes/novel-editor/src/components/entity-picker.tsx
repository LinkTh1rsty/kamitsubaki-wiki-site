import {HelpTip} from './help-tip';
import {workbenchText as t} from '@/lib/workbench-copy';
import { createContext, useContext, useEffect, useMemo, useState, useId } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import type { CatalogEntry } from '../../server/local-api';
type CatalogMatcher = (catalog: CatalogEntry[], options: { entityTypes?: string[]; query: string; limit: number }) => CatalogEntry[];
export const CatalogContext = createContext<{ entries: CatalogEntry[]; locale: string; loading?: boolean }>({ entries: [], locale: 'zh' });
export function EntrySearch({ onSelect, imagesOnly = false, entityTypes }: { entityTypes?: string[]; imagesOnly?: boolean; onSelect: (entry: CatalogEntry) => void }) {
  const { entries, locale, loading } = useContext(CatalogContext); const [query, setQuery] = useState('');
  const [matcher, setMatcher] = useState<CatalogMatcher>();
  useEffect(() => { let active = true; import('../../../../src/lib/editorMetadataPresets.mjs').then(module => { if (active) setMatcher(() => module.metadataCatalogMatches); }); return () => { active = false; }; }, []);
  const localized = useMemo(() => {
    const unique = new Map<string, CatalogEntry>();
    for (const entry of [...entries.filter(entry => entry.locale === locale), ...entries.filter(entry => entry.locale === 'zh'), ...entries]) if (entry.id && !unique.has(entry.id)) unique.set(entry.id, entry);
    return [...unique.values()].filter(entry => !imagesOnly || entry.image);
  }, [entries, locale, imagesOnly]);
  const results = useMemo(() => matcher ? matcher(localized, { entityTypes, query, limit: 30 }) as CatalogEntry[] : [], [localized, entityTypes, query, matcher]);
  return <div className="flex flex-col gap-3"><Input aria-label={t("搜索关联词条")} placeholder={t("搜索名称、别名或英文名")} value={query} onChange={event => setQuery(event.target.value)} /><div className="wiki-entry-results">{results.map(entry => <Button key={entry.path} variant="ghost" className="wiki-entry-result" onClick={() => onSelect(entry)}>{imagesOnly && entry.image ? <img src={entry.image} alt="" loading="lazy" /> : null}<span>{entry.title}</span><small>{entry.romanized}</small></Button>)}{!matcher || loading ? <p role="status">{t("正在准备词条搜索…")}</p> : !results.length ? <p>{t("没有找到对应词条。")}</p> : null}</div></div>;
}
export function EntityPicker({ label, value, onChange, entityTypes, description }: { description?: string; label: string; value: string; onChange: (id: string) => void; entityTypes?: string[] }) {
  const id = useId(); const { entries, locale, loading } = useContext(CatalogContext); const [open, setOpen] = useState(false);
  const selected = entries.find(entry => entry.id === value && entry.locale === locale) || entries.find(entry => entry.id === value);
  return <Field><div className="flex items-center gap-1"><FieldLabel htmlFor={id}>{label}</FieldLabel>{description?<HelpTip label={label} text={description}/>:null}</div><div className="flex gap-2"><Button id={id} variant="outline" aria-describedby={description ? id + "-help" : undefined} aria-label={`选择${label}`} aria-expanded={open} className="justify-start flex-1 min-w-0" onClick={() => setOpen(!open)}><Search data-icon="inline-start" /><span className="truncate">{selected?.title || (value ? loading ? t("正在读取词条…") : `词条暂不可用（${value}）` : t("选择站内词条"))}</span></Button>{value ? <Button variant="ghost" onClick={() => onChange('')}>{t("清除")}</Button> : null}</div>{description ? <FieldDescription className="sr-only" id={id + "-help"}>{description}</FieldDescription> : null}{open ? <div className="wiki-inline-entity-picker"><EntrySearch entityTypes={entityTypes} onSelect={entry => { onChange(entry.id); setOpen(false); }} /><Button variant="ghost" size="sm" onClick={() => setOpen(false)}>{t("收起选择")}</Button></div> : null}</Field>;
}
