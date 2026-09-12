import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { foldCjkSearchText } from '../src/lib/cjkSearch.mjs';
import {
  ALBUM_ALL,
  SORT_MODES,
  YEAR_ALL,
  YEAR_UNKNOWN,
  buildSongFilterState,
  collectFilterAlbums,
  collectFilterTypes,
  collectFilterYears,
  collectUniqueFilterValues,
  createSongComparator,
  decodeFilterHash,
  encodeFilterHash,
  extractYearFromDate,
  matchesSongFilter,
  normalizeCategorySelection,
} from '../src/lib/catalogFilter.mjs';

function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('extractYearFromDate handles YYYY, YYYY-MM, YYYY-MM-DD, and missing values', () => {
  assert.equal(extractYearFromDate('2023'), '2023');
  assert.equal(extractYearFromDate('2023-04'), '2023');
  assert.equal(extractYearFromDate('2023-04-01'), '2023');
  assert.equal(extractYearFromDate(' 2021-12-31 '), '2021');
  assert.equal(extractYearFromDate(undefined), null);
  assert.equal(extractYearFromDate(null), null);
  assert.equal(extractYearFromDate(''), null);
  assert.equal(extractYearFromDate('unknown'), null);
});

test('collectFilterYears returns descending unique years and flags unknown dates', () => {
  const result = collectFilterYears([
    { releaseDate: '2020-01-01' },
    { releaseDate: '2023' },
    { releaseDate: '2020-12' },
    { releaseDate: undefined },
  ]);

  assert.deepEqual(result.years, ['2023', '2020']);
  assert.equal(result.hasUnknown, true);
});

test('collectFilterAlbums deduplicates, trims, and sorts by name', () => {
  const albums = collectFilterAlbums([
    { album: 'Beta' },
    { album: 'Alpha' },
    { album: ' Beta ' },
    { album: '' },
    { album: undefined },
    {},
  ]);

  assert.deepEqual(albums, ['Alpha', 'Beta']);
});

test('normalizeCategorySelection treats null as all and empty array as none', () => {
  const categories = ['originals', 'covers'];

  assert.deepEqual([...normalizeCategorySelection(categories, null)].sort(), ['covers', 'originals']);
  assert.deepEqual([...normalizeCategorySelection(categories, ['covers'])], ['covers']);
  assert.deepEqual([...normalizeCategorySelection(categories, [])], []);
  assert.deepEqual([...normalizeCategorySelection(categories, ['covers', 'nope'])], ['covers']);
});

test('matchesSongFilter folds CJK keywords against title, album, composer, and lyricist', () => {
  const song = {
    searchText: [
      foldCjkSearchText('魔女'),
      foldCjkSearchText('快樂的日子'),
      foldCjkSearchText('メカクシ'),
      foldCjkSearchText('KAF'),
    ].join(' '),
    category: 'originals',
    year: '2020',
    album: '魔女',
  };

  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('魔女') }), true);
  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('快樂') }), true);
  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('快乐') }), true);
  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('めかくし') }), true);
  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('kaf') }), true);
  assert.equal(matchesSongFilter(song, { query: foldCjkSearchText('不存在') }), false);
});

test('matchesSongFilter combines category, year, album, and missing-field rules', () => {
  const song = {
    searchText: 'alpha',
    category: 'covers',
    year: '2021',
    album: 'Collection',
  };

  assert.equal(matchesSongFilter(song, { categories: new Set(['covers', 'originals']) }), true);
  assert.equal(matchesSongFilter(song, { categories: new Set(['originals']) }), false);
  assert.equal(matchesSongFilter(song, { hideAll: true }), false);
  assert.equal(matchesSongFilter(song, { year: '2021' }), true);
  assert.equal(matchesSongFilter(song, { year: '2020' }), false);
  assert.equal(matchesSongFilter(song, { year: YEAR_UNKNOWN }), false);
  assert.equal(matchesSongFilter(song, { album: 'Collection' }), true);
  assert.equal(matchesSongFilter(song, { album: 'Other' }), false);

  const missingFields = {
    searchText: '',
    category: 'originals',
    year: null,
    album: '',
  };
  assert.equal(matchesSongFilter(missingFields, { year: YEAR_UNKNOWN }), true);
  assert.equal(matchesSongFilter(missingFields, { album: 'Collection' }), false);
  assert.equal(matchesSongFilter(missingFields, { year: YEAR_ALL, album: ALBUM_ALL }), true);
});

test('buildSongFilterState maps empty category selection to hideAll', () => {
  const state = buildSongFilterState({
    categories: ['originals', 'covers'],
    albums: ['A'],
    years: ['2020'],
    hasUnknown: true,
  });
  assert.equal(state.isAllCategories, true);
  assert.equal(state.hideAll, false);

  const noneSelected = buildSongFilterState({
    cat: [],
    categories: ['originals', 'covers'],
  });
  assert.equal(noneSelected.hideAll, true);
  assert.equal(matchesSongFilter({ searchText: 'x', category: 'originals', year: '2020', album: 'A' }, noneSelected), false);

  const partial = buildSongFilterState({
    cat: ['covers'],
    categories: ['originals', 'covers'],
  });
  assert.equal(partial.isAllCategories, false);
  assert.equal(partial.hideAll, false);
  assert.equal(matchesSongFilter({ searchText: 'x', category: 'covers', year: '2020', album: 'A' }, partial), true);
  assert.equal(matchesSongFilter({ searchText: 'x', category: 'originals', year: '2020', album: 'A' }, partial), false);
});

test('createSongComparator sorts by default index, date (missing last), and title', () => {
  const items = [
    { title: 'B', releaseDate: '2020-01-01', defaultIndex: 1 },
    { title: 'A', releaseDate: '2022-01-01', defaultIndex: 0 },
    { title: 'C', releaseDate: undefined, defaultIndex: 2 },
    { title: 'D', releaseDate: '2021', defaultIndex: 3 },
  ];

  const byDefault = [...items].sort(createSongComparator('default'));
  assert.deepEqual(byDefault.map((item) => item.defaultIndex), [0, 1, 2, 3]);

  const byDateDesc = [...items].sort(createSongComparator('date-desc'));
  assert.deepEqual(byDateDesc.map((item) => item.title), ['A', 'D', 'B', 'C']);

  const byDateAsc = [...items].sort(createSongComparator('date-asc'));
  assert.deepEqual(byDateAsc.map((item) => item.title), ['B', 'D', 'A', 'C']);

  const byTitle = [...items].sort(createSongComparator('title-asc', 'en'));
  assert.deepEqual(byTitle.map((item) => item.title), ['A', 'B', 'C', 'D']);

  assert.ok(SORT_MODES.includes('date-desc'));
  assert.ok(SORT_MODES.includes('title-asc'));
});

test('encodeFilterHash and decodeFilterHash round-trip valid state and ignore illegal values', () => {
  const options = {
    categories: ['originals', 'covers'],
    albums: ['Alpha', 'Beta'],
    years: ['2023', '2020'],
    hasUnknown: true,
  };

  assert.equal(encodeFilterHash({}), '');
  assert.equal(encodeFilterHash({ q: '  ', sort: 'default', year: YEAR_ALL, album: ALBUM_ALL }), '');

  const encoded = encodeFilterHash({
    q: '魔女',
    cat: ['originals'],
    year: '2023',
    album: 'Alpha',
    sort: 'date-desc',
  });

  assert.match(encoded, /^#/);
  assert.match(encoded, /q=/);
  assert.match(encoded, /cat=originals/);
  assert.match(encoded, /year=2023/);
  assert.match(encoded, /album=Alpha/);
  assert.match(encoded, /sort=date-desc/);

  const decoded = decodeFilterHash(encoded, options);
  assert.equal(decoded.q, '魔女');
  assert.deepEqual(decoded.cat, ['originals']);
  assert.equal(decoded.year, '2023');
  assert.equal(decoded.album, 'Alpha');
  assert.equal(decoded.sort, 'date-desc');

  const unknownYear = decodeFilterHash('#year=unknown', options);
  assert.equal(unknownYear.year, YEAR_UNKNOWN);

  const noUnknown = decodeFilterHash('#year=unknown', { ...options, hasUnknown: false });
  assert.equal(noUnknown.year, YEAR_ALL);

  const illegal = decodeFilterHash('#cat=nope,originals&year=1999&album=Nope&sort=evil&q=', options);
  assert.deepEqual(illegal.cat, ['originals']);
  assert.equal(illegal.year, YEAR_ALL);
  assert.equal(illegal.album, ALBUM_ALL);
  assert.equal(illegal.sort, 'default');
  assert.equal(illegal.q, '');

  assert.deepEqual(decodeFilterHash('', options), {
    q: '',
    cat: null,
    year: YEAR_ALL,
    album: ALBUM_ALL,
    sort: 'default',
  });
  assert.deepEqual(decodeFilterHash('#%%%not-valid%%%', options).sort, 'default');
});

test('artist catalog page and filter component are wired together', async () => {
  const [artistPage, filterComponent, filterLib] = await Promise.all([
    readProjectFile('../src/pages/[locale]/songs/artists/[artist].astro'),
    readProjectFile('../src/components/SongCatalogFilter.astro'),
    readProjectFile('../src/lib/catalogFilter.mjs'),
  ]);

  assert.match(artistPage, /SongCatalogFilter/);
  assert.match(artistPage, /data-song-row/);
  assert.match(artistPage, /data-search-text=/);
  assert.match(artistPage, /data-category=/);
  assert.match(artistPage, /data-default-index=/);
  assert.match(artistPage, /foldCjkSearchText/);
  assert.match(artistPage, /song-row-grid/);
  assert.match(artistPage, /data-catalog-filter-empty/);
  assert.match(artistPage, /category\.entries\.map/);

  assert.match(filterComponent, /data-song-catalog-filter/);
  assert.match(filterComponent, /foldCjkSearchText/);
  assert.match(filterComponent, /decodeFilterHash/);
  assert.match(filterComponent, /encodeFilterHash/);
  assert.match(filterComponent, /matchesSongFilter/);
  assert.match(filterComponent, /aria-live="polite"/);
  assert.match(filterComponent, /hidden/);

  assert.match(filterLib, /export function extractYearFromDate/);
  assert.match(filterLib, /export function matchesSongFilter/);
  assert.match(filterLib, /export function createSongComparator/);
  assert.match(filterLib, /export function encodeFilterHash/);
  assert.match(filterLib, /export function decodeFilterHash/);
  assert.match(filterLib, /export function collectFilterTypes/);
});

test('collectFilterTypes and collectUniqueFilterValues dedupe and sort album type labels', () => {
  const types = collectFilterTypes([
    { type: 'EP' },
    { type: 'スタジオアルバム' },
    { type: 'EP' },
    { type: '' },
    { type: undefined },
    {},
  ]);
  assert.deepEqual(types, ['EP', 'スタジオアルバム']);

  assert.deepEqual(
    collectUniqueFilterValues([{ album: 'B' }, { album: 'A' }, { album: ' B ' }], 'album'),
    ['A', 'B'],
  );
});

test('album catalog entries filter by type-as-category, year, and folded keyword', () => {
  const album = {
    searchText: [foldCjkSearchText('狂想'), foldCjkSearchText('スタジオアルバム')].join(' '),
    category: 'スタジオアルバム',
    year: '2023',
    album: '',
  };

  assert.equal(matchesSongFilter(album, { query: foldCjkSearchText('狂想') }), true);
  assert.equal(matchesSongFilter(album, { categories: new Set(['スタジオアルバム', 'EP']) }), true);
  assert.equal(matchesSongFilter(album, { categories: new Set(['EP']) }), false);
  assert.equal(matchesSongFilter(album, { year: '2023' }), true);
  assert.equal(matchesSongFilter(album, { year: YEAR_UNKNOWN }), false);

  const albumState = buildSongFilterState({
    cat: ['EP'],
    categories: ['EP', 'スタジオアルバム'],
    years: ['2023'],
    hasUnknown: false,
  });
  assert.equal(matchesSongFilter(album, albumState), false);
});

test('album artist catalog page wires AlbumCatalogFilter onto the flat card grid', async () => {
  const [albumPage, filterComponent] = await Promise.all([
    readProjectFile('../src/pages/[locale]/albums/artists/[artist].astro'),
    readProjectFile('../src/components/AlbumCatalogFilter.astro'),
  ]);

  assert.match(albumPage, /AlbumCatalogFilter/);
  assert.match(albumPage, /data-album-row/);
  assert.match(albumPage, /data-album-row-grid/);
  assert.match(albumPage, /data-search-text=/);
  assert.match(albumPage, /data-category=/);
  assert.match(albumPage, /data-default-index=/);
  assert.match(albumPage, /collectFilterTypes/);
  assert.match(albumPage, /foldCjkSearchText/);
  assert.match(albumPage, /data-album-filter-empty/);

  assert.match(filterComponent, /data-album-catalog-filter/);
  assert.match(filterComponent, /data-album-row/);
  assert.match(filterComponent, /foldCjkSearchText/);
  assert.match(filterComponent, /decodeFilterHash/);
  assert.match(filterComponent, /encodeFilterHash/);
  assert.match(filterComponent, /aria-live="polite"/);
  assert.match(filterComponent, /color-scheme: dark/);
  assert.match(filterComponent, /hidden/);
});
