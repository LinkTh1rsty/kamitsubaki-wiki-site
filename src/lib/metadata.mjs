import { getLocalizedSiteName } from './i18n.mjs';
import { homePreviewImage } from './searchMetadata.mjs';

export const defaultSiteDescription = 'KAMITSUBAKI STUDIO 非官方粉丝百科。';
export const siteName = getLocalizedSiteName('en');

const markdownPatterns = [
  [/\{\{(?:ruby|abbr|time)::([^}:]+)(?:::[^}]*)?\}\}/g, '$1'],
  [/\{\{(?:spoiler|mark|kbd|small|sup|sub)::([^}]*)\}\}/g, '$1'],
  [/\{\{(?:details|media-switcher)::[^}]*\}\}|\{\{\/(?:details|media-switcher)\}\}|\{\{lyrics-controls::[^}]*\}\}/g, ''],
  [/\{\{[^{}]*\}\}/g, ''],
  [/^#+\s+/g, ''],
  [/\[([^\]]+)\]\([^)]+\)/g, '$1'],
  [/!\[[^\]]*]\([^)]+\)/g, ''],
  [/`([^`]+)`/g, '$1'],
  [/\*\*([^*]+)\*\*/g, '$1'],
  [/\*([^*]+)\*/g, '$1'],
  [/__([^_]+)__/g, '$1'],
  [/_([^_]+)_/g, '$1'],
  [/<[^>]+>/g, ''],
];

function compactText(text) {
  let value = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();

  while (/[\u3040-\u30ff\u3400-\u9fff]\s+[\u3040-\u30ff\u3400-\u9fff]/.test(value)) {
    value = value.replace(/([\u3040-\u30ff\u3400-\u9fff])\s+([\u3040-\u30ff\u3400-\u9fff])/g, '$1$2');
  }

  return value;
}

function stripMarkdown(text) {
  return markdownPatterns.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
}

export function truncateDescription(text, maxLength = 160) {
  const cleanText = compactText(text);

  if (cleanText.length <= maxLength) {
    return cleanText;
  }

  return `${cleanText.slice(0, maxLength - 1).trim()}…`;
}

export function scanMarkdownDescription(markdown, fallback = defaultSiteDescription) {
  const paragraphs = String(markdown || '')
    .replace(/^---[\s\S]*?---/, '')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .filter((paragraph) => !paragraph.startsWith('#'))
    .filter((paragraph) => !paragraph.startsWith('|'))
    .filter((paragraph) => !paragraph.startsWith('```'));

  const firstParagraph = paragraphs[0];

  if (!firstParagraph) {
    return fallback;
  }

  return truncateDescription(stripMarkdown(firstParagraph));
}

export function buildArticleDescription(data, body) {
  const fallback = compactText(
    [data.title || data.name, data.subtitle || data.romanizedName, data.description, data.categoryTitle, data.categorySubtitle, data.status]
      .filter(Boolean)
      .join(' / '),
  );

  return scanMarkdownDescription(body, fallback || defaultSiteDescription);
}

export function buildArticleMetadata({ data, body = '', locale, id, collection = 'artists' }) {
  const seo = data.seo || {};
  const articleTitle = data.title || data.name;

  return {
    title: seo.title || `${articleTitle} - ${getLocalizedSiteName(locale)}`,
    description: seo.description || buildArticleDescription(data, body),
    image: seo.image || data.image,
    canonicalPath: `/${locale}/${collection}/${id}`,
    type: 'article',
    keywords: seo.keywords,
    noindex: seo.noindex ?? data.contentStatus === 'stub',
  };
}

export function buildHomeMetadata(siteContent, locale) {
  const descriptionSource = [
    ...(siteContent.sections?.about?.body || []),
    siteContent.footer?.tagline,
    defaultSiteDescription,
  ].find(Boolean);

  return {
    title: getLocalizedSiteName(locale),
    description: truncateDescription(descriptionSource || defaultSiteDescription),
    canonicalPath: `/${locale}/`,
    image: homePreviewImage,
    imageAlt: 'V.W.P — KAF, RIM, HARUSARUHI, ISEKAIJOUCHO, KOKO',
    imageWidth: 1260,
    imageHeight: 1260,
    type: 'website',
  };
}

export function buildProjectMetadata({ data, body = '', locale, id }) {
  const seo = data.seo || {};

  return {
    title: seo.title || `${data.title} - ${getLocalizedSiteName(locale)}`,
    description: seo.description || scanMarkdownDescription(body, data.description || defaultSiteDescription),
    image: seo.image,
    canonicalPath: `/${locale}/projects/${id}`,
    type: 'article',
    keywords: seo.keywords,
    noindex: seo.noindex,
  };
}

export function buildLogMetadata({ data, body = '', locale, id }) {
  const seo = data.seo || {};

  return {
    title: seo.title || `${data.title} - ${getLocalizedSiteName(locale)}`,
    description: seo.description || scanMarkdownDescription(body, data.summary || defaultSiteDescription),
    image: seo.image,
    canonicalPath: `/${locale}/logs/${id}`,
    type: 'article',
    keywords: seo.keywords,
    noindex: seo.noindex,
  };
}
