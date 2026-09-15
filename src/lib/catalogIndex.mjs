/** Slim unified catalog index for songs / albums / artists (Phase 0). */

function getContentPath(entryId) {
  return String(entryId ?? '').split('/').slice(0, -1).join('/');
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function songCategoryFromPath(contentPath) {
  const parts = String(contentPath ?? '').split('/').filter(Boolean);
  return parts[1] ?? null;
}

/**
 * @param {{ id: string, data?: Record<string, unknown> }} entry
 * @param {string} locale
 */
export function toSongIndexRecord(entry, locale) {
  const data = entry?.data ?? {};
  const contentPath = getContentPath(entry?.id);
  const artistIds = Array.isArray(data.artistIds) && data.artistIds.length > 0
    ? [...data.artistIds]
    : (nonEmptyString(data.artistId) ? [data.artistId] : []);

  return {
    collection: 'songs',
    key: nonEmptyString(data.translationKey) || contentPath,
    path: `/${locale}/songs/${contentPath}`,
    contentPath,
    title: nonEmptyString(data.title) ?? '',
    artist: nonEmptyString(data.artist) ?? '',
    artistIds,
    composer: nonEmptyString(data.composer),
    lyricist: nonEmptyString(data.lyricist),
    album: nonEmptyString(data.album),
    releaseDate: nonEmptyString(data.releaseDate),
    duration: nonEmptyString(data.duration),
    image: nonEmptyString(data.image),
    category: songCategoryFromPath(contentPath),
    code: nonEmptyString(data.code),
  };
}

/**
 * @param {{ id: string, data?: Record<string, unknown> }} entry
 * @param {string} locale
 */
export function toAlbumIndexRecord(entry, locale) {
  const data = entry?.data ?? {};
  const contentPath = getContentPath(entry?.id);
  const tracks = Array.isArray(data.tracks) ? data.tracks : [];
  const linkedTracks = tracks.filter(
    (track) => nonEmptyString(track?.songId),
  ).length;

  return {
    collection: 'albums',
    key: nonEmptyString(data.translationKey) || contentPath,
    path: `/${locale}/albums/${contentPath}`,
    contentPath,
    title: nonEmptyString(data.title) ?? '',
    artist: nonEmptyString(data.artist) ?? '',
    type: nonEmptyString(data.type),
    releaseDate: nonEmptyString(data.releaseDate),
    duration: nonEmptyString(data.duration),
    image: nonEmptyString(data.image),
    trackCount: Number.isFinite(data.trackCount) ? data.trackCount : null,
    tracks: tracks.length,
    linkedTracks,
  };
}

/**
 * @param {{ id: string, data?: Record<string, unknown> }} entry
 * @param {string} locale
 */
export function toArtistIndexRecord(entry, locale) {
  const data = entry?.data ?? {};
  const contentPath = getContentPath(entry?.id);
  const parts = contentPath.split('/').filter(Boolean);

  return {
    collection: 'artists',
    key: nonEmptyString(data.translationKey) || contentPath,
    path: `/${locale}/artists/${contentPath}`,
    contentPath,
    slug: parts.at(-1) ?? null,
    name: nonEmptyString(data.name) ?? '',
    romanizedName: nonEmptyString(data.romanizedName),
    image: nonEmptyString(data.image),
    debutDate: nonEmptyString(data.debutDate),
    status: nonEmptyString(data.status),
    contentStatus: nonEmptyString(data.contentStatus) ?? 'published',
  };
}

/**
 * Build a slim, locale-resolved catalog index.
 * Entries should already be localized (see getLocalizedEntries).
 *
 * @param {{
 *   locale: string,
 *   songs?: Array<{ id: string, data?: Record<string, unknown> }>,
 *   albums?: Array<{ id: string, data?: Record<string, unknown> }>,
 *   artists?: Array<{ id: string, data?: Record<string, unknown> }>,
 * }} input
 */
export function buildCatalogIndex({ locale, songs = [], albums = [], artists = [] }) {
  if (!locale) throw new Error('buildCatalogIndex requires a locale');

  const songRecords = songs.map((entry) => toSongIndexRecord(entry, locale));
  const albumRecords = albums.map((entry) => toAlbumIndexRecord(entry, locale));
  const artistRecords = artists.map((entry) => toArtistIndexRecord(entry, locale));

  songRecords.sort((a, b) => a.contentPath.localeCompare(b.contentPath));
  albumRecords.sort((a, b) => a.contentPath.localeCompare(b.contentPath));
  artistRecords.sort((a, b) => a.contentPath.localeCompare(b.contentPath));

  return {
    locale,
    counts: {
      songs: songRecords.length,
      albums: albumRecords.length,
      artists: artistRecords.length,
    },
    songs: songRecords,
    albums: albumRecords,
    artists: artistRecords,
  };
}

/** @param {ReturnType<typeof buildCatalogIndex>} index */
export function summarizeCatalogIndex(index) {
  return {
    locale: index?.locale ?? null,
    counts: {
      songs: index?.songs?.length ?? 0,
      albums: index?.albums?.length ?? 0,
      artists: index?.artists?.length ?? 0,
    },
    withComposer: (index?.songs ?? []).filter((song) => song.composer).length,
    withLyricist: (index?.songs ?? []).filter((song) => song.lyricist).length,
    withReleaseDate: (index?.songs ?? []).filter((song) => song.releaseDate).length,
  };
}
