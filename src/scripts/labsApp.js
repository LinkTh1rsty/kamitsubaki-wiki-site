import { foldCjkSearchText } from '../lib/cjkSearch.mjs';
import { selectTimeline, neighbors } from '../lib/labsCatalog.mjs';
import { initializeRelationPath } from './relationPath.js';
import {
  readLibrary,
  writeLibrary,
  toggleItem,
} from '../lib/personalLibrary.mjs';

function element(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function link(text, href, cls) {
  const e = element('a', text, cls);
  e.href = href;
  return e;
}
function button(text, action) {
  const e = element('button', text);
  e.type = 'button';
  e.addEventListener('click', action);
  return e;
}
export function initializeLabsPanel(root, { copy: c, loadCatalog, getURL, setURL }) {
  const section = root.dataset.labsPanel;
  const $ = (s) => root.querySelector(s);
  const status = (message) => {
    if ($('[data-status]')) $('[data-status]').textContent = message;
  };
  let activate = () => {};
  let catalog;
  async function load() {
    catalog = await loadCatalog();
    return catalog;
  }
  function failure(retry) {
    status(c.failure);
    $('[data-status]')?.append(
      button(c.retry, () => {
        status(c.loading);
        retry();
      }),
    );
  }
  function saveButton(item) {
    const b = button(c.save, () => {
      try {
        writeLibrary(localStorage, toggleItem(readLibrary(localStorage), item));
        update();
      } catch {
        status(c.storageError);
      }
    });
    b.dataset.libraryPath = item.path;
    function update() {
      try {
        const saved = readLibrary(localStorage).items.some(
          (i) => i.path === item.path,
        );
        b.textContent = saved ? c.saved : c.save;
        b.setAttribute('aria-pressed', String(saved));
      } catch {
        b.setAttribute('aria-pressed', 'false');
      }
    }
    update();
    return b;
  }
  window.addEventListener('kamitsubaki-library-change', () => {
    try {
      const items = readLibrary(localStorage).items;
      root.querySelectorAll('[data-library-path]').forEach(b => {
        const saved = items.some(i => i.path === b.dataset.libraryPath);
        b.textContent = saved ? c.saved : c.save;
        b.setAttribute('aria-pressed', String(saved));
      });
    } catch { /* Actions report storage errors without discarding visible content. */ }
  });
  function row(item, dated = false) {
    const e = element('div', undefined, 'labs-row');
    if (dated) {
      const t = element('time', item.date.label);
      t.dateTime = item.date.label;
      e.append(t);
    }
    const body = element('div', undefined, 'labs-row-body');
    body.append(
      element(
        'small',
        (dated ? c.kinds : c.entryKinds)[item.kind] || item.kind,
      ),
    );
    const h = element('h3');
    h.append(link(item.title, item.path));
    body.append(h);
    if (item.subtitle) body.append(element('p', item.subtitle));
    if (dated && item.links?.length)
      body.append(link(c.source, item.links[0].href));
    e.append(body);
    const actions = element('div', undefined, 'labs-actions');
    actions.append(saveButton(item));
    e.append(actions);
    return e;
  }
  function renderRows(items, dated = false) {
    const result = $('[data-results]');
    result.replaceChildren();
    if (!items.length) result.append(element('p', c.empty, 'labs-empty'));
    items.forEach((item) => result.append(row(item, dated)));
  }
  if (section === 'timeline') {
    let limit = 40;
    let params = getURL().searchParams;
    $('[data-query]').value = params.get('q') || '';
    const update = () => {
      const filter = {
        query: $('[data-query]').value,
        kind: $('[data-kind]').value,
        year: $('[data-year]').value,
        order: $('[data-order]').value,
      };
      const items = selectTimeline(catalog.nodes, filter);
      renderRows(items.slice(0, limit), true);
      status(`${items.length} ${c.results}`);
      $('[data-more]').hidden = items.length <= limit;
      const query = new URLSearchParams();
      for (const [key, val] of Object.entries({
        q: filter.query,
        kind: filter.kind,
        year: filter.year,
        order: filter.order,
      }))
        if (val && val !== 'desc') query.set(key, val);
      setURL(query);
      restoredSearch = getURL().search;
    };
    let restoredSearch;
    activate = () => {
      if (!catalog) return;
      const url = getURL();
      if (restoredSearch !== url.search) {
        params = url.searchParams;
        $('[data-query]').value = params.get('q') || '';
        for (const key of ['kind', 'year', 'order']) {
          const select = $(`[data-${key}]`);
          const value = params.get(key) || (key === 'order' ? 'desc' : '');
          select.value = [...select.options].some(o => o.value === value) ? value : (key === 'order' ? 'desc' : '');
        }
        limit = 40;
      }
      update();
      restoredSearch = getURL().search;
    };
    async function init() {
      try {
        await load();
        const years = [
          ...new Set(
            catalog.nodes
              .filter((n) => n.date)
              .map((n) => n.date.sort.slice(0, 4)),
          ),
        ]
          .sort()
          .reverse();
        $('[data-year]').replaceChildren(new Option(c.all, ''));
        for (const y of years) {
          const o = element('option', y);
          o.value = y;
          $('[data-year]').append(o);
        }
        activate();
      } catch {
        failure(init);
      }
    }
    function changeFilter(key, event) {
      if (event.isComposing) return;
      limit = 40;
      if (catalog) {
        update();
        return;
      }
      // Preserve edits made before the first catalog response arrives.
      const query = getURL().searchParams;
      const param = key === 'query' ? 'q' : key;
      const value = $(`[data-${key}]`).value;
      if (value && value !== 'desc') query.set(param, value);
      else query.delete(param);
      setURL(query);
    }
    ['query', 'kind', 'year', 'order'].forEach((key) =>
      $(`[data-${key}]`).addEventListener(
        key === 'query' ? 'input' : 'change',
        (e) => changeFilter(key, e),
      ),
    );
    $('[data-query]').addEventListener('compositionend', e => changeFilter('query', e));
    $('[data-more]').addEventListener('click', () => {
      limit += 40;
      update();
    });
    $('[data-reset]').addEventListener('click', () => {
      $('[data-query]').value = '';
      $('[data-kind]').value = '';
      $('[data-year]').value = '';
      $('[data-order]').value = 'desc';
      limit = 40;
      if (catalog) update();
      else setURL(new URLSearchParams());
    });
    init();
  }
  if (section === 'relations') {
    let pathController;
    let selected,
      limit = 12;
    const svgNS = 'http://www.w3.org/2000/svg';
    function svg(tag, attrs) {
      const e = document.createElementNS(svgNS, tag);
      Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, String(v)));
      return e;
    }
    function draw({ push = false } = {}) {
      const center = catalog.nodes.find((n) => n.id === selected);
      if (!center) return;
      const connected = neighbors(catalog, selected);
      const graph = $('[data-graph]');
      graph.replaceChildren();
      const visual = connected.slice(0, 10);
      visual.forEach((node, i) => {
        const angle = (i * Math.PI * 2) / visual.length - Math.PI / 2;
        const x = 350 + 252 * Math.cos(angle),
          y = 225 + 166 * Math.sin(angle);
        graph.append(svg('line', { x1: 350, y1: 225, x2: x, y2: y }));
        const g = svg('g', {
          role: 'button',
          tabindex: 0,
          'aria-label': `${c.choose}: ${node.title}`,
        });
        g.append(svg('circle', { cx: x, cy: y, r: 25 }));
        const label = svg('text', { x, y: y + 43 });
        label.textContent =
          node.title.length > 16 ? node.title.slice(0, 15) + '…' : node.title;
        g.append(label);
        const title = svg('title', {});
        title.textContent = node.title;
        g.append(title);
        const pick = () => {
          selected = node.id;
          limit = 12;
          draw({ push: true });
        };
        g.addEventListener('click', pick);
        g.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            pick();
          }
        });
        graph.append(g);
      });
      graph.append(
        svg('circle', { cx: 350, cy: 225, r: 37, class: 'labs-graph-center' }),
      );
      const text = svg('text', { x: 350, y: 285 });
      text.textContent =
        center.title.length > 22
          ? center.title.slice(0, 21) + '…'
          : center.title;
      graph.append(text);
      const detail = $('[data-detail]');
      detail.replaceChildren(
        element('small', c.entryKinds[center.kind]),
        element('h2', center.title),
        element('p', center.subtitle),
        element('p', center.description),
      );
      if (center.image) {
        const portrait = element('img');
        portrait.src = center.image;
        portrait.alt = center.title;
        portrait.loading = 'lazy';
        portrait.width = 96;
        portrait.height = 96;
        detail.prepend(portrait);
      }
      const actions = element('div', undefined, 'labs-actions');
      actions.append(
        link(c.open, center.path, 'labs-button'),
        saveButton(center),
      );
      if (pathController) actions.append(
        button(c.path.fromHere, () => pathController.setEndpoint('from', center.id)),
        button(c.path.toHere, () => pathController.setEndpoint('to', center.id)),
      );
      detail.append(actions);
      renderRows(connected.slice(0, limit));
      [...$('[data-results]').children].forEach((r, i) => {
        const n = connected[i];
        if (!n) return;
        const edge = n.edges[0];
        const p = element('p');
        p.append(
          link(
            `${c.path.relationLabels[edge.type] || c.related} · ${c.evidence}`,
            edge.evidence,
          ),
        );
        r.querySelector('.labs-row-body').append(p);
        r.querySelector('.labs-actions').append(
          button(c.choose, () => {
            selected = n.id;
            limit = 12;
            draw({ push: true });
          }),
        );
      });
      if (!connected.length)
        $('[data-results]').replaceChildren(
          element('p', c.noRelations, 'labs-empty'),
        );
      status(
        `${connected.length} ${c.results} · ${visual.length} / ${connected.length}`,
      );
      $('[data-more]').hidden = connected.length <= limit;
      const query = getURL().searchParams;
      query.set('entry', selected);
      setURL(query, { push });
    }
    function picks() {
      const q = foldCjkSearchText($('[data-query]').value);
      const options = catalog.nodes
        .filter((n) => (q ? n.search.includes(q) : ['person','virtual-avatar','unit','software-voice'].includes(n.kind)))
        .sort((a,b)=>{const score=n=>{const title=foldCjkSearchText(n.title),subtitle=foldCjkSearchText(n.subtitle||'');return title===q||subtitle===q?0:title.startsWith(q)||subtitle.startsWith(q)?1:2;};return q?score(a)-score(b):0;})
        .slice(0, 8);
      const target = $('[data-picks]');
      target.replaceChildren();
      options.forEach((n) =>
        target.append(
          button(n.title, () => {
            selected = n.id;
            limit = 12;
            draw({ push: true });
          }),
        ),
      );
      if (!options.length) target.append(element('p', c.empty));
    }
    activate = () => {
      if (!catalog) return;
      const requested = getURL().searchParams.get('entry');
      const next = catalog.nodes.find(n => n.id === requested)?.id
        || catalog.nodes.find(n => ['person','virtual-avatar','unit','software-voice'].includes(n.kind) && n.key === 'kaf')?.id
        || catalog.nodes[0]?.id;
      if (selected !== next) limit = 12;
      selected = next;
      picks();
      draw();
      pathController?.activate();
    };
    async function init() {
      try {
        await load();
        pathController = initializeRelationPath($('[data-relation-path]'), {
          catalog, copy: c.path, getURL, setURL,
          onExplore: id => { selected = id; limit = 12; draw({ push: true }); },
        });
        activate();
      } catch {
        failure(init);
      }
    }
    $('[data-query]').addEventListener('input', (e) => {
      if (catalog && !e.isComposing) picks();
    });
    $('[data-query]').addEventListener('compositionend', () => {
      if (catalog) picks();
    });
    $('[data-more]').addEventListener('click', () => {
      limit += 12;
      draw();
    });
    init();
  }
  if (section === 'explore') {
    $('[data-random-discovery]').addEventListener('click', async (e) => {
      const b = e.currentTarget;
      b.disabled = true;
      try {
        const data = await load();
        const entries = data.nodes.filter(
          (n) => ['person','virtual-avatar','unit','software-voice'].includes(n.kind) || n.kind === 'work-track',
        );
        if (entries.length)
          location.assign(
            entries[Math.floor(Math.random() * entries.length)].path,
          );
      } catch {
        b.textContent = c.retry;
      } finally {
        b.disabled = false;
      }
    });
  }
  return { activate: () => activate() };
}
