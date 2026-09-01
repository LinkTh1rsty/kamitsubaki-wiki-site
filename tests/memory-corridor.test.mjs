import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

function projectUrl(path) {
  return new URL(path, import.meta.url);
}

function readProjectFile(path) {
  return readFile(projectUrl(path), 'utf8');
}

test('memory corridor is exposed from navigation in every locale', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const site = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));
    const gameItem = site.navItems.find((item) => item.href === `/${locale}/games/memory-corridor`);
    assert.equal(gameItem?.label, 'GAME');
  }
});

test('memory corridor has a localized wrapper, static runner, and required sprites', async () => {
  const requiredFiles = [
    '../src/pages/[locale]/games/memory-corridor.astro',
    '../public/games/memory-corridor/index.html',
    '../public/games/memory-corridor/assets/memory-corridor-pixel-bg.png',
    '../public/games/memory-corridor/assets/creature-idle.png',
    '../public/games/memory-corridor/assets/creature-jump.png',
    '../public/games/memory-corridor/assets/creature-run-a.png',
    '../public/games/memory-corridor/assets/creature-run-b.png',
  ];

  await Promise.all(requiredFiles.map((path) => access(projectUrl(path))));

  const wrapper = await readProjectFile('../src/pages/[locale]/games/memory-corridor.astro');
  assert.match(wrapper, /new URLSearchParams\(window\.location\.search\)/);
  assert.match(wrapper, /params\.toString\(\)/);
  assert.match(wrapper, /memory-corridor-frame/);
});

test('all primary article types link into a source-aware run', async () => {
  const detailPages = [
    '../src/pages/[locale]/artists/[...id].astro',
    '../src/pages/[locale]/songs/[...id].astro',
    '../src/pages/[locale]/albums/[...id].astro',
    '../src/pages/[locale]/projects/[...id].astro',
  ];

  const sources = await Promise.all(detailPages.map(readProjectFile));
  for (const source of sources) {
    assert.match(source, /MemoryCorridorEntryLink/);
  }

  const component = await readProjectFile('../src/components/MemoryCorridorEntryLink.astro');
  assert.match(component, /sourceKind/);
  assert.match(component, /sourceId/);
});

test('runner reads the Wiki catalog and records recovered entry fragments', async () => {
  const [runner, endpoint] = await Promise.all([
    readProjectFile('../public/games/memory-corridor/index.html'),
    readProjectFile('../src/pages/[locale]/game-index.json.ts'),
  ]);

  assert.match(runner, /\/\$\{wikiLocale\}\/game-index\.json/);
  assert.match(runner, /kamitsubaki-memory-corridor-archive-v1/);
  assert.match(runner, /recordWikiFragment\(/);
  assert.match(runner, /RETURN TO WIKI/);
  assert.match(endpoint, /getCollection\('artists'\)/);
  assert.match(endpoint, /getCollection\('songs'\)/);
  assert.match(endpoint, /getCollection\('albums'\)/);
  assert.match(endpoint, /getCollection\('projects'\)/);
});

test('Wiki catalog emits clue facts and typed graph connections', async () => {
  const endpoint = await readProjectFile('../src/pages/[locale]/game-index.json.ts');

  assert.match(endpoint, /facts: compactFacts/);
  assert.match(endpoint, /connections: unique\(connected\.map\(itemKey\)\)/);
  assert.match(endpoint, /featuredHrefs/);
  assert.match(endpoint, /trackSongIds/);
  assert.match(endpoint, /albumTitle/);
});

test('runner turns three recovered clues into a route decision and clickable memory path', async () => {
  const runner = await readProjectFile('../public/games/memory-corridor/index.html');

  assert.match(runner, /id="routeDecision"/);
  assert.match(runner, /id="routeClues"/);
  assert.match(runner, /function openRouteDecision\(\)/);
  assert.match(runner, /function chooseRoute\(choice\)/);
  assert.match(runner, /world\.routeRound >= 3/);
  assert.match(runner, /function renderMemoryPath\(container\)/);
  assert.match(runner, /id="completePath"/);
});
