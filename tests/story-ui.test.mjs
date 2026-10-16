import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { JSDOM } from 'jsdom';
import { storyCopy } from '../src/lib/storyCopy.mjs';
import { storyProgressKey, writeStoryProgress } from '../src/lib/storyProgress.mjs';
const require = createRequire(import.meta.url), { build } = createRequire(require.resolve('vite'))('esbuild');
const bundle = await build({ entryPoints: ['src/scripts/storyApp.js'], bundle: true, write: false, format: 'iife', globalName: 'StoryUI' });
const route = { id: 'test-route', fingerprint: 'one', chapters: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] };
function memory() { const values = new Map(); return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) }; }
const markup = '<div data-locale-chooser-list><a href="/ja/explore/stories/test-route/">JA</a></div><main><p data-story-status></p><div data-story-controls hidden><span data-story-step></span><span data-story-progress></span><progress data-story-meter></progress></div>' + route.chapters.map(ch => '<a href="?chapter=' + ch.id + '" data-story-jump="' + ch.id + '">' + ch.id + '<span data-story-read hidden></span></a><section data-story-chapter="' + ch.id + '"><h2 tabindex="-1">' + ch.id + '</h2></section>').join('') + '<div data-story-media><button data-story-play data-media-src="https://www.youtube-nocookie.com/embed/abcdefghijk" data-media-title="Song & title" data-story-controls hidden></button></div><div data-story-controls hidden><button data-story-previous></button><button data-story-next></button><button data-story-mark></button><button data-story-reset></button><button data-story-share></button></div><p data-story-unfinished hidden></p><section data-story-finished hidden><h2 tabindex="-1">Finished</h2></section><p data-story-fallback hidden></p><input data-story-share-url hidden><p data-story-share-status></p></main>';
function setup(query = '', storage = memory(), activeRoute = route) {
  const dom = new JSDOM(markup, { url: 'https://wiki.example/zh/explore/stories/test-route/' + query, runScripts: 'outside-only' }), w = dom.window;
  const localeMenu = w.document.querySelector('[data-locale-chooser-list]');
  localeMenu.removeAttribute('data-locale-chooser-list'); localeMenu.className = 'site-nav__language-switcher';
  localeMenu.querySelector('a').setAttribute('hreflang', 'ja');
  w.eval(bundle.outputFiles[0].text + '\nwindow.StoryUI=StoryUI;');
  const controller = w.StoryUI.initializeStory(w.document.querySelector('main'), { route: activeRoute, copy: storyCopy('zh'), storage });
  return { dom, w, storage, controller, click: selector => w.document.querySelector(selector).click() };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 25));

test('navigation and history leave chapters unread; marking all chapters completes the route and reset is scoped', async () => {
  const { dom, w, storage, controller, click } = setup();
  try {
    assert.equal(w.document.querySelectorAll('[data-story-chapter]:not([hidden])').length, 1);
    click('[data-story-next]'); assert.equal(controller.progress.current, 'b'); assert.equal(controller.progress.completed.length, 0);
    assert.equal(w.document.activeElement.textContent, 'b'); assert.equal(new URL(w.location.href).searchParams.get('chapter'), 'b');
    const restored = new Promise(resolve => w.addEventListener('popstate', resolve, { once: true }));
    w.history.back(); await restored; assert.equal(controller.progress.current, 'a'); assert.equal(controller.progress.completed.length, 0);
    click('[data-story-mark]'); assert.equal(controller.progress.current, 'b'); assert.deepEqual([...controller.progress.completed], ['a']);
    click('[data-story-mark]'); click('[data-story-mark]'); assert.equal(controller.progress.completed.length, 3); assert.equal(w.document.querySelector('[data-story-finished]').hidden, false);
    assert.equal(w.document.activeElement.textContent, 'Finished');
    writeStoryProgress(storage, { ...route, id: 'other-route' }, { current: 'c', completed: ['a'] });
    click('[data-story-reset]'); assert.equal(controller.progress.completed.length, 0); assert.equal(controller.progress.current, 'a');
    assert.equal(JSON.parse(storage.getItem(storyProgressKey)).routes['other-route'].completed.length, 1);
  } finally { controller.destroy(); dom.window.close(); }
});

test('reload resumes a shared cross-language identity; explicit chapters win and sharing excludes completion', async () => {
  const s = memory(); writeStoryProgress(s, route, { current: 'b', completed: ['a'] });
  const { dom, w, controller, click } = setup('', s);
  try {
    assert.equal(controller.progress.current, 'b'); assert.ok(w.document.querySelector('.site-nav__language-switcher a[hreflang]').href.endsWith('?chapter=b'));
    click('[data-story-share]'); await tick(); const url = w.document.querySelector('[data-story-share-url]'); assert.equal(url.hidden, false); assert.equal(new URL(url.value).search, '?chapter=b');
    const second = setup('?chapter=c', s); assert.equal(second.controller.progress.current, 'c'); assert.deepEqual([...second.controller.progress.completed], ['a']); second.controller.destroy(); second.dom.window.close();
  } finally { controller.destroy(); dom.window.close(); }
});

test('unavailable or stale storage remains readable and cross-tab progress is refreshed without marking a chapter', () => {
  const disabled = { getItem() { throw Error('no storage'); }, setItem() { throw Error('no storage'); } }, first = setup('?chapter=unknown', disabled);
  try { assert.equal(first.controller.progress.current, 'a'); first.click('[data-story-next]'); assert.equal(first.controller.progress.current, 'b'); first.click('[data-story-mark]'); assert.equal(first.controller.progress.completed.length, 1); assert.ok(first.w.document.querySelector('[data-story-status]').textContent); }
  finally { first.controller.destroy(); first.dom.window.close(); }
  const s = memory(); writeStoryProgress(s, route, { current: 'c', completed: ['a'] }); const changed = setup('', s, { ...route, fingerprint: 'two' });
  assert.equal(changed.controller.progress.current, 'a'); assert.equal(changed.controller.progress.completed.length, 0); changed.controller.destroy(); changed.dom.window.close();
  const current = setup('', s, { ...route, fingerprint: 'two' });
  try { writeStoryProgress(s, { ...route, fingerprint: 'two' }, { current: 'b', completed: ['c'] }); current.w.dispatchEvent(new current.w.StorageEvent('storage', { key: storyProgressKey })); assert.deepEqual([...current.controller.progress.completed], ['c']); assert.equal(current.controller.progress.current, 'a'); }
  finally { current.controller.destroy(); current.dom.window.close(); }
});

test('media is click-to-load, stops on chapter navigation, and refuses an unrecognized player origin', () => {
  const { dom, w, controller, click } = setup();
  try {
    assert.equal(w.document.querySelector('iframe'), null); click('[data-story-play]'); assert.equal(w.document.querySelector('iframe').title, 'Song & title'); assert.equal(w.document.querySelector('[data-story-play]').getAttribute('aria-expanded'), 'true');
    click('[data-story-next]'); assert.equal(w.document.querySelector('iframe'), null);
    w.document.querySelector('[data-story-play]').dataset.mediaSrc = 'https://evil.example/embed'; click('[data-story-play]'); assert.equal(w.document.querySelector('iframe'), null);
  } finally { controller.destroy(); dom.window.close(); }
});
