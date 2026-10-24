import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { fixtureCatalog } from './helpers/discovery-fixture.mjs';
import { discoveryCopy } from '../src/lib/discoveryCopy.mjs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const bundle = await build({ entryPoints: ['src/scripts/discoveryApp.js'], bundle: true, write: false, format: 'iife', globalName: 'DiscoveryUI' });
const markup = '<main id="test-discovery" data-locale="zh"><p data-discovery-load-status></p><a data-discovery-reload hidden></a><form data-discovery-form hidden><select name="artist"><option value="">Any</option></select><select name="artist"><option value="">Any</option></select><select name="artist"><option value="">Any</option></select><select name="kind"><option value="">Any</option></select><select name="style"><option value="">Any</option></select><input type="number" name="year"><select name="radius"><option>0</option><option>2</option><option>5</option></select><select name="length"><option>3</option><option>5</option><option>7</option></select><input type="date" name="day"><input name="q"><input name="start"><input type="checkbox" name="events"><datalist data-discovery-options></datalist><button type="submit">Explore</button><button type="reset">Reset</button><p data-discovery-status></p></form><h2 data-discovery-route-title tabindex="-1">Route</h2><time data-discovery-day></time><span data-discovery-day-metric></span><ol data-discovery-route></ol><p data-discovery-route-empty hidden></p><p data-discovery-route-short hidden></p><div data-discovery-controls hidden><button data-discovery-reroll></button><button data-discovery-today></button><button data-discovery-share></button><button data-discovery-previous></button><button data-discovery-next></button><p data-discovery-progress></p></div><p data-discovery-share-status></p><input data-discovery-share-url hidden><p data-discovery-count></p><ul data-discovery-results></ul><div data-discovery-empty hidden><button data-discovery-clear-style></button></div><button data-discovery-more></button></main>';
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
function setup(query = '', catalog = fixtureCatalog()) {
  const dom = new JSDOM(markup, { url: 'https://wiki.example/zh/explore/discovery/' + query, runScripts: 'outside-only' }), w = dom.window;
  w.eval(bundle.outputFiles[0].text + '\nwindow.DiscoveryUI = DiscoveryUI;');
  let date = new Date('2026-10-13T23:59:59Z');
  const controller = w.DiscoveryUI.initializeDiscovery(w.document.querySelector('main'), { catalog, copy: discoveryCopy('zh'), now: () => date });
  return { dom, w, controller, setTime(value) { date = new Date(value); } };
}
const submit = w => w.document.querySelector('[data-discovery-form]').dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));

test('discovery applies combined metadata preferences, explains paths and restores shared conditions with history', async () => {
  const { dom, w, controller } = setup('?artist=kaf&year=2020&radius=0&kind=work-track');
  try {
    assert.equal(w.document.querySelector('[name=artist]').value, 'kaf'); assert.equal(w.document.querySelector('[name=year]').value, '2020');
    assert.deepEqual([...controller.plan.items.map(item => item.node.id)], ['song-a']);
    assert.ok(w.document.querySelector('.discovery-evidence a'));
    const style = w.document.querySelector('[name=style]'); style.value = 'genre:ballad'; submit(w);
    assert.equal(new URL(w.location.href).searchParams.get('style'), 'genre:ballad');
    const q = w.document.querySelector('[name=q]'); q.value = 'no-such-archive'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.match(w.document.querySelector('[data-discovery-status]').textContent, /条件已修改/);
    assert.equal(controller.plan.items.length, 1, 'Unsubmitted drafts do not silently change the shared route');
    w.document.querySelector('[data-discovery-next]').click();
    assert.equal(q.value, 'no-such-archive', 'Moving along the submitted route retains unsent preferences');
    submit(w); assert.equal(controller.plan.items.length, 0); assert.equal(w.document.querySelector('[data-discovery-empty]').hidden, false);
    const restored = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.history.back(); await restored; assert.equal(q.value, ''); assert.equal(controller.plan.items.length, 1);
    w.document.querySelector('button[type=reset]').click(); await tick(); assert.equal(w.location.search, ''); assert.ok(controller.plan.items.length > 1);
    const start = w.document.querySelector('[name=start]'); start.value = 'missing'; submit(w);
    assert.ok(start.validationMessage); assert.equal(w.location.search, '');
    start.value = 'kaf'; start.dispatchEvent(new w.Event('input', { bubbles: true })); submit(w);
    assert.equal(new URL(w.location.href).searchParams.get('start'), 'kaf');
  } finally { controller.destroy(); dom.window.close(); }
});

test('route variations, step navigation and continuation preserve a deterministic route and keyboard focus', () => {
  const { dom, w, controller } = setup('?artist=kaf');
  try {
    const ids = controller.plan.route.map(item => item.node.id).join(',');
    w.document.querySelector('[data-discovery-next]').click();
    assert.equal(new URL(w.location.href).searchParams.get('step'), '1');
    assert.equal(controller.plan.route.map(item => item.node.id).join(','), ids);
    assert.equal(w.document.activeElement.getAttribute('data-stop-index'), '1');
    w.document.querySelector('[data-discovery-previous]').click(); assert.equal(new URL(w.location.href).searchParams.get('step'), null);
    w.document.querySelector('[data-discovery-reroll]').click(); assert.equal(new URL(w.location.href).searchParams.get('variant'), '1');
    const next = w.document.querySelector('[data-discovery-continue]'), id = next.dataset.discoveryContinue;
    next.click(); assert.equal(controller.state.start, id);
    assert.equal(w.document.activeElement.tagName, 'H2'); assert.equal(controller.plan.route[0].node.id, id);
  } finally { controller.destroy(); dom.window.close(); }
});

test('UTC day rollover updates today routes, dated shares remain fixed and clipboard fallback shares submitted preferences', async () => {
  const { dom, w, controller, setTime } = setup('?artist=kaf');
  try {
    w.document.querySelector('[data-discovery-share]').click(); await tick();
    const field = w.document.querySelector('[data-discovery-share-url]'); assert.equal(field.hidden, false);
    const shared = new URL(field.value); assert.equal(shared.searchParams.get('day'), '2026-10-13'); assert.equal(shared.searchParams.get('artist'), 'kaf');
    setTime('2026-10-14T00:00:01Z'); controller.dayUpdate(); assert.equal(controller.state.day, '2026-10-14');
    w.history.replaceState({}, '', '?artist=kaf&day=2026-10-13'); controller.refresh(); controller.dayUpdate();
    assert.equal(controller.state.day, '2026-10-13');
    w.document.querySelector('[data-discovery-today]').click(); assert.equal(controller.state.day, '2026-10-14'); assert.equal(controller.state.fixedDay, false);
  } finally { controller.destroy(); dom.window.close(); }
});

test('reroll changes the applied route while preserving unsubmitted and invalid preference drafts', () => {
  const { dom, w, controller } = setup('?artist=kaf');
  try {
    const query = w.document.querySelector('[name=q]'), start = w.document.querySelector('[name=start]');
    query.value = 'unsubmitted keyword'; query.dispatchEvent(new w.Event('input', { bubbles: true }));
    start.value = 'not-an-entity'; start.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.document.querySelector('[data-discovery-reroll]').click();
    assert.equal(controller.state.variant, 1);
    assert.equal(controller.state.query, ''); assert.equal(controller.state.start, '');
    assert.equal(query.value, 'unsubmitted keyword'); assert.equal(start.value, 'not-an-entity');
    assert.ok(controller.plan.route.length); assert.match(w.document.querySelector('[data-discovery-status]').textContent, /条件已修改/);
    assert.equal(new URL(w.location.href).searchParams.get('q'), null);
  } finally { controller.destroy(); dom.window.close(); }
});

test('names are inert text, independent published articles do not invent graph links, and large pools paginate', () => {
  const catalog = fixtureCatalog(), original = catalog.nodes.find(node => node.id === 'song-a');
  catalog.nodes.push(...Array.from({ length: 30 }, (_, index) => ({ ...original, id: 'extra-' + index, title: index ? 'Song ' + index : '<img src=x onerror=alert(1)>', path: '/zh/database/extra-' + index + '/' })));
  catalog.nodes.push({ ...original, id: 'article:one', title: 'Article', kind: 'editorial-article', path: '/zh/articles/read/?id=one', styles: [] });
  catalog.facets.kinds.push('editorial-article');
  const { dom, w, controller } = setup('', catalog);
  try {
    assert.equal(w.document.querySelectorAll('[data-discovery-record]').length, 12);
    w.document.querySelector('[data-discovery-more]').click(); assert.equal(w.document.querySelectorAll('[data-discovery-record]').length, 24);
    assert.equal(w.document.querySelectorAll('img').length, 0);
    w.document.querySelector('[name=kind]').value = 'editorial-article'; submit(w);
    assert.equal(controller.plan.route.length, 1);
    assert.equal(w.document.querySelector('[data-discovery-record] a[href*="/graph/"]'), null);
    assert.ok(w.document.querySelector('[data-discovery-record] a[href*="/articles/read/"]'));
  } finally { controller.destroy(); dom.window.close(); }
});
