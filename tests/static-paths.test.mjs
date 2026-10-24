import assert from 'node:assert/strict';
import test from 'node:test';

import {buildLogDisplayData} from '../src/lib/homeData.mjs';
import { buildLocalizedStaticPaths } from '../src/lib/staticPaths.mjs';

function entry(id, data = {}) {
  return {
    id,
    filePath: `src/content/artists/${id}.md`,
    data: {
      locale: id.split('/').at(-1),
      translationKey: 'kaf',
      name: '花谱',
      ...data,
    },
  };
}

function routesFor(paths, locale) {
  return paths
    .filter((route) => route.params.locale === locale)
    .map((route) => ({ id: route.params.id, entryLocale: route.props.entry.data.locale }));
}

test('entry with only zh generates fallback routes for every missing locale', () => {
  const paths = buildLocalizedStaticPaths([entry('creators/sooda/zh')]);

  assert.deepEqual(routesFor(paths, 'zh'), [{ id: 'creators/sooda', entryLocale: 'zh' }]);

  // Traditional Chinese locales convert the zh content on the fly.
  for (const locale of ['zh-tw', 'zh-hk']) {
    assert.deepEqual(routesFor(paths, locale), [
      { id: 'creators/sooda', entryLocale: locale },
    ]);
  }

  // Untranslated locales (ja/en) fall back to the zh content as-is.
  for (const locale of ['ja', 'en']) {
    assert.deepEqual(routesFor(paths, locale), [
      { id: 'creators/sooda', entryLocale: 'zh' },
    ]);
  }
});

test('fallback route data is converted to the target locale and links are rewritten', () => {
  const paths = buildLocalizedStaticPaths([
    entry('creators/sooda/zh', {
      meta: '创作歌手',
      theme: { name: 'Theme', accentColor: '#fff' },
      href: '/zh/artists/creators/sooda',
      image: '/zh/artists/creators/sooda.jpg',
    }),
  ]);

  const hk = paths.find((route) => route.params.locale === 'zh-hk');
  assert.equal(hk.props.entry.data.locale, 'zh-hk');
  assert.equal(hk.props.entry.data.meta, '創作歌手');
  assert.equal(hk.props.entry.data.href, '/zh-hk/artists/creators/sooda');
  assert.equal(hk.props.entry.data.image, '/zh-hk/artists/creators/sooda.jpg');
  // Non-link fields that are not Chinese text stay untouched.
  assert.equal(hk.props.entry.data.theme.name, 'Theme');
  assert.equal(hk.props.entry.data.theme.accentColor, '#fff');
});

test('existing locale files win; no duplicate routes are generated', () => {
  const paths = buildLocalizedStaticPaths([
    entry('creators/sooda/zh'),
    entry('creators/sooda/ja'),
    entry('creators/sooda/en'),
    entry('creators/sooda/zh-hk'),
  ]);

  assert.equal(paths.length, 5);
  assert.deepEqual(routesFor(paths, 'zh-hk'), [
    { id: 'creators/sooda', entryLocale: 'zh-hk' },
  ]);
  assert.deepEqual(routesFor(paths, 'zh-tw'), [
    { id: 'creators/sooda', entryLocale: 'zh-tw' },
  ]);
  assert.deepEqual(routesFor(paths, 'ja'), [
    { id: 'creators/sooda', entryLocale: 'ja' },
  ]);
  assert.deepEqual(routesFor(paths, 'en'), [
    { id: 'creators/sooda', entryLocale: 'en' },
  ]);
});

test('entry without zh is not used as a fallback source', () => {
  const paths = buildLocalizedStaticPaths([entry('solo/ciel/ja')]);

  assert.equal(paths.length, 1);
  assert.deepEqual(routesFor(paths, 'ja'), [{ id: 'solo/ciel', entryLocale: 'ja' }]);
});

test('multiple entries keep their own ids and locales', () => {
  const paths = buildLocalizedStaticPaths([
    entry('vwp/kaf/zh'),
    entry('solo/ciel/zh'),
    entry('solo/ciel/zh-hk'),
  ]);

  assert.equal(paths.length, 10);
  assert.deepEqual(
    new Set(paths.map((route) => route.params.id)),
    new Set(['vwp/kaf', 'solo/ciel']),
  );
});

test('Unicode-equivalent log ids share one canonical route and preserve their original source ids',()=>{
 const canonical='2024/event-ライブ',decomposed=canonical.normalize('NFD'),zh=entry(decomposed+'/zh'),ja=entry(canonical+'/ja');
 const paths=buildLocalizedStaticPaths([zh,ja]);assert.equal(paths.length,5);assert.ok(paths.every(route=>route.params.id===canonical));
 assert.equal(paths.find(route=>route.params.locale==='zh').props.entry.id,zh.id);
 assert.equal(buildLogDisplayData(zh,'zh').href,'/zh/logs/'+canonical);
});
