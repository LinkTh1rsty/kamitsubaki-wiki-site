/** Pure selection logic: no manifest is shipped to the browser. */
export function selectImageAttributes(source, entry, { widths = [192, 480, 960], sizes = '(max-width: 640px) 100vw, 400px', requireThumbnail = false } = {}) {
  if (!entry?.variants?.length) {
    if (requireThumbnail) throw new Error(`Missing thumbnail: ${source}`);
    return { src: source, decoding: 'async' };
  }
  const variants = entry.variants;
  const selected = [...new Set(widths.map(width => variants.find(v => v.width >= width) || variants.at(-1)))].sort((a, b) => a.width - b.width);
  // Small authored portals must fail the build rather than quietly ship a full-resolution URL.
  if (requireThumbnail && (!selected.length || selected.some(v => !/^\/thumbnails\/[^/?#]+\.webp$/.test(v.src) || v.width > Math.max(...widths)))) {
    throw new Error(`Missing bounded thumbnail: ${source}`);
  }
  if (!selected.length) return { src: source, decoding: 'async' };
  return {
    src: selected[0].src,
    srcset: selected.map(v => `${v.src} ${v.width}w`).join(', '),
    sizes,
    width: entry.width,
    height: entry.height,
    decoding: 'async',
  };
}
