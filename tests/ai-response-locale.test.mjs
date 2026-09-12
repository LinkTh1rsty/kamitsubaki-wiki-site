import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildAiLocaleRequest,
  convertAiResponseText,
  isTraditionalAiResponseLocale,
  loadTraditionalConverters,
  normalizeAiResponseLocale,
} from '../src/lib/aiResponseLocale.mjs';

test('AI response locales preserve Taiwan and Hong Kong Traditional Chinese variants', () => {
  assert.equal(normalizeAiResponseLocale('zh-Hant-TW'), 'zh-tw');
  assert.equal(normalizeAiResponseLocale('zh_Hant_HK'), 'zh-hk');
  assert.equal(isTraditionalAiResponseLocale('zh-tw'), true);
  assert.equal(isTraditionalAiResponseLocale('zh-hk'), true);
  assert.equal(isTraditionalAiResponseLocale('zh'), false);

  const taiwan = buildAiLocaleRequest('zh-tw');
  assert.equal(taiwan.locale, 'zh-tw');
  assert.equal(taiwan.languageTag, 'zh-Hant-TW');
  assert.match(taiwan.responseInstruction, /Traditional Chinese as used in Taiwan/);
  assert.match(taiwan.responseInstruction, /Do not answer in Simplified Chinese/);

  const hongKong = buildAiLocaleRequest('zh-hk');
  assert.equal(hongKong.languageTag, 'zh-Hant-HK');
  assert.match(hongKong.responseInstruction, /Traditional Chinese as used in Hong Kong/);
});

test('AI response fallback converts visible prose to the selected regional vocabulary', async () => {
  await loadTraditionalConverters();
  assert.equal(convertAiResponseText('软件和鼠标', 'zh-tw'), '軟體和滑鼠');
  assert.equal(convertAiResponseText('软件和鼠标', 'zh-hk'), '軟件和滑鼠');
  assert.equal(convertAiResponseText('软件和鼠标', 'zh'), '软件和鼠标');
});

test('convertAiResponseText returns input unchanged before converters load', async () => {
  const { convertAiResponseText: freshConvert } = await import(
    '../src/lib/aiResponseLocale.mjs?fresh-module'
  );
  assert.equal(freshConvert('软件和鼠标', 'zh-tw'), '软件和鼠标');
  await loadTraditionalConverters();
});

test('AI chat sends an explicit response locale contract and preserves dynamic greetings', async () => {
  const script = await readFile(new URL('../src/scripts/aiChatWidget.js', import.meta.url), 'utf8');
  assert.match(script, /buildAiLocaleRequest/);
  assert.match(script, /responseLocale/);
  assert.match(script, /responseInstruction/);
  assert.match(
    script,
    /setMessageMarkdown\(firstAssistantMessage, data\.greeting, localeRequest\.locale\)/,
  );
  assert.doesNotMatch(script, /copy\.greeting \|\| data\.greeting/);
  assert.match(script, /closest\('code, pre, \.katex, \.katex-display'\)/);
  assert.match(script, /convertAiResponseText\(pendingText, locale\)/);
});
