import { foldCjkSearchText } from './cjkSearch.mjs';

export const graphKinds = ['person', 'virtual-avatar', 'unit', 'software-voice', 'work-track', 'work-release', 'project', 'organization', 'live-event', 'lore-concept', 'editorial-article', 'events'];
export const isGraphEvent = node => node.kind === 'events' || node.collection === 'chronicle';
export const graphEdgeKey = edge => JSON.stringify([edge.source, edge.target, edge.type, edge.role || '', edge.disc || '', edge.number || '', edge.startDate || '', edge.endDate || '', edge.evidence || '']);

/** One node per stable ID, and authored edges only. Unknown endpoints never become invented nodes. */
export function createGraphIndex(catalog) {
  const nodes = new Map();
  for (const node of catalog.nodes) if (node.id && !nodes.has(node.id)) {
    nodes.set(node.id, { ...node, title: node.title || node.id,
      search: foldCjkSearchText([node.id, node.title, node.subtitle, node.search, ...(node.aliases || [])].filter(Boolean).join(' ')), degree: 0 });
  }
  const keys = new Set(), edges = [], adjacency = new Map([...nodes.keys()].map(id => [id, []]));
  let omitted = 0;
  for (const original of catalog.edges) {
    if (!nodes.has(original.source) || !nodes.has(original.target) || original.source === original.target) { omitted++; continue; }
    const key = graphEdgeKey(original);
    if (keys.has(key)) continue;
    keys.add(key);
    const edge = { ...original, id: 'edge-' + edges.length };
    edges.push(edge);
    adjacency.get(edge.source).push(edge); adjacency.get(edge.target).push(edge);
  }
  for (const node of nodes.values()) node.degree = new Set(adjacency.get(node.id).map(edge => edge.source === node.id ? edge.target : edge.source)).size;
  return { nodes: [...nodes.values()], edges, byId: nodes, adjacency, omitted,
    kinds: graphKinds.filter(kind => [...nodes.values()].some(node => node.kind === kind)),
    relations: [...new Set(edges.map(edge => edge.type))].sort() };
}

/** Filters apply to the graph, search directory and paths. Search itself only locates nodes. */
export function selectGraph(index, { kind = '', relation = '', events = false, scope = 'all', entry = '', depth = 1 } = {}) {
  const allowed = new Set(index.nodes.filter(node => (events || !isGraphEvent(node)) && (!kind || node.kind === kind)).map(node => node.id));
  const edges = index.edges.filter(edge => allowed.has(edge.source) && allowed.has(edge.target) && (!relation || edge.type === relation));
  let visible = allowed;
  if (scope === 'neighborhood') {
    visible = new Set(allowed.has(entry) ? [entry] : []);
    let frontier = new Set(visible);
    for (let step = 0; step < Math.min(3, Math.max(1, Number(depth) || 1)); step++) {
      const next = new Set();
      for (const edge of edges) {
        if (frontier.has(edge.source) && !visible.has(edge.target)) next.add(edge.target);
        if (frontier.has(edge.target) && !visible.has(edge.source)) next.add(edge.source);
      }
      for (const id of next) visible.add(id);
      frontier = next;
    }
  }
  return { nodes: index.nodes.filter(node => visible.has(node.id)), edges: edges.filter(edge => visible.has(edge.source) && visible.has(edge.target)) };
}

/** @typedef {{id:string,title:string,kind:string,path:string,subtitle?:string,collection?:string,aliases?:string[],search:string,degree:number}} GraphNode */
/** @param {GraphNode[]} nodes @param {string} query */
export function searchGraphNodes(nodes, query = '') {
  const text = foldCjkSearchText(query).trim(), terms = text.split(/\s+/).filter(Boolean);
  const score = node => [node.id, node.title, node.subtitle, ...(node.aliases || [])].some(name => name && foldCjkSearchText(name) === text) ? 0
    : foldCjkSearchText(node.title).startsWith(text) ? 1 : 2;
  return nodes.filter(node => terms.every(term => node.search.includes(term))).sort((a, b) =>
    (text ? score(a) - score(b) : 0) || b.degree - a.degree || a.id.localeCompare(b.id));
}

export function graphConnections(graph, id) {
  const byId = new Map(graph.nodes.map(node => [node.id, node]));
  return graph.edges.filter(edge => edge.source === id || edge.target === id).map(edge => ({
    edge, inverse: edge.target === id, other: byId.get(edge.source === id ? edge.target : edge.source),
  })).sort((a, b) => a.other.id.localeCompare(b.other.id) || a.edge.type.localeCompare(b.edge.type) || String(a.edge.role || '').localeCompare(String(b.edge.role || '')));
}
