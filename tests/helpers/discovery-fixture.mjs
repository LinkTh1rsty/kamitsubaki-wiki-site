import { buildDiscoveryCatalog } from '../../src/lib/discoveryCatalog.mjs';
import { entityEdges } from '../../src/lib/entityModel.mjs';

export function fixtureCatalog(locale = 'zh', articles) {
  const data = [
    { id: 'kaf', entityType: 'virtual-avatar', name: '花譜', romanizedName: 'KAF', aliases: ['花谱'], lifecycle: { startedAt: '2018' }, relations: [{ type: 'member-of', target: 'group' }], tags: ['artist-tag'] },
    { id: 'rim', entityType: 'virtual-avatar', name: '理芽', romanizedName: 'RIM', relations: [{ type: 'member-of', target: 'group' }] },
    { id: 'group', entityType: 'unit', name: 'Group' },
    { id: 'song-a', entityType: 'work-track', title: 'A', releaseDate: '2020', performers: [{ entity: 'kaf', role: 'lead-vocal' }], genres: ['ballad'], credits: [{ name: 'Guiano', role: 'composer' }] },
    { id: 'song-b', entityType: 'work-track', title: 'B', releaseDate: '2021-04', performers: [{ entity: 'rim', role: 'lead-vocal' }, { entity: 'kaf', role: 'guest-vocal' }] },
    { id: 'song-undated', entityType: 'work-track', title: 'No date', performers: [{ entity: 'kaf', role: 'lead-vocal' }] },
    { id: 'release', entityType: 'work-release', title: 'Release', releaseDate: '2020', primaryArtist: 'kaf', tracks: [{ songId: 'song-a' }, { songId: 'song-b' }] },
    { id: 'live', entityType: 'live-event', name: 'Live', dateRange: { start: '2020', end: '2022' }, headliners: ['kaf'], guestPerformers: ['rim'] },
    { id: 'other', entityType: 'lore-concept', name: 'Unconnected' },
    { id: 'stub', entityType: 'work-track', title: 'Stub', contentStatus: 'stub', performers: [{ entity: 'kaf' }] },
    { id: 'dangling', entityType: 'project', name: 'Dangling', relations: [{ type: 'related-project', target: 'missing' }] },
  ];
  const entities = new Map(data.map(d => [d.id, new Map(['zh', 'en', 'ja'].map(code => [code, { data: { ...d, locale: code, schemaVersion: 2 }, filePath: 'PRIVATE_PATH', body: 'PRIVATE_BODY' }]))]));
  const registry = { entities, list: code => data.map(d => ({ data: { ...d, locale: code }, url: '/' + code + '/database/' + d.id + '/' })),
    getOutgoingRelations: id => entityEdges(data.find(d => d.id === id)) };
  const feature = { events: [{ id: 'event', date: { start: '2021-03-20' }, text: { zh: { title: '花譜事件' }, en: { title: 'KAF event' } }, related: [{ entity: 'kaf' }, { entity: 'rim' }] }] };
  return buildDiscoveryCatalog(registry, feature, locale, articles);
}
