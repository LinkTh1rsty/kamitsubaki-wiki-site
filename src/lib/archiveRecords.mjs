import { foldCjkSearchText } from './cjkSearch.mjs';

/** @typedef {{id:string,title:string,path:string|null,search:string}} ArchiveReference */
/** @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} id @param {string} locale @returns {ArchiveReference} */
export function archiveReference(registry, id, locale) {
  const entry = registry.resolveEntity(id, locale);
  const data = entry?.data;
  const title = data?.name || data?.title || id;
  return { id, title, path: entry?.url || null,
    search: foldCjkSearchText([id, title, data?.romanizedName, data?.romanizedTitle, ...(data?.aliases || [])].filter(Boolean).join(' ')) };
}

export const archiveYear = date => typeof date === 'string' && /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date) ? date.slice(0, 4) : '';
export const archiveSearch = values => foldCjkSearchText(values.filter(Boolean).join(' '));
export const archiveMatches = (entry, query) => foldCjkSearchText(query).split(/\s+/).filter(Boolean).every(term => entry.search.includes(term));

/** Preserve the precision of authored dates; undated entries always follow dated entries. */
export function compareArchiveRecords(a, b, sort = 'newest') {
  if (sort === 'title') return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  if (!a.date || !b.date) return Number(!a.date) - Number(!b.date) || a.id.localeCompare(b.id);
  return (sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)) || a.id.localeCompare(b.id);
}

export const uniqueArchiveReferences = refs => [...new Map(refs.map(ref => [ref.id, ref])).values()];
