/**
 * fetch-lyrics-timestamps.mjs
 * 
 * Fetches synced LRC lyrics from LRCLIB, Netease Music APIs, and QQ Music.
 * Improved matching logic: strips 'feat.', 'Cover', 'Live' tags and tries fallback sources.
 * Groups songs by translationKey to avoid duplicate queries.
 * Saves results to scripts/lyrics-cache.json.
 */

import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const CACHE_FILE = path.join(process.cwd(), 'scripts/lyrics-cache.json');

// Rate limiting
const DELAY_MS = 350; // delay between API calls
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Scanning ────────────────────────────────────────────────

async function findAllMdFiles(dir, list = []) {
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await findAllMdFiles(full, list);
    } else if (entry.name.endsWith('.md') && entry.name !== 'README.md') {
      list.push(full);
    }
  }
  return list;
}

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^(\w+):\s*(?:"([^"]*)"|(.+))$/);
    if (m) {
      fm[m[1]] = (m[2] !== undefined ? m[2] : m[3]).trim();
    }
  }
  return fm;
}

function extractNeteaseId(content) {
  const m = content.match(/@\[netease\]\((\d+)/);
  return m ? m[1] : null;
}

function hasLyrics(content) {
  return content.includes('my-lyric-box');
}

function parseDuration(durStr) {
  if (!durStr) return 0;
  const parts = durStr.split(':');
  if (parts.length === 2) {
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  }
  return 0;
}

// ─── Data Cleaning ───────────────────────────────────────────

function cleanTitle(title) {
  // Remove common suffixes like (Cover), [Live ver.], (Remix), etc.
  let cleaned = title.replace(/\s*[\(\[].*?(?:Cover|Live|Remix|ver|feat).*?[\)\]]/ig, '').trim();
  // If it stripped too much and became empty, use original
  return cleaned || title;
}

function cleanArtist(artist) {
  // Special case for V.W.P which is often listed as all 5 members
  if (artist.includes('V.W.P') || (artist.includes('花譜') && artist.includes('理芽'))) {
    return 'V.W.P';
  }
  // Take the primary artist before any comma or ampersand
  let a = artist.split(/[,&]/)[0].trim();
  a = a.replace(/\s*feat\..*/i, '').trim();
  return a || artist;
}

// ─── LRCLIB API ──────────────────────────────────────────────

async function searchLrclib(trackName, artistName, duration) {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
  });
  const url = `https://lrclib.net/api/search?${params}`;
  
  try {
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'kamitsubaki-wiki-lyrics/2.0' }
    });
    if (!resp.ok) return null;
    
    const results = await resp.json();
    if (!results || results.length === 0) return null;
    
    // Filter for results with synced lyrics
    const withSync = results.filter(r => r.syncedLyrics);
    if (withSync.length === 0) return null;
    
    // Prefer result with closest duration match if duration is provided
    if (duration > 0) {
      withSync.sort((a, b) => {
        return Math.abs(a.duration - duration) - Math.abs(b.duration - duration);
      });
    }
    
    return withSync[0].syncedLyrics;
  } catch (e) {
    console.error(`  LRCLIB error for "${trackName}": ${e.message}`);
    return null;
  }
}

// ─── Netease Music API ───────────────────────────────────────

async function fetchNeteaseLyrics(neteaseId) {
  const url = `https://music.163.com/api/song/lyric?id=${neteaseId}&lv=1`;
  
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://music.163.com/',
      }
    });
    if (!resp.ok) return null;
    
    const data = await resp.json();
    if (!data.lrc || !data.lrc.lyric) return null;
    
    // Check if it has time tags
    const lyric = data.lrc.lyric;
    if (!lyric.match(/\[\d{2}:\d{2}/)) return null;
    
    return lyric;
  } catch (e) {
    console.error(`  Netease error for ID ${neteaseId}: ${e.message}`);
    return null;
  }
}

// ─── QQ Music API ────────────────────────────────────────────

async function searchQQMusic(title, artist) {
  const query = encodeURIComponent(title + ' ' + artist);
  const url = 'https://c.y.qq.com/soso/fcgi-bin/client_search_cp?p=1&n=5&w=' + query + '&format=json';
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const json = await res.json();
    const songs = json?.data?.song?.list || [];
    if (songs.length > 0) return songs[0].songmid;
  } catch(e) {
    console.error(`  QQ Search error: ${e.message}`);
  }
  return null;
}

async function getQQLyric(songmid) {
  const url = `https://c.y.qq.com/lyric/fcgi-bin/fcg_query_lyric_new.fcg?songmid=${songmid}&format=json&nobase64=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://y.qq.com/' } });
    const json = await res.json();
    if (json.lyric) {
      let lrc = json.lyric;
      // Decode HTML entities
      lrc = lrc.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
      if (lrc.match(/\[\d{2}:\d{2}/)) return lrc;
    }
  } catch(e) {
    console.error(`  QQ Lyric error: ${e.message}`);
  }
  return null;
}

// ─── LRC Parsing ─────────────────────────────────────────────

function parseLrc(lrcText) {
  const lines = lrcText.split('\n');
  const result = [];
  
  for (const line of lines) {
    // Match [MM:SS.CC] pattern
    const match = line.match(/^\[(\d{2}:\d{2}[.:]\d{2,3})\]\s*(.*)/);
    if (match) {
      let time = match[1];
      const text = match[2].trim();
      
      time = time.replace(/(\d{2}:\d{2})[:](\d{2,3})/, '$1.$2');
      const timeParts = time.match(/^(\d{2}:\d{2})\.(\d{2,3})$/);
      if (timeParts && timeParts[2].length === 3) {
        time = timeParts[1] + '.' + timeParts[2].substring(0, 2);
      }
      
      if (text.length > 0) {
        result.push({ time, text });
      }
    }
  }
  
  return result;
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  console.log('Scanning song files...');
  const allFiles = await findAllMdFiles(SONGS_DIR);
  
  let cache = {};
  if (fs.existsSync(CACHE_FILE)) {
    try {
      cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
      console.log(`Loaded existing cache with ${Object.keys(cache).length} entries`);
    } catch (e) {
      console.log('Cache file corrupted, starting fresh');
    }
  }
  
  const groups = {};
  for (const filePath of allFiles) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    const key = fm.translationKey;
    if (!key) continue;
    if (!hasLyrics(content)) continue;
    
    if (!groups[key]) {
      groups[key] = {
        title: fm.title,
        artist: fm.artist,
        duration: parseDuration(fm.duration),
        neteaseId: null,
        files: [],
        allTitles: new Set(),
      };
    }
    
    groups[key].files.push({ path: filePath, locale: fm.locale, content });
    groups[key].allTitles.add(fm.title);
    
    const nid = extractNeteaseId(content);
    if (nid) groups[key].neteaseId = nid;
  }
  
  const totalGroups = Object.keys(groups).length;
  console.log(`Found ${totalGroups} unique songs with lyrics to process\n`);
  
  let found = 0;
  let notFound = 0;
  let skipped = 0;
  let idx = 0;
  
  for (const [key, group] of Object.entries(groups)) {
    idx++;
    
    // Skip if already cached and found
    if (cache[key] && cache[key].syncedLyrics && cache[key].syncedLyrics.length > 0) {
      skipped++;
      continue;
    }
    
    const progress = `[${idx}/${totalGroups}]`;
    process.stdout.write(`${progress} Fetching "${group.title}"... `);
    
    let lrcText = null;
    let source = null;
    
    const cTitle = cleanTitle(group.title);
    const cArtist = cleanArtist(group.artist);
    
    const combinations = [
      { t: cTitle, a: cArtist }, // Cleaned
      { t: group.title, a: group.artist }, // Original
      { t: cTitle, a: '' }, // Just title
    ];
    
    // 1. Try LRCLIB
    for (const combo of combinations) {
      lrcText = await searchLrclib(combo.t, combo.a, group.duration);
      if (lrcText) {
        source = 'lrclib';
        break;
      }
      await sleep(DELAY_MS);
    }
    
    // 2. Try Netease by ID
    if (!lrcText && group.neteaseId) {
      await sleep(DELAY_MS);
      lrcText = await fetchNeteaseLyrics(group.neteaseId);
      if (lrcText) source = 'netease';
    }
    
    // 3. Try QQ Music
    if (!lrcText) {
      await sleep(DELAY_MS);
      const qqMid = await searchQQMusic(cTitle, cArtist);
      if (qqMid) {
        await sleep(DELAY_MS);
        lrcText = await getQQLyric(qqMid);
        if (lrcText) source = 'qqmusic';
      }
    }
    
    // Fallback: search QQ Music with original names
    if (!lrcText) {
      await sleep(DELAY_MS);
      const qqMid = await searchQQMusic(group.title, group.artist);
      if (qqMid) {
        await sleep(DELAY_MS);
        lrcText = await getQQLyric(qqMid);
        if (lrcText) source = 'qqmusic';
      }
    }
    
    if (lrcText) {
      const parsed = parseLrc(lrcText);
      if (parsed.length > 0) {
        cache[key] = {
          title: group.title,
          artist: group.artist,
          source,
          syncedLyrics: parsed,
          rawLrc: lrcText,
        };
        found++;
        console.log(`✓ (${source}, ${parsed.length} lines)`);
      } else {
        cache[key] = { title: group.title, artist: group.artist, source: null, syncedLyrics: [], rawLrc: null };
        notFound++;
        console.log('✗ parsed empty');
      }
    } else {
      cache[key] = { title: group.title, artist: group.artist, source: null, syncedLyrics: [], rawLrc: null };
      notFound++;
      console.log('✗ not found');
    }
    
    if (idx % 20 === 0) {
      fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
    }
  }
  
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  
  console.log('\n═══════════════════════════════');
  console.log(`Results (New queries):`);
  console.log(`  Found: ${found}`);
  console.log(`  Not found: ${notFound}`);
  console.log(`  Skipped (cached): ${skipped}`);
  console.log(`  Total: ${totalGroups}`);
  console.log(`Cache saved to ${CACHE_FILE}`);
}

main().catch(console.error);
