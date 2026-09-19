import type { CollectionEntry, CollectionKey } from 'astro:content';
import { getBuildCollection } from './contentAuditContext';

/**
 * Thin re-export. Collection loading and the content-audit index share one
 * globalThis-backed cache (see contentAuditContext.ts).
 */
export function getBuildCollectionCached<C extends CollectionKey>(
  collection: C,
): Promise<CollectionEntry<C>[]> {
  return getBuildCollection(collection);
}

export { getBuildCollection };
