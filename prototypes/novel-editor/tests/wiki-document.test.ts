import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { undoNoScroll, redoNoScroll } from '@tiptap/pm/history';
import { createWikiExtensions, renderNestedMarkdown } from '../src/editor/extensions';
import { loadWikiDocument, exportWikiDocument, validateDocumentSource,newDocumentSource } from '../src/lib/wiki-document';
import {documentTemplates} from '../src/lib/document-templates';
import { compatibilityCases } from '../../../scripts/lib/tiptapCompatibility.mjs';
import { readFile } from 'node:fs/promises';
import { parseDocument } from 'yaml';

const dom = new JSDOM('<div id="editor"></div>', { url: 'http://127.0.0.1:4371', pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'DOMParser', 'MutationObserver', 'getComputedStyle', 'ShadowRoot', 'requestAnimationFrame', 'cancelAnimationFrame']) {
  Object.defineProperty(globalThis, key, { value: (dom.window as any)[key], configurable: true, writable: true });
}
const editor = new Editor({ element: dom.window.document.querySelector('#editor')!, extensions: createWikiExtensions(undefined, false), content: '' });
after(() => { editor.destroy(); dom.window.close(); });
test('image resize preserves caption and alt through source reopen and native undo', () => {
  const source = wrap('![内容说明](/images/test.png)\n\n<!-- wiki-editor:image-caption -->\n\n来源说明\n');
  const loaded = loadWikiDocument(editor, source);
  let position = -1;
  editor.state.doc.descendants((node, pos) => { if (node.type.name === 'image') position = pos; });
  assert.ok(position >= 0);
  editor.commands.setNodeSelection(position);
  editor.commands.updateAttributes('image', {width: 320, height: 180});
  const resized = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(resized, /<figure><img src="\/images\/test.png" alt="内容说明" width="320" height="180"><figcaption>来源说明<\/figcaption><\/figure>/);
  assert.ok(!/data-wiki|undefined|imageNotes/.test(resized));
  assert.equal(undoNoScroll(editor.state, editor.view.dispatch), true);
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
  assert.equal(redoNoScroll(editor.state, editor.view.dispatch), true);
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), resized);
  const reopened = loadWikiDocument(editor, resized);
  const images: any[] = []; editor.state.doc.descendants(node => {if(node.type.name === 'image') images.push(node.attrs);});
  assert.equal(images.length, 1); assert.equal(images[0].src, '/images/test.png'); assert.equal(images[0].caption, '来源说明'); assert.equal(images[0].width, 320);
  assert.equal(exportWikiDocument(editor, reopened.context, reopened.metadata), resized);
});
test('images in table cells retain public dimensions and captions when the table changes',()=>{
  const source=wrap('<table><tbody><tr><td><figure><img src="/table.png" alt="表内图片" width="320" height="160"><figcaption>表内说明</figcaption></figure></td><td>正文</td></tr></tbody></table>');
  const loaded=loadWikiDocument(editor,source);let position=-1;
  editor.state.doc.descendants((node,pos)=>{if(node.type.name==='image')position=pos;});assert.ok(position>=0);
  editor.commands.setNodeSelection(position);editor.commands.updateAttributes('image',{width:240,height:120});
  const output=exportWikiDocument(editor,loaded.context,loaded.metadata);
  assert.match(output,/<figure><img[^>]+width="240"[^>]+height="120"[^>]*><figcaption>表内说明<\/figcaption><\/figure>/);
  assert.ok(!output.includes('data-wiki'));const reopened=loadWikiDocument(editor,output);
  let image:any;editor.state.doc.descendants(node=>{if(node.type.name==='image')image=node.attrs;});assert.equal(image.caption,'表内说明');assert.equal(image.width,240);
  assert.equal(exportWikiDocument(editor,reopened.context,reopened.metadata),output);
});
test('complex authored figures retain their original content instead of being flattened', () => {
  for(const figure of ['<figure><img src="/a.png"><img src="/b.png"><figcaption>两张图片</figcaption></figure>', '<figure class="custom"><img src="/a.png"><figcaption>原有布局</figcaption></figure>', '<figure><img src="/a.png"><figcaption><em>说明格式</em></figcaption></figure>']) {
    const source = wrap(figure), loaded = loadWikiDocument(editor, source);
    assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
    assert.equal(editor.state.doc.firstChild?.type.name, 'wikiBlock');
  }
});
const wrap = (body: string, locale = 'zh') => `---\n# 保留 YAML 注释\nschemaVersion: 2\nid: test-document\nlocale: ${locale}\nentityType: editorial-article\ntitle: "测试"\nrelations: []\npresentation: {}\n---\n\n${body}\n`;
test('new document templates open as empty native documents for every supported type and language',()=>{
 const ids=new Set();
 for(const locale of ['zh','ja','en'])for(const template of documentTemplates){
  const source=newDocumentSource(locale,template.type),loaded=loadWikiDocument(editor,source);
  assert.equal(loaded.metadata.entityType,template.type);assert.equal(loaded.metadata.locale,locale);assert.equal((loaded.metadata.name??loaded.metadata.title),'');assert.equal(loaded.context.body.trim(),'');
  assert.ok(loaded.metadata.id.startsWith('local-'));assert.ok(!ids.has(loaded.metadata.id));ids.add(loaded.metadata.id);
  assert.equal(exportWikiDocument(editor,loaded.context,loaded.metadata),source);
 }
 assert.throws(()=>newDocumentSource('zh-tw'),/简体中文/);assert.throws(()=>newDocumentSource('zh','unknown' as any),/词条类型/);
});
test('unsupported generated source languages and malformed imports explain how to recover', () => {
  for (const locale of ['zh-tw', 'zh-hk']) assert.throws(() => validateDocumentSource(wrap('原文', locale)), /繁体页面由简体原文自动生成/);
  assert.throws(() => validateDocumentSource('没有词条属性'), /文件开头需要有完整的词条属性/);
});

test('all existing Wiki compatibility fixtures have exact no-op Markdown saves', () => {
  for (const locale of ['zh', 'ja', 'en']) for (const fixture of compatibilityCases(locale)) {
    const source = wrap(fixture.source, locale);
    const loaded = loadWikiDocument(editor, source);
    assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source, fixture.name + ' / ' + locale);
  }
});
test('inline shortcodes become semantic nodes, including table cells', () => {
  loadWikiDocument(editor, wrap('正文 {{ruby::花譜::かふ::kaf}} 与 {{spoiler::结局}}。\n\n| 名称 | 注释 |\n| --- | --- |\n| 花譜 | {{abbr::V.W.P::Virtual Witch Phenomenon}} |'));
  const nodes: string[] = [];
  editor.state.doc.descendants(node => { if (node.type.name === 'wikiInline') nodes.push(node.attrs.kind); });
  assert.deepEqual(nodes, ['ruby', 'spoiler', 'abbr']);
});
test('folded Markdown renders Wiki shortcodes and formulas without executing raw HTML', () => {
  const html = renderNestedMarkdown('{{ruby::花譜::かふ}} {{spoiler::结局}} $x^2$ <script>alert(1)</script>');
  assert.ok(html.includes('<ruby>'));
  assert.ok(html.includes('wiki-spoiler'));
  assert.ok(html.includes('katex'));
  assert.ok(!html.includes('<script>'));
});
test('editing prose retains shortcodes, timed-lyric markup, image provenance and nested metadata', () => {
  const lyrics = compatibilityCases('zh').find((item: any) => item.name === 'timed-lyrics')!.source;
  const image = compatibilityCases('zh').find((item: any) => item.name === 'image-caption')!.source;
  const source = wrap(`正文 {{ruby::花譜::かふ::kaf}}。\n\n${lyrics}\n\n${image}`);
  const loaded = loadWikiDocument(editor, source);
  editor.commands.insertContentAt(1, '新增');
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(output, /新增正文/);
  assert.ok(output.includes('{{ruby::花譜::かふ::kaf}}'));
  assert.ok(output.includes(lyrics));
  assert.ok(output.includes(image));
  assert.ok(output.includes('# 保留 YAML 注释'));
});
test('changing title retains body, YAML comments and unrecognized metadata', () => {
  const source = wrap('原文  {{ruby::花譜::かふ}}\n\n<!-- 资料说明 -->').replace('relations: []', 'futureField:\n  nested: [one, two]\nrelations: []');
  const loaded = loadWikiDocument(editor, source);
  const output = exportWikiDocument(editor, loaded.context, { ...loaded.metadata, title: '新的标题' });
  assert.ok(output.endsWith(loaded.context.body));
  assert.deepEqual(parseDocument(output.match(/^---\n([\s\S]*?)\n---/)![1]).toJS().futureField.nested, ['one', 'two']);
  assert.ok(output.includes('# 保留 YAML 注释'));
});
test('cleared optional metadata is omitted and an untouched body remains byte-for-byte', () => {
  const source = wrap('原文  {{ruby::花譜::かふ}}\n\n<!-- 资料说明 -->').replace('relations: []', 'publishDate: "2026-10-13"\nrelations: []');
  const loaded = loadWikiDocument(editor, source);
  const output = exportWikiDocument(editor, loaded.context, { ...loaded.metadata, publishDate: '' });
  assert.equal(parseDocument(output.match(/^---\n([\s\S]*?)\n---/)![1]).toJS().publishDate, undefined);
  assert.ok(output.endsWith(loaded.context.body));
  assert.ok(output.includes('# 保留 YAML 注释'));
  const noChange = { ...loaded.metadata, duration: '', presentation: { image: '' } };
  assert.equal(exportWikiDocument(editor, loaded.context, noChange), source, 'an empty optional field added from the form is not persisted');
});
test('BOM and CRLF remain exact on a no-op save', () => {
  const source = '\uFEFF' + wrap('**文字** {{ruby::花譜::かふ}}').replaceAll('\n', '\r\n');
  const loaded = loadWikiDocument(editor, source);
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
});
test('editing a Markdown table keeps inline Wiki nodes and column alignment', () => {
  const source = wrap('| 名称 | 说明 |\n| :--- | ---: |\n| 花譜 | {{ruby::花譜::かふ}} |');
  const loaded = loadWikiDocument(editor, source);
  let position = 0;
  editor.state.doc.descendants((node, offset) => { if (node.isText && node.text === '花譜') position = offset; });
  editor.commands.insertContentAt(position, '新');
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.ok(output.includes('{{ruby::花譜::かふ}}'));
  assert.match(output, /\| :--- \| ---: \|/);
  assert.ok(output.includes('新花譜'));
});
test('Tiptap undo restores the original document without a custom history stack', () => {
  const source = wrap('正文 {{ruby::花譜::かふ}}');
  const loaded = loadWikiDocument(editor, source);
  editor.commands.insertContentAt(1, '新文字');
  assert.notEqual(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
  editor.commands.undo();
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
});
test('merged table cells export public HTML without editor node payloads', () => {
  const source = wrap('正文');
  const loaded = loadWikiDocument(editor, source);
  editor.commands.insertContentAt(editor.state.doc.content.size, { type: 'table', content: [
    { type: 'tableRow', content: ['名称', '备注'].map(text => ({ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] })) },
    { type: 'tableRow', content: [{ type: 'tableCell', attrs: { colspan: 2 }, content: [{ type: 'paragraph', content: [{ type: 'wikiInline', attrs: { kind: 'ruby', args: ['花譜', 'かふ'], source: '{{ruby::花譜::かふ}}', syntax: 'shortcode' } }] }] }] },
  ] });
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(output, /<table/);
  assert.ok(output.includes('<ruby>花譜'), output);
  assert.ok(!output.includes('data-wiki-'));
});
test('real KAF biography is editable and preserves special content when prose changes', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    const path = `src/content/people/solo/kaf/${locale}.md`;
    const latest = await readFile(new URL('../../../' + path, import.meta.url), 'utf8');
    const imported = loadWikiDocument(editor, latest, path);
    assert.equal(exportWikiDocument(editor, imported.context, imported.metadata), latest, path);
  }
  const source = await readFile(new URL('../../../src/content/people/solo/kaf/zh.md', import.meta.url), 'utf8');
  const loaded = loadWikiDocument(editor, source, 'src/content/people/solo/kaf/zh.md');
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
  let paragraph = 0;
  editor.state.doc.forEach((node, offset) => { if (!paragraph && node.type.name === 'paragraph' && node.content.size) paragraph = offset + 1; });
  editor.commands.insertContentAt(paragraph, '测试：');
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.ok(output.includes('测试：'));
  assert.ok(output.includes('{{ruby::花譜::かふ::kaf}}'));
  assert.ok(output.includes('{{spoiler::'));
});

test('merged and resized tables reopen as editable native tables with Wiki content', () => {
  const loaded = loadWikiDocument(editor, wrap('| 名称 | 说明 |\n| --- | --- |\n| {{ruby::花譜::かふ}} | 资料 |'));
  let firstCell = 0;
  editor.state.doc.descendants((node, position) => { if (!firstCell && node.type.name === 'tableCell') firstCell = position; });
  editor.commands.setTextSelection(firstCell + 2);
  editor.commands.setCellAttribute('colwidth', [220]);
  const resized = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(resized, /colwidth="220"/);
  loadWikiDocument(editor, resized);
  assert.equal(editor.state.doc.firstChild!.type.name, 'table');
  const cells: any[] = [];
  editor.state.doc.descendants(node => { if (node.type.name === 'tableCell') cells.push(node); });
  assert.ok(cells.some(cell => cell.attrs.colwidth?.[0] === 220));
  assert.ok(cells.some(cell => cell.firstChild.firstChild?.type.name === 'wikiInline'));
});

test('merged cells survive save, reopen, split, edit, and save again', async () => {
  const { CellSelection, selectedRect } = await import('@tiptap/pm/tables');
  const loaded = loadWikiDocument(editor, wrap('| 名称 | 说明 |\n| --- | --- |\n| {{ruby::花譜::かふ}} | 资料 |'));
  let firstCell = 0;
  editor.state.doc.descendants((node, position) => { if (!firstCell && node.type.name === 'tableCell') firstCell = position; });
  editor.commands.setTextSelection(firstCell + 2);
  const rect = selectedRect(editor.state);
  editor.view.dispatch(editor.state.tr.setSelection(new CellSelection(editor.state.doc.resolve(rect.tableStart + rect.map.map[2]), editor.state.doc.resolve(rect.tableStart + rect.map.map[3]))));
  assert.equal(editor.commands.mergeCells(), true);
  const merged = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(merged, /colspan="2"/);
  const reopened = loadWikiDocument(editor, merged);
  assert.equal(editor.state.doc.firstChild!.type.name, 'table');
  let mergedPos = 0;
  editor.state.doc.descendants((node, position) => { if (node.attrs.colspan === 2) mergedPos = position; });
  editor.commands.setTextSelection(mergedPos + 2);
  assert.equal(editor.commands.splitCell(), true);
  let appendPosition = 0;
  editor.state.doc.descendants((node, position) => { if (!appendPosition && node.type.name === 'tableCell') appendPosition = position + node.nodeSize - 2; });
  editor.commands.setTextSelection(appendPosition);
  editor.commands.insertContent('补充资料');
  const output = exportWikiDocument(editor, reopened.context, reopened.metadata);
  assert.ok(output.includes('补充资料'));
  assert.ok(output.includes('<ruby>花譜'), output);
  loadWikiDocument(editor, output);
  assert.equal(editor.state.doc.firstChild!.type.name, 'table');
});

test('table row, column, alignment, selection and exit use native transactions', async () => {
  const { selectTableAxis, alignTableColumns, exitTable } = await import('../src/editor/table-controls');
  const loaded = loadWikiDocument(editor, wrap('| 名称 | 说明 |\n| --- | --- |\n| 花譜 | 资料 |'));
  editor.commands.setTextSelection(4);
  assert.equal(editor.commands.addRowBefore(), true);
  assert.equal(editor.commands.addColumnAfter(), true);
  selectTableAxis(editor, 'column'); alignTableColumns(editor, 'center');
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.ok(output.includes(':---:') || output.includes('text-align: center'));
  exitTable(editor);
  assert.equal(editor.isActive('table'), false);
  editor.commands.insertContent('表后说明');
  const saved = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.ok(saved.includes('表后说明'));
  loadWikiDocument(editor, saved);
  assert.equal(editor.state.doc.firstChild!.type.name, 'table');
});

test('find respects formatting boundaries, Unicode positions and inline atoms', async () => {
  const { findTextMatches } = await import('../src/lib/document-search');
  loadWikiDocument(editor, wrap('普通**用户**测试，用户 {{ruby::花譜::かふ}} 用户。\n\n| 内容 |\n| --- |\n| 用户 |'));
  const matches = findTextMatches(editor.state.doc, '用户');
  assert.equal(matches.length, 4);
  for (const match of matches) assert.equal(editor.state.doc.textBetween(match.from, match.to), '用户');
  assert.equal(findTextMatches(editor.state.doc, '用户 花譜').length, 0);
});

test('metadata edits participate in native undo and preserve original body and unknown fields', () => {
  const source = wrap('正文 {{ruby::花譜::かふ}}');
  const loaded = loadWikiDocument(editor, source);
  editor.commands.command(({ tr }) => { tr.setDocAttribute('wikiMetadata', { ...loaded.metadata, title: '标题修改', future: { values: [1, true, '保留'] } }); return true; });
  const output = exportWikiDocument(editor, loaded.context, editor.state.doc.attrs.wikiMetadata);
  assert.ok(output.includes('标题修改'));
  assert.ok(output.endsWith(loaded.context.body));
  assert.equal(editor.commands.undo(), true);
  assert.equal(exportWikiDocument(editor, loaded.context, editor.state.doc.attrs.wikiMetadata), source);
  assert.equal(editor.commands.redo(), true);
  assert.ok(exportWikiDocument(editor, loaded.context, editor.state.doc.attrs.wikiMetadata).includes('标题修改'));
});

test('applying a full source edit can be undone with its metadata', () => {
  const source = wrap('正文 {{ruby::花譜::かふ}}');
  const loaded = loadWikiDocument(editor, source);
  const updated = loadWikiDocument(editor, source.replace('测试', '新标题').replace('正文 ', '新正文 '), '', true);
  assert.equal(editor.commands.undo(), true);
  assert.equal(exportWikiDocument(editor, updated.context, editor.state.doc.attrs.wikiMetadata), source);
});
test('source undo restores YAML comments, BOM, CRLF and preceding prose edits, with exact redo', () => {
  const undo = () => undoNoScroll(editor.state, transaction => editor.view.dispatch(transaction));
  const redo = () => redoNoScroll(editor.state, transaction => editor.view.dispatch(transaction));
  const original = '\uFEFF' + wrap('正文 {{ruby::花譜::かふ}}').replaceAll('\n', '\r\n');
  const loaded = loadWikiDocument(editor, original);
  editor.commands.insertContentAt(1, '先编辑正文');
  const before = exportWikiDocument(editor, loaded.context, editor.state.doc.attrs.wikiMetadata);
  const next = before.replace('# 保留 YAML 注释', '# 新的 YAML 注释').replace('测试', '新标题').replaceAll('\r\n', '\n').replace(/^\uFEFF/, '');
  const applied = loadWikiDocument(editor, next, '', true);
  assert.equal(undo(), true);
  assert.equal(exportWikiDocument(editor, applied.context, editor.state.doc.attrs.wikiMetadata), before);
  assert.equal(redo(), true);
  assert.equal(exportWikiDocument(editor, applied.context, editor.state.doc.attrs.wikiMetadata), next);
  undo();
  editor.commands.insertContentAt(1, '继续写作');
  const continued = exportWikiDocument(editor, applied.context, editor.state.doc.attrs.wikiMetadata);
  assert.ok(continued.startsWith('\uFEFF---\r\n# 保留 YAML 注释'));
  assert.ok(continued.includes('继续写作先编辑正文'));
});

test('public reader renders Wiki content and widths after an HTML table save', async () => {
  const { renderMarkdownFragment } = await import('../../../src/lib/markdown.mjs');
  const loaded = loadWikiDocument(editor, wrap('| 名称 | 说明 |\n| --- | --- |\n| {{ruby::花譜::かふ::kaf}} | $x^2$ |'));
  let cellPos = 0;
  editor.state.doc.descendants((node, position) => { if (!cellPos && node.type.name === 'tableCell') cellPos = position; });
  editor.commands.setTextSelection(cellPos + 2);
  editor.commands.setCellAttribute('colwidth', [220]);
  const source = exportWikiDocument(editor, loaded.context, loaded.metadata);
  const rendered = await renderMarkdownFragment(source.replace(/^---\n[\s\S]*?\n---\n/, ''));
  assert.match(rendered, /<ruby>花譜<rt class="furi">かふ<\/rt><rt class="roma">kaf<\/rt><\/ruby>/);
  assert.match(rendered, /width="220"/);
  assert.match(rendered, /katex/);
  assert.doesNotMatch(rendered, /\{\{ruby::|data-wiki-/);
  const reopened = loadWikiDocument(editor, source);
  const nodes: string[] = [];
  editor.state.doc.descendants(node => { if (node.type.name === 'wikiInline') nodes.push(node.attrs.kind); });
  assert.ok(nodes.includes('ruby'));
  assert.ok(nodes.includes('math'));
  assert.ok(exportWikiDocument(editor, reopened.context, reopened.metadata) === source);
});

test('inserting a table after a selected advanced block preserves that block', async () => {
  const { insertTableAtSelection } = await import('../src/editor/table-controls');
  const loaded = loadWikiDocument(editor, wrap('{{details::说明}}\n正文 {{ruby::花譜::かふ}}\n{{/details}}'));
  assert.equal(editor.state.doc.firstChild!.type.name, 'wikiBlock');
  editor.commands.setNodeSelection(0);
  assert.equal(insertTableAtSelection(editor, 2, 2, true), true);
  assert.equal(editor.state.doc.firstChild!.type.name, 'wikiBlock');
  assert.equal(editor.state.doc.child(1).type.name, 'table');
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  assert.match(output, /\{\{details::说明\}\}/);
  assert.match(output, /\{\{ruby::花譜::かふ\}\}/);
});

test('Wiki references show semantic content and survive edits, resized tables and reader linking', async () => {
  const { renderMarkdownFragment } = await import('../../../src/lib/markdown.mjs');
  const { createEntityRegistry } = await import('../../../src/lib/entityRegistry.mjs');
  const { renderWikiLinks } = await import('../../../src/lib/wikiLinks.mjs');
  const registry = createEntityRegistry([{ filePath: 'src/content/people/solo/kaf/zh.md', data: { schemaVersion: 2, id: 'kaf', locale: 'zh', entityType: 'virtual-avatar', name: '花譜', romanizedName: 'KAF', summary: '虚拟歌手' }, body: '' }]);
  const source = wrap('参考 [[kaf|花譜]]。\n\n| 人物 |\n| --- |\n| [[kaf]] |');
  const loaded = loadWikiDocument(editor, source);
  const references: any[] = [];
  editor.state.doc.descendants(node => { if (node.type.name === 'wikiInline' && node.attrs.kind === 'wiki-link') references.push(node.attrs.args); });
  assert.deepEqual(references, [['kaf', '花譜'], ['kaf', '']]);
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source);
  editor.commands.insertContentAt(1, '更新');
  let cellPos = 0;
  editor.state.doc.descendants((node, position) => { if (!cellPos && node.type.name === 'tableCell') cellPos = position; });
  editor.commands.setTextSelection(cellPos + 2); editor.commands.setCellAttribute('colwidth', [220]);
  const output = exportWikiDocument(editor, loaded.context, loaded.metadata);
  const rendered = await renderMarkdownFragment(output.replace(/^---\n[\s\S]*?\n---\n/, ''));
  const linked = renderWikiLinks(rendered, registry, 'zh');
  assert.equal((linked.previews as Record<string, any>).kaf.title, '花譜');
  assert.equal((linked.html.match(/data-wiki-id="kaf"/g) || []).length, 2);
  const reopened = loadWikiDocument(editor, output);
  assert.equal(exportWikiDocument(editor, reopened.context, reopened.metadata), output);
  let count = 0; editor.state.doc.descendants(node => { if (node.type.name === 'wikiInline' && node.attrs.kind === 'wiki-link') count++; });
  assert.equal(count, 2);
});

test('unfinished block edits restore after reopening without reusing source provenance or replacing another block', async () => {
  const { editAnchorSignature, storeNodeEdit, restoreNodeEdit } = await import('../src/lib/node-edit-draft');
  const source = wrap('{{details::说明}}\n\n原有说明。\n\n{{/details}}\n\n后文。');
  loadWikiDocument(editor, source);
  const node = editor.state.doc.firstChild!;
  const target = { editor, type: 'wikiBlock' as const, position: 0, range: { from: 0, to: node.nodeSize }, attrs: node.attrs };
  const attrs: any = structuredClone(node.attrs); attrs.edited = true; attrs.data.title = '未完成标题'; attrs.data.text = '尚未应用的说明 {{ruby::花譜::かふ}}。';
  const saved = storeNodeEdit(target, attrs, 0, target.range, editAnchorSignature(editor, target));
  assert.equal(saved.attrs.wikiSourceId, undefined);
  const loaded = loadWikiDocument(editor, source);
  const restored = restoreNodeEdit(editor, saved);
  assert.equal(restored.position, 0);
  assert.equal(restored.attrs.wikiSourceId, editor.state.doc.firstChild!.attrs.wikiSourceId);
  assert.equal(restored.draftAttrs.data.title, '未完成标题');
  assert.equal(exportWikiDocument(editor, loaded.context, loaded.metadata), source, 'unfinished fields never silently change saved Markdown');
  loadWikiDocument(editor, wrap('另一份正文。'));
  const recovered = restoreNodeEdit(editor, saved);
  assert.equal(recovered.position, undefined);
  assert.equal(recovered.range.from, editor.state.doc.content.size);
  assert.equal(recovered.draftAttrs.data.text, attrs.data.text);
  assert.equal(editor.state.doc.firstChild!.textContent, '另一份正文。');
});

test('actual workbench saves new dates and repairs unchanged imported dates',()=>{
 const source=wrap('Body remains unchanged.').replace('relations: []','relations: []\naliases: [2021-11-18T00:00:00.000Z]');
 const loaded=loadWikiDocument(editor,source);
 for(const metadata of [loaded.metadata,{...loaded.metadata,publishDate:'2021-11-18'}]){
  const result=exportWikiDocument(editor,loaded.context,metadata);
  const data=parseDocument(result.split('---')[1],{customTags:['timestamp']}).toJS();
  assert.equal(data.aliases[0],'2021-11-18T00:00:00.000Z');
  if(metadata.publishDate)assert.equal(data.publishDate,'2021-11-18');
  assert.equal(result.split('---').slice(2).join('---'),source.split('---').slice(2).join('---'));
 }
});
