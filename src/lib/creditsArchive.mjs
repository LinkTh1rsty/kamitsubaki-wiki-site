import { archiveReference, archiveYear, archiveSearch, archiveMatches, compareArchiveRecords, uniqueArchiveReferences } from './archiveRecords.mjs';

/** Names without an entity ID remain separate authored-name groups; never infer identity. */
export function creditIdentity(credit) {
  if (credit.entity) return `entity:${credit.entity}`;
  return credit.name?.trim() ? `name:${credit.name.trim()}` : null;
}

/** @param {import('./entityRegistry.mjs').EntityRegistry} registry @param {string} locale */
export function buildCreditsArchive(registry, locale = 'zh') {
  const works = registry.list(locale);
  const songs = works.filter(entry => entry.data.entityType === 'work-track');
  const entries = works.filter(entry => entry.data.credits?.some(credit => creditIdentity(credit))).map(entry => {
    const d = entry.data;
    const artists = uniqueArchiveReferences([...(d.performers || []).map(performer => archiveReference(registry, performer.entity, locale)),...(d.primaryArtist?[archiveReference(registry,d.primaryArtist,locale)]:[]),...(d.headliners || []).map(id=>archiveReference(registry,id,locale))]);
    const seen = new Set();
    const credits = (d.credits || []).flatMap(credit => {
      const key = creditIdentity(credit);
      if (!key || seen.has(`${key}\u0000${credit.role}`)) return [];
      seen.add(`${key}\u0000${credit.role}`);
      const ref = credit.entity ? archiveReference(registry, credit.entity, locale) : null;
      return [{ key, role: credit.role, title: ref?.title || credit.name.trim(), path: ref?.path || null,
        entityId: credit.entity || '', search: ref?.search || credit.name.trim() }];
    });
    return { id: d.id, entityType:d.entityType,title: d.title || d.name || d.id, path: entry.url, summary: d.summary || '',
      date: d.releaseDate || '', year: archiveYear(d.releaseDate), artists, credits,
      search: archiveSearch([d.id, d.title, d.romanizedTitle, ...(d.aliases || []), ...artists.map(ref => ref.search), ...credits.map(credit => credit.search)]) };
  });
  const groups = new Map();
  for (const entry of entries) for (const credit of entry.credits) {
    if (!groups.has(credit.key)) groups.set(credit.key, { ...credit, works: new Map(), roles: new Set() });
    const group = groups.get(credit.key);
    group.works.set(entry.id, entry); group.roles.add(credit.role);
  }
  const creators = [...groups.values()].map(group => {
    const works = [...group.works.values()];
    const years = new Map(), partners = new Map(),coCreators=new Map();
    for (const work of works) {
      if (work.year) years.set(work.year, (years.get(work.year) || 0) + 1);
      for (const artist of work.artists) {
        if (!partners.has(artist.id)) partners.set(artist.id, { ...artist, count: 0 });
        partners.get(artist.id).count++;
      }
      for(const credit of new Map(work.credits.map(credit=>[credit.key,credit])).values())if(credit.key!==group.key){if(!coCreators.has(credit.key))coCreators.set(credit.key,{key:credit.key,title:credit.title,entityId:credit.entityId,path:credit.path,count:0});coCreators.get(credit.key).count++;}
    }
    return { key: group.key, title: group.title, path: group.path, entityId: group.entityId,
      workCount: works.length, roles: [...group.roles].sort(),
      years: [...years].map(([year, count]) => ({ year, count })).sort((a, b) => b.year.localeCompare(a.year)),
      collaborators: [...partners.values()].sort((a, b) => b.count - a.count || a.id.localeCompare(b.id)),coCreators:[...coCreators.values()].sort((a,b)=>b.count-a.count || a.key.localeCompare(b.key)) };
  }).sort((a, b) => b.workCount - a.workCount || a.title.localeCompare(b.title) || a.key.localeCompare(b.key));
  return { entries, creators,
    artists: uniqueArchiveReferences(entries.flatMap(entry => entry.artists)).sort((a, b) => a.title.localeCompare(b.title)),
    roles: [...new Set(entries.flatMap(entry => entry.credits.map(credit => credit.role)))].sort(),
    years: [...new Set(entries.map(entry => entry.year).filter(Boolean))].sort().reverse(),
    summary: { totalSongs: songs.length, withCredits: entries.filter(entry=>entry.entityType==='work-track').length, withWorkCredits:entries.length,creatorGroups: creators.length,
      linkedCreators: creators.filter(creator => creator.path).length } };
}

/** Creator and role must occur on the same credit row, not different participants on a work.
 * @param {ReturnType<typeof buildCreditsArchive>['entries']} entries
 */
export function selectCreditsArchive(entries, { query = '', creator = '', collaborator='',workType='',artist = '', role = '', year = '', sort = 'newest' } = {}) {
  return entries.filter(entry => archiveMatches(entry, query) && (!artist || entry.artists.some(ref => ref.id === artist))
    && (!workType || entry.entityType===workType) && (!collaborator || collaborator!==creator && entry.credits.some(credit=>credit.key===collaborator))
    && (!year || (year === 'unknown' ? !entry.year : entry.year === year))
    && entry.credits.some(credit => (!creator || credit.key === creator) && (!role || credit.role === role)))
    .sort((a, b) => compareArchiveRecords(a, b, sort));
}
