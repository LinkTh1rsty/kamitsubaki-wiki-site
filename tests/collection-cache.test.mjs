import assert from 'node:assert/strict';
import test from 'node:test';
import { createCollectionCache } from '../src/lib/collectionCache.mjs';

test('a build loads each collection once even when pages request it concurrently', async () => {
  const calls = [];
  const read = createCollectionCache(async (collection) => {
    calls.push(collection);
    return [{ id: `${collection}/zh`, data: { locale: 'zh' } }];
  }, { enabled: true });

  const pages = await Promise.all(Array.from({ length: 100 }, () => read('songs')));
  assert.deepEqual(calls, ['songs']);
  for (const entries of pages) assert.strictEqual(entries, pages[0]);
  assert.strictEqual(await read('songs'), pages[0]);
  assert.deepEqual(await read('albums'), [{ id: 'albums/zh', data: { locale: 'zh' } }]);
  assert.deepEqual(calls, ['songs', 'albums']);
});

test('development reads reflect edits, additions, and deletions', async () => {
  let entries = [{ id: 'one', data: { title: 'Original' } }];
  const read = createCollectionCache(async () => entries);
  assert.equal((await read('songs'))[0].data.title, 'Original');

  entries = [{ id: 'one', data: { title: 'Edited' } }, { id: 'two' }];
  assert.deepEqual(await read('songs'), entries);
  entries = [];
  assert.deepEqual(await read('songs'), []);
});

test('a rejected build read can be retried', async () => {
  let calls = 0;
  const read = createCollectionCache(async () => {
    if (++calls === 1) throw new Error('read failed');
    return [{ id: 'recovered' }];
  }, { enabled: true });

  await assert.rejects(read('songs'), /read failed/);
  assert.deepEqual(await read('songs'), [{ id: 'recovered' }]);
  assert.equal(calls, 2);
});
