import { createDiscoveryEngine, readDiscoveryState, discoveryParams, discoveryDay, validDiscoveryDay } from '../lib/discoveryEngine.mjs';
import { discoveryReason, discoveryEdgeText, discoveryFormat } from '../lib/discoveryPresentation.mjs';
import { relationEndpointLabel, resolveRelationEndpoint } from '../lib/relationPaths.mjs';
import { isGraphEvent } from '../lib/graphModel.mjs';
import { updateLocaleQueries } from '../lib/localeQuery.mjs';
import {currentArchiveOwner} from '../lib/archiveClient.mjs';
import {loadObservatory} from '../lib/archivePersonal.mjs';

const element = (tag, text, cls) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (cls) node.className = cls; return node; };
const link = (text, href) => { const node = element('a', text); node.href = href; return node; };

export function initializeDiscovery(root, { catalog, copy: c, now = () => new Date() }) {
  const $ = selector => root.querySelector(selector), form = $('[data-discovery-form]'), engine = createDiscoveryEngine(catalog), locale = root.dataset.locale || 'zh';
  let state, plan, planKey = '', limit = 12, draft = false, timer;
  const field = name => form.elements.namedItem(name);
  const artistFields = [...form.querySelectorAll('[name=artist]')];
  function options(name, items) {
    const fields = name === 'artist' ? artistFields : [field(name)];
    for (const select of fields) for (const item of items) { const option = element('option', item.title); option.value = item.id; select.append(option); }
  }
  options('artist', catalog.facets.artists.map(item => ({ ...item, title: item.title + ' · ' + (c.kinds[item.kind] || item.kind) + ' · ' + item.id })));
  options('kind', catalog.facets.kinds.map(id => ({ id, title: c.kinds[id] || id })));
  options('style', catalog.facets.styles.map(item => ({ ...item, title: item.title + ' · ' + item.count })));
  const suggestions = document.createDocumentFragment();
  const personal=element('button',c.personalInterests,'workspace-button');personal.type='button';personal.dataset.discoveryPersonal='';personal.addEventListener('click',async()=>{personal.disabled=true;try{const owner=await currentArchiveOwner(),interests=loadObservatory(localStorage,owner).data.interests;if(owner!==await currentArchiveOwner())return;const allowed=new Set(catalog.facets.artists.map(item=>item.id)),artists=interests.filter(id=>allowed.has(id)).slice(0,3),start=artists.length?'':interests.find(id=>engine.index.byId.has(id)) || '';if(!artists.length && !start){personal.textContent=c.noInterests;return;}updateURL({...state,artists,start,variant:0,step:0});}finally{personal.disabled=false;}});form.after(personal,element('p',c.personalHint));
  for (const node of engine.index.nodes) { const option = element('option'); option.value = relationEndpointLabel(node); suggestions.append(option); }
  $('[data-discovery-options]').replaceChildren(suggestions);

  function setSelect(select, value) {
    if (value && ![...select.options].some(option => option.value === value)) {
      const option = element('option', value); option.value = value; option.dataset.discoveryUnknown = 'true'; select.append(option);
    }
    select.value = value;
  }
  function writeForm() {
    artistFields.forEach((select, index) => setSelect(select, state.artists[index] || ''));
    for (const name of ['kind', 'style', 'radius', 'length']) setSelect(field(name), String(state[name]));
    field('year').value = state.year; field('day').value = state.day; field('q').value = state.query; field('events').checked = state.events;
    field('start').value = engine.index.byId.has(state.start) ? relationEndpointLabel(engine.index.byId.get(state.start)) : state.start;
    field('start').setCustomValidity('');
  }
  function updateURL(next, { push = true, preserveDraft = false } = {}) {
    const url = new URL(location.href); url.search = discoveryParams(next).toString();
    if (url.href !== location.href) history[push ? 'pushState' : 'replaceState']({}, '', url);
    refresh({ preserveDraft });
  }
  function setStart(id) {
    const node = engine.index.byId.get(id); if (!node) return;
    updateURL({ ...state, start: id, events: state.events || isGraphEvent(node), variant: 0, step: 0 }, { preserveDraft: true });
    $('[data-discovery-route-title]')?.focus({ preventScroll: true });
  }
  function entryActions(node) {
    const actions = element('div', undefined, 'discovery-entry-actions');
    const graphURL = '/' + locale + '/graph/?entry=' + encodeURIComponent(node.id) + '&scope=neighborhood' + (isGraphEvent(node) ? '&events=1' : '');
    const continuedState = { ...state, start: node.id, events: state.events || isGraphEvent(node), variant: 0, step: 0 };
    const continuation = '/' + locale + '/explore/discovery/?' + discoveryParams(continuedState).toString();
    const next = link(c.continue + ' ↗', continuation); next.dataset.discoveryContinue = node.id;
    actions.append(link(c.open + ' ↗', node.path));
    if (!node.id.startsWith('article:')) actions.append(link(c.graph + ' ↗', graphURL));
    actions.append(next);
    return actions;
  }
  function recordCard(record, { route = false, index = 0 } = {}) {
    const node = record.node, item = element('li', undefined, route ? 'discovery-entry discovery-stop' : 'discovery-entry');
    if (route) { item.dataset.discoveryStep = node.id; item.dataset.stopIndex = String(index); item.append(element('span', String(index + 1).padStart(2, '0'), 'discovery-stop-number')); }
    else item.dataset.discoveryRecord = node.id;
    const body = element('div', undefined, 'discovery-entry-body');
    if (route && record.step) {
      const edge = element('div', undefined, 'discovery-edge'); edge.append(element('span', discoveryEdgeText(record.step, c)));
      if (record.step.edge.evidence) edge.append(link(c.evidence, record.step.edge.evidence)); body.append(edge);
    }
    const meta = element('small', c.kinds[node.kind] || node.kind);
    if (node.date) { meta.append(document.createTextNode(' · ')); const time = element('time', node.date.label); time.dateTime = node.date.label; meta.append(time); }
    body.append(meta);
    const header = element('h3'); header.append(link(node.title, node.path)); body.append(header);
    if (node.subtitle) body.append(element('p', node.subtitle, 'discovery-subtitle'));
    if (node.description) body.append(element('p', node.description));
    if (route && index === 0) body.append(element('p', state.start ? c.explicitSeed : c.routeSeed, 'discovery-seed-note'));
    if (!route) {
      const reasons = element('ul', undefined, 'discovery-reasons');
      for (const reason of record.reasons) reasons.append(element('li', discoveryReason(reason, catalog, c)));
      body.append(reasons);
      const connection = record.reasons.find(reason => reason.type === 'connection');
      if (connection) {
        const details = element('details', undefined, 'discovery-evidence'); details.append(element('summary', c.pathDetail));
        const list = element('ol'), first = element('li'), source = engine.index.byId.get(connection.seed);
        first.append(link(source.title, source.path)); list.append(first);
        for (const step of connection.steps) {
          const row = element('li'), related = engine.index.byId.get(step.to);
          row.append(element('span', discoveryEdgeText(step, c) + ' '), link(related.title, related.path));
          if (step.edge.evidence) row.append(document.createTextNode(' · '), link(c.evidence, step.edge.evidence)); list.append(row);
        }
        details.append(list); body.append(details);
      }
    }
    body.append(entryActions(node)); item.append(body);
    return item;
  }
  function renderResults() {
    const fragment = document.createDocumentFragment();
    for (const item of plan.items.slice(0, limit)) fragment.append(recordCard(item));
    $('[data-discovery-results]').replaceChildren(fragment);
    $('[data-discovery-count]').textContent = discoveryFormat(c.results, { shown: Math.min(limit, plan.items.length), total: plan.items.length });
    $('[data-discovery-empty]').hidden = Boolean(plan.items.length);
    $('[data-discovery-clear-style]').hidden = !state.style;
    $('[data-discovery-more]').hidden = plan.items.length <= limit;
  }
  function progress({ focus = false } = {}) {
    const total = plan.route.length, current = Math.min(Math.max(0, state.step), Math.max(0, total - 1));
    $('[data-discovery-progress]').textContent = total ? discoveryFormat(c.progress, { current: current + 1, total }) : c.routeEmpty;
    root.querySelectorAll('[data-discovery-step]').forEach((stop, index) => {
      if (index === current) stop.setAttribute('aria-current', 'step'); else stop.removeAttribute('aria-current');
    });
    $('[data-discovery-previous]').disabled = !total || current === 0;
    $('[data-discovery-next]').disabled = !total;
    $('[data-discovery-next]').textContent = total && current === total - 1 ? c.restart : c.next;
    if (focus && total) {
      const stop = root.querySelector('[data-stop-index="' + current + '"]'); stop.tabIndex = -1; stop.focus({ preventScroll: true });
      stop.scrollIntoView?.({ block: 'center', behavior: 'auto' });
    }
  }
  function refresh({ preserveDraft = false } = {}) {
    const params = new URL(location.href).searchParams;
    const keepDraft = preserveDraft && draft;
    state = readDiscoveryState(params, discoveryDay(now())); draft = keepDraft;
    const key = JSON.stringify({ ...state, step: 0, fixedDay: false, dayInvalid: false });
    if (key !== planKey) {
      plan = engine.plan(state); planKey = key; limit = 12;
      const fragment = document.createDocumentFragment();
      plan.route.forEach((item, index) => fragment.append(recordCard(item, { route: true, index })));
      $('[data-discovery-route]').replaceChildren(fragment); renderResults();
    }
    if (!keepDraft) writeForm(); progress();
    $('[data-discovery-route-empty]').hidden = Boolean(plan.route.length);
    $('[data-discovery-route-short]').hidden = !plan.route.length || plan.route.length >= state.length;
    $('[data-discovery-share]').disabled = !plan.route.length;
    $('[data-discovery-reroll]').disabled = !plan.route.length || (plan.route.length === 1 && plan.items.length <= 1);
    $('[data-discovery-day]').textContent = state.day; $('[data-discovery-day]').dateTime = state.day;
    $('[data-discovery-day-metric]').textContent = state.day;
    const labels = { artist: c.artist, start: c.start, kind: c.kind, style: c.style, year: c.year, events: c.events };
    $('[data-discovery-status]').textContent = draft ? c.draft : plan.invalid.length ? c.invalidPreferences + ' ' + plan.invalid.map(item => item.value === 'max:3' ? c.preferenceHint : (labels[item.field] || item.field) + ' · ' + item.value).join(', ')
      : state.dayInvalid ? c.invalidDay : c.ready;
    root.dataset.discoveryMatches = String(plan.items.length); root.dataset.discoveryRouteIds = plan.route.map(item => item.node.id).join(',');
    updateLocaleQueries(root.ownerDocument, discoveryParams(state));
  }
  function apply() {
    const startInput = field('start'), value = startInput.value.trim(), start = value ? resolveRelationEndpoint(engine.index.nodes, value) : null;
    startInput.setCustomValidity(value && !start ? c.invalidStart : '');
    if (!form.reportValidity()) return false;
    const day = field('day').value;
    if (!validDiscoveryDay(day)) { $('[data-discovery-status]').textContent = c.invalidDay; return false; }
    const next = { ...state, artists: [...new Set(artistFields.map(select => select.value).filter(Boolean))].sort(), artistsOverflow: false,
      start: start?.id || '', query: field('q').value.trim(), kind: field('kind').value, style: field('style').value, year: field('year').value,
      radius: Number(field('radius').value), length: Number(field('length').value), day, dayInvalid: false,
      fixedDay: state.fixedDay || day !== discoveryDay(now()), events: field('events').checked, step: 0, variant: 0 };
    updateURL(next); return true;
  }
  form.hidden = false;
  const preferences = $('[data-discovery-preferences]');
  if (preferences) {
    preferences.hidden = false;
    const params = new URL(location.href).searchParams;
    preferences.open = ['artist', 'start', 'kind', 'style', 'year', 'q'].some(key => params.has(key)) || (params.has('day') && !validDiscoveryDay(params.get('day')));
  }
  root.querySelectorAll('[data-discovery-controls]').forEach(node => { node.hidden = false; });
  form.addEventListener('submit', event => { event.preventDefault(); apply(); });
  form.addEventListener('input', event => {
    if (event.target === field('start')) field('start').setCustomValidity('');
    draft = true; $('[data-discovery-status]').textContent = c.draft;
  });
  form.addEventListener('change', () => { draft = true; $('[data-discovery-status]').textContent = c.draft; });
  form.addEventListener('reset', () => setTimeout(() => { const url = new URL(location.href); url.search = ''; history.pushState({}, '', url); planKey = ''; refresh(); }, 0));
  $('[data-discovery-reroll]').addEventListener('click', () => {
    updateURL({ ...state, variant: (state.variant + 1) % 10000, step: 0 }, { preserveDraft: true });
  });
  $('[data-discovery-today]').addEventListener('click', () => {
    field('day').value = discoveryDay(now()); updateURL({ ...state, day: discoveryDay(now()), fixedDay: false, dayInvalid: false, variant: 0, step: 0 }, { preserveDraft: true });
  });
  $('[data-discovery-clear-style]').addEventListener('click', () => {
    field('style').value = ''; updateURL({ ...state, style: '', variant: 0, step: 0 }, { preserveDraft: true });
  });
  $('[data-discovery-more]').addEventListener('click', () => { limit += 12; renderResults(); });
  for (const [selector, direction] of [['[data-discovery-previous]', -1], ['[data-discovery-next]', 1]]) $(selector).addEventListener('click', () => {
    const current = Math.min(state.step, plan.route.length - 1);
    updateURL({ ...state, step: direction > 0 && current === plan.route.length - 1 ? 0 : Math.max(0, current + direction) }, { preserveDraft: true });
    progress({ focus: true });
  });
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-discovery-continue]');
    if (!target || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setStart(target.dataset.discoveryContinue);
  });
  $('[data-discovery-share]').addEventListener('click', async () => {
    const url = new URL(location.href); url.search = discoveryParams(state, { freezeDay: true }).toString();
    try { await navigator.clipboard.writeText(url.href); $('[data-discovery-share-status]').textContent = c.copied; }
    catch { $('[data-discovery-share-status]').textContent = c.copyFallback; const input = $('[data-discovery-share-url]'); input.hidden = false; input.value = url.href; input.focus(); input.select(); }
  });
  function dayUpdate() {
    if (!state.fixedDay && state.day !== discoveryDay(now()) && !draft) { refresh(); $('[data-discovery-status]').textContent = c.dayChanged; }
  }
  const visible = () => { if (document.visibilityState === 'visible') dayUpdate(); };
  timer = setInterval(dayUpdate, 60000);
  document.addEventListener('visibilitychange', visible); window.addEventListener('popstate', refresh);
  $('[data-discovery-load-status]').hidden = true; $('[data-discovery-reload]')?.setAttribute('hidden', '');
  refresh(); root.dataset.discoveryInitialized = 'true';
  return { engine, get plan() { return plan; }, get state() { return state; }, refresh, dayUpdate,
    destroy() { clearInterval(timer); document.removeEventListener('visibilitychange', visible); window.removeEventListener('popstate', refresh); } };
}

const root = document.querySelector('[data-discovery-app]');
if (root) {
  const copy = JSON.parse(root.querySelector('[data-discovery-copy]').textContent), status = root.querySelector('[data-discovery-load-status]');
  let busy = false, controller;
  async function load() {
    if (busy || controller) return;
    busy = true; status.hidden = false; status.textContent = copy.loading; root.querySelector('[data-discovery-retry]').hidden = true;
    try {
      const response = await fetch(root.dataset.discoveryCatalog, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error(String(response.status));
      const catalog = await response.json();
      if (catalog.version !== 1 || !Array.isArray(catalog.nodes) || !Array.isArray(catalog.edges) || !Array.isArray(catalog.facets?.artists) || !Array.isArray(catalog.facets?.styles)) throw Error('Invalid discovery catalog');
      controller = initializeDiscovery(root, { catalog, copy });
    } catch { status.textContent = copy.failure; root.querySelector('[data-discovery-retry]').hidden = false; }
    finally { busy = false; }
  }
  root.querySelector('[data-discovery-retry]').addEventListener('click', load);
  window.addEventListener('pagehide', event => { if (!event.persisted) controller?.destroy(); }); load();
}
