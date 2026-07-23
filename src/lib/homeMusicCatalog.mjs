function getContentPath(entryId) {
  return entryId.split('/').slice(0, -1).join('/');
}

function getArtistSlug(entry) {
  return getContentPath(entry.id).split('/').filter(Boolean).at(-1);
}

function buildArtistCoverMap(artistEntries) {
  const covers = new Map();

  for (const entry of artistEntries) {
    const image = entry.data.image;
    if (!image) continue;

    covers.set(entry.data.translationKey, image);
    const slug = getArtistSlug(entry);
    if (slug) covers.set(slug, image);
  }

  return covers;
}

export function sampleRandom(items, count, random = Math.random) {
  const sampleSize = Math.min(Math.max(0, count), items.length);
  const pool = [...items];

  for (let index = 0; index < sampleSize; index += 1) {
    const remaining = pool.length - index;
    const offset = Math.min(remaining - 1, Math.floor(random() * remaining));
    const selectedIndex = index + Math.max(0, offset);
    [pool[index], pool[selectedIndex]] = [pool[selectedIndex], pool[index]];
  }

  return pool.slice(0, sampleSize);
}

export function buildHomeMusicCatalog(songEntries, albumEntries, artistEntries, locale) {
  const artistCovers = buildArtistCoverMap(artistEntries);

  return {
    songs: songEntries.map((entry) => {
      const artistId = entry.data.artistId || getContentPath(entry.id).split('/')[0];
      return {
        href: `/${locale}/songs/${getContentPath(entry.id)}`,
        title: entry.data.title,
        subtitle: `${entry.data.artist}${entry.data.album ? ` · ${entry.data.album}` : ''}`,
        image: entry.data.image || artistCovers.get(artistId) || null,
        primaryInfo: entry.data.duration || null,
        secondaryInfo: entry.data.releaseDate || null,
      };
    }),
    albums: albumEntries.map((entry) => {
      const artistId = getContentPath(entry.id).split('/')[0];
      return {
        href: `/${locale}/albums/${getContentPath(entry.id)}`,
        title: entry.data.title,
        subtitle: `${entry.data.artist}${entry.data.type ? ` · ${entry.data.type}` : ''}`,
        image: entry.data.image || artistCovers.get(artistId) || null,
        primaryInfo: entry.data.releaseDate || null,
        secondaryInfo: null,
      };
    }),
  };
}
