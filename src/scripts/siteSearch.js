import { normalizeSearchText, searchResultPath, searchSiteIndex } from '../lib/siteSearch.mjs';
import { getSearchShortcut } from '../lib/searchShortcut.mjs';

const searchDialog = document.querySelector('[data-site-search]');
let queryNormalizerPromise;
const indexPromises = new Map();
const bodyIndexPromises = new Map();

function updateSearchShortcutHints() {
  const shortcut = getSearchShortcut({
    platform: navigator.platform,
    userAgent: navigator.userAgent,
  });

  document.querySelectorAll('[data-search-shortcut]').forEach((hint) => {
    hint.textContent = shortcut;
  });
}

function readCopy(root) {
  try {
    return JSON.parse(root.dataset.copy || '{}');
  } catch {
    return {};
  }
}

function resultCount(copy, count) {
  const template = String(copy.resultCountTemplate || '{count} results');
  if (template.includes('|')) {
    const [singular, plural] = template.split('|');
    return (count === 1 ? singular : plural).replace('{count}', String(count));
  }
  return template.replace('{count}', String(count));
}

function loadIndex(locale) {
  if (!indexPromises.has(locale)) {
    const promise = fetch(`/${locale}/search-index.json`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Search index returned ${response.status}`);
        return response.json();
      })
      .then((payload) => Array.isArray(payload?.entries) ? payload.entries : [])
      .catch((error) => {
        indexPromises.delete(locale);
        throw error;
      });
    indexPromises.set(locale, promise);
  }
  return indexPromises.get(locale);
}

function loadBodyIndex(locale) {
  if (!bodyIndexPromises.has(locale)) {
    const promise = fetch(`/${locale}/search-body.json`, { headers: { Accept: 'application/json' } })
      .then((response) => {
        if (!response.ok) throw new Error(`Search body returned ${response.status}`);
        return response.json();
      })
      .then((payload) => (payload?.bodies && typeof payload.bodies === 'object' ? payload.bodies : {}))
      .catch((error) => {
        bodyIndexPromises.delete(locale);
        throw error;
      });
    bodyIndexPromises.set(locale, promise);
  }
  return bodyIndexPromises.get(locale);
}

function loadQueryNormalizer() {
  if (!queryNormalizerPromise) {
    queryNormalizerPromise = import('../lib/cjkSearch.mjs')
      .then((module) => module.foldCjkSearchText)
      .catch(() => normalizeSearchText);
  }
  return queryNormalizerPromise;
}

function appendHighlightedText(target, text, query) {
  const source = String(text || '');
  const normalizedQuery = normalizeSearchText(query);
  const tokens = [...new Set(normalizedQuery.split(' ').filter(Boolean))]
    .sort((left, right) => right.length - left.length);

  if (!tokens.length) {
    target.textContent = source;
    return;
  }

  const pattern = new RegExp(`(${tokens.map((token) =>
    token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')})`, 'giu');
  let cursor = 0;

  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) target.append(document.createTextNode(source.slice(cursor, index)));
    const mark = document.createElement('mark');
    mark.textContent = match[0];
    target.append(mark);
    cursor = index + match[0].length;
  }

  if (cursor < source.length) target.append(document.createTextNode(source.slice(cursor)));
}

function createResult(result, query, copy, index) {
  const resultPath = searchResultPath(result.path || result.url);
  const link = document.createElement('a');
  link.className = 'site-search__result';
  link.id = `site-search-result-${index}`;
  link.href = resultPath;
  link.setAttribute('role', 'option');
  link.setAttribute('aria-selected', 'false');

  const meta = document.createElement('span');
  meta.className = 'site-search__result-meta';
  const kind = document.createElement('span');
  kind.textContent = copy.kinds?.[result.kind] || String(result.kind || 'wiki').toUpperCase();
  const path = document.createElement('span');
  path.textContent = resultPath.replace(/\/$/, '');
  meta.append(kind, path);

  const title = document.createElement('strong');
  appendHighlightedText(title, result.title, query);

  const excerpt = document.createElement('span');
  excerpt.className = 'site-search__result-excerpt';
  appendHighlightedText(excerpt, result.description || result.excerpt, query);

  const arrow = document.createElement('svg');
  arrow.setAttribute('viewBox', '0 0 24 24');
  arrow.setAttribute('fill', 'none');
  arrow.setAttribute('stroke', 'currentColor');
  arrow.setAttribute('stroke-width', '1.25');
  arrow.setAttribute('aria-hidden', 'true');
  arrow.innerHTML = '<path d="M5 12h14M13 6l6 6-6 6"/>';

  link.append(meta, title, excerpt, arrow);
  return link;
}

function initializeSearch(root) {
  if (!(root instanceof HTMLElement) || root.dataset.initialized === 'true') return;
  root.dataset.initialized = 'true';

  const copy = readCopy(root);
  const input = root.querySelector('[data-search-input]');
  const resultsRoot = root.querySelector('[data-search-results]');
  const status = root.querySelector('[data-search-status]');
  const close = root.querySelector('[data-search-close]');
  const form = root.querySelector('[data-search-form]');
  let entries = [];
  let bodyLoaded = false;
  let activeIndex = -1;
  let activeKind = '';
  let queryNormalizer = normalizeSearchText;
  let searchTimer = 0;
  let closeAnimationTimer = 0;
  let previouslyFocused = null;

  if (!(input instanceof HTMLInputElement) || !(resultsRoot instanceof HTMLElement) || !(status instanceof HTMLElement)) {
    return;
  }

  const resultLinks = () => [...resultsRoot.querySelectorAll('.site-search__result')];
  const isOpen = () => !root.hidden && !root.classList.contains('is-closing');

  const finishClose = () => {
    root.hidden = true;
    root.classList.remove('is-closing');
    document.documentElement.classList.remove('site-search-open');
    if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    previouslyFocused = null;
  };

  const closeSearch = () => {
    if (root.hidden || root.classList.contains('is-closing')) return;
    root.classList.add('is-closing');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    closeAnimationTimer = window.setTimeout(finishClose, reducedMotion ? 0 : 190);
  };

  const setActive = (nextIndex) => {
    const links = resultLinks();
    if (!links.length) {
      activeIndex = -1;
      input.removeAttribute('aria-activedescendant');
      return;
    }

    activeIndex = (nextIndex + links.length) % links.length;
    links.forEach((link, index) => {
      const selected = index === activeIndex;
      link.classList.toggle('is-active', selected);
      link.setAttribute('aria-selected', String(selected));
      if (selected) {
        input.setAttribute('aria-activedescendant', link.id);
        link.scrollIntoView({ block: 'nearest' });
      }
    });
  };

  const render = () => {
    const query = input.value.trim();
    resultsRoot.replaceChildren();
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    if (!query) {
      status.textContent = copy.idle;
      return;
    }

    const results = searchSiteIndex(entries, query, {
      locale: root.dataset.locale,
      kind: activeKind,
      limit: 1000,
      queryNormalizer,
    });

    if (!results.length) {
      status.textContent = copy.empty;
      return;
    }

    status.textContent = resultCount(copy, results.length);
    resultsRoot.append(...results.slice(0, 12).map((result, index) => createResult(result, query, copy, index)));
  };

  const openSearch = async () => {
    window.clearTimeout(closeAnimationTimer);
    const wasHidden = root.hidden;
    root.classList.remove('is-closing');
    if (wasHidden) {
      previouslyFocused = document.activeElement;
      root.hidden = false;
      document.documentElement.classList.add('site-search-open');
    }
    window.requestAnimationFrame(() => input.focus());

    const locale = root.dataset.locale || 'zh';

    if (!entries.length) {
      status.textContent = copy.loading;
      try {
        [entries, queryNormalizer] = await Promise.all([
          loadIndex(locale),
          loadQueryNormalizer(),
        ]);
        render();
      } catch {
        status.innerHTML = '';
        const msg = document.createElement('span');
        msg.textContent = copy.error;
        const retryBtn = document.createElement('button');
        retryBtn.type = 'button';
        retryBtn.className = 'site-search__retry-btn';
        retryBtn.textContent = copy.retry || 'Retry';
        retryBtn.addEventListener('click', () => {
          openSearch();
        });
        status.append(msg, retryBtn);
        return;
      }
    }

    if (!bodyLoaded) {
      loadBodyIndex(locale)
        .then((bodies) => {
          bodyLoaded = true;
          for (const entry of entries) {
            if (entry.id && bodies[entry.id]) {
              entry.searchKey = bodies[entry.id];
            }
          }
          if (input.value.trim()) {
            render();
          }
        })
        .catch(() => {
          // If body index fails to load, title/alias/heading/description search continues working
        });
    }
  };

  document.querySelectorAll('[data-search-open]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const menu = trigger.closest('details');
      if (menu instanceof HTMLDetailsElement) menu.open = false;
      openSearch();
    });
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
      return;
    }

    if (!isOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      resultLinks()[activeIndex]?.click();
    }
  });

  input.addEventListener('input', () => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(render, 70);
  });
  root.querySelectorAll('[data-search-kind]').forEach((button) => {
    button.addEventListener('click', () => {
      activeKind = button.dataset.searchKind === 'all' ? '' : button.dataset.searchKind || '';
      root.querySelectorAll('[data-search-kind]').forEach((candidate) => {
        const selected = candidate === button;
        candidate.classList.toggle('is-active', selected);
        candidate.setAttribute('aria-pressed', String(selected));
      });
      render();
      input.focus();
    });
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' && activeIndex < 0 && resultLinks().length) {
      event.preventDefault();
      setActive(0);
    }
  });
  close?.addEventListener('click', closeSearch);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const links = resultLinks();
    if (links.length) links[Math.max(activeIndex, 0)]?.click();
  });
  root.addEventListener('click', (event) => {
    if (event.target === root) closeSearch();
  });
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    const focusable = [...root.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href]')]
      .filter((element) => element instanceof HTMLElement && element.offsetParent !== null);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}

updateSearchShortcutHints();
if (searchDialog) initializeSearch(searchDialog);
