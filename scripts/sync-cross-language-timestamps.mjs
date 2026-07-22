/**
 * sync-cross-language-timestamps.mjs
 * 
 * Synchronizes timestamps across different language versions of the same song.
 * If one version (e.g. zh.md) has [MM:SS.CC] timestamps but another (e.g. ja.md) doesn't,
 * this script will copy the timestamps line-by-line.
 */

import fs from 'fs';
import path from 'path';

const SONGS_DIR = path.join(process.cwd(), 'src/content/songs');

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

/**
 * Extracts the timestamp for each lyric-line index.
 * Returns an array where index matches the lyric-line index and value is the timestamp string.
 */
function extractTimestamps(content) {
  const timestamps = [];
  const lineBlockRegex = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/g;
  let m;
  
  while ((m = lineBlockRegex.exec(content)) !== null) {
    const inner = m[1];
    const tsMatch = inner.match(/\[(\d{2}:\d{2}\.\d{2,3})\]/);
    timestamps.push(tsMatch ? tsMatch[1] : null);
  }
  
  return timestamps;
}

/**
 * Applies timestamps to a file
 */
function applyTimestamps(content, timestamps) {
  let newContent = content;
  let modified = false;
  
  const lineBlockRegex = /<div class="lyric-line">\r?\n([\s\S]*?)<\/div>\r?\n<\/div>/g;
  const blocks = [];
  let m;
  
  while ((m = lineBlockRegex.exec(content)) !== null) {
    blocks.push({
      fullMatch: m[0],
      innerContent: m[1],
      startIndex: m.index,
    });
  }
  
  let offset = 0;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const ts = timestamps[i];
    if (!ts) continue;
    
    // Check if it already has a timestamp
    if (/\[\d{2}:\d{2}\.\d{2,3}\]/.test(block.innerContent)) {
      continue;
    }
    
    const tsTag = `[${ts}]`;
    const blockStart = block.startIndex + offset;
    const blockEnd = blockStart + block.fullMatch.length;
    let blockContent = newContent.substring(blockStart, blockEnd);
    let modifiedBlock = blockContent;
    
    // Replace jp-lyric
    modifiedBlock = modifiedBlock.replace(
      /(<div class="jp-lyric">(?:\r?\n)?)/,
      `$1${tsTag}`
    );
    // Replace cn-lyric
    modifiedBlock = modifiedBlock.replace(
      /(<div class="cn-lyric">)/g,
      `$1${tsTag}`
    );
    // Replace en-lyric
    modifiedBlock = modifiedBlock.replace(
      /(<div class="en-lyric">)/g,
      `$1${tsTag}`
    );
    
    if (modifiedBlock !== blockContent) {
      newContent = newContent.substring(0, blockStart) + modifiedBlock + newContent.substring(blockEnd);
      offset += modifiedBlock.length - block.fullMatch.length;
      modified = true;
    }
  }
  
  return { content: newContent, modified };
}

async function main() {
  console.log('Scanning files for cross-language synchronization...');
  const allFiles = await findAllMdFiles(SONGS_DIR);
  
  // Group by translationKey
  const groups = {};
  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.includes('my-lyric-box')) continue;
    
    const fm = parseFrontmatter(content);
    const key = fm.translationKey;
    if (!key) continue;
    
    if (!groups[key]) groups[key] = [];
    groups[key].push({ path: filePath, content, locale: fm.locale });
  }
  
  let syncedFiles = 0;
  
  for (const [key, files] of Object.entries(groups)) {
    if (files.length <= 1) continue; // nothing to sync
    
    // Find the file with the most timestamps
    let bestTimestamps = [];
    let bestTimestampCount = 0;
    
    for (const file of files) {
      const ts = extractTimestamps(file.content);
      const count = ts.filter(t => t !== null).length;
      if (count > bestTimestampCount) {
        bestTimestamps = ts;
        bestTimestampCount = count;
      }
    }
    
    if (bestTimestampCount === 0) continue; // No version has timestamps
    
    // Sync to other files
    for (const file of files) {
      const ts = extractTimestamps(file.content);
      const count = ts.filter(t => t !== null).length;
      
      // If this file is missing timestamps compared to the best version
      if (count < bestTimestampCount) {
        // Also check if they have the same number of lyric blocks
        if (ts.length === bestTimestamps.length) {
          const { content: newContent, modified } = applyTimestamps(file.content, bestTimestamps);
          if (modified) {
            fs.writeFileSync(file.path, newContent, 'utf-8');
            console.log(`✓ Synced timestamps to ${path.relative(process.cwd(), file.path)}`);
            syncedFiles++;
          }
        } else {
          console.log(`⚠️ Mismatch in line counts for ${key} (${file.locale}): has ${ts.length} lines, expected ${bestTimestamps.length}`);
        }
      }
    }
  }
  
  console.log(`\nSynchronization complete. Updated ${syncedFiles} files.`);
}

main().catch(console.error);
