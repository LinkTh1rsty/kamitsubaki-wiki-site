import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildHomeMetadata } from '../src/lib/metadata.mjs';
import { buildSearchAlternates, buildPageStructuredData, serializeStructuredData } from '../src/lib/searchMetadata.mjs';
import { readSearchPage, generateSearchIndex } from '../scripts/search-index-integration.mjs';

const origin = 'https://kamitsubaki.wiki';
const page = (path, extra = '') => `<html><head><link rel="canonical" href="${origin}${path}">${extra}</head><body></body></html>`;

test('home chooses the V.W.P group image and page-level language alternatives keep the article path', () => {
  assert.equal(buildHomeMetadata({}, 'zh').image, '/images/artists/vwp.jpg');
  const alternates = buildSearchAlternates([{ locale: 'zh', href: '/zh/artists/vwp/kaf' }, { locale: 'en', href: '/en/artists/vwp/kaf' }]);
  assert.equal(alternates[0].href, `${origin}/zh/artists/vwp/kaf`);
  assert.equal(alternates[1].href, `${origin}/en/artists/vwp/kaf`);
  const data = buildPageStructuredData({ title: '</script><script>alert(1)</script>', description: 'Wiki description', url: origin + '/zh/', locale: 'zh', image: '/images/artists/vwp.jpg', isHome: true });
  assert.equal(data['@graph'][1].primaryImageOfPage.url, origin + '/images/artists/vwp.jpg');
  const serialized = serializeStructuredData(data);
  assert.ok(!serialized.includes('<'));
  assert.deepEqual(JSON.parse(serialized), data);
});

test('crawler index excludes noindex, redirects, aliases and foreign canonical pages', () => {
  for (const extra of ['<meta name="robots" content="noindex, follow">', '<meta name="googlebot" content="none">', '<meta http-equiv="refresh" content="0;url=/zh/">']) {
    assert.equal(readSearchPage(page('/zh/', extra), origin + '/zh/'), null);
  }
  assert.equal(readSearchPage(page('/zh/'), origin + '/en/'), null);
  assert.equal(readSearchPage('<link rel="canonical" href="https://other.example/zh/">', origin + '/zh/'), null);
  assert.ok(readSearchPage(page('/zh/'), origin + '/zh/'));
});

test('generated sitemap contains only real indexable pages and escapes URLs without fabricated lastmod', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'wiki-seo-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  for (const locale of ['zh', 'en', 'ja']) await mkdir(join(dir, locale));
  await writeFile(join(dir, 'zh/index.html'), page('/zh/', '<meta property="og:image" content="https://example.com/group.jpg?a=1&amp;b=2"><link rel="alternate" hreflang="en" href="/en/"><link rel="alternate" hreflang="ja" href="/ja/">'));
  await writeFile(join(dir, 'en/index.html'), page('/en/'));
  await writeFile(join(dir, 'ja/index.html'), page('/ja/', '<meta name="robots" content="noindex">'));
  await writeFile(join(dir, 'index.html'), page('/zh/', '<meta http-equiv="refresh" content="0;url=/zh/">'));
  assert.equal(await generateSearchIndex(dir), 2);
  const xml = await readFile(join(dir, 'sitemap-0.xml'), 'utf8');
  assert.match(xml, /hreflang="en"/);
  assert.doesNotMatch(xml, /hreflang="ja"|<lastmod>|<priority>/);
  assert.match(xml, /group.jpg\?a=1&amp;b=2/);
  assert.match(await readFile(join(dir, 'sitemap.xml'), 'utf8'), /https:\/\/kamitsubaki.wiki\/sitemap-0.xml/);
});
