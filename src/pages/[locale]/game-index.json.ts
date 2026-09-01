import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import { supportedLocales } from '../../lib/i18n.mjs';

export const prerender = true;

export function getStaticPaths() {
  return supportedLocales.map((locale) => ({ params: { locale } }));
}

type GameKind = 'artist' | 'song' | 'album' | 'project';

type GameItemDraft = {
  kind: GameKind;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  accentColor: string;
  relatedKey: string;
  facts: string[];
  relationKeys: string[];
  featuredHrefs?: string[];
  albumTitle?: string;
  trackSongIds?: string[];
};

function entryId(id: string) {
  return id.split('/').slice(0, -1).join('/');
}

function itemKey(item: Pick<GameItemDraft, 'kind' | 'id'>) {
  return `${item.kind}:${item.id}`;
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function compactFacts(items: Array<string | undefined>) {
  return items.filter((item): item is string => Boolean(item)).slice(0, 4);
}

export const GET: APIRoute = async ({ params }) => {
  const locale = (supportedLocales.includes(params.locale ?? '') ? params.locale! : 'zh') as 'zh' | 'ja' | 'en';
  const labels = {
    zh: { artist: '艺人', song: '歌曲', album: '专辑', project: '企划', type: '档案类型', code: '观测代号', debut: '出道日期', performer: '演唱', release: '发行日期', collection: '收录', category: '分类', tracks: '曲目数' },
    ja: { artist: 'アーティスト', song: '楽曲', album: 'アルバム', project: 'プロジェクト', type: '記録種別', code: '観測コード', debut: 'デビュー', performer: 'アーティスト', release: 'リリース', collection: '収録', category: '分類', tracks: '曲数' },
    en: { artist: 'Artist', song: 'Song', album: 'Album', project: 'Project', type: 'Archive type', code: 'Observer code', debut: 'Debut', performer: 'Artist', release: 'Released', collection: 'Collection', category: 'Category', tracks: 'Tracks' },
  }[locale];
  const [artists, songs, albums, projects] = await Promise.all([
    getCollection('artists'),
    getCollection('songs'),
    getCollection('albums'),
    getCollection('projects'),
  ]);

  const artistItems: GameItemDraft[] = artists.filter((entry) => entry.data.locale === locale).map((entry) => ({
    kind: 'artist',
    id: entryId(entry.id),
    title: entry.data.name,
    subtitle: entry.data.romanizedName,
    href: `/${locale}/artists/${entryId(entry.id)}`,
    accentColor: entry.data.theme?.accentColor ?? '#89f5df',
    relatedKey: entry.data.translationKey,
    relationKeys: [entry.data.translationKey],
    featuredHrefs: entry.data.featuredEntries?.map((featured) => featured.href) ?? [],
    facts: compactFacts([
      `${labels.type} / ${labels.artist}`,
      entry.data.code ? `${labels.code} / ${entry.data.code}` : undefined,
      entry.data.debutDate ? `${labels.debut} / ${entry.data.debutDate}` : undefined,
      entry.data.affiliations?.[0] ? `${labels.category} / ${entry.data.affiliations[0]}` : undefined,
    ]),
  }));

  const songItems: GameItemDraft[] = songs.filter((entry) => entry.data.locale === locale).map((entry) => ({
    kind: 'song',
    id: entryId(entry.id),
    title: entry.data.title,
    subtitle: entry.data.artist,
    href: `/${locale}/songs/${entryId(entry.id)}`,
    accentColor: entry.data.theme?.accentColor ?? '#89f5df',
    relatedKey: entry.data.artistId,
    relationKeys: unique(entry.data.artistIds ?? [entry.data.artistId]),
    albumTitle: entry.data.album,
    facts: compactFacts([
      `${labels.type} / ${labels.song}`,
      `${labels.performer} / ${entry.data.artist}`,
      entry.data.releaseDate ? `${labels.release} / ${entry.data.releaseDate}` : undefined,
      entry.data.album ? `${labels.collection} / ${entry.data.album}` : entry.data.categoryTitle ? `${labels.category} / ${entry.data.categoryTitle}` : undefined,
    ]),
  }));

  const albumItems: GameItemDraft[] = albums.filter((entry) => entry.data.locale === locale).map((entry) => ({
    kind: 'album',
    id: entryId(entry.id),
    title: entry.data.title,
    subtitle: entry.data.artist,
    href: `/${locale}/albums/${entryId(entry.id)}`,
    accentColor: entry.data.theme?.accentColor ?? '#d7b8ff',
    relatedKey: entryId(entry.id).split('/')[0],
    relationKeys: [entryId(entry.id).split('/')[0]],
    trackSongIds: entry.data.tracks?.map((track) => track.songId).filter((id): id is string => Boolean(id)) ?? [],
    facts: compactFacts([
      `${labels.type} / ${labels.album}`,
      `${labels.performer} / ${entry.data.artist}`,
      entry.data.releaseDate ? `${labels.release} / ${entry.data.releaseDate}` : undefined,
      `${labels.tracks} / ${entry.data.trackCount ?? entry.data.tracks?.length ?? 0}`,
    ]),
  }));

  const projectItems: GameItemDraft[] = projects.filter((entry) => entry.data.locale === locale).map((entry) => ({
    kind: 'project',
    id: entryId(entry.id),
    title: entry.data.title,
    subtitle: entry.data.kind,
    href: `/${locale}/projects/${entryId(entry.id)}`,
    accentColor: '#89f5df',
    relatedKey: entry.data.kind,
    relationKeys: [entry.data.kind],
    facts: compactFacts([
      `${labels.type} / ${labels.project}`,
      `${labels.category} / ${entry.data.kind}`,
      entry.data.description ? `${labels.collection} / ${entry.data.description}` : undefined,
    ]),
  }));

  const drafts = [...artistItems, ...songItems, ...albumItems, ...projectItems];
  const byHref = new Map(drafts.map((item) => [item.href, item]));

  const items = drafts.map((item) => {
    const connected: GameItemDraft[] = [];
    const add = (candidate: GameItemDraft | undefined) => {
      if (candidate && itemKey(candidate) !== itemKey(item)) connected.push(candidate);
    };

    if (item.kind === 'artist') {
      item.featuredHrefs?.forEach((href) => add(byHref.get(href)));
      songItems.filter((song) => song.relationKeys.includes(item.relatedKey)).slice(0, 10).forEach(add);
      albumItems.filter((album) => album.relatedKey === item.relatedKey).slice(0, 6).forEach(add);
    } else if (item.kind === 'song') {
      item.relationKeys.forEach((relationKey) => add(artistItems.find((artist) => artist.relatedKey === relationKey)));
      albumItems.filter((album) => album.relatedKey === item.relatedKey && (album.title === item.albumTitle || album.trackSongIds?.includes(item.id))).slice(0, 3).forEach(add);
      songItems.filter((song) => song.id !== item.id && song.relatedKey === item.relatedKey && Boolean(item.albumTitle) && song.albumTitle === item.albumTitle).slice(0, 4).forEach(add);
      songItems.filter((song) => song.id !== item.id && song.relatedKey === item.relatedKey).slice(0, 4).forEach(add);
    } else if (item.kind === 'album') {
      add(artistItems.find((artist) => artist.relatedKey === item.relatedKey));
      songItems.filter((song) => item.trackSongIds?.includes(song.id) || (song.relatedKey === item.relatedKey && song.albumTitle === item.title)).slice(0, 12).forEach(add);
    } else {
      projectItems.filter((project) => project.id !== item.id && project.relatedKey === item.relatedKey).slice(0, 6).forEach(add);
      artistItems.filter((artist) => artist.featuredHrefs?.includes(item.href)).slice(0, 6).forEach(add);
    }

    return {
      kind: item.kind,
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      href: item.href,
      accentColor: item.accentColor,
      relatedKey: item.relatedKey,
      facts: item.facts,
      connections: unique(connected.map(itemKey)).slice(0, 18),
    };
  });

  return new Response(JSON.stringify({ locale, items }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=3600',
    },
  });
};
