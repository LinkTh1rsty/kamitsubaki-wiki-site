import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { relationPathCopy } from '../src/lib/relationPathCopy.mjs';
import { knowledgeCopy } from '../src/lib/knowledgeCopy.mjs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const pathBundle = await build({ entryPoints: ['src/scripts/relationPath.js'], bundle: true, write: false, format: 'iife', globalName: 'PathUI' });
const boardBundle = await build({ entryPoints: ['src/scripts/knowledgeBoard.js'], bundle: true, write: false, format: 'iife' });
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check) { for (let index = 0; index < 50 && !check(); index++) await sleep(10); assert.ok(check()); }
const pathMarkup = `<section data-relation-path><form data-path-form><input data-path-from required><input data-path-to required><button type="button" data-path-swap></button><input type="checkbox" data-path-chronicle><datalist data-path-options></datalist><button data-path-submit></button></form><p data-path-status></p><ol data-path-results></ol></section>`;

test('path UI restores shared IDs, swaps endpoints, retains graph selection and restores browser history', async () => {
  const dom = new JSDOM(pathMarkup, { url: 'https://wiki.example/zh/explore/relations/?entry=kaf&from=kaf&to=rim', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    w.eval(`${pathBundle.outputFiles[0].text}\nwindow.PathUI = PathUI;`);
    const catalog = { nodes: [['kaf', '花譜'], ['rim', '理芽'], ['vwp', 'V.W.P']].map(([id, title]) => ({ id, title, kind: 'person', path: `/zh/database/${id}/` })),
      edges: [{ source: 'kaf', target: 'vwp', type: 'member-of', evidence: '/zh/database/kaf/' }, { source: 'rim', target: 'vwp', type: 'member-of', evidence: '/zh/database/rim/' }] };
    let explored;
    const controller = w.PathUI.initializeRelationPath(w.document.querySelector('[data-relation-path]'), {
      catalog, copy: relationPathCopy('zh'), getURL: () => new URL(w.location.href),
      setURL: (params, { push } = {}) => w.history[push ? 'pushState' : 'replaceState']({}, '', `?${params}`),
      onExplore: id => { explored = id; },
    });
    w.addEventListener('popstate', () => controller.activate());
    assert.equal(w.document.querySelectorAll('[data-path-results] li').length, 3);
    assert.equal(w.document.querySelectorAll('.relation-path-connection a').length, 2);
    w.document.querySelectorAll('.relation-path-entry button')[1].click(); assert.equal(explored, 'vwp');
    w.document.querySelector('[data-path-swap]').click();
    assert.equal(w.location.search, '?entry=kaf&from=rim&to=kaf');
    assert.equal(w.document.querySelector('[data-path-from]').value, '理芽 · rim');
    w.history.back(); await until(() => w.document.querySelector('[data-path-from]').value === '花譜 · kaf');
    assert.equal(w.location.search, '?entry=kaf&from=kaf&to=rim');
    w.history.forward(); await until(() => w.document.querySelector('[data-path-from]').value === '理芽 · rim');
    const from = w.document.querySelector('[data-path-from]');
    from.value = 'unknown'; from.dispatchEvent(new w.Event('input', { bubbles: true }));
    w.document.querySelector('[data-path-form]').dispatchEvent(new w.Event('submit', { cancelable: true }));
    assert.equal(w.document.querySelectorAll('[data-path-results] li').length, 0);
    assert.ok(from.validationMessage); assert.equal(w.location.search, '?entry=kaf&from=rim&to=kaf');
    from.value = 'kaf'; from.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(from.validationMessage, '');
  } finally { w.close(); }
});

test('path UI distinguishes recorded-event opt-in from an unconnected pair and escapes entry titles', () => {
  const dom = new JSDOM(pathMarkup, { url: 'https://wiki.example/en/explore/relations/?from=a&to=b', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    w.eval(`${pathBundle.outputFiles[0].text}\nwindow.PathUI = PathUI;`);
    const catalog = { nodes: [{ id: 'a', title: '<img src=x onerror=alert(1)>', path: '/en/database/a/', kind: 'person' }, { id: 'b', title: 'B', path: '/en/database/b/', kind: 'person' }, { id: 'event', title: 'Event', kind: 'events', path: '/en/chronicle/#event' }],
      edges: [{ source: 'event', target: 'a', type: 'chronicle-footprint', evidence: '/en/chronicle/#event' }, { source: 'event', target: 'b', type: 'chronicle-footprint', evidence: '/en/chronicle/#event' }] };
    w.PathUI.initializeRelationPath(w.document.querySelector('[data-relation-path]'), { catalog, copy: relationPathCopy('en'), getURL: () => new URL(w.location.href), setURL: params => w.history.replaceState({}, '', `?${params}`), onExplore: () => {} });
    assert.match(w.document.querySelector('[data-path-status]').textContent, /No connection/);
    assert.equal(w.document.querySelectorAll('[data-path-options] option').length, 2);
    const checkbox = w.document.querySelector('[data-path-chronicle]'); checkbox.checked = true; checkbox.dispatchEvent(new w.Event('change'));
    assert.equal(new URL(w.location.href).searchParams.get('events'), '1');
    assert.equal(w.document.querySelectorAll('[data-path-results] li').length, 3);
    assert.equal(w.document.querySelectorAll('img').length, 0);
    assert.match(w.document.querySelector('[data-path-results]').textContent, /<img src=x/);
    assert.equal(w.document.querySelectorAll('[data-path-options] option').length, 3);
  } finally { w.close(); }
});

test('knowledge board combines filters, paginates, restores a shared URL and renders names as text', async () => {
  const markup = `<main data-knowledge-board><script data-quality-data type="application/json"></script><form data-quality-form data-quality-controls hidden><input name="q"><select name="type"><option value="">All</option><option value="work-track">Songs</option></select><select name="field"><option value="">All</option><option value="credits">Credits</option><option value="sources">Sources</option></select><select name="sort"><option value="missing">Missing</option><option value="score">Score</option><option value="title">Title</option></select><button type="reset">Reset</button></form><button data-quality-controls data-quality-field="credits" hidden>Credits</button><p data-quality-count></p><div data-quality-results></div><p data-quality-empty hidden></p><button data-quality-more data-quality-controls hidden>More</button></main>`;
  const dom = new JSDOM(markup, { url: 'https://wiki.example/zh/contribute/missing/?type=work-track&field=credits', runScripts: 'outside-only' });
  const w = dom.window;
  try {
    const entries = Array.from({ length: 30 }, (_, index) => ({ id: `song-${index}`, title: index ? `Song ${index}` : '<script>alert(1)</script>', entityType: 'work-track', score: 40, path: `/zh/database/song-${index}/`, editHref: `/zh/contribute/editor/?target=song-${index}`, sourceLocale: 'zh', search: `song-${index} 花谱 kaf`, missing: [{ field: 'credits' }, { field: 'sources' }] }));
    entries.push({ id: 'other', title: 'Other', entityType: 'person', score: 50, path: '/zh/database/other/', search: 'other', missing: [{ field: 'sources' }] });
    w.document.querySelector('[data-quality-data]').textContent = JSON.stringify({ entries, copy: knowledgeCopy('zh') });
    w.eval(boardBundle.outputFiles[0].text);
    assert.equal(w.document.querySelectorAll('.knowledge-entry').length, 24);
    assert.match(w.document.querySelector('[data-quality-count]').textContent, /24 \/ 30/);
    assert.equal(w.document.querySelector('[data-quality-field]').getAttribute('aria-pressed'), 'true');
    w.document.querySelector('[data-quality-more]').click();
    assert.equal(w.document.querySelectorAll('.knowledge-entry').length, 30);
    assert.equal(w.document.querySelector('[data-quality-more]').hidden, true);
    assert.equal(w.document.querySelectorAll('.knowledge-entry script').length, 0);
    assert.match(w.document.querySelector('[data-quality-results]').textContent, /<script>alert/);
    const query = w.document.querySelector('input[name=q]'); query.value = '花譜 KAF'; query.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(w.document.querySelectorAll('.knowledge-entry').length, 24);
    assert.equal(new URL(w.location.href).searchParams.get('q'), '花譜 KAF');
    const field = w.document.querySelector('select[name=field]'), historyLength = w.history.length;
    field.value = 'sources';
    field.dispatchEvent(new w.Event('input', { bubbles: true }));
    field.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.history.length, historyLength + 1, 'Selecting a field creates a restorable history entry');
    const restoredField = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.history.back(); await restoredField;
    assert.equal(field.value, 'credits'); assert.equal(query.value, '花譜 KAF');
    query.value = 'missing'; query.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(w.document.querySelector('[data-quality-empty]').hidden, false);
    w.document.querySelector('[data-quality-form] button[type=reset]').click(); await sleep(0);
    assert.equal(w.location.search, ''); assert.match(w.document.querySelector('[data-quality-count]').textContent, /24 \/ 31/);
    const restoredReset = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.history.back(); await restoredReset;
    assert.equal(query.value, 'missing'); assert.equal(field.value, 'credits');
    assert.equal(w.document.querySelector('[data-quality-empty]').hidden, false);
    const clearedAgain = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.history.forward(); await clearedAgain;
    w.document.querySelector('[data-quality-field]').click();
    assert.equal(new URL(w.location.href).searchParams.get('field'), 'credits');
    w.history.back(); await until(() => w.document.querySelector('select[name=field]').value === '');
    assert.match(w.document.querySelector('[data-quality-count]').textContent, /24 \/ 31/);
  } finally { w.close(); }
});
