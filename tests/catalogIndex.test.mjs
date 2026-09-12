import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCatalogIndex,
  summarizeCatalogIndex,
  toAlbumIndexRecord,
  toArtistIndexRecord,
  toSongIndexRecord,
} from '../src/lib/catalogIndex.mjs';

const songEntry = {
  id: 'kaf/originals/shi/zh',
  data: {
    locale: 'zh',
    translationKey: 'kaf_originals_shi',
    title: '箴',
    artist: '花譜',
    artistId: 'kaf',
    artistIds: ['kaf', 'vwp'],
    composer: 'Composer',
    lyricist: 'Lyricist',
    album: 'KALEIDO',
    releaseDate: '2020-01-01',
    duration: '03:30',
    image: '/images/songs/kaf/shi.jpg',
    code: 'S001',
  },
};

const albumEntry = {
  id: 'kaf/kaleido/zh',
  data: {
    locale: 'zh',
    translationKey: 'kaf_kaleido',
    title: 'KALEIDO',
    artist: '花譜',
    type: 'Album',
    releaseDate: '2020-04-01',
    duration: '48:00',
    image: '/images/albums/kaf/kaleido.jpg',
    trackCount: 12,
    tracks: [
      { title: '箴', songId: 'kaf/originals/shi' },
      { title: '未链接' },
    ],
  },
};

const artistEntry = {
  id: 'vwp/kaf/zh',
  data: {
    locale: 'zh',
    translationKey: 'kaf',
    name: '花譜',
    romanizedName: 'KAF',
    image: '/images/artists/kaf.jpg',
    debutDate: '2018-10-18',
    status: 'ACTIVE',
    contentStatus: 'published',
  },
};

test('toSongIndexRecord maps slim fields and localized path', () => {
  const record = toSongIndexRecord(songEntry, 'zh');
  assert.equal(record.collection, 'songs');
  assert.equal(record.key, 'kaf_originals_shi');
  assert.equal(record.path, '/zh/songs/kaf/originals/shi');
  assert.equal(record.contentPath, 'kaf/originals/shi');
  assert.equal(record.title, '箴');
  assert.equal(record.artist, '花譜');
  assert.deepEqual(record.artistIds, ['kaf', 'vwp']);
  assert.equal(record.composer, 'Composer');
  assert.equal(record.lyricist, 'Lyricist');
  assert.equal(record.album, 'KALEIDO');
  assert.equal(record.releaseDate, '2020-01-01');
  assert.equal(record.duration, '03:30');
  assert.equal(record.image, '/images/songs/kaf/shi.jpg');
  assert.equal(record.category, 'originals');
  assert.equal(record.code, 'S001');
});

test('toSongIndexRecord falls back to artistId and drops empty strings', () => {
  const record = toSongIndexRecord({
    id: 'coko/originals/fake/en',
    data: {
      title: 'fake',
      artist: 'COKO',
      artistId: 'coko',
      composer: '  ',
      album: '',
    },
  }, 'en');

  assert.deepEqual(record.artistIds, ['coko']);
  assert.equal(record.composer, null);
  assert.equal(record.album, null);
  assert.equal(record.path, '/en/songs/coko/originals/fake');
});

test('toAlbumIndexRecord counts tracks and linked songIds', () => {
  const record = toAlbumIndexRecord(albumEntry, 'zh');
  assert.equal(record.collection, 'albums');
  assert.equal(record.path, '/zh/albums/kaf/kaleido');
  assert.equal(record.trackCount, 12);
  assert.equal(record.tracks, 2);
  assert.equal(record.linkedTracks, 1);
  assert.equal(record.type, 'Album');
});

test('toArtistIndexRecord extracts slug from content path', () => {
  const record = toArtistIndexRecord(artistEntry, 'ja');
  assert.equal(record.collection, 'artists');
  assert.equal(record.path, '/ja/artists/vwp/kaf');
  assert.equal(record.slug, 'kaf');
  assert.equal(record.name, '花譜');
  assert.equal(record.romanizedName, 'KAF');
  assert.equal(record.contentStatus, 'published');
});

test('buildCatalogIndex sorts by contentPath and reports counts', () => {
  const index = buildCatalogIndex({
    locale: 'zh',
    songs: [
      songEntry,
      {
        id: 'albemuth/originals/black-glow/zh',
        data: { title: 'Black Glow', artist: 'Albemuth', artistId: 'albemuth' },
      },
    ],
    albums: [albumEntry],
    artists: [artistEntry],
  });

  assert.equal(index.locale, 'zh');
  assert.deepEqual(index.counts, { songs: 2, albums: 1, artists: 1 });
  assert.equal(index.songs[0].contentPath, 'albemuth/originals/black-glow');
  assert.equal(index.songs[1].contentPath, 'kaf/originals/shi');
});

test('buildCatalogIndex requires a locale', () => {
  assert.throws(() => buildCatalogIndex({}), /locale/);
});

test('summarizeCatalogIndex counts filled credits and dates', () => {
  const summary = summarizeCatalogIndex(
    buildCatalogIndex({
      locale: 'en',
      songs: [
        songEntry,
        {
          id: 'coko/originals/fake/en',
          data: { title: 'fake', artist: 'COKO', artistId: 'coko' },
        },
      ],
      albums: [albumEntry],
      artists: [artistEntry],
    }),
  );

  assert.equal(summary.locale, 'en');
  assert.equal(summary.counts.songs, 2);
  assert.equal(summary.withComposer, 1);
  assert.equal(summary.withLyricist, 1);
  assert.equal(summary.withReleaseDate, 1);
});
