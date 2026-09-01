import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildGraphQuestion,
  getSpriteDrawY,
  getTerrainTileGeometry,
  isDirectConnection,
  resolveGraphAnswer,
  selectGraphPath,
} from '../public/games/kamitsubaki-explorer/game-core.mjs';

const graphCatalog = [
  { kind: 'artist', id: 'vwp/kaf', title: '花譜', relatedKey: 'kaf', facts: ['观测代号 / 01'], connections: ['song:kaf/dark', 'album:kaf/kansoku'] },
  { kind: 'song', id: 'kaf/dark', title: '暗闇', relatedKey: 'kaf', facts: ['演唱 / 花譜×ヰ世界情緒', '收录 / 暗闇'], connections: ['artist:vwp/kaf', 'artist:vwp/isekaijoucho', 'album:kaf/dark'] },
  { kind: 'album', id: 'kaf/dark', title: '暗闇', relatedKey: 'kaf', facts: ['演唱 / 花譜', '曲目数 / 5'], connections: ['song:kaf/dark', 'song:kaf/abyss'] },
  { kind: 'song', id: 'kaf/abyss', title: '深淵', relatedKey: 'kaf', facts: ['演唱 / ヰ世界情緒×花譜'], connections: ['album:kaf/dark'] },
  { kind: 'artist', id: 'vwp/isekaijoucho', title: 'ヰ世界情緒', relatedKey: 'isekaijoucho', facts: ['观测代号 / 04'], connections: ['song:kaf/dark'] },
  { kind: 'album', id: 'kaf/kansoku', title: '観測', relatedKey: 'kaf', facts: ['演唱 / 花譜'], connections: ['artist:vwp/kaf'] },
  { kind: 'album', id: 'kaf/majo', title: '魔女', relatedKey: 'kaf', facts: ['演唱 / 花譜'], connections: [] },
  { kind: 'album', id: 'rim/new-romancer', title: 'NEW ROMANCER', relatedKey: 'rim', facts: ['演唱 / 理芽'], connections: [] },
  { kind: 'song', id: 'rim/flower', title: '食虫植物', relatedKey: 'rim', facts: ['演唱 / 理芽'], connections: [] },
  { kind: 'song', id: 'koko/blank', title: 'blank', relatedKey: 'koko', facts: ['演唱 / 幸祜'], connections: [] },
];

test('idle GMD feet and the visible ground contact edge resolve to the same world pixel', () => {
  const playerBottom = 606;
  const spriteDrawY = getSpriteDrawY(playerBottom, 0, 104);
  const ground = getTerrainTileGeometry('ground', 606, 158);

  assert.equal(Number(spriteDrawY.toFixed(3)), 516.939);
  assert.equal(Number((spriteDrawY + (310 / 362) * 104).toFixed(3)), 606);
  assert.equal(Number((ground.drawY + ground.surfaceOffset).toFixed(3)), 606);
});

test('walking and running frames keep their visible feet on the collision plane', () => {
  const expectedFeet = [310, 308, 312, 313, 303, 302];
  expectedFeet.forEach((footPixel, frameIndex) => {
    const drawY = getSpriteDrawY(510, frameIndex, 104);
    assert.equal(Number((drawY + (footPixel / 362) * 104).toFixed(3)), 510);
  });
});

test('cropped terrain aligns its visible support edge without burying the player', () => {
  const ground = getTerrainTileGeometry('ground', 606, 158);
  const platform = getTerrainTileGeometry('platform', 444, 112);

  assert.deepEqual(ground.source, { x: 71, y: 91, width: 195, height: 157, surfaceY: 18 });
  assert.equal(ground.drawWidth, 158);
  assert.equal(Number(ground.drawY.toFixed(3)), 591.415);
  assert.equal(Number((ground.drawY + ground.surfaceOffset).toFixed(3)), 606);

  assert.deepEqual(platform.source, { x: 691, y: 428, width: 189, height: 94, surfaceY: 1 });
  assert.equal(platform.drawWidth, 112);
  assert.equal(Number(platform.drawY.toFixed(3)), 443.407);
  assert.equal(Number((platform.drawY + platform.surfaceOffset).toFixed(3)), 444);
});

test('memory path is a continuous chain of real Wiki graph edges', () => {
  const path = selectGraphPath(graphCatalog[0], graphCatalog, 3);

  assert.deepEqual(path.map((item) => item.title), ['花譜', '暗闇', '暗闇', '深淵']);
  for (let index = 0; index < path.length - 1; index += 1) {
    assert.equal(isDirectConnection(path[index], path[index + 1]), true);
  }
});

test('relationship question asks for the missing graph node with plausible unconnected distractors', () => {
  const path = selectGraphPath(graphCatalog[0], graphCatalog, 3);
  const question = buildGraphQuestion(path, 1, graphCatalog);

  assert.equal(question.pathLabel, '花譜 → 暗闇 → ?');
  assert.equal(question.correct.title, '暗闇');
  assert.equal(question.clue, '演唱 / 花譜 · 曲目数 / 5');
  assert.match(question.prompt, /Wiki 关系链/);
  assert.equal(question.options.length, 3);
  assert.equal(question.options.every((item) => item.kind === 'album'), true);
  question.options.filter((item) => item.id !== question.correct.id).forEach((distractor) => {
    assert.equal(isDirectConnection(path[1], distractor), false);
  });
  assert.match(question.hint, /暗闇 → 暗闇/);
  assert.match(question.hint, /收录 \/ 暗闇/);
});

test('relationship question never pads its options with another real neighbor', () => {
  const path = selectGraphPath(graphCatalog[0], graphCatalog, 3);
  const unrelatedAlbum = graphCatalog.find((item) => item.id === 'kaf/majo');
  const connectedAlternative = {
    kind: 'album',
    id: 'kaf/connected-alternative',
    title: '另一张真实相邻专辑',
    relatedKey: 'kaf',
    facts: ['演唱 / 花譜'],
    connections: ['song:kaf/dark'],
  };
  const sparseCatalog = [...path, unrelatedAlbum, connectedAlternative];
  const question = buildGraphQuestion(path, 1, sparseCatalog);

  assert.equal(question.options.length, 2);
  question.options.filter((item) => item.id !== question.correct.id).forEach((distractor) => {
    assert.equal(isDirectConnection(path[1], distractor), false);
  });
});

test('a wrong graph answer costs health and never awards the fragment', () => {
  const question = buildGraphQuestion(selectGraphPath(graphCatalog[0], graphCatalog, 3), 1, graphCatalog);
  const wrongChoice = question.options.find((item) => item.id !== question.correct.id);
  const outcome = resolveGraphAnswer({ health: 3 }, wrongChoice, question);

  assert.deepEqual(outcome, {
    correct: false,
    health: 2,
    awardFragment: false,
    hint: '真实关联：暗闇 → 暗闇 · 收录 / 暗闇',
  });
});

test('only the exact connected graph node awards the fragment', () => {
  const question = buildGraphQuestion(selectGraphPath(graphCatalog[0], graphCatalog, 3), 1, graphCatalog);
  const outcome = resolveGraphAnswer({ health: 2 }, question.correct, question);

  assert.deepEqual(outcome, {
    correct: true,
    health: 2,
    awardFragment: true,
    hint: question.hint,
  });
});
