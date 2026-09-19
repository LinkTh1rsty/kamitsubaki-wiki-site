/**
 * Reuse immutable collection snapshots during a static build. Callers must not
 * mutate entries. Development reads bypass the cache so file edits stay live.
 *
 * Pass `sharedKey` to keep pending promises on globalThis — required when Astro
 * may re-evaluate the importing module once per static page.
 */
const SHARED_STORE_KEY = Symbol.for('kamitsubaki.collectionCache.shared');

function getSharedPending(sharedKey) {
  const store = (globalThis[SHARED_STORE_KEY] ??= new Map());
  if (!store.has(sharedKey)) store.set(sharedKey, new Map());
  return store.get(sharedKey);
}

export function createCollectionCache(
  loadCollection,
  { enabled = false, sharedKey = null } = {},
) {
  const pending = sharedKey ? getSharedPending(sharedKey) : new Map();

  return async function readCollection(collection) {
    if (!enabled) return loadCollection(collection);

    if (!pending.has(collection)) {
      const result = Promise.resolve().then(() => loadCollection(collection));
      pending.set(collection, result);
      // A failed read must not poison all subsequent requests for this collection.
      result.catch(() => pending.delete(collection));
    }

    return pending.get(collection);
  };
}
