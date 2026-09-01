import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const projectUrl = (path) => new URL(path, import.meta.url);
const readProjectFile = (path) => readFile(projectUrl(path), 'utf8');

test('the Memory Corridor wrapper loads the three-route explorer', async () => {
  const wrapper = await readProjectFile('../src/pages/[locale]/games/memory-corridor.astro');
  assert.match(wrapper, /games\/kamitsubaki-explorer\/index\.html/);
  assert.match(wrapper, /THREE ARCHIVE ROUTES/);
});

test('the explorer exposes all three requested modes', async () => {
  const [page, script] = await Promise.all([
    readProjectFile('../public/games/kamitsubaki-explorer/index.html'),
    readProjectFile('../public/games/kamitsubaki-explorer/game.js'),
  ]);

  assert.match(page, /data-start-mode="memory"/);
  assert.match(page, /data-start-mode="portal"/);
  assert.match(page, /data-start-mode="runner"/);
  assert.match(script, /\/games\/memory-corridor\/index\.html/);
});

test('memory questions and Wiki portals are driven by the real archive index', async () => {
  const script = await readProjectFile('../public/games/kamitsubaki-explorer/game.js');
  assert.match(script, /`\/\$\{wikiLocale\}\/game-index\.json`/);
  assert.match(script, /function openQuiz\(/);
  assert.match(script, /function answerQuiz\(/);
  assert.match(script, /function openPortal\(/);
  assert.match(script, /target = '_top'/);
});

test('the explorer has a real risk, movement and unlock loop', async () => {
  const [page, script] = await Promise.all([
    readProjectFile('../public/games/kamitsubaki-explorer/index.html'),
    readProjectFile('../public/games/kamitsubaki-explorer/game.js'),
  ]);

  assert.match(page, /id="healthCount"/);
  assert.match(page, /id="questTracker"/);
  assert.match(page, /data-touch="dash"/);
  assert.match(script, /function startDash\(\)/);
  assert.match(script, /function resolveBarrierCollisions\(/);
  assert.match(script, /function updateEnemies\(/);
  assert.match(script, /function fragmentRequirement\(/);
  assert.match(script, /function collectFragment\(/);
});

test('the production explorer asset pack and manifest are present', async () => {
  const root = '../public/games/kamitsubaki-explorer/assets/';
  const files = [
    'manifest.json',
    'player-sprites-v2.png',
    'environment-tiles-v2.png',
    'archive-collectibles-v2.png',
    'archive-portals-v2.png',
    'archive-hazards-v2.png',
    'effects-and-markers-v2.png',
    'environment-props-v2.png',
    'archive-ui-v2.png',
    'background-far-v2.png',
    'background-mid-v2.png',
    'background-foreground-v2.png',
  ];
  await Promise.all(files.map((file) => access(projectUrl(`${root}${file}`))));
});
