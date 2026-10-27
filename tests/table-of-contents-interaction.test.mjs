import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { installDetailsMotion } from '../src/lib/detailsMotion.mjs';

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve('vite'))('esbuild');
const component = await readFile(new URL('../src/components/TableOfContents.astro', import.meta.url), 'utf8');
const script = component.match(/<script>([\s\S]*?)<\/script>/)[1];
const bundled = await build({
  stdin: { contents: script, resolveDir: fileURLToPath(new URL('../src/components/', import.meta.url)), loader: 'ts' },
  bundle: true, platform: 'browser', format: 'iife', write: false,
});

function reader() {
  const dom = new JSDOM(`<nav class="home-chrome"></nav><div data-reader>
    <details class="wiki-mobile-toc"><summary>Contents</summary><nav class="wiki-toc" data-animated>
      <ul class="toc-list"><li><a href="#profile" data-slug="profile">Profile</a></li></ul>
    </nav></details><h2 id="profile">Profile</h2></div>`, {
    url: 'https://wiki.example/zh/database/artists/solo/kaf/?from=home', runScripts: 'outside-only',
  });
  const w = dom.window, document = w.document, frames = [], animations = [], scrolls = [];
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.ResizeObserver = class { observe() {} disconnect() {} };
  w.requestAnimationFrame = fn => { frames.push(fn); return frames.length; };
  w.scrollTo = options => scrolls.push(options);
  document.querySelector('.home-chrome').getBoundingClientRect = () => ({ bottom: 72 });
  const details = document.querySelector('details'), target = document.getElementById('profile');
  details.getBoundingClientRect = () => ({ height: details.open ? 180 : 36 });
  target.getClientRects = () => [{ top: 400 }];
  target.getBoundingClientRect = () => ({ top: 400 });
  details.animate = () => {
    let resolve, reject;
    const animation = {
      cancelled: false, finished: new Promise((accept, fail) => { resolve = accept; reject = fail; }),
      cancel() { this.cancelled = true; reject(Error('cancelled')); }, finish() { resolve(); },
    };
    animations.push(animation); return animation;
  };
  w.eval(`(${installDetailsMotion.toString()})(document)`);
  w.eval(bundled.outputFiles[0].text);
  const flush = () => { while (frames.length) frames.shift()(); };
  return { dom, w, document, details, target, animations, scrolls, flush };
}

test('quick mobile contents navigation cancels the opening animation and keeps contents closed', async () => {
  const b = reader();
  try {
    b.details.querySelector('summary').click();
    assert.equal(b.animations.length, 1); assert.equal(b.details.dataset.expanded, 'true');
    const link = b.document.querySelector('a[data-slug]');
    link.click();
    assert.equal(b.animations[0].cancelled, true, 'navigation cancels the stale opening transition');
    assert.equal(b.details.open, false); assert.equal(b.details.dataset.expanded, 'false');
    assert.equal(b.details.style.height, ''); assert.equal(b.details.style.overflow, '');
    assert.equal(b.document.activeElement, b.target);
    assert.equal(b.w.location.search, '?from=home'); assert.equal(b.w.location.hash, '#profile');
    assert.equal(link.getAttribute('aria-current'), 'location'); assert.equal(b.scrolls.length, 1);
    b.animations[0].finish(); await Promise.resolve(); b.flush();
    assert.equal(b.details.open, false, 'the previous animation cannot reopen contents above the chosen heading');
    b.details.querySelector('summary').click();
    assert.equal(b.animations.length, 2); assert.equal(b.details.dataset.expanded, 'true');
    b.animations[1].finish(); await Promise.resolve();
    assert.equal(b.details.open, true, 'the next normal activation opens from the synchronized closed state');
  } finally { b.w.close(); }
});

test('modified contents navigation preserves native link behavior and the running disclosure', () => {
  const b = reader();
  try {
    b.details.querySelector('summary').click();
    const link = b.document.querySelector('a[data-slug]');
    for (const options of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      const event = new b.w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...options });
      link.dispatchEvent(event);
      assert.equal(event.defaultPrevented, false); assert.equal(b.animations[0].cancelled, false);
      assert.equal(b.details.open, true); assert.equal(b.w.location.hash, '');
    }
  } finally { b.w.close(); }
});
