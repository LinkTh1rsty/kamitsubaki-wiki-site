import { foldCjkSearchText } from './cjkSearch.mjs';
import { entityTypes } from './entityContract.mjs';

export const DATABASE_COLLECTIONS = Object.freeze([
  'people', 'isotopes', 'music', 'projects', 'lives', 'organizations', 'lore',
]);

const collectionsByType = {
  person: 'people',
  'virtual-avatar': 'people',
  unit: 'people',
  'software-voice': 'isotopes',
  'work-track': 'music',
  'work-release': 'music',
  project: 'projects',
  'live-event': 'lives',
  organization: 'organizations',
  'lore-concept': 'lore',
};
const artistTypes = new Set(['person', 'virtual-avatar', 'unit', 'software-voice']);
const filterKeys = ['type', 'artist', 'year', 'genre', 'project', 'collection'];
export const DATABASE_SORTS = Object.freeze(['catalog', 'title', 'newest', 'oldest']);
const defaultState = { q: '', type: '', artist: '', year: '', genre: '', project: '', collection: '', view: 'grid', sort: 'catalog' };

function text(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values) {
  return [...new Set(values.map(text).filter(Boolean))];
}

function lookup(index, id) {
  const value = index instanceof Map ? index.get(id) : index?.[id];
  return value?.data || value;
}

function label(value, fallback) {
  return text(typeof value === 'string' ? value : value?.name || value?.title) || fallback;
}

function searchNames(value) {
  if (!value || typeof value === 'string') return [value];
  return [value.name, value.title, value.romanizedName, value.romanizedTitle, ...(value.aliases || [])];
}

function dateYear(value) {
  const match = /^(\d{4})(?:-\d{2}(?:-\d{2})?)?$/.exec(text(value));
  return match?.[1] || null;
}

function recordYear(data) {
  const date = [data.releaseDate, data.dateRange?.start, data.lifecycle?.startedAt]
    .map(dateYear).find(Boolean);
  if (date) return date;
  // A voice may have several engines; its first documented release is the useful browsing year.
  return (data.voiceEngines || []).map(engine => dateYear(engine.releaseDate)).filter(Boolean).sort()[0] || null;
}

/**
 * Normalize a locale-resolved registry entry for rendering and browser filtering.
 * Credits with an entity ID are included: Artist can locate a composer's or
 * illustrator's work as well as a vocalist's. Unlinked credit names are searchable,
 * but do not become invented artist entities. relatedProjectIds is supplied from
 * explicit incoming registry edges; it never guesses membership from article text.
 * A canonical URL must be supplied by the registry. This browser-safe module does
 * not import the server's classification, localization or route-building code.
 * @param {any} entity
 * @param {string} [locale]
 * @param {{
 *   peopleById?: Map<string, any> | Record<string, any>,
 *   projectsById?: Map<string, any> | Record<string, any>,
 *   relatedProjectIds?: string[],
 * }} [options]
 */
export function toDatabaseRecord(entity, locale = 'zh', { peopleById, projectsById, relatedProjectIds = [] } = {}) {
  const data = entity?.data || entity;
  const collection = collectionsByType[data?.entityType];
  const url = text(entity?.url);
  if (!collection || !url) return null;

  const id = text(data.id);
  const title = text(data.name || data.title) || id;
  const authoredArtistIds = unique([
    ...(artistTypes.has(data.entityType) ? [id] : []),
    data.primaryArtist,
    ...(data.performers || []).map(performer => performer.entity),
    ...(data.headliners || []),
    ...(data.guestPerformers || []),
    ...(data.credits || []).map(credit => credit.entity),
  ]);
  const artistIds = authoredArtistIds.filter(artist => !peopleById || lookup(peopleById, artist)
    || artist === id && artistTypes.has(data.entityType));
  const projectIds = unique([
    ...(data.entityType === 'project' ? [id] : []),
    data.belongToUniverse,
    ...(data.relations || []).map(relation => relation.target),
    ...relatedProjectIds,
  ]).filter(project => project === id && data.entityType === 'project' || lookup(projectsById, project)?.entityType === 'project');
  const artistNames = artistIds.map(artist => label(lookup(peopleById, artist), artist === id ? title : artist));
  const projectNames = projectIds.map(project => label(lookup(projectsById, project), project === id ? title : project));
  const genres = unique(data.genres || []);
  const year = recordYear(data);
  const summary = text(data.summary || data.description || data.profileTagline);
  const searchText = foldCjkSearchText([
    id, title, data.romanizedName, data.romanizedTitle, summary,
    ...(data.aliases || []), ...(data.tags || []), data.entityType, collection, year,
    ...authoredArtistIds, ...artistNames, ...artistIds.flatMap(artist => searchNames(lookup(peopleById, artist))),
    ...projectNames, ...projectIds.flatMap(project => searchNames(lookup(projectsById, project))),
    ...genres, ...(data.credits || []).map(credit => credit.name),
  ].filter(Boolean).join(' '));

  return {
    id, title, summary,
    image: text(data.presentation?.image),
    url,
    type: data.entityType,
    collection,
    artistIds, artistNames, projectIds, projectNames, genres, year, searchText,
  };
}

function namedFacets(records, idsField, namesField) {
  const values = new Map();
  for (const record of records) {
    record[idsField].forEach((id, index) => {
      const name = record[namesField][index] || id;
      // Prefer a resolved name if another record only had the stable ID.
      if (!values.has(id) || values.get(id) === id) values.set(id, name);
    });
  }
  return [...values].map(([id, label]) => ({ id, label }))
    .sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
}

/** All options come from actual records, not a separately maintained taxonomy. */
export function collectDatabaseFacets(records) {
  const present = records.filter(Boolean);
  const types = new Set(present.map(record => record.type));
  const collections = new Set(present.map(record => record.collection));
  return {
    types: entityTypes.filter(type => types.has(type)),
    artists: namedFacets(present, 'artistIds', 'artistNames'),
    years: unique(present.map(record => record.year)).sort((left, right) => right.localeCompare(left)),
    hasUnknownYear: present.some(record => !record.year),
    genres: unique(present.flatMap(record => record.genres)).sort((left, right) => left.localeCompare(right)),
    projects: namedFacets(present, 'projectIds', 'projectNames'),
    collections: DATABASE_COLLECTIONS.filter(collection => collections.has(collection)),
  };
}

/** Filters are independent and cumulative; each search token must occur. */
function matchesFilters(record, state, tokens) {
  if (!record) return false;
  if (tokens.some(token => !record.searchText.includes(token))) return false;
  if (state.type && record.type !== state.type) return false;
  if (state.collection && record.collection !== state.collection) return false;
  if (state.artist && !record.artistIds.includes(state.artist)) return false;
  if (state.project && !record.projectIds.includes(state.project)) return false;
  if (state.genre && !record.genres.includes(state.genre)) return false;
  if (state.year === 'unknown') return !record.year;
  return !state.year || record.year === state.year;
}

export function matchesDatabaseRecord(record, state = {}) {
  return matchesFilters(record, state, foldCjkSearchText(state.q).split(' ').filter(Boolean));
}

export function filterDatabaseRecords(records, state = {}) {
  const tokens = foldCjkSearchText(state.q).split(' ').filter(Boolean);
  return records.filter(record => matchesFilters(record, state, tokens));
}

/** Dates are recorded years; undated records stay last in either direction. */
export function sortDatabaseRecords(records, sort = 'catalog', locale = 'zh') {
  if (!DATABASE_SORTS.includes(sort) || sort === 'catalog') return [...records];
  const collator = new Intl.Collator(locale, {numeric: true, sensitivity: 'base'});
  return [...records].sort((a, b) => {
    if (sort !== 'title') {
      const aKnown = /^\d{4}$/.test(String(a.year || ''));
      const bKnown = /^\d{4}$/.test(String(b.year || ''));
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      if (aKnown && a.year !== b.year) return (Number(a.year) - Number(b.year)) * (sort === 'newest' ? -1 : 1);
    }
    return collator.compare(a.title, b.title) || String(a.id).localeCompare(String(b.id));
  });
}

/** The homepage and full browser count the same canonical record rows. */
export function databaseCollectionCounts(records) {
  return DATABASE_COLLECTIONS.map(id => ({id, count: records.filter(record => record?.collection === id).length})).filter(row => row.count > 0);
}

function paramsFromSearch(search) {
  return new URLSearchParams(search instanceof URLSearchParams ? search : text(search).replace(/^\?/, ''));
}

/** Restore shareable query state; reject stale/unknown facet values when given facets. */
export function readDatabaseQuery(search = '', facets) {
  const params = paramsFromSearch(search);
  const state = { ...defaultState, q: text(params.get('q')) };
  const allowed = facets && {
    type: facets.types || [],
    artist: (facets.artists || []).map(artist => artist.id),
    year: [...(facets.years || []), ...(facets.hasUnknownYear ? ['unknown'] : [])],
    genre: facets.genres || [],
    project: (facets.projects || []).map(project => project.id),
    collection: facets.collections || [],
  };
  for (const key of filterKeys) {
    const value = text(params.get(key));
    if (!allowed || allowed[key].includes(value)) state[key] = value;
  }
  if (params.get('view') === 'list') state.view = 'list';
  if (DATABASE_SORTS.includes(params.get('sort'))) state.sort = params.get('sort');
  return state;
}

/** Keep unrelated query parameters (including legacy section links) intact. */
export function writeDatabaseQuery(state = {}, search = '') {
  const params = paramsFromSearch(search);
  for (const key of ['q', ...filterKeys]) {
    const value = text(state[key]);
    if (value) params.set(key, value);
    else params.delete(key);
  }
  if (state.view === 'list') params.set('view', 'list');
  else params.delete('view');
  if (DATABASE_SORTS.includes(state.sort) && state.sort !== 'catalog') params.set('sort', state.sort);
  else params.delete('sort');
  return params;
}
