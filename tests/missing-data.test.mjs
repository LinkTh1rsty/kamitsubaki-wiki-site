import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildContentIndex,
  dedupeIssues,
  detectEntryIssues,
  summarizeIssues,
} from '../src/lib/missingData.mjs';
import { computeCompleteness } from '../src/lib/entryCompleteness.mjs';

function songEntry(id, data) {
  return { id, data };
}

function albumEntry(id, data) {
  return { id, data };
}

function artistEntry(id, data) {
  return {
    id,
    data: {
      translationKey: id.split('/')[0],
      name: 'Test Artist',
      romanizedName: 'Test',
      contentStatus: 'published',
      ...data,
    },
  };
}

function completeSongData(overrides = {}) {
  return {
    locale: 'zh',
    title: 'Quiz',
    artist: '花譜',
    artistId: 'kaf',
    image: '/images/songs/kaf/quiz.jpg',
    releaseDate: '2019-01-01',
    composer: 'Composer',
    lyricist: 'Lyricist',
    lyricsSources: [{ label: 'Official', href: 'https://example.com', provider: 'official', checkedAt: '2026-01-01' }],
    album: '観測',
    duration: '03:30',
    code: 'code-quiz',
    categoryTitle: '原创',
    ...overrides,
  };
}

function completeAlbumData(overrides = {}) {
  return {
    locale: 'zh',
    title: '観測',
    artist: '花譜',
    image: '/images/albums/kaf/kansoku.jpg',
    releaseDate: '2019-09-11',
    tracks: [{ number: '1', title: 'Quiz', songId: 'kaf/originals/quiz' }],
    type: 'Album',
    label: 'KAMITSUBAKI RECORD',
    catalogNumber: 'ANTCD-1',
    trackCount: 1,
    description: 'description',
    romanizedTitle: 'Kansoku',
    officialLinks: [{ label: 'Official', href: 'https://example.com' }],
    ...overrides,
  };
}

function completeArtistData(overrides = {}) {
  return {
    locale: 'zh',
    translationKey: 'kaf',
    name: '花譜',
    romanizedName: 'KAF',
    contentStatus: 'published',
    image: '/images/artists/kaf.jpg',
    statusLabel: 'STATUS',
    status: 'ACTIVE',
    profileTagline: 'tagline',
    officialLinks: [{ label: 'Official', href: 'https://example.com' }],
    debutDate: '2018-10-18',
    meta: 'meta',
    affiliations: ['V.W.P'],
    designCredits: ['PALOW.'],
    featuredEntries: [{ label: 'V.W.P', href: '/zh/artists/vwp/vwp', kind: 'artist' }],
    categoryTitle: '虚拟世代',
    ...overrides,
  };
}

function buildHappyIndex() {
  return buildContentIndex({
    songs: [
      songEntry('kaf/originals/quiz/zh', completeSongData()),
      songEntry('kaf/originals/quiz/ja', completeSongData({ locale: 'ja' })),
      songEntry('kaf/originals/quiz/en', completeSongData({ locale: 'en' })),
    ],
    albums: [
      albumEntry('kaf/kansoku/zh', completeAlbumData()),
      albumEntry('kaf/kansoku/ja', completeAlbumData({ locale: 'ja' })),
      albumEntry('kaf/kansoku/en', completeAlbumData({ locale: 'en' })),
    ],
    artists: [
      artistEntry('vwp/kaf/zh', completeArtistData()),
      artistEntry('vwp/kaf/ja', completeArtistData({ locale: 'ja' })),
      artistEntry('vwp/kaf/en', completeArtistData({ locale: 'en' })),
    ],
  });
}

test('trilingual complete song produces no issues', () => {
  const index = buildHappyIndex();
  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('kaf/originals/quiz/zh', completeSongData()),
    index,
  });

  assert.deepEqual(issues, []);
  assert.deepEqual(summarizeIssues(issues), { total: 0, warnings: 0, infos: 0 });
});

test('missing ja and en produce one missing-locale issue each and ignore generated locales', () => {
  const index = buildContentIndex({
    songs: [
      songEntry('kaf/originals/quiz/zh', completeSongData()),
      songEntry('kaf/originals/quiz/zh-tw', completeSongData({ locale: 'zh-tw' })),
      songEntry('kaf/originals/quiz/zh-hk', completeSongData({ locale: 'zh-hk' })),
    ],
    albums: [],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });

  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('kaf/originals/quiz/zh', completeSongData()),
    index,
  });
  const localeIssues = issues.filter((issue) => issue.kind === 'missing-locale');

  assert.deepEqual(
    localeIssues.map((issue) => issue.refs[0]).sort(),
    ['en', 'ja'],
  );
  assert.equal(localeIssues.every((issue) => issue.severity === 'info'), true);
});

test('unknown artistId produces unknown-artist warning with unknown slugs', () => {
  const index = buildContentIndex({
    songs: [songEntry('ghost/originals/quiz/zh', completeSongData({ artistId: 'ghost', artist: 'Ghost' }))],
    albums: [],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });

  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('ghost/originals/quiz/zh', completeSongData({ artistId: 'ghost', artist: 'Ghost' })),
    index,
  });
  const issue = issues.find((item) => item.kind === 'unknown-artist');

  assert.ok(issue);
  assert.equal(issue.severity, 'warning');
  assert.deepEqual(issue.refs, ['ghost']);
});

test('album title folding matches across simplified/traditional and case differences', () => {
  const index = buildContentIndex({
    songs: [songEntry('kaf/originals/quiz/zh', completeSongData({ album: '觀測' }))],
    albums: [
      albumEntry('kaf/kansoku/zh', completeAlbumData({ title: '观测', romanizedTitle: undefined })),
    ],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });

  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('kaf/originals/quiz/zh', completeSongData({ album: '觀測' })),
    index,
  });

  assert.equal(issues.some((issue) => issue.kind === 'album-not-linked'), false);

  const unmatchedIndex = buildContentIndex({
    songs: [songEntry('kaf/originals/quiz/zh', completeSongData({ album: '不存在的专辑' }))],
    albums: [albumEntry('kaf/kansoku/zh', completeAlbumData())],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });
  const unmatched = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('kaf/originals/quiz/zh', completeSongData({ album: '不存在的专辑' })),
    index: unmatchedIndex,
  });
  const albumIssue = unmatched.find((issue) => issue.kind === 'album-not-linked');

  assert.ok(albumIssue);
  assert.equal(albumIssue.severity, 'info');
  assert.deepEqual(albumIssue.refs, ['不存在的专辑']);
});

test('album track songId gaps warn once per unique missing id and unlinked tracks are info', () => {
  const index = buildContentIndex({
    songs: [songEntry('kaf/originals/quiz/zh', completeSongData())],
    albums: [
      albumEntry('kaf/broken/zh', completeAlbumData({
        title: 'Broken',
        tracks: [
          { number: '1', title: 'A', songId: 'kaf/originals/missing-a' },
          { number: '2', title: 'B', songId: 'kaf/originals/missing-a' },
          { number: '3', title: 'C', songId: 'kaf/originals/quiz' },
        ],
      })),
      albumEntry('kaf/unlinked/zh', completeAlbumData({
        title: 'Unlinked',
        tracks: [
          { number: '1', title: 'Only title' },
          { number: '2', title: 'Another title' },
        ],
      })),
    ],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });

  const broken = detectEntryIssues({
    collection: 'albums',
    entry: albumEntry('kaf/broken/zh', completeAlbumData({
      title: 'Broken',
      tracks: [
        { number: '1', title: 'A', songId: 'kaf/originals/missing-a' },
        { number: '2', title: 'B', songId: 'kaf/originals/missing-a' },
        { number: '3', title: 'C', songId: 'kaf/originals/quiz' },
      ],
    })),
    index,
  });
  const missingIssue = broken.find((issue) => issue.kind === 'track-song-missing');

  assert.ok(missingIssue);
  assert.equal(missingIssue.severity, 'warning');
  assert.deepEqual(missingIssue.refs, ['kaf/originals/missing-a']);

  const unlinked = detectEntryIssues({
    collection: 'albums',
    entry: albumEntry('kaf/unlinked/zh', completeAlbumData({
      title: 'Unlinked',
      tracks: [
        { number: '1', title: 'Only title' },
        { number: '2', title: 'Another title' },
      ],
    })),
    index,
  });

  assert.ok(unlinked.some((issue) => issue.kind === 'tracks-unlinked'));
  assert.equal(unlinked.some((issue) => issue.kind === 'track-song-missing'), false);
});

test('missing-fields refs pass through computeCompleteness and empty body is optional', () => {
  const index = buildHappyIndex();
  const sparse = completeSongData({
    image: undefined,
    releaseDate: undefined,
    composer: undefined,
    lyricist: undefined,
    lyricsSources: undefined,
  });
  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('kaf/originals/quiz/zh', sparse),
    index,
  });
  const fieldsIssue = issues.find((issue) => issue.kind === 'missing-fields');
  const expected = computeCompleteness('songs', sparse).missing.map((item) => item.field);

  assert.ok(fieldsIssue);
  assert.equal(fieldsIssue.severity, 'warning');
  assert.deepEqual(fieldsIssue.refs, expected);
  assert.equal(issues.some((issue) => issue.kind === 'thin-body'), false);
});

test('thin-body only runs when body is provided and counts stripped length', () => {
  const index = buildHappyIndex();
  const entry = songEntry('kaf/originals/quiz/zh', completeSongData());

  const withShortBody = detectEntryIssues({
    collection: 'songs',
    entry,
    index,
    body: '# Hi\n\n短。',
  });
  assert.ok(withShortBody.some((issue) => issue.kind === 'thin-body'));

  const withLongBody = detectEntryIssues({
    collection: 'songs',
    entry,
    index,
    body: `这是一段足够长的正文内容，用于通过 thin-body 检查。${'字'.repeat(40)}`,
  });
  assert.equal(withLongBody.some((issue) => issue.kind === 'thin-body'), false);
});

test('issues sort warnings before infos and summarize counts both severities', () => {
  const index = buildContentIndex({
    songs: [songEntry('ghost/originals/quiz/zh', completeSongData({ artistId: 'ghost', artist: 'Ghost', album: 'Nope', image: undefined }))],
    albums: [],
    artists: [artistEntry('vwp/kaf/zh', completeArtistData())],
  });

  const issues = detectEntryIssues({
    collection: 'songs',
    entry: songEntry('ghost/originals/quiz/zh', completeSongData({ artistId: 'ghost', artist: 'Ghost', album: 'Nope', image: undefined })),
    index,
  });

  assert.ok(issues.length >= 2);
  assert.equal(issues[0].severity, 'warning');
  assert.equal(issues.some((issue) => issue.severity === 'info'), true);

  const summary = summarizeIssues(issues);
  assert.equal(summary.total, issues.length);
  assert.equal(summary.warnings, issues.filter((issue) => issue.severity === 'warning').length);
  assert.equal(summary.infos, issues.filter((issue) => issue.severity === 'info').length);
});

test('dedupeIssues removes duplicate kind+refs pairs', () => {
  const merged = dedupeIssues([
    { kind: 'missing-locale', severity: 'info', refs: ['ja'] },
    { kind: 'missing-locale', severity: 'info', refs: ['ja'] },
    { kind: 'missing-fields', severity: 'warning', refs: ['image'] },
  ]);

  assert.deepEqual(merged.map((issue) => issue.kind), ['missing-fields', 'missing-locale']);
});
