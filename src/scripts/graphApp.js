import { createGraphIndex, selectGraph, searchGraphNodes, graphConnections, isGraphEvent } from '../lib/graphModel.mjs';
import { initializeRelationPath } from './relationPath.js';
import { initializeGraphCanvas } from './graphCanvas.js';
import { updateLocaleQueries } from '../lib/localeQuery.mjs';
import {downloadArchiveFile} from '../lib/archiveExports.mjs';

const element = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
const link = (text, href) => { const node = element('a', text); node.href = href; return node; };
const button = (text, action) => { const node = element('button', text, 'workspace-button'); node.type = 'button'; node.addEventListener('click', action); return node; };
const format = (text, values) => Object.entries(values).reduce((value, [key, replacement]) => value.replace('{' + key + '}', String(replacement)), text);

export function initializeGraph(root, { catalog, copy: c, createRenderer = initializeGraphCanvas }) {
  const $ = selector => root.querySelector(selector), form = $('[data-graph-form]');
  const index = createGraphIndex(catalog);
  let state, graph, base, listLimit = 30, connectionLimit = 20, pathController, renderer, layoutKey = '', route = null, detailEntry = '';
  const getURL = () => new URL(window.location.href);
  function read() {
    const params = getURL().searchParams;
    const choice = (name, values, fallback = '') => values.includes(params.get(name)) ? params.get(name) : fallback;
    return { query: params.get('q') || '', entry: params.get('entry') || '', kind: choice('kind', index.kinds), relation: choice('relation', index.relations),
      events: params.get('events') === '1', scope: choice('scope', ['all', 'neighborhood'], 'all'), depth: Number(choice('depth', ['1', '2', '3'], '1')) };
  }
  function setURL(params, { push = false } = {}) {
    const url = getURL(); url.search = params.toString();
    if (url.href !== window.location.href) window.history[push ? 'pushState' : 'replaceState']({}, '', url);
  }
  function setParams(values, { push = true, paths = true } = {}) {
    const params = getURL().searchParams;
    for (const [key, value] of Object.entries(values)) value && value !== 'all' && !(key === 'depth' && Number(value) === 1) ? params.set(key, String(value)) : params.delete(key);
    setURL(params, { push }); refresh({ paths });
  }
  function select(id, { focus = true } = {}) {
    const preserveFocus = document.activeElement?.matches('[data-graph-choose],[data-graph-neighbor]');
    connectionLimit = 20;
    setParams({ entry: id }, { paths: false });
    if (preserveFocus) $('[data-graph-detail] h2')?.focus({ preventScroll: true });
    if (focus && id) renderer?.focus(id);
  }
  function renderDirectory() {
    const items = searchGraphNodes(base.nodes, state.query), target = $('[data-graph-directory]'), fragment = document.createDocumentFragment();
    for (const node of items.slice(0, listLimit)) {
      const card = element('li'); card.dataset.graphRecord = node.id;
      const body = element('div'); body.append(element('small', (c.kinds[node.kind] || node.kind) + ' · ' + node.id));
      const heading = element('h3'); heading.append(link(node.title, node.path)); body.append(heading);
      if (node.subtitle) body.append(element('p', node.subtitle));
      const choose = button(c.choose, () => select(node.id)); choose.dataset.graphChoose = node.id; choose.setAttribute('aria-pressed', String(state.entry === node.id));
      card.append(body, choose); fragment.append(card);
    }
    target.replaceChildren(fragment); $('[data-graph-list-count]').textContent = format(c.count, { shown: Math.min(listLimit, items.length), total: items.length });
    $('[data-graph-empty]').hidden = Boolean(items.length); $('[data-graph-more]').hidden = items.length <= listLimit;
  }
  function renderDetail() {
    const target = $('[data-graph-detail]'); target.replaceChildren();
    const node = base.nodes.find(item => item.id === state.entry);
    if ((node?.id || '') !== detailEntry) { target.scrollTop = 0; detailEntry = node?.id || ''; }
    if (!node) { target.append(element('h2', c.detail), element('p', state.entry ? c.invalidEntry : c.chooseHint)); return; }
    target.append(element('small', (c.kinds[node.kind] || node.kind) + ' · ' + node.id));
    const header = element('h2', node.title); header.tabIndex = -1; target.append(header);
    if (node.subtitle) target.append(element('p', node.subtitle));
    if (node.description) target.append(element('p', node.description));
    if (node.date) target.append(element('p', c.date + ' · ' + node.date.label));
    const actions = element('div', undefined, 'graph-actions');
    actions.append(link(c.open, node.path),
      button(c.focus, () => setParams({ scope: 'neighborhood', depth: state.depth })),
      button(c.from, () => {
        if (isGraphEvent(node) && !state.events) setParams({ events: '1' });
        pathController.setEndpoint('from', node.id);
      }),
      button(c.to, () => {
        if (isGraphEvent(node) && !state.events) setParams({ events: '1' });
        pathController.setEndpoint('to', node.id);
      }),
      button(c.close, () => select('', { focus: false })));
    target.append(actions);
    if(!isGraphEvent(node)){const tools=element('div',undefined,'graph-actions'),locale=root.dataset.locale || node.path.split('/')[1] || 'zh';tools.append(link(c.source,'/'+locale+'/explore/evidence/?entity='+encodeURIComponent(node.id)),link(c.compare,'/'+locale+'/explore/compare/?left='+encodeURIComponent(node.id)),link(c.openData,'/'+locale+'/explore/open-data/'));target.append(tools);}
    const connections = graphConnections(base, node.id);
    target.append(element('h3', format(c.connected, { count: connections.length })));
    if (!connections.length) target.append(element('p', c.noRelations));
    const list = element('ul', undefined, 'graph-connections');
    for (const { edge, inverse, other } of connections.slice(0, connectionLimit)) {
      const item = element('li');
      const role = edge.role ? c.path.roleLabels[edge.role] || edge.role : '';
      const direction = inverse ? other.title + ' → ' + node.title : node.title + ' → ' + other.title;
      item.append(element('small', [c.path.relationLabels[edge.type] || edge.type, role, edge.current === false ? c.path.historical : ''].filter(Boolean).join(' · ')),
        element('p', direction));
      const dates = [edge.startDate, edge.endDate].filter(Boolean).join(' – ');
      if (dates) item.append(element('p', dates));
      const controls = element('div', undefined, 'graph-actions'); controls.append(link(other.title, other.path));
      const choose = button(c.choose, () => select(other.id)); choose.dataset.graphNeighbor = other.id; controls.append(choose);
      if (edge.evidence) controls.append(link(c.evidence, edge.evidence));
      item.append(controls); list.append(item);
    }
    target.append(list);
    if (connections.length > connectionLimit) target.append(button(c.more, () => { connectionLimit += 20; renderDetail(); }));
  }
  function renderLegend() {
    const target = $('[data-graph-legend]'); target.replaceChildren();
    for (const kind of index.kinds) {
      const count = graph.nodes.filter(node => node.kind === kind).length;
      if (!count) continue;
      const item = element('li', c.kinds[kind] + ' · ' + count); item.dataset.graphKind = kind; target.append(item);
    }
  }
  function refresh({ paths = true } = {}) {
    state = read();
    for (const name of ['kind', 'relation', 'scope', 'depth']) form.elements.namedItem(name).value = String(state[name]);
    form.elements.namedItem('q').value = state.query;
    const eventToggle = form.elements.namedItem('events'); if (eventToggle) eventToggle.checked = state.events;
    form.elements.namedItem('depth').disabled = state.scope !== 'neighborhood';
    base = selectGraph(index, { ...state, scope: 'all' }); graph = selectGraph(index, state);
    $('[data-graph-count]').textContent = format(c.shown, { nodes: graph.nodes.length, edges: graph.edges.length });
    root.dataset.graphNodes = String(graph.nodes.length); root.dataset.graphEdges = String(graph.edges.length);
    const nextKey = JSON.stringify([state.kind, state.relation, state.events, state.scope, state.scope === 'neighborhood' ? state.entry : '', state.depth]);
    if (nextKey !== layoutKey) { renderer?.setGraph(graph); layoutKey = nextKey; renderLegend(); }
    renderer?.select(state.entry); renderDirectory(); renderDetail();
    if (paths) pathController?.activate();
    updateLocaleQueries(root.ownerDocument, getURL().search);
  }
  function pathSelection(path, { focus = false } = {}) {
    route = path;
    if (path && focus && state.scope === 'neighborhood') { setParams({ scope: 'all' }, { push: true, paths: false }); }
    renderer?.highlight(path, { focus }); $('[data-graph-clear-path]').hidden = !path;
  }
  $('[data-graph-canvas-panel]').hidden = false;
  renderer = createRenderer($('[data-graph-canvas]'), { copy: c, onSelect: id => select(id, { focus: false }), onStatus: message => { $('[data-graph-layout-status]').textContent = message; } });
  state = read();
  const addOptions = (name, values, labels) => {
    const select = form.elements.namedItem(name);
    for (const value of values) { const option = element('option', labels[value] || value); option.value = value; select.append(option); }
  };
  addOptions('kind', index.kinds, c.kinds); addOptions('relation', index.relations, c.path.relationLabels);
  pathController = initializeRelationPath($('[data-relation-path]'), { catalog: { nodes: index.nodes, edges: index.edges }, copy: c.path, getURL,
    setURL: (params, options) => { setURL(params, options); refresh({ paths: false }); },
    getOptions: () => ({ kind: state.kind, relation: state.relation }), onExplore: id => select(id), onPaths: pathSelection });
  root.querySelectorAll('[data-graph-control]').forEach(control => { control.hidden = false; control.disabled = false; });
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('change', event => {
    const name = event.target.name; if (!['kind', 'relation', 'scope', 'depth', 'events'].includes(name)) return;
    listLimit = 30; connectionLimit = 20;
    const values = { [name]: name === 'events' ? (event.target.checked ? '1' : '') : event.target.value };
    if (name === 'scope' && event.target.value === 'neighborhood' && !base.nodes.some(node => node.id === state.entry)) values.entry = searchGraphNodes(base.nodes)[0]?.id || '';
    setParams(values);
  });
  const query = form.elements.namedItem('q');
  const search = event => { if (event.isComposing) return; listLimit = 30; setParams({ q: query.value }, { push: false, paths: false }); };
  query.addEventListener('input', search); query.addEventListener('compositionend', search);
  form.addEventListener('reset', () => setTimeout(() => {
    listLimit = 30; connectionLimit = 20; setURL(new URLSearchParams(), { push: true }); refresh();
  }, 0));
  $('[data-graph-more]').addEventListener('click', () => { listLimit += 30; renderDirectory(); });
  $('[data-graph-zoom-in]').addEventListener('click', () => renderer?.zoom(1.4));
  $('[data-graph-zoom-out]').addEventListener('click', () => renderer?.zoom(1 / 1.4));
  $('[data-graph-fit]').addEventListener('click', () => renderer?.fit());
  $('[data-graph-clear-path]').addEventListener('click', () => {
    pathSelection(null);
    root.querySelectorAll('[data-path-highlight]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  });
  $('[data-graph-export]').addEventListener('click', () => renderer?.exportImage());
  const dataExport=button(c.exportJson,()=>downloadArchiveFile(JSON.stringify({version:1,resource:'graph-selection',url:location.href,filters:state,nodes:graph.nodes,edges:graph.edges,missing:'Missing links mean not recorded, never a confirmed absence.'},null,2),'archive-graph.json'));
  dataExport.dataset.graphDataExport='';$('[data-graph-export]').parentElement.append(dataExport);
  $('[data-graph-share]').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(window.location.href); $('[data-graph-share-status]').textContent = c.copied; }
    catch { $('[data-graph-share-status]').textContent = c.shareFallback; const field = $('[data-graph-share-url]'); field.hidden = false; field.value = window.location.href; field.focus(); field.select(); }
  });
  const popstate = () => { listLimit = 30; connectionLimit = 20; refresh(); };
  window.addEventListener('popstate', popstate);
  $('[data-graph-load-status]').textContent = index.omitted ? format(c.omitted, { count: index.omitted }) : c.note;
  $('[data-graph-reload]')?.setAttribute('hidden', '');
  root.dataset.graphInitialized = 'true'; refresh();
  return { index, select, get graph() { return graph; }, get path() { return route; }, destroy() { window.removeEventListener('popstate', popstate); renderer?.destroy(); } };
}

const root = document.querySelector('[data-graph-app]');
if (root) {
  const copy = JSON.parse(root.querySelector('[data-graph-copy]').textContent), status = root.querySelector('[data-graph-load-status]');
  let loading = false, controller;
  async function load() {
    if (loading || controller) return;
    loading = true; status.textContent = copy.loading; root.querySelector('[data-graph-retry]').hidden = true;
    try {
      const response = await fetch(root.dataset.graphCatalog, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error(String(response.status));
      const catalog = await response.json();
      if (!Array.isArray(catalog.nodes) || !Array.isArray(catalog.edges)) throw Error('Invalid graph catalog');
      controller = initializeGraph(root, { catalog, copy });
    } catch {
      status.textContent = copy.failure; root.querySelector('[data-graph-retry]').hidden = false;
    } finally { loading = false; }
  }
  root.querySelector('[data-graph-retry]').addEventListener('click', load);
  window.addEventListener('pagehide', event => { if (!event.persisted) controller?.destroy(); });
  load();
}
