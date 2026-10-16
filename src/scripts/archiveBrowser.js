import { selectLiveArchive } from '../lib/liveArchive.mjs';
import { selectCreditsArchive } from '../lib/creditsArchive.mjs';
import { updateLocaleQueries } from '../lib/localeQuery.mjs';

export function initializeArchiveBrowser(root) {
  const kind = root.dataset.archiveBrowser;
  const { catalog, copy: c, locale } = JSON.parse(root.querySelector('[data-archive-data]').textContent);
  const select = kind === 'lives' ? selectLiveArchive : selectCreditsArchive;
  const form = root.querySelector('[data-archive-form]');
  const controls = Object.fromEntries([...form.querySelectorAll('input[name],select[name]')].map(control => [control.name, control]));
  const results = root.querySelector('[data-archive-results]');
  const overview = root.querySelector('[data-creator-overview]');
  let limit = 12;
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const link = (title, href) => { const node = element('a', title); node.href = href; return node; };
  function references(refs) {
    const fragment = document.createDocumentFragment();
    refs.forEach((ref, index) => {
      if (index) fragment.append(document.createTextNode(' / '));
      fragment.append(ref.path ? link(ref.title, ref.path) : document.createTextNode(ref.title));
    });
    return fragment;
  }
  function filterLink(title, params) {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const node = link(title, url.href); node.dataset.archiveFilterLink = '';
    return node;
  }
  function card(record) {
    const item = element('article', null, 'archive-record'); item.dataset.archiveRecord = record.id;
    const header = element('header');
    const date = element('time', `${record.date || c.unknownDate}${record.endDate && record.endDate !== record.date ? ` — ${record.endDate}` : ''}`);
    if (record.date) date.dateTime = record.date;
    header.append(date, element('span', kind === 'lives' ? c.live.types[record.eventType] || record.eventType : c.credits.credits));
    const title = element('h2'); title.append(link(record.title, record.path));
    item.append(header, title);
    if (record.summary) item.append(element('p', record.summary, 'archive-record-summary'));
    const facts = element('dl');
    function fact(label, value) { const detail = element('dd'); detail.append(value); facts.append(element('dt', label), detail); }
    if (kind === 'lives' && record.venue) fact(c.venue, `${record.venue}${record.location ? ` · ${record.location}` : ''} · ${c.live.modes[record.mode]}`);
    const people = kind === 'lives' ? record.headliners : record.artists;
    if (people.length) fact(kind === 'lives' ? c.headliners : c.artist, references(people));
    if (kind === 'lives' && record.guests.length) fact(c.guests, references(record.guests));
    item.append(facts);
    if (kind === 'credits') {
      const credits = element('ul'); credits.setAttribute('aria-label', c.credits.credits);
      for (const credit of record.credits) {
        const row = element('li');
        const href = `/${locale}/explore/credits/?creator=${encodeURIComponent(credit.key)}`;
        const name = link(credit.title, href); name.dataset.archiveFilterLink = '';
        row.append(element('span', c.roles[credit.role] || credit.role), name);
        if (!credit.entityId) row.append(element('small', c.credits.named));
        credits.append(row);
      }
      item.append(credits);
    } else if (record.setlist.length || record.needsSetlist) {
      item.append(element('p', record.setlist.length ? c.live.setlistCount.replace('{count}', String(record.setlist.length)) : c.live.noSetlist, 'archive-note'));
    }
    const actions = element('div', null, 'archive-record-actions'); actions.append(link(`${c.open} ↗`, record.path));
    if (kind === 'lives' && record.needsSetlist && record.editHref) actions.append(link(`${c.live.add} →`, record.editHref));
    item.append(actions);
    return item;
  }
  function creatorOverview() {
    if (kind !== 'credits' || !overview) return;
    const creator = catalog.creators.find(item => item.key === controls.creator.value);
    overview.hidden = !creator;
    overview.replaceChildren();
    if (!creator) return;
    const title = element('h2', creator.title); title.id = 'creator-overview-title';
    overview.append(title, element('p', c.works+' · '+creator.workCount));
    overview.append(element('p', creator.roles.map(role => c.roles[role] || role).join(' / ')));
    if (creator.path) overview.append(link(`${c.credits.profile} ↗`, creator.path));
    else overview.append(element('p', c.credits.named));
    overview.append(element('p', c.credits.selectedNote));
    if (creator.collaborators.length) {
      overview.append(element('h3', c.credits.collaborators));
      const list = element('ul');
      for (const partner of creator.collaborators) {
        const row = element('li');
        row.append(filterLink(partner.title, { creator: creator.key, artist: partner.id }), element('span', c.credits.collaboratorCount.replace('{count}', String(partner.count))));
        list.append(row);
      }
      overview.append(list);
    }
    if(creator.coCreators?.length){overview.append(element('h3',c.partners),element('p',c.partnerNote));const list=element('ul');for(const partner of creator.coCreators){const row=element('li');row.append(filterLink(partner.title,{creator:creator.key,collaborator:partner.key}),element('span',' · '+partner.count));list.append(row);}overview.append(list);}
    overview.append(element('h3', c.credits.years));
    if (creator.years.length) {
      const years = element('ul');
      for (const year of creator.years) {
        const row = element('li'); row.append(filterLink(year.year, { creator: creator.key, year: year.year }), element('span', String(year.count))); years.append(row);
      }
      overview.append(years);
    } else overview.append(element('p', c.credits.noYear));
  }
  function render({ save = false, push = false } = {}) {
    const values = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key === 'q' ? 'query' : key, control.value]));
    const selected = select(catalog.entries, values);
    const fragment = document.createDocumentFragment(); selected.slice(0, limit).forEach(record => fragment.append(card(record)));
    results.replaceChildren(fragment);
    root.querySelector('[data-archive-count]').textContent = c.results.replace('{shown}', String(Math.min(limit, selected.length))).replace('{total}', String(selected.length));
    root.querySelector('[data-archive-empty]').hidden = selected.length !== 0;
    root.querySelector('[data-archive-more]').hidden = selected.length <= limit;
    creatorOverview();
    if (save) {
      const url = new URL(location.href);
      for (const [key, control] of Object.entries(controls)) {
        const value = control.value.trim();
        value && !(key === 'sort' && value === 'newest') ? url.searchParams.set(key, value) : url.searchParams.delete(key);
      }
      if (url.href !== location.href) history[push ? 'pushState' : 'replaceState'](history.state, '', url);
    }
    updateLocaleQueries(root.ownerDocument, location.search);
  }
  function restore() {
    const params = new URL(location.href).searchParams;
    for (const [key, control] of Object.entries(controls)) {
      const fallback = key === 'sort' ? 'newest' : '';
      const value = params.get(key) || fallback;
      control.value = control.tagName === 'SELECT' && ![...control.options].some(option => option.value === value) ? fallback : value;
    }
    limit = 12; render();
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.addEventListener('input', event => { if (event.target.name === 'q' && !event.isComposing) { limit = 12; render({ save: true }); } });
  form.addEventListener('compositionend', () => { limit = 12; render({ save: true }); });
  form.addEventListener('change', () => { limit = 12; render({ save: true, push: true }); });
  form.addEventListener('reset', () => setTimeout(() => { limit = 12; render({ save: true, push: true }); }, 0));
  root.querySelector('[data-archive-more]').addEventListener('click', () => { limit += 12; render(); });
  root.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = event.target instanceof Element ? event.target.closest('[data-archive-filter-link]') : null;
    if (!target) return;
    const url = new URL(target.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname) return;
    event.preventDefault();
    if (url.href !== location.href) history.pushState(history.state, '', url);
    restore();
  });
  window.addEventListener('popstate', restore);
  root.querySelectorAll('[data-archive-controls]').forEach(control => { control.hidden = false; });
  restore();
}

const root = document.querySelector('[data-archive-browser]');
if (root) initializeArchiveBrowser(root);
