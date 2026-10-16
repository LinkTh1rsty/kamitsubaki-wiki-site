import {buildEntityIndex} from './entityIndex.mjs';
import {entityRoute} from './entityModel.mjs';
import { readContentEntryBody } from './contentSource.mjs';
import {
  buildIndexAliases,
  buildIndexDescription,
  cleanIndexText,
  extractIndexHeadings,
  flattenIndexMetadata,
} from './searchIndex.mjs';

export const aiIndexCollections = Object.freeze(['entities','logs']);

const textLimits = Object.freeze({
  artist: 8000,
  album: 4200,
  song: 2200,
  project: 7000,
  log: 5200,
});

const bodyReadConcurrency = 32;

export function buildAiIndexShardDescriptors(locales) {
  return locales.flatMap((locale) => aiIndexCollections.map((collection) => ({
    locale,
    collection,
    kind: collection.replace(/s$/u, ''),
    path: `/ai-index/${locale}/${collection}.json`,
  })));
}

function articleRoute(collection, id) {
  const parts = id.normalize('NFC').split('/');
  const locale = parts.pop() || 'zh';
  return `/${locale}/${collection}/${parts.join('/')}/`;
}

function titleFor(entry) {
  return cleanIndexText(
    entry.data.name || entry.data.title || entry.data.heading || entry.data.translationKey || '',
    180,
  );
}

export async function buildAiIndexEntries(group, { collection, locale, origin }) {
  if(collection==='entities')return buildEntityIndex(locale,origin);
  const kind = collection.replace(/s$/u, '');
  const localizedEntries = group.filter((entry) => entry.data.locale === locale);
  const entries = new Array(localizedEntries.length);
  let nextIndex = 0;

  const buildNextEntry = async () => {
    while (nextIndex < localizedEntries.length) {
      const index = nextIndex;
      nextIndex += 1;
      const entry = localizedEntries[index];

      const path = entry.data.schemaVersion===2?`/${locale}${entityRoute(entry.data)}`:articleRoute(collection, entry.id);
      const { body } = await readContentEntryBody(entry);
      const data = entry.data;
      const title = titleFor(entry);
      const aliases = buildIndexAliases(data);
      const description = buildIndexDescription(data, body);
      const headings = extractIndexHeadings(body);
      const metadata = flattenIndexMetadata(data).join(' ');
      const text = cleanIndexText(`${metadata} ${body}`, textLimits[kind] || 6000);

      entries[index] = {
        id: `${kind}:${entry.id}`,
        translationKey: data.translationKey,
        title,
        aliases,
        url: `${origin}${path}`,
        path,
        locale,
        kind,
        description,
        headings,
        image: typeof data.image === 'string' ? data.image : undefined,
        text,
      };
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(bodyReadConcurrency, localizedEntries.length) },
      () => buildNextEntry(),
    ),
  );

  return entries;
}
