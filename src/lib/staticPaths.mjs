import { convertChineseContentValue } from './traditionalChinese.mjs';

/**
 * Locales that may lack a hand-written or generated source file. A `zh` entry
 * is the universal content fallback: list pages (getLocalizedEntries) already
 * show `zh` content for any missing locale, so the article route must exist
 * for every listed locale as well, or every such link would 404.
 */
const fallbackTargetLocales = Object.freeze(['zh-tw', 'zh-hk', 'ja', 'en']);

function splitEntryId(entryId) {
  const parts = entryId.normalize('NFC').split('/');
  const locale = parts.pop();
  return { idPath: parts.join('/'), locale };
}

/**
 * @template {object} E
 * @param {E & {id: string, data: object}} sourceEntry
 * @param {string} targetLocale
 * @returns {E}
 */
function buildFallbackEntry(sourceEntry, targetLocale) {
  return {
    ...sourceEntry,
    // Converting the data also rewrites /zh/... link fields to the target
    // locale and sets data.locale, so renderContentEntry converts the body
    // (read from the zh source file) to the target locale as well.
    data: convertChineseContentValue(sourceEntry.data, targetLocale),
  };
}

/**
 * Build getStaticPaths results for a localized content collection.
 *
 * Every entry whose id ends in a known locale produces its own route (as
 * before). Additionally, when an entry exists in `zh` but a fallback target
 * locale has no file of its own, a route for that locale is generated from
 * the zh entry so links never 404 — matching how list pages already fall
 * back to zh content.
 *
 * @template {object} E
 * @param {Array<E & {id: string, data: object}>} entries collection entries
 * @param {string[]} [targetLocales] locales to synthesize from zh when missing
 * @returns {Array<{params: {locale: string, id: string}, props: {entry: E}}>}
 */
export function buildLocalizedStaticPaths(
  entries,
  targetLocales = fallbackTargetLocales,
) {
  const byLocale = new Map();

  for (const entry of entries) {
    const { idPath, locale } = splitEntryId(entry.id);
    if (!byLocale.has(idPath)) byLocale.set(idPath, new Map());
    byLocale.get(idPath).set(locale, entry);
  }

  const results = [];

  for (const [idPath, localeEntries] of byLocale) {
    for (const [locale, entry] of localeEntries) {
      results.push({ params: { locale, id: idPath }, props: { entry } });
    }

    const zhEntry = localeEntries.get('zh');
    if (!zhEntry) continue;

    for (const locale of targetLocales) {
      if (localeEntries.has(locale)) continue;
      results.push({
        params: { locale, id: idPath },
        props: { entry: buildFallbackEntry(zhEntry, locale) },
      });
    }
  }

  return results;
}
