import { normalizeDate } from './labsCatalog.mjs';
import { convertChineseContentValue } from './traditionalChinese.mjs';
const cache = new Map();

/** Public list metadata only. No cookies, account IDs, article bodies or write requests. */
export async function readDiscoveryArticles(api, { fetchImpl = fetch, timeout = 8000 } = {}) {
  const languages = ['zh', 'ja', 'en'];
  const results = await Promise.all(languages.map(async locale => {
    const rows = [], offsets = new Set(); let offset = 0, complete = false;
    const signal = AbortSignal.timeout(timeout);
    try {
      for (let page = 0; page < 32 && rows.length < 2000; page++) {
        if (offsets.has(offset)) break; offsets.add(offset);
        const url = new URL('/api/articles', api); url.searchParams.set('locale', locale); url.searchParams.set('offset', String(offset));
        const response = await fetchImpl(url.href, { credentials: 'omit', signal });
        if (!response.ok) throw Error('Public article index unavailable');
        const data = await response.json();
        if (!Array.isArray(data.items)) throw Error('Invalid public article index');
        rows.push(...data.items.filter(row => typeof row.id === 'string' && row.id && row.id.length <= 200 && typeof row.title === 'string'
          && (!row.status || ['published', 'approved'].includes(row.status))));
        if (data.nextOffset === null || data.nextOffset === undefined) { complete = true; break; }
        if (!Number.isSafeInteger(data.nextOffset) || data.nextOffset < 0) break;
        offset = data.nextOffset;
      }
    } catch { /* Preserve verified public rows; surface incomplete coverage separately. */ }
    return { locale, rows: rows.slice(0, 2000), complete };
  }));
  const articles = new Map();
  for (const result of results) for (const row of result.rows) {
    if (!articles.has(row.id)) articles.set(row.id, {});
    articles.get(row.id)[result.locale] = { id: row.id, title: row.title, summary: typeof row.summary === 'string' ? row.summary : '',
      publishedAt: typeof row.publishedAt === 'string' ? row.publishedAt : '',
      updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : '',
      relatedEntities: Array.isArray(row.relatedEntities) ? [...new Set(row.relatedEntities.filter(id => typeof id === 'string'))] : [] };
  }
  return { articles: [...articles].sort(([a], [b]) => a.localeCompare(b)).map(([id, translations]) => ({ id, translations })),
    status: results.every(result => result.complete) ? 'complete' : articles.size ? 'partial' : 'unavailable' };
}
export function loadDiscoveryArticles(api = import.meta.env?.PUBLIC_ARTICLE_API_URL || import.meta.env?.PUBLIC_GALLERY_API_URL || 'https://api.kamitsubaki.wiki') {
  const current = cache.get(api), ttl = import.meta.env?.PROD ? Infinity : 60000;
  if (current && Date.now() - current.time < ttl) return current.value;
  const value = readDiscoveryArticles(api); cache.set(api, { time: Date.now(), value }); return value;
}

export function discoveryArticleNodes(snapshot, locale) {
  return snapshot.articles.map(({ id, translations }) => {
    const canonical = translations.zh || translations.ja || translations.en;
    const chosen = translations[locale] || canonical, text = convertChineseContentValue({ title: chosen.title, summary: chosen.summary }, locale);
    const date = normalizeDate((canonical.publishedAt || canonical.updatedAt).slice(0, 10)), year = date?.label.slice(0, 4) || '';
    return { id: 'article:' + id, articleId: id, title: text.title, description: text.summary, kind: 'editorial-article', collection: 'editorial-article',
      path: '/' + locale + '/articles/read/?id=' + encodeURIComponent(id), subtitle: '', aliases: [], image: '', artists: [], links: [], date, year, endYear: year, styles: [],
      search: Object.values(translations).flatMap(row => [row.title, row.summary]).join(' '),
      relatedEntities: canonical.relatedEntities };
  });
}
