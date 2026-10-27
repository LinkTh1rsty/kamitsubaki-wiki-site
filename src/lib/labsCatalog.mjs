import { foldCjkSearchText } from './cjkSearch.mjs';
import { convertChineseContentValue } from './traditionalChinese.mjs';

export function normalizeDate(value) {
  const date = String(value || '')
    .trim()
    .replace(/[./]/g, '-');
  if (!/^\d{4}(?:-\d{2}(?:-\d{2})?)?$/.test(date)) return null;
  const [year, month = '01', day = '01'] = date.split('-');
  const full = `${year}-${month}-${day}`;
  const time = Date.parse(`${full}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== full
  )
    return null;
  return {
    label: date,
    sort: full,
    precision: date.length === 4 ? 'year' : date.length === 7 ? 'month' : 'day',
  };
}

export function entryPath(collection, entry, locale) {
  return new URL(
    `/${locale}/${collection}/${entry.id.normalize('NFC').split('/').slice(0, -1).join('/')}/`,
    'https://wiki.invalid',
  ).pathname;
}

export function buildLabsCatalog(groups, locale) {
  const nodes = [];
  const edges = [];
  for (const [kind, entries] of Object.entries(groups)) {
    for (const entry of entries) {
      const d = entry.data;
      const path = entryPath(kind, entry, locale);
      const date = normalizeDate(
        d.eventDate || d.releaseDate || d.debutDate || d.date,
      );
      nodes.push({
        id: `${kind}:${d.translationKey}`,
        path,
        collection: kind,
        kind: d.eventDate ? 'events' : kind,
        title: d.name || d.title,
        subtitle: d.romanizedName || d.artist || d.kind || '',
        description: d.profileTagline || d.description || d.summary || '',
        date,
        image: d.image?.startsWith('/') ? d.image : '',
        key: d.translationKey,
        search: foldCjkSearchText(
          [
            d.name,
            d.title,
            d.romanizedName,
            d.artist,
            d.summary,
            ...(d.affiliations || []),
            ...(d.seo?.keywords || []),
          ].join(' '),
        ),
        artists: d.artistIds || [d.artistId || entry.id.split('/')[0]],
        links: (d.eventSource
          ? [{ label: 'Source', href: d.eventSource }]
          : d.officialLinks || []
        ).filter((link) => /^https?:\/\//.test(link.href)),
      });
    }
  }
  const paths = new Map(
    nodes.map((node) => [node.path.replace(/\/$/, ''), node]),
  );
  const artists = new Map(
    nodes
      .filter((node) => node.kind === 'artists')
      .flatMap((node) => [
        [node.key, node],
        [node.path.split('/').at(-2), node],
      ]),
  );
  const names = new Map(
    nodes
      .filter((n) => ['artists', 'projects'].includes(n.kind))
      .flatMap((n) => [
        [foldCjkSearchText(n.title), n],
        [foldCjkSearchText(n.subtitle), n],
      ]),
  );
  const seen = new Set();
  const add = (source, target, type) => {
    if (!target || source.id === target.id) return;
    const key = [source.id, target.id].sort().join('|') + type;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({
      source: source.id,
      target: target.id,
      type,
      evidence: source.path,
    });
  };
  for (const node of nodes) {
    if (['songs', 'albums'].includes(node.kind))
      node.artists.forEach((id) => add(node, artists.get(id), 'credit'));
    const entry = groups[node.collection].find(
      (item) => item.data.translationKey === node.key,
    );
    for (const affiliation of entry?.data.affiliations || [])
      add(node, names.get(foldCjkSearchText(affiliation)), 'affiliation');
    for (const link of entry?.data.featuredEntries || []) {
      const path = new URL(
        link.href.replace(/^\/(zh|zh-tw|zh-hk|ja|en)\//, `/${locale}/`),
        'https://wiki.invalid',
      ).pathname.replace(/\/$/, '');
      add(node, paths.get(path), 'related');
    }
  }
  return { version: 1, nodes, edges };
}

export function selectTimeline(
  nodes,
  { query = '', kind = '', year = '', order = 'desc' } = {},
) {
  const terms = foldCjkSearchText(query).split(' ').filter(Boolean);
  return nodes
    .filter(
      (n) =>
        n.date &&
        (!kind || n.kind === kind) &&
        (!year || n.date.sort.startsWith(year)) &&
        terms.every((term) => n.search.includes(term)),
    )
    .sort(
      (a, b) =>
        (order === 'asc' ? 1 : -1) * a.date.sort.localeCompare(b.date.sort) ||
        a.title.localeCompare(b.title),
    );
}

export function neighbors(catalog, id) {
  const linked = new Map();
  for (const edge of catalog.edges) {
    const other =
      edge.source === id
        ? edge.target
        : edge.target === id
          ? edge.source
          : null;
    if (!other) continue;
    if (!linked.has(other)) linked.set(other, []);
    linked.get(other).push(edge);
  }
  return catalog.nodes
    .filter((n) => linked.has(n.id))
    .map((node) => ({ ...node, edges: linked.get(node.id) }));
}

/** Labs reads the same v2 registry and relationship ownership as the encyclopedia. */
export function buildEntityLabsCatalog(registry,feature,locale){
 const nodes=registry.list(locale).map(e=>{const d=e.data;return {id:d.id,key:d.id,path:e.url,collection:d.entityType,kind:d.entityType,title:d.name||d.title,subtitle:d.romanizedName||d.romanizedTitle||'',aliases:d.aliases||[],description:d.summary||'',date:normalizeDate(d.releaseDate||d.lifecycle?.startedAt||d.dateRange?.start||d.publishDate),image:d.presentation?.image||'',search:foldCjkSearchText([d.name,d.title,d.romanizedName,d.romanizedTitle,d.summary,...(d.aliases||[])].filter(Boolean).join(' ')),artists:(d.performers||[]).map(p=>p.entity),links:(d.officialLinks||[]).map(l=>({label:l.label||l.platform||'Source',href:l.url}))};});
 const edges=registry.list(locale).flatMap(e=>registry.getOutgoingRelations(e.data.id).map(edge=>({...edge,evidence:e.url})));
 for(const event of feature.events){let text=event.text[locale]||event.text.zh||event.text.ja||event.text.en||{};if(locale.startsWith('zh-'))text=convertChineseContentValue(event.text.zh||text,locale);nodes.push({id:event.id,key:event.id,path:`/${locale}/chronicle/#${event.id}`,collection:'chronicle',kind:'events',title:text.title||event.id,subtitle:'',description:text.summary||'',date:normalizeDate(event.date.start),image:'',search:foldCjkSearchText(`${text.title||''} ${text.summary||''}`),artists:[],links:(event.sources||[]).filter(s=>s.url).map(s=>({label:s.title,href:s.url}))});for(const ref of event.related||[])edges.push({source:event.id,target:ref.entity,type:'chronicle-footprint',evidence:`/${locale}/chronicle/#${event.id}`});}
 return {version:2,nodes,edges};
}
