import test from 'node:test';
import assert from 'node:assert/strict';
import { createGraphIndex, selectGraph, searchGraphNodes, graphConnections, graphEdgeKey } from '../src/lib/graphModel.mjs';
import { createGraphLayout } from '../src/lib/graphLayout.mjs';
import { createRelationPathFinder } from '../src/lib/relationPaths.mjs';
import { graphCopy } from '../src/lib/graphCopy.mjs';
const node = (id, kind = 'person', extra = {}) => ({ id, title: id, kind, path: '/zh/database/' + id + '/', ...extra });
const edge = (source, target, type = 'member-of', extra = {}) => ({ source, target, type, evidence: '/zh/database/' + source + '/', ...extra });

test('graph preserves every valid and isolated entity while retaining distinct authored roles and dates', () => {
  const catalog = { nodes: [node('a'), node('b'), node('alone'), node('a', 'person', { title: 'Duplicate' })],
    edges: [edge('a', 'b'), edge('a', 'b'), edge('a', 'b', 'credited-to', { role: 'composer' }), edge('a', 'b', 'credited-to', { role: 'lyricist' }),
      edge('b', 'a', 'member-of', { startDate: '2021' }), edge('a', 'absent'), edge('a', 'a')] };
  const index = createGraphIndex(catalog);
  assert.equal(index.nodes.length, 3); assert.equal(index.edges.length, 4); assert.equal(index.omitted, 2);
  assert.equal(index.byId.get('alone').degree, 0); assert.equal(index.byId.get('a').degree, 1);
  assert.equal(index.byId.get('a').title, 'a'); assert.equal(catalog.nodes[0].degree, undefined);
  const incoming = graphConnections(selectGraph(index), 'b');
  assert.equal(incoming.length, 4); assert.equal(incoming.filter(item => item.inverse).length, 3);
  assert.equal(incoming[0].edge.evidence, '/zh/database/a/');
});

test('global and local filters retain isolated nodes, allow up to three layers and never infer memberships', () => {
  const index = createGraphIndex({ nodes: [node('a'), node('b'), node('c'), node('d'), node('alone'), node('event', 'events')],
    edges: [edge('a', 'b'), edge('b', 'c'), edge('c', 'd'), edge('event', 'a', 'chronicle-footprint')] });
  assert.equal(selectGraph(index).nodes.length, 5); assert.equal(selectGraph(index, { events: true }).nodes.length, 6);
  assert.deepEqual(selectGraph(index, { scope: 'neighborhood', entry: 'a' }).nodes.map(item => item.id), ['a', 'b']);
  assert.deepEqual(selectGraph(index, { scope: 'neighborhood', entry: 'a', depth: 2 }).nodes.map(item => item.id), ['a', 'b', 'c']);
  assert.equal(selectGraph(index, { scope: 'neighborhood', entry: 'a', depth: 99 }).nodes.length, 4);
  assert.equal(selectGraph(index, { scope: 'neighborhood', entry: 'absent' }).nodes.length, 0);
  assert.equal(selectGraph(index, { relation: 'credited-to' }).edges.length, 0);
  assert.equal(selectGraph(index, { relation: 'credited-to' }).nodes.length, 5);
  assert.deepEqual(selectGraph(index, { kind: 'events', events: true }).nodes.map(item => item.id), ['event']);
});

test('graph search folds Chinese and combines terms including stable IDs without merging ambiguous names', () => {
  const index = createGraphIndex({ nodes: [node('kaf', 'person', { title: '花譜', aliases: ['花谱'], subtitle: 'KAF' }), node('other', 'person', { title: '花譜' })], edges: [] });
  assert.deepEqual(searchGraphNodes(index.nodes, '花谱 KAF').map(item => item.id), ['kaf']);
  assert.equal(searchGraphNodes(index.nodes, '花譜').length, 2);
  assert.equal(searchGraphNodes(index.nodes, 'unknown').length, 0);
});

test('path comparison returns shorter loopless alternatives, recorded directions and bounded coverage', () => {
  const catalog = { nodes: ['a', 'x', 'y', 'w', 'z'].map(id => node(id)),
    edges: [edge('a', 'x'), edge('z', 'x'), edge('a', 'y'), edge('y', 'z'), edge('x', 'w'), edge('w', 'z'), edge('a', 'w')] };
  const result = createRelationPathFinder(catalog).compare('a', 'z');
  assert.equal(result.status, 'found'); assert.equal(result.paths.length, 3); assert.equal(result.truncated, true);
  assert.deepEqual(result.paths.map(path => path.distance), [2, 2, 2]);
  assert.equal(result.paths.find(path => path.nodes[1].id === 'x').steps[1].inverse, true);
  for (const path of result.paths) assert.equal(new Set(path.nodes.map(item => item.id)).size, path.nodes.length);
  assert.deepEqual(createRelationPathFinder(catalog).compare('a', 'a').paths[0].distance, 0);
});

test('path comparison obeys node, edge and timeline filters and distinguishes multiple authored roles', () => {
  const finder = createRelationPathFinder({ nodes: [node('a'), node('b'), node('event', 'events')],
    edges: [edge('a', 'b', 'credited-to', { role: 'composer' }), edge('a', 'b', 'credited-to', { role: 'lyricist' }), edge('event', 'a', 'chronicle-footprint'), edge('event', 'b', 'chronicle-footprint')] });
  assert.equal(finder.compare('a', 'b').paths.length, 2);
  assert.equal(finder.compare('a', 'b', { includeChronicle: true }).paths.length, 3);
  assert.equal(finder.compare('a', 'b', { relation: 'member-of' }).status, 'unconnected');
  assert.equal(finder.compare('a', 'b', { kind: 'work-track' }).status, 'invalid');
  assert.equal(finder.compare('event', 'b').status, 'invalid');
  assert.equal(finder.compare('missing', 'b').status, 'invalid');
});

test('bounded shortest alternatives agree with independent exhaustive simple paths on small networks', () => {
  for (let seed = 1; seed <= 14; seed++) {
    const nodes = ['a', 'b', 'c', 'd', 'e', 'f'].map(id => node(id)), edges = [];
    for (let a = 0; a < nodes.length; a++) for (let b = a + 1; b < nodes.length; b++) if ((a * 19 + b * 7 + seed * 13) % 5 < 3) edges.push(edge(nodes[a].id, nodes[b].id));
    const lengths = [];
    function enumerate(current, visited) {
      if (current === 'f') { lengths.push(visited.size - 1); return; }
      for (const item of edges) {
        const next = item.source === current ? item.target : item.target === current ? item.source : null;
        if (next && !visited.has(next)) enumerate(next, new Set([...visited, next]));
      }
    }
    enumerate('a', new Set(['a'])); lengths.sort((a, b) => a - b);
    const comparison = createRelationPathFinder({ nodes, edges }).compare('a', 'f');
    assert.deepEqual(comparison.paths.map(path => path.distance), lengths.slice(0, 3), 'seed ' + seed);
    assert.equal(comparison.truncated, lengths.length > 3);
    const signatures = comparison.paths.map(path => path.steps.map(step => graphEdgeKey(step.edge)).join('|'));
    assert.equal(new Set(signatures).size, signatures.length);
  }
});

test('large force layout includes every node, converges to finite positions and supports pinned nodes', () => {
  const nodes = Array.from({ length: 2500 }, (_, index) => node('node-' + index));
  const edges = nodes.slice(1, 2300).map(item => edge('node-0', item.id));
  const layout = createGraphLayout(nodes, edges);
  assert.equal(layout.positions.length, 5000);
  layout.pin('node-7', 12, 34); layout.step(8);
  assert.equal(layout.positions[14], 12); assert.equal(layout.positions[15], 34);
  assert.ok([...layout.positions].every(Number.isFinite));
  assert.notEqual(layout.positions[4800], layout.positions[4802]);
  const one = createGraphLayout([node('one')], []); one.step(5); assert.ok([...one.positions].every(Number.isFinite));
  assert.equal(createGraphLayout([], []).step(5).length, 0);
});

test('layout initialization is deterministic and five locales include graph and comparison copy', () => {
  const nodes = ['a', 'b', 'c'].map(id => node(id)), edges = [edge('a', 'b')];
  assert.deepEqual(createGraphLayout(nodes, edges).positions, createGraphLayout(nodes, edges).positions);
  for (const locale of ['zh', 'zh-tw', 'zh-hk', 'en', 'ja']) {
    const c = graphCopy(locale);
    assert.ok(c.title && c.scope && c.path.compare && c.path.limited && c.kinds['work-track']);
    assert.notEqual(c.kinds['work-track'], 'work-track');
  }
});
