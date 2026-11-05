import {SpeechBlockPreview} from '@/components/speech-tools';
import {editorFetch as fetch,editorHost,localEditorHost,previewAssetUrl,previewHTML,restoreBrowserImages,registerStagedImages} from '@/lib/editor-host';
import { Extension, Node, Mark, mergeAttributes, nodeInputRule, type Editor } from '@tiptap/core';
import { DOMSerializer } from '@tiptap/pm/model';
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { Markdown } from 'tiptap-markdown';
import { StarterKit, TiptapLink, TiptapUnderline, TiptapImage, HighlightExtension, TaskList, TaskItem, Placeholder, CharacterCount, GlobalDragHandle, UploadImagesPlugin } from 'novel';
import { useContext, useEffect, useRef, useState } from 'react';
import Moveable from 'react-moveable';
import {closeHistory} from '@tiptap/pm/history';
import {imageDimension, imageFigureAttributes, imageMarkdown, publicImageAttributes} from '@/lib/image-format';
import { CatalogContext } from '@/components/entity-picker';
import { Pencil, Play, ImageIcon, Music2, ChevronRight, FileText, Sigma, Tv } from 'lucide-react';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { blockMarkdown, escapeHtml, safeUrl } from '../../../../src/lib/visualEditor.mjs';
import { splitShortcodeArguments } from '../../../../src/lib/shortcodeArguments.mjs';
import { renderInlineShortcode } from '../../../../src/lib/wikiInlineShortcodes.mjs';
import { resolveMediaEmbed } from '../../../../src/lib/mediaEmbed.mjs';
import type { WikiBlockData } from '@/lib/wiki-document';
import { WikiDragScrolling } from './drag-scrolling';

export type EditNode = (editor: Editor, position: number) => void;
const e = (value: any) => escapeHtml(String(value ?? ''));
const pipeSafe = (source: string) => source.replace(/\\*\|/g, value => value.length % 2 === 0 ? value : '\\' + value);
const prose = new MarkdownIt({ html: false, breaks: true });
prose.inline.ruler.before('text', 'wiki-inline', (state, silent) => {
  const remaining = state.src.slice(state.pos);
  const match = remaining.match(/^\{\{([a-z-]+)(::(?:\\.|[^{}])*)\}\}/);
  const math = remaining.match(/^\$([^$\n]+)\$/);
  const attrs = match ? parseInlineSource(match[0]) : null;
  if (!attrs && !math) return false;
  if (!silent) {
    const token = state.push('html_inline', '', 0);
    const rendered = attrs && renderInlineShortcode(attrs.kind, attrs.args);
    token.content = math ? katex.renderToString(math[1], { throwOnError: false, trust: false })
      : typeof rendered === 'string' ? rendered : e(rendered?.value || match![0]);
  }
  state.pos += (match?.[0] || math![0]).length;
  return true;
});
export const renderNestedMarkdown = (source: string) => prose.render(source);
export const inlineLabels: Record<string, string> = { 'wiki-link': '词条链接', ruby: '振假名注音', spoiler: '剧透遮罩', mark: '高亮', abbr: '缩写说明', kbd: '按键', time: '日期', small: '小字', sub: '下标', sup: '上标', 'zh-variant': '中文变体', ja: '日语文本', math: '行内公式' };
export const blockLabels: Record<string, string> = { speech:'发言', 'speech-roles':'角色配置', media: '媒体', 'media-switcher': '媒体切换', details: '折叠说明', lyrics: '歌词时间轴', math: '数学公式', preserved: '保留内容' };
export function parseInlineSource(source: string) {
  const match = source.match(/^\{\{([a-z-]+)(::(?:\\.|[^{}])*)\}\}$/);
  return match ? { kind: match[1], args: splitShortcodeArguments(match[2]) as string[], syntax: 'shortcode', source } : null;
}
export function serializeInline(attrs: any) {
  if (attrs.source) return attrs.source;
  if (attrs.syntax === 'wiki-link' || attrs.kind === 'wiki-link') return `[[${attrs.args[0]}${attrs.args[1] ? '|' + attrs.args[1] : ''}]]`;
  if (attrs.syntax === 'math') return `$${attrs.args[0]}$`;
  if (attrs.syntax === 'html' && attrs.kind === 'ruby') return `<ruby>${e(attrs.args[0])}${attrs.args[1] ? `<rt class="furi">${e(attrs.args[1])}</rt>` : ''}${attrs.args[2] ? `<rt class="roma">${e(attrs.args[2])}</rt>` : ''}</ruby>`;
  return `{{${attrs.kind}::${(attrs.args as string[]).map(value => String(value).replaceAll('\\', '\\\\').replaceAll('::', '\\:\\:')).join('::')}}}`;
}
export function renderInlineAttributes(attrs: any) {
  if (attrs.kind === 'wiki-link') return e(serializeInline(attrs));
  if (attrs.kind === 'ruby') return `<ruby>${e(attrs.args[0])}${attrs.args[1] ? `<rt class="furi">${e(attrs.args[1])}</rt>` : ''}${attrs.args[2] ? `<rt class="roma">${e(attrs.args[2])}</rt>` : ''}</ruby>`;
  return renderInlineShortcode(attrs.kind, attrs.args);
}
function InlineView(props: NodeViewProps) {
  const attrs = props.node.attrs;
  const { entries, locale } = useContext(CatalogContext);
  const entry = attrs.kind === 'wiki-link' ? entries.find(entry => entry.id === attrs.args[0] && entry.locale === locale) || entries.find(entry => entry.id === attrs.args[0]) : null;
  const rendered = renderInlineAttributes(attrs);
  const content = attrs.kind === 'wiki-link' ? `<span class="wiki-link">${e(attrs.args[1] || entry?.title || attrs.args[0])}</span>` : attrs.kind === 'math' ? katex.renderToString(attrs.args[0] || '', { throwOnError: false, trust: false }) : typeof rendered === 'string' ? rendered : e(rendered?.value || attrs.args[0] || serializeInline(attrs));
  return <NodeViewWrapper as="span" className={`wiki-inline wiki-inline-${attrs.kind}`} contentEditable={false}>
    <span role="button" tabIndex={0} title={`${inlineLabels[attrs.kind] || '特殊语法'} · 点击编辑`} onClick={() => { props.editor.commands.setNodeSelection(props.getPos()); props.extension.options.onEdit?.(props.editor, props.getPos()); }}
      onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); props.extension.options.onEdit?.(props.editor, props.getPos()); } }} dangerouslySetInnerHTML={{ __html: content }} />
  </NodeViewWrapper>;
}
function MediaPanel({ provider, url, caption }: { provider: string; url: string; caption?: string }) {
  const [playing, setPlaying] = useState(false);
  const media = resolveMediaEmbed(provider, url);
  if (playing && media) return <iframe src={media.src} title={caption || media.label} className="wiki-media-frame" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen loading="lazy" />;
  return <div className="wiki-media-placeholder">
    <Play aria-hidden="true" /><strong>{caption || media?.label || '添加媒体链接'}</strong>
    <p>{media ? '点击播放官方平台内容' : '点击编辑，填写平台和链接'}</p>
    {media ? <Button size="sm" variant="secondary" onClick={() => setPlaying(true)}><Play data-icon="inline-start" />播放</Button> : null}
  </div>;
}
function PreservedPreview({ source }: { source: string }) {
  const [html, setHtml] = useState(''); const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    fetch('/__novel/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }), signal: controller.signal }).then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error); restoreBrowserImages(source).then(()=>setHtml(previewHTML(result.html))); }).catch(error => { if (error.name !== 'AbortError') setError('预览暂时无法读取，原有内容仍完整保留。'); });
    return () => controller.abort();
  }, [source]);
  return html ? <div className="wiki-preserved-preview" dangerouslySetInnerHTML={{ __html: html }} /> : <p>{error || '正在读取原有内容…'}</p>;
}
function BlockView(props: NodeViewProps) {
  const data = props.node.attrs.data as WikiBlockData;
  const edit = () => { props.editor.commands.setNodeSelection(props.getPos()); props.extension.options.onEdit?.(props.editor, props.getPos()); };
  if(data.type==='speech-roles')return <NodeViewWrapper className="speech-registry-node" contentEditable={false} aria-hidden="true"/>;
  if(data.type==='speech')return <NodeViewWrapper className="speech-editor-block" contentEditable={false} data-wiki-block="speech"><SpeechBlockPreview editor={props.editor} roleId={data.roleId}><PreservedPreview source={data.text||''}/></SpeechBlockPreview><Button className="speech-edit-button" size="icon-sm" variant="ghost" aria-label="编辑发言" onClick={edit}><Pencil/></Button><div data-node-editor-slot/></NodeViewWrapper>;
  const Icon = data.type === 'lyrics' ? Music2 : data.type === 'math' ? Sigma : data.type === 'details' ? ChevronRight : data.type === 'preserved' ? FileText : Tv;
  return <NodeViewWrapper className="wiki-domain-block" contentEditable={false} data-wiki-block={data.type}>
    <div className="wiki-block-header"><span><Icon aria-hidden="true" />{blockLabels[data.type] || data.type}{data.title ? ` · ${data.title}` : ''}</span>{data.type !== 'preserved' ? <Button size="sm" variant="ghost" aria-label={`编辑${blockLabels[data.type] || '片段'}`} onClick={edit}><Pencil data-icon="inline-start" />编辑</Button> : <span>原有内容</span>}</div>
    <div data-node-editor-slot />
    <div className="wiki-block-preview">{data.type === 'media-switcher' ? <Tabs defaultValue="0">
      <TabsList variant="line">{(data.items || []).map((item: any, index: number) => <TabsTrigger value={String(index)} key={index}>{({ youtube: 'YouTube', bilibili: 'Bilibili', spotify: 'Spotify', 'apple-music': 'Apple Music', netease: '网易云音乐', 'qq-music': 'QQ 音乐' } as any)[item.provider] || item.provider}</TabsTrigger>)}</TabsList>
      {(data.items || []).map((item: any, index: number) => <TabsContent value={String(index)} key={index}><MediaPanel key={item.url} provider={item.provider} url={item.url} caption={item.caption || data.title} /></TabsContent>)}
    </Tabs> : data.type === 'media' ? <MediaPanel key={data.url} provider={data.provider} url={data.url} caption={data.caption} />
      : data.type === 'details' ? <details open><summary>{data.title || '补充说明'}</summary><div className="wiki-nested-prose"><PreservedPreview source={data.text || ''} /></div></details>
        : data.type === 'lyrics' ? <div className="wiki-lyrics">{(data.rows || []).map((row: any, index: number) => <div className="wiki-lyric-row" key={index}>
          <span className="wiki-timestamp">{row.units?.[0]?.time || row.time || '—'}</span><div>
            <p>{(row.units?.length ? row.units : [row]).map((unit: any, unitIndex: number) => <ruby key={unitIndex}>{unit.original}{unit.kana ? <rt>{unit.kana}</rt> : null}{unit.romaji ? <rt className="roma">{unit.romaji}</rt> : null}</ruby>)}</p>
            {row.translation ? <p className="wiki-lyric-translation">{row.translation}</p> : null}
          </div></div>)}</div>
          : data.type === 'math' ? <div className="wiki-math" dangerouslySetInnerHTML={{ __html: katex.renderToString(data.text || '', { displayMode: data.display !== false, throwOnError: false, trust: false }) }} />
            : <PreservedPreview source={props.node.attrs.source || data.text} />}</div>
  </NodeViewWrapper>;
}
function ImageView(props: NodeViewProps) {
  const attrs = props.node.attrs;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const moveable = useRef<Moveable | null>(null);
  useEffect(() => { if (!props.selected || !image || !container) return; const frame = requestAnimationFrame(() => moveable.current?.updateRect()); return () => cancelAnimationFrame(frame); }, [props.selected, image, container]);
  return <NodeViewWrapper ref={setContainer} as="figure" className="wiki-article-image" contentEditable={false}>
    {safeUrl(attrs.src) ? <img ref={setImage} src={previewAssetUrl(attrs.src)} alt={attrs.alt || ''} title={attrs.title || undefined} width={imageDimension(attrs.width) || undefined} height={imageDimension(attrs.height) || undefined} style={{width: imageDimension(attrs.width) || undefined, height: 'auto'}} loading="lazy" onLoad={() => moveable.current?.updateRect()} draggable={false} onClick={event => { event.preventDefault(); event.stopPropagation(); props.editor.commands.setNodeSelection(props.getPos()); props.editor.view.focus(); requestAnimationFrame(() => moveable.current?.updateRect()); }} /> : <div className="wiki-media-placeholder"><ImageIcon /><span>添加图片链接</span></div>}
    {props.selected && image && container ? <Moveable ref={moveable} target={image} container={container} origin={false} resizable keepRatio useResizeObserver useMutationObserver renderDirections={['nw', 'ne', 'sw', 'se']} stopPropagation onResizeStart={() => props.editor.view.dispatch(closeHistory(props.editor.state.tr))} onResize={({target, width}) => {target.style.width = `${width}px`;target.style.height = 'auto';}} onResizeEnd={({target, isDrag}) => {
      if (!isDrag || props.editor.isDestroyed) return;
      const current = props.editor.state.doc.nodeAt(props.getPos());
      if (current?.type.name !== 'image' || current.attrs.src !== attrs.src) return;
      const bounds = target.getBoundingClientRect();
      props.updateAttributes({width: Math.round(bounds.width), height: Math.round(bounds.height)});
      props.editor.view.dispatch(closeHistory(props.editor.state.tr));
    }} /> : null}
    <figcaption><span>{attrs.caption || attrs.alt || '图片说明'}</span><Button size="icon-sm" variant="ghost" aria-label="编辑图片与来源" onClick={() => props.extension.options.onEdit?.(props.editor, props.getPos())}><Pencil /></Button></figcaption>
    <div data-node-editor-slot />
  </NodeViewWrapper>;
}

const SourceProvenance = Extension.create({
  name: 'wikiSourceProvenance',
  addGlobalAttributes() { return [{ types: ['doc'], attributes: { wikiMetadata: { default: null, rendered: false } } }, { types: ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'horizontalRule', 'table', 'image', 'wikiBlock'], attributes: { wikiSourceId: { default: null, rendered: false } } }]; },
});
function semanticMark(name: string, tag: string, attribute?: string) {
  return Mark.create({ name, addAttributes() { return attribute ? { value: { default: '', parseHTML: element => element.getAttribute(attribute) || '', rendered: false } } : {}; },
    parseHTML() { return [{ tag: tag === 'span' ? 'span.wiki-spoiler' : tag }]; },
    renderHTML({ HTMLAttributes, mark }) { return [tag, mergeAttributes(HTMLAttributes, tag === 'span' ? { class: 'wiki-spoiler' } : attribute ? { [attribute]: mark.attrs.value } : {}), 0]; },
    addStorage() { return { markdown: { serialize: { open: (_state: any, mark: any) => `<${tag}${tag === 'span' ? ' class="wiki-spoiler"' : attribute ? ` ${attribute}="${e(mark.attrs.value)}"` : ''}>`, close: `</${tag}>` } } }; },
  });
}

export function createWikiExtensions(onEdit?: EditNode, withViews = true, withDragHandle = true) {
  const inline = Node.create({
    name: 'wikiInline', inline: true, group: 'inline', atom: true, selectable: true,
    addOptions() { return { onEdit }; },
    addAttributes() { return { kind: { default: 'ruby' }, args: { default: [] }, syntax: { default: 'shortcode' }, source: { default: '' } }; },
    parseHTML() { return [
      { tag: 'code.math-inline', priority: 100, getAttrs: element => ({ kind: 'math', syntax: 'math', args: [(element as HTMLElement).textContent || ''], source: '' }) },
      { tag: 'span[data-wiki-inline]', getAttrs: element => { try { return JSON.parse(decodeURIComponent((element as HTMLElement).dataset.wikiInline || '')); } catch { return false; } } },
      { tag: 'ruby', getAttrs: element => { const el = element as HTMLElement; const copy = el.cloneNode(true) as HTMLElement; copy.querySelectorAll('rt,rp').forEach(node => node.remove()); return { kind: 'ruby', syntax: 'html', source: el.outerHTML, args: [copy.textContent || '', el.querySelector('rt.furi,rt:not(.roma)')?.textContent || '', el.querySelector('rt.roma')?.textContent || ''] }; } },
    ]; },
    renderHTML({ node }) { return ['span', { 'data-wiki-inline': encodeURIComponent(JSON.stringify(node.attrs)) }, node.attrs.args[0] || '']; },
    ...(withViews ? { addNodeView: () => ReactNodeViewRenderer(InlineView) } : {}),
    addInputRules() { return [nodeInputRule({ find: /\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]\n]+))?\]\]$/, type: this.type, getAttributes: match => ({ kind: 'wiki-link', syntax: 'wiki-link', args: [match[1], match[2] || ''], source: match[0] }) }), nodeInputRule({ find: /\{\{([a-z-]+)(::(?:\\.|[^{}])*)\}\}$/, type: this.type, getAttributes: match => parseInlineSource(match[0]) || {} }), nodeInputRule({ find: /\$([^$\n]+)\$$/, type: this.type, getAttributes: match => ({ kind: 'math', syntax: 'math', args: [match[1]], source: match[0] }) })]; },
    addStorage() { return { markdown: {
      serialize(state: any, node: any) { const source = serializeInline(node.attrs); state.write(state.inTable ? pipeSafe(source) : source); },
      parse: { setup(md: any) {
        if (md.__wikiInline) return; md.__wikiInline = true;
        md.inline.ruler.before('text', 'wiki-shortcode', (state: any, silent: boolean) => {
          const reference = state.src.slice(state.pos).match(/^\[\[([a-z0-9]+(?:-[a-z0-9]+)*)(?:\|([^\]\n]+))?\]\]/);
          if (reference) {
            if (!silent) { const token = state.push('html_inline', '', 0); token.content = `<span data-wiki-inline="${encodeURIComponent(JSON.stringify({ kind: 'wiki-link', args: [reference[1], reference[2] || ''], syntax: 'wiki-link', source: reference[0] }))}">${e(reference[2] || reference[1])}</span>`; }
            state.pos += reference[0].length; return true;
          }
          const math = state.src.slice(state.pos).match(/^\$([^$\n]+)\$/);
          if (math) {
            if (!silent) { const token = state.push('html_inline', '', 0); token.content = `<span data-wiki-inline="${encodeURIComponent(JSON.stringify({ kind: 'math', args: [math[1]], syntax: 'math', source: math[0] }))}">${e(math[1])}</span>`; }
            state.pos += math[0].length; return true;
          }
          if (!state.src.startsWith('{{', state.pos)) return false;
          const match = state.src.slice(state.pos).match(/^\{\{([a-z-]+)(::(?:\\.|[^{}])*)\}\}/);
          if (!match) return false;
          const attrs = parseInlineSource(match[0]); if (!attrs) return false;
          if (!silent) { const token = state.push('html_inline', '', 0); token.content = `<span data-wiki-inline="${encodeURIComponent(JSON.stringify(attrs))}">${e(attrs.args[0])}</span>`; }
          state.pos += match[0].length; return true;
        });
      } },
    } }; },
  });
  const domain = Node.create({
    name: 'wikiBlock', group: 'block', atom: true, draggable: true, selectable: true,
    addOptions() { return { onEdit }; },
    addAttributes() { return { data: { default: {} }, source: { default: '' }, edited: { default: false } }; },
    parseHTML() { return [{ tag: 'div[data-wiki-block-data]', getAttrs: element => { try { return JSON.parse(decodeURIComponent((element as HTMLElement).dataset.wikiBlockData || '')); } catch { return false; } } }]; },
    renderHTML({ node }) { return ['div', { 'data-wiki-block-data': encodeURIComponent(JSON.stringify(node.attrs)) }, blockLabels[node.attrs.data.type] || 'Wiki 内容']; },
    ...(withViews ? { addNodeView: () => ReactNodeViewRenderer(BlockView) } : {}),
    addStorage() { return { markdown: { serialize(state: any, node: any) {
      state.write(node.attrs.edited ? blockMarkdown(node.attrs.data, node.attrs.data.locale || 'zh') : node.attrs.source || blockMarkdown(node.attrs.data)); state.closeBlock(node);
    } } }; },
  });
  const image = TiptapImage.extend({
    addOptions() { return { ...this.parent?.(), onEdit, allowBase64: false }; },
    addAttributes() { return { ...this.parent?.(), src: {default: null, parseHTML: element => (element.tagName === 'FIGURE' ? element.querySelector('img') : element)?.getAttribute('src')}, alt: {default: null, parseHTML: element => (element.tagName === 'FIGURE' ? element.querySelector('img') : element)?.getAttribute('alt')}, title: {default: null, parseHTML: element => (element.tagName === 'FIGURE' ? element.querySelector('img') : element)?.getAttribute('title')}, caption: { default: '', parseHTML: element => element.tagName === 'FIGURE' ? element.querySelector('figcaption')?.textContent || '' : element.getAttribute('data-caption') || '' }, width: {default: null, parseHTML: element => {const image = element.tagName === 'FIGURE' ? element.querySelector('img') : element;return imageDimension(image?.getAttribute('width') || (image as HTMLElement)?.style.width);}}, height: {default: null, parseHTML: element => {const image = element.tagName === 'FIGURE' ? element.querySelector('img') : element;return imageDimension(image?.getAttribute('height') || (image as HTMLElement)?.style.height);}} }; },
    parseHTML() { return [{tag: 'figure', priority: 100, getAttrs: element => imageFigureAttributes(element as HTMLElement)}, ...(this.parent?.() || [])]; },
    renderHTML({node}) { const image: any=['img',publicImageAttributes(node.attrs)]; return node.attrs.caption ? ['figure',image,['figcaption',{},node.attrs.caption]] : image; },
    ...(withViews ? { addNodeView: () => ReactNodeViewRenderer(ImageView) } : {}),
    addProseMirrorPlugins() { return [...(this.parent?.() || []), UploadImagesPlugin({ imageClass: 'wiki-image-uploading' })]; },
    addStorage() { return { markdown: { serialize(state: any, node: any) {
      state.write(imageMarkdown(node.attrs)); state.closeBlock(node);
    } } }; },
  });
  const alignedCell = (base: typeof TableCell | typeof TableHeader) => base.extend({
    addAttributes() { return { ...this.parent?.(), align: { default: null, parseHTML: element => {
      const align = element.getAttribute('align') || element.style.textAlign; return ['left', 'center', 'right'].includes(align) ? align : null;
    }, renderHTML: attributes => attributes.align ? { align: attributes.align, style: `text-align: ${attributes.align}` } : {} } }; },
  });
  const table = Table.extend({ addStorage() { return { markdown: { serialize(this: { editor: Editor }, state: any, node: any) {
    const rows: any[] = []; node.forEach((row: any) => rows.push(row));
    const cellsOf = (row: any) => { const cells: any[] = []; row.forEach((cell: any) => cells.push(cell)); return cells; };
    const first = rows[0] && cellsOf(rows[0]);
    const markdownCompatible = first?.length && rows.every((row, index) => cellsOf(row).length === first.length && cellsOf(row).every((cell, column) => (cell.attrs.align || null) === (first[column].attrs.align || null) && !cell.attrs.colwidth?.some((width: number) => width > 0) && cell.attrs.colspan === 1 && cell.attrs.rowspan === 1 && cell.childCount === 1 && cell.firstChild.type.name === 'paragraph' && (index === 0 ? cell.type.name === 'tableHeader' : cell.type.name === 'tableCell')));
    if (!markdownCompatible) {
      const serializer = DOMSerializer.fromSchema(this.editor.schema);
      const safeSerializer = new DOMSerializer({ ...serializer.nodes,
        wikiInline: (inline: any) => {
          if (inline.attrs.kind === 'math') return ['code', { class: 'math-inline' }, inline.attrs.args[0] || ''];
          const rendered = renderInlineAttributes(inline.attrs);
          const element = document.createElement('span');
          element.innerHTML = typeof rendered === 'string' ? rendered : e(rendered?.value || serializeInline(inline.attrs));
          return element;
        },
        wikiBlock: (block: any) => ['div', {}, block.attrs.source || blockMarkdown(block.attrs.data)],
      }, serializer.marks);
      const element = safeSerializer.serializeNode(node) as HTMLElement;
      element.querySelectorAll('[colwidth]').forEach(cell => { const widths = (cell.getAttribute('colwidth') || '').split(',').map(Number); if (widths.length && widths.every(width => width > 0 && width <= 4000)) cell.setAttribute('width', String(widths.reduce((total, width) => total + width, 0))); });
      state.write(element.outerHTML); state.closeBlock(node); return;
    }
    state.inTable = true;
    rows.forEach((row, index) => {
      state.write('| ');
      cellsOf(row).forEach((cell, column) => { if (column) state.write(' | '); state.renderInline(cell.firstChild); });
      state.write(' |'); state.ensureNewLine();
      if (index === 0) { state.write(`| ${first.map((cell: any) => ({ left: ':---', center: ':---:', right: '---:' } as any)[cell.attrs.align] || '---').join(' | ')} |`); state.ensureNewLine(); }
    });
    state.closeBlock(node); state.inTable = false;
  } } }; } });
  return [
    StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
    TiptapLink.configure({ openOnClick: false, autolink: true }), TiptapUnderline, HighlightExtension.configure({ multicolor: false }),
    TaskList, TaskItem.configure({ nested: true }),
    table.configure({ resizable: true, allowTableNodeSelection: true }), TableRow, alignedCell(TableCell), alignedCell(TableHeader),
    Placeholder.configure({ placeholder: '输入 / 插入内容', includeChildren: true }), CharacterCount,
    SourceProvenance, inline, domain, image,
    semanticMark('wikiSpoiler', 'span'), semanticMark('wikiAbbr', 'abbr', 'title'), semanticMark('wikiKbd', 'kbd'), semanticMark('wikiTime', 'time', 'datetime'), semanticMark('wikiSmall', 'small'), semanticMark('wikiSub', 'sub'), semanticMark('wikiSup', 'sup'),
    ...(withViews && withDragHandle ? [GlobalDragHandle.configure({ dragHandleWidth: 20, scrollTreshold: 0 }), WikiDragScrolling] : []),
    Markdown.configure({ html: true, tightLists: true, transformPastedText: true, transformCopiedText: true }),
  ];
}
