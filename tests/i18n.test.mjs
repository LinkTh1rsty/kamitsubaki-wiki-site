import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import yaml from 'yaml';

import {
  buildLocaleLinks,
  getLanguageTag,
  getLocaleProfile,
  getLocalizedSiteName,
  localizedSiteNames,
  resolveLocaleCopy,
  supportedLocales,
} from '../src/lib/i18n.mjs';
import { getLocalizedSite } from '../src/lib/homeData.mjs';

const locales = ['zh', 'zh-tw', 'zh-hk', 'ja', 'en'];

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
}

async function readMd(path) {
  const content = await readFile(new URL(path, import.meta.url), 'utf8');
  const match = content.match(/---\r?\n([\s\S]*?)\r?\n---/);
  return yaml.parse(match[1]);
}

test('site has five url-based locales with Simplified Chinese as default', async () => {
  assert.equal(await fileExists('../src/pages/[locale]/index.astro'), true);
  assert.equal(await fileExists('../src/pages/index.astro'), true);

  const rootPage = await readFile(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(rootPage, /\/zh\//);

  for (const locale of locales) {
    const site = await readJson(`../src/content/site/${locale}.json`);
    assert.equal(site.locale, locale);
    assert.equal(site.translationKey, 'home');
  }
});

test('site name and BCP 47 language tags cover both Traditional Chinese variants', () => {
  assert.deepEqual(localizedSiteNames, {
    zh: '神椿观测站-KAMITSUBAKI Fan Wiki',
    'zh-tw': '神椿觀測站-KAMITSUBAKI Fan Wiki',
    'zh-hk': '神椿觀測站-KAMITSUBAKI Fan Wiki',
    ja: '神椿観測所-KAMITSUBAKI Fan Wiki',
    en: 'KAMITSUBAKI Observatory-KAMITSUBAKI Fan Wiki',
  });
  assert.deepEqual(supportedLocales, locales);
  assert.equal(getLanguageTag('zh'), 'zh-Hans-CN');
  assert.equal(getLanguageTag('zh-tw'), 'zh-Hant-TW');
  assert.equal(getLanguageTag('zh-hk'), 'zh-Hant-HK');
  assert.equal(getLocaleProfile('zh-tw').openccTarget, 'twp');
  assert.equal(getLocaleProfile('zh-hk').openccTarget, 'hkp');
  assert.equal(getLocalizedSiteName('unknown'), localizedSiteNames.zh);
});

test('localized site config exposes language switcher labels and page chrome', async () => {
  const zh = await readJson('../src/content/site/zh.json');

  assert.equal(zh.defaultLocale, 'zh');
  assert.deepEqual(
    zh.supportedLocales.map((locale) => locale.code),
    locales,
  );
  assert.equal(zh.hero.title, 'Observer');
  assert.equal(zh.sections.database.heading, 'DATABASE');
  assert.equal(zh.footer.disclaimer.length > 0, true);

  const localeLinks = buildLocaleLinks(zh, 'zh-tw', '/artists/vwp/kaf');
  assert.deepEqual(
    localeLinks.map(({ code, shortLabel }) => [code, shortLabel]),
    [
      ['zh', '简中'],
      ['zh-tw', '台繁'],
      ['zh-hk', '港繁'],
      ['ja', '日本語'],
      ['en', 'ENG'],
    ],
  );
  assert.equal(localeLinks.find((link) => link.code === 'zh')?.dropdownLabel, '简体中文');
  assert.equal(localeLinks.find((link) => link.code === 'zh-tw')?.current, true);
});

test('localized site config exposes configurable social contact links', async () => {
  const labels = { zh: '联系', 'zh-tw': '聯絡', 'zh-hk': '聯絡', ja: 'お問い合わせ', en: 'Contact' };
  for (const locale of locales) {
    const site = await readJson(`../src/content/site/${locale}.json`);
    const contactLink = site.footer.links.find((link) => link.label === labels[locale]);

    assert.equal(contactLink.href, `/${locale}/#social-contact`);
    assert.equal(site.socialContact.enabled, true);
    assert.deepEqual(
      site.socialContact.items.slice(0, 3).map((item) => item.icon),
      ['qq', 'link', 'discord'],
    );
    assert.equal(
      site.socialContact.items.find((item) => item.icon === 'github')?.href,
      'https://github.com/LinkTh1rsty',
    );
    assert.equal(site.socialContact.items.every((item) => item.href && item.enabled !== false), true);
  }
});

test('Traditional Chinese site chrome is derived at runtime without falling back to Simplified copy', async () => {
  const zh = await readJson('../src/content/site/zh.json');
  const entries = [{ data: zh }];
  const tw = getLocalizedSite(entries, 'zh-tw');
  const hk = getLocalizedSite(entries, 'zh-hk');

  assert.equal(tw.locale, 'zh-tw');
  assert.equal(hk.locale, 'zh-hk');
  assert.equal(tw.hero.leftVertical, '以音樂與故事，讓世界稍稍改變。');
  assert.equal(tw.hero.rightVertical, '神椿非公式觀測所');
  assert.equal(hk.hero.rightVertical, '神椿非公式觀測所');
  assert.equal(tw.socialContact.title, '聯絡與關注');
  assert.equal(hk.socialContact.title, '聯絡與關注');
  assert.equal(tw.socialContact.buttonLabel, '開啟社群聯絡面板');
  assert.equal(hk.socialContact.buttonLabel, '開啟社交平台聯絡面板');
  assert.equal(tw.aiChat.buttonLabel, '開啟 AI 觀測端');
  assert.equal(hk.aiChat.buttonLabel, '開啟 AI 觀測端');
  assert.equal(tw.aiChat.settingsLabel, '設定 AI 觀測端');
  assert.equal(hk.aiChat.threadActionsLabel, '對話操作');
  assert.equal(tw.aiChat.cancelLabel, '取消');
  assert.equal(tw.aiChat.keyboardHint, 'Enter 送出 · Control+Enter 換行');
  assert.equal(hk.aiChat.keyboardHint, 'Enter 傳送 · Control+Enter 換行');
  assert.equal(tw.aiChat.historyLabel, '對話紀錄');
  assert.equal(hk.aiChat.historyLabel, '對話記錄');
  assert.equal(
    tw.socialContact.items.find((item) => item.icon === 'link' && item.href.startsWith('/'))?.href,
    '/zh-tw/contribute/',
  );
  assert.equal(
    hk.footer.links.find((item) => item.label === '聯絡')?.href,
    '/zh-hk/#social-contact',
  );
});

test('home experience portals resolve copy for both Traditional Chinese routes', async () => {
  const component = await readFile(
    new URL('../src/components/ExperiencePortals.astro', import.meta.url),
    'utf8',
  );
  const copy = {
    zh: {
      heading: 'EXPERIENCES',
      subheading: '从资料库进入神椿的另一侧',
      gameAction: '进入游戏',
    },
    ja: {},
    en: {},
  };

  assert.match(component, /resolveLocaleCopy\(\{[\s\S]*\}, locale\)/);
  assert.deepEqual(resolveLocaleCopy(copy, 'zh-tw'), {
    heading: 'EXPERIENCES',
    subheading: '從資料庫進入神椿的另一側',
    gameAction: '進入遊戲',
  });
  assert.deepEqual(resolveLocaleCopy(copy, 'zh-hk'), {
    heading: 'EXPERIENCES',
    subheading: '從資料庫進入神椿的另一側',
    gameAction: '進入遊戲',
  });
});

test('floating UI roots carry explicit Traditional Chinese language inheritance', async () => {
  const [layout, aiChat, socialContact, search] = await Promise.all([
    readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/AiChatWidget.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/SocialContactWidget.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/SiteSearch.astro', import.meta.url), 'utf8'),
  ]);

  assert.match(layout, /getLocalizedSite\(siteEntries,\s*lang\)/);
  assert.match(layout, /<ObserverDashboard locale=\{lang\}[\s\S]*socialCopy=\{socialContactCopy\}/);
  assert.match(aiChat, /class="ai-chat[^"]*"[\s\S]*lang=\{languageTag\}/);
  const aiLauncher = aiChat.match(/<div\b[^>]*\bdata-ai-launcher\b[^>]*>/)?.[0] || '';
  assert.match(aiLauncher, /ai-chat__launcher/);
  assert.match(aiLauncher, /\blang=\{languageTag\}/);
  assert.match(socialContact, /class="social-contact"[\s\S]*lang=\{languageTag\}/);
  assert.match(search, /class="site-search"[\s\S]*lang=\{languageTag\}/);
});
