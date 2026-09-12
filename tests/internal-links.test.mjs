import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

function projectUrl(relativePath) {
  return new URL(relativePath, import.meta.url);
}

async function readSource(relativePath) {
  return readFile(projectUrl(relativePath), 'utf8');
}

test('Issue #35: piedpiper artist entry points to canonical V.W.P group route', async () => {
  const source = await readSource('../src/content/artists/creators/piedpiper/zh.md');
  assert.doesNotMatch(source, /href:\s*"\/zh\/artists\/vwp"/);
  assert.match(source, /href:\s*"\/zh\/artists\/vwp\/vwp"/);
  assert.match(source, /\[V\.W\.P\]\(\/zh\/artists\/vwp\/vwp\)/);
});

test('Issue #35: koko artist entry points to canonical normalized song route without middle dot', async () => {
  const source = await readSource('../src/content/artists/vwp/koko/zh.md');
  assert.doesNotMatch(source, /\/songs\/koko\/originals\/レイヴン・フリージア-raven-freesia/);
  assert.match(source, /\/songs\/koko\/originals\/レイヴンフリージア-raven-freesia/);
});

test('Issue #35: guiano artist entry points to canonical normalized song route without comma', async () => {
  const source = await readSource('../src/content/artists/creators/guiano/ja.md');
  assert.doesNotMatch(source, /\/songs\/guiano\/originals\/私ha,私達ha/);
  assert.match(source, /\/songs\/guiano\/originals\/私ha私達ha/);
});

test('Issue #35: prayer album songId references the normalized song slug', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const source = await readSource(`../src/content/albums/koko/prayer/${locale}.md`);
    assert.doesNotMatch(source, /songId:\s*"koko\/originals\/レイヴン・フリージア-raven-freesia"/);
    assert.match(source, /songId:\s*"koko\/originals\/レイヴンフリージア-raven-freesia"/);
  }
});
