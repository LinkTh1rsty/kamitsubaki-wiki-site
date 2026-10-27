import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStoryCatalog, storyMedia } from '../src/lib/storyCatalog.mjs';
import { readStoryProgress, writeStoryProgress, clearStoryProgress, storyProgressKey } from '../src/lib/storyProgress.mjs';
import { getEntityRegistry } from '../src/lib/entityRegistry.mjs';
import { loadFeatureData } from '../src/lib/featureData.mjs';
import { createEntityRegistry } from '../src/lib/entityRegistry.mjs';
function fixtureRegistry() {
  const data = [
    { id: 'kaf', entityType: 'virtual-avatar', name: 'KAF', relations: [{ type: 'member-of', target: 'vwp' }] },
    { id: 'vwp', entityType: 'unit', name: 'V.W.P' },
    { id: 'creator', entityType: 'person', name: 'Creator', roles: ['composer'], classification: { primary: 'creators' } },
    { id: 'song', entityType: 'work-track', title: 'Song', releaseDate: '2020', performers: [{ entity: 'kaf', role: 'vocal' }], credits: [{ entity: 'creator', role: 'composer' }] },
    { id: 'stub', entityType: 'work-track', title: 'Stub', contentStatus: 'stub', performers: [{ entity: 'kaf', role: 'vocal' }] },
  ];
  const registry = createEntityRegistry(data.map(d => ({ data: { ...d, locale: 'zh', schemaVersion: 2 }, body: 'SECRET-BODY', filePath: 'SECRET-PATH' })));
  return { registry, feature: { events: [] } };
}
const localized = text => ({ zh: text, en: text, ja: text });
const chapter = (id, select) => ({ id, minutes: 3, title: localized(id), intro: localized('Intro'), prompt: localized('Question'), select });
const route = { id: 'test-route', anchor: 'kaf', title: localized('Route'), intro: localized('Intro'), outcome: localized('Outcome'), chapters: [chapter('start', { ids: ['kaf'] }), chapter('song', { anchor: 'kaf', kinds: ['work-track'], types: ['performed-by'], limit: 1 }), chapter('members', { anchor: 'vwp', members: true, limit: 5 })] };
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };

test('guided materials follow authored credits, keep editorial choices distinct and omit stubs or unknown records', () => {
  const { registry, feature } = fixtureRegistry();
  const definitions = [{ ...route, chapters: [...route.chapters, chapter('missing', { ids: ['not-real', 'stub'] }), chapter('makers', { anchor: 'kaf', collaborators: true, limit: 3 })] }];
  const c = buildStoryCatalog(registry, feature, 'zh', definitions), r = c.routes[0];
  assert.equal(r.chapters[0].materials[0].steps.length, 0);
  assert.equal(r.chapters[1].materials[0].steps[0].edge.type, 'performed-by');
  assert.equal(r.chapters[3].missing, true);
  const ids = r.chapters.flatMap(ch => ch.materials.map(m => m.node.id)); assert.equal(new Set(ids).size, ids.length);
  for (const ch of r.chapters) for (const m of ch.materials) for (const step of m.steps) {
    assert.equal(step.edge.source === step.from || step.edge.target === step.from, true);
    assert.equal(step.edge.source === step.to || step.edge.target === step.to, true);
    assert.ok(step.edge.evidence);
  }
  assert.ok(!JSON.stringify(c).includes('SECRET-BODY'));
});

test('media uses explicit directives and recorded URLs, excluding code, comments, unsupported domains and unsafe links', () => {
  const media = storyMedia({}, '@[youtube](abcdefghijk "A song")\n\n```md\n@[youtube](AAAAAAAAAAA)\n```\n<!-- @[youtube](BBBBBBBBBBB) -->\n[Watch](https://youtu.be/abcdefghijk)\n[False](https://youtube.com.evil.test/watch?v=CCCCCCCCCCC)\n@[youtube](javascript:alert)\n@[youtube](too-short)');
  assert.equal(media.length, 1); assert.equal(media[0].src, 'https://www.youtube-nocookie.com/embed/abcdefghijk');
  assert.equal(media[0].href, 'https://www.youtube.com/watch?v=abcdefghijk');
  assert.equal(storyMedia({ media: [{ platform: 'youtube', id: 'ZYXWVUTSRQP', type: 'music-video' }] })[0].provider, 'youtube');
  assert.equal(storyMedia({}, '```md\n@[youtube](abcdefghijk)').length, 0);
  assert.equal(storyMedia({}, '    @[youtube](abcdefghijk)').length, 0);
  const explicit=storyMedia({},'@[youtube](abcdefghijk)\n[Unrelated](https://youtu.be/ZYXWVUTSRQP)',{includeLinks:false});assert.equal(explicit.length,1);assert.ok(explicit[0].src.endsWith('/abcdefghijk'));
});

test('saved progress is scoped by route and fingerprint, validates chapter keys and leaves other routes intact', () => {
  const s = storage(), r = { id: 'one', fingerprint: 'old', chapters: [{ id: 'a' }, { id: 'b' }] }, other = { ...r, id: 'two' };
  writeStoryProgress(s, r, { current: 'b', completed: ['a', 'a', 'invented'] });
  writeStoryProgress(s, other, { current: 'a', completed: ['a'] });
  const progress = readStoryProgress(s, r); assert.equal(progress.current, 'b'); assert.deepEqual(progress.completed, ['a']);
  assert.deepEqual(readStoryProgress(s, { ...r, fingerprint: 'new' }).completed, []);
  assert.equal(readStoryProgress(s, { ...r, fingerprint: 'new' }).changed, true);
  clearStoryProgress(s, r); assert.deepEqual(readStoryProgress(s, other).completed, ['a']);
  s.setItem(storyProgressKey, 'bad json'); assert.equal(readStoryProgress(s, r).corrupt, true);
  assert.throws(() => readStoryProgress({ getItem() { throw Error('Disabled storage'); } }, r));
});

test('real routes have complete materials, verified concert types, playable media and identical selections in five languages', async () => {
  const registry = await getEntityRegistry(), feature = await loadFeatureData(), c = buildStoryCatalog(registry, feature);
  assert.equal(c.routes.length, 7); assert.deepEqual(c.routes.slice(0,5).map(r => r.minutes), [20, 30, 45, 25, 30]);
  for (const route of c.routes) {
    assert.equal(route.chapters.length, 6); assert.equal(route.chapters.some(ch => ch.missing), false);
    const ids = route.chapters.flatMap(ch => ch.materials.map(m => m.node.id)); assert.equal(ids.length, new Set(ids).size);
    for (const ch of route.chapters) for (const m of ch.materials) if (m.node.kind === 'live-event') assert.ok(['oneman-live', 'joint-live', 'xr-sinka-live'].includes(registry.resolveEntity(m.node.id).data.eventType));
  }
  assert.equal(c.routes[1].chapters[1].materials.length, 5);
  assert.ok(c.routes[0].chapters[1].materials.some(m => m.node.media.some(v => v.kind === 'video')));
  assert.ok(c.routes[2].chapters.some(ch => ch.resources.length === 4));
  for (const locale of ['en', 'ja', 'zh-tw', 'zh-hk']) assert.deepEqual(buildStoryCatalog(registry, feature, locale).routes.map(r => r.fingerprint), c.routes.map(r => r.fingerprint));
  assert.ok(!JSON.stringify(c).includes('filePath'));
});
