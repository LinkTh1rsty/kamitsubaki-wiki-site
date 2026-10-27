import { buildEntityLabsCatalog, normalizeDate } from './labsCatalog.mjs';
import { createGraphIndex } from './graphModel.mjs';
import { discoveryHash, discoveryVersion, discoveryEdgeKey } from './discoveryEngine.mjs';
import { entityLabel } from './entityLabels.mjs';
import { convertChineseContentValue } from './traditionalChinese.mjs';
import { discoveryArticleNodes } from './discoveryArticles.mjs';

/** Metadata used for eligibility stays canonical across languages; display fields are localized.
 * @returns {import('./discoveryEngine.mjs').DiscoveryCatalog}
 */
export function buildDiscoveryCatalog(registry, feature, locale = 'zh', articles = { articles: [], status: 'unavailable' }) {
  const base = buildEntityLabsCatalog(registry, feature, locale), styleNames = new Map(), events = new Map(feature.events.map(event => [event.id, event]));
  const nodes = base.nodes.flatMap(node => {
    const translations = registry.entities.get(node.id);
    const entries = translations ? [...translations.values()] : [];
    const d = translations?.get('zh')?.data || entries[0]?.data;
    if (d?.contentStatus === 'stub') return [];
    const styles = [...new Set([...(d?.genres || []).map(value => 'genre:' + value), ...(d?.tags || []).map(value => 'tag:' + value),...(d?.genome?.tags || []).flatMap(tag=>['tag:'+tag.value,'genome:'+tag.dimension+':'+tag.value])])];
    for (const style of styles) styleNames.set(style, style.startsWith('genre:') ? entityLabel(style.slice(6), locale) : convertChineseContentValue(style.startsWith('genome:') ? style.split(':').slice(2).join(':') : style.slice(4), locale));
    const rawDate = d ? d.releaseDate || d.dateRange?.start || d.lifecycle?.startedAt || d.publishDate
      || (d.voiceEngines || []).map(engine => engine.releaseDate).filter(Boolean).sort()[0] : node.date?.label;
    const date = normalizeDate(rawDate), year = date?.label.slice(0, 4) || '';
    const endYear = /^\d{4}/.test(d?.dateRange?.end || '') ? d.dateRange.end.slice(0, 4) : year;
    const creditNames = (d?.credits || []).map(credit => credit.name);
    const names = entries.flatMap(entry => [entry.data.name, entry.data.title, entry.data.romanizedName, entry.data.romanizedTitle, entry.data.summary, ...(entry.data.aliases || [])]);
    if (!d) names.push(...Object.values(events.get(node.id)?.text || {}).flatMap(text => [text.title, text.summary]));
    return [{ ...node, date, year, endYear, styles,
      search: [node.id, node.search, ...names, ...(d?.genres || []), ...(d?.tags || []), ...creditNames].filter(Boolean).join(' ') }];
  });
  const known = new Set(nodes.map(node => node.id));
  const publicArticles = discoveryArticleNodes(articles, locale).filter(node => !known.has(node.id));
  const articleEdges = publicArticles.flatMap(node => node.relatedEntities.filter(id => known.has(id)).map(target => ({ source: node.id, target, type: 'discusses', evidence: node.path })));
  nodes.push(...publicArticles);
  const index = createGraphIndex({ nodes, edges: [...base.edges, ...articleEdges] });
  const artists = index.nodes.filter(node => ['person', 'virtual-avatar', 'unit', 'software-voice'].includes(node.kind))
    .sort((a, b) => a.id.localeCompare(b.id)).map(node => ({ id: node.id, title: node.title, kind: node.kind }));
  const styles = [...styleNames].map(([id, title]) => ({ id, title, count: index.nodes.filter(node => node.styles.includes(id)).length })).sort((a, b) => a.id.localeCompare(b.id));
  const signature = discoveryHash(JSON.stringify([index.nodes.map(node => [node.id, node.kind, node.year, node.endYear, node.styles]).sort((a, b) => a[0].localeCompare(b[0])),
    index.edges.map(discoveryEdgeKey).sort()])).toString(16);
  return { version: discoveryVersion, signature, nodes: index.nodes, edges: index.edges,
    facets: { artists, styles, kinds: index.kinds, years: [...new Set(index.nodes.map(node => node.year).filter(Boolean))].sort().reverse() },
    articleCoverage: articles.status,
    summary: { entities: index.nodes.filter(node => !['events', 'editorial-article'].includes(node.kind)).length, events: index.nodes.filter(node => node.kind === 'events').length,
      articles: publicArticles.length, styled: index.nodes.filter(node => node.styles.length).length, connections: index.edges.length } };
}
