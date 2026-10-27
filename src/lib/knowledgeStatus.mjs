import { entityCompleteness } from './entityCompleteness.mjs';
import { foldCjkSearchText } from './cjkSearch.mjs';

/** @typedef {{id:string,title:string,entityType:string,path:string,editHref:string|null,sourceLocale:string,score:number,missing:Array<{field:string,weight:number}>,search:string}} KnowledgeEntry */

/** Use the actual source file, including its fallback language, rather than inventing a path. */
export function knowledgeEditorHref(entry, locale) {
  const file = String(entry.filePath || '').replaceAll('\\', '/');
  const start = file.indexOf('src/content/');
  if (start < 0) return null;
  const target = file.slice(start).replace(/\/(zh-tw|zh-hk)\.md$/, '/zh.md');
  if (target.split('/').includes('..') || !/\/(zh|ja|en)\.md$/.test(target)) return null;
  return `/${locale}/contribute/editor/?target=${encodeURIComponent(target)}`;
}

/** The board, JSON index and reader share entityCompleteness's canonical field rules. */
export function buildKnowledgeReport(registry, locale = 'zh') {
  const entities = registry.list(locale);
  const names = new Map(entities.map(entry => [entry.data.id, [entry.data.name, entry.data.title,
    entry.data.romanizedName, entry.data.romanizedTitle, ...(entry.data.aliases || [])].filter(Boolean).join(' ')]));
  /** @type {KnowledgeEntry[]} */
  const entries = [];
  const fields = new Map();
  let scoreTotal = 0;
  let missingFields = 0;
  let missingTranslations = 0;
  for (const entry of entities) {
    const data = entry.data;
    const coverage = entityCompleteness(data);
    scoreTotal += coverage.score;
    const missing = coverage.missing.map(item => ({ ...item }));
    missingFields += missing.length;
    if (entry.fallback) { missing.push({ field: 'translation', weight: 0 }); missingTranslations++; }
    if (!missing.length) continue;
    for (const item of missing) fields.set(item.field, (fields.get(item.field) || 0) + 1);
    const title = data.name || data.title || data.id;
    const participants = [...(data.performers || []).map(person => person.entity), data.primaryArtist,
      ...(data.headliners || []), ...(data.guestPerformers || []), ...(data.credits || []).map(person => person.entity)]
      .filter(Boolean).map(id => names.get(id) || id);
    entries.push({ id: data.id, title, entityType: data.entityType, path: entry.url,
      editHref: knowledgeEditorHref(entry, locale), sourceLocale: entry.sourceLocale,
      score: coverage.score, missing,
      search: foldCjkSearchText([title, data.id, data.romanizedName, data.romanizedTitle, ...(data.aliases || []), ...participants].filter(Boolean).join(' ')),
    });
  }
  return { version: 2, locale, summary: { total: entities.length, needsWork: entries.length,
    missingFields, missingTranslations, averageScore: entities.length ? Math.round(scoreTotal / entities.length) : 0 },
    fields: [...fields].map(([field, count]) => ({ field, count })).sort((a, b) => b.count - a.count || a.field.localeCompare(b.field)),
    entries,
  };
}

/** @param {KnowledgeEntry[]} entries */
export function selectKnowledgeEntries(entries, { query = '', type = '', field = '', sort = 'missing' } = {}) {
  const terms = foldCjkSearchText(query).split(/\s+/).filter(Boolean);
  return entries.filter(entry => (!type || entry.entityType === type)
    && (!field || entry.missing.some(item => item.field === field))
    && terms.every(term => entry.search.includes(term)))
    .sort((a, b) => (sort === 'score' ? a.score - b.score : sort === 'title' ? a.title.localeCompare(b.title)
      : b.missing.length - a.missing.length) || a.score - b.score || a.id.localeCompare(b.id));
}

/** Preserve the existing issue kinds; additional rules use the extensible missing-field kind. */
export function knowledgeIssue(item, locale) {
  if (item.field === 'translation') return { kind: 'missing-translation', refs: [locale] };
  const kind = { summary: 'missing-summary', sources: 'missing-sources', credits: 'missing-credits' }[item.field];
  return kind ? { kind } : { kind: 'missing-field', refs: [item.field] };
}
