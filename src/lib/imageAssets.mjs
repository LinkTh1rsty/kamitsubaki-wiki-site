import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { selectImageAttributes } from './imageAttributes.mjs';

const manifestPath = resolve('.cache/image-thumbnails/manifest.json');
let stamp, images = {};
function readImages() {
  try {
    const next = statSync(manifestPath).mtimeMs;
    if (next !== stamp) { images = JSON.parse(readFileSync(manifestPath, 'utf8')).images; stamp = next; }
  } catch { /* Unknown sources retain their original URL. */ }
  return images;
}

export function imageAttributes(src, options) {
  let path;
  try { path = decodeURI(String(src).split(/[?#]/)[0]); } catch { /* Invalid URL. */ }
  return selectImageAttributes(src, path?.startsWith('/images/') ? readImages()[path] : undefined, options);
}

export function thumbnailUrl(src, width = 192) {
  return imageAttributes(src, { widths: [width], sizes: `${width}px` }).src;
}

// Opt-in for slots that must never fetch an original when a derivative is missing.
export function requiredThumbnailUrl(src, width = 192) {
  return imageAttributes(src, { widths: [width], sizes: `${width}px`, requireThumbnail: true }).src;
}

export function thumbnailCatalog(catalog, size = 48) {
  for (const items of Object.values(catalog)) for (const item of items) {
    if (!item.image) continue;
    // The viewport backdrop is a display derivative too; keep original URLs
    // for explicit enlargement/download rather than loading them on hover.
    item.backgroundImage = thumbnailUrl(item.image, 960);
    const attrs = imageAttributes(item.image, { widths: [96, 192], sizes: `${size}px` });
    item.image = attrs.src;
    item.imageSrcset = attrs.srcset;
    item.imageSizes = attrs.sizes;
  }
  return catalog;
}
