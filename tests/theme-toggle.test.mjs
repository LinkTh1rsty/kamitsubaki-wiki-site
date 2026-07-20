import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('theme choice is restored before paint and can be changed from the site navigation', async () => {
  const [layout, nav, script, styles] = await Promise.all([
    readSource('../src/layouts/BaseLayout.astro'),
    readSource('../src/components/SiteNav.astro'),
    readSource('../src/scripts/themeToggle.js'),
    readSource('../src/styles/global.css'),
  ]);

  assert.match(layout, /kamitsubaki-theme/);
  assert.match(layout, /document\.documentElement\.dataset\.theme/);
  assert.match(layout, /themeToggle\.js/);
  assert.match(nav, /data-theme-toggle/);
  assert.match(nav, /site-nav__controls[\s\S]*Language switcher[\s\S]*data-theme-toggle/);
  assert.match(script, /localStorage\.setItem\(storageKey, nextTheme\)/);
  assert.match(script, /aria-pressed/);
  assert.match(styles, /html\[data-theme='light'\]/);
  assert.match(styles, /--theme-bg: #ffffff/);
  assert.match(styles, /--color-white: var\(--theme-fg\)/);
  assert.match(styles, /\.wiki-toc \.toc-list a\[data-active="true"\][\s\S]*color: var\(--theme-accent-color\)/);
  assert.match(styles, /html\[data-theme='light'\] \[class~='text-white'\][\s\S]*color: #000000/);
  assert.match(styles, /html\[data-theme='light'\] \[class\*='text-white\/'\][\s\S]*color: #42484c/);
  assert.match(styles, /\.license-panel__link--primary/);
});

test('the footer uses the supplied long logo with theme-aware contrast', async () => {
  const [footer, styles] = await Promise.all([
    readSource('../src/components/SiteFooter.astro'),
    readSource('../src/styles/global.css'),
  ]);

  assert.match(footer, /src="\/brand\/kamitsubakiwiki-long-dark\.svg"/);
  assert.match(footer, /src="\/brand\/kamitsubakiwiki-long-light\.svg"/);
  assert.match(footer, /footer-brand-logo--dark/);
  assert.match(footer, /footer-brand-logo--light/);
  assert.match(styles, /html\[data-theme='light'\] \.footer-brand-logo--dark/);
  assert.match(styles, /html\[data-theme='light'\] \.footer-brand-logo--light/);
  assert.match(styles, /html\[data-theme='light'\] \.footer-brand-logo--light[\s\S]*filter: none[\s\S]*opacity: 1/);
});
