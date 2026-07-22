import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const readSource = (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('homepage intro uses the supplied video path with a theme-specific treatment and static fallbacks', async () => {
  const [component, darkLogo, lightLogo] = await Promise.all([
    readSource('../src/components/SiteIntro.astro'),
    readSource('../public/brand/main-logo-dark.svg'),
    readSource('../public/brand/main-logo-light.svg'),
  ]);

  assert.match(darkLogo, /<svg[^>]+viewBox="0 0 400 400"/);
  assert.match(lightLogo, /<svg[^>]+viewBox="0 0 400 400"/);
  assert.doesNotMatch(darkLogo, /<script|javascript:/i);
  assert.doesNotMatch(lightLogo, /<script|javascript:/i);
  assert.match(component, /src="\/brand\/main-logo-dark\.svg"/);
  assert.match(component, /src="\/brand\/main-logo-light\.svg"/);
  assert.match(component, /src="\/brand\/site-intro-light\.mp4"/);
  assert.match(component, /data-site-intro-video/);
  assert.doesNotMatch(component, /\sautoplay/);
  assert.match(component, /html:not\(\[data-theme='light'\]\)[\s\S]*site-intro__video[\s\S]*filter:\s*invert\(1\)/);
  assert.match(component, /html\[data-theme='light'\][\s\S]*site-intro__static-logo--light[\s\S]*display:\s*block/);
});

test('intro waits for both its full animation and the window load event', async () => {
  const [layout, component, interactions] = await Promise.all([
    readSource('../src/layouts/BaseLayout.astro'),
    readSource('../src/components/SiteIntro.astro'),
    readSource('../src/scripts/siteInteractions.js'),
  ]);

  assert.match(layout, /isLocalizedHome && <SiteIntro/);
  assert.match(layout, /site-intro-enabled/);
  assert.match(layout, /kamitsubaki-home-intro-seen/);
  assert.match(layout, /sessionStorage\.getItem\(introStorageKey\)/);
  assert.match(layout, /sessionStorage\.setItem\(introStorageKey, 'true'\)/);
  assert.match(layout, /rel="preload" href="\/brand\/site-intro-light\.mp4" as="video"/);
  assert.match(layout, /rel="preload" href="\/brand\/main-logo-dark\.svg"/);
  assert.match(layout, /rel="preload" href="\/brand\/main-logo-light\.svg"/);
  assert.match(component, /data-animation-duration="5845"/);
  assert.match(interactions, /animationComplete = false/);
  assert.match(interactions, /siteIntro && document\.documentElement\.classList\.contains\('site-intro-enabled'\)/);
  assert.match(interactions, /pageLoaded = document\.readyState === 'complete'/);
  assert.match(interactions, /if \(leaving \|\| !animationComplete \|\| !pageLoaded\) return/);
  assert.match(interactions, /introVideo\.addEventListener\('ended', finishAnimation/);
  assert.match(interactions, /window\.addEventListener\('load'/);
  assert.match(interactions, /maximumIntroWait = animationDuration \+ \(prefersReducedMotion \? 500 : 2500\)/);
  assert.match(interactions, /window\.setTimeout\(\(\) => markPageLoaded\(true\), maximumIntroWait\)/);
  assert.match(interactions, /dataset\.state = pageLoaded \? 'ready' : 'waiting'/);
});

test('intro has a reduced-motion path and does not block non-home pages', async () => {
  const [component, interactions] = await Promise.all([
    readSource('../src/components/SiteIntro.astro'),
    readSource('../src/scripts/siteInteractions.js'),
  ]);

  assert.match(component, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(interactions, /prefersReducedMotion \? 900/);
  assert.match(interactions, /introVideo\.pause\(\)/);
  assert.match(interactions, /document\.documentElement\.classList\.remove\('site-intro-enabled'\);[\s\S]*startReveals\(\)/);
});
