import { buildEntityLabsCatalog, normalizeDate } from './labsCatalog.mjs';
import { createGraphIndex } from './graphModel.mjs';
import { discoveryHash, discoveryEdgeKey } from './discoveryEngine.mjs';
import { resolveLocaleCopy } from './i18n.mjs';
import { resolveMediaEmbed } from './mediaEmbed.mjs';
import { storyRoutes } from '../data/storyRoutes.mjs';
import { labsWorlds } from '../data/labsWorlds.mjs';
import { concertEventTypes } from './entityContract.mjs';

export const storyVersion = 1;
export function safeStoryURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
}
/** Read authored media directives and links; never send article bodies to the client. */
export function storyMedia(data = {}, body = '', options = {}) {
  const found = (data.media || []).map(m => ({ provider: m.platform, target: m.url || m.id, label: m.type || m.platform }));
  let fence = null;
  const text = String(body).replace(/<!--[\s\S]*?(?:-->|$)/g, '').split(/\r?\n/).map(line => {
    const marker = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (fence) { if (marker && marker[1][0] === fence.character && marker[1].length >= fence.length && !marker[2].trim()) fence = null; return ''; }
    if (marker) { fence = { character: marker[1][0], length: marker[1].length }; return ''; }
    return /^(?: {4}|\t)/.test(line) ? '' : line;
  }).join('\n');
  for (const m of text.matchAll(/^\s*@\[([a-z-]+)\]\(([^\n)]+)\)\s*$/gmi)) {
    const target = m[2].match(/^(\S+?)(?:\s+"([^"]*)")?$/); if (target) found.push({ provider: m[1], target: target[1], label: target[2] || m[1] });
  }
  if (options.includeLinks !== false) for (const m of text.matchAll(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g)) {
    const href = safeStoryURL(m[2]); if (!href) continue;
    const host = new URL(href).hostname;
    const provider = ['youtube.com', 'www.youtube.com', 'youtu.be', 'music.youtube.com'].includes(host) ? 'youtube' : ['www.bilibili.com', 'bilibili.com'].includes(host) ? 'bilibili' : '';
    if (provider) found.push({ provider, target: m[2], label: m[1] });
  }
  const seen = new Set();
  return found.flatMap(item => {
    const media = resolveMediaEmbed(item.provider, item.target); if (!media) return [];
    if (media.provider === 'youtube' && !/\/embed\/[A-Za-z0-9_-]{11}$/.test(media.src)) return [];
    if (seen.has(media.src)) return []; seen.add(media.src);
    const href = media.provider === 'youtube' ? 'https://www.youtube.com/watch?v=' + media.src.split('/').at(-1) : safeStoryURL(item.target) || (options.allowIdentifiers?media.src:'');
    if (!href) return [];
    return [{ provider: media.provider, label: item.label || media.label, src: media.src, href, kind: media.kind, allow: media.allow, sandbox: media.sandbox || '', height: media.height || 0 }];
  }).slice(0, Number.isInteger(options.maxItems)?Math.max(1,Math.min(6,options.maxItems)):2);
}

/** @typedef {{id:string,title:string,path:string,kind:string,description:string,subtitle:string,date:any,links:any[],media:any[]}} StoryNode */
/** @typedef {{node:StoryNode,anchor:string,steps:Array<{from:string,to:string,inverse:boolean,edge:any,fromNode:StoryNode,toNode:StoryNode}>}} StoryMaterial */
/** @typedef {{id:string,title:string,intro:string,prompt:string,minutes:number,materials:StoryMaterial[],resources:Array<{label:string,href:string}>,missing:boolean}} StoryChapter */
/** @typedef {{id:string,anchor:string,title:string,intro:string,outcome:string,minutes:number,fingerprint:string,chapters:StoryChapter[]}} StoryRoute */

function related(index, query) {
  const anchor = index.byId.get(query.anchor); if (!anchor) return [];
  const result = [], visit = (from, steps) => {
    for (const edge of index.adjacency.get(from) || []) {
      if (query.types && !query.types.includes(edge.type)) continue;
      if (query.members && (edge.type !== 'member-of' || edge.target !== query.anchor)) continue;
      const to = edge.source === from ? edge.target : edge.source, node = index.byId.get(to);
      if (to === query.anchor || steps.some(s => s.from === to)) continue;
      const next = [...steps, { from, to, inverse: edge.source !== from, edge, fromNode: index.byId.get(from), toNode: node }];
      if (query.concerts && !concertEventTypes.includes(node.eventType)) continue;
      if (!query.kinds || query.kinds.includes(node.kind)) result.push({ node, anchor: query.anchor, steps: next });
    }
  };
  visit(query.anchor, []); return result;
}
function collaborators(index, anchor) {
  const result = [];
  for (const track of related(index, { anchor, kinds: ['work-track'], types: ['performed-by'] })) {
    for (const edge of index.adjacency.get(track.node.id) || []) {
      if (edge.type !== 'credited-to' || edge.source !== track.node.id) continue;
      const node = index.byId.get(edge.target);
      if (node.id === anchor || !['person', 'virtual-avatar'].includes(node.kind)) continue;
      result.push({ node, anchor, steps: [...track.steps, { from: track.node.id, to: node.id, inverse: false, edge, fromNode: track.node, toNode: node }] });
    }
  }
  return result;
}

/** @returns {{version:number,locale:string,routes:StoryRoute[]}} */
export function buildStoryCatalog(registry, feature, locale = 'zh', definitions = storyRoutes) {
  const base = buildEntityLabsCatalog(registry, feature, locale);
  const nodes = base.nodes.flatMap(node => {
    const translations = registry.entities.get(node.id), canonical = translations?.get('zh') || translations?.values().next().value;
    if (canonical?.data.contentStatus === 'stub') return [];
    const d = canonical?.data;
    return [{ id: node.id, title: node.title, path: node.path, kind: node.kind, subtitle: node.subtitle, description: node.description,
      eventType: d?.eventType || '', date: normalizeDate(d?.releaseDate || d?.dateRange?.start || d?.lifecycle?.startedAt || d?.publishDate || node.date?.label),
      links: node.links.filter(link => safeStoryURL(link.href)).map(link => ({ label: link.label, href: safeStoryURL(link.href) })),
      media: canonical ? storyMedia(d, canonical.body) : [] }];
  });
  const index = createGraphIndex({ nodes, edges: base.edges });
  const routes = definitions.map(definition => {
    const used = new Set();
    const chapters = definition.chapters.map(chapter => {
      const q = chapter.select;
      let candidates = q.ids ? q.ids.filter(id => index.byId.has(id)).map(id => ({ node: index.byId.get(id), anchor: '', steps: [] }))
        : q.collaborators ? collaborators(index, q.anchor) : related(index, q.members ? { ...q, types: ['member-of'] } : q);
      if (!q.ids) candidates.sort((a, b) => {
        const priority = id => q.preferred?.includes(id) ? q.preferred.indexOf(id) : 999;
        return priority(a.node.id) - priority(b.node.id) || (q.mediaFirst ? Number(b.node.media.length > 0) - Number(a.node.media.length > 0) : 0)
          || (q.descending ? -1 : 1) * (a.node.date?.sort || '9999').localeCompare(b.node.date?.sort || '9999')
          || a.node.id.localeCompare(b.node.id) || discoveryEdgeKey(a.steps.at(-1)?.edge || {}).localeCompare(discoveryEdgeKey(b.steps.at(-1)?.edge || {}));
      });
      const materials = []; for (const candidate of candidates) { if (used.has(candidate.node.id)) continue; used.add(candidate.node.id); materials.push(candidate); if (materials.length >= (q.limit || 8)) break; }
      const resources = q.world ? labsWorlds.map(world => ({ label: world.title + ' · ' + world.kind, href: world.source })) : [];
      return { id: chapter.id, minutes: chapter.minutes, title: resolveLocaleCopy(chapter.title, locale), intro: resolveLocaleCopy(chapter.intro, locale), prompt: resolveLocaleCopy(chapter.prompt, locale), materials, resources, missing: !materials.length && !resources.length };
    });
    const fingerprint = discoveryHash(JSON.stringify([storyVersion, definition.id, chapters.map(c => [c.id, c.materials.map(m => [m.node.id, m.node.media.map(v => v.src), m.steps.map(s => discoveryEdgeKey(s.edge))]), c.resources.map(r => r.href)])])).toString(16);
    return { id: definition.id, anchor: definition.anchor, title: resolveLocaleCopy(definition.title, locale), intro: resolveLocaleCopy(definition.intro, locale), outcome: resolveLocaleCopy(definition.outcome, locale), minutes: chapters.reduce((sum, c) => sum + c.minutes, 0), fingerprint, chapters };
  });
  return { version: storyVersion, locale, routes };
}
