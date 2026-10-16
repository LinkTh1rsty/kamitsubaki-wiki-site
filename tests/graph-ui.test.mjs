import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { graphCopy } from '../src/lib/graphCopy.mjs';
const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const bundle = await build({ entryPoints: ['src/scripts/graphApp.js'], bundle: true, write: false, format: 'iife', globalName: 'GraphUI', define: { 'import.meta.url': '"https://wiki.invalid/graphApp.js"' } });
const markup = '<main id="graph-root"><p data-graph-load-status></p><form data-graph-form data-graph-control hidden><input name="q"><select name="kind"><option value="">All</option></select><select name="relation"><option value="">All</option></select><select name="scope"><option value="all">All</option><option value="neighborhood">Local</option></select><select name="depth"><option>1</option><option>2</option><option>3</option></select><button type="reset">Reset</button></form><section data-graph-canvas-panel hidden><p data-graph-count></p><p data-graph-layout-status></p><canvas data-graph-canvas></canvas><aside data-graph-detail></aside><ul data-graph-legend></ul><button data-graph-zoom-in></button><button data-graph-zoom-out></button><button data-graph-fit></button><button data-graph-clear-path hidden></button><button data-graph-export></button><button data-graph-share></button><p data-graph-share-status></p><input data-graph-share-url hidden></section><section data-relation-path data-path-compare><form data-path-form><input data-path-from required><input data-path-to required><button data-path-swap type="button"></button><button data-path-submit></button><input type="checkbox" data-path-chronicle><datalist data-path-options></datalist></form><p data-path-status></p><ol data-path-results></ol></section><p data-graph-list-count></p><ul data-graph-directory></ul><p data-graph-empty hidden></p><button data-graph-more data-graph-control hidden></button></main>';
const fixture = { nodes: Array.from({ length: 36 }, (_, index) => ({ id: 'n-' + index, title: index ? 'Node ' + index : '<img src=x onerror=alert(1)>', kind: 'person', path: '/zh/database/n-' + index + '/' }))
  .concat([{ id: 'event', title: 'Event', kind: 'events', path: '/zh/chronicle/#event' }]),
  edges: [{ source: 'n-0', target: 'n-1', type: 'member-of', evidence: '/zh/database/n-0/' }, { source: 'n-1', target: 'n-2', type: 'member-of', evidence: '/zh/database/n-1/' },
    { source: 'n-0', target: 'n-2', type: 'credited-to', role: 'composer', current: false, startDate: '2020', endDate: '2021', evidence: '/zh/database/n-0/' },
    { source: 'event', target: 'n-0', type: 'chronicle-footprint', evidence: '/zh/chronicle/#event' }, { source: 'event', target: 'n-2', type: 'chronicle-footprint', evidence: '/zh/chronicle/#event' }] };
const tick = () => new Promise(resolve => setTimeout(resolve, 20));
function setup(query = '') {
  const dom = new JSDOM(markup, { url: 'https://wiki.example/zh/graph/' + query, runScripts: 'outside-only' }), w = dom.window;
  w.eval(bundle.outputFiles[0].text + '\nwindow.GraphUI = GraphUI;');
  const rendered = { highlights: [], graphs: [], focuses: [] };
  const controller = w.GraphUI.initializeGraph(w.document.querySelector('main'), { catalog: fixture, copy: graphCopy('zh'), createRenderer: () => ({
    setGraph(graph) { rendered.graphs.push(graph); }, highlight(path) { rendered.highlights.push(path); }, select() {}, focus(id) { rendered.focuses.push(id); }, zoom() {}, fit() {}, destroy() {},
  }) });
  return { dom, w, controller, rendered };
}

test('whole graph UI restores filters, includes all nodes, paginates and restores history after local exploration', async () => {
  const { dom, w, controller } = setup();
  try {
    assert.equal(controller.graph.nodes.length, 36); assert.equal(w.document.querySelectorAll('[data-graph-record]').length, 30);
    w.document.querySelector('[data-graph-more]').click(); assert.equal(w.document.querySelectorAll('[data-graph-record]').length, 36);
    assert.equal(w.document.querySelectorAll('img').length, 0);
    controller.select('n-0');
    assert.equal(new URL(w.location.href).searchParams.get('entry'), 'n-0');
    const scope = w.document.querySelector('[name=scope]'); scope.value = 'neighborhood'; scope.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(controller.graph.nodes.length, 3);
    const depth = w.document.querySelector('[name=depth]'); depth.value = '2'; depth.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(new URL(w.location.href).searchParams.get('depth'), '2');
    w.history.back(); await tick(); assert.equal(depth.value, '1');
    const filter = w.document.querySelector('[name=relation]'); filter.value = 'credited-to'; filter.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(controller.graph.edges.length, 1);
    assert.match(w.document.querySelector('[data-graph-detail]').textContent, /作曲/);
    w.document.querySelector('button[type=reset]').click(); await tick();
    assert.equal(w.location.search, ''); assert.equal(controller.graph.nodes.length, 36);
    assert.equal(scope.value, 'all'); assert.equal(depth.disabled, true);
    const q = w.document.querySelector('[name=q]'); q.value = 'n-35'; q.dispatchEvent(new w.Event('input', { bubbles: true }));
    assert.equal(w.document.querySelectorAll('[data-graph-record]').length, 1);
    assert.equal(controller.graph.nodes.length, 36, 'Search locates nodes without silently cutting the graph');
  } finally { controller.destroy(); dom.window.close(); }
});

test('comparison UI highlights distinct routes, shares filter conditions and enables chronology without endpoints', () => {
  const { dom, w, controller, rendered } = setup('?from=n-0&to=n-2');
  try {
    assert.equal(w.document.querySelectorAll('[data-path-route]').length, 2);
    assert.equal(controller.path.distance, 1);
    assert.match(w.document.querySelector('[data-path-route]').textContent, /历史关联.*2020.*2021/);
    w.document.querySelectorAll('[data-path-highlight]')[1].click(); assert.equal(controller.path.distance, 2);
    assert.equal(w.document.querySelectorAll('[data-path-highlight]')[1].getAttribute('aria-pressed'), 'true');
    const filter = w.document.querySelector('[name=relation]'); filter.value = 'member-of'; filter.dispatchEvent(new w.Event('change', { bubbles: true }));
    assert.equal(w.document.querySelectorAll('[data-path-route]').length, 1); assert.equal(controller.path.distance, 2);
    assert.ok(rendered.highlights.some(path => path?.distance === 1));
    const checkbox = w.document.querySelector('[data-path-chronicle]'); checkbox.checked = true; checkbox.dispatchEvent(new w.Event('change'));
    assert.equal(new URL(w.location.href).searchParams.get('events'), '1'); assert.equal(controller.graph.nodes.length, 37);
    assert.equal(w.document.querySelectorAll('[data-path-route]').length, 1, 'Timeline edges still obey the member-of filter');
    w.document.querySelector('[data-graph-clear-path]').click(); assert.equal(controller.path, null);
    assert.equal(w.document.querySelectorAll('[data-path-highlight][aria-pressed=true]').length, 0);
  } finally { controller.destroy(); dom.window.close(); }
  const other = setup();
  try {
    const checkbox = other.w.document.querySelector('[data-path-chronicle]'); checkbox.checked = true; checkbox.dispatchEvent(new other.w.Event('change'));
    assert.equal(other.controller.graph.nodes.length, 37);
    assert.equal(new URL(other.w.location.href).searchParams.get('events'), '1');
  } finally { other.controller.destroy(); other.dom.window.close(); }
});

test('keyboard node selection transfers focus to new details and resets the previous relation scroll', () => {
  const { dom, w, controller } = setup();
  try {
    const pick = w.document.querySelector('[data-graph-choose="n-0"]'); pick.focus(); pick.click();
    assert.equal(w.document.activeElement.tagName, 'H2');
    assert.match(w.document.activeElement.textContent, /<img src/);
    const detail = w.document.querySelector('[data-graph-detail]'); detail.scrollTop = 140;
    const neighbor = detail.querySelector('[data-graph-neighbor="n-1"]'); neighbor.focus(); neighbor.click();
    assert.equal(w.document.activeElement.textContent, 'Node 1'); assert.equal(detail.scrollTop, 0);
    assert.equal(new URL(w.location.href).searchParams.get('entry'), 'n-1');
  } finally { controller.destroy(); dom.window.close(); }
});

test('local exploration remains local with a saved path query until an explicit graph path selection', () => {
  const { dom, w, controller } = setup('?entry=n-1&scope=neighborhood&from=n-0&to=n-2');
  try {
    assert.equal(new URL(w.location.href).searchParams.get('scope'), 'neighborhood');
    assert.equal(controller.graph.nodes.length, 3);
    controller.select('n-35', { focus: false });
    assert.equal(controller.graph.nodes.length, 1);
    w.document.querySelector('[data-path-highlight]').click();
    assert.equal(new URL(w.location.href).searchParams.get('scope'), null);
    assert.equal(controller.graph.nodes.length, 36);
    assert.equal(controller.path.distance, 1);
  } finally { controller.destroy(); dom.window.close(); }
});
