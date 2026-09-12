export const SORT_MODES = Object.freeze(['default', 'date-desc', 'date-asc', 'title-asc']);

export const YEAR_ALL = 'all';
export const YEAR_UNKNOWN = 'unknown';
export const ALBUM_ALL = 'all';

export function extractYearFromDate(releaseDate) {
  if (typeof releaseDate !== 'string') return null;
  const match = /^(\d{4})/.exec(releaseDate.trim());
  return match ? match[1] : null;
}

export function collectFilterYears(songs) {
  const years = new Set();
  let hasUnknown = false;

  for (const song of songs) {
    const year = extractYearFromDate(song.releaseDate);
    if (year) years.add(year);
    else hasUnknown = true;
  }

  return {
    years: [...years].sort((left, right) => right.localeCompare(left)),
    hasUnknown,
  };
}

export function collectUniqueFilterValues(items, field) {
  const values = new Set();

  for (const item of items) {
    const value = typeof item?.[field] === 'string' ? item[field].trim() : '';
    if (value) values.add(value);
  }

  return [...values].sort((left, right) => left.localeCompare(right));
}

export function collectFilterAlbums(songs) {
  return collectUniqueFilterValues(songs, 'album');
}

/** Album catalog: unique `type` labels (EP / studio album / …). */
export function collectFilterTypes(albums) {
  return collectUniqueFilterValues(albums, 'type');
}

export function normalizeCategorySelection(categories, selected) {
  if (!Array.isArray(categories) || categories.length === 0) return new Set();
  // null/undefined = default all; array (even empty) = explicit selection
  if (selected == null) {
    return new Set(categories);
  }
  if (!Array.isArray(selected)) {
    return new Set();
  }
  const allowed = new Set(categories);
  return new Set(selected.filter((slug) => allowed.has(slug)));
}

export function matchesSongFilter(song, state) {
  const query = typeof state.query === 'string' ? state.query.trim() : '';
  if (query && !String(song.searchText || '').includes(query)) {
    return false;
  }

  if (state.hideAll) {
    return false;
  }

  if (state.categories instanceof Set && state.categories.size > 0) {
    if (!state.categories.has(String(song.category || ''))) {
      return false;
    }
  }

  const year = state.year && state.year !== YEAR_ALL ? String(state.year) : null;
  if (year) {
    const songYear = song.year || null;
    if (year === YEAR_UNKNOWN) {
      if (songYear) return false;
    } else if (songYear !== year) {
      return false;
    }
  }

  const album = state.album && state.album !== ALBUM_ALL ? String(state.album) : null;
  if (album) {
    const songAlbum = typeof song.album === 'string' ? song.album.trim() : '';
    if (songAlbum !== album) return false;
  }

  return true;
}

function defaultIndex(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function compareOptionalDateDesc(left, right) {
  const a = left.releaseDate || null;
  const b = right.releaseDate || null;
  if (!a && !b) return defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
  if (!a) return 1;
  if (!b) return -1;
  return b.localeCompare(a) || defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
}

function compareOptionalDateAsc(left, right) {
  const a = left.releaseDate || null;
  const b = right.releaseDate || null;
  if (!a && !b) return defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b) || defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
}

export function createSongComparator(mode = 'default', locale = 'zh') {
  const resolved = SORT_MODES.includes(mode) ? mode : 'default';

  return (left, right) => {
    if (resolved === 'date-desc') return compareOptionalDateDesc(left, right);
    if (resolved === 'date-asc') return compareOptionalDateAsc(left, right);
    if (resolved === 'title-asc') {
      return String(left.title || '').localeCompare(String(right.title || ''), locale)
        || defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
    }
    return defaultIndex(left.defaultIndex) - defaultIndex(right.defaultIndex);
  };
}

export function encodeFilterHash(state = {}) {
  const params = new URLSearchParams();
  const q = typeof state.q === 'string' ? state.q.trim() : '';
  if (q) params.set('q', q);

  if (Array.isArray(state.cat) && state.cat.length) {
    params.set('cat', state.cat.filter(Boolean).join(','));
  }

  const year = state.year && state.year !== YEAR_ALL ? String(state.year) : '';
  if (year) params.set('year', year);

  const album = state.album && state.album !== ALBUM_ALL ? String(state.album) : '';
  if (album) params.set('album', album);

  const sort = state.sort && state.sort !== 'default' ? String(state.sort) : '';
  if (sort && SORT_MODES.includes(sort)) params.set('sort', sort);

  const query = params.toString();
  return query ? `#${query}` : '';
}

function parseHashParams(hash) {
  const raw = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
  if (!raw) return new URLSearchParams();
  try {
    return new URLSearchParams(raw);
  } catch {
    return new URLSearchParams();
  }
}

export function decodeFilterHash(hash, options = {}) {
  const params = parseHashParams(hash);
  const allowedCategories = Array.isArray(options.categories) ? options.categories : [];
  const allowedAlbums = Array.isArray(options.albums) ? options.albums : [];
  const allowedYears = Array.isArray(options.years) ? options.years : [];
  const hasUnknown = Boolean(options.hasUnknown);
  const categorySet = new Set(allowedCategories);
  const albumSet = new Set(allowedAlbums);
  const yearSet = new Set(allowedYears);

  const q = (params.get('q') || '').trim();

  let cat = null;
  const catRaw = params.get('cat');
  if (catRaw) {
    const parsed = catRaw
      .split(',')
      .map((value) => value.trim())
      .filter((value) => value && categorySet.has(value));
    if (parsed.length) cat = [...new Set(parsed)];
  }

  let year = YEAR_ALL;
  const yearRaw = params.get('year');
  if (yearRaw) {
    if (yearRaw === YEAR_UNKNOWN && hasUnknown) year = YEAR_UNKNOWN;
    else if (yearSet.has(yearRaw)) year = yearRaw;
  }

  let album = ALBUM_ALL;
  const albumRaw = params.get('album');
  if (albumRaw && albumSet.has(albumRaw)) album = albumRaw;

  let sort = 'default';
  const sortRaw = params.get('sort');
  if (sortRaw && SORT_MODES.includes(sortRaw)) sort = sortRaw;

  return { q, cat, year, album, sort };
}

/**
 * @param {{
 *   q?: string,
 *   cat?: string[] | null,
 *   year?: string,
 *   album?: string,
 *   categories?: string[],
 *   albums?: string[],
 *   years?: string[],
 *   hasUnknown?: boolean,
 *   queryFold?: (value: string) => string,
 * }} [input]
 */
export function buildSongFilterState({ q = '', cat = null, year = YEAR_ALL, album = ALBUM_ALL, categories = /** @type {string[]} */ ([]), albums = /** @type {string[]} */ ([]), years = /** @type {string[]} */ ([]), hasUnknown = false, queryFold = (value) => value }) {
  const selection = normalizeCategorySelection(categories, cat);
  const isAllCategories = categories.length > 0
    && selection.size === categories.length
    && categories.every((slug) => selection.has(slug));
  const resolvedYear = year === YEAR_UNKNOWN && hasUnknown ? YEAR_UNKNOWN
    : (years.includes(year) ? year : YEAR_ALL);
  const resolvedAlbum = albums.includes(album) ? album : ALBUM_ALL;
  const hideAll = categories.length > 0 && !isAllCategories && selection.size === 0;

  return {
    q,
    query: queryFold(q),
    // empty Set means "no category constraint" only when all are selected;
    // explicit empty selection hides everything via hideAll
    categories: isAllCategories ? new Set() : selection,
    selectedCategories: isAllCategories ? new Set(categories) : selection,
    year: resolvedYear,
    album: resolvedAlbum,
    isAllCategories,
    hideAll,
  };
}
