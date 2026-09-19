import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import sharp from 'sharp';
import { generateThumbnails } from '../scripts/generate-thumbnails.mjs';
import { selectImageAttributes } from '../src/lib/imageAttributes.mjs';

sharp.cache(false);

async function removePath(path) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(path, { recursive: true, force: true });
      return;
    } catch (error) {
      if (error?.code !== 'EBUSY' || attempt === 9) throw error;
      await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
}

async function removeDirectory(path) {
  await removePath(path);
}

test('thumbnail generation preserves sources, dimensions, transparency, cache and replacement URLs', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wiki-thumbnails-'));
  t.after(() => removeDirectory(root));
  const images = join(root, 'public/images');
  await mkdir(images, { recursive: true });
  const original = await sharp({ create: { width: 1200, height: 800, channels: 3, background: '#148080' } }).jpeg().toBuffer();
  await writeFile(join(images, '花 譜.jpg'), original);
  await writeFile(join(images, 'same.jpg'), original);
  await sharp({ create: { width: 32, height: 16, channels: 4, background: { r: 20, g: 20, b: 20, alpha: 0.3 } } }).png().toFile(join(images, 'small.png'));
  await writeFile(join(images, 'invalid.jpg'), 'not an image');
  const run = () => generateThumbnails({ root, log: () => {} });
  const manifest = async () => JSON.parse(await readFile(join(root, '.cache/image-thumbnails/manifest.json'), 'utf8'));
  const result = await run();
  assert.equal(result.sources, 4);
  assert.equal(result.skipped.length, 1);
  assert.deepEqual(await readFile(join(images, '花 譜.jpg')), original);
  const first = (await manifest()).images;
  assert.deepEqual(first['/images/花 譜.jpg'].variants.map(v => v.width), [96, 192, 480, 960]);
  assert.deepEqual(first['/images/花 譜.jpg'].variants, first['/images/same.jpg'].variants);
  const tiny = first['/images/small.png'].variants;
  assert.equal(tiny.length, 1);
  assert.equal(tiny[0].width, 32);
  const metadata = await sharp(join(root, 'public', tiny[0].src)).metadata();
  assert.equal(metadata.hasAlpha, true);
  assert.equal(metadata.height, 16);
  const thumb = join(root, 'public', first['/images/花 譜.jpg'].variants[0].src);
  const oldTime = (await stat(thumb)).mtimeMs;
  assert.equal((await run()).generated, 0);
  assert.equal((await stat(thumb)).mtimeMs, oldTime);
  await removePath(thumb);
  await removePath(join(root, 'node_modules/.astro/kamitsubaki-thumbs'));
  assert.ok((await run()).generated >= 1);
  await sharp(original).negate().jpeg().toFile(join(images, '花 譜.jpg'));
  await run();
  assert.notEqual((await manifest()).images['/images/花 譜.jpg'].variants[0].src, first['/images/花 譜.jpg'].variants[0].src);
});

test('a fresh Pages checkout restores thumbnails using only the Astro build cache', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wiki-pages-thumbnails-'));
  t.after(() => removeDirectory(root));
  await mkdir(join(root, 'public/images'), { recursive: true });
  await sharp({ create: { width: 320, height: 160, channels: 3, background: 'blue' } })
    .png().toFile(join(root, 'public/images/cover.png'));
  const run = () => generateThumbnails({ root, log: () => {} });
  await run();
  const manifestPath = join(root, '.cache/image-thumbnails/manifest.json');
  const originalManifest = await readFile(manifestPath, 'utf8');
  assert.equal(await readFile(join(root, 'node_modules/.astro/kamitsubaki-thumbs/manifest.json'), 'utf8'), originalManifest);

  await removePath(join(root, 'public/thumbnails'));
  await removePath(join(root, '.cache/image-thumbnails'));
  const restored = await run();
  assert.equal(restored.generated, 0);
  assert.equal(restored.cached, 1);
  assert.equal(await readFile(manifestPath, 'utf8'), originalManifest);
  for (const variant of JSON.parse(originalManifest).images['/images/cover.png'].variants) {
    assert.equal((await stat(join(root, 'public', variant.src))).size, variant.bytes);
  }
});

test('EXIF rotation is applied before responsive dimensions are recorded', async t => {
  const root = await mkdtemp(join(tmpdir(), 'wiki-image-orientation-'));
  t.after(() => removeDirectory(root));
  await mkdir(join(root, 'public/images'), { recursive: true });
  await sharp({ create: { width: 300, height: 600, channels: 3, background: 'red' } }).withMetadata({ orientation: 6 }).jpeg().toFile(join(root, 'public/images/rotate.jpg'));
  await generateThumbnails({ root, log: () => {} });
  const entry = JSON.parse(await readFile(join(root, '.cache/image-thumbnails/manifest.json'), 'utf8')).images['/images/rotate.jpg'];
  assert.equal(entry.width, 600); assert.equal(entry.height, 300);
  const output = await sharp(join(root, 'public', entry.variants[0].src)).metadata();
  assert.equal(output.width, 96); assert.equal(output.height, 48);
});

test('small slots expose only small candidates; high-density displays and originals have safe fallbacks', () => {
  const entry = { width: 1600, height: 900, variants: [96, 192, 480, 960].map(width => ({ src: `/thumbnails/hash-${width}.webp`, width })) };
  const small = selectImageAttributes('/images/cover.jpg', entry, { widths: [96, 192], sizes: '80px' });
  assert.equal(small.src, '/thumbnails/hash-96.webp');
  assert.equal(small.srcset, '/thumbnails/hash-96.webp 96w, /thumbnails/hash-192.webp 192w');
  assert.equal(small.sizes, '80px');
  assert.equal(small.width / small.height, 1600 / 900);
  assert.equal(selectImageAttributes('/images/cover.jpg', entry, { widths: [2000, 3000] }).srcset, '/thumbnails/hash-960.webp 960w');
  for (const src of ['/brand/logo.svg', 'https://example.com/remote.jpg', '/images/missing.jpg']) assert.deepEqual(selectImageAttributes(src), { src, decoding: 'async' });
});
