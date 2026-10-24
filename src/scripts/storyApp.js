import { readStoryProgress, writeStoryProgress, clearStoryProgress, normalizeStoryProgress, storyProgressKey, storyFormat } from '../lib/storyProgress.mjs';
import { updateLocaleQueries } from '../lib/localeQuery.mjs';
const $$ = (root, selector) => [...root.querySelectorAll(selector)];
function storageFor(view) { try { return view.localStorage; } catch { return null; } }
function playerAllowed(src) {
  try { const u = new URL(src); return u.protocol === 'https:' && ['www.youtube-nocookie.com', 'player.bilibili.com', 'embed.music.apple.com', 'open.spotify.com', 'music.163.com', 'y.qq.com'].includes(u.hostname); } catch { return false; }
}
export function initializeStory(root, { route, copy: c, storage = storageFor(root.ownerDocument.defaultView) }) {
  const view = root.ownerDocument.defaultView, $ = selector => root.querySelector(selector), status = $('[data-story-status]'), chapterNodes = $$(root, '[data-story-chapter]');
  let progress = normalizeStoryProgress(null, route), available = Boolean(storage);
  const message = text => { status.textContent = !available && text !== c.storageError ? c.storageError + ' ' + text : text; };
  const read = () => {
    if (!available) return;
    try { progress = readStoryProgress(storage, route); if (progress.changed) message(c.updated); else if (progress.corrupt) message(c.corrupt); }
    catch { available = false; message(c.storageError); }
  };
  read(); if (!available) message(c.storageError);
  function save() { if (available) try { writeStoryProgress(storage, route, progress); } catch { available = false; message(c.storageError); } }
  function updateLinks() {
    updateLocaleQueries(root.ownerDocument, '?chapter=' + encodeURIComponent(progress.current));
  }
  function stopPlayers() {
    for (const frame of $$(root, '[data-story-player]')) frame.remove();
    for (const button of $$(root, '[data-story-play]')) { button.textContent = c.play; button.setAttribute('aria-expanded', 'false'); }
  }
  function render({ focus = false } = {}) {
    const query = new URL(view.location.href).searchParams.get('chapter');
    if (query !== null) { if (route.chapters.some(ch => ch.id === query)) progress.current = query; else { progress.current = route.chapters[0].id; message(c.invalid); } }
    const index = route.chapters.findIndex(ch => ch.id === progress.current), done = progress.completed.length;
    stopPlayers();
    chapterNodes.forEach(node => { node.hidden = node.dataset.storyChapter !== progress.current; });
    for (const link of $$(root, '[data-story-jump]')) {
      const current = link.dataset.storyJump === progress.current;
      if (current) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
      const indicator = link.querySelector('[data-story-read]'); if (indicator) { indicator.hidden = !progress.completed.includes(link.dataset.storyJump); indicator.textContent = c.marked; }
    }
    $('[data-story-step]').textContent = storyFormat(c.step, { current: index + 1, total: route.chapters.length });
    $('[data-story-progress]').textContent = storyFormat(c.progress, { done, total: route.chapters.length });
    $('[data-story-meter]').max = route.chapters.length; $('[data-story-meter]').value = done;
    $('[data-story-previous]').disabled = index <= 0; $('[data-story-next]').disabled = index >= route.chapters.length - 1;
    const mark = $('[data-story-mark]'); mark.disabled = progress.completed.includes(progress.current); mark.textContent = mark.disabled ? c.marked : index === route.chapters.length - 1 ? c.markLast : c.finishChapter;
    $('[data-story-finished]').hidden = done !== route.chapters.length;
    $('[data-story-unfinished]').hidden = index !== route.chapters.length - 1 || done === route.chapters.length;
    $('[data-story-unfinished]').textContent = storyFormat(c.unfinished, { count: route.chapters.length - done });
    $$ (root, '[data-story-controls]').forEach(node => { node.hidden = false; });
    $('[data-story-fallback]').hidden = true; root.dataset.storyInitialized = 'true'; root.dataset.storyCurrent = progress.current;
    $('[data-story-share-url]').hidden = true; $('[data-story-share-status]').textContent = ''; updateLinks();
    if (focus) root.querySelector('[data-story-chapter]:not([hidden]) h2')?.focus();
  }
  function navigate(id) {
    if (!route.chapters.some(ch => ch.id === id)) return;
    const url = new URL(view.location.href); url.search = '?chapter=' + encodeURIComponent(id); url.hash = '';
    if (url.href !== view.location.href) view.history.pushState({}, '', url);
    progress.current = id; save(); render({ focus: true });
  }
  const onClick = async event => {
    const target = event.target.closest('button,a'); if (!target || !root.contains(target)) return;
    if (target.matches('[data-story-jump]')) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); navigate(target.dataset.storyJump);
    } else if (target.matches('[data-story-next],[data-story-previous]')) {
      const index = route.chapters.findIndex(ch => ch.id === progress.current); navigate(route.chapters[index + (target.matches('[data-story-next]') ? 1 : -1)]?.id);
    } else if (target.matches('[data-story-mark]')) {
      progress.completed = [...new Set([...progress.completed, progress.current])]; save();
      const index = route.chapters.findIndex(ch => ch.id === progress.current);
      if (index < route.chapters.length - 1) navigate(route.chapters[index + 1].id); else { render(); if (! $('[data-story-finished]').hidden) $('[data-story-finished] h2').focus({ preventScroll: true }); }
    } else if (target.matches('[data-story-reset]')) {
      if (available) try { clearStoryProgress(storage, route); } catch { available = false; }
      progress = normalizeStoryProgress(null, route); navigate(route.chapters[0].id); message(available ? c.resetDone : c.storageError);
    } else if (target.matches('[data-story-share]')) {
      const url = new URL(view.location.href); url.search = '?chapter=' + encodeURIComponent(progress.current); url.hash = '';
      try { await view.navigator.clipboard.writeText(url.href); $('[data-story-share-status]').textContent = c.copied; }
      catch { const field = $('[data-story-share-url]'); field.value = url.href; field.hidden = false; field.focus(); field.select(); $('[data-story-share-status]').textContent = c.copyFallback; }
    } else if (target.matches('[data-story-play]')) {
      const container = target.closest('[data-story-media]'), old = container.querySelector('[data-story-player]');
      if (old) { old.remove(); target.textContent = c.play; target.setAttribute('aria-expanded', 'false'); return; }
      if (!playerAllowed(target.dataset.mediaSrc)) { message(c.playerError); return; }
      stopPlayers(); const frame = root.ownerDocument.createElement('iframe'); frame.dataset.storyPlayer = ''; frame.src = target.dataset.mediaSrc; frame.title = target.dataset.mediaTitle || c.play;
      frame.allow = 'encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin';
      if (target.dataset.mediaSandbox) frame.setAttribute('sandbox', target.dataset.mediaSandbox);
      frame.addEventListener('error', () => message(c.playerError)); container.append(frame); target.textContent = c.closePlayer; target.setAttribute('aria-expanded', 'true');
    }
  };
  const pop = () => { const query = new URL(view.location.href).searchParams.get('chapter'); if (query === null) progress.current = route.chapters[0].id; render({ focus: true }); save(); };
  const sync = event => { if (event.key !== storyProgressKey && event.key !== null) return; read(); render(); message(available ? c.synced : c.storageError); };
  root.addEventListener('click', onClick); view.addEventListener('popstate', pop); view.addEventListener('storage', sync); render();
  const initialURL = new URL(view.location.href); initialURL.search = '?chapter=' + encodeURIComponent(progress.current); initialURL.hash = '';
  view.history.replaceState({}, '', initialURL); save();
  return { get progress() { return progress; }, navigate, render, destroy() { stopPlayers(); root.removeEventListener('click', onClick); view.removeEventListener('popstate', pop); view.removeEventListener('storage', sync); } };
}
export function initializeStoryDirectory(root, { routes, copy: c, storage = storageFor(root.ownerDocument.defaultView) }) {
  const view = root.ownerDocument.defaultView;
  function refresh() {
    for (const route of routes) {
      const card = root.querySelector('[data-story-card="' + route.id + '"]'); if (!card) continue;
      try {
        if (!storage) throw Error('No storage');
        const progress = readStoryProgress(storage, route), link = card.querySelector('[data-story-start]'), status = card.querySelector('[data-story-card-progress]');
        status.textContent = storyFormat(c.progress, { done: progress.completed.length, total: route.chapters.length });
        (link.querySelector('[data-story-start-label]') || link).textContent = progress.completed.length === route.chapters.length ? c.completedRoute : progress.current !== route.chapters[0].id || progress.completed.length ? c.resume : c.start;
        link.href = link.href.split('?')[0] + '?chapter=' + encodeURIComponent(progress.current);
      } catch { root.querySelector('[data-story-directory-status]').textContent = c.storageError; }
    }
  }
  const sync = event => { if (event.key === storyProgressKey || event.key === null) refresh(); };
  refresh(); view.addEventListener('storage', sync); view.addEventListener('pageshow', refresh);
  return { refresh, destroy() { view.removeEventListener('storage', sync); view.removeEventListener('pageshow', refresh); } };
}
for (const root of document.querySelectorAll('[data-story-app],[data-story-directory]')) {
  try {
    const data = JSON.parse(root.querySelector('[data-story-data]').textContent);
    if (root.hasAttribute('data-story-app')) initializeStory(root, data); else initializeStoryDirectory(root, data);
  } catch { /* Static chapters and original links remain readable. */ }
}
