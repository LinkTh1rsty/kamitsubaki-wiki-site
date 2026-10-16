import {lockModalScroll} from '../lib/modalScroll.mjs';
import {searchPagefind} from '../lib/pagefindSearch.mjs';
import {createIcon, setIconLabel} from '../lib/icons.mjs';
import {articleCopy} from '../lib/articleCopy.mjs';
import { normalizeSearchText, searchKindGroups, searchResultPath } from '../lib/siteSearch.mjs';
import { getSearchShortcut } from '../lib/searchShortcut.mjs';

const searchDialog = document.querySelector('[data-site-search]');
let queryNormalizerPromise;
const enginePromises = new Map();

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

function loadEngine(locale) {
  if (!enginePromises.has(locale)) {
    const url = `/pagefind/${locale}/pagefind.js`;
    enginePromises.set(locale, import(/* @vite-ignore */ url).then(async engine=>{await engine.options({basePath:`/pagefind/${locale}/`,language:locale.startsWith('zh')?'zh':locale});return engine;}).catch(error => {
      enginePromises.delete(locale); throw error;
    }));
  }
  return enginePromises.get(locale);
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
  kind.textContent = copy.resultKinds?.[result.kind] || copy.kinds?.[result.kind] || String(result.kind || 'wiki').toUpperCase();
  const path = document.createElement('span');
  path.textContent = resultPath.replace(/\/$/, '');
  meta.append(kind, path);

  const title = document.createElement('strong');
  appendHighlightedText(title, result.title, query);

  const excerpt = document.createElement('span');
  excerpt.className = 'site-search__result-excerpt';
  appendHighlightedText(excerpt, result.description || result.excerpt, query);

  const arrow = createIcon('arrow-right');

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
  let engine;
  let queryGeneration = 0;
  let activeIndex = -1;
  let activeKind = '';
  let queryNormalizer = normalizeSearchText;
  let searchTimer = 0;
  let closeAnimationTimer = 0;
  let previouslyFocused = null,releaseScroll=null;
  let matches = [],shown = 0;

  if (!(input instanceof HTMLInputElement) || !(resultsRoot instanceof HTMLElement) || !(status instanceof HTMLElement)) {
    return;
  }

  const resultLinks = () => [...resultsRoot.querySelectorAll('.site-search__result')];
  const isOpen = () => !root.hidden && !root.classList.contains('is-closing');
  const moreButton=document.createElement('button');moreButton.type='button';moreButton.className='site-search__more';moreButton.hidden=true;resultsRoot.after(moreButton);
  let batchGeneration=0;
  const showNext=async()=>{
    const generation=queryGeneration,query=input.value.trim();if(batchGeneration===generation)return;batchGeneration=generation;moreButton.disabled=true;
    try{const batch=await Promise.all(matches.slice(shown,shown+12).map(result=>result.data()));if(generation!==queryGeneration)return;
      resultsRoot.append(...batch.map((record,index)=>createResult({path:record.url,...record.meta,excerpt:record.plain_excerpt},query,copy,shown+index)));shown+=batch.length;moreButton.hidden=shown>=matches.length;
      moreButton.textContent=({zh:`继续查看 · ${shown}/${matches.length}`,'zh-tw':`繼續查看 · ${shown}/${matches.length}`,'zh-hk':`繼續查看 · ${shown}/${matches.length}`,ja:`さらに表示 · ${shown}/${matches.length}`,en:`Show more · ${shown}/${matches.length}`})[root.dataset.locale]||`Show more · ${shown}/${matches.length}`;
      status.textContent=`${resultCount(copy,matches.length)} · ${shown}/${matches.length}`;
    }catch{if(generation===queryGeneration){status.textContent=copy.error;moreButton.hidden=false;moreButton.textContent=copy.retry||'Retry';}}
    finally{if(batchGeneration===generation)batchGeneration=0;moreButton.disabled=false;}
  };
  moreButton.addEventListener('click',showNext);

  const finishClose = () => {
    root.hidden = true;
    if(root instanceof HTMLDialogElement&&root.open)root.close();
    releaseScroll?.();releaseScroll=null;
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

  const render = async () => {
    const generation = ++queryGeneration;
    const query = input.value.trim();
    resultsRoot.replaceChildren();
    matches=[];shown=0;moreButton.hidden=true;
    let articleLink = root.querySelector('[data-article-search-link]');
    if (!articleLink) {
      articleLink = document.createElement('a');
      articleLink.dataset.articleSearchLink = '';
      articleLink.className = 'site-search__article-link';
      resultsRoot.after(articleLink);
    }
    articleLink.hidden = !query;
    setIconLabel(articleLink, articleCopy(root.dataset.locale).searchLabel + ' ↗');
    articleLink.href = `/${root.dataset.locale}/articles/?q=${encodeURIComponent(query)}`;
    activeIndex = -1;
    input.removeAttribute('aria-activedescendant');

    if (!query) {
      status.textContent = copy.idle;
      return;
    }

    status.textContent = copy.loading;
    try {
      engine ||= await loadEngine(root.dataset.locale || 'zh');
      queryNormalizer = await loadQueryNormalizer();
      const kinds = searchKindGroups[activeKind] || (activeKind ? [activeKind] : null);
      const result=await searchPagefind(engine,queryNormalizer(query),kinds,root.dataset.locale||'zh');
      if(generation!==queryGeneration)return;
      matches=result;

    } catch {
      if (generation !== queryGeneration) return;
      status.replaceChildren();
      const message=document.createElement('span');message.textContent=copy.error;
      const retry=document.createElement('button');retry.type='button';retry.className='site-search__retry-btn';retry.textContent=copy.retry||'Retry';retry.onclick=render;
      status.append(message,retry);return;
    }

    if (!matches.length) {
      status.textContent = copy.empty;
      return;
    }

    showNext();
  };

  const openSearch = async (trigger) => {
    window.clearTimeout(closeAnimationTimer);
    const wasHidden = root.hidden;
    root.classList.remove('is-closing');
    if (wasHidden) {
      previouslyFocused = trigger instanceof HTMLElement ? trigger : document.activeElement;
      root.hidden = false;
      releaseScroll=lockModalScroll();
      try{if(root instanceof HTMLDialogElement)root.showModal();}catch(error){releaseScroll?.();releaseScroll=null;root.hidden=true;throw error;}
      document.documentElement.classList.add('site-search-open');
    }
    window.requestAnimationFrame(() => {if(isOpen())input.focus();});

    await render();

  };

  document.querySelectorAll('[data-search-open]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const menu = trigger.closest('details');
      if (menu instanceof HTMLDetailsElement) menu.open = false;
      openSearch(menu instanceof HTMLDetailsElement ? menu.querySelector('summary') : trigger);
    });
  });

  document.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
      return;
    }

    if (!isOpen() || event.isComposing) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSearch();
    } else if (event.target !== input) {
      return;
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
  close?.addEventListener('click', closeSearch);
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const links = resultLinks();
    if (links.length) links[Math.max(activeIndex, 0)]?.click();
  });
  root.addEventListener('click', (event) => {
    if (event.target === root) closeSearch();
  });
  root.addEventListener('cancel',event=>{event.preventDefault();closeSearch();});
  root.addEventListener('close',()=>{if(!root.hidden)finishClose();});
  window.addEventListener('pagehide',()=>releaseScroll?.(),{once:true});
}

updateSearchShortcutHints();
if (searchDialog) initializeSearch(searchDialog);
