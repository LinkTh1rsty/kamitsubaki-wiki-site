import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PERSONAL_STATE_DOMAINS,
  emptyPersonalState,
  hasPersonalStateItem,
  personalStateOwner,
  personalStateStorageKey,
  readPersonalState,
  removePersonalStateItem,
  setPersonalStateOwner,
  upsertPersonalStateItem,
  validatePersonalState,
  writePersonalState,
} from '../src/lib/personalState.mjs';
import { setLibraryOwner } from '../src/lib/personalLibrary.mjs';

function createStorage() {
  const data = new Map();
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
}

const historyItem = {
  path: '/zh/songs/kaf/originals/shi/',
  title: '箴',
};

test('guest and account personal-state keys stay separate', () => {
  const storage = createStorage();
  setPersonalStateOwner(null);
  setLibraryOwner(null);

  upsertPersonalStateItem(storage, 'history', historyItem, 1000);
  assert.equal(personalStateStorageKey('history'), 'kamitsubaki-history-v1');
  assert.equal(readPersonalState(storage, 'history').items.length, 1);

  setPersonalStateOwner('alice');
  assert.equal(readPersonalState(storage, 'history').items.length, 0);
  upsertPersonalStateItem(storage, 'history', {
    ...historyItem,
    path: '/ja/songs/kaf/originals/shi/',
  }, 2000);
  assert.equal(readPersonalState(storage, 'history').items.length, 1);

  setPersonalStateOwner(null);
  assert.equal(readPersonalState(storage, 'history').items.length, 1);
  assert.equal(readPersonalState(storage, 'history').items[0].visitedAt, 1000);
  setPersonalStateOwner(null);
  assert.equal(personalStateOwner(), null);
});

test('history upsert moves newest visit to front and stamps visitedAt', () => {
  const storage = createStorage();
  setPersonalStateOwner(null);

  upsertPersonalStateItem(storage, 'history', historyItem, 10);
  upsertPersonalStateItem(storage, 'history', {
    path: '/zh/songs/kaf/originals/レトリカ/',
    title: 'レトリカ',
  }, 20);
  upsertPersonalStateItem(storage, 'history', historyItem, 30);

  const items = readPersonalState(storage, 'history').items;
  assert.equal(items.length, 2);
  assert.equal(items[0].path, '/zh/songs/kaf/originals/shi/');
  assert.equal(items[0].visitedAt, 30);
  assert.equal(items[0].kind, 'songs');
  assert.equal(items[1].visitedAt, 20);
});

test('following / heard / badges / drafts accept domain-specific items', () => {
  const storage = createStorage();
  setPersonalStateOwner(null);

  upsertPersonalStateItem(storage, 'following', {
    path: '/zh/artists/vwp/kaf/',
    title: '花譜',
  }, 1);
  upsertPersonalStateItem(storage, 'heard', {
    path: '/zh/songs/kaf/originals/shi/',
    title: '箴',
  }, 2);
  upsertPersonalStateItem(storage, 'badges', { id: 'heard-10' }, 3);
  upsertPersonalStateItem(storage, 'drafts', {
    id: 'draft-1',
    collection: 'songs',
    title: '新歌草稿',
  }, 4);

  assert.equal(readPersonalState(storage, 'following').items[0].followedAt, 1);
  assert.equal(readPersonalState(storage, 'heard').items[0].heardAt, 2);
  assert.equal(readPersonalState(storage, 'badges').items[0].id, 'heard-10');
  assert.equal(readPersonalState(storage, 'drafts').items[0].collection, 'songs');
  assert.ok(hasPersonalStateItem(storage, 'badges', 'heard-10'));
});

test('removePersonalStateItem drops by path or id', () => {
  const storage = createStorage();
  setPersonalStateOwner(null);
  upsertPersonalStateItem(storage, 'heard', historyItem, 1);
  removePersonalStateItem(storage, 'heard', '/zh/songs/kaf/originals/shi/');
  assert.equal(readPersonalState(storage, 'heard').items.length, 0);
});

test('validatePersonalState rejects wrong version and bad path-bound items', () => {
  assert.throws(
    () => validatePersonalState('history', { version: 2, items: [] }),
    /Invalid personal state/,
  );
  assert.throws(
    () => validatePersonalState('history', {
      version: 1,
      items: [{ path: '/nope', title: 'x' }],
    }),
    /Invalid path-bound item/,
  );
});

test('corrupt storage falls back to empty state', () => {
  const storage = createStorage();
  setPersonalStateOwner(null);
  storage.setItem(personalStateStorageKey('heard'), '{not-json');
  assert.deepEqual(readPersonalState(storage, 'heard'), emptyPersonalState('heard'));
});

test('unknown domain throws', () => {
  assert.throws(() => personalStateStorageKey('library'), /Unknown personal state domain/);
  assert.throws(() => writePersonalState(createStorage(), 'library', emptyPersonalState('history')), /Unknown personal state domain/);
});

test('domain registry exposes versioned keys for later phases', () => {
  assert.deepEqual(Object.keys(PERSONAL_STATE_DOMAINS).sort(), [
    'badges',
    'drafts',
    'following',
    'heard',
    'history',
  ]);
  assert.equal(PERSONAL_STATE_DOMAINS.history.key, 'kamitsubaki-history-v1');
  assert.equal(PERSONAL_STATE_DOMAINS.following.key, 'kamitsubaki-following-v1');
  assert.equal(PERSONAL_STATE_DOMAINS.heard.key, 'kamitsubaki-heard-v1');
  assert.equal(PERSONAL_STATE_DOMAINS.badges.key, 'kamitsubaki-badges-v1');
  assert.equal(PERSONAL_STATE_DOMAINS.drafts.key, 'kamitsubaki-drafts-v1');
});
