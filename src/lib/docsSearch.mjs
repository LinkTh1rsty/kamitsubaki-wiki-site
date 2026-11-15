export const normalizeDocsQuery = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/\s+/gu, ' ').trim();

export function searchDocs(entries, query) {
 const terms = normalizeDocsQuery(query).split(' ').filter(Boolean);
 if (!terms.length) return [];
 return entries.map(entry => {
  const title=normalizeDocsQuery(entry.title),summary=normalizeDocsQuery(entry.summary),body=normalizeDocsQuery(entry.body);
  if(!terms.every(term=>(title+' '+summary+' '+body).includes(term)))return null;
  const score=terms.reduce((total,term)=>total+(title.includes(term)?8:summary.includes(term)?3:1),0);
  const at=terms.map(term=>body.indexOf(term)).find(index=>index>=0)??-1;
  const original=String(entry.body).replace(/\s+/gu,' ');
  const snippet=at>=0?(at>40?'…':'')+original.slice(Math.max(0,at-40),at+140)+(original.length>at+140?'…':''):entry.summary;
  return {...entry,score,snippet};
 }).filter(Boolean).sort((a,b)=>b.score-a.score||a.href.localeCompare(b.href));
}
