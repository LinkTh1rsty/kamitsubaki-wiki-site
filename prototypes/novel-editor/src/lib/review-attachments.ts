import { parseVisualBlocks } from '../../../../src/lib/visualEditor.mjs';
import MarkdownIt from 'markdown-it';
export type ReviewAttachment = { url: string; originalUrl?: string; alt: string; source: string; staged?: { purpose: 'entry' | 'article'; id: string; ownerId: string; size: number; mime: string; source?: string; alt?: string; image?: import('./article-document').ArticleImage } };
const markdown = new MarkdownIt({ html: true });
export function reviewAttachments(content: string, blocks: any[], ledger: ReviewAttachment[] = [], metadata: Record<string, any> = {}): ReviewAttachment[] {
  const images = new Map<string, ReviewAttachment>();
  const referenced = new Set<string>();
  const collect = (nodes: any[]) => { for (const node of nodes) { if (node.type === 'image') { referenced.add(node.url); images.set(node.url, { url: node.url, alt: node.text || '', source: node.caption || '' }); } if (node.type === 'speech-roles') for(const role of node.roles||[]) { if(role.avatar){referenced.add(role.avatar);images.set(role.avatar,{url:role.avatar,alt:role.name+'头像',source:''});}} if (['details','speech'].includes(node.type) && node.text) collect(parseVisualBlocks(node.text)); } };
  collect(blocks);
  const remember = (url: string, alt = '') => { referenced.add(url); if (!images.has(url)) images.set(url, { url, alt, source: '' }); };
  const scan = (tokens: ReturnType<typeof markdown.parse>) => { for (const token of tokens) {
    if (token.type === 'image') remember(token.attrGet('src') || '', token.content);
    if (token.children) scan(token.children);
    if (token.type === 'html_block' || token.type === 'html_inline') for (const image of token.content.matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)) remember(image[1]);
  } };
  scan(markdown.parse(content.replace(/^(?:\uFEFF)?---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, ''), {}));
  for (const url of [metadata.image, metadata.presentation?.image]) if (typeof url === 'string' && url) remember(url, metadata.name || metadata.title || '词条封面');
  const saved = ledger.filter(asset => referenced.has(asset.url) || asset.originalUrl && referenced.has(asset.originalUrl)).map(asset => {
    const url = referenced.has(asset.url) ? asset.url : asset.originalUrl!;
    return { ...asset, url, alt: images.get(url)?.alt || asset.alt };
  });
  return [...new Map([...saved, ...[...referenced].filter(url => url.startsWith('/images/novel-prototype/')).map(url => images.get(url)!)].map(asset => [asset.url, asset])).values()];
}
export function canAdoptSubmission(current: string, submitted: string | undefined, canonical: string) {
  return current === canonical || current === submitted;
}
export async function prepareReviewImage(asset: ReviewAttachment, source: string, request: typeof fetch) {
  const original = asset.originalUrl || asset.url;
  if (!/^\/images\/novel-prototype\/[a-f0-9]{64}\.(png|jpg|webp|gif)$/.test(original) && !(asset.staged?.purpose === 'entry' && /^\/images\/contributions\/[a-f0-9]{64}\.(png|jpg|webp)$/.test(original))) throw Error('这张图片缺少可读取的原图，请返回正文重新选择图片。');
  if (!source.trim() || source.length > 2048 || /[\u0000-\u001f\u007f]/.test(source)) throw Error('请为每张图片填写一行来源链接或授权说明。');
  if (original.endsWith('.gif')) throw Error('GIF 目前只支持本地预览。投稿时请返回正文，改用 PNG、JPEG 或 WebP 图片。');
  let response: Response;
  try { response = await request(original, { credentials: 'same-origin' }); } catch { throw Error('图片读取中断，恢复网络后可重试。正文与原图仍保留在本地。'); }
  if (!response.ok) throw Error('本机原图找不到了，请返回正文重新选择图片。');
  const blob = await response.blob();
  const types: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' };
  const file = new File([blob], asset.alt || '投稿图片', { type: blob.type || types[original.split('.').at(-1)!] });
  const { imageCandidate, originalImage, imageBase64 } = await import('../../../../src/lib/editorAttachments.mjs');
  const candidate = await imageCandidate(file);
  const metadata = await originalImage(candidate.file, source, asset.alt);
  return { metadata, content: await imageBase64(candidate.file), originalUrl: original, optimized: candidate.optimized };
}
