let traditionalConverters = null;

export async function loadTraditionalConverters() {
  if (traditionalConverters) {
    return traditionalConverters;
  }
  const OpenCC = (await import('opencc-js')).default || (await import('opencc-js'));
  traditionalConverters = Object.freeze({
    'zh-tw': OpenCC.Converter({ from: 'cn', to: 'twp' }),
    'zh-hk': OpenCC.Converter({ from: 'cn', to: 'hkp' }),
  });
  return traditionalConverters;
}

const responseLocaleProfiles = Object.freeze({
  zh: Object.freeze({
    locale: 'zh',
    languageTag: 'zh-Hans-CN',
    responseLanguage: 'Simplified Chinese',
    responseVariant: 'simplified-chinese',
    responseInstruction: 'Always answer in Simplified Chinese unless the user explicitly requests another language.',
  }),
  'zh-tw': Object.freeze({
    locale: 'zh-tw',
    languageTag: 'zh-Hant-TW',
    responseLanguage: 'Traditional Chinese (Taiwan)',
    responseVariant: 'traditional-chinese-taiwan',
    responseInstruction: 'Always answer in Traditional Chinese as used in Taiwan. Do not answer in Simplified Chinese.',
  }),
  'zh-hk': Object.freeze({
    locale: 'zh-hk',
    languageTag: 'zh-Hant-HK',
    responseLanguage: 'Traditional Chinese (Hong Kong)',
    responseVariant: 'traditional-chinese-hong-kong',
    responseInstruction: 'Always answer in Traditional Chinese as used in Hong Kong. Do not answer in Simplified Chinese.',
  }),
  ja: Object.freeze({
    locale: 'ja',
    languageTag: 'ja-JP',
    responseLanguage: 'Japanese',
    responseVariant: 'japanese',
    responseInstruction: 'Always answer in Japanese unless the user explicitly requests another language.',
  }),
  en: Object.freeze({
    locale: 'en',
    languageTag: 'en',
    responseLanguage: 'English',
    responseVariant: 'english',
    responseInstruction: 'Always answer in English unless the user explicitly requests another language.',
  }),
});

export function normalizeAiResponseLocale(value) {
  const locale = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  if (responseLocaleProfiles[locale]) {
    return locale;
  }
  if (locale === 'zh-hant-hk' || locale.startsWith('zh-hk')) {
    return 'zh-hk';
  }
  if (locale === 'zh-hant' || locale === 'zh-hant-tw' || locale.startsWith('zh-tw')) {
    return 'zh-tw';
  }
  if (locale.startsWith('ja')) {
    return 'ja';
  }
  if (locale.startsWith('en')) {
    return 'en';
  }
  return 'zh';
}

export function getAiResponseLocaleProfile(locale) {
  return responseLocaleProfiles[normalizeAiResponseLocale(locale)];
}

export function isTraditionalAiResponseLocale(locale) {
  return ['zh-tw', 'zh-hk'].includes(normalizeAiResponseLocale(locale));
}

export function buildAiLocaleRequest(locale) {
  return { ...getAiResponseLocaleProfile(locale) };
}

export function convertAiResponseText(value, locale) {
  const normalizedLocale = normalizeAiResponseLocale(locale);
  const converter = traditionalConverters?.[normalizedLocale];
  const text = String(value ?? '');
  return converter ? converter(text) : text;
}
