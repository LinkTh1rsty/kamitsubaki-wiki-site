import {normalizeYamlDates} from './yaml-compat';
import { generateJSON, type Editor, type JSONContent } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { closeHistory, isHistoryTransaction } from '@tiptap/pm/history';
import { parseDocument } from 'yaml';
import { importMarkdown as importLegacyDocument, blockMarkdown, newBlock, newDraft } from '../../../../src/lib/visualEditor.mjs';
import { collectionByType } from '../../../../src/lib/contentLayout.mjs';
import { documentTemplates, type DocumentTemplateType } from './document-templates';
import { metadataForSave } from './metadata-output';
import {imageFigureAttributes} from './image-format';

export type WikiMetadata = Record<string, any>;
export type WikiBlockData = Record<string, any> & { type: string };
export type SourceGroup = { id: string; source: string; snapshot: string; start: number; end: number };
export type WikiDocumentContext = {
  source: string; metadataSource: string; metadata: WikiMetadata; body: string;
  groups: SourceGroup[]; snapshot: string; newline: string; bom: string;
};
export type LoadedWikiDocument = { context: WikiDocumentContext; metadata: WikiMetadata; path: string };
type SourceOrigins = { current?: WikiDocumentContext; documents: Map<string, WikiDocumentContext> };
const sourceOrigins = new WeakMap<Editor, SourceOrigins>();
function documentIdentity(editor: Editor, snapshot = contentSnapshot(editor.getJSON())) {
  const groups: (string | null)[] = [];
  editor.state.doc.forEach(node => groups.push(node.attrs.wikiSourceId || null));
  return JSON.stringify([editor.state.doc.attrs.wikiMetadata, groups]) + '\0' + snapshot;
}
function originsFor(editor: Editor) {
  let origins = sourceOrigins.get(editor);
  if (!origins) {
    origins = { documents: new Map() }; sourceOrigins.set(editor, origins);
    const tracked = origins;
    // ProseMirror owns undo/redo. This only restores the Markdown provenance
    // belonging to the document it restored, including YAML comments and EOLs.
    editor.on('transaction', ({ transaction }) => {
      if (!isHistoryTransaction(transaction)) return;
      const context = tracked.documents.get(documentIdentity(editor));
      if (context) tracked.current = context;
    });
  }
  return origins;
}

function importDocument(source: string, path = '') {
  try { return importLegacyDocument(source, 'articles', path) as any; }
  catch (error: any) {
    const messages: Record<string, string> = { localeError: '目前支持编辑简体中文、日文和英文。繁体页面由简体原文自动生成，请打开对应的简体词条编辑。', frontmatter: '文件开头需要有完整的词条属性，请导入从本站编辑器导出的 Markdown 文件。', fileSize: '这份 Markdown 文件过大，请拆分内容后再导入。' };
    throw new Error(messages[error.message] || error.message);
  }
}
export function validateDocumentSource(source: string): WikiMetadata {
  return importDocument(source).meta;
}

// Only source provenance is removed. Domain attributes remain part of the comparison.
export function contentSnapshot(value: any): string {
  const clean = (entry: any): any => {
    if (Array.isArray(entry)) return entry.map(clean);
    if (!entry || typeof entry !== 'object') return entry;
    return Object.fromEntries(Object.entries(entry)
      .filter(([key, val]) => key !== 'wikiSourceId' && key !== 'wikiMetadata' && val !== null && val !== undefined)
      .map(([key, val]) => [key, clean(val)]));
  };
  return JSON.stringify(clean(value));
}

const domainBlocks = new Set(['speech', 'speech-roles', 'media', 'media-switcher', 'details', 'lyrics', 'math', 'preserved']);
function asDomainNode(block: WikiBlockData): JSONContent {
  const data = structuredClone(block);
  // Original source preservation belongs to the document adapter, not node UI.
  delete data.originalSnapshot;
  delete data.originalSource;
  return { type: 'wikiBlock', attrs: { data, source: block.originalSource ?? blockMarkdown(block), edited: false } };
}

function readWikiContent(editor: Editor, source: string, path = '') {
  const draft = importDocument(source, path);
  const json: JSONContent = { type: 'doc', content: [] };
  const normalizedBody = String(draft.originalBody).replaceAll('\r\n', '\n');
  const groups: SourceGroup[] = [];
  let cursor = 0;
  for (const block of draft.blocks as WikiBlockData[]) {
    const raw = String(block.originalSource ?? blockMarkdown(block, draft.meta.locale));
    let content: JSONContent[];
    // Authored HTML blocks and future syntax are preserved explicitly. They are
    // editable in the source dialog instead of being flattened by a generic schema.
    if (/^\s*<table\b/i.test(raw)) {
      // HTML is the existing public format for merged cells and saved widths.
      // Reopen it as a table, including semantic Wiki nodes in its cells.
      const template = document.createElement('template');
      template.innerHTML = raw;
      const walker = document.createTreeWalker(template.content, 4);
      const texts: Text[] = [];
      while (walker.nextNode()) texts.push(walker.currentNode as Text);
      for (const text of texts) {
        if (text.parentElement?.closest('code,pre,script,style') || !/\{\{|\$|\[\[/.test(text.data)) continue;
        const parsed = editor.storage.markdown.parser.parse(text.data);
        const cell = document.createElement('template'); cell.innerHTML = parsed;
        const paragraph = cell.content.querySelector('p');
        if (paragraph && cell.content.querySelectorAll('p').length === 1) text.replaceWith(...Array.from(paragraph.childNodes));
      }
      content = generateJSON(template.innerHTML, editor.options.extensions).content ?? [];
      if (!content.some(node => node.type === 'table')) content = [asDomainNode({ ...block, type: 'preserved', text: raw })];
    } else if (/^\s*<figure\b/i.test(raw)) {
      const template = document.createElement('template'); template.innerHTML = raw;
      const figure = template.content.firstElementChild;
      content = figure instanceof HTMLElement && imageFigureAttributes(figure) ? generateJSON(raw, editor.options.extensions).content || [] : [asDomainNode({...block, type: 'preserved', text: raw})];
    } else if (domainBlocks.has(block.type) || /^\s*<(?:div|details|dl|!--)\b/i.test(raw)) {
      content = [asDomainNode(block.type === 'paragraph' ? { ...block, type: 'preserved' } : block)];
    } else if (block.type === 'image') {
      content = [{ type: 'image', attrs: { src: block.url, alt: block.text, title: null, caption: block.caption ?? '' } }];
    } else {
      const html = editor.storage.markdown.parser.parse(raw);
      content = generateJSON(html, editor.options.extensions).content ?? [];
      if (!content.length) content = [asDomainNode({ ...block, type: 'preserved', text: raw })];
    }
    const id = crypto.randomUUID();
    for (const node of content) node.attrs = { ...node.attrs, wikiSourceId: id };
    json.content!.push(...content);
    const start = normalizedBody.indexOf(raw, cursor);
    groups.push({ id, source: raw, snapshot: '', start, end: start < 0 ? -1 : start + raw.length });
    if (start >= 0) cursor = start + raw.length;
  }
  if (!json.content!.length) json.content = [{ type: 'paragraph' }];
  return { draft, json, groups };
}

// Uses the same Markdown, HTML-table and Wiki-node parser as document loading.
// Unwrapping a disclosure must retain its nested formats and future content.
export function parseWikiBody(editor: Editor, body: string, locale = 'zh'): JSONContent[] {
  const source = `---\nschemaVersion: 2\nid: inline-conversion\nlocale: ${locale}\nentityType: editorial-article\ntitle: 正文\n---\n\n${body}`;
  return readWikiContent(editor, source).json.content || [];
}

export function loadWikiDocument(editor: Editor, source: string, path = '', addToHistory = false): LoadedWikiDocument {
  const { draft, json, groups } = readWikiContent(editor, source, path);
  const origins = originsFor(editor);
  if (!addToHistory) origins.documents.clear();
  else if (origins.current) origins.documents.set(documentIdentity(editor), origins.current);
  editor.chain().setContent(json, false).command(({ tr }) => { tr.setDocAttribute('wikiMetadata', structuredClone(draft.meta)); tr.setMeta('addToHistory', addToHistory); if (addToHistory) closeHistory(tr); return true; }).run();
  const actual = editor.getJSON();
  for (const group of groups) group.snapshot = contentSnapshot(actual.content?.filter(node => node.attrs?.wikiSourceId === group.id) ?? []);
  const metadata = structuredClone(draft.meta);
  const context: WikiDocumentContext = {
    source, metadataSource: draft.originalMeta, metadata: structuredClone(metadata),
    body: draft.originalBody, groups, snapshot: contentSnapshot(actual),
    newline: source.includes('\r\n') ? '\r\n' : '\n', bom: source.startsWith('\uFEFF') ? '\uFEFF' : '',
  };
  origins.current = context; origins.documents.set(documentIdentity(editor, context.snapshot), context);
  return { metadata, path, context };
}

export function exportWikiDocument(editor: Editor, context: WikiDocumentContext, metadata: WikiMetadata): string {
  const snapshot = contentSnapshot(editor.getJSON());
  const origins = sourceOrigins.get(editor);
  context = origins?.documents.get(documentIdentity(editor, snapshot)) || origins?.current || context;
  metadata = metadataForSave(metadata, context.metadata);
  const metadataSame = JSON.stringify(metadata) === JSON.stringify(context.metadata);
  const documentSame = snapshot === context.snapshot;
  // A no-op save is byte-for-byte, including YAML comments, BOM and line endings.
  if (metadataSame && documentSame) return normalizeYamlDates(context.source);
  const current: { id: string | null; nodes: ProseMirrorNode[] }[] = [];
  editor.state.doc.forEach(node => {
    const id = node.attrs.wikiSourceId || null;
    const last = current.at(-1);
    if (last && id && last.id === id) last.nodes.push(node);
    else current.push({ id, nodes: [node] });
  });
  const original = new Map(context.groups.map(group => [group.id, group]));
  const chunks = current.map(group => {
    const before = group.id ? original.get(group.id) : undefined;
    if (before?.snapshot === contentSnapshot(group.nodes.map(node => node.toJSON()))) return before.source;
    return editor.storage.markdown.serializer.serialize(editor.schema.node('doc', null, group.nodes)).trimEnd();
  });
  let body: string;
  if (documentSame) body = context.body;
  else if (current.length === context.groups.length && current.every((group, index) =>
    group.id === context.groups[index].id && context.groups[index].start >= 0)) {
    body = context.body.replaceAll('\r\n', '\n');
    for (let index = current.length - 1; index >= 0; index--) {
      const range = context.groups[index];
      body = body.slice(0, range.start) + chunks[index] + body.slice(range.end);
    }
    if (context.newline === '\r\n') body = body.replaceAll('\n', '\r\n');
  } else body = context.newline + chunks.join(context.newline.repeat(2)) + context.newline;
  let frontmatter = context.metadataSource;
  if (!metadataSame) {
    const document = parseDocument(frontmatter || '{}');
    if (document.errors.length) throw new Error('Frontmatter 无法解析');
    const old = document.toJS({ maxAliasCount: 100 });
    for (const key of Object.keys(old ?? {})) if (!(key in metadata)) document.delete(key);
    for (const [key, value] of Object.entries(metadata)) {
      if (JSON.stringify(old?.[key]) !== JSON.stringify(value)) document.set(key, value);
    }
    frontmatter = document.toString({ lineWidth: 0 }).trimEnd();
  }
  frontmatter = frontmatter.replaceAll('\r\n', '\n').replaceAll('\n', context.newline);
  return normalizeYamlDates(`${context.bom}---${context.newline}${frontmatter}${context.newline}---${context.newline}${body}`);
}

export function createDomainBlock(type: string): WikiBlockData {
  const block = newBlock(type) as WikiBlockData;
  if (type === 'details') Object.assign(block, { title: '补充说明', text: '在这里补充资料。' });
  if (type === 'media-switcher') Object.assign(block, { title: '视听资料' });
  if (type === 'math') block.text = 'x^2 + y^2 = 1';
  if (type === 'lyrics') block.rows = [{ original: '歌词', kana: '', romaji: '', translation: '', time: '' }];
  return block;
}

export function newDocumentSource(locale = 'zh', type: DocumentTemplateType = 'editorial-article') {
  if (!['zh', 'ja', 'en'].includes(locale)) throw new Error('请选择简体中文、日文或英文。');
  if (!documentTemplates.some(template => template.type === type)) throw new Error('请选择有效的词条类型。');
  const metadata = {
    ...newDraft((collectionByType as Record<string, string>)[type], locale).meta,
    id: 'local-' + crypto.randomUUID(),
    entityType: type,
  };
  const document = parseDocument('');
  for (const [key, value] of Object.entries(metadata)) document.set(key, value);
  return `---\n${document.toString({ lineWidth: 0 }).trimEnd()}\n---\n\n`;
}
