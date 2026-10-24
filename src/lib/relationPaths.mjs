import { foldCjkSearchText } from './cjkSearch.mjs';
import { graphEdgeKey } from './graphModel.mjs';

const isChronicle = node => node.kind === 'events' || node.collection === 'chronicle';
export const relationEndpointLabel = node => `${node.title} · ${node.id}`;

/** An exact ID, a datalist choice, or one unambiguous name. Never guess an endpoint. */
export function resolveRelationEndpoint(nodes, value) {
  const query = foldCjkSearchText(value).trim();
  if (!query) return null;
  const exact = nodes.find(node => foldCjkSearchText(node.id) === query
    || foldCjkSearchText(relationEndpointLabel(node)) === query);
  if (exact) return exact;
  const matches = nodes.filter(node => [node.title, node.subtitle, ...(node.aliases || [])]
    .some(name => name && foldCjkSearchText(name) === query));
  return matches.length === 1 ? matches[0] : null;
}

/** Build once per catalog. Traversal is undirected; every step retains its authored direction. */
export function createRelationPathFinder(catalog) {
  const nodes = new Map(catalog.nodes.map(node => [node.id, node]));
  const adjacency = new Map([...nodes.keys()].map(id => [id, []]));
  for (const edge of catalog.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target) || edge.source === edge.target) continue;
    adjacency.get(edge.source).push({ from: edge.source, to: edge.target, edge, inverse: false });
    adjacency.get(edge.target).push({ from: edge.target, to: edge.source, edge, inverse: true });
  }
  for (const steps of adjacency.values()) steps.sort((a, b) =>
    a.to.localeCompare(b.to) || String(a.edge.type).localeCompare(String(b.edge.type))
    || String(a.edge.role || '').localeCompare(String(b.edge.role || '')));

  function find(from, to, { includeChronicle = false, kind = '', relation = '', bannedNodes = new Set(), bannedEdges = new Set() } = {}) {
    const allowed = id => nodes.has(id) && !bannedNodes.has(id) && (includeChronicle || !isChronicle(nodes.get(id))) && (!kind || nodes.get(id).kind === kind);
    if (!allowed(from) || !allowed(to)) return { status: 'invalid', nodes: [], steps: [] };
    if (from === to) return { status: 'found', nodes: [nodes.get(from)], steps: [], distance: 0 };
    const visited = new Map([[from, null]]);
    const queue = [from];
    for (let index = 0; index < queue.length; index++) {
      for (const step of adjacency.get(queue[index])) {
        if (!allowed(step.to) || visited.has(step.to)
          || (relation && step.edge.type !== relation) || bannedEdges.has(graphEdgeKey(step.edge))
          || (!includeChronicle && step.edge.type === 'chronicle-footprint')) continue;
        visited.set(step.to, step);
        if (step.to === to) {
          const steps = [];
          for (let id = to; id !== from;) {
            const parent = visited.get(id);
            steps.push(parent);
            id = parent.from;
          }
          steps.reverse();
          return { status: 'found', distance: steps.length, steps,
            nodes: [nodes.get(from), ...steps.map(item => nodes.get(item.to))] };
        }
        queue.push(step.to);
      }
    }
    return { status: 'unconnected', nodes: [], steps: [] };
  }
  /** Yen's loopless alternatives: deterministic shortest-first, bounded to a few reviewable routes. */
  find.compare = (from, to, options = {}) => {
    const maxPaths = Math.min(5, Math.max(1, options.maxPaths || 3));
    const first = find(from, to, options);
    if (first.status !== 'found') return { status: first.status, paths: [], truncated: false };
    const paths = [first], candidates = new Map();
    const signature = path => path.steps.map(step => graphEdgeKey(step.edge) + ':' + step.inverse).join('|');
    const accepted = new Set([signature(first)]);
    let searches = 0, truncated = false;
    while (paths.length <= maxPaths) {
      const previous = paths[paths.length - 1];
      for (let spur = 0; spur < previous.steps.length; spur++) {
        if (++searches > 256) { truncated = true; break; }
        const rootSteps = previous.steps.slice(0, spur);
        const rootNodes = previous.nodes.slice(0, spur + 1);
        const rootKey = signature({ steps: rootSteps });
        const bannedEdges = new Set(paths.filter(path => path.steps.length > spur && signature({ steps: path.steps.slice(0, spur) }) === rootKey)
          .map(path => graphEdgeKey(path.steps[spur].edge)));
        const tail = find(rootNodes[spur].id, to, { ...options, bannedEdges, bannedNodes: new Set(rootNodes.slice(0, -1).map(node => node.id)) });
        if (tail.status !== 'found') continue;
        const steps = [...rootSteps, ...tail.steps];
        const candidate = { status: 'found', distance: steps.length, nodes: [...rootNodes.slice(0, -1), ...tail.nodes], steps };
        const key = signature(candidate);
        if (!accepted.has(key)) candidates.set(key, candidate);
      }
      if (!candidates.size || searches > 256) break;
      const [key, next] = [...candidates].sort(([a, x], [b, y]) => x.distance - y.distance || a.localeCompare(b))[0];
      candidates.delete(key);
      if (paths.length === maxPaths) { truncated = true; break; }
      accepted.add(key); paths.push(next);
    }
    return { status: 'found', paths, truncated };
  };
  return find;
}
