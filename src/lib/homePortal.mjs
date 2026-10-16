import {toDatabaseRecord,databaseCollectionCounts} from './databaseBrowse.mjs';

/** Count the same stable entities as Database, and keep a bounded set of reading starts. */
export function buildHomePortal(entries, starts = []) {
  const records = entries.map(entry=>toDatabaseRecord(entry)).filter(Boolean);
  const seen = new Set();
  const people = starts.filter(entry=>{
    if (!entry?.url || !['person','virtual-avatar','unit'].includes(entry.data?.entityType) || seen.has(entry.data.id)) return false;
    seen.add(entry.data.id);return true;
  }).slice(0,6);
  return {total:records.length,collections:databaseCollectionCounts(records),people};
}

/** Announcement dates describe announced site changes, rather than inferred edit dates. */
export function homeUpdates(entries,locale='zh') {
  return entries.filter(entry=>!entry.data.draft).sort((a,b)=>b.data.date.localeCompare(a.data.date)||a.data.translationKey.localeCompare(b.data.translationKey)).slice(0,3).map(entry=>({
    title:entry.data.title,date:entry.data.date,datetime:entry.data.date.replaceAll('.','-'),
    href:`/${locale}/announcements/#${encodeURIComponent(entry.data.translationKey)}`,
  }));
}
