import { createContributorClient } from '../lib/contributorClient.mjs';
let contributorStorage;
try { contributorStorage = window.sessionStorage; } catch {}
const contributorClient = createContributorClient({ storage: contributorStorage });
import { normalizeContributorData } from '../lib/contributorRosterData.mjs';

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

function sameLogin(contributor, login) {
  const candidate = contributor.githubLogin || String(contributor.id || '').replace(/^github:/, '');
  return candidate && login && candidate.toLowerCase() === login.toLowerCase();
}

function renderBreakdown(contributor, copy) {
  return `
    <span class="contributor-roster__breakdown">
      <span>${escapeHtml(copy.contentContributions)} <strong>${Number(contributor.contentContributionCount || 0)}</strong></span>
      <span>${escapeHtml(copy.functionalContributions)} <strong>${Number(contributor.functionalContributionCount || 0)}</strong></span>
    </span>
  `;
}

function renderContributor(contributor, copy, mode, ownerLogin = '') {
  const name = contributor.displayName || contributor.githubLogin || 'Contributor';
  const isOwner = mode === 'summary' && sameLogin(contributor, ownerLogin);
  const rank = mode === 'summary'
    ? `<span class="contributor-roster__rank"><small>${escapeHtml(copy.rankLabel)}</small>#${String(contributor.rank || 0).padStart(2, '0')}</span>`
    : '';
  const body = `
    ${rank}
    <span class="contributor-roster__avatar">${renderAvatar(contributor)}</span>
    <span class="contributor-roster__identity">
      <strong>${escapeHtml(name)}${isOwner ? ` <span class="contributor-roster__owner-inline">${escapeHtml(copy.ownerBadge)}</span>` : ''}</strong>
      <small>${Number(contributor.contributionCount || 0)} ${escapeHtml(copy.contributions)}${contributor.entryCount ? ` · ${Number(contributor.entryCount)} ${escapeHtml(copy.entries)}` : ''}</small>
      ${mode === 'summary' ? renderBreakdown(contributor, copy) : ''}
    </span>
    ${contributor.profileUrl ? '<span class="contributor-roster__profile-arrow" aria-hidden="true">↗</span>' : ''}
  `;
  const tag = contributor.profileUrl ? 'a' : 'div';
  const link = contributor.profileUrl
    ? ` href="${escapeHtml(contributor.profileUrl)}" target="_blank" rel="noopener noreferrer"`
    : '';
  return `<${tag} class="contributor-roster__person"${link}>${body}</${tag}>`;
}

function renderOwner(owner, copy) {
  const name = owner.displayName || owner.githubLogin || 'Site owner';
  const profile = owner.profileUrl || (owner.githubLogin ? `https://github.com/${owner.githubLogin}` : '');
  const body = `
    <div class="contributor-roster__owner-avatar">${renderAvatar(owner)}</div>
    <div class="contributor-roster__owner-copy">
      <span>${escapeHtml(copy.ownerKicker)}</span>
      <h3>${escapeHtml(copy.ownerTitle)}</h3>
      <strong>${escapeHtml(name)} <small>${escapeHtml(copy.ownerBadge)}</small></strong>
      <p>${escapeHtml(copy.ownerRole)}</p>
    </div>
    <div class="contributor-roster__owner-metrics">
      <span><strong>${Number(owner.contributionCount || 0)}</strong>${escapeHtml(copy.contributions)}</span>
      <span><strong>${Number(owner.functionalContributionCount || 0)}</strong>${escapeHtml(copy.functionalContributions)}</span>
    </div>
  `;
  return profile
    ? `<a class="contributor-roster__owner" href="${escapeHtml(profile)}" target="_blank" rel="noopener noreferrer">${body}<span class="contributor-roster__owner-arrow" aria-hidden="true">↗</span></a>`
    : `<div class="contributor-roster__owner">${body}</div>`;
}

function renderLocales(event, copy) {
  return (event.locales || [])
    .map((locale) => `<span class="contributor-roster__locale">${escapeHtml(copy.localeLabels?.[locale] || locale.toUpperCase())}</span>`)
    .join('');
}

function renderActivity(event, copy, locale) {
  const entryNames = (event.entryIds || [])
    .map((entryId) => copy.areaLabels?.[entryId] || readableEntry(entryId))
    .filter(Boolean);
  const entryLabel = entryNames.join(' · ') || readableEntry(event.entryId || event.path) || copy.unknownSummary;
  const collectionLabel = copy.collectionLabels?.[event.collection] || '';
  const name = event.contributor?.displayName || event.contributor?.githubLogin || 'Contributor';
  const commit = event.commitUrl
    ? `<a href="${escapeHtml(event.commitUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.commit)} ↗</a>`
    : '';

  return `
    <li class="contributor-roster__activity">
      <div class="contributor-roster__activity-main">
        <strong>${collectionLabel ? `<span class="contributor-roster__type">${escapeHtml(collectionLabel)}</span>` : ''}${escapeHtml(entryLabel)}</strong>
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
      <a class="contributor-roster__action" href="${escapeHtml(root.dataset.syntaxHref || '#')}">${escapeHtml(copy.syntaxAction)}</a>
      <a class="contributor-roster__action" href="${escapeHtml(root.dataset.formatHref || '#')}">${escapeHtml(copy.formatAction)}</a>
    </div>
  `;
}

function renderEmpty(root, copy) {
  return `<div class="contributor-roster__empty"><p>${escapeHtml(copy.empty)}</p>${renderActions(root, copy)}</div>`;
}

function animateRosterNumbers(content) {
  const counters = content.querySelectorAll('.contributor-roster__stats strong, .contributor-roster__owner-metrics strong');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  counters.forEach((counter) => {
    const target = Number(counter.textContent || 0);
    if (!Number.isFinite(target) || target <= 0 || reducedMotion) return;

    const startedAt = performance.now();
    const duration = 480;
    const update = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = String(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(update);
    };

    counter.textContent = '0';
    requestAnimationFrame(update);
  });
}

function prepareRosterMotion(content) {
  const sequences = [
    ['.contributor-roster__stats > div', 0, 45],
    ['.contributor-roster__owner', 130, 0],
    ['.contributor-roster__section-heading', 190, 0],
    ['.contributor-roster__person', 230, 35],
    ['.contributor-roster__activity', 230, 35],
    ['.contributor-roster__action', 440, 35],
  ];

  content.dataset.animated = 'false';
  sequences.forEach(([selector, baseDelay, step]) => {
    content.querySelectorAll(selector).forEach((element, index) => {
      element.dataset.rosterAnimate = '';
      element.style.setProperty('--roster-delay', `${Math.min(520, baseDelay + index * step)}ms`);
    });
  });

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    content.dataset.animated = 'true';
    animateRosterNumbers(content);
  };

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    requestAnimationFrame(start);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((entry) => entry.isIntersecting)) return;
    observer.disconnect();
    start();
  }, { threshold: 0.12 });
  observer.observe(content);
}

function renderRoster(root, source, copy) {
  const mode = root.dataset.mode || 'summary';
  const data = normalizeContributorData(source, { mode, recentLimit: mode === 'entry' ? 3 : 10 });
  const { totals, topContributors, recent } = data;
  const locale = root.dataset.locale || 'zh';
  const ownerLogin = root.dataset.ownerLogin || '';
  if (!topContributors.length && !recent.length) return renderEmpty(root, copy);
  const owner = topContributors.find((contributor) => sameLogin(contributor, ownerLogin)) || {
    displayName: ownerLogin,
    githubLogin: ownerLogin,
    profileUrl: ownerLogin ? `https://github.com/${ownerLogin}` : '',
  };

  return `
    <div class="contributor-roster__stats" aria-label="${escapeHtml(copy.title)}">
      <div><strong>${Number(totals.contributors || 0)}</strong><span>${escapeHtml(copy.contributors)}</span></div>
      <div><strong>${Number(totals.contributions || 0)}</strong><span>${escapeHtml(copy.contributions)}</span></div>
      ${mode === 'summary' ? `<div><strong>${Number(totals.contentContributions || 0)}</strong><span>${escapeHtml(copy.contentContributions)}</span></div><div><strong>${Number(totals.functionalContributions || 0)}</strong><span>${escapeHtml(copy.functionalContributions)}</span></div>` : ''}
    </div>
    ${mode === 'summary' ? renderOwner(owner, copy) : ''}
    <div class="contributor-roster__grid">
      <section class="contributor-roster__section contributor-roster__section--people">
        <div class="contributor-roster__section-heading"><h3>${escapeHtml(copy.topTitle)}</h3><span>${String(topContributors.length).padStart(2, '0')}</span></div>
        <div class="contributor-roster__people">${topContributors.map((item) => renderContributor(item, copy, mode, ownerLogin)).join('')}</div>
      </section>
      <section class="contributor-roster__section contributor-roster__section--activity">
        <div class="contributor-roster__section-heading"><h3>${escapeHtml(copy.recentTitle)}</h3><span>ARCHIVE</span></div>
        ${source.recentUnavailable ? `<p>${escapeHtml(copy.recentUnavailable)}</p>` : `<ol class="contributor-roster__recent">${recent.map((event) => renderActivity(event, copy, locale)).join('')}</ol>`}
      </section>
    </div>
    ${renderActions(root, copy)}
  `;
}

function renderError(root, state, content, copy) {
  state.hidden = false;
  state.innerHTML = `<span>${escapeHtml(copy.error)}</span><button type="button" data-contributor-retry>${escapeHtml(copy.retry)}</button>`;
  content.innerHTML = renderActions(root, copy);
  content.hidden = false;
  state.querySelector('[data-contributor-retry]')?.addEventListener('click', () => {
    delete root.dataset.contributorRosterStatus;
    state.textContent = copy.loading;
    loadRoster(root);
  });
}

async function loadRoster(root, force = false) {
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
  } else {
    url.searchParams.set('topLimit', '24');
    url.searchParams.set('recentLimit', '24');
  }

  const previous = contributorClient.peek(url);
  if (previous) {
    content.innerHTML = renderRoster(root, previous.data, copy);
    content.hidden = false;
    state.hidden = true;
  }
  try {
    const result = await contributorClient.load(url, { force });
    if (!previous || JSON.stringify(previous.data) !== JSON.stringify(result.data)) {
      content.innerHTML = renderRoster(root, result.data, copy);
      prepareRosterMotion(content);
    }
    content.hidden = false;
    state.hidden = !result.stale;
    if (result.stale) {
      state.innerHTML = `<span>${escapeHtml(copy.cached)}</span><button type="button" data-contributor-retry>${escapeHtml(copy.retry)}</button>`;
      state.querySelector('[data-contributor-retry]')?.addEventListener('click', () => {
        delete root.dataset.contributorRosterStatus;
        loadRoster(root, true);
      });
    }
    root.dataset.contributorRosterStatus = 'loaded';
  } catch {
    root.dataset.contributorRosterStatus = 'error';
    renderError(root, state, content, copy);
  }
}

function initializeContributorRosters() {
  for (const root of document.querySelectorAll('[data-contributor-roster]')) loadRoster(root);
}

initializeContributorRosters();
document.addEventListener('astro:page-load', initializeContributorRosters);
