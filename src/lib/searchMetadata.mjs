import { getLanguageTag, getLocalizedSiteName } from './i18n.mjs';

export const productionOrigin = 'https://kamitsubaki.wiki';
export const homePreviewImage = '/images/artists/vwp.jpg';

export function absoluteUrl(value, origin = productionOrigin) {
  return new URL(value, `${origin.replace(/\/$/, '')}/`).href;
}

/** @param {Array<{locale: string, href: string}>} alternates */
export function buildSearchAlternates(alternates, origin = productionOrigin) {
  return alternates.map(({ locale, href }) => ({
    locale,
    hreflang: getLanguageTag(locale),
    href: absoluteUrl(href, origin),
  }));
}

export function buildPageStructuredData({ title, description, url, image, imageAlt, locale, origin = productionOrigin, isHome = false }) {
  const websiteId = `${origin}/#website`;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      ...(isHome ? [{
        '@type': 'WebSite',
        '@id': websiteId,
        url: `${origin}/`,
        name: getLocalizedSiteName(locale),
        alternateName: ['KAMITSUBAKI Fan Wiki', '神椿观测站', '神椿觀測站', '神椿観測所'],
      }] : []),
      {
        '@type': 'WebPage',
        '@id': `${url}#webpage`,
        url,
        name: title,
        description,
        inLanguage: getLanguageTag(locale),
        isPartOf: { '@id': websiteId },
        ...(image ? { primaryImageOfPage: {
          '@type': 'ImageObject',
          url: absoluteUrl(image, origin),
          contentUrl: absoluteUrl(image, origin),
          caption: imageAlt || title,
        } } : {}),
      },
    ],
  };
}

// Content editors may supply titles containing HTML; never allow closing the script element.
export function serializeStructuredData(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
