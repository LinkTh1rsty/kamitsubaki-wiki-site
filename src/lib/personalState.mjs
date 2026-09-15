import { safeLibraryPath } from './personalLibrary.mjs';

/**
 * Versioned personal-state shells (Phase 0).
 * Domains: history / following / heard / badges / drafts (side channel).
 * Library favorites stay in personalLibrary.mjs — do not merge them here.
 */

export const PERSONAL_STATE_VERSION = 1;

export const PERSONAL_STATE_DOMAINS = Object.freeze({
  history: Object.freeze({
    key: 'kamitsubaki-history-v1',
    maxItems: 200,
    pathBound: true,
  }),
  following: Object.freeze({
    key: 'kamitsubaki-following-v1',
    maxItems: 200,
    pathBound: true,
  }),
  heard: Object.freeze({
    key: 'kamitsubaki-heard-v1',
    maxItems: 2000,
    pathBound: true,
  }),
  badges: Object.freeze({
    key: 'kamitsubaki-badges-v1',
    maxItems: 100,
    pathBound: false,
  }),
  drafts: Object.freeze({
    key: 'kamitsubaki-drafts-v1',
    maxItems: 50,
    pathBound: false,
  }),
});

export const PERSONAL_STATE_DOMAIN_IDS = Object.freeze(
  Object.keys(PERSONAL_STATE_DOMAINS),
);

const CHANGE_EVENT = 'kamitsubaki-personal-state-change';

let owner = null;

export function personalStateOwner() {
  return owner;
}

/** @param {string | null | undefined} value */
export function setPersonalStateOwner(value) {
  owner = value || null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

/** @param {keyof typeof PERSONAL_STATE_DOMAINS} domain */
export function assertPersonalStateDomain(domain) {
  if (!PERSONAL_STATE_DOMAINS[domain]) {
    throw new Error(`Unknown personal state domain: ${domain}`);
  }
  return PERSONAL_STATE_DOMAINS[domain];
}

/**
 * Storage key is versioned and optionally account-scoped.
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 */
export function personalStateStorageKey(domain) {
  const config = assertPersonalStateDomain(domain);
  return owner ? `${config.key}:account:${owner}` : config.key;
}

/** @param {keyof typeof PERSONAL_STATE_DOMAINS} domain */
export function emptyPersonalState(domain) {
  assertPersonalStateDomain(domain);
  return { version: PERSONAL_STATE_VERSION, items: [] };
}

function clampItems(items, maxItems) {
  return items.length > maxItems ? items.slice(0, maxItems) : items;
}

function normalizeTimestamp(value, fallback) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

/**
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 * @param {unknown} value
 */
export function validatePersonalState(domain, value) {
  const config = assertPersonalStateDomain(domain);

  if (
    !value ||
    typeof value !== 'object' ||
    value.version !== PERSONAL_STATE_VERSION ||
    !Array.isArray(value.items)
  ) {
    throw new Error(`Invalid personal state for ${domain}`);
  }

  if (value.items.length > config.maxItems) {
    throw new Error(`Personal state too large for ${domain}`);
  }

  const seen = new Set();
  const items = [];

  for (const raw of value.items) {
    if (!raw || typeof raw !== 'object') throw new Error(`Invalid item in ${domain}`);

    if (config.pathBound) {
      const path = safeLibraryPath(raw.path);
      if (!path || typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 300) {
        throw new Error(`Invalid path-bound item in ${domain}`);
      }
      if (seen.has(path)) continue;
      seen.add(path);

      if (domain === 'history') {
        items.push({
          path,
          title: raw.title,
          kind: path.split('/')[2],
          visitedAt: normalizeTimestamp(raw.visitedAt, 0),
        });
      } else if (domain === 'following') {
        items.push({
          path,
          title: raw.title,
          kind: path.split('/')[2],
          followedAt: normalizeTimestamp(raw.followedAt, 0),
        });
      } else {
        items.push({
          path,
          title: raw.title,
          kind: path.split('/')[2],
          heardAt: normalizeTimestamp(raw.heardAt, 0),
        });
      }
      continue;
    }

    if (domain === 'badges') {
      if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 100) {
        throw new Error('Invalid badge item');
      }
      const id = raw.id.trim();
      if (seen.has(id)) continue;
      seen.add(id);
      items.push({
        id,
        earnedAt: normalizeTimestamp(raw.earnedAt, 0),
      });
      continue;
    }

    // drafts side channel
    if (typeof raw.id !== 'string' || !raw.id.trim() || raw.id.length > 120) {
      throw new Error('Invalid draft item');
    }
    if (typeof raw.collection !== 'string' || !raw.collection.trim()) {
      throw new Error('Invalid draft collection');
    }
    if (typeof raw.title !== 'string' || !raw.title.trim() || raw.title.length > 300) {
      throw new Error('Invalid draft title');
    }
    const id = raw.id.trim();
    if (seen.has(id)) continue;
    seen.add(id);
    items.push({
      id,
      collection: raw.collection.trim(),
      title: raw.title.trim(),
      updatedAt: normalizeTimestamp(raw.updatedAt, 0),
      ...(typeof raw.status === 'string' && raw.status ? { status: raw.status } : {}),
    });
  }

  return { version: PERSONAL_STATE_VERSION, items: clampItems(items, config.maxItems) };
}

function emitChange(domain) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { domain, owner } }));
}

/**
 * @param {{ getItem(key: string): string | null }} storage
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 */
export function readPersonalState(storage, domain) {
  assertPersonalStateDomain(domain);
  const raw = storage.getItem(personalStateStorageKey(domain));
  if (!raw) return emptyPersonalState(domain);
  try {
    return validatePersonalState(domain, JSON.parse(raw));
  } catch {
    return emptyPersonalState(domain);
  }
}

/**
 * @param {{ setItem(key: string, value: string): void }} storage
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 * @param {{ version: number, items: unknown[] }} value
 */
export function writePersonalState(storage, domain, value) {
  const next = validatePersonalState(domain, value);
  storage.setItem(personalStateStorageKey(domain), JSON.stringify(next));
  emitChange(domain);
  return next;
}

function itemId(domain, item) {
  if (domain === 'badges' || domain === 'drafts') return item?.id;
  return item?.path;
}

function withTimestamp(domain, item, now) {
  if (domain === 'history') return { ...item, visitedAt: now };
  if (domain === 'following') return { ...item, followedAt: now };
  if (domain === 'heard') return { ...item, heardAt: now };
  if (domain === 'badges') return { ...item, earnedAt: now };
  return { ...item, updatedAt: now };
}

function timestampField(domain) {
  if (domain === 'history') return 'visitedAt';
  if (domain === 'following') return 'followedAt';
  if (domain === 'heard') return 'heardAt';
  if (domain === 'badges') return 'earnedAt';
  return 'updatedAt';
}

/**
 * Insert or refresh a domain item. Path-bound domains move the item to the front.
 * @param {{ getItem(key: string): string | null, setItem(key: string, value: string): void }} storage
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 * @param {Record<string, unknown>} item
 * @param {number} [now]
 */
export function upsertPersonalStateItem(storage, domain, item, now = Date.now()) {
  const config = assertPersonalStateDomain(domain);
  const current = readPersonalState(storage, domain);
  const normalized = validatePersonalState(domain, {
    version: PERSONAL_STATE_VERSION,
    items: [withTimestamp(domain, item, now)],
  }).items[0];

  const id = itemId(domain, normalized);
  const items = [
    normalized,
    ...current.items.filter((existing) => itemId(domain, existing) !== id),
  ];

  return writePersonalState(storage, domain, {
    version: PERSONAL_STATE_VERSION,
    items: clampItems(items, config.maxItems),
  });
}

/**
 * @param {{ getItem(key: string): string | null, setItem(key: string, value: string): void }} storage
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 * @param {string} id path or badge/draft id
 */
export function removePersonalStateItem(storage, domain, id) {
  assertPersonalStateDomain(domain);
  const current = readPersonalState(storage, domain);
  return writePersonalState(storage, domain, {
    version: PERSONAL_STATE_VERSION,
    items: current.items.filter((item) => itemId(domain, item) !== id),
  });
}

/**
 * @param {{ getItem(key: string): string | null }} storage
 * @param {keyof typeof PERSONAL_STATE_DOMAINS} domain
 * @param {string} id
 */
export function hasPersonalStateItem(storage, domain, id) {
  return readPersonalState(storage, domain).items.some((item) => itemId(domain, item) === id);
}

/** Convenience export for UI copy / tests. */
export function personalStateChangeEventType() {
  return CHANGE_EVENT;
}

export { timestampField };
