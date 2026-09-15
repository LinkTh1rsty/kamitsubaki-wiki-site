import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { searchSiteIndex } from '../src/lib/siteSearch.mjs';

test('two-tier search index separation verifies endpoint schemas', async () => {
  const [indexEndpoint, bodyEndpoint, script] = await Promise.all([
    readFile(new URL('../src/pages/[locale]/search-index.json.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/pages/[locale]/search-body.json.ts', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/siteSearch.js', import.meta.url), 'utf8'),
  ]);

  // Primary index is lightweight
  assert.match(indexEndpoint, /schema:\s*'kamitsubaki-wiki-search-index'/);
  assert.match(indexEndpoint, /titleKey/);
  assert.match(indexEndpoint, /aliasKey/);
  assert.match(indexEndpoint, /headingKey/);
  assert.doesNotMatch(indexEndpoint, /searchKey:\s*foldCjkSearchText/);

  // Secondary index provides body full-text map
  assert.match(bodyEndpoint, /schema:\s*'kamitsubaki-wiki-search-body'/);
  assert.match(bodyEndpoint, /bodies\[id\]\s*=\s*buildSearchKey/);

  // Client script supports two-tier loading with background body enrichment
  assert.match(script, /search-index\.json/);
  assert.match(script, /search-body\.json/);
  assert.match(script, /loadBodyIndex/);
  assert.match(script, /entry\.searchKey\s*=\s*bodies\[entry\.id\]/);
});

test('entries can search titles/aliases immediately, and search body after secondary tier merges', () => {
  const primaryEntries = [
    {
      id: 'song:prayer/08-raven-freesia',
      title: 'レイヴンフリージア',
      aliases: ['Raven Freesia'],
      path: '/zh/songs/koko/originals/レイヴンフリージア-raven-freesia/',
      locale: 'zh',
      kind: 'song',
      description: '幸祜 的原创歌曲。',
      titleKey: 'レイヴンフリージア',
      aliasKey: 'raven freesia',
      descriptionKey: '幸祜 的原创歌曲。',
      headingKey: '概述 制作信息',
    },
  ];

  // Immediately searchable by title and alias
  const titleResults = searchSiteIndex(primaryEntries, 'レイヴンフリージア', { locale: 'zh' });
  assert.equal(titleResults.length, 1);
  assert.equal(titleResults[0].title, 'レイヴンフリージア');

  const aliasResults = searchSiteIndex(primaryEntries, 'Raven', { locale: 'zh' });
  assert.equal(aliasResults.length, 1);

  // Before body index merges, body query returns empty
  const beforeBodyResults = searchSiteIndex(primaryEntries, '深渊与白花之歌', { locale: 'zh' });
  assert.equal(beforeBodyResults.length, 0);

  // Simulate secondary tier search-body.json arrival
  const bodies = {
    'song:prayer/08-raven-freesia': '深渊与白花之歌 幸祜 首张专辑收录曲',
  };
  for (const entry of primaryEntries) {
    if (bodies[entry.id]) {
      entry.searchKey = bodies[entry.id];
    }
  }

  // After merge, body query matches
  const afterBodyResults = searchSiteIndex(primaryEntries, '深渊与白花之歌', { locale: 'zh' });
  assert.equal(afterBodyResults.length, 1);
  assert.equal(afterBodyResults[0].title, 'レイヴンフリージア');
});

