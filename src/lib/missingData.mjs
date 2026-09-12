import { foldCjkSearchText } from './cjkSearch.mjs';
import { computeCompleteness } from './entryCompleteness.mjs';

/** Hand-maintained locales only. zh-tw / zh-hk are generated and never checked. */
export const MAINTAINED_LOCALES = Object.freeze(['zh', 'ja', 'en']);

/** Stable issue kind enum consumed by Phase 5. Do not rename. */
export const ISSUE_KINDS = Object.freeze([
  'missing-fields',
  'missing-locale',
  'unknown-artist',
  'album-not-linked',
  'track-song-missing',
  'tracks-unlinked',
  'thin-body',
]);

const THIN_BODY_MIN_LENGTH = 50;

function splitEntryId(entryId) {
  const parts = String(entryId ?? '').split('/');
  const locale = parts.pop();
  return { idPath: parts.join('/'), locale };
}

function stripMarkdownForLength(body) {
  return String(body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\{\{[^}]*\}\}/g, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/^\s{0,3}(?:#{1,6}|>|[-*+]|\d+\.)\s+/gmu, ' ')
    .replace(/[*_~|]{1,3}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pushUniqueMapList(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  const list = map.get(key);
  if (!list.includes(value)) list.push(value);
}

/**
 * @param {{
 *   songs?: Array<{ id: string, data?: Record<string, unknown> }>,
 *   albums?: Array<{ id: string, data?: Record<string, unknown> }>,
 *   artists?: Array<{ id: string, data?: Record<string, unknown> }>,
 * }} collections
 */
export function buildContentIndex({ songs = [], albums = [], artists = [] }) {
  /** @type {Map<string, Set<string>>} */
  const localeSetsByIdPath = new Map();
  /** @type {Set<string>} */
  const artistKeys = new Set();
  /** @type {Map<string, string[]>} */
  const albumTitleIndex = new Map();
  /** @type {Set<string>} */
  const songIdPaths = new Set();

  function noteLocale(entryId) {
    const { idPath, locale } = splitEntryId(entryId);
    if (!idPath) return idPath;
    if (!localeSetsByIdPath.has(idPath)) localeSetsByIdPath.set(idPath, new Set());
    if (locale) localeSetsByIdPath.get(idPath).add(locale);
    return idPath;
  }

  for (const entry of artists) {
    noteLocale(entry.id);
    const translationKey = entry.data?.translationKey;
    if (typeof translationKey === 'string' && translationKey) {
      artistKeys.add(translationKey);
    }
  }

  for (const entry of songs) {
    const idPath = noteLocale(entry.id);
    if (idPath) songIdPaths.add(idPath);
  }

  for (const entry of albums) {
    const idPath = noteLocale(entry.id);
    if (!idPath) continue;

    const artistFolder = idPath.split('/')[0];
    const artistName = typeof entry.data?.artist === 'string' ? entry.data.artist : '';
    const titleCandidates = [entry.data?.title, entry.data?.romanizedTitle]
      .filter((value) => typeof value === 'string' && value);

    for (const title of titleCandidates) {
      const foldedTitle = foldCjkSearchText(title);
      if (!foldedTitle) continue;
      if (artistFolder) pushUniqueMapList(albumTitleIndex, `${artistFolder}|${foldedTitle}`, idPath);
      if (artistName) {
        pushUniqueMapList(albumTitleIndex, `${foldCjkSearchText(artistName)}|${foldedTitle}`, idPath);
      }
    }
  }

  return {
    localeSetsByIdPath,
    artistKeys,
    albumTitleIndex,
    songIdPaths,
  };
}

function sortIssues(issues) {
  const severityRank = { warning: 0, info: 1 };
  return [...issues].sort((a, b) => {
    const bySeverity = (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
    if (bySeverity !== 0) return bySeverity;
    return a.kind.localeCompare(b.kind);
  });
}

/**
 * @param {{
 *   collection: 'songs' | 'albums' | 'artists',
 *   entry: { id: string, data?: Record<string, unknown> },
 *   index: ReturnType<typeof buildContentIndex>,
 *   body?: string,
 * }} input
 * @returns {Array<{ kind: string, severity: 'info' | 'warning', refs?: string[] }>}
 */
export function detectEntryIssues({ collection, entry, index, body }) {
  /** @type {Array<{ kind: string, severity: 'info' | 'warning', refs?: string[] }>} */
  const issues = [];
  const data = entry?.data ?? {};
  const { idPath } = splitEntryId(entry?.id);

  const completeness = computeCompleteness(collection, data);
  if (completeness.missing.length > 0) {
    issues.push({
      kind: 'missing-fields',
      severity: 'warning',
      refs: completeness.missing.map((item) => item.field),
    });
  }

  if (idPath) {
    const locales = index.localeSetsByIdPath.get(idPath) ?? new Set();
    for (const locale of MAINTAINED_LOCALES) {
      if (!locales.has(locale)) {
        issues.push({ kind: 'missing-locale', severity: 'info', refs: [locale] });
      }
    }
  }

  if (collection === 'songs') {
    const slugCandidates = [data.artistId, ...(Array.isArray(data.artistIds) ? data.artistIds : [])]
      .filter((value) => typeof value === 'string' && value);
    const unknownArtists = [...new Set(slugCandidates)].filter((slug) => !index.artistKeys.has(slug));
    if (unknownArtists.length > 0) {
      issues.push({ kind: 'unknown-artist', severity: 'warning', refs: unknownArtists });
    }

    if (typeof data.album === 'string' && data.album) {
      const foldedAlbum = foldCjkSearchText(data.album);
      const matchKeys = [];
      if (typeof data.artistId === 'string' && data.artistId && foldedAlbum) {
        matchKeys.push(`${data.artistId}|${foldedAlbum}`);
      }
      if (typeof data.artist === 'string' && data.artist && foldedAlbum) {
        matchKeys.push(`${foldCjkSearchText(data.artist)}|${foldedAlbum}`);
      }
      const linked = matchKeys.some((key) => (index.albumTitleIndex.get(key)?.length ?? 0) > 0);
      if (!linked) {
        issues.push({ kind: 'album-not-linked', severity: 'info', refs: [data.album] });
      }
    }
  }

  if (collection === 'albums') {
    const tracks = Array.isArray(data.tracks) ? data.tracks : [];
    const withSongId = tracks.filter((track) => typeof track?.songId === 'string' && track.songId);
    const missingSongIds = [...new Set(
      withSongId.map((track) => track.songId).filter((songId) => !index.songIdPaths.has(songId)),
    )];
    if (missingSongIds.length > 0) {
      issues.push({ kind: 'track-song-missing', severity: 'warning', refs: missingSongIds });
    }
    if (tracks.length > 0 && withSongId.length === 0) {
      issues.push({ kind: 'tracks-unlinked', severity: 'info' });
    }
  }

  if (typeof body === 'string' && stripMarkdownForLength(body).length < THIN_BODY_MIN_LENGTH) {
    issues.push({ kind: 'thin-body', severity: 'info' });
  }

  return sortIssues(issues);
}

/** @param {Array<{ kind: string, severity: string }>} issues */
export function summarizeIssues(issues) {
  let warnings = 0;
  let infos = 0;
  for (const issue of issues ?? []) {
    if (issue.severity === 'warning') warnings += 1;
    else if (issue.severity === 'info') infos += 1;
  }
  return { total: (issues ?? []).length, warnings, infos };
}

/** @param {Array<{ kind: string, severity: 'info' | 'warning', refs?: string[] }>} issues */
export function dedupeIssues(issues) {
  const seen = new Set();
  const unique = [];
  for (const issue of issues ?? []) {
    const key = `${issue.kind}|${(issue.refs ?? []).join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(issue);
  }
  return sortIssues(unique);
}
