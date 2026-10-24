import test from 'node:test';
import assert from 'node:assert/strict';
import { createRelationPathFinder, relationEndpointLabel, resolveRelationEndpoint } from '../src/lib/relationPaths.mjs';
import { relationPathCopy } from '../src/lib/relationPathCopy.mjs';

const node = (id, title = id, extra = {}) => ({ id, title, kind: 'person', path: `/zh/database/artists/solo/${id}/`, ...extra });
const edge = (source, target, type = 'member-of') => ({ source, target, type, evidence: `/zh/database/${source}/` });

test('shortest paths traverse both directions and retain authored evidence, types and role metadata', () => {
  const credit = { ...edge('song', 'kaf', 'performed-by'), role: 'lead-vocal' };
  const catalog = { nodes: ['kaf', 'rim', 'vwp', 'song', 'composer'].map(id => node(id)),
    edges: [credit, edge('song', 'composer', 'credited-to'), edge('composer', 'rim', 'persona-related'), edge('kaf', 'vwp'), edge('rim', 'vwp')] };
  const find = createRelationPathFinder(catalog);
  const shortest = find('kaf', 'rim');
  assert.equal(shortest.status, 'found'); assert.equal(shortest.distance, 2);
  assert.deepEqual(shortest.nodes.map(item => item.id), ['kaf', 'vwp', 'rim']);
  assert.deepEqual(shortest.steps.map(item => item.inverse), [false, true]);
  const reversed = find('kaf', 'song');
  assert.equal(reversed.steps[0].edge, credit);
  assert.equal(reversed.steps[0].inverse, true);
  assert.equal(reversed.steps[0].edge.role, 'lead-vocal');
  assert.equal(reversed.steps[0].edge.evidence, '/zh/database/song/');
});

test('cycles, self-links, duplicate links and dangling references cannot manufacture paths', () => {
  const catalog = { nodes: ['a', 'b', 'c', 'isolated'].map(id => node(id)),
    edges: [edge('a', 'a'), edge('a', 'missing'), edge('missing', 'isolated'), edge('a', 'b'), edge('a', 'b'), edge('b', 'c'), edge('c', 'a')] };
  const find = createRelationPathFinder(catalog);
  assert.equal(find('a', 'isolated').status, 'unconnected');
  assert.equal(find('a', 'missing').status, 'invalid');
  assert.equal(find('', 'a').status, 'invalid');
  assert.equal(find('a', 'a').distance, 0);
  assert.equal(find('a', 'c').distance, 1);
});

test('timeline events are an explicit opt-in and do not replace entity connections by default', () => {
  const catalog = { nodes: [node('kaf'), node('rim'), node('event', 'Concert', { kind: 'events', collection: 'chronicle' })],
    edges: [edge('event', 'kaf', 'chronicle-footprint'), edge('event', 'rim', 'chronicle-footprint')] };
  const find = createRelationPathFinder(catalog);
  assert.equal(find('kaf', 'rim').status, 'unconnected');
  assert.equal(find('event', 'kaf').status, 'invalid');
  assert.deepEqual(find('kaf', 'rim', { includeChronicle: true }).nodes.map(item => item.id), ['kaf', 'event', 'rim']);
  assert.equal(find('event', 'kaf', { includeChronicle: true }).distance, 1);
});

test('equal-length paths are stable when the input edge order changes', () => {
  const nodes = ['a', 'b', 'c', 'd'].map(id => node(id));
  const edges = [edge('a', 'c'), edge('c', 'd'), edge('a', 'b'), edge('b', 'd')];
  const first = createRelationPathFinder({ nodes, edges })('a', 'd');
  const second = createRelationPathFinder({ nodes, edges: [...edges].reverse() })('a', 'd');
  assert.deepEqual(first.nodes.map(item => item.id), ['a', 'b', 'd']);
  assert.deepEqual(first.nodes.map(item => item.id), second.nodes.map(item => item.id));
});

test('endpoint resolution accepts IDs, folded names, aliases and choices but rejects ambiguous names', () => {
  const nodes = [node('kaf', '花譜', { subtitle: 'KAF', aliases: ['花谱酱'] }), node('one', '同名'), node('two', '同名')];
  for (const text of ['kaf', 'KAF', '花谱', '花譜', '花谱酱', relationEndpointLabel(nodes[0])]) {
    assert.equal(resolveRelationEndpoint(nodes, text)?.id, 'kaf');
  }
  assert.equal(resolveRelationEndpoint(nodes, '同名'), null);
  assert.equal(resolveRelationEndpoint(nodes, '花'), null);
  assert.equal(resolveRelationEndpoint(nodes, ''), null);
  assert.equal(resolveRelationEndpoint(nodes, relationEndpointLabel(nodes[2]))?.id, 'two');
});

test('relation copy supports all five locales and labels canonical v2 links', () => {
  for (const locale of ['zh', 'zh-tw', 'zh-hk', 'ja', 'en']) {
    const copy = relationPathCopy(locale);
    assert.ok(copy.title && copy.relationLabels['performed-by'] && copy.roleLabels.composer);
    assert.ok(copy.found.includes('{count}'));
    assert.notEqual(copy.relationLabels['chronicle-footprint'], 'chronicle-footprint');
  }
});
