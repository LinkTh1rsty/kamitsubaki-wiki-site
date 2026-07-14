import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('artist hover backgrounds are loaded on demand instead of during idle time', async () => {
  const script = await readProjectFile('../src/scripts/siteInteractions.js');

  assert.match(script, /row\.addEventListener\('mouseenter'/);
  assert.match(script, /bgImg\.src = row\.getAttribute\('data-img'\)/);
  assert.doesNotMatch(script, /preloadArtistImages/);
  assert.doesNotMatch(script, /new Image\(\)/);
  assert.doesNotMatch(script, /requestIdleCallback/);
});
