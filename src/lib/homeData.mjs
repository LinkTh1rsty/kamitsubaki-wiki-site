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

export function getLocalizedSite(siteEntries, locale, fallbackLocale = 'zh') {
  return (
    siteEntries.find((entry) => entry.data.locale === locale)?.data ??
    siteEntries.find((entry) => entry.data.locale === fallbackLocale)?.data
  );
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

function buildCategorySubtitle(categorySlug) {
  return categorySlug
    .split('-')
    .filter(Boolean)
    .join(' ')
    .toUpperCase();
}

export function buildArtistDisplayData(entry) {
  const { categorySlug } = parseArtistPath(entry.id);

  return {
    ...entry.data,
    categoryId: `cat-${categorySlug}`,
    categoryTitle: entry.data.categoryTitle || humanizeSlug(categorySlug),
    categorySubtitle: entry.data.categorySubtitle || buildCategorySubtitle(categorySlug),
  };
}

function parseArtistPath(entryId) {
  const parts = entryId.split('/');
  const locale = parts.pop();
  const slug = parts.pop();
  const categorySlug = parts[0] ?? 'uncategorized';

  return {
    categorySlug,
    itemPath: [...parts, slug].filter(Boolean).join('/'),
    locale,
  };
}

function compareOptionalOrder(a, b) {
  const left = a ?? Number.POSITIVE_INFINITY;
  const right = b ?? Number.POSITIVE_INFINITY;

  return left - right;
}

export function buildArtistCategories(artistEntries) {
  const categories = new Map();

  for (const entry of artistEntries) {
    const artist = entry.data;
    const { categorySlug, itemPath } = parseArtistPath(entry.id);
    const categoryId = `cat-${categorySlug}`;

    if (!categories.has(categoryId)) {
      categories.set(categoryId, {
        id: categoryId,
        slug: categorySlug,
        title: artist.categoryTitle || humanizeSlug(categorySlug),
        subtitle: artist.categorySubtitle || buildCategorySubtitle(categorySlug),
        order: artist.categoryOrder,
        items: [],
      });
    }

    const category = categories.get(categoryId);

    if (artist.categoryTitle) {
      category.title = artist.categoryTitle;
    }

    if (artist.categorySubtitle) {
      category.subtitle = artist.categorySubtitle;
    }

    if (artist.categoryOrder !== undefined) {
      category.order = Math.min(category.order ?? artist.categoryOrder, artist.categoryOrder);
    }

    const item = {
      id: itemPath,
      code: artist.code,
      name: artist.name,
      romanizedName: artist.romanizedName,
      statusLabel: artist.statusLabel,
      status: artist.status,
      image: artist.image,
      order: artist.itemOrder,
    };

    if (artist.meta !== undefined) {
      item.meta = artist.meta;
    }

    if (artist.inactive !== undefined) {
      item.inactive = artist.inactive;
    }

    category.items.push(item);
  }

  return [...categories.values()]
    .sort((a, b) => compareOptionalOrder(a.order, b.order) || a.slug.localeCompare(b.slug))
    .map((category) => ({
      id: category.id,
      title: category.title,
      subtitle: category.subtitle,
      items: category.items
        .sort((a, b) => compareOptionalOrder(a.order, b.order) || a.name.localeCompare(b.name))
        .map(({ order, ...artist }, index) => ({
          ...artist,
          code: artist.code || String(index + 1).padStart(2, '0'),
        })),
    }));
}

export function buildDatabaseJumpLinks(artistCategories) {
  return artistCategories.map((category) => ({
    label: `>> ${category.title}`,
    href: `#${category.id}`,
  }));
}
