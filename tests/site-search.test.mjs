import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildSearchExcerpt,
  normalizeSearchText,
  searchResultPath,
  searchSiteIndex,
} from '../src/lib/siteSearch.mjs';
import {
  buildIndexAliases,
  buildIndexStats,
  cleanIndexText,
  extractIndexHeadings,
  flattenIndexMetadata,
} from '../src/lib/searchIndex.mjs';
import { foldCjkSearchText } from '../src/lib/cjkSearch.mjs';
import { formatShortcut, getSearchShortcut } from '../src/lib/searchShortcut.mjs';

const entries = [
  {
    title: '花譜',
    url: 'https://kamitsubaki.wiki/zh/artists/vwp/kaf/',
    locale: 'zh',
    kind: 'artist',
    text: 'KAF 是 KAMITSUBAKI STUDIO 旗下虚拟歌手。',
  },
  {
    title: 'KAF',
    url: 'https://kamitsubaki.wiki/en/artists/vwp/kaf/',
    locale: 'en',
    kind: 'artist',
    text: 'KAF is a virtual singer from KAMITSUBAKI STUDIO.',
  },
  {
    title: '魔女',
    url: 'https://kamitsubaki.wiki/zh/songs/vwp/genealogy/魔女/',
    locale: 'zh',
    kind: 'song',
    text: 'V.W.P 的代表歌曲。',
  },
];

test('search shortcut labels follow the visitor operating system', () => {
  assert.equal(getSearchShortcut({ platform: 'MacIntel' }), '⌘K');
  assert.equal(getSearchShortcut({ platform: 'iPhone' }), '⌘K');
  assert.equal(getSearchShortcut({ platform: 'Win32' }), 'Ctrl+K');
  assert.equal(getSearchShortcut({ platform: 'Linux x86_64' }), 'Ctrl+K');
});

test('editor shortcut labels keep Mac glyphs and spell modifiers out elsewhere', () => {
  assert.equal(formatShortcut('⌘ ⇧ Z', { platform: 'MacIntel' }), '⌘ ⇧ Z');
  assert.equal(formatShortcut('⌘ F', { platform: 'iPhone' }), '⌘ F');
  assert.equal(formatShortcut('⌘ P', { platform: 'Win32' }), 'Ctrl P');
  assert.equal(formatShortcut('⌘ ⇧ Z', { platform: 'Win32' }), 'Ctrl Shift Z');
  assert.equal(formatShortcut('⌘ ⇧ Z', { userAgent: 'Mozilla/5.0 (X11; Linux x86_64)' }), 'Ctrl Shift Z');
  assert.equal(formatShortcut('/', { platform: 'Win32' }), '/');
});

test('search normalization handles width, case, and repeated whitespace', () => {
  assert.equal(normalizeSearchText('  ＫＡＦ   Studio '), 'kaf studio');
});

test('site search prioritizes exact titles and filters the active locale', () => {
  const zhResults = searchSiteIndex(entries, '花譜', { locale: 'zh' });
  assert.deepEqual(zhResults.map((entry) => entry.title), ['花譜']);

  const enResults = searchSiteIndex(entries, 'kaf', { locale: 'en' });
  assert.deepEqual(enResults.map((entry) => entry.title), ['KAF']);
  assert.ok(enResults[0].score > 1000);
});

test('site search supports multi-token body matches and safe result paths', () => {
  const results = searchSiteIndex(entries, 'V.W.P 代表', { locale: 'zh' });
  assert.deepEqual(results.map((entry) => entry.title), ['魔女']);
  assert.equal(searchResultPath(results[0].url), '/zh/songs/vwp/genealogy/%E9%AD%94%E5%A5%B3/');
});

test('site search tolerates small Latin-name typos and supports kind filters', () => {
  const typoResults = searchSiteIndex(entries, 'KAFf', { locale: 'en' });
  assert.deepEqual(typoResults.map((entry) => entry.title), ['KAF']);

  assert.deepEqual(
    searchSiteIndex(entries, 'V.W.P', { locale: 'zh', kind: 'song' }).map((entry) => entry.title),
    ['魔女'],
  );
});

test('CJK folding unifies simplified, traditional, and Japanese shinjitai', () => {
  assert.equal(foldCjkSearchText('观测'), '观测');
  assert.equal(foldCjkSearchText('觀測'), '观测');
  assert.equal(foldCjkSearchText('観測'), '观测');
  assert.equal(foldCjkSearchText('藝術 芸術'), '艺术 艺术');
  assert.equal(foldCjkSearchText('カミツバキ'), 'かみつばき');
});

test('site search uses folded CJK keys and tolerates a CJK typo', () => {
  const foldedEntries = [{
    title: '観測者',
    path: '/ja/artists/observer/',
    locale: 'ja',
    kind: 'artist',
    description: 'Japanese title',
    titleKey: foldCjkSearchText('観測者'),
    aliasKey: foldCjkSearchText('觀測者 观测者'),
    headingKey: foldCjkSearchText('神椿藝術'),
    searchKey: '',
  }];

  for (const query of ['观测者', '觀測者', '観測者', '观侧者', '观者']) {
    const results = searchSiteIndex(foldedEntries, query, {
      locale: 'ja',
      queryNormalizer: foldCjkSearchText,
    });
    assert.deepEqual(results.map((entry) => entry.title), ['観測者'], query);
  }
});

test('fuzzy title matches rank above incidental alias matches', () => {
  const fuzzyEntries = [
    {
      title: '花譜',
      path: '/zh/artists/vwp/kaf/',
      locale: 'zh',
      kind: 'artist',
      titleKey: foldCjkSearchText('花譜'),
      aliasKey: foldCjkSearchText('KAF'),
      headingKey: '',
      searchKey: '',
    },
    {
      title: '1984 (LIVE)',
      path: '/zh/songs/kaf/covers/1984/',
      locale: 'zh',
      kind: 'song',
      titleKey: foldCjkSearchText('1984 (LIVE)'),
      aliasKey: foldCjkSearchText('花譜 KAF'),
      headingKey: '',
      searchKey: '',
    },
    {
      title: '花女',
      path: '/zh/songs/kaf/originals/flower-girl/',
      locale: 'zh',
      kind: 'song',
      titleKey: foldCjkSearchText('花女'),
      aliasKey: '',
      headingKey: '',
      searchKey: '',
    },
  ];
  const results = searchSiteIndex(fuzzyEntries, '花普', {
    locale: 'zh',
    queryNormalizer: foldCjkSearchText,
  });

  assert.deepEqual(results.map((entry) => entry.title), ['花譜', '花女', '1984 (LIVE)']);
  assert.ok(results[0].score > results[1].score);
});

test('search excerpts center the first query match', () => {
  const excerpt = buildSearchExcerpt({ text: `${'前文'.repeat(80)} 花譜 观测记录 ${'后文'.repeat(80)}` }, '花譜', 80);
  assert.match(excerpt, /^…/);
  assert.match(excerpt, /花譜/);
  assert.match(excerpt, /…$/);
});

test('AI index helpers preserve useful ruby readings while removing markup noise', () => {
  const cleaned = cleanIndexText(`
## 概述
{{ruby::花譜::かふ::kaf}} 是歌手。
<ruby>魔女<rt>まじょ</rt></ruby>
@[youtube](https://example.com)
[官方页面](https://example.com)
  `);
  assert.match(cleaned, /花譜 かふ kaf/);
  assert.match(cleaned, /魔女/);
  assert.doesNotMatch(cleaned, /まじょ|https:|youtube/);
  assert.match(cleaned, /官方页面/);
});

test('AI index helpers build aliases, headings, flattened metadata, and stats', () => {
  const data = {
    name: '花譜',
    romanizedName: 'KAF',
    seo: { keywords: ['V.W.P', '花譜'] },
    affiliations: ['KAMITSUBAKI STUDIO'],
    theme: { accentColor: '#fff' },
  };
  assert.deepEqual(buildIndexAliases(data), ['花譜', 'KAF', 'V.W.P']);
  assert.deepEqual(extractIndexHeadings('## 概述\nText\n### 活动历程'), ['概述', '活动历程']);
  assert.deepEqual(flattenIndexMetadata(data), ['花譜', 'KAF', 'V.W.P', '花譜', 'KAMITSUBAKI STUDIO']);
  assert.deepEqual(buildIndexStats(entries), {
    total: 3,
    byLocale: { zh: 2, en: 1 },
    byKind: { artist: 2, song: 1 },
  });
});

test('search UI is mounted globally with open and close motion', async () => {
  const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
  const [layout, component, script, styles, nav, homeNav] = await Promise.all([
    read('../src/layouts/BaseLayout.astro'),
    read('../src/components/SiteSearch.astro'),
    read('../src/scripts/siteSearch.js'),
    read('../src/styles/global.css'),
    read('../src/components/SiteNav.astro'),
    read('../src/components/HomeSiteNav.astro'),
  ]);

  assert.match(layout, /<SiteSearch lang=\{lang\}/);
  assert.match(component, /data-site-search/);
  assert.match(component, /role="dialog"/);
  assert.match(component, /data-search-input/);
  assert.match(script, /search-index\.json/);
  assert.match(script, /event\.key\.toLowerCase\(\) === 'k'/);
  assert.match(script, /getSearchShortcut/);
  assert.match(script, /querySelectorAll\('\[data-search-shortcut\]'\)/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /event\.key !== 'Tab'/);
  assert.match(script, /classList\.add\('is-closing'\)/);
  assert.match(script, /closeAnimationTimer/);
  assert.match(styles, /@keyframes site-search-enter/);
  assert.match(styles, /@keyframes site-search-exit/);
  assert.match(styles, /@keyframes site-search-backdrop-in/);
  assert.match(styles, /@keyframes site-search-backdrop-out/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(nav, /<HomeSiteNav /);
  assert.match(homeNav, /data-search-open/);
  assert.match(homeNav, /data-search-shortcut/);
  assert.match(component, /data-search-shortcut/);
});

test('AI index v3 publishes shards and compact entries for the deployed v2 reader', async () => {
  const [manifest, shard, indexBuilder] = await Promise.all([
    readFile(new URL('../src/pages/ai-index.json.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/ai-index/[locale]/[collection].json.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/lib/aiIndex.mjs', import.meta.url), 'utf8'),
  ]);
  assert.match(manifest, /version:\s*3/);
  assert.match(manifest, /schema:\s*'kamitsubaki-wiki-ai-index'/);
  assert.match(manifest, /layout:\s*'locale-collection-shards'/);
  assert.match(manifest, /buildAiIndexShardDescriptors\(supportedLocales\)/);
  assert.match(manifest, /getCollection/);
  assert.match(manifest, /buildAiIndexEntries/);
  assert.match(manifest, /compatibility:\s*'v2-compact-entries'/);
  assert.match(manifest, /\bentries,/);
  assert.match(manifest, /\{ title, text, url, locale: entryLocale \}/);
  assert.match(manifest, /text:\s*text\.slice\(0, compatibilityTextLimit\)/);
  assert.match(shard, /schema:\s*'kamitsubaki-wiki-ai-index-shard'/);
  assert.match(shard, /stats:\s*buildIndexStats/);
  assert.match(shard, /buildAiIndexEntries/);
  assert.match(indexBuilder, /aliases/);
  assert.match(indexBuilder, /description/);
  assert.match(indexBuilder, /headings/);
  assert.match(indexBuilder, /\btext,/);
});

test('AI index shard map covers every locale and content collection once', async () => {
  const [{ supportedLocales }, { aiIndexCollections, buildAiIndexShardDescriptors }] = await Promise.all([
    import('../src/lib/i18n.mjs'),
    import('../src/lib/aiIndex.mjs'),
  ]);
  const shards = buildAiIndexShardDescriptors(supportedLocales);

  assert.equal(shards.length, supportedLocales.length * aiIndexCollections.length);
  assert.equal(new Set(shards.map(({ path }) => path)).size, shards.length);
  assert.deepEqual(new Set(shards.map(({ locale }) => locale)), new Set(supportedLocales));
  assert.deepEqual(new Set(shards.map(({ collection }) => collection)), new Set(aiIndexCollections));
  assert.ok(shards.every(({ path, locale, collection }) => path === `/ai-index/${locale}/${collection}.json`));
});

test('localized lightweight search index is generated separately from the AI corpus', async () => {
  const [endpoint, bodyEndpoint] = await Promise.all([
    readFile(new URL('../src/pages/[locale]/search-index.json.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/[locale]/search-body.json.ts', import.meta.url), 'utf8'),
  ]);
  assert.match(endpoint, /kamitsubaki-wiki-search-index/);
  assert.match(endpoint, /entry\.data\.locale !== locale/);
  assert.doesNotMatch(endpoint, /searchKey/);
  assert.match(bodyEndpoint, /kamitsubaki-wiki-search-body/);
  assert.match(bodyEndpoint, /entry\.data\.locale !== locale/);
  assert.match(bodyEndpoint, /buildSearchKey/);
  assert.match(bodyEndpoint, /1100/);
});
