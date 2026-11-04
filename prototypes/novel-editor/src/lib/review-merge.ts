import {normalizeYamlDates} from './yaml-compat';
import { diff3Merge } from 'node-diff3';
import { parseDocument } from 'yaml';
export type MergeChoice = 'mine' | 'current';
export type MergePiece = { id: string; key?: string; ok?: string[]; mine?: string[]; current?: string[] };
export type ReviewMergePlan = { metadata: MergePiece[]; body: MergePiece[]; current: string; original: Record<string, any>; yours: Record<string, any>; latest: Record<string, any> };
function unpack(source: string) {
  const match = source.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw Error('比较版本缺少词条属性，请重新连接后检查。');
  const document = parseDocument(match[1]);
  if (document.errors.length) throw Error('比较版本的词条属性无法读取，请保留本地草稿。');
  const metadata = document.toJS({ maxAliasCount: 100 });
  if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw Error('比较版本的词条属性格式不正确。');
  return { match, document, metadata, body: source.slice(match[0].length), newline: match[0].includes('\r\n') ? '\r\n' : '\n', bom: source.startsWith('\uFEFF') ? '\uFEFF' : '' };
}
export function planReviewMerge(original: string, mine: string, current: string): ReviewMergePlan {
  const o = unpack(original), a = unpack(mine), b = unpack(current);
  for (const key of ['id', 'entityType', 'locale', 'translationKey']) if (a.metadata[key] !== o.metadata[key] || b.metadata[key] !== o.metadata[key]) throw Error('词条的身份信息已变化，请保留草稿并重新打开对应词条。');
  const parts = (a: string[], o: string[], b: string[], prefix: string, key?: string): MergePiece[] => diff3Merge(a, o, b).map((part, index) => ({ id: prefix + index, key, ...(part.ok ? { ok: part.ok } : { mine: part.conflict!.a, current: part.conflict!.b }) }));
  const metadata = [...new Set([...Object.keys(b.metadata), ...Object.keys(o.metadata), ...Object.keys(a.metadata)])].flatMap(key => {
    const token = (data: Record<string, any>) => JSON.stringify([Object.hasOwn(data, key), data[key]]);
    return parts([token(a.metadata)], [token(o.metadata)], [token(b.metadata)], 'property:' + key + ':', key);
  });
  const lines = (body: string) => body.replaceAll('\r\n', '\n').split('\n');
  return { metadata, body: parts(lines(a.body), lines(o.body), lines(b.body), 'paragraph:'), current, original: o.metadata, yours: a.metadata, latest: b.metadata };
}
export function resolveReviewMerge(plan: ReviewMergePlan, choices: Record<string, MergeChoice>): string {
  const chosen = (piece: MergePiece) => {
    if (piece.ok) return piece.ok;
    if (!['mine', 'current'].includes(choices[piece.id])) throw Error('请为每处重叠修改选择要保留的版本。');
    return piece[choices[piece.id]]!;
  };
  const latest = unpack(plan.current), next: Record<string, any> = Object.create(null);
  for (const part of plan.metadata) { const [present, value] = JSON.parse(chosen(part)[0]); if (present) next[part.key!] = value; }
  for (const key of Object.keys(latest.metadata)) if (!Object.hasOwn(next, key)) latest.document.delete(key);
  let changed = false;
  for (const [key, value] of Object.entries(next)) if (JSON.stringify(value) !== JSON.stringify(latest.metadata[key])) { latest.document.set(key, value); changed = true; }
  if (Object.keys(next).length !== Object.keys(latest.metadata).length) changed = true;
  const frontmatter = changed ? `${latest.bom}---${latest.newline}${latest.document.toString({ lineWidth: 0 }).trimEnd().replaceAll('\n', latest.newline)}${latest.newline}---${latest.newline}` : latest.match[0];
  return normalizeYamlDates(frontmatter + plan.body.flatMap(chosen).join(latest.newline));
}
