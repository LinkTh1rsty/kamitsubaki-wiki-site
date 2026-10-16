import test from 'node:test';
import assert from 'node:assert/strict';
import { createDiscoveryEngine, readDiscoveryState, discoveryParams, validDiscoveryDay, discoveryDay } from '../src/lib/discoveryEngine.mjs';
import { fixtureCatalog } from './helpers/discovery-fixture.mjs';
import { readDiscoveryArticles } from '../src/lib/discoveryArticles.mjs';
import { discoveryCopy } from '../src/lib/discoveryCopy.mjs';

const state = query => readDiscoveryState(new URLSearchParams(query), '2026-10-13');

test('preferences use explicit direct and two-step relations without guessing unlinked credits or memberships', () => {
  const catalog = fixtureCatalog(), engine = createDiscoveryEngine(catalog), plan = engine.plan(state('artist=kaf'));
  assert.ok(plan.items.some(item => item.node.id === 'song-a'));
  assert.ok(plan.items.some(item => item.node.id === 'rim'));
  assert.equal(plan.items.some(item => ['kaf', 'other', 'dangling'].includes(item.node.id)), false);
  for (const item of plan.items) assert.ok(item.affinity.steps.length <= 2);
  assert.equal(engine.plan(state('artist=guiano')).invalid.length, 1);
  const named = engine.plan(state('q=Guiano'));
  assert.deepEqual(named.items.map(item => item.node.id), ['song-a']);
  assert.equal(named.items[0].reasons[0].type, 'keyword');
});

test('metadata filters combine without relaxing style, year, type or keywords and retain authored date precision', () => {
  const engine = createDiscoveryEngine(fixtureCatalog());
  const match = engine.plan(state('artist=kaf&style=genre%3Aballad&year=2020&radius=0&kind=work-track'));
  assert.deepEqual(match.items.map(item => item.node.id), ['song-a']); assert.equal(match.items[0].node.date.label, '2020');
  assert.equal(engine.plan(state('artist=kaf&style=genre%3Aballad&year=2017&radius=0')).items.length, 0);
  assert.equal(engine.plan(state('year=2020&radius=0')).items.some(item => item.node.id === 'song-undated'), false);
  assert.equal(engine.plan(state('artist=kaf&style=tag%3Aartist-tag&kind=work-track')).items.length, 0, 'Artist style is not inherited by songs');
  assert.deepEqual(engine.plan(state('kind=live-event&year=2021&radius=0')).items.map(item => item.node.id), ['live']);
  assert.equal(engine.plan(state('q=no-such-metadata')).route.length, 0);
});

test('daily recommendations and walks are reproducible across locales, with variations and shared dated URLs', () => {
  const query = 'artist=kaf&day=2026-10-13&length=7';
  const ids = plan => ({ items: plan.items.map(item => item.node.id), route: plan.route.map(item => item.node.id) });
  const baseline = ids(createDiscoveryEngine(fixtureCatalog('zh')).plan(state(query)));
  for (const locale of ['en', 'ja']) {
    assert.equal(fixtureCatalog(locale).signature, fixtureCatalog('zh').signature);
    assert.deepEqual(ids(createDiscoveryEngine(fixtureCatalog(locale)).plan(state(query))), baseline);
  }
  const engine = createDiscoveryEngine(fixtureCatalog()), variations = new Set();
  for (let variant = 0; variant < 8; variant++) variations.add(engine.plan(state(query + '&variant=' + variant)).route.map(item => item.node.id).join(','));
  assert.ok(variations.size > 1);
  const shared = discoveryParams(state('artist=kaf&artist=rim&year=2020'), { freezeDay: true });
  assert.equal(shared.get('day'), '2026-10-13'); assert.deepEqual(shared.getAll('artist'), ['kaf', 'rim']);
  assert.equal(readDiscoveryState(shared, '2026-10-15').day, '2026-10-13');
});

test('routes contain only verified edges, never repeat nodes or invent missing stops, and balance recommendation types', () => {
  const catalog = fixtureCatalog(), engine = createDiscoveryEngine(catalog);
  for (let variant = 0; variant < 8; variant++) {
    const plan = engine.plan(state('artist=kaf&events=1&length=7&variant=' + variant));
    assert.ok(plan.route.length <= 7);
    assert.equal(new Set(plan.route.map(item => item.node.id)).size, plan.route.length);
    for (let i = 1; i < plan.route.length; i++) {
      const { step } = plan.route[i], previous = plan.route[i - 1].node.id;
      assert.equal(step.from, previous); assert.equal(step.to, plan.route[i].node.id);
      assert.ok(catalog.edges.some(edge => edge.source === step.edge.source && edge.target === step.edge.target && edge.type === step.edge.type));
      assert.equal(step.inverse, step.edge.target === previous);
    }
  }
  assert.deepEqual(engine.plan(state('start=other')).route.map(item => item.node.id), ['other']);
  assert.equal(engine.plan(state('start=other&year=2020')).route.length, 0);
  assert.ok(engine.plan(state('start=song-a&style=genre%3Aballad')).route.length > 0, 'A matching explicit start remains useful without other tagged matches');
  assert.ok(new Set(engine.plan(state('artist=kaf')).items.slice(0, 6).map(item => item.node.kind)).size >= 3);
});

test('invalid date and preference URLs are explicit, UTC boundaries are stable and event inclusion is intentional', () => {
  assert.equal(validDiscoveryDay('2024-02-29'), true); assert.equal(validDiscoveryDay('2025-02-29'), false);
  assert.equal(discoveryDay(new Date('2026-10-13T23:59:59Z')), '2026-10-13');
  assert.equal(state('day=2026-02-30').dayInvalid, true); assert.equal(state('day=2026-02-30').day, '2026-10-13');
  const engine = createDiscoveryEngine(fixtureCatalog());
  for (const query of ['artist=missing', 'kind=not-a-type', 'style=tag%3Amissing', 'year=oops', 'start=missing', 'start=event']) assert.ok(engine.plan(state(query)).invalid.length);
  assert.equal(engine.plan(state('start=event&events=1')).route[0].node.id, 'event');
  assert.equal(engine.plan(state('artist=kaf')).items.some(item => item.node.id === 'event'), false);
  assert.equal(engine.plan(state('artist=kaf&events=1')).items.some(item => item.node.id === 'event'), true);
  assert.ok(engine.plan(state('artist=kaf&artist=rim&artist=group&artist=other')).invalid.length);
});

test('catalog omits drafts, nonexistent endpoints, filesystem paths and bodies, with copy for five languages', () => {
  const catalog = fixtureCatalog(), serialized = JSON.stringify(catalog);
  assert.equal(catalog.nodes.some(node => node.id === 'stub'), false);
  assert.equal(catalog.edges.some(edge => edge.target === 'missing'), false);
  assert.equal(/PRIVATE_PATH|PRIVATE_BODY/.test(serialized), false);
  for (const locale of ['zh', 'zh-tw', 'zh-hk', 'en', 'ja']) {
    const c = discoveryCopy(locale); assert.ok(c.apply && c.routeTitle && c.path.historical && c.articleIncomplete);
    assert.notEqual(c.kinds['work-track'], 'work-track');
  }
});

test('public article snapshots whitelist metadata, honor pagination and discard draft rows and unknown associations', async () => {
  const calls = [];
  const snapshot = await readDiscoveryArticles('https://articles.invalid', { fetchImpl: async (href, options) => {
    calls.push({ url: new URL(href), options });
    const offset = new URL(href).searchParams.get('offset');
    return { ok: true, json: async () => offset === '0' ? { items: [{ id: 'kaf', title: 'Public article', body: 'PRIVATE_BODY', accountId: 'PRIVATE_OWNER', updatedAt: '2026-10-10 12:00:00', relatedEntities: ['kaf', 'missing', 'kaf'] }, { id: 'draft', title: 'Draft', status: 'draft' }], nextOffset: 1 }
      : { items: [{ id: 'standalone', title: 'Standalone', relatedEntities: [] }], nextOffset: null } };
  } });
  assert.equal(snapshot.status, 'complete'); assert.equal(snapshot.articles.length, 2);
  assert.ok(calls.every(call => call.options.credentials === 'omit' && !call.options.body));
  assert.equal(/PRIVATE_BODY|PRIVATE_OWNER/.test(JSON.stringify(snapshot)), false);
  const catalog = fixtureCatalog('zh', snapshot);
  assert.ok(catalog.nodes.some(node => node.id === 'article:kaf')); assert.ok(catalog.nodes.some(node => node.id === 'kaf'));
  assert.equal(catalog.edges.filter(edge => edge.source === 'article:kaf').length, 1);
  const plan = createDiscoveryEngine(catalog).plan(state('artist=kaf&kind=editorial-article'));
  assert.deepEqual(plan.items.map(item => item.node.id), ['article:kaf']);
  assert.ok(plan.items[0].node.path.includes('/articles/read/?id=kaf'));
  assert.equal(catalog.nodes.find(node => node.id === 'article:kaf').date.label, '2026-10-10');
});

test('partial and unavailable public indexes preserve verified rows and do not block archive exploration', async () => {
  const snapshot = await readDiscoveryArticles('https://articles.invalid', { fetchImpl: async href => {
    if (new URL(href).searchParams.get('offset') !== '0') throw Error('Offline');
    return { ok: true, json: async () => ({ items: [{ id: 'one', title: 'One' }], nextOffset: 1 }) };
  } });
  assert.equal(snapshot.status, 'partial'); assert.equal(snapshot.articles.length, 1);
  const offline = await readDiscoveryArticles('https://articles.invalid', { fetchImpl: async () => { throw Error('Offline'); } });
  assert.equal(offline.status, 'unavailable');
  assert.ok(createDiscoveryEngine(fixtureCatalog('zh', offline)).plan(state('')).items.length > 0);
});
