import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

function projectUrl(path) {
  return new URL(path, import.meta.url);
}

function readProjectFile(path) {
  return readFile(projectUrl(path), 'utf8');
}

test('the static 404 fallback embeds the compact pixel runner', async () => {
  await Promise.all([
    access(projectUrl('../src/pages/404.astro')),
    access(projectUrl('../src/components/NotFoundRunner.astro')),
  ]);

  const [page, runner] = await Promise.all([
    readProjectFile('../src/pages/404.astro'),
    readProjectFile('../src/components/NotFoundRunner.astro'),
  ]);

  assert.match(page, /<NotFoundRunner\s*\/>/);
  assert.match(page, /noindex: true/);
  assert.match(runner, /data-runner-canvas/);
  assert.match(runner, /function startAndJump\(\)/);
  assert.match(runner, /function spawnObstacle\(\)/);
  assert.match(runner, /function intersects\(a: CollisionBox, b: CollisionBox\)/);
  assert.match(runner, /kamitsubaki-404-runner-best-v1/);
});

test('the 404 fallback localizes its recovery actions from the requested path', async () => {
  const page = await readProjectFile('../src/pages/404.astro');

  assert.match(page, /window\.location\.pathname\.match/);
  assert.match(page, /\(zh\|ja\|en\)/);
  assert.match(page, /`\/\$\{locale\}\/`/);
  assert.match(page, /`\/\$\{locale\}\/games\/memory-corridor`/);
  assert.match(page, /観測記録が見つかりません/);
  assert.match(page, /Observation not found/);
});

test('the compact runner reuses the approved Memory Corridor production art', async () => {
  const runner = await readProjectFile('../src/components/NotFoundRunner.astro');

  for (const asset of [
    'memory-corridor-pixel-bg.png',
    'archive-objects-pixel.png',
    'creature-idle.png',
    'creature-run-a.png',
    'creature-run-b.png',
    'creature-jump.png',
  ]) {
    assert.match(runner, new RegExp(asset.replace('.', '\\.')));
  }
});
