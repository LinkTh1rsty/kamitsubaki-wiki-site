import { normalizeContributorData } from '../lib/contributorRosterData.mjs';

let contributorRosterObserver;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initials(name) {
  return String(name || '?').trim().slice(0, 2).toUpperCase();
}

function formatDate(value, locale) {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale || 'zh', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function readableEntry(value) {
  const fallback = String(value || '').split('/').filter(Boolean).at(-1) || '';
  return fallback
    .replace(/\.(md|mdx|json)$/i, '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function renderAvatar(contributor) {
  const name = contributor.displayName || contributor.githubLogin || 'Contributor';
  return contributor.avatarUrl
    ? `<img src="${escapeHtml(contributor.avatarUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer" />`
    : `<span>${escapeHtml(initials(name))}</span>`;
}

function renderContributor(contributor, copy, mode) {
  const name = contributor.displayName || contributor.githubLogin || 'Contributor';
  const rank = mode === 'summary'
    ? `<span class="contributor-roster__rank"><small>${escapeHtml(copy.rankLabel)}</small>#${String(contributor.rank || 0).padStart(2, '0')}</span>`
    : '';
  const body = `
    ${rank}
    <span class="contributor-roster__avatar">${renderAvatar(contributor)}</span>
    <span class="contributor-roster__identity">
      <strong>${escapeHtml(name)}</strong>
      <small>${Number(contributor.contributionCount || 0)} ${escapeHtml(copy.contributions)}${contributor.entryCount ? ` · ${Number(contributor.entryCount)} ${escapeHtml(copy.entries)}` : ''}</small>
    </span>
    ${contributor.profileUrl ? '<span class="contributor-roster__profile-arrow" aria-hidden="true">↗</span>' : ''}
  `;
  const tag = contributor.profileUrl ? 'a' : 'div';
  const link = contributor.profileUrl
    ? ` href="${escapeHtml(contributor.profileUrl)}" target="_blank" rel="noopener noreferrer"`
    : '';
  return `<${tag} class="contributor-roster__person"${link}>${body}</${tag}>`;
}

function renderLocales(event, copy) {
  return (event.locales || [])
    .map((locale) => `<span class="contributor-roster__locale">${escapeHtml(copy.localeLabels?.[locale] || locale.toUpperCase())}</span>`)
    .join('');
}

function renderActivity(event, copy, locale) {
  const entryNames = (event.entryIds || []).map(readableEntry).filter(Boolean);
  const entryLabel = entryNames.join(' · ') || readableEntry(event.entryId || event.path) || copy.unknownSummary;
  const name = event.contributor?.displayName || event.contributor?.githubLogin || 'Contributor';
  const commit = event.commitUrl
    ? `<a href="${escapeHtml(event.commitUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.commit)} ↗</a>`
    : '';

  return `
    <li class="contributor-roster__activity">
      <div class="contributor-roster__activity-main">
        <strong>${escapeHtml(entryLabel)}</strong>
        <div class="contributor-roster__locales">${renderLocales(event, copy)}</div>
      </div>
      <div class="contributor-roster__activity-meta">
        <span>${escapeHtml(name)} · ${escapeHtml(formatDate(event.committedAt, locale))}</span>
        ${commit}
      </div>
    </li>
  `;
}

function renderActions(root, copy) {
  return `
    <div class="contributor-roster__actions">
      <a class="contributor-roster__action contributor-roster__action--primary" href="${escapeHtml(root.dataset.editHref || root.dataset.guideHref || '#')}">${escapeHtml(copy.joinAction)} <span aria-hidden="true">→</span></a>
      <a class="contributor-roster__action" href="${escapeHtml(root.dataset.guideHref || '#')}">${escapeHtml(copy.guideAction)}</a>
    </div>
  `;
}

function renderEmpty(root, copy) {
  return `<div class="contributor-roster__empty"><p>${escapeHtml(copy.empty)}</p>${renderActions(root, copy)}</div>`;
}

function renderRoster(root, source, copy) {
  const mode = root.dataset.mode || 'summary';
  const data = normalizeContributorData(source, { mode, recentLimit: mode === 'entry' ? 3 : 8 });
  const { totals, topContributors, recent } = data;
  const locale = root.dataset.locale || 'zh';
  if (!topContributors.length && !recent.length) return renderEmpty(root, copy);

  return `
    <div class="contributor-roster__stats" aria-label="${escapeHtml(copy.title)}">
      <div><strong>${Number(totals.contributors || 0)}</strong><span>${escapeHtml(copy.contributors)}</span></div>
      <div><strong>${Number(totals.contributions || 0)}</strong><span>${escapeHtml(copy.contributions)}</span></div>
      ${mode === 'summary' ? `<div><strong>${Number(totals.entries || 0)}</strong><span>${escapeHtml(copy.entries)}</span></div>` : ''}
    </div>
    <div class="contributor-roster__grid">
      <section class="contributor-roster__section contributor-roster__section--people">
        <div class="contributor-roster__section-heading"><h3>${escapeHtml(copy.topTitle)}</h3><span>${String(topContributors.length).padStart(2, '0')}</span></div>
        <div class="contributor-roster__people">${topContributors.map((item) => renderContributor(item, copy, mode)).join('')}</div>
      </section>
      <section class="contributor-roster__section contributor-roster__section--activity">
        <div class="contributor-roster__section-heading"><h3>${escapeHtml(copy.recentTitle)}</h3><span>LIVE</span></div>
        <ol class="contributor-roster__recent">${recent.map((event) => renderActivity(event, copy, locale)).join('')}</ol>
      </section>
    </div>
    ${renderActions(root, copy)}
  `;
}

function renderError(root, state, copy) {
  state.hidden = false;
  state.innerHTML = `<span>${escapeHtml(copy.error)}</span><button type="button" data-contributor-retry>${escapeHtml(copy.retry)}</button>`;
  state.querySelector('[data-contributor-retry]')?.addEventListener('click', () => {
    delete root.dataset.contributorRosterStatus;
    state.textContent = copy.loading;
    loadRoster(root);
  });
}

async function loadRoster(root) {
  const status = root.dataset.contributorRosterStatus;
  if (status === 'loading' || status === 'loaded') return;

  const mode = root.dataset.mode || 'summary';
  const copy = JSON.parse(root.dataset.copy || '{}');
  const state = root.querySelector('[data-contributor-state]');
  const content = root.querySelector('[data-contributor-content]');
  if (!root.dataset.apiBase || !state || !content) return;

  root.dataset.contributorRosterStatus = 'loading';
  state.hidden = false;
  state.textContent = copy.loading;
  content.hidden = true;

  const url = new URL(mode === 'entry' ? '/api/contributors/entry' : '/api/contributors/summary', root.dataset.apiBase);
  if (mode === 'entry') {
    url.searchParams.set('collection', root.dataset.collection || '');
    url.searchParams.set('entryId', root.dataset.entryId || '');
  }

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Contributor API returned ${response.status}`);
    content.innerHTML = renderRoster(root, await response.json(), copy);
    content.hidden = false;
    state.hidden = true;
    root.dataset.contributorRosterStatus = 'loaded';
  } catch {
    root.dataset.contributorRosterStatus = 'error';
    renderError(root, state, copy);
  }
}

function initializeContributorRosters() {
  for (const root of document.querySelectorAll('[data-contributor-roster]')) {
    if (root.dataset.contributorRosterObserved === 'true') continue;
    root.dataset.contributorRosterObserved = 'true';

    if (!('IntersectionObserver' in window)) {
      loadRoster(root);
      continue;
    }

    if (!contributorRosterObserver) {
      contributorRosterObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            contributorRosterObserver.unobserve(entry.target);
            loadRoster(entry.target);
          }
        },
        { rootMargin: '600px 0px' },
      );
    }

    contributorRosterObserver.observe(root);
  }
}

initializeContributorRosters();
document.addEventListener('astro:page-load', initializeContributorRosters);
