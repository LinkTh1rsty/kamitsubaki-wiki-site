import { createHash } from 'node:crypto';
import { copyFile, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const THUMBNAIL_WIDTHS = [96, 192, 480, 960];
const RECIPE = `webp-q78-effort4-auto-orient-v1-sharp${sharp.versions.sharp}`;
const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const formats = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff', '.gif']);

async function filesIn(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await filesIn(path));
    else if (entry.isFile() && formats.has(extname(entry.name).toLowerCase())) files.push(path);
  }
  return files.sort();
}

async function exists(path) { try { return (await stat(path)).isFile(); } catch { return false; } }
async function atomicWrite(path, data) {
  const temporary = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  await writeFile(temporary, data);
  try {
    await rename(temporary, path);
  } catch (error) {
    // Identical sources can race on the same hash-named output (Windows EPERM).
    if (error?.code === 'EPERM' || error?.code === 'EEXIST') {
      await rm(temporary, { force: true }).catch(() => {});
      if (await exists(path)) return;
    }
    throw error;
  }
}

/** Generates only local image derivatives. Source files are never modified. */
export async function generateThumbnails({ root = projectRoot, concurrency = 4, log = console.log } = {}) {
  const publicDir = resolve(root, 'public');
  const outputDir = resolve(publicDir, 'thumbnails');
  // Pages caches node_modules/.astro for Astro, not all of node_modules/.cache.
  const localCacheDir = resolve(root, '.cache/image-thumbnails');
  const durableCacheDir = resolve(root, 'node_modules/.astro/kamitsubaki-thumbs');
  const manifestPath = resolve(localCacheDir, 'manifest.json');
  const durableManifestPath = resolve(durableCacheDir, 'manifest.json');
  await mkdir(outputDir, { recursive: true });
  await mkdir(localCacheDir, { recursive: true });
  await mkdir(durableCacheDir, { recursive: true });
  const files = await filesIn(resolve(publicDir, 'images'));
  let previous = {};
  let localManifest;
  try {
    localManifest = await readFile(manifestPath, 'utf8');
    previous = JSON.parse(localManifest);
  } catch { /* First build. */ }
  if (!Object.keys(previous).length) {
    try { previous = JSON.parse(await readFile(durableManifestPath, 'utf8')); } catch { /* Cold cache. */ }
  }
  // Restore derivative files from the durable cache when public/thumbnails was wiped.
  if (previous.recipe === RECIPE && previous.images) {
    for (const info of Object.values(previous.images)) {
      for (const variant of info.variants || []) {
        const publicPath = resolve(publicDir, variant.src.slice(1));
        const cachePath = resolve(durableCacheDir, 'files', variant.src.replace(/^\//, ''));
        if (!(await exists(publicPath)) && await exists(cachePath)) {
          await mkdir(dirname(publicPath), { recursive: true });
          await copyFile(cachePath, publicPath);
        }
      }
    }
  }
  const manifest = { recipe: RECIPE, images: {} };
  const report = { sources: files.length, generated: 0, cached: 0, sourceBytes: 0, thumbnailBytes: 0, skipped: [] };
  /** @type {Map<string, {hash: string, width: number, height: number, bytes: number, variants: Array<{src: string, width: number, height: number, bytes: number}>}>} */
  const generatedByHash = new Map();
  let index = 0;
  const work = async () => {
    while (index < files.length) {
      const path = files[index++];
      const source = '/' + relative(publicDir, path).split('\\').join('/');
      const input = await readFile(path);
      const hash = createHash('sha256').update(RECIPE).update(input).digest('hex').slice(0, 20);
      const cached = previous.recipe === RECIPE && previous.images?.[source];
      if (cached?.hash === hash && (await Promise.all(cached.variants.map(v => exists(resolve(publicDir, v.src.slice(1)))))).every(Boolean)) {
        manifest.images[source] = cached;
        report.cached += 1; report.sourceBytes += cached.bytes;
        report.thumbnailBytes += cached.variants[0].bytes;
        continue;
      }
      const alreadyGenerated = generatedByHash.get(hash);
      if (alreadyGenerated) {
        manifest.images[source] = { ...alreadyGenerated, bytes: input.length };
        report.cached += 1; report.sourceBytes += input.length;
        report.thumbnailBytes += alreadyGenerated.variants[0].bytes;
        continue;
      }
      let metadata;
      try { metadata = await sharp(input, { limitInputPixels: 80_000_000 }).metadata(); }
      catch { report.skipped.push({ source, reason: 'unsupported or invalid image' }); continue; }
      if ((metadata.pages || 1) > 1 || !metadata.width || !metadata.height) {
        report.skipped.push({ source, reason: 'animated or missing dimensions' }); continue;
      }
      const rotated = [5, 6, 7, 8].includes(metadata.orientation);
      const width = rotated ? metadata.height : metadata.width;
      const height = rotated ? metadata.width : metadata.height;
      const variants = [];
      for (const target of [...new Set(THUMBNAIL_WIDTHS.map(w => Math.min(w, width)))]) {
        const src = `/thumbnails/${hash}-${target}.webp`;
        const output = resolve(publicDir, src.slice(1));
        if (!await exists(output)) {
          const { data, info } = await sharp(input, { limitInputPixels: 80_000_000 })
            .rotate().resize({ width: target, withoutEnlargement: true })
            .webp({ quality: 78, effort: 4 }).toBuffer({ resolveWithObject: true });
          await atomicWrite(output, data);
          variants.push({ src, width: info.width, height: info.height, bytes: info.size });
          report.generated += 1;
        } else {
          variants.push({ src, width: target, height: Math.round(height * target / width), bytes: (await stat(output)).size });
        }
      }
      const entry = { hash, width, height, bytes: input.length, variants };
      generatedByHash.set(hash, entry);
      manifest.images[source] = entry;
      report.sourceBytes += input.length; report.thumbnailBytes += variants[0].bytes;
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(4, concurrency)) }, work));
  // Stable ordering keeps unchanged builds and development reloads quiet.
  manifest.images = Object.fromEntries(Object.entries(manifest.images).sort(([a], [b]) => a.localeCompare(b)));
  const serialized = JSON.stringify(manifest);
  // A restored durable manifest still needs its local copy for imageAssets.mjs.
  if (serialized !== localManifest) await atomicWrite(manifestPath, serialized);
  await atomicWrite(durableManifestPath, serialized);
  for (const info of Object.values(manifest.images)) {
    for (const variant of info.variants || []) {
      const publicPath = resolve(publicDir, variant.src.slice(1));
      const cachePath = resolve(durableCacheDir, 'files', variant.src.replace(/^\//, ''));
      if (await exists(publicPath) && !(await exists(cachePath))) {
        await mkdir(dirname(cachePath), { recursive: true });
        await copyFile(publicPath, cachePath);
      }
    }
  }
  log(`[thumbnails] ${report.sources} sources; ${report.generated} generated; ${report.cached} unchanged; ${report.skipped.length} skipped`);
  if (report.skipped.length) log(`[thumbnails] Preserved originals: ${JSON.stringify(report.skipped)}`);
  return report;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  console.log(JSON.stringify(await generateThumbnails(), null, 2));
}
