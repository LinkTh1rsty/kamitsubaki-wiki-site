import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {metadataCopy} from '../src/lib/metadata-copy';
import {metadataGuide} from '../src/lib/metadata-guide';

test('every metadata help description has explicit English and Japanese copy', () => {
  const source = readFileSync(new URL('../src/lib/metadata-guide.ts', import.meta.url), 'utf8');
  for (const [, text] of source.matchAll(/description: '([^']*)'/g)) {
    assert.ok(metadataCopy[text]?.every(value => value && value !== text), text);
  }
});

test('nested and fallback guides localize at the shared boundary without changing values', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  try {
    for (const locale of ['en', 'ja']) {
      Object.defineProperty(globalThis, 'window', {configurable: true, value: {__WIKI_EDITOR_HOST__: {locale}}});
      for (const path of ['id', 'credits.0.name', 'affiliations.2.startDate', 'legacy.startDate', 'custom.url', 'custom.entity', 'custom.label', 'custom.unknown']) {
        const guide = metadataGuide(path);
        assert.ok(guide.description);
        assert.ok(Object.values(metadataCopy).some(pair => pair[locale === 'en' ? 0 : 1] === guide.description), path);
      }
      assert.equal(metadataGuide('releaseDate').placeholder, locale === 'en' ? 'e.g. 2026-10-13' : '例：2026-10-13');
    }
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
