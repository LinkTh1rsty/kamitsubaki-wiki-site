import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveLocaleLocation } from '../src/lib/localeLocation.mjs';

test('language links retain current gallery filters and anchors without replacing translation-specific values', () => {
  assert.equal(preserveLocaleLocation('/ja/gallery/?lang=ja', 'https://wiki.example/zh/gallery/?q=kaf&tag=cover&tag=live&lang=zh#photo'),
    '/ja/gallery/?q=kaf&tag=cover&tag=live&lang=ja#photo');
  assert.equal(preserveLocaleLocation('https://other.example/en/', 'https://wiki.example/zh/?secret=private#draft'),
    'https://other.example/en/');
});
