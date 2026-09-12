import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMPLETENESS_RULES,
  completenessTier,
  computeCompleteness,
} from '../src/lib/entryCompleteness.mjs';

const fullSongsData = {
  title: 'Demo',
  artist: 'Artist',
  artistId: 'artist',
  image: '/images/songs/demo.webp',
  releaseDate: '2024-01-01',
  composer: 'Composer',
  lyricist: 'Lyricist',
  lyricsSources: [{ label: 'Official', href: 'https://example.com', provider: 'official', checkedAt: '2024-01-01' }],
  album: 'Album',
  duration: '03:30',
  code: 'S001',
  categoryTitle: 'Originals',
};

const fullAlbumsData = {
  title: 'Demo Album',
  artist: 'Artist',
  image: '/images/albums/demo.webp',
  releaseDate: '2024-01-01',
  tracks: [{ title: 'Track 1' }],
  type: 'Album',
  label: 'Label',
  catalogNumber: 'KAF-001',
  trackCount: 1,
  description: 'A demo album.',
  romanizedTitle: 'Demo Album',
  officialLinks: [{ label: 'Site', href: 'https://example.com' }],
};

const fullArtistsData = {
  name: '花譜',
  romanizedName: 'KAF',
  statusLabel: 'STATUS',
  status: 'ACTIVE',
  image: '/images/artists/kaf.jpg',
  profileTagline: 'Virtual singer.',
  officialLinks: [{ label: 'Official', href: 'https://example.com' }],
  debutDate: '2018-10-18',
  meta: 'DEBUT: 2018.10.18',
  affiliations: ['KAMITSUBAKI STUDIO'],
  designCredits: ['角色设计：PALOW.'],
  featuredEntries: [{ label: 'V.W.P', href: '/zh/artists/vwp/vwp', kind: 'artist' }],
  categoryTitle: '虚拟世代',
};

test('full optional field set scores 100 for songs, albums, and artists', () => {
  assert.equal(computeCompleteness('songs', fullSongsData).score, 100);
  assert.equal(computeCompleteness('albums', fullAlbumsData).score, 100);
  assert.equal(computeCompleteness('artists', fullArtistsData).score, 100);
});

test('missing optional fields score 0 and list every field', () => {
  const song = computeCompleteness('songs', {
    title: 'Demo',
    artist: 'Artist',
    artistId: 'artist',
  });
  assert.equal(song.score, 0);
  assert.equal(song.earned, 0);
  assert.equal(song.missing.length, COMPLETENESS_RULES.songs.length);

  const artist = computeCompleteness('artists', {
    name: '花譜',
    romanizedName: 'KAF',
    statusLabel: 'STATUS',
    status: 'ACTIVE',
    image: '/images/artists/kaf.jpg',
  });
  assert.equal(artist.score, 0);
});

test('empty arrays count as missing', () => {
  const result = computeCompleteness('songs', {
    ...fullSongsData,
    lyricsSources: [],
  });
  assert.ok(result.missing.some((item) => item.field === 'lyricsSources'));
  assert.equal(result.score, Math.round(((result.total - 2) / result.total) * 100));

  const artist = computeCompleteness('artists', {
    ...fullArtistsData,
    officialLinks: [],
    affiliations: [],
  });
  assert.ok(artist.missing.some((item) => item.field === 'officialLinks'));
  assert.ok(artist.missing.some((item) => item.field === 'affiliations'));
});

test('empty strings count as missing for scalar fields', () => {
  const result = computeCompleteness('songs', {
    ...fullSongsData,
    composer: '   ',
    album: '',
  });
  assert.ok(result.missing.some((item) => item.field === 'composer'));
  assert.ok(result.missing.some((item) => item.field === 'album'));
});

test('artists with contentStatus stub are capped at score 29', () => {
  const result = computeCompleteness('artists', {
    ...fullArtistsData,
    contentStatus: 'stub',
  });
  assert.equal(result.score, 29);
  assert.equal(completenessTier(result.score), 'stub');

  const partial = computeCompleteness('artists', {
    ...fullArtistsData,
    contentStatus: 'stub',
    officialLinks: undefined,
    profileTagline: undefined,
  });
  assert.equal(partial.score, 29);
  assert.ok(partial.missing.some((item) => item.field === 'officialLinks'));
  assert.ok(partial.missing.some((item) => item.field === 'profileTagline'));
});

test('missing list is sorted by weight descending', () => {
  const result = computeCompleteness('songs', {
    title: 'Demo',
    artist: 'Artist',
    artistId: 'artist',
  });
  for (let i = 1; i < result.missing.length; i += 1) {
    assert.ok(result.missing[i - 1].weight >= result.missing[i].weight);
  }
  assert.equal(result.missing[0].weight, 2);
});

test('unknown collection throws an Error that includes the collection name', () => {
  assert.throws(
    () => computeCompleteness('projects', {}),
    (error) => {
      assert.ok(error instanceof Error);
      assert.match(error.message, /projects/);
      return true;
    },
  );
});

test('tier boundaries: 90 complete, 60 good, 30 brief, below 30 stub', () => {
  assert.equal(completenessTier(100), 'complete');
  assert.equal(completenessTier(90), 'complete');
  assert.equal(completenessTier(89), 'good');
  assert.equal(completenessTier(60), 'good');
  assert.equal(completenessTier(59), 'brief');
  assert.equal(completenessTier(30), 'brief');
  assert.equal(completenessTier(29), 'stub');
  assert.equal(completenessTier(0), 'stub');
});

test('score is Math.round(earned / total * 100)', () => {
  // songs total weight = 14; drop weight-2 image and weight-1 album → earned 11
  const result = computeCompleteness('songs', {
    ...fullSongsData,
    image: undefined,
    album: undefined,
  });
  assert.equal(result.earned, 11);
  assert.equal(result.total, 14);
  assert.equal(result.score, Math.round((11 / 14) * 100));
});

test('COMPLETENESS_RULES is exported and covers the three collections', () => {
  assert.deepEqual(Object.keys(COMPLETENESS_RULES).sort(), ['albums', 'artists', 'songs']);
  assert.ok(COMPLETENESS_RULES.songs.every((rule) => typeof rule.field === 'string' && typeof rule.weight === 'number'));
});
