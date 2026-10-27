import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import {
  DATABASE_COLLECTIONS,
  collectDatabaseFacets,
  filterDatabaseRecords,
  sortDatabaseRecords,
  matchesDatabaseRecord,
  readDatabaseQuery,
  toDatabaseRecord,
  writeDatabaseQuery,
} from '../src/lib/databaseBrowse.mjs';

const peopleById = new Map([
  ['kaf', { id: 'kaf', entityType: 'virtual-avatar', name: '花譜', romanizedName: 'KAF' }],
  ['rim', { id: 'rim', entityType: 'virtual-avatar', name: '理芽', romanizedName: 'RIM' }],
  ['composer', { id: 'composer', entityType: 'person', name: '制作人', romanizedName: 'Composer' }],
]);
const projectsById = new Map([
  ['city', { id: 'city', entityType: 'project', title: '神椿市建设中。', romanizedTitle: 'Kamitsubaki City' }],
  ['game', { id: 'game', entityType: 'project', title: '协奏中。', romanizedTitle: 'Ensemble' }],
]);
const indexes = { peopleById, projectsById };

function entry(data, url = `/zh/database/test/${data.id}/`) {
  return { data, url };
}

function track(overrides = {}) {
  return toDatabaseRecord(entry({
    id: 'witch', entityType: 'work-track', title: '魔女', romanizedTitle: 'Witch',
    summary: '快乐的日子', releaseDate: '2023-04-01',
    performers: [{ entity: 'kaf', role: 'lead-vocal' }],
    credits: [{ entity: 'composer', role: 'composer' }, { name: 'External Producer', role: 'producer' }],
    genres: ['art-pop', 'electronic'],
    relations: [{ type: 'theme-song-for', target: 'city' }],
    ...overrides,
  }), 'zh', indexes);
}

test('database normalization excludes editorial articles and gives each entity one collection', () => {
  const types = [
    ['person', 'people'], ['virtual-avatar', 'people'], ['unit', 'people'],
    ['software-voice', 'isotopes'], ['work-track', 'music'], ['work-release', 'music'],
    ['project', 'projects'], ['live-event', 'lives'], ['organization', 'organizations'], ['lore-concept', 'lore'],
  ];
  for (const [type, collection] of types) {
    const record = toDatabaseRecord(entry({ id: type, entityType: type, name: type }), 'zh');
    assert.equal(record.collection, collection);
    assert.equal(record.type, type);
  }
  assert.equal(toDatabaseRecord(entry({ id: 'essay', entityType: 'editorial-article', title: 'Essay' }), 'zh'), null);
  assert.equal(toDatabaseRecord(null), null);
  assert.equal(new Set(types.map(([, collection]) => collection)).size, DATABASE_COLLECTIONS.length);
});

test('normalization preserves registry URLs, resolved labels, image and authored artist/project links', () => {
  const source = entry({
    id: 'release', entityType: 'work-release', title: '  Album  ', primaryArtist: 'kaf',
    releaseDate: '2020', presentation: { image: '/assets/release.webp' },
    relations: [{ type: 'related-project', target: 'city' }, { type: 'affiliated-with', target: 'studio' }],
  }, '/ja/database/music/albums/release/');
  const record = toDatabaseRecord(source, 'ja', { ...indexes, relatedProjectIds: ['game', 'city'] });
  assert.equal(record.title, 'Album');
  assert.equal(record.url, '/ja/database/music/albums/release/');
  assert.equal(record.image, '/assets/release.webp');
  assert.deepEqual(record.artistIds, ['kaf']);
  assert.deepEqual(record.artistNames, ['花譜']);
  assert.deepEqual(record.projectIds, ['city', 'game']);
  assert.deepEqual(record.projectNames, ['神椿市建设中。', '协奏中。']);
  assert.equal(matchesDatabaseRecord(record, { q: 'kaf ensemble' }), true);
  assert.deepEqual(source.data.relations, [
    { type: 'related-project', target: 'city' }, { type: 'affiliated-with', target: 'studio' },
  ], 'normalization does not mutate authored data');
});

test('a canonical registry URL is required rather than inventing a client-side classification route', () => {
  const record = toDatabaseRecord({ data: {
    id: 'member', entityType: 'virtual-avatar', name: 'Member',
    classification: { primary: 'groups', group: 'vwp' },
  } }, 'en');
  assert.equal(record, null);
  const canonical = toDatabaseRecord(entry({
    id: 'member', entityType: 'virtual-avatar', name: 'Member',
  }, '/en/database/artists/groups/vwp/members/member/'), 'en');
  assert.equal(canonical.url, '/en/database/artists/groups/vwp/members/member/');
});

test('the complete browser bundle has no externalized Node built-ins', async () => {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    build: {
      write: false,
      minify: false,
      lib: { entry: fileURLToPath(new URL('../src/lib/databaseBrowse.mjs', import.meta.url)), formats: ['es'] },
    },
  });
  const bundles = (Array.isArray(result) ? result : [result]).flatMap(bundle => bundle.output);
  const chunks = bundles.filter(bundle => bundle.type === 'chunk');
  assert.ok(chunks.length > 0);
  for (const chunk of chunks) {
    assert.doesNotMatch(chunk.code, /__vite-browser-external|node:fs|node:path/u);
  }
});

test('Artist includes the person themselves, primary artist, performers, linked creators and live guests', () => {
  const song = track({
    primaryArtist: 'kaf',
    performers: [{ entity: 'kaf', role: 'lead-vocal' }, { entity: 'rim', role: 'guest-vocal' }],
    credits: [{ entity: 'composer', role: 'composer' }, { entity: 'missing', role: 'arranger' }],
  });
  assert.deepEqual(song.artistIds, ['kaf', 'rim', 'composer']);
  const live = toDatabaseRecord(entry({
    id: 'live', entityType: 'live-event', title: 'Live',
    headliners: ['kaf'], guestPerformers: ['rim', 'kaf'],
  }), 'zh', indexes);
  assert.deepEqual(live.artistIds, ['kaf', 'rim']);
  const person = toDatabaseRecord(entry(peopleById.get('kaf')), 'zh', indexes);
  assert.deepEqual(person.artistIds, ['kaf']);
  assert.equal(matchesDatabaseRecord(person, { artist: 'kaf' }), true);
  assert.equal(matchesDatabaseRecord(live, { artist: 'composer' }), false);
});

test('Project uses explicit links only and includes the project itself', () => {
  const lore = toDatabaseRecord(entry({
    id: 'resident', entityType: 'lore-concept', name: 'Resident',
    belongToUniverse: 'city', summary: 'Ensemble game mentioned in prose',
  }), 'zh', indexes);
  assert.deepEqual(lore.projectIds, ['city']);
  assert.equal(matchesDatabaseRecord(lore, { project: 'game' }), false);
  const project = toDatabaseRecord(entry(projectsById.get('city')), 'zh', indexes);
  assert.deepEqual(project.projectIds, ['city']);
  assert.equal(matchesDatabaseRecord(project, { project: 'city' }), true);
  const unlinked = track({ relations: [], summary: '神椿市建设中。' });
  assert.deepEqual(unlinked.projectIds, []);
});

test('unresolved authored artists remain searchable but cannot invent an Artist filter option', () => {
  const record = toDatabaseRecord(entry({
    id: 'old-release', entityType: 'work-release', title: 'Release', primaryArtist: 'musical-isotope',
    performers: [{ entity: 'missing-performer', role: 'vocal' }],
    credits: [{ entity: 'missing-creator', role: 'producer' }],
  }), 'zh', indexes);
  assert.deepEqual(record.artistIds, []);
  assert.deepEqual(collectDatabaseFacets([record]).artists, []);
  assert.equal(matchesDatabaseRecord(record, { q: 'musical-isotope' }), true);
  assert.equal(matchesDatabaseRecord(record, { artist: 'musical-isotope' }), false);
  assert.equal(record.year, null);
  assert.equal(record.image, '');
  assert.deepEqual(record.genres, []);
  assert.deepEqual(record.projectIds, []);
});

test('Year uses authored release, event, activity or first engine dates and keeps unknown years', () => {
  assert.equal(track().year, '2023');
  assert.equal(toDatabaseRecord(entry({ id: 'live', entityType: 'live-event', title: 'Live', dateRange: { start: '2022-12', end: '2023-01' } })).year, '2022');
  assert.equal(toDatabaseRecord(entry({ id: 'person', entityType: 'person', name: 'Person', lifecycle: { startedAt: '2018', endedAt: '2021' } })).year, '2018');
  assert.equal(toDatabaseRecord(entry({ id: 'voice', entityType: 'software-voice', name: 'Voice', voiceEngines: [{ releaseDate: '2025' }, { releaseDate: '2021-03-01' }] })).year, '2021');
  const unknown = track({ releaseDate: undefined, summary: 'A song discussed in 2019' });
  assert.equal(unknown.year, null);
  assert.equal(matchesDatabaseRecord(unknown, { year: 'unknown' }), true);
  assert.equal(matchesDatabaseRecord(unknown, { year: '2019' }), false);
  assert.equal(matchesDatabaseRecord(track(), { year: 'unknown' }), false);
});

test('all filters compose independently with CJK, case, and multi-token search folding', () => {
  const song = track();
  const combined = { q: 'KAF 快樂', type: 'work-track', collection: 'music', artist: 'composer', year: '2023', genre: 'art-pop', project: 'city' };
  assert.equal(matchesDatabaseRecord(song, combined), true);
  assert.equal(matchesDatabaseRecord(song, { q: 'witch external producer' }), true);
  assert.equal(matchesDatabaseRecord(song, { q: 'ＫＡＦ   魔女' }), true);
  for (const [key, value] of Object.entries({ q: 'absent', type: 'work-release', collection: 'people', artist: 'rim', year: '2022', genre: 'rock', project: 'game' })) {
    assert.equal(matchesDatabaseRecord(song, { ...combined, [key]: value }), false, `mismatch in ${key}`);
  }
  assert.deepEqual(filterDatabaseRecords([song, track({ id: 'other', title: 'Other', performers: [{ entity: 'rim', role: 'vocal' }], credits: [] })], { artist: 'kaf' }), [song]);
});

test('facets come from records, deduplicate multi-links, and label IDs without counting them twice', () => {
  const records = [track(), track({ id: 'another', genres: ['art-pop'], releaseDate: '2021', relations: [] }), track({ id: 'unknown', releaseDate: undefined, genres: [] })];
  const facets = collectDatabaseFacets([...records, null]);
  assert.deepEqual(facets.types, ['work-track']);
  assert.deepEqual(facets.collections, ['music']);
  assert.deepEqual(facets.years, ['2023', '2021']);
  assert.equal(facets.hasUnknownYear, true);
  assert.deepEqual(facets.genres, ['art-pop', 'electronic']);
  assert.equal(facets.artists.filter(artist => artist.id === 'kaf').length, 1);
  assert.equal(facets.artists.find(artist => artist.id === 'kaf').label, '花譜');
  assert.deepEqual(facets.projects, [{ id: 'city', label: '神椿市建设中。' }]);
  assert.equal(collectDatabaseFacets([]).hasUnknownYear, false);
});

test('query state round-trips every filter and List view while retaining legacy section and unrelated params', () => {
  const records = [track(), track({ id: 'unknown', releaseDate: undefined })];
  const facets = collectDatabaseFacets(records);
  const state = { q: '魔女 & KAF', type: 'work-track', artist: 'kaf', year: 'unknown', genre: 'art-pop', project: 'city', collection: 'music', view: 'list', sort: 'newest' };
  const params = writeDatabaseQuery(state, '?section=city-project&from=home');
  assert.equal(params.get('section'), 'city-project');
  assert.equal(params.get('from'), 'home');
  assert.deepEqual(readDatabaseQuery(`?${params}`, facets), state);
  assert.equal(readDatabaseQuery(params, facets).q, '魔女 & KAF');
  assert.deepEqual(readDatabaseQuery(writeDatabaseQuery({ view: 'grid' }, params), facets), readDatabaseQuery('', facets));
  assert.equal(writeDatabaseQuery({}, params).get('section'), 'city-project');
  assert.equal(writeDatabaseQuery({ view: 'grid' }).has('view'), false);
  assert.equal(writeDatabaseQuery({ q: '  ' }).has('q'), false);
});

test('query restoration discards stale facets and invalid views but preserves ordinary search text', () => {
  const facets = collectDatabaseFacets([track()]);
  assert.deepEqual(readDatabaseQuery('?q=%E9%AD%94%E5%A5%B3&type=invalid&artist=missing&year=unknown&genre=absent&project=unknown&collection=bogus&view=tiles', facets), {
    q: '魔女', type: '', artist: '', year: '', genre: '', project: '', collection: '', view: 'grid', sort: 'catalog',
  });
  assert.equal(readDatabaseQuery('?year=2023&view=list', facets).year, '2023');
  assert.equal(readDatabaseQuery('?year=2023&view=list', facets).view, 'list');
});

test('recorded years sort in either direction with unknown years last and no input mutation',()=>{
  const rows=[{id:'unknown',title:'A',year:null},{id:'new',title:'B',year:'2026'},{id:'old',title:'C',year:'2018'}];
  assert.deepEqual(sortDatabaseRecords(rows,'newest','en').map(row=>row.id),['new','old','unknown']);
  assert.deepEqual(sortDatabaseRecords(rows,'oldest','en').map(row=>row.id),['old','new','unknown']);
  assert.deepEqual(sortDatabaseRecords(rows,'title','en').map(row=>row.id),['unknown','new','old']);
  assert.deepEqual(rows.map(row=>row.id),['unknown','new','old']);
  assert.equal(readDatabaseQuery('?sort=invalid').sort,'catalog');
});
