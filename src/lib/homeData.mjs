import {
  convertChineseValue,
  isChineseContentLocale,
  isTraditionalChineseLocale,
} from './traditionalChinese.mjs';

function rewriteLocalizedSiteRoutes(value, locale) {
  if (typeof value === 'string') {
    return value.replace(/^\/zh(?=\/|[?#]|$)/u, `/${locale}`);
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteLocalizedSiteRoutes(item, locale));
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      rewriteLocalizedSiteRoutes(item, locale),
    ]),
  );
}

function deriveChineseSite(source, locale) {
  const converted = convertChineseValue(source, locale, { ui: true });
  return {
    ...rewriteLocalizedSiteRoutes(converted, locale),
    locale,
    ...(isTraditionalChineseLocale(locale)
      ? { generated: true, generatedFrom: 'zh' }
      : {}),
  };
}

export function sortByOrder(entries) {
  return [...entries].sort((a, b) => a.data.order - b.data.order);
}

export function getLocalizedEntries(entries, locale, fallbackLocale = 'zh') {
  const localized = new Map();
  const fallback = new Map();

  for (const entry of entries) {
    if (entry.data.locale === locale) {
      localized.set(entry.data.translationKey, entry);
    }

    if (entry.data.locale === fallbackLocale) {
      fallback.set(entry.data.translationKey, entry);
    }
  }

  return [...new Set([...fallback.keys(), ...localized.keys()])].map(
    (key) => localized.get(key) ?? fallback.get(key),
  );
}

const localizedSiteCache = new Map();

export function getLocalizedSite(siteEntries, locale, fallbackLocale = 'zh') {
  const cacheKey = String(locale) + '|' + String(fallbackLocale);
  const cached = localizedSiteCache.get(cacheKey);
  if (cached) return cached;

  const fallback = siteEntries.find((entry) => entry.data.locale === fallbackLocale)?.data;
  const result = isChineseContentLocale(locale) && fallback
    ? deriveChineseSite(fallback, locale)
    : siteEntries.find((entry) => entry.data.locale === locale)?.data ?? fallback;

  localizedSiteCache.set(cacheKey, result);
  return result;
}

export function humanizeSlug(slug) {
  const parts = slug
    .split('-')
    .filter(Boolean);

  if (parts.length === 1 && parts[0].length <= 4) {
    return parts[0].toUpperCase();
  }

  return parts
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function parseLogPath(entryId) {
  const parts = entryId.normalize('NFC').split('/');
  parts.pop();
  const slug = parts.pop();
  const year = parts[0] ?? 'logs';

  return {
    year,
    logPath: [...parts, slug].filter(Boolean).join('/'),
  };
}

export function buildLogDisplayData(entry, locale) {
  const { year, logPath } = parseLogPath(entry.id);
  const { order, ...logData } = entry.data;

  return {
    id: logPath,
    href: `/${locale}/logs/${logPath}`,
    year,
    ...logData,
  };
}

export function buildLogCards(logEntries, locale) {
  return sortByOrder(logEntries).map((entry) => buildLogDisplayData(entry, locale));
}
import { resolveLocaleCopy } from './i18n.mjs';
