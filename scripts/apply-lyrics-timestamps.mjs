/**
 * apply-lyrics-timestamps.mjs
 * 
 * Reads the lyrics-cache.json and applies synced LRC timestamps
 * to all song markdown files in src/content/songs.
 * 
 * For each file:
 * 1. Extracts plain text from jp-lyric lines (stripping HTML tags)
 * 2. Matches against cached LRC data using fuzzy text comparison
 * 3. Inserts [MM:SS.CC] timestamps at the beginning of matching lines
 */

import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');
const CACHE_FILE = path.join(process.cwd(), 'scripts/lyrics-cache.json');

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Recursively find all .md files
 */
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

/**
 * Parse frontmatter
 */
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

/**
 * Extract plain text from a jp-lyric line (strip all HTML tags and existing timestamps)
 */
function extractPlainText(jpLine) {
  // Remove existing timestamps like [00:00.00]
  let text = jpLine.replace(/\[\d{2}:\d{2}\.\d{2,3}\]/g, '');
  // Remove <rt ...>content</rt> elements entirely (furigana and romaji annotations)
  text = text.replace(/<rt[^>]*>.*?<\/rt>/g, '');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

/**
 * Normalize text for comparison: remove spaces, punctuation, and special chars
 */
function normalizeForMatch(text) {
  return text
    .replace(/\s+/g, '')
    .replace(/[、。！？「」『』（）…・ー～〜,\.\!\?\(\)]/g, '')
    .replace(/[\u3000]/g, '') // full-width space
    .toLowerCase();
}

/**
 * Calculate similarity between two strings (0 to 1)
 * Uses longest common subsequence ratio
 */
function similarity(a, b) {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  const na = normalizeForMatch(a);
  const nb = normalizeForMatch(b);
  
  if (na === nb) return 1;
  if (!na || !nb) return 0;
  
  // Simple containment check - if one is substring of other
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  
  // LCS-based similarity
  const m = na.length;
  const n = nb.length;
  
  // For very long strings, use a simpler approach
  if (m > 100 || n > 100) {
    // Character frequency similarity
    const freqA = {};
    const freqB = {};
    for (const c of na) freqA[c] = (freqA[c] || 0) + 1;
    for (const c of nb) freqB[c] = (freqB[c] || 0) + 1;
    let common = 0;
    for (const c in freqA) {
      if (freqB[c]) common += Math.min(freqA[c], freqB[c]);
    }
    return (2 * common) / (m + n);
  }
  
  // LCS DP
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (na[i-1] === nb[j-1]) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  return (2 * dp[m][n]) / (m + n);
}

// ─── Timestamp Application ───────────────────────────────────

/**
 * Match file lyrics lines to LRC timestamp data.
 * Returns a map of lyric-line index -> timestamp string
 */
function matchTimestamps(lyricLines, lrcData) {
  if (!lrcData || lrcData.length === 0) return {};
  
  const timestamps = {};
  let lrcIdx = 0;
  
  for (let i = 0; i < lyricLines.length; i++) {
    const plainText = lyricLines[i];
    if (!plainText) continue; // skip empty lines
    
    // Try to find best match starting from current lrcIdx
    let bestMatch = -1;
    let bestScore = 0;
    
    // Search in a window around expected position
    const searchStart = Math.max(0, lrcIdx - 2);
    const searchEnd = Math.min(lrcData.length, lrcIdx + 5);
    
    for (let j = searchStart; j < searchEnd; j++) {
      const score = similarity(plainText, lrcData[j].text);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = j;
      }
    }
    
    // Accept match if similarity > 0.5
    if (bestScore >= 0.5 && bestMatch >= 0) {
      timestamps[i] = lrcData[bestMatch].time;
      lrcIdx = bestMatch + 1;
    } else {
      // Try wider search for this line
      for (let j = 0; j < lrcData.length; j++) {
        const score = similarity(plainText, lrcData[j].text);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = j;
        }
      }
      if (bestScore >= 0.5 && bestMatch >= 0) {
        timestamps[i] = lrcData[bestMatch].time;
        lrcIdx = bestMatch + 1;
      }
    }
  }
  
  return timestamps;
}

/**
 * Apply timestamps to a single markdown file's content
 */
function applyTimestampsToContent(content, lrcData) {
  // Find the lyrics section
  const lyricBoxStart = content.indexOf('<div class="my-lyric-box">');
  if (lyricBoxStart === -1) return { content, modified: false };
  
  const lyricBoxEnd = content.lastIndexOf('</div>', content.indexOf('## ', lyricBoxStart + 1) !== -1 
    ? content.indexOf('## ', lyricBoxStart + 1) 
    : content.length);
  
  if (lyricBoxEnd === -1) return { content, modified: false };
  
  // Extract all lyric-line blocks
  const lyricSection = content.substring(lyricBoxStart, lyricBoxEnd);
  
  // Find all jp-lyric divs and extract plain text
  const jpLyricRegex = /<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/g;
  const lyricLines = [];
  const jpMatches = [];
  let m;
  
  while ((m = jpLyricRegex.exec(lyricSection)) !== null) {
    const plainText = extractPlainText(m[1]);
    lyricLines.push(plainText);
    jpMatches.push({
      fullMatch: m[0],
      innerContent: m[1],
      index: m.index,
    });
  }
  
  if (lyricLines.length === 0) return { content, modified: false };
  
  // Match timestamps
  const timestamps = matchTimestamps(lyricLines, lrcData);
  
  if (Object.keys(timestamps).length === 0) return { content, modified: false };
  
  // Build new content
  let newContent = content;
  let modified = false;
  
  // Process each lyric-line block
  // We need to work with the full content and find each lyric-line div
  const lineBlockRegex = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/g;
  const blocks = [];
  
  while ((m = lineBlockRegex.exec(content)) !== null) {
    blocks.push({
      fullMatch: m[0],
      innerContent: m[1],
      startIndex: m.index,
    });
  }
  
  // For each block, extract jp-lyric plain text, find its timestamp, and apply
  let offset = 0;
  let lineIdx = 0;
  
  for (const block of blocks) {
    // Check if this block's jp-lyric has timestamp data
    const jpMatch = block.innerContent.match(/<div class="jp-lyric">\r?\n?([\s\S]*?)\r?\n?<\/div>/);
    if (!jpMatch) { lineIdx++; continue; }
    
    const jpContent = jpMatch[1];
    const hasExistingTimestamp = /\[\d{2}:\d{2}\.\d{2,3}\]/.test(jpContent);
    
    // Skip if already has timestamps (unless it's the example file being corrected separately)
    if (hasExistingTimestamp) { lineIdx++; continue; }
    
    const ts = timestamps[lineIdx];
    if (!ts) { lineIdx++; continue; }
    
    // Apply timestamp to jp-lyric line
    const tsTag = `[${ts}]`;
    
    // Find and modify the block in newContent
    const blockStart = block.startIndex + offset;
    const blockEnd = blockStart + block.fullMatch.length;
    const blockContent = newContent.substring(blockStart, blockEnd);
    
    let modifiedBlock = blockContent;
    
    // Insert timestamp at start of jp-lyric content
    // Pattern: <div class="jp-lyric">\n<ruby>... -> <div class="jp-lyric">\n[MM:SS.CC]<ruby>...
    // or:      <div class="jp-lyric">\n「<ruby>... -> <div class="jp-lyric">\n[MM:SS.CC]「<ruby>...
    modifiedBlock = modifiedBlock.replace(
      /(<div class="jp-lyric">(?:\r?\n)?)/,
      `$1${tsTag}`
    );
    
    // Insert timestamp at start of cn-lyric content
    modifiedBlock = modifiedBlock.replace(
      /(<div class="cn-lyric">)/g,
      `$1${tsTag}`
    );
    
    // Insert timestamp at start of en-lyric content (if exists)
    modifiedBlock = modifiedBlock.replace(
      /(<div class="en-lyric">)/g,
      `$1${tsTag}`
    );
    
    if (modifiedBlock !== blockContent) {
      newContent = newContent.substring(0, blockStart) + modifiedBlock + newContent.substring(blockEnd);
      offset += modifiedBlock.length - block.fullMatch.length;
      modified = true;
    }
    
    lineIdx++;
  }
  
  return { content: newContent, modified };
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
  // Load cache
  if (!fs.existsSync(CACHE_FILE)) {
    console.error('Cache file not found. Run fetch-lyrics-timestamps.mjs first.');
    process.exit(1);
  }
  
  const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
  const cacheKeys = Object.keys(cache);
  const withLyrics = cacheKeys.filter(k => cache[k].syncedLyrics && cache[k].syncedLyrics.length > 0);
  console.log(`Cache has ${withLyrics.length}/${cacheKeys.length} songs with synced lyrics`);
  
  // Find all files
  console.log('\nScanning files...');
  const allFiles = await findAllMdFiles(SONGS_DIR);
  console.log(`Found ${allFiles.length} files`);
  
  let modifiedCount = 0;
  let skippedCount = 0;
  let noMatchCount = 0;
  let errorCount = 0;
  
  for (const filePath of allFiles) {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    const key = fm.translationKey;
    
    if (!key) continue;
    if (!content.includes('my-lyric-box')) continue;
    
    // Check if file already has timestamps
    if (/\[\d{2}:\d{2}\.\d{2,3}\]/.test(content)) {
      skippedCount++;
      continue;
    }
    
    // Find cached LRC data
    const cached = cache[key];
    if (!cached || !cached.syncedLyrics || cached.syncedLyrics.length === 0) {
      noMatchCount++;
      continue;
    }
    
    try {
      const { content: newContent, modified } = applyTimestampsToContent(content, cached.syncedLyrics);
      
      if (modified) {
        await fs.promises.writeFile(filePath, newContent, 'utf-8');
        const rel = path.relative(process.cwd(), filePath);
        console.log(`✓ ${rel}`);
        modifiedCount++;
      }
    } catch (e) {
      const rel = path.relative(process.cwd(), filePath);
      console.error(`✗ ${rel}: ${e.message}`);
      errorCount++;
    }
  }
  
  console.log('\n═══════════════════════════════');
  console.log(`Results:`);
  console.log(`  Modified: ${modifiedCount}`);
  console.log(`  Skipped (already has timestamps): ${skippedCount}`);
  console.log(`  No LRC data available: ${noMatchCount}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch(console.error);
