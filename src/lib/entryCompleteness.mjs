/** Completeness scoring rules for songs / albums / artists frontmatter. */

const ARRAY_FIELDS = new Set([
  'officialLinks',
  'lyricsSources',
  'featuredEntries',
  'tracks',
  'affiliations',
  'designCredits',
]);

/** @typedef {{ field: string, weight: number, check?: (value: unknown, data: Record<string, unknown>) => boolean }} CompletenessRule */

/** @type {Record<'songs' | 'albums' | 'artists', CompletenessRule[]>} */
export const COMPLETENESS_RULES = Object.freeze({
  songs: Object.freeze([
    { field: 'image', weight: 2 },
    { field: 'releaseDate', weight: 2 },
    { field: 'composer', weight: 2 },
    { field: 'lyricist', weight: 2 },
    { field: 'lyricsSources', weight: 2 },
    { field: 'album', weight: 1 },
    { field: 'duration', weight: 1 },
    { field: 'code', weight: 1 },
    { field: 'categoryTitle', weight: 1 },
  ]),
  albums: Object.freeze([
    { field: 'image', weight: 2 },
    { field: 'releaseDate', weight: 2 },
    { field: 'tracks', weight: 2 },
    { field: 'type', weight: 1 },
    { field: 'label', weight: 1 },
    { field: 'catalogNumber', weight: 1 },
    { field: 'trackCount', weight: 1 },
    { field: 'description', weight: 1 },
    { field: 'romanizedTitle', weight: 1 },
    { field: 'officialLinks', weight: 1 },
  ]),
  artists: Object.freeze([
    { field: 'profileTagline', weight: 2 },
    { field: 'officialLinks', weight: 2 },
    { field: 'debutDate', weight: 1 },
    { field: 'meta', weight: 1 },
    { field: 'affiliations', weight: 1 },
    { field: 'designCredits', weight: 1 },
    { field: 'featuredEntries', weight: 1 },
    { field: 'categoryTitle', weight: 1 },
  ]),
});

function defaultCheck(value) {
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * @param {'songs' | 'albums' | 'artists'} collection
 * @param {Record<string, unknown>} data
 */
export function computeCompleteness(collection, data) {
  const rules = COMPLETENESS_RULES[collection];
  if (!rules) {
    throw new Error(`Unknown collection for completeness scoring: ${collection}`);
  }

  let earned = 0;
  let total = 0;
  /** @type {{ field: string, weight: number }[]} */
  const missing = [];

  for (const rule of rules) {
    total += rule.weight;
    const value = data?.[rule.field];
    const check = rule.check ?? defaultCheck;
    const present = Array.isArray(value) && ARRAY_FIELDS.has(rule.field)
      ? value.length > 0
      : check(value, data);

    if (present) {
      earned += rule.weight;
    } else {
      missing.push({ field: rule.field, weight: rule.weight });
    }
  }

  missing.sort((a, b) => b.weight - a.weight || a.field.localeCompare(b.field));

  let score = total === 0 ? 100 : Math.round((earned / total) * 100);
  if (collection === 'artists' && data?.contentStatus === 'stub') {
    score = Math.min(score, 29);
  }

  return { score, missing, earned, total };
}

/** @param {number} score */
export function completenessTier(score) {
  if (score >= 90) return 'complete';
  if (score >= 60) return 'good';
  if (score >= 30) return 'brief';
  return 'stub';
}
