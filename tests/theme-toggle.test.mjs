import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('theme preference defaults to system and offers localized light, dark, and system options', async () => {
  const [layout, nav, homeNav, homePage, script, styles] = await Promise.all([
    readSource('../src/layouts/BaseLayout.astro'),
    readSource('../src/components/SiteNav.astro'),
    readSource('../src/components/HomeSiteNav.astro'),
    readSource('../src/pages/[locale]/index.astro'),
    readSource('../src/scripts/themeToggle.js'),
    readSource('../src/styles/global.css'),
  ]);

  assert.match(layout, /kamitsubaki-theme/);
  assert.match(layout, /let preference = 'system'/);
  assert.match(layout, /matchMedia\('\(prefers-color-scheme: dark\)'\)/);
  assert.match(layout, /dataset\.themePreference = preference/);
  assert.match(layout, /document\.documentElement\.dataset\.theme/);
  assert.match(layout, /themeToggle\.js/);
  assert.match(nav, /data-theme-toggle/);
  assert.match(nav, /role="radiogroup"/);
  assert.match(nav, /value: 'light', shortLabel: '日'/);
  assert.match(nav, /value: 'dark', shortLabel: '夜'/);
  assert.match(nav, /value: 'system', shortLabel: '系'/);
  assert.match(nav, /value: 'light', shortLabel: '昼'/);
  assert.match(nav, /value: 'system', shortLabel: '自'/);
  assert.match(nav, /value: 'light', shortLabel: 'DAY'/);
  assert.match(nav, /value: 'dark', shortLabel: 'NIGHT'/);
  assert.match(nav, /value: 'system', shortLabel: 'SYS'/);
  assert.match(nav, /site-nav__brand-group[\s\S]*site-nav__theme-switcher[\s\S]*site-nav__brand-link/);
  assert.match(nav, /site-nav__navigation[\s\S]*resolvedNavItems\.map[\s\S]*site-nav__language-switcher/);
  assert.ok(nav.indexOf('site-nav__theme-switcher') < nav.indexOf('site-nav__brand-link'));
  assert.ok(nav.lastIndexOf('site-nav__link') < nav.indexOf('site-nav__language-switcher'));
  assert.match(homeNav, /site-nav__controls[\s\S]*Language switcher[\s\S]*site-nav__theme-switcher/);
  assert.doesNotMatch(homeNav, /site-nav__brand-group|site-nav__brand-link|site-nav__navigation|site-nav__language-switcher/);
  assert.match(homePage, /import HomeSiteNav from/);
  assert.match(homePage, /<HomeSiteNav /);
  assert.doesNotMatch(homePage, /import SiteNav from|<SiteNav /);
  assert.match(styles, /\.site-nav__brand-group,[\s\S]*\.site-nav__navigation\s*\{[\s\S]*flex-flow: row nowrap/);
  assert.match(styles, /\.site-nav__language-switcher,[\s\S]*\.site-nav__theme-switcher\s*\{[\s\S]*grid-template-columns: repeat\(3, 1\.25rem\)[\s\S]*justify-items: center/);
  assert.match(script, /localStorage\.setItem\(storageKey, nextPreference\)/);
  assert.match(script, /aria-checked/);
  assert.match(script, /systemThemeQuery\.addEventListener\('change', handleSystemThemeChange\)/);
  assert.match(styles, /html\[data-theme='light'\]/);
  assert.match(styles, /--theme-bg: #ffffff/);
  assert.match(styles, /--color-white: var\(--theme-fg\)/);
  assert.match(styles, /\.site-nav__theme-option[\s\S]*background: transparent[\s\S]*border: 0|\.site-nav__theme-option[\s\S]*border: 0[\s\S]*background: transparent/);
  assert.match(styles, /html\[data-theme='light'\] \.cursor-dot[\s\S]*background-color: #000000[\s\S]*mix-blend-mode: normal/);
  assert.match(styles, /html\[data-theme='light'\] \.cursor-dot\.hovering[\s\S]*border-color: #000000/);
  assert.match(styles, /\.wiki-toc \.toc-list a\[data-active="true"\][\s\S]*color: var\(--theme-accent-color\)/);
  assert.match(styles, /html\[data-theme='light'\] \[class~='text-white'\][\s\S]*color: #000000/);
  assert.match(styles, /html\[data-theme='light'\] \[class\*='text-white\/'\][\s\S]*color: #42484c/);
  assert.match(styles, /html\[data-theme='light'\] \.site-nav__link,[\s\S]*\.site-nav__menu-panel a\s*\{[\s\S]*font-weight: 400/);
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
