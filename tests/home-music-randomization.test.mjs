import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { buildHomeMusicCatalog, sampleRandom } from '../src/lib/homeMusicCatalog.mjs';

test('homepage music sampling returns five unique entries without mutating the catalog', () => {
  const entries = Array.from({ length: 10 }, (_, index) => ({ id: index }));
  const original = structuredClone(entries);
  const values = [0.91, 0.12, 0.74, 0.33, 0.58];
  let cursor = 0;
  const sample = sampleRandom(entries, 5, () => values[cursor++]);

  assert.equal(sample.length, 5);
  assert.equal(new Set(sample.map((entry) => entry.id)).size, 5);
  assert.deepEqual(entries, original);
});

test('homepage music catalog prefers entry artwork and falls back to artist artwork', () => {
  const artists = [
    {
      id: 'vwp/kaf/zh',
      data: { translationKey: 'kaf', image: '/artists/kaf.webp' },
    },
  ];
  const songs = [
    {
      id: 'kaf/originals/example/zh',
      data: { title: 'Example', artist: '花譜', artistId: 'kaf', album: 'Album' },
    },
    {
      id: 'kaf/originals/covered/zh',
      data: { title: 'Covered', artist: '花譜', artistId: 'kaf', image: '/songs/covered.webp' },
    },
  ];
  const albums = [
    {
      id: 'kaf/example/zh',
      data: { title: 'Example Album', artist: '花譜', type: 'Album', releaseDate: '2026-01-01' },
    },
  ];

  const catalog = buildHomeMusicCatalog(songs, albums, artists, 'zh');

  assert.equal(catalog.songs[0].image, '/artists/kaf.webp');
  assert.equal(catalog.songs[1].image, '/songs/covered.webp');
  assert.equal(catalog.albums[0].image, '/artists/kaf.webp');
  assert.equal(catalog.songs[0].subtitle, '花譜 · Album');
  assert.equal(catalog.albums[0].href, '/zh/albums/kaf/example');
});

test('homepage rhythm and album lists render covers and randomize from a local catalog on every entry', async () => {
  const [page, songs, albums, randomizer, endpoint] = await Promise.all([
    readFile(new URL('../src/pages/[locale]/index.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/SongsSection.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AlbumsSection.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/homeMusicRandomizer.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/[locale]/home-catalog.json.ts', import.meta.url), 'utf8'),
  ]);

  assert.match(page, /sampleRandom\(homeMusicCatalog\.songs,\s*5\)/);
  assert.match(page, /sampleRandom\(homeMusicCatalog\.albums,\s*5\)/);
  assert.match(page, /initializeHomeMusicRandomizer/);
  assert.doesNotMatch(page, /\.slice\(0,\s*4\)/);

  for (const component of [songs, albums]) {
    assert.match(component, />COVER</);
    assert.doesNotMatch(component, />CODE</);
    assert.match(component, /data-home-music-list/);
    assert.match(component, /data-home-music-image/);
  }

  assert.match(randomizer, /fetch\(url/);
  assert.match(randomizer, /sampleRandom\([^,]+,\s*5\)/);
  assert.match(randomizer, /pageshow/);
  assert.match(endpoint, /getCollection\('songs'\)/);
  assert.match(endpoint, /getCollection\('albums'\)/);
});
