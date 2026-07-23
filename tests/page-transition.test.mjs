import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('the v1.2.0 preloader transition is used outside the first homepage intro', async () => {
  const [layout, interactions, styles] = await Promise.all([
    readSource('../src/layouts/BaseLayout.astro'),
    readSource('../src/scripts/siteInteractions.js'),
    readSource('../src/styles/global.css'),
  ]);

  assert.match(layout, /let shouldPlayIntro = false/);
  assert.match(layout, /if \(isLocalizedHome\)[\s\S]*shouldPlayIntro = true/);
  assert.match(layout, /if \(shouldPlayIntro\) document\.documentElement\.classList\.add\('site-intro-enabled'\)/);
  assert.match(layout, /if \(!shouldPlayIntro\) document\.documentElement\.classList\.add\('site-page-transition-enabled'\)/);
  assert.match(layout, /id="preloader" data-page-transition/);
  assert.match(layout, /class="preloader-line mb-4"/);
  assert.match(layout, /CONNECTING TO KAMITSUBAKI_CITY\.\.\./);

  assert.match(interactions, /document\.querySelector\('\[data-page-transition\]'\)/);
  assert.match(interactions, /classList\.contains\('site-page-transition-enabled'\)/);
  assert.match(interactions, /transitionDelay = prefersReducedMotion \? 40 : 900/);
  assert.match(interactions, /pageTransition\.classList\.add\('hidden-preloader'\)/);
  assert.match(interactions, /document\.documentElement\.classList\.remove\('site-page-transition-enabled'\)/);

  assert.match(styles, /#preloader[\s\S]*background-color: #030303/);
  assert.match(styles, /opacity 0\.65s cubic-bezier\(0\.16, 1, 0\.3, 1\)/);
  assert.match(styles, /\.preloader-line[\s\S]*animation: growLine 0\.9s cubic-bezier\(0\.8, 0, 0\.2, 1\) forwards/);
  assert.match(styles, /@keyframes growLine[\s\S]*height: 100px[\s\S]*translateY\(-100px\)/);
  assert.match(styles, /html\[data-theme='light'\] #preloader\s*\{\s*background-color: #ffffff/);
  assert.match(styles, /html\[data-theme='light'\] #preloader p\s*\{\s*color: rgba\(0, 0, 0, 0\.5\)/);
  assert.match(styles, /html\[data-theme='light'\] \.preloader-line\s*\{\s*background-color: rgba\(0, 0, 0, 0\.5\)/);
});
