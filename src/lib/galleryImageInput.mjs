import { resolveLocaleCopy } from './i18n.mjs';

const uploadTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const galleryImageAccept = [...uploadTypes, 'image/heic', 'image/heif', '.heic', '.heif'].join(',');

export function isGalleryHeic(file) {
  return /^image\/hei[cf](?:-sequence)?$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

export function galleryHeicCopy(locale) {
  return resolveLocaleCopy({
    zh: { converting: '正在转换 HEIC…', failed: '无法转换这张 HEIC 图片，请重新选择。', note: 'HEIC／HEIF 会在浏览器中转换为 JPEG。' },
    en: { converting: 'Converting HEIC…', failed: 'This HEIC image could not be converted. Choose it again or select another file.', note: 'HEIC and HEIF are converted to JPEG in your browser.' },
    ja: { converting: 'HEIC を変換中…', failed: 'この HEIC 画像を変換できませんでした。ファイルを選び直してください。', note: 'HEIC・HEIF はブラウザーで JPEG に変換されます。' },
  }, locale);
}

export async function prepareGalleryImage(file) {
  if (!isGalleryHeic(file)) return uploadTypes.includes(file.type) ? file : null;
  const { heicTo } = await import('heic-to/csp');
  const jpeg = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
  return new File([jpeg], file.name.replace(/\.[^.]+$/, '') + '.jpg', {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}
