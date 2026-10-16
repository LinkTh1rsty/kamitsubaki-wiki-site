import { foldCjkSearchText } from './cjkSearch.mjs';
import { createGraphIndex, graphEdgeKey, isGraphEvent } from './graphModel.mjs';

export const discoveryVersion = 1;
export const discoveryEdgeKey = edge => graphEdgeKey({ ...edge, evidence: '' });
export const discoveryDay = (date = new Date()) => date.toISOString().slice(0, 10);
export function validDiscoveryDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;
  const time = Date.parse(value + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}
/** Stable, non-cryptographic ordering; never depends on names or browser randomness. */
export function discoveryHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

/** @typedef {{id:string,title:string,path:string,kind:string,collection:string,subtitle:string,description:string,image:string,aliases:string[],search:string,styles:string[],year:string,endYear:string,date:{label:string,sort:string,precision:string}|null}} DiscoveryNode */
/** @typedef {{version:number,signature:string,nodes:DiscoveryNode[],edges:any[],articleCoverage?:string,facets:{artists:Array<{id:string,title:string,kind:string}>,styles:Array<{id:string,title:string,count:number}>,kinds:string[],years:string[]},summary:{entities:number,events:number,articles?:number,styled:number,connections:number}}} DiscoveryCatalog */
/** URL state excludes names, browsing history and private account data. */
export function readDiscoveryState(params, today = discoveryDay()) {
  const allArtists = [...new Set(params.getAll('artist').filter(Boolean))].sort();
  const artists = allArtists.slice(0, 3);
  const year = params.get('year') || '';
  return { artists, artistsOverflow: allArtists.length > 3, start: params.get('start') || '', kind: params.get('kind') || '', style: params.get('style') || '',
    query: (params.get('q') || '').trim().slice(0, 160), year,
    radius: ['0', '2', '5'].includes(params.get('radius')) ? Number(params.get('radius')) : 2,
    events: params.get('events') === '1', day: validDiscoveryDay(params.get('day')) ? params.get('day') : today, fixedDay: validDiscoveryDay(params.get('day')),
    dayInvalid: params.has('day') && !validDiscoveryDay(params.get('day')),
    variant: /^\d{1,4}$/.test(params.get('variant') || '') ? Number(params.get('variant')) : 0,
    length: ['3', '5', '7'].includes(params.get('length')) ? Number(params.get('length')) : 5,
    step: /^\d{1,2}$/.test(params.get('step') || '') ? Number(params.get('step')) : 0 };
}
export function discoveryParams(state, { freezeDay = false } = {}) {
  const params = new URLSearchParams();
  for (const artist of [...new Set(state.artists)].sort()) params.append('artist', artist);
  for (const [name, value] of Object.entries({ start: state.start, kind: state.kind, style: state.style, q: state.query, year: state.year,
    radius: state.year && state.radius !== 2 ? String(state.radius) : '', events: state.events ? '1' : '',
    day: freezeDay || state.fixedDay ? state.day : '', variant: state.variant ? String(state.variant) : '',
    length: state.length !== 5 ? String(state.length) : '', step: state.step ? String(state.step) : '' })) if (value) params.set(name, value);
  return params;
}

/** A reusable index for recommendations and verified walks. @param {DiscoveryCatalog} catalog */
export function createDiscoveryEngine(catalog) {
  const index = createGraphIndex(catalog);
  const styles = new Set(catalog.facets.styles.map(item => item.id));
  const artists = new Set(catalog.facets.artists.map(item => item.id));
  function validate(state) {
    const invalid = [];
    if (state.artistsOverflow) invalid.push({ field: 'artist', value: 'max:3' });
    for (const id of state.artists) if (!artists.has(id)) invalid.push({ field: 'artist', value: id });
    if (state.start && !index.byId.has(state.start)) invalid.push({ field: 'start', value: state.start });
    if (state.start && index.byId.has(state.start) && isGraphEvent(index.byId.get(state.start)) && !state.events) invalid.push({ field: 'events', value: state.start });
    if (state.kind && !index.kinds.includes(state.kind)) invalid.push({ field: 'kind', value: state.kind });
    if (state.style && !styles.has(state.style)) invalid.push({ field: 'style', value: state.style });
    if (state.year && !/^\d{4}$/.test(state.year)) invalid.push({ field: 'year', value: state.year });
    return invalid;
  }
  function affinity(state) {
    const sources = [...new Set([state.start, ...state.artists].filter(Boolean))], paths = new Map();
    for (const source of sources) {
      if (!index.byId.has(source)) continue;
      const found = new Map([[source, { seed: source, steps: [] }]]), queue = [source];
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const id = queue[cursor], parent = found.get(id);
        if (parent.steps.length === 2) continue;
        for (const edge of index.adjacency.get(id)) {
          const other = edge.source === id ? edge.target : edge.source;
          if (found.has(other) || (!state.events && isGraphEvent(index.byId.get(other)))) continue;
          const step = { from: id, to: other, edge, inverse: edge.target === id };
          const next = { seed: source, steps: [...parent.steps, step] };
          found.set(other, next); queue.push(other);
          if (!paths.has(other) || next.steps.length < paths.get(other).steps.length) paths.set(other, next);
        }
      }
    }
    return { sources: new Set(sources), paths };
  }
  function matches(node, state, tokens = foldCjkSearchText(state.query).split(/\s+/).filter(Boolean)) {
    if ((!state.events && isGraphEvent(node)) || (state.kind && node.kind !== state.kind)) return false;
    if (state.style && !node.styles.includes(state.style)) return false;
    if (tokens.some(token => !node.search.includes(token))) return false;
    if (state.year) {
      if (!node.year) return false;
      const lower = Number(state.year) - state.radius, upper = Number(state.year) + state.radius;
      if (Number(node.year) > upper || Number(node.endYear || node.year) < lower) return false;
    }
    return true;
  }
  /** @returns {{items:Array<{node:DiscoveryNode,reasons:Array<any>,score:number,affinity:any}>,invalid:Array<{field:string,value:string}>}} */
  function recommend(state) {
    const invalid = validate(state);
    if (invalid.length) return { items: [], invalid };
    const { sources, paths } = affinity(state), tokens = foldCjkSearchText(state.query).split(/\s+/).filter(Boolean);
    const seed = [discoveryVersion, catalog.signature, state.day, state.variant, [...sources].sort().join(','), state.kind, state.style, state.year, state.radius, state.query].join('|');
    const items = [];
    for (const node of index.nodes) {
      if (sources.has(node.id) || !matches(node, state, tokens)) continue;
      const path = paths.get(node.id);
      if (sources.size && !path) continue;
      const reasons = [];
      if (path) reasons.push({ type: 'connection', ...path });
      if (state.style) reasons.push({ type: 'style', value: state.style });
      if (state.year) reasons.push({ type: 'year', value: node.year, end: node.endYear });
      if (tokens.length) reasons.push({ type: 'keyword', value: state.query });
      if (!reasons.length) reasons.push({ type: 'daily' });
      const score = path ? 100 - path.steps.length * 30 : 0;
      items.push({ node, reasons, score, affinity: path, order: discoveryHash(seed + '|' + node.id) });
    }
    items.sort((a, b) => b.score - a.score || a.order - b.order || a.node.id.localeCompare(b.node.id));
    // Balance recorded types while keeping stronger affinity as a ranking signal.
    const groups = new Map(), counts = new Map(), balanced = [];
    for (const item of items) { if (!groups.has(item.node.kind)) groups.set(item.node.kind, []); groups.get(item.node.kind).push(item); }
    while (groups.size) {
      const choices = [...groups].map(([kind, queue]) => ({ kind, item: queue[0], priority: queue[0].score - (counts.get(kind) || 0) * 16 }));
      const choice = choices.sort((a, b) => b.priority - a.priority || a.item.order - b.item.order || a.kind.localeCompare(b.kind))[0];
      balanced.push(groups.get(choice.kind).shift()); counts.set(choice.kind, (counts.get(choice.kind) || 0) + 1);
      if (!groups.get(choice.kind).length) groups.delete(choice.kind);
    }
    return { items: balanced, invalid };
  }
  /** @returns {Array<{node:DiscoveryNode,step:any}>} */
  function route(state, ranked) {
    if (ranked.invalid.length) return [];
    const start = state.start ? index.byId.get(state.start) : (ranked.items.find(item => index.adjacency.get(item.node.id).length)?.node || ranked.items[0]?.node);
    if (!start || (!state.events && isGraphEvent(start))) return [];
    // Do not silently relax impossible metadata filters just to fabricate a tour.
    if (!ranked.items.length && (state.kind || state.style || state.year || state.query) && !matches(start, state)) return [];
    const allowed = new Set(index.nodes.filter(node => state.events || !isGraphEvent(node)).map(node => node.id));
    const preferred = new Set(ranked.items.map(item => item.node.id));
    const seed = [catalog.signature, state.day, state.variant, start.id, state.length].join('|');
    let best = [{ node: start, step: null }], searches = 0;
    function walk(path, visited, kinds) {
      if (path.length > best.length) best = path;
      if (path.length >= state.length || ++searches > 512) return path.length >= state.length;
      const current = path[path.length - 1].node.id, unique = new Map();
      for (const edge of index.adjacency.get(current)) {
        const id = edge.source === current ? edge.target : edge.source;
        if (!allowed.has(id) || visited.has(id)) continue;
        const node = index.byId.get(id), step = { from: current, to: id, edge, inverse: edge.target === current };
        const priority = (kinds.has(node.kind) ? 0 : 3) + (preferred.has(id) ? 1 : 0)
          + discoveryHash(seed + '|' + path.length + '|' + discoveryEdgeKey(edge)) / 4294967296;
        if (!unique.has(id) || priority > unique.get(id).priority) unique.set(id, { node, step, priority });
      }
      const options = [...unique.values()].sort((a, b) => b.priority - a.priority || a.node.id.localeCompare(b.node.id)).slice(0, 12);
      for (const next of options) {
        if (walk([...path, { node: next.node, step: next.step }], new Set([...visited, next.node.id]), new Set([...kinds, next.node.kind]))) return true;
        if (searches > 512) break;
      }
      return false;
    }
    walk(best, new Set([start.id]), new Set([start.kind]));
    return best;
  }
  function plan(state) { const ranked = recommend(state); return { ...ranked, route: route(state, ranked) }; }
  return { index, recommend, plan };
}
