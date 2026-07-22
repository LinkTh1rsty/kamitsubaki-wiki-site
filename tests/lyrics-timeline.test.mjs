import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  DEFAULT_KARAOKE_TAIL_DURATION,
  formatKaraokeProgress,
  getKaraokeProgress,
  resolveKaraokeEndTime,
} from '../src/lib/lyricsTimeline.mjs';

test('karaoke progress is continuous and clamped to the timed unit', () => {
  assert.equal(getKaraokeProgress(-1, 2, 4), 0);
  assert.equal(getKaraokeProgress(2, 2, 4), 0);
  assert.equal(getKaraokeProgress(3, 2, 4), 0.5);
  assert.equal(getKaraokeProgress(5, 2, 4), 1);
  assert.equal(getKaraokeProgress('invalid', 2, 4), 0);
  assert.equal(getKaraokeProgress(null, 2, 4), 0);
  assert.equal(formatKaraokeProgress(1 / 3), '33.3%');
});

test('karaoke units prefer authored word boundaries and fall back at line endings', () => {
  assert.equal(resolveKaraokeEndTime(2, 2.8, 6), 2.8);
  assert.equal(resolveKaraokeEndTime(2.8, undefined, 6), 6);
  assert.equal(
    resolveKaraokeEndTime(6, undefined, undefined),
    6 + DEFAULT_KARAOKE_TAIL_DURATION,
  );
  assert.equal(resolveKaraokeEndTime(undefined, 2.8, 6), null);
});

test('synchronized lyrics expose karaoke fill, completion, and reduced-motion states', async () => {
  const [interactions, styles] = await Promise.all([
    readFile(new URL('../src/scripts/siteInteractions.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
  ]);

  assert.match(interactions, /resolveKaraokeEndTime/);
  assert.match(interactions, /--karaoke-progress/);
  assert.match(interactions, /classList\.toggle\('is-complete'/);
  assert.match(interactions, /setAttribute\('aria-current', 'true'\)/);
  assert.match(interactions, /querySelectorAll\('\.lrc-tag\[data-time\]'\)/);
  assert.match(interactions, /timelineButtons\.forEach\(\(button\) => button\.remove\(\)\)/);
  assert.match(interactions, /currentTime >= this\.duration[\s\S]*setPlaying\(false\)/);
  assert.match(styles, /linear-gradient\([\s\S]*--karaoke-progress/);
  assert.match(styles, /background-clip:\s*text/);
  assert.match(styles, /\.lrc-word rt[\s\S]*-webkit-text-fill-color:\s*currentColor/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce/);
});
