import { createRelationPathFinder, relationEndpointLabel, resolveRelationEndpoint } from '../lib/relationPaths.mjs';

export function initializeRelationPath(root, { catalog, copy, getURL, setURL, onExplore, getOptions = () => ({}), onPaths = () => {} }) {
  if (!root) return null;
  const from = root.querySelector('[data-path-from]');
  const to = root.querySelector('[data-path-to]');
  const chronicle = root.querySelector('[data-path-chronicle]');
  const status = root.querySelector('[data-path-status]');
  const results = root.querySelector('[data-path-results]');
  const findPath = createRelationPathFinder(catalog);
  const nodeById = new Map(catalog.nodes.map(node => [node.id, node]));
  const compare = root.hasAttribute('data-path-compare');
  const element = (tag, text) => { const node = document.createElement(tag); if (text) node.textContent = text; if (tag === 'button') node.className = 'workspace-button'; return node; };
  let lastSearch;

  function options() {
    const fragment = document.createDocumentFragment();
    for (const node of catalog.nodes) {
      if (!chronicle.checked && (node.kind === 'events' || node.collection === 'chronicle')) continue;
      const option = element('option');
      option.value = relationEndpointLabel(node);
      fragment.append(option);
    }
    root.querySelector('[data-path-options]').replaceChildren(fragment);
  }
  function draw() {
    results.replaceChildren();
    onPaths(null);
    const start = resolveRelationEndpoint(catalog.nodes, from.value);
    const end = resolveRelationEndpoint(catalog.nodes, to.value);
    if (!from.value && !to.value) { status.textContent = copy.ready; return; }
    if (!start || !end) { status.textContent = copy.invalid; return; }
    const options = { ...getOptions(), includeChronicle: chronicle.checked };
    const comparison = compare ? findPath.compare(start.id, end.id, options) : null;
    const path = compare ? comparison.paths[0] || { status: comparison.status } : findPath(start.id, end.id, options);
    if (path.status === 'invalid') { status.textContent = compare ? copy.filtered : copy.invalid; return; }
    if (path.status === 'unconnected') { status.textContent = `${copy.noPath} ${copy.noPathNote}`; return; }
    status.textContent = path.distance ? copy.found.replace('{count}', String(path.distance)) : copy.same;
    function appendPath(path, target) { path.nodes.forEach((node, index) => {
      const item = element('li');
      const step = path.steps[index - 1];
      if (step) {
        const connection = element('div');
        connection.className = 'relation-path-connection';
        const label = copy.relationLabels[step.edge.type] || copy.unknown;
        const role = step.edge.role ? copy.roleLabels[step.edge.role] || step.edge.role : '';
        const arrow = step.inverse ? '←' : '→';
        const dates = [step.edge.startDate, step.edge.endDate].filter(Boolean).join(' – ');
        const detail = element('span', [arrow + ' ' + label, role, step.edge.current === false ? copy.historical : '', dates].filter(Boolean).join(' · '));
        if (step.inverse) detail.title = copy.reverse;
        connection.append(detail);
        if (step.edge.evidence) {
          const evidence = element('a', copy.evidence);
          evidence.href = step.edge.evidence;
          connection.append(evidence);
        }
        item.append(connection);
      }
      const entry = element('div');
      entry.className = 'relation-path-entry';
      entry.append(element('span', String(index + 1).padStart(2, '0')));
      const link = element('a', node.title);
      link.href = node.path;
      entry.append(link);
      const explore = element('button', copy.explore);
      explore.type = 'button';
      explore.addEventListener('click', () => onExplore(node.id));
      entry.append(explore);
      item.append(entry);
      target.append(item);
    }); }
    if (!compare) appendPath(path, results);
    else {
      status.textContent = path.distance ? copy.compared.replace('{count}', String(comparison.paths.length)) : copy.same;
      comparison.paths.forEach((route, index) => {
        const card = element('li'); card.className = 'relation-path-route'; card.dataset.pathRoute = String(index);
        card.append(element('h3', copy.route.replace('{index}', String(index + 1)).replace('{count}', String(route.distance))));
        const highlight = element('button', copy.highlight); highlight.type = 'button'; highlight.dataset.pathHighlight = String(index);
        highlight.setAttribute('aria-pressed', String(index === 0));
        highlight.addEventListener('click', () => {
          results.querySelectorAll('[data-path-highlight]').forEach(button => button.setAttribute('aria-pressed', String(button === highlight)));
          onPaths(route, { focus: true });
        });
        card.append(highlight);
        const list = element('ol'); list.className = 'relation-path-steps'; appendPath(route, list);
        card.append(list); results.append(card);
      });
      if (comparison.truncated) status.append(element('span', ' ' + copy.limited));
    }
    onPaths(path);
  }
  function update({ push = true } = {}) {
    const query = getURL().searchParams;
    for (const [key, input] of [['from', from], ['to', to]]) {
      const node = resolveRelationEndpoint(catalog.nodes, input.value);
      input.setCustomValidity(node ? '' : copy.invalid);
      if (!node) { input.reportValidity(); status.textContent = copy.invalid; results.replaceChildren(); onPaths(null); return; }
      input.value = relationEndpointLabel(node);
      query.set(key, node.id);
    }
    chronicle.checked ? query.set('events', '1') : query.delete('events');
    setURL(query, { push });
    lastSearch = getURL().search;
    draw();
  }
  function activate() {
    if (lastSearch === getURL().search) return;
    const query = getURL().searchParams;
    from.value = nodeById.has(query.get('from')) ? relationEndpointLabel(nodeById.get(query.get('from'))) : '';
    to.value = nodeById.has(query.get('to')) ? relationEndpointLabel(nodeById.get(query.get('to'))) : '';
    from.setCustomValidity(''); to.setCustomValidity('');
    chronicle.checked = query.get('events') === '1';
    options(); draw();
    lastSearch = getURL().search;
  }
  root.querySelectorAll('input,button').forEach(control => { control.disabled = false; });
  root.querySelector('[data-path-form]').addEventListener('submit', event => { event.preventDefault(); update(); });
  root.querySelector('[data-path-swap]').addEventListener('click', () => {
    [from.value, to.value] = [to.value, from.value];
    from.setCustomValidity(''); to.setCustomValidity('');
    if (from.value && to.value) update();
  });
  for (const input of [from, to]) input.addEventListener('input', () => {
    input.setCustomValidity(''); results.replaceChildren(); status.textContent = copy.ready; onPaths(null);
  });
  chronicle.addEventListener('change', () => {
    options();
    if (from.value && to.value) update();
    else if (compare) {
      const query = getURL().searchParams;
      chronicle.checked ? query.set('events', '1') : query.delete('events');
      setURL(query, { push: true }); lastSearch = getURL().search; draw();
    }
  });
  activate();
  return { activate, setEndpoint(which, id) {
    const node = nodeById.get(id);
    if (!node) return;
    const input = which === 'from' ? from : to;
    input.value = relationEndpointLabel(node); input.setCustomValidity('');
    if (from.value && to.value) update();
    else {
      const query = getURL().searchParams;
      query.set(which === 'from' ? 'from' : 'to', node.id);
      setURL(query, { push: true }); lastSearch = getURL().search;
      results.replaceChildren(); status.textContent = copy.ready; onPaths(null);
    }
    (which === 'from' ? to : from).focus();
  } };
}
