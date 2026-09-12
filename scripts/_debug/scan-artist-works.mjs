import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
const artistsRoot = path.join(projectRoot, 'src/content/artists');
const albumsRoot = path.join(projectRoot, 'src/content/albums');
const songsRoot = path.join(projectRoot, 'src/content/songs');

function walkFiles(dir, filter, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, filter, out);
    else if (filter(entry.name, p)) out.push(p);
  }
  return out;
}

function readFrontmatter(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { source, data: {}, body: source };
  return {
    source,
    data: parse(match[1]) || {},
    body: source.slice(match[0].length),
  };
}

function headingAfter(body, patterns) {
  const lines = body.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const m = lines[i].match(/^##\s+(.+)$/);
    if (!m) continue;
    if (patterns.some((p) => p.test(m[1]))) {
      let j = i + 1;
      const block = [];
      while (j < lines.length && !/^##\s+/.test(lines[j])) {
        block.push(lines[j]);
        j += 1;
      }
      hits.push({ heading: m[1], start: i + 1, end: j, text: block.join('\n') });
    }
  }
  return hits;
}

// Artist entries
const artistFiles = walkFiles(artistsRoot, (name) => name === 'zh.md');
const artists = [];
for (const file of artistFiles) {
  const rel = path.relative(artistsRoot, file).replace(/\\/g, '/');
  const { data, body } = readFrontmatter(file);
  const id = rel.split('/')[1] || rel.split('/')[0];
  const category = rel.split('/')[0];
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1]);
  const worksSections = headingAfter(body, [/代表作品|音乐作品|作品与|Discography|代表楽曲|作品/]);
  artists.push({
    rel,
    category,
    id,
    translationKey: data.translationKey,
    name: data.name,
    romanizedName: data.romanizedName,
    headings,
    worksSections,
    locales: walkFiles(path.dirname(file), (n) => /\.(md)$/.test(n)).map((p) => path.basename(p)),
  });
}

// Albums
const albumEntries = [];
for (const file of walkFiles(albumsRoot, (name) => name === 'zh.md')) {
  const rel = path.relative(albumsRoot, file).replace(/\\/g, '/');
  const parts = rel.split('/');
  const artistId = parts[0];
  const albumSlug = parts[1];
  const { data } = readFrontmatter(file);
  albumEntries.push({
    artistId,
    albumSlug,
    title: data.title,
    type: data.type,
    releaseDate: data.releaseDate,
    romanizedTitle: data.romanizedTitle,
    trackCount: data.trackCount,
    href: `/zh/albums/${artistId}/${albumSlug}`,
  });
}

// Songs
const songEntries = [];
for (const file of walkFiles(songsRoot, (name) => name === 'zh.md')) {
  const rel = path.relative(songsRoot, file).replace(/\\/g, '/');
  const parts = rel.split('/');
  const artistId = parts[0];
  const category = parts[1];
  const songSlug = parts[2];
  const { data } = readFrontmatter(file);
  songEntries.push({
    artistId,
    category,
    songSlug,
    title: data.title,
    releaseDate: data.releaseDate,
    artist: data.artist,
    artistIdField: data.artistId,
    href: `/zh/songs/${artistId}/${category}/${songSlug}`,
  });
}

const albumsByArtist = new Map();
for (const a of albumEntries) {
  if (!albumsByArtist.has(a.artistId)) albumsByArtist.set(a.artistId, []);
  albumsByArtist.get(a.artistId).push(a);
}
const songsByArtist = new Map();
for (const s of songEntries) {
  if (!songsByArtist.has(s.artistId)) songsByArtist.set(s.artistId, []);
  songsByArtist.get(s.artistId).push(s);
}

const report = {
  artists: artists.map((a) => ({
    rel: a.rel,
    category: a.category,
    id: a.id,
    name: a.name,
    worksHeadings: a.worksSections.map((w) => w.heading),
    albumCount: (albumsByArtist.get(a.id) || []).length,
    songCount: (songsByArtist.get(a.id) || []).length,
    albums: (albumsByArtist.get(a.id) || []).map((x) => `${x.type || '?'}:${x.title}(${x.releaseDate || ''})`),
    songCategories: Object.fromEntries(
      Object.entries(
        (songsByArtist.get(a.id) || []).reduce((acc, s) => {
          acc[s.category] = (acc[s.category] || 0) + 1;
          return acc;
        }, {}),
      ),
    ),
  })),
  albumCount: albumEntries.length,
  songCount: songEntries.length,
};

fs.writeFileSync(
  path.join(projectRoot, 'scripts/_debug/artist-works-inventory.json'),
  JSON.stringify(report, null, 2),
  'utf8',
);

console.log(`artists=${artists.length} albums=${albumEntries.length} songs=${songEntries.length}`);
for (const a of report.artists) {
  console.log(
    `${a.rel} | ${a.name} | works=${a.worksHeadings.join(';') || '-'} | albums=${a.albumCount} songs=${a.songCount}`,
  );
}
