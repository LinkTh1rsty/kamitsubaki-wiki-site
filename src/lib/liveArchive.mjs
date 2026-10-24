import { archiveReference, archiveYear, archiveSearch, archiveMatches, compareArchiveRecords, uniqueArchiveReferences } from './archiveRecords.mjs';
import { knowledgeEditorHref } from './knowledgeStatus.mjs';
import { concertEventTypes } from './entityContract.mjs';

export { concertEventTypes } from './entityContract.mjs';
/** @typedef {{position:number,number:string,songId:string,title:string,path:string|null,artist:string,duration:string}} SetlistRow */

/** Keep setlist order, encores, repeated songs and unlinked titles exactly as authored.
 * @param {import('./entityRegistry.mjs').ResolvedEntity} entry
 * @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} locale
 * @returns {SetlistRow[]}
 */
export function liveSetlistRows(entry, registry, locale) {
  return (entry.data.setlist || []).map((track, index) => {
    const linked = track.songId ? registry.resolveEntity(track.songId, locale) : undefined;
    const song = linked?.data.entityType === 'work-track' ? linked : undefined;
    return { position: index + 1, number: track.number || '', songId: track.songId || '',
      title: track.title || song?.data.title || track.songId || '', path: song?.url || null,
      artist: track.artist || '', duration: track.duration || '' };
  });
}

/** @param {import('./entityRegistry.mjs').ResolvedEntity} entry @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} locale */
export function liveArchiveRecord(entry, registry, locale) {
  const d = entry.data;
  const headliners = uniqueArchiveReferences((d.headliners || []).map(id => archiveReference(registry, id, locale)));
  const guests = uniqueArchiveReferences((d.guestPerformers || []).map(id => archiveReference(registry, id, locale)));
  const setlist = liveSetlistRows(entry, registry, locale);
  const date = d.dateRange?.start || '';
  const startYear = archiveYear(date), endYear = archiveYear(d.dateRange?.end) || startYear;
  const years = startYear ? Array.from({ length: Math.max(1, Number(endYear) - Number(startYear) + 1) }, (_, index) => String(Number(startYear) + index).padStart(4, '0')) : [];
  const venue = d.venue || {};
  const mode = venue.isVirtual === true ? 'virtual' : venue.isVirtual === false ? 'physical' : 'unknown';
  return { id: d.id, title: d.name || d.title || d.id, path: entry.url, summary: d.summary || '',
    date, endDate: d.dateRange?.end || '', year: startYear, years, eventType: d.eventType || 'event',
    venue: venue.name || '', location: [venue.city, venue.country].filter(Boolean).join(' · '), mode,
    headliners, guests, organizer: d.organizer ? archiveReference(registry, d.organizer, locale) : null,
    setlist, needsSetlist: concertEventTypes.includes(d.eventType) && !setlist.length,
    editHref: knowledgeEditorHref(entry, locale),
    search: archiveSearch([d.id, d.name, d.title, d.romanizedName, ...(d.aliases || []), d.summary,
      venue.name, venue.city, venue.country, ...headliners.map(ref => ref.search), ...guests.map(ref => ref.search),
      ...setlist.flatMap(row => [row.title, row.songId])]),
  };
}

/** @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} locale */
export function buildLiveArchive(registry, locale = 'zh') {
  const entries = registry.list(locale).filter(entry => entry.data.entityType === 'live-event').map(entry => liveArchiveRecord(entry, registry, locale));
  const artists = uniqueArchiveReferences(entries.flatMap(entry => [...entry.headliners, ...entry.guests])).sort((a, b) => a.title.localeCompare(b.title));
  return { entries, artists, years: [...new Set(entries.flatMap(entry => entry.years))].sort().reverse(),
    types: [...new Set(entries.map(entry => entry.eventType))].sort(),
    summary: { total: entries.length, concerts: entries.filter(entry => concertEventTypes.includes(entry.eventType)).length,
      withSetlists: entries.filter(entry => entry.setlist.length).length, artists: artists.length } };
}

/** @param {ReturnType<typeof buildLiveArchive>['entries']} entries */
export function selectLiveArchive(entries, { query = '', artist = '', type = '', year = '', mode = '', sort = 'newest' } = {}) {
  return entries.filter(entry => archiveMatches(entry, query) && (!artist || [...entry.headliners, ...entry.guests].some(ref => ref.id === artist))
    && (!type || entry.eventType === type) && (!year || (year === 'unknown' ? !entry.year : entry.years.includes(year)))
    && (!mode || entry.mode === mode)).sort((a, b) => compareArchiveRecords(a, b, sort));
}

/** Only explicit song IDs produce performance history; one live record can include several renditions.
 * @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} songId @param {string} locale
 */
export function songLiveHistory(registry, songId, locale = 'zh') {
  if (registry.resolveEntity(songId, locale)?.data.entityType !== 'work-track') return [];
  const ids = [...new Set(registry.getIncomingRelations(songId).filter(edge => edge.type === 'performed-track').map(edge => edge.source))];
  return ids.flatMap(id => {
    const entry = registry.resolveEntity(id, locale);
    if (entry?.data.entityType !== 'live-event') return [];
    const record = liveArchiveRecord(entry, registry, locale);
    const performances = record.setlist.filter(row => row.songId === songId && row.path);
    return performances.length ? [{ ...record, performances }] : [];
  }).sort((a, b) => compareArchiveRecords(a, b, 'oldest'));
}
