import {
  getCollection as getAstroCollection,
  type CollectionEntry,
  type CollectionKey,
} from 'astro:content';
import { buildContentIndex } from './missingData.mjs';

/**
 * Astro/Vite may re-evaluate page modules independently during SSG, so a plain
 * module-level Map is not enough. Keep the lazy Promise cache on globalThis so
 * every static page shares one songs/albums/artists/site snapshot + content index.
 */
const GLOBAL_KEY = Symbol.for('kamitsubaki.contentAuditContext.store');

type MusicCollections = {
  songs: CollectionEntry<'songs'>[];
  albums: CollectionEntry<'albums'>[];
  artists: CollectionEntry<'artists'>[];
};

export type ContentAuditIndex = ReturnType<typeof buildContentIndex>;

export type ContentAuditContext = MusicCollections & {
  site: CollectionEntry<'site'>[];
  index: ContentAuditIndex;
};

type Store = {
  getCollection: <C extends CollectionKey>(collection: C) => Promise<CollectionEntry<C>[]>;
  getMusicCollections: () => Promise<MusicCollections>;
  getContentIndex: () => Promise<ContentAuditIndex>;
  getContext: () => Promise<ContentAuditContext>;
};

function isBuildCacheEnabled() {
  // Production static builds share one Node process; dev must see live edits.
  return Boolean(import.meta.env.PROD);
}

function getStore(): Store {
  const globalStore = globalThis as typeof globalThis & { [GLOBAL_KEY]?: Store };
  const existing = globalStore[GLOBAL_KEY];
  if (existing) return existing;

  const cacheEnabled = isBuildCacheEnabled();
  const pending = new Map<string, Promise<unknown>>();
  let indexPromise: Promise<ContentAuditIndex> | null = null;
  let contextPromise: Promise<ContentAuditContext> | null = null;

  function readCollection<C extends CollectionKey>(
    collection: C,
  ): Promise<CollectionEntry<C>[]> {
    if (!cacheEnabled) {
      return getAstroCollection(collection);
    }

    if (!pending.has(collection)) {
      const result = Promise.resolve().then(() => getAstroCollection(collection)) as Promise<
        CollectionEntry<C>[]
      >;
      pending.set(collection, result);
      result.catch(() => pending.delete(collection));
    }

    return pending.get(collection) as Promise<CollectionEntry<C>[]>;
  }

  async function getMusicCollections(): Promise<MusicCollections> {
    const [songs, albums, artists] = await Promise.all([
      readCollection('songs'),
      readCollection('albums'),
      readCollection('artists'),
    ]);
    return { songs, albums, artists };
  }

  function getContentIndex(): Promise<ContentAuditIndex> {
    if (!cacheEnabled) {
      return getMusicCollections().then((collections) => buildContentIndex(collections));
    }

    if (!indexPromise) {
      indexPromise = getMusicCollections().then((collections) => buildContentIndex(collections));
      indexPromise.catch(() => {
        indexPromise = null;
      });
    }

    return indexPromise;
  }

  function getContext(): Promise<ContentAuditContext> {
    if (!cacheEnabled) {
      return (async () => {
        const music = await getMusicCollections();
        const site = await readCollection('site');
        return {
          ...music,
          site,
          index: buildContentIndex(music),
        };
      })();
    }

    if (!contextPromise) {
      contextPromise = (async () => {
        const [music, site, index] = await Promise.all([
          getMusicCollections(),
          readCollection('site'),
          getContentIndex(),
        ]);
        return { ...music, site, index };
      })();
      contextPromise.catch(() => {
        contextPromise = null;
      });
    }

    return contextPromise;
  }

  const store: Store = {
    getCollection: readCollection,
    getMusicCollections,
    getContentIndex,
    getContext,
  };

  globalStore[GLOBAL_KEY] = store;
  return store;
}

export function getBuildCollection<C extends CollectionKey>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  return getStore().getCollection(collection);
}

/** Page-facing alias so call sites keep reading like astro:content getCollection. */
export { getBuildCollection as getCollection };

export function getMusicAuditContext(): Promise<MusicCollections> {
  return getStore().getMusicCollections();
}

export function getContentAuditIndex(): Promise<ContentAuditIndex> {
  return getStore().getContentIndex();
}

export function getContentAuditContext(): Promise<ContentAuditContext> {
  return getStore().getContext();
}
