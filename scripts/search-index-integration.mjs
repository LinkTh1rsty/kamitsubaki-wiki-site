import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { absoluteUrl, productionOrigin } from '../src/lib/searchMetadata.mjs';

const decode = value => value.replace(/&(?:amp|quot|apos|lt|gt);|&#(\d+);|&#x([\da-f]+);/gi, (match, decimal, hex) =>
  decimal ? String.fromCodePoint(Number(decimal)) : hex ? String.fromCodePoint(parseInt(hex, 16)) :
    ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>' }[match] || match));
const xml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
const normalizedPath = value => decodeURI(new URL(value).pathname).replace(/\/$/, '') || '/';

// Read tags from the rendered head, never from article examples or inline scripts.
export function readSearchPage(html, pageUrl, origin = productionOrigin) {
  const head = (html.split(/<\/head\s*>/i)[0] || '').replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '');
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(([tag]) => Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, key, a, b]) => [key.toLowerCase(), decode(a ?? b)]),
  ));
  if (tags.some(tag => /^(robots|googlebot)$/i.test(tag.name || '') && /\b(noindex|none)\b/i.test(tag.content || ''))) return null;
  if (tags.some(tag => /^refresh$/i.test(tag['http-equiv'] || ''))) return null;
  const canonical = tags.find(tag => tag.rel === 'canonical')?.href;
  if (!canonical) return null;
  const url = absoluteUrl(canonical, origin);
  if (new URL(url).origin !== new URL(origin).origin || normalizedPath(url) !== normalizedPath(pageUrl)) return null;
  if (new URL(url).search || new URL(url).hash) return null;
  const image = tags.find(tag => tag.property === 'og:image')?.content;
  return {
    url,
    image: image ? absoluteUrl(image, origin) : undefined,
    alternates: tags.filter(tag => tag.rel === 'alternate' && tag.hreflang && tag.href)
      .map(tag => ({ lang: tag.hreflang, href: absoluteUrl(tag.href, origin) })),
  };
}

export function renderSitemap(pages, indexableUrls = new Set(pages.map(page => page.url))) {
  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
    pages.map(page => `<url><loc>${xml(page.url)}</loc>` +
      page.alternates.filter(alternate => indexableUrls.has(alternate.href))
        .map(alternate => `<xhtml:link rel="alternate" hreflang="${xml(alternate.lang)}" href="${xml(alternate.href)}"/>`).join('') +
      (page.image ? `<image:image><image:loc>${xml(page.image)}</image:loc></image:image>` : '') + '</url>').join('\n') + '\n</urlset>\n';
}

export async function generateSearchIndex(directory, origin = productionOrigin) {
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.name.endsWith('.html')) files.push(path);
    }
  }
  await walk(directory);
  const byUrl = new Map();
  // Limit simultaneous reads: the site contains thousands of rendered articles.
  for (let offset = 0; offset < files.length; offset += 16) {
    const batch = await Promise.all(files.slice(offset, offset + 16).map(async path => {
      const route = '/' + relative(directory, path).replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '');
      return readSearchPage(await readFile(path, 'utf8'), absoluteUrl(route, origin), origin);
    }));
    for (const page of batch) if (page) byUrl.set(page.url, page);
  }
  const pages = [...byUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  const indexableUrls = new Set(byUrl.keys());
  const sitemapUrls = [];
  for (let offset = 0; offset < pages.length; offset += 5000) {
    const filename = `sitemap-${offset / 5000}.xml`;
    await writeFile(join(directory, filename), renderSitemap(pages.slice(offset, offset + 5000), indexableUrls));
    sitemapUrls.push(absoluteUrl('/' + filename, origin));
  }
  await writeFile(join(directory, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    sitemapUrls.map(url => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join('\n') + '\n</sitemapindex>\n');
  return pages.length;
}

export default function searchIndex() {
  let origin = productionOrigin;
  return {
    name: 'wiki-search-index',
    hooks: {
      'astro:config:done': ({ config }) => { origin = new URL(config.site || productionOrigin).origin; },
      'astro:build:done': async ({ dir, logger }) => {
        const count = await generateSearchIndex(fileURLToPath(dir), origin);
        logger.info(`Sitemap generated for ${count} canonical, indexable pages.`);
      },
    },
  };
}
