import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { labsCopy } from '../src/lib/labsCopy.mjs';
import { applyLibraryChanges, libraryChanges } from '../src/lib/accountLibrary.mjs';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const bundle = await build({
  stdin: {
    contents: "export { initializeLibrary } from './src/scripts/personalLibrary.js'; export { setLibraryOwner } from './src/lib/personalLibrary.mjs';",
    resolveDir: fileURLToPath(new URL('..', import.meta.url)),
  },
  bundle: true, write: false, platform: 'browser', format: 'iife',
  globalName: 'WikiLibrary', footer: { js: 'globalThis.WikiLibrary = WikiLibrary;' },
});

function libraryPage() {
  const copy = labsCopy('zh');
  const dom = new JSDOM(`<div id="library">
    <div data-library-lists></div><h2 data-library-title></h2>
    <button data-create-open></button><button data-rename></button><button data-delete-list></button>
    <input data-library-search><select data-library-kind><option value=""></option></select>
    <select data-library-order><option value="recent"></option><option value="title"></option><option value="manual" hidden></option></select>
    <span data-library-feedback></span><span data-status></span><button data-library-clear></button><button data-library-undo></button>
    <div data-results></div><button data-library-more></button><button data-export></button><button data-import-open></button><input data-import type="file">
    <dialog data-list-dialog><form data-list-form><h2 data-dialog-title></h2><input name="name"><span data-dialog-status></span><button data-dialog-cancel></button></form></dialog>
  </div>`, { url: 'https://wiki-auth-preview.kamitsubaki.wiki/zh/account/#library', runScripts: 'outside-only' });
  const groups = [];
  for (const [key, label] of Object.entries(copy.entryKinds)) {
    const existing = groups.find(group => group.label === label);
    if (existing) existing.keys.push(key);
    else groups.push({ label, keys: [key] });
  }
  for (const group of groups) {
    const option = dom.window.document.createElement('option');
    option.value = group.keys.join('|');
    option.textContent = group.label;
    dom.window.document.querySelector('[data-library-kind]').append(option);
  }
  dom.window.eval(bundle.outputFiles[0].text);
  dom.window.WikiLibrary.setLibraryOwner('test-owner');
  return { dom, copy, root: dom.window.document.querySelector('#library') };
}

test('synced V3 song displays and filters as a song without changing its sync base', () => {
  const { dom, copy, root } = libraryPage();
  try {
    const item = { path: '/zh/database/music/songs/kaf-majo/', title: '魔女', kind: 'database', savedAt: 1 };
    const library = { version: 1, items: [item], lists: [{ id: 'songs', name: '歌单', paths: [item.path] }] };
    const key = 'kamitsubaki-library-v1:account:test-owner';
    const record = { library, base: library, revision: 7 };
    dom.window.localStorage.setItem(key, JSON.stringify(record));
    const reload = dom.window.WikiLibrary.initializeLibrary(root, copy);
    assert.equal(root.querySelector('.library-meta span').textContent, '歌曲');
    assert.equal(root.querySelector('h3 a').getAttribute('href'), item.path);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(key)), record);
    const kind = root.querySelector('[data-library-kind]');
    kind.value = 'songs|work-track';
    kind.dispatchEvent(new dom.window.Event('change'));
    assert.equal(root.querySelectorAll('.library-row').length, 1);
    kind.value = 'person|database';
    kind.dispatchEvent(new dom.window.Event('change'));
    assert.equal(root.querySelectorAll('.library-row').length, 0);
    kind.value = '';
    kind.dispatchEvent(new dom.window.Event('change'));
    reload();
    assert.equal(root.querySelector('.library-meta span').textContent, '歌曲');
    root.querySelector('[aria-label="取消收藏: 魔女"]').click();
    const saved = JSON.parse(dom.window.localStorage.getItem(key));
    assert.deepEqual(saved.base, library);
    assert.equal(saved.revision, 7);
    const synced = applyLibraryChanges(library, libraryChanges(saved.base, saved.library));
    assert.equal(synced.items.length, 0);
    assert.deepEqual(synced.lists[0].paths, []);
  } finally {
    dom.window.close();
  }
});

const canonicalRecords = [
  ['projects/kamitsubaki-city', '企划', 'project'],
  ['lives/fukakai', '演出', 'live-event'],
  ['studios/thinkr', '组织与厂牌', 'organization'],
  ['lore/collapse', '世界观概念', 'lore-concept'],
  ['isotopes/kafu', '音乐同位体', 'software-voice'],
  ['artists/groups/vwp', '组合', 'unit'],
];
for (const [route, label, type] of canonicalRecords) {
  test(`synced V3 ${type} uses its existing category filter without changing saved metadata`, () => {
    const { dom, copy, root } = libraryPage();
    try {
      const item = { path: `/zh/database/${route}/`, title: label, kind: 'database', savedAt: 1 };
      const library = { version: 1, items: [item], lists: [] };
      const key = 'kamitsubaki-library-v1:account:test-owner';
      const record = { library, base: library, revision: 7 };
      dom.window.localStorage.setItem(key, JSON.stringify(record));
      dom.window.WikiLibrary.initializeLibrary(root, copy);
      assert.equal(root.querySelector('.library-meta span').textContent, label);
      assert.equal(root.querySelector('h3 a').getAttribute('href'), item.path);
      const kind = root.querySelector('[data-library-kind]');
      kind.value = [...kind.options].find(option => option.value.split('|').includes(type)).value;
      kind.dispatchEvent(new dom.window.Event('change'));
      assert.equal(root.querySelectorAll('.library-row').length, 1);
      kind.value = 'person|database';
      kind.dispatchEvent(new dom.window.Event('change'));
      assert.equal(root.querySelectorAll('.library-row').length, 0);
      assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(key)), record);
    } finally {
      dom.window.close();
    }
  });
}

test('group-member favorites retain the mixed-person fallback and never enter the unit filter', () => {
  const { dom, copy, root } = libraryPage();
  try {
    const item = { path: '/zh/database/artists/groups/vwp/members/kaf/', title: '花譜', kind: 'database', savedAt: 1 };
    const library = { version: 1, items: [item], lists: [] };
    const key = 'kamitsubaki-library-v1:account:test-owner';
    const record = { library, base: library, revision: 7 };
    dom.window.localStorage.setItem(key, JSON.stringify(record));
    dom.window.WikiLibrary.initializeLibrary(root, copy);
    assert.equal(root.querySelector('.library-meta span').textContent, '创作者');
    const kind = root.querySelector('[data-library-kind]');
    kind.value = 'unit';
    kind.dispatchEvent(new dom.window.Event('change'));
    assert.equal(root.querySelectorAll('.library-row').length, 0);
    kind.value = 'person|database';
    kind.dispatchEvent(new dom.window.Event('change'));
    assert.equal(root.querySelectorAll('.library-row').length, 1);
    assert.deepEqual(JSON.parse(dom.window.localStorage.getItem(key)), record);
  } finally {
    dom.window.close();
  }
});
