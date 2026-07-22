import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('albums are registered as a localized content collection with list and detail routes', async () => {
  const [config, listPage, detailPage] = await Promise.all([
    readProjectFile('../src/content.config.ts'),
    readProjectFile('../src/pages/[locale]/albums/index.astro'),
    readProjectFile('../src/pages/[locale]/albums/[...id].astro'),
  ]);

  assert.match(config, /const albums = defineCollection/);
  assert.match(config, /base: '\.\/src\/content\/albums'/);
  assert.match(config, /tracks: z/);
  assert.match(listPage, /getCollection\('albums'\)/);
  assert.match(detailPage, /collection="albums"/);
  assert.match(detailPage, /src\/content\/albums\/\$\{id\}/);
});

test('album home section is rendered after songs and before the maintenance roster', async () => {
  const homePage = await readProjectFile('../src/pages/[locale]/index.astro');
  const songsIndex = homePage.indexOf('<SongsSection');
  const albumsIndex = homePage.indexOf('<AlbumsSection');
  const rosterIndex = homePage.indexOf('<ContributorRoster');

  assert.ok(songsIndex >= 0);
  assert.ok(albumsIndex > songsIndex);
  assert.ok(rosterIndex > albumsIndex);
});

test('album navigation and labels exist in every supported locale', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const site = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));
    assert.equal(site.navItems.find((item) => item.href === '#albums')?.label, 'ALBUMS');
    assert.equal(typeof site.sections.albums.heading, 'string');
    assert.equal(typeof site.sections.albums.emptyLabel, 'string');
  }
});

test('music pages use artist-first song and album navigation', async () => {
  const [subnav, songsPage, artistSongsPage, albumsPage, artistAlbumsPage, albumDetail] = await Promise.all([
    readProjectFile('../src/components/MusicSubnav.astro'),
    readProjectFile('../src/pages/[locale]/songs/index.astro'),
    readProjectFile('../src/pages/[locale]/songs/artists/[artist].astro'),
    readProjectFile('../src/pages/[locale]/albums/index.astro'),
    readProjectFile('../src/pages/[locale]/albums/artists/[artist].astro'),
    readProjectFile('../src/pages/[locale]/albums/[...id].astro'),
  ]);

  assert.match(subnav, /current === 'songs'/);
  assert.match(subnav, /current === 'albums'/);
  assert.match(songsPage, /buildArtistSongCatalog/);
  assert.match(songsPage, /songs\/artists\/\$\{group\.slug\}/);
  assert.match(artistSongsPage, /buildArtistSongCatalog/);
  assert.match(artistSongsPage, /category\.entries\.map/);
  assert.match(artistSongsPage, /songs\/\$\{songPath\}/);
  assert.match(artistSongsPage, /song\.data\.image \?\? group\.cover/);
  assert.match(albumsPage, /buildArtistAlbumCatalog/);
  assert.match(albumsPage, /albums\/artists\/\$\{group\.slug\}/);
  assert.match(artistAlbumsPage, /buildArtistAlbumCatalog/);
  assert.match(artistAlbumsPage, /albums\.map/);
  assert.match(artistAlbumsPage, /albums\/\$\{albumPath\}/);
  assert.match(albumDetail, /<MusicSubnav locale=\{localeCode\} current="albums"/);
});

test('song artist catalog hero uses an artist-tinted surface in light mode', async () => {
  const artistSongsPage = await readProjectFile('../src/pages/[locale]/songs/artists/[artist].astro');

  assert.match(
    artistSongsPage,
    /:global\(html\[data-theme='light'\]\) \.catalog-hero__body\s*\{[\s\S]*background-color:\s*var\(--theme-panel-solid\)[\s\S]*color-mix\(in srgb, var\(--catalog-accent\) 13%, var\(--theme-panel-solid\)\)/,
  );
  assert.match(
    artistSongsPage,
    /:global\(html\[data-theme='light'\]\) \.catalog-hero__body > div\s*\{[\s\S]*border-color:\s*rgb\(var\(--theme-fg-rgb\) \/ 0\.12\)/,
  );
});

test('song and album details use the normal light surface in light mode', async () => {
  const [songDetail, albumDetail, styles] = await Promise.all([
    readProjectFile('../src/pages/[locale]/songs/[...id].astro'),
    readProjectFile('../src/pages/[locale]/albums/[...id].astro'),
    readProjectFile('../src/styles/global.css'),
  ]);

  assert.match(songDetail, /<div class="wiki-theme-shell" style=\{themeStyle\}>/);
  assert.match(albumDetail, /<div class="wiki-theme-shell" style=\{themeStyle\}>/);
  assert.doesNotMatch(songDetail, /wiki-theme-shell music-theme-shell/);
  assert.doesNotMatch(albumDetail, /wiki-theme-shell music-theme-shell/);
  assert.doesNotMatch(styles, /\.music-theme-shell/);
});

test('song and album catalog cards remove their image mask in light mode', async () => {
  const [songCatalog, albumCatalog] = await Promise.all([
    readProjectFile('../src/pages/[locale]/songs/index.astro'),
    readProjectFile('../src/pages/[locale]/albums/index.astro'),
  ]);

  for (const [source, className] of [[songCatalog, 'artist-card'], [albumCatalog, 'album-artist-card']]) {
    assert.match(source, /catalog-card__mask absolute inset-0 bg-gradient-to-t/);
    assert.match(source, new RegExp(`html\\[data-theme='light'\\]\\) \\.${className} \\.catalog-card__mask\\s*\\{[\\s\\S]*display: none;`));
    assert.doesNotMatch(source, new RegExp(`html\\[data-theme='light'\\]\\) \\.${className},[\\s\\S]*background-color: #14171a`));
  }
  assert.match(songCatalog, /artist-card:hover img,[\s\S]*opacity: 1;[\s\S]*filter: none;/);
  assert.match(albumCatalog, /album-artist-card:hover img,[\s\S]*opacity: 1;[\s\S]*filter: none;/);
});

test('artist album cards are not dimmed in light mode', async () => {
  const artistAlbums = await readProjectFile('../src/pages/[locale]/albums/artists/[artist].astro');
  assert.match(artistAlbums, /html\[data-theme='light'\]\) \.album-card img,[\s\S]*opacity: 1;[\s\S]*filter: none;/);
});

test('album catalog groups entries by folder-driven artist ids', async () => {
  const { buildArtistAlbumCatalog } = await import('../src/lib/musicCatalog.mjs');
  const albums = [
    { id: 'kaf/maho/zh', data: { artist: '花譜', title: '魔法', releaseDate: '2020-11-25', itemOrder: 2, image: '/maho.jpg' } },
    { id: 'kaf/kansoku/zh', data: { artist: '花譜', title: '観測', releaseDate: '2019-09-11', itemOrder: 1, image: '/kansoku.jpg' } },
    { id: 'vwp/fate/zh', data: { artist: 'V.W.P', title: 'FATE', releaseDate: '2024-03-27', image: '/fate.jpg' } },
  ];
  const artists = [
    { id: 'vwp/kaf/zh', data: { translationKey: 'kaf', name: '花譜', romanizedName: 'KAF', image: '/kaf-artist.jpg', categoryOrder: 1, itemOrder: 1 } },
    { id: 'vwp/vwp/zh', data: { translationKey: 'vwp', name: 'V.W.P', romanizedName: 'V.W.P', image: '/vwp-artist.jpg', categoryOrder: 1, itemOrder: 0 } },
  ];

  const catalog = buildArtistAlbumCatalog(albums, artists, 'zh');
  assert.deepEqual(catalog.map((group) => ({ slug: group.slug, size: group.entries.length })), [
    { slug: 'vwp', size: 1 },
    { slug: 'kaf', size: 2 },
  ]);
  assert.deepEqual(catalog[1].entries.map((entry) => entry.data.title), ['観測', '魔法']);
  assert.equal(catalog[1].cover, '/kaf-artist.jpg');
});

test('song artwork prefers song covers and falls back to artist artwork', async () => {
  const songDetail = await readProjectFile('../src/pages/[locale]/songs/[...id].astro');

  assert.match(songDetail, /entry\.data\.image\s*\?\? artistEntry\?\.data\.image/);
  assert.match(songDetail, /getCollection\('artists'\)/);
  assert.match(songDetail, /artist\.data\.translationKey === entry\.data\.artistId/);
});

test('song catalog uses artist entry artwork and folder-driven categories', async () => {
  const { buildArtistSongCatalog, parseSongCatalogPath } = await import('../src/lib/musicCatalog.mjs');
  const songs = [
    { id: 'kaf/originals/shi/zh', data: { artist: '花譜', artistId: 'kaf', title: '糸', itemOrder: 1 } },
    { id: 'kaf/covers/example/zh', data: { artist: '花譜', artistId: 'kaf', title: 'Example cover', itemOrder: 1 } },
    { id: 'kaf-genealogy/example/zh', data: { artist: '花譜', artistId: 'kaf', title: 'Legacy path' } },
  ];
  const artists = [{
    id: 'vwp/kaf/zh',
    data: {
      translationKey: 'kaf',
      name: '花譜',
      romanizedName: 'KAF',
      image: '/images/artists/kaf.webp',
      categoryOrder: 1,
      itemOrder: 1,
    },
  }];

  const [catalog] = buildArtistSongCatalog(songs, artists, 'zh');
  assert.equal(catalog.cover, '/images/artists/kaf.webp');
  assert.equal(catalog.artistPath, 'vwp/kaf');
  assert.deepEqual(
    catalog.categories.map((category) => ({ slug: category.slug, title: category.title, size: category.entries.length })),
    [
      { slug: 'originals', title: '原创曲', size: 1 },
      { slug: 'covers', title: '翻唱曲', size: 1 },
      { slug: 'genealogy', title: '系谱曲', size: 1 },
    ],
  );
  assert.equal(parseSongCatalogPath('kaf/originals/shi/zh', 'kaf').songPath, 'kaf/originals/shi');
  assert.equal(parseSongCatalogPath('kaf-covers/example/zh', 'kaf').categorySlug, 'covers');
});

test('music catalog groups entries by artist with stable anchors', async () => {
  const { groupMusicByArtist, toArtistAnchor } = await import('../src/lib/musicCatalog.mjs');
  const entries = [
    { id: 'songs/b', data: { artist: 'V.W.P', artistId: 'vwp', title: 'B' } },
    { id: 'songs/a', data: { artist: 'KAF', title: 'A' } },
    { id: 'songs/c', data: { artist: 'VWP', artistId: 'vwp', title: 'C' } },
  ];

  assert.equal(toArtistAnchor('V.W.P'), 'artist-v-w-p');
  assert.deepEqual(
    groupMusicByArtist(entries).map((group) => ({ artist: group.artist, id: group.id, size: group.entries.length })),
    [
      { artist: 'KAF', id: 'artist-kaf', size: 1 },
      { artist: 'V.W.P', id: 'artist-vwp', size: 2 },
    ],
  );
});

test('multi-artist songs appear once in every credited artist catalog', async () => {
  const { groupMusicByArtist } = await import('../src/lib/musicCatalog.mjs');
  const entries = [{
    id: 'vwp/genealogy/resonance/zh',
    data: {
      artist: 'V.W.P',
      artistId: 'vwp',
      artistIds: ['vwp', 'kaf', 'rim', 'harusaruhi', 'isekaijoucho', 'koko'],
      title: '共鳴',
    },
  }];
  const artists = [
    { id: 'vwp/vwp/zh', data: { translationKey: 'vwp', name: 'V.W.P' } },
    { id: 'vwp/rim/zh', data: { translationKey: 'rim', name: '理芽' } },
  ];

  const groups = groupMusicByArtist(entries, 'zh', artists);
  assert.equal(groups.length, 6);
  assert.equal(groups.find(({ slug }) => slug === 'vwp').entries.length, 1);
  assert.equal(groups.find(({ slug }) => slug === 'rim').artist, '理芽');
  assert.equal(groups.find(({ slug }) => slug === 'rim').entries.length, 1);
});

test('shared song categories come from the canonical document path for every artist', async () => {
  const { buildArtistSongCatalog } = await import('../src/lib/musicCatalog.mjs');
  const entry = {
    id: 'harusaruhi/collaborations/furukizu/zh',
    data: {
      artist: '幸祜×春猿火',
      artistId: 'harusaruhi',
      artistIds: ['harusaruhi', 'koko'],
      title: '古傷',
      code: 'apple-1678038919',
    },
  };

  const catalog = buildArtistSongCatalog([entry], [], 'zh');
  assert.deepEqual(catalog.map(({ slug }) => slug).sort(), ['harusaruhi', 'koko']);
  assert.ok(catalog.every(({ categories }) => categories[0].slug === 'collaborations'));
  assert.ok(catalog.every(({ entries }) => entries[0] === entry));
});

test('duplicate recording codes fail with single-source authoring guidance', async () => {
  const { assertUniqueSongDocuments } = await import('../src/lib/musicCatalog.mjs');
  const data = { artist: '幸祜×春猿火', artistId: 'harusaruhi', title: '古傷', code: 'apple-1678038919' };

  assert.throws(
    () => assertUniqueSongDocuments([
      { id: 'harusaruhi/collaborations/furukizu/zh', data },
      { id: 'koko/collaborations/furukizu/zh', data: { ...data, artistId: 'koko' } },
    ]),
    /Keep one document and list every catalog artist in artistIds/,
  );
});

test('album track links are emitted only for localized song entries', async () => {
  const detailPage = await readProjectFile('../src/pages/[locale]/albums/[...id].astro');

  assert.match(detailPage, /getCollection\('songs'\)/);
  assert.match(detailPage, /song\.data\.locale === localeCode/);
  assert.match(detailPage, /localizedSongIds\.has\(track\.songId\)/);
});

test('work schemas share validated dates, durations, and safe links', async () => {
  const config = await readProjectFile('../src/content.config.ts');

  assert.match(config, /const workBaseSchema = z\.object/);
  assert.match(config, /schema: workBaseSchema\.extend/);
  assert.match(config, /Expected YYYY, YYYY-MM, or YYYY-MM-DD/);
  assert.match(config, /Expected MM:SS or HH:MM:SS/);
  assert.match(config, /Must be an HTTP\(S\) URL or a site-relative path/);
});

test('album and song contributions are included in contributor history', async () => {
  const { parseContentPath } = await import('../scripts/contributor-history.mjs');
  assert.deepEqual(parseContentPath('src/content/albums/kaf/example/zh.md'), {
    collection: 'albums',
    entryId: 'kaf/example',
    locale: 'zh',
  });
  assert.deepEqual(parseContentPath('src/content/songs/kaf/example/ja.md'), {
    collection: 'songs',
    entryId: 'kaf/example',
    locale: 'ja',
  });
});

test('albums are included in the AI index and use entry-specific edit targets', async () => {
  const [aiIndex, roster] = await Promise.all([
    readProjectFile('../src/pages/ai-index.json.ts'),
    readProjectFile('../src/components/ContributorRoster.astro'),
  ]);

  assert.match(aiIndex, /getCollection\('albums'\)/);
  assert.match(aiIndex, /getCollection\('songs'\)/);
  assert.match(roster, /'albums'/);
  assert.match(roster, /src\/content\/\$\{collection\}\/\$\{entryId\}/);
});
