import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

import { buildArtistDisplayData } from '../src/lib/homeData.mjs';

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

async function readFrontmatter(path) {
  const content = await readSource(path);
  const match = content.match(/---\r?\n([\s\S]*?)\r?\n---/);
  return yaml.parse(match[1]);
}

test('artist schema supports optional wiki-oriented metadata fields', async () => {
  const config = await readSource('../src/content.config.ts');

  assert.match(config, /debutDate: z\.string\(\)\.optional\(\)/);
  assert.match(config, /profileTagline: z\.string\(\)\.optional\(\)/);
  assert.match(config, /designCredits: z\.array\(z\.string\(\)\)\.optional\(\)/);
  assert.match(config, /affiliations: z\.array\(z\.string\(\)\)\.optional\(\)/);
  assert.match(config, /officialLinks:/);
  assert.match(config, /featuredEntries:/);
  assert.match(config, /z\.enum\(\['artist', 'project', 'album', 'song'\]\)/);
  assert.match(config, /const theme = z/);
  assert.match(config, /\btheme,\r?\n/);
  assert.match(config, /palette: z\.array/);
});

test('artist infobox and header render optional structured fields', async () => {
  const infoBox = await readSource('../src/components/WikiInfoBox.astro');
  const header = await readSource('../src/components/WikiArticleHeader.astro');
  const artistPage = await readSource('../src/pages/[locale]/artists/[...id].astro');

  assert.match(infoBox, /data\.profileTagline/);
  assert.match(infoBox, /data\.debutDate/);
  assert.match(infoBox, /data\.designCredits/);
  assert.match(infoBox, /data\.affiliations/);
  assert.match(infoBox, /data\.officialLinks/);
  assert.match(infoBox, /data\.featuredEntries/);
  assert.match(infoBox, /data\.theme/);
  assert.match(infoBox, /labels\.theme/);
  assert.match(infoBox, /labels\.kindLabels/);
  assert.match(header, /data\.profileTagline/);
  assert.match(artistPage, /officialLinks/);
  assert.match(artistPage, /featuredEntries/);
  assert.match(artistPage, /wiki-theme-shell/);
  assert.match(artistPage, /accentColor/);
});

test('artist detail sidebar scrolls with the main content from the beginning', async () => {
  const artistPage = await readSource('../src/pages/[locale]/artists/[...id].astro');
  const sidebar = artistPage.match(/<aside class:list=\{\[[\s\S]*?<WikiInfoBox/)?.[0] ?? '';

  assert.notEqual(sidebar, '');
  assert.doesNotMatch(sidebar, /\blg:sticky\b/);
  assert.doesNotMatch(sidebar, /\blg:top-32\b/);
});

test('artist display data preserves extended metadata from content files', async () => {
  const frontmatter = await readFrontmatter('../src/content/artists/vwp/kaf/zh.md');
  const data = buildArtistDisplayData({
    id: 'vwp/kaf/zh',
    data: frontmatter,
  });

  assert.equal(data.debutDate, '2018-10-18');
  assert.equal(data.profileTagline.length > 0, true);
  assert.equal(data.designCredits.length > 0, true);
  assert.equal(data.affiliations.includes('V.W.P'), true);
  assert.equal(data.officialLinks.length > 0, true);
  assert.equal(data.theme.accentColor.startsWith('#'), true);
  assert.equal(data.theme.palette.length > 1, true);
});

test('placeholder artist entries are visibly marked and excluded from indexing', async () => {
  const [config, database, detail] = await Promise.all([
    readSource('../src/content.config.ts'),
    readSource('../src/components/ArtistDatabase.astro'),
    readSource('../src/pages/[locale]/artists/[...id].astro'),
  ]);

  assert.match(config, /z\.enum\(\['stub', 'published'\]\)/);
  assert.match(database, /artist\.contentStatus === 'stub'/);
  assert.match(detail, /articleData\.contentStatus === 'stub'/);
});

test('every artist row receives direct hover and keyboard background listeners', async () => {
  const interactions = await readSource('../src/scripts/siteInteractions.js');

  assert.match(interactions, /querySelectorAll\('\.artist-row'\)\.forEach/);
  assert.match(interactions, /row\.addEventListener\('mouseenter'/);
  assert.match(interactions, /row\.addEventListener\('mouseleave'/);
  assert.match(interactions, /row\.addEventListener\('focusin'/);
  assert.match(interactions, /data-artist-hover-ready/);
  assert.doesNotMatch(interactions, /artistList\.addEventListener\('mouseover'/);
});

test('artist background hover does not change entry text brightness or weight', async () => {
  const database = await readSource('../src/components/ArtistDatabase.astro');
  const styles = await readSource('../src/styles/global.css');

  assert.doesNotMatch(database, /group-hover:text-white/);
  assert.doesNotMatch(database, /glitch-text/);
  assert.doesNotMatch(styles, /\.artist-row:hover\s+\.glitch-text/);
  assert.doesNotMatch(styles, /\.artist-row:hover[^}]*text-shadow/s);
});

test('artist hover backgrounds preserve the source image colors', async () => {
  const database = await readSource('../src/components/ArtistDatabase.astro');
  const backgroundImage = database.match(/<img\s+id="artist-bg-img"[\s\S]*?\/>/)?.[0] ?? '';

  assert.notEqual(backgroundImage, '');
  assert.doesNotMatch(backgroundImage, /\bgrayscale(?:-|\b)/);
  assert.match(backgroundImage, /\bsaturate-125\b/);
});

test('artist hover background overscans the full viewport without changing its animation', async () => {
  const styles = await readSource('../src/styles/global.css');

  assert.match(styles, /\.fixed-bg-hack\s*\{[^}]*width:\s*100vw;[^}]*height:\s*100dvh;/s);
  assert.match(styles, /\.artist-bg__image\s*\{[^}]*top:\s*-2%;[^}]*left:\s*-2%;[^}]*width:\s*104%;[^}]*max-width:\s*none;[^}]*height:\s*104%;/s);
  assert.match(styles, /\.artist-bg__image\s*\{[^}]*transform:\s*scale\(1\.035\);[^}]*opacity 680ms[^}]*transform 1600ms[^}]*filter 900ms/s);
  assert.match(styles, /\.artist-bg__image\.is-active\s*\{[^}]*opacity:\s*0\.35;[^}]*transform:\s*scale\(1\);/s);
});

test('table of contents tracks the active heading from scroll position', async () => {
  const toc = await readSource('../src/components/TableOfContents.astro');

  assert.match(toc, /requestAnimationFrame/);
  assert.match(toc, /getBoundingClientRect\(\)\.top/);
  assert.match(toc, /window\.addEventListener\('scroll'/);
  assert.match(toc, /setActiveSlug/);
  assert.doesNotMatch(toc, /IntersectionObserver/);
});

test('table of contents controls anchor jumps with the same offset used for tracking', async () => {
  const toc = await readSource('../src/components/TableOfContents.astro');

  assert.match(toc, /event\.preventDefault\(\)/);
  assert.match(toc, /window\.scrollTo/);
  assert.match(toc, /history\.pushState/);
  assert.match(toc, /getAnchorOffset/);
});
