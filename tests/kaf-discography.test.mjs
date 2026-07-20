import assert from 'node:assert/strict';
import { access, readFile, readdir, stat } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';

const projectRoot = new URL('../', import.meta.url);
const locales = ['zh', 'ja', 'en'];
const providers = ['bilibili', 'youtube', 'apple-music', 'netease'];

const albums = [
  'flower-and-heart',
  'gsa',
  'guwa',
  'guwa-gamma',
  'i-scream-live',
  'i-scream-live-2',
  'i-scream-live-3',
  'i-scream-live-4',
  'kansoku',
  'kansoku-gamma',
  'kyoso',
  'kyoso-gamma',
  'love-and-flower',
  'maho',
  'maho-gamma',
  'shinai',
  'suite',
  'tomadoi-telepathy',
  'yoru-ga-furiyamu-mae-ni',
];

const expectedSongCounts = {
  collaborations: 7,
  covers: 93,
  instrumentals: 14,
  originals: 69,
  remixes: 62,
  suites: 18,
};

const appleOnlyAlbums = new Set([
  'guwa-gamma',
  'i-scream-live-2',
  'i-scream-live-3',
  'i-scream-live-4',
]);

function fileUrl(path) {
  return new URL(path, projectRoot);
}

async function readEntry(path) {
  const source = await readFile(fileUrl(path), 'utf8');
  const match = source.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(match, `${path} must contain frontmatter`);
  return { source, data: parse(match[1]) };
}

async function directories(path) {
  return (await readdir(fileUrl(path), { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function readJpegDimensions(buffer) {
  assert.equal(buffer.readUInt16BE(0), 0xffd8, 'cover must be a JPEG');
  let offset = 2;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }

    const length = buffer.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      };
    }
    offset += length + 2;
  }

  throw new Error('JPEG dimensions not found');
}

async function assertHighQualitySquareCover(path, minimumWidth = 1500) {
  const cover = await readFile(fileUrl(path));
  const coverStats = await stat(fileUrl(path));
  const dimensions = readJpegDimensions(cover);
  assert.ok(coverStats.size > 100_000, `${path} must not be a thumbnail`);
  assert.ok(dimensions.width >= minimumWidth, `${path} must be at least ${minimumWidth}px wide`);
  assert.equal(dimensions.width, dimensions.height, `${path} must remain square`);
}

test('KAF catalog contains 19 complete, localized releases and high-resolution artwork', async () => {
  assert.deepEqual(await directories('src/content/albums/kaf'), [...albums].sort());

  let totalTracks = 0;
  let linkedTracks = 0;

  for (const album of albums) {
    const translations = await Promise.all(
      locales.map((locale) => readEntry(`src/content/albums/kaf/${album}/${locale}.md`)),
    );
    const [canonical, ...localized] = translations;
    assert.equal(new Set(translations.map(({ data }) => data.translationKey)).size, 1);
    assert.ok(canonical.data.tracks.length > 0, `${album} must include its track list`);
    assert.equal(canonical.data.trackCount, canonical.data.tracks.length, `${album} trackCount must match tracks`);

    for (const { data, source } of localized) {
      assert.equal(data.trackCount, canonical.data.trackCount, `${album} track counts must match across locales`);
      assert.deepEqual(data.tracks, canonical.data.tracks, `${album} track metadata must match across locales`);
      assert.doesNotMatch(source, /placehold|待补|未定|TBD/i);
      assert.match(source, /https:\/\/vgmdb\.net\/artist\/34690/);
    }

    for (const { data } of translations) {
      assert.equal(data.image, `/images/albums/kaf/${album}.jpg`);
      if (!appleOnlyAlbums.has(album)) {
        assert.ok(data.officialLinks.some(({ href }) => href.startsWith('https://kaf.kamitsubaki.jp/')));
      }
      if (album !== 'suite') {
        assert.ok(data.officialLinks.some(({ href }) => href.startsWith('https://music.apple.com/jp/album/')));
      }
    }

    for (const track of canonical.data.tracks) {
      totalTracks += 1;
      if (/^MC/i.test(track.title)) {
        assert.equal(track.songId, undefined, `${album} MC tracks should not create song entries`);
      } else {
        assert.match(track.songId, /^kaf\//, `${album} ${track.title} must link to a song entry`);
        linkedTracks += 1;
      }
    }

    await assertHighQualitySquareCover(`public/images/albums/kaf/${album}.jpg`);
  }

  assert.equal(totalTracks, 278);
  assert.equal(linkedTracks, 256);
});

test('every KAF album track resolves to one trilingual song entry', async () => {
  const songIds = new Set();

  for (const album of albums) {
    const { data } = await readEntry(`src/content/albums/kaf/${album}/zh.md`);
    for (const track of data.tracks) {
      if (track.songId) songIds.add(track.songId);
    }
  }

  for (const songId of songIds) {
    for (const locale of locales) {
      await access(fileUrl(`src/content/songs/${songId}/${locale}.md`));
    }
  }
});

test('KAF song catalog has 263 localized songs and ordered aggregate players', async () => {
  assert.deepEqual(await directories('src/content/songs/kaf'), Object.keys(expectedSongCounts).sort());

  let totalSongs = 0;
  for (const [category, expectedCount] of Object.entries(expectedSongCounts)) {
    const songDirectories = await directories(`src/content/songs/kaf/${category}`);
    assert.equal(songDirectories.length, expectedCount, `${category} song count must stay complete`);
    totalSongs += songDirectories.length;

    for (const song of songDirectories) {
      const translations = await Promise.all(
        locales.map((locale) => readEntry(`src/content/songs/kaf/${category}/${song}/${locale}.md`)),
      );
      assert.equal(new Set(translations.map(({ data }) => data.translationKey)).size, 1);

      for (const { data, source } of translations) {
        assert.equal(data.artistId, 'kaf');
        assert.ok(data.image?.startsWith('/images/'), `${category}/${song} must use local artwork`);
        await access(fileUrl(`public/${data.image.slice(1)}`));
        assert.doesNotMatch(source, /<iframe\b|placehold|待补|未定|TBD/i);
      }

      const { source } = translations[0];
      const shortcodeLines = source.match(/^@\[[^\]]+\]\([^\n]+\)$/gm) || [];
      const aggregateSource = source.match(/\{\{media-switcher::[^\n]+\}\}[\s\S]*?\{\{\/media-switcher\}\}/)?.[0];
      if (shortcodeLines.length === 1) {
        assert.equal(aggregateSource, undefined, `${category}/${song} must not wrap one provider in a switcher`);
        const standaloneHtml = await renderMarkdownFragment(shortcodeLines[0]);
        assert.equal((standaloneHtml.match(/<iframe /g) || []).length, 1);
        continue;
      }
      if (shortcodeLines.length === 0) {
        assert.equal(aggregateSource, undefined);
        continue;
      }
      assert.ok(aggregateSource, `${category}/${song} must aggregate multiple providers`);

      const providerOffsets = providers
        .map((provider) => [provider, aggregateSource.indexOf(`@[${provider}](`)])
        .filter(([, offset]) => offset >= 0);
      assert.deepEqual(
        providerOffsets.map(([, offset]) => offset),
        providerOffsets.map(([, offset]) => offset).sort((a, b) => a - b),
        `${category}/${song} providers must remain Bilibili, YouTube, Apple Music, NetEase`,
      );

      const aggregateHtml = await renderMarkdownFragment(aggregateSource);
      assert.equal(
        (aggregateHtml.match(/data-media-switcher-tab/g) || []).length,
        providerOffsets.length,
        `${category}/${song} must render one tab per provider`,
      );
      assert.equal(
        (aggregateHtml.match(/<iframe /g) || []).length,
        providerOffsets.length,
        `${category}/${song} must render one player per provider`,
      );
    }
  }

  assert.equal(totalSongs, 263);
});

test('KAF single artwork uses native-resolution square JPEG files', async () => {
  const artwork = (await readdir(fileUrl('public/images/songs/kaf')))
    .filter((file) => file.endsWith('.jpg'))
    .sort();

  assert.equal(artwork.length, 35);
  for (const file of artwork) {
    await assertHighQualitySquareCover(`public/images/songs/kaf/${file}`, 1600);
  }
});
