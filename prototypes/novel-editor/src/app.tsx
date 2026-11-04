import {HelpTip} from './components/help-tip';
import {HostNavigation} from './components/host-navigation';
import {workbenchText as t} from '@/lib/workbench-copy';
import {editorFetch as fetch,editorHost,localEditorHost,previewAssetUrl,previewHTML,restoreBrowserImages,registerStagedImages} from '@/lib/editor-host';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import TextareaAutosize from 'react-textarea-autosize';
import type { Editor } from '@tiptap/core';
import { Check, Eye, Download, Moon, Sun, SlidersHorizontal, Menu, Code2, FileText, AlertCircle, Pencil, Loader2, MoreHorizontal, Save, Send } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LibrarySidebar, collectionLabels } from '@/components/library-sidebar';
import { PropertiesPanel, type OutlineItem } from '@/components/properties-panel';
import {NewDocumentDialog} from '@/components/new-document-dialog';
import type {DocumentTemplateType} from '@/lib/document-templates';
import { CatalogContext } from '@/components/entity-picker';
import { WorkspaceSidebar, type ResourceItem } from '@/components/workspace-sidebar';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { SourceEditor } from '@/components/source-editor';
import { NovelSurface } from '@/editor/novel-surface';
import { EditorToolbar } from '@/editor/toolbar';
import { NodeEditor, type NodeEditTarget } from '@/editor/node-dialog';
import { exportWikiDocument, loadWikiDocument, newDocumentSource, validateDocumentSource, type LoadedWikiDocument, type WikiDocumentContext, type WikiMetadata } from '@/lib/wiki-document';
import { readLocalDraft, readLastLocalDraft, saveLocalDraft, listLocalDrafts, type LocalDraft } from '@/lib/local-drafts';
import type { CatalogEntry } from '../server/local-api';
import demoSource from '../fixtures/wiki-demo.md?raw';
import { cn } from '@/lib/utils';
import { useContainerWidth } from '@/lib/use-container-width';
import { restoreNodeEdit, type StoredNodeEdit } from '@/lib/node-edit-draft';
import { reviewSnapshot, type ReviewSnapshot, type ReviewSubmission, type ReviewAttachment, type ReviewResolution } from '@/lib/review-service';
import { canAdoptSubmission } from '@/lib/review-attachments';
import { ImageUploadContext, type ImageUploadScope } from '@/lib/image-upload-context';
import { articleSnapshot, articleSourceWithContent, type ArticleBinding, type ArticleSnapshot } from '@/lib/article-document';
import type { ArticleReceipt, ArticleRevision } from '@/lib/article-service';
import { PreviewPane } from '@/components/reader-preview';

const ArticleReviewPane = lazy(() => import('@/components/article-review-pane'));
const ReviewPane = lazy(() => import('@/components/review-pane'));
type DocumentRecord = { key: string; path: string; source: string; baseSource?: string; create?: boolean; attachments?: ReviewAttachment[]; resolution?: ReviewResolution; article?: ArticleBinding; pendingSource?: string; pendingNode?: StoredNodeEdit; articleBase?: {articleId:string;version:number} };
type View = 'edit' | 'source' | 'preview' | 'review';
async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options); const body = await response.json();
  if (!response.ok) throw new Error(typeof body.error==='string'?body.error:body.error?.message||'请求失败'); return body;
}
function initialDocument(): DocumentRecord {
  if(editorHost()?.initialDocument)return editorHost()!.initialDocument;
  const draft = readLastLocalDraft();
  return draft ? { key: draft.key, path: draft.path, source: draft.source, baseSource: draft.baseSource, create: draft.create, attachments: draft.attachments, resolution: draft.resolution, article: draft.article, articleBase:draft.articleBase, pendingSource: draft.pendingSource, pendingNode: draft.pendingNode } : editorHost()?{key:crypto.randomUUID(),path:'',source:newDocumentSource(editorHost()!.contentLocale,editorHost()!.mode==='article'?'editorial-article':'project')}:{ key: 'demo', path: '', source: demoSource };
}
function downloadMarkdown(source: string, title: string, locale: string) {
  const url = URL.createObjectURL(new Blob([source], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = `${(title || 'wiki-draft').replace(/[\\/:*?"<>|]/g, '-')}.${locale || 'zh'}.md`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  useEffect(()=>{const host=document.querySelector<HTMLElement>('[data-novel-workbench]');if(host)host.dataset.ready='true';return()=>{if(host)delete host.dataset.ready;};},[]);
  const headerSize = useContainerWidth<HTMLElement>();
  const canvasSize = useContainerWidth<HTMLDivElement>();
  const [record, setRecord] = useState<DocumentRecord>(initialDocument);
  const recordRef = useRef(record); recordRef.current = record;
  useEffect(()=>{registerStagedImages(record.attachments);void restoreBrowserImages(record.source);},[record.key,record.attachments]);
  const [revision, setRevision] = useState(0);
  const writingScroll = useRef<HTMLDivElement>(null);
  const propertiesScroll = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const titleInput = useRef<HTMLTextAreaElement>(null);
  const focusNewTitle = useRef(false);
  useEffect(() => {
    if (editor && focusNewTitle.current) {
      focusNewTitle.current = false;
      titleInput.current?.focus({ preventScroll: true });
    }
  }, [editor]);
  useEffect(() => {
    writingScroll.current?.scrollTo({ top: 0 });
    // ResizablePanel's elementRef points to its outer sizing element; the
    // className is placed on the inner content viewport that actually scrolls.
    const viewport = propertiesScroll.current?.querySelector<HTMLDivElement>('.wiki-desktop-properties') || propertiesScroll.current;
    viewport?.scrollTo({ top: 0 });
  }, [record.key, revision, editor]);
  const editorRef = useRef<Editor | null>(null);
  const restoredEditors = useRef(new WeakSet<Editor>());
  const contextRef = useRef<WikiDocumentContext | null>(null);
  const [metadata, setMetadata] = useState<WikiMetadata>({});
  const metadataRef = useRef(metadata); metadataRef.current = metadata;
  const [sourceValue, setSourceValue] = useState(record.pendingSource || record.source);
  const pendingRef = useRef<string | undefined>(record.pendingSource);
  const [pending, setPending] = useState(Boolean(record.pendingSource));
  const [view, setView] = useState<View>(record.pendingSource ? 'source' : 'edit');
  const [articleReview, setArticleReview] = useState<{ recordKey: string; snapshot: ArticleSnapshot } | null>(null);
  const [review, setReview] = useState<{ recordKey: string; snapshot: ReviewSnapshot } | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catalogLocale, setCatalogLocale] = useState(editorHost()?.contentLocale||'zh');
  const [status, setStatus] = useState('正在打开词条…');
  const [storageError, setStorageError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [opening, setOpening] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const propertiesWidth = useRef((() => { try { const value = Number(localStorage.getItem('kamitsubaki-novel-local-prototype:properties-width')); return value >= 320 && value <= 560 ? value : 420; } catch { return 420; } })());
  const [mobileLibrary, setMobileLibrary] = useState(false);
  const [mobileProperties, setMobileProperties] = useState(false);
  const [compactLayout, setCompactLayout] = useState(() => window.matchMedia('(max-width: 1180px)').matches);
  const [dark, setDark] = useState(() => { if(editorHost())return document.documentElement.dataset.theme!=='light';try { return localStorage.getItem('kamitsubaki-novel-local-prototype:theme') !== 'light'; } catch { return true; } });
  useEffect(() => { document.documentElement.classList.toggle('dark', dark); document.documentElement.dataset.theme = dark ? 'dark' : 'light'; try { localStorage.setItem(editorHost()?'kamitsubaki-theme':'kamitsubaki-novel-local-prototype:theme', dark ? 'dark' : 'light'); } catch { /* Theme changes still work without storage. */ } }, [dark]);
  const [target, setTarget] = useState<NodeEditTarget | null>(null);
  const pendingNode = useRef(record.pendingNode);
  const scheduleSave = useRef<() => void>(() => {});
  const targetDirty = useRef(false);
  const markTargetDirty = useCallback((dirty: boolean) => { targetDirty.current = dirty; }, []);
  const closeTarget = useCallback(() => { targetDirty.current = false; pendingNode.current = undefined; setTarget(null); scheduleSave.current(); }, []);
  const saveNodeDraft = useCallback((draft: StoredNodeEdit | null) => { pendingNode.current = draft || undefined; scheduleSave.current(); }, []);
  const openTarget = useCallback((next: NodeEditTarget) => {
    if (targetDirty.current) { toast.info('请先完成或取消当前内容编辑，已填写的内容会留在原处。'); return; }
    setTarget(next);
  }, []);
  const nodeEditorHost = useMemo(() => {
    if (!target || target.position === undefined || target.editor.isDestroyed) return null;
    const element = target.editor.view.nodeDOM(target.position);
    return element instanceof HTMLElement ? element.querySelector<HTMLElement>('[data-node-editor-slot]') : null;
  }, [target]);
  const editingDock = Boolean(target && !nodeEditorHost);
  useEffect(() => {
    if (!target || !nodeEditorHost || nodeEditorHost.isConnected) return;
    if (pendingNode.current) {
      setTarget(restoreNodeEdit(target.editor, pendingNode.current));
      toast.info('已保留未完成的填写内容，请核对当前位置后继续编辑。');
    } else closeTarget();
  });
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [contentVersion, setContentVersion] = useState(0);
  const [activeOutline, setActiveOutline] = useState<number | null>(null);
  const scrollFrame = useRef<number | null>(null);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [, updateToolbar] = useState(0);
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [newDocumentOpen,setNewDocumentOpen]=useState(Boolean(editorHost()?.mode==='entry'&&!editorHost()?.initialDocument&&!readLastLocalDraft()&&!editorHost()?.initialTarget));
  const [drafts, setDrafts] = useState<LocalDraft[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const loadSequence = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);

  const liveSource = useCallback(() => editorRef.current && contextRef.current ? exportWikiDocument(editorRef.current, contextRef.current, metadataRef.current) : recordRef.current.source, []);
  const persist = useCallback(() => {
    clearTimeout(timer.current);
    if (!contextRef.current || !editorRef.current) return false;
    try {
      const meta = metadataRef.current;
      const source = liveSource();
      saveLocalDraft({ key: recordRef.current.key, path: recordRef.current.path, source, baseSource: recordRef.current.baseSource, create: recordRef.current.create, attachments: recordRef.current.attachments, resolution: recordRef.current.resolution, article: recordRef.current.article, articleBase:recordRef.current.articleBase, title: meta.name || meta.title || '未命名词条', locale: meta.locale || 'zh', savedAt: Date.now(), pendingSource: pendingRef.current, pendingNode: pendingNode.current });
      recordRef.current = { ...recordRef.current, source };
      if (!pendingRef.current) setSourceValue(source);
      setStorageError(''); setStatus(pendingRef.current ? t("源码已暂存，尚未应用") : pendingNode.current ? t("填写内容已暂存，尚未应用") : t("已保存到本地"));
      return true;
    } catch { setStatus(t("尚未保存")); setStorageError(t("本地草稿无法保存。请导出 Markdown 备份当前内容。")); return false; }
  }, [liveSource]);
  const currentSource = useCallback(() => recordRef.current.source, []);
  const changed = useCallback(() => {
    try { setStatus(t("正在保存…")); clearTimeout(timer.current); timer.current = setTimeout(persist, 300); }
    catch (error: any) { setStorageError(error.message); }
  }, [liveSource, persist]);
  scheduleSave.current = changed;
  const refreshOutline = useCallback((instance: Editor, docChanged = true) => {
    updateToolbar(value => value + 1);
    if (!docChanged) return;
    const documentMetadata = instance.state.doc.attrs.wikiMetadata;
    if (documentMetadata && documentMetadata !== metadataRef.current) { metadataRef.current = documentMetadata; setMetadata(documentMetadata); }
    const assets: ResourceItem[] = [];
    const next: OutlineItem[] = [];
    instance.state.doc.descendants((node, position) => {
      if (node.type.name === 'heading') next.push({ text: node.textContent, level: node.attrs.level, position });
      if (node.type.name === 'image') assets.push({ label: node.attrs.caption || node.attrs.alt || '图片', kind: 'image', position, url: node.attrs.src });
      if (node.type.name === 'wikiBlock' && ['media', 'media-switcher'].includes(node.attrs.data.type)) assets.push({ label: node.attrs.data.title || node.attrs.data.caption || '媒体', kind: 'media', position, url: node.attrs.data.url });
      const link = node.marks.find(mark => mark.type.name === 'link');
      if (link) assets.push({ label: node.textContent || link.attrs.href, kind: 'link', position, url: link.attrs.href });
    });
    setResources(previous => JSON.stringify(previous) === JSON.stringify(assets) ? previous : assets);
    setOutline(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
  }, []);
  const documentUpdated = useCallback(() => { changed(); setContentVersion(value => value + 1); }, [changed]);
  const ready = useCallback((instance: Editor, loaded: LoadedWikiDocument) => {
    editorRef.current = instance; contextRef.current = loaded.context; metadataRef.current = loaded.metadata;
    setEditor(instance); setMetadata(loaded.metadata); refreshOutline(instance); setLoadError('');
    if (!pendingRef.current) setSourceValue(loaded.context.source);
    persist();
    if (pendingNode.current) requestAnimationFrame(() => {
      if (editorRef.current !== instance || !pendingNode.current || restoredEditors.current.has(instance)) return;
      restoredEditors.current.add(instance);
      const restored = restoreNodeEdit(instance, pendingNode.current);
      if (restored.position !== undefined) instance.commands.setNodeSelection(restored.position);
      setTarget(restored);
      toast.info('已恢复尚未完成的内容编辑，请核对后完成或取消。', { id: 'recover-node:' + recordRef.current.key });
    });
  }, [persist, refreshOutline]);
  const replaceDocument = useCallback((next: DocumentRecord) => {
    if (targetDirty.current) { toast.info('请先完成或取消当前内容编辑，再切换文档。'); return false; }
    if (contextRef.current && !persist()) { toast.error('当前草稿尚未保存，请先导出备份再切换。'); return false; }
    if (window.location.hash) {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
    }
    clearTimeout(timer.current); contextRef.current = null; editorRef.current = null;
    pendingRef.current = next.pendingSource; pendingNode.current = next.pendingNode; setPending(Boolean(next.pendingSource)); setSourceValue(next.pendingSource || next.source);
    setEditor(null); setTarget(null); setOutline([]); setActiveOutline(null); setMetadata({}); setReview(null); setArticleReview(null); setRecord(next); recordRef.current = next;
    setRevision(value => value + 1); setView(next.pendingSource ? 'source' : 'edit'); setMobileLibrary(false); setNavigationOpen(false); setOpening(false); setStatus(t("正在打开词条…")); setLoadError('');
    return true;
  }, [persist]);
  const openEntry = useCallback(async (entry: CatalogEntry) => {
    const sequence = ++loadSequence.current; setOpening(true);
    try {
      const draft = readLocalDraft(entry.path);
      const original = (await jsonRequest('/__novel/source?path=' + encodeURIComponent(entry.path))).source;
      const source = draft?.source || original;
      await restoreBrowserImages(source);
      if (sequence !== loadSequence.current) return;
      replaceDocument({ key: entry.path, path: entry.path, source, baseSource: draft?.baseSource ?? original, create: draft?.create, attachments: draft?.attachments, resolution: draft?.resolution, article: draft?.article, pendingSource: draft?.pendingSource, pendingNode: draft?.pendingNode });
    } catch (error: any) { toast.error(error.message); }
    finally { if (sequence === loadSequence.current) setOpening(false); }
  }, [replaceDocument]);
  useEffect(() => {
    const controller = new AbortController();
    jsonRequest('/__novel/catalog', { signal: controller.signal }).then(body => {setCatalog(body.entries);const target=editorHost()?.initialTarget;if(target){const entry=body.entries.find((e:CatalogEntry)=>e.path===target);if(entry)void openEntry(entry);}}).catch(error => { if (error.name !== 'AbortError') toast.error('词条库读取失败：' + error.message); }).finally(() => { if (!controller.signal.aborted) setCatalogLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 1180px)');
    const changed = () => setCompactLayout(query.matches);
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);
  useEffect(() => {
    const save = () => persist(); window.addEventListener('beforeunload', save);
    return () => { window.removeEventListener('beforeunload', save); clearTimeout(timer.current); };
  }, [persist]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') { event.preventDefault(); if (persist()) toast.success('草稿已保存到本地'); else toast.error('草稿未保存，请导出 Markdown 备份。'); }
    };
    window.addEventListener('keydown', keydown); return () => window.removeEventListener('keydown', keydown);
  }, [persist]);
  const changeMetadata = (next: WikiMetadata) => { if (editorRef.current) editorRef.current.commands.command(({ tr }) => { tr.setDocAttribute('wikiMetadata', next); return true; }); else { metadataRef.current = next; setMetadata(next); changed(); } };
  const changeView = (next: View) => { if (targetDirty.current) { toast.info('请先完成或取消当前内容编辑，再切换视图。'); return; } closeTarget(); if (next === 'edit' && pendingRef.current) { toast.error('请先应用或放弃源码修改。'); return; } if (next === 'source' && !pendingRef.current) setSourceValue(liveSource()); setView(next); };
  const sourceChanged = (source: string) => { setSourceValue(source); const scratch = source === liveSource() ? undefined : source; pendingRef.current = scratch; setPending(Boolean(scratch)); changed(); };
  const applySource = () => {
    if (!editorRef.current) return;
    try {
      const nextMetadata = validateDocumentSource(sourceValue);
      if ((record.path || record.article) && (nextMetadata.id !== metadataRef.current.id || nextMetadata.entityType !== metadataRef.current.entityType || nextMetadata.locale !== metadataRef.current.locale)) throw new Error('已有词条的永久 ID、类型和语言需要保持不变。');
      const loaded = loadWikiDocument(editorRef.current, sourceValue, record.path, true);
      contextRef.current = loaded.context; metadataRef.current = loaded.metadata; setMetadata(loaded.metadata); pendingRef.current = undefined; setPending(false); refreshOutline(editorRef.current); persist(); setView('edit'); toast.success('Markdown 已应用到正文');
    } catch (error: any) { toast.error(error.message); }
  };
  const onNavigate = (position: number) => { setActiveOutline(outline.filter(item => item.position <= position).at(-1)?.position ?? null); setView('edit'); setNavigationOpen(false); setMobileProperties(false); requestAnimationFrame(() => { const instance = editorRef.current; if (!instance) return; const node = instance.state.doc.nodeAt(position); const chain = instance.chain().focus(); if (node?.isAtom && node.isBlock) chain.setNodeSelection(position); else chain.setTextSelection(Math.min(position + (node?.isText ? 0 : 1), instance.state.doc.content.size)); chain.run();
      const element = instance.view.nodeDOM(position); const scroll = instance.view.dom.closest('.wiki-writing-scroll');
      if (element instanceof HTMLElement && scroll instanceof HTMLElement) scroll.scrollTo({ top: scroll.scrollTop + element.getBoundingClientRect().top - scroll.getBoundingClientRect().top - 24 });
    }); };
  const openDemo = useCallback(() => { ++loadSequence.current; const draft = readLocalDraft('demo'); replaceDocument(draft ? { key: 'demo', path: '', source: draft.source, pendingSource: draft.pendingSource, pendingNode: draft.pendingNode } : editorHost()?{key:crypto.randomUUID(),path:'',source:newDocumentSource(editorHost()!.contentLocale,editorHost()!.mode==='article'?'editorial-article':'project')}:{ key: 'demo', path: '', source: demoSource }); }, [replaceDocument]);
  const newDocument = () => {if(targetDirty.current){toast.info('请先完成或取消当前内容编辑，再新建词条。');return;}setMobileLibrary(false);setNavigationOpen(false);setNewDocumentOpen(true);};
  const createDocument = (type: DocumentTemplateType, locale: string) => {
    ++loadSequence.current;
    if (replaceDocument({ key: crypto.randomUUID(), path: '', source: newDocumentSource(locale, type) })) {
      focusNewTitle.current = true;
      setNewDocumentOpen(false);
      setShowProperties(true);
    }
  };
  const openDrafts = () => { persist(); try { setDrafts(listLocalDrafts()); setDraftsOpen(true); } catch { toast.error('浏览器禁止访问本地草稿'); } };
  const sidebar = <LibrarySidebar catalog={catalog} loading={catalogLoading} search={search} onSearch={setSearch} selectedPath={record.path} selectedKey={record.key} onSelect={openEntry} onDemo={openDemo} onNew={newDocument} onImport={() => fileInput.current?.click()} onDrafts={openDrafts} locale={catalogLocale} onLocale={setCatalogLocale} />;
  const navigator = <WorkspaceSidebar editor={editor} outline={outline} resources={resources} onNavigate={onNavigate} onBrowse={() => { setNavigationOpen(false); setMobileLibrary(true); }} onNew={newDocument} onDrafts={openDrafts} onReveal={() => { setView('edit'); setNavigationOpen(false); }} activePosition={activeOutline} version={contentVersion} />;
  const properties = <PropertiesPanel key={record.key + ':' + revision} metadata={metadata} onChange={changeMetadata} pending={pending} locked={Boolean(record.path || record.article || record.articleBase)} onClose={() => compactLayout ? setMobileProperties(false) : setShowProperties(false)} />;
  const nodeEditor = target ? <NodeEditor target={target} locale={metadata.locale || 'zh'} onClose={closeTarget} onDirty={markTargetDirty} onDraft={saveNodeDraft} /> : null;
  const catalogContext = useMemo(() => ({ entries: catalog, locale: metadata.locale || 'zh', loading: catalogLoading }), [catalog, metadata.locale, catalogLoading]);
  const title = metadata.name ?? metadata.title ?? '';
  const articleBodyImages=()=>{const images:{src:string;alt?:string;caption?:string}[]=[];editorRef.current?.state.doc.descendants(node=>{if(node.type.name==='image')images.push(node.attrs as {src:string;alt?:string;caption?:string});});return images;};
  const exportDocument = () => { if (targetDirty.current) { toast.info('请先完成或取消当前内容编辑，再导出 Markdown。'); return; } try { persist(); downloadMarkdown(liveSource(), title, metadata.locale); toast.success('Markdown 已导出'); } catch (error: any) { toast.error(error.message); } };
  const openReview = async () => {
    if (pendingRef.current || targetDirty.current || pendingNode.current) { toast.info('请先完成或取消尚未应用的填写内容，再检查修改。'); return; }
    if (!persist()) return;
    const selectedKey = recordRef.current.key;
    try {
      if (metadataRef.current.entityType === 'editorial-article') {
        if (recordRef.current.path && !recordRef.current.article) throw new Error('这篇原始站内文章需要先关联文章服务。当前修改仍保存在本地，可继续编辑或导出。');
        const snapshot = articleSnapshot(selectedKey, liveSource(), recordRef.current.attachments, recordRef.current.article,articleBodyImages(),recordRef.current.articleBase);
        setArticleReview({ recordKey: selectedKey, snapshot }); setReview(null); closeTarget(); setView('review'); return;
      }
      const path = recordRef.current.path || catalog.find(entry => entry.id === metadataRef.current.id && entry.locale === metadataRef.current.locale)?.path || '';
      const baseSource = recordRef.current.baseSource ?? (path ? (await jsonRequest('/__novel/source?path=' + encodeURIComponent(path))).source : '');
      if (selectedKey !== recordRef.current.key) return;
      const snapshot = reviewSnapshot(path, liveSource(), baseSource, recordRef.current.attachments);
      if (recordRef.current.create) snapshot.create = true;
      snapshot.resolution = recordRef.current.resolution;
      setReview({ recordKey: selectedKey, snapshot }); closeTarget(); setView('review');
    } catch (error: any) { toast.error(error.message); }
  };
  const restoreReviewDraft = (source: string, baseSource: string | undefined) => {
    if (!editorRef.current || !review || recordRef.current.key !== review.recordKey) return;
    try {
      const next = validateDocumentSource(source);
      if (next.id !== metadataRef.current.id || next.entityType !== metadataRef.current.entityType || next.locale !== metadataRef.current.locale) throw new Error('草稿属于其他词条，请先打开对应词条再继续编辑。');
      const loaded = loadWikiDocument(editorRef.current, source, recordRef.current.path, true);
      contextRef.current = loaded.context; metadataRef.current = loaded.metadata; setMetadata(loaded.metadata);
      recordRef.current = { ...recordRef.current, baseSource, resolution: undefined }; setRecord(recordRef.current);
      refreshOutline(editorRef.current); persist(); setView('edit'); toast.success('已载入服务端草稿，可用撤销恢复刚才的版本。');
    } catch (error: any) { toast.error(error.message); }
  };
  const acceptArticle = (receipt: ArticleReceipt) => {
    if (!editorRef.current || !articleReview || articleReview.recordKey !== recordRef.current.key) return;
    const current = liveSource(), adopt = canAdoptSubmission(current, receipt.originalSource, receipt.source);
    if (adopt && current !== receipt.source) {
      const loaded = loadWikiDocument(editorRef.current, receipt.source, recordRef.current.path, true);
      contextRef.current = loaded.context; metadataRef.current = loaded.metadata; setMetadata(loaded.metadata); refreshOutline(editorRef.current);
    }
    recordRef.current = { ...recordRef.current, article: receipt.binding, attachments: receipt.attachments }; setRecord(recordRef.current); persist();
    if(editorHost()?.mode==='article'){const url=new URL(location.href);url.searchParams.delete('id');url.searchParams.set('revision',receipt.binding.revisionId);window.history.replaceState(window.history.state,'',url);}
    const kept = adopt ? receipt.source : current;
    setArticleReview({ recordKey: recordRef.current.key, snapshot: articleSnapshot(recordRef.current.key, kept, receipt.attachments, receipt.binding,articleBodyImages()) });
    if (!adopt) toast.info('账号草稿已保存，之后新增的本地修改也已保留。');
  };
  const openArticle = (accountId: string, revision: ArticleRevision) => {
    if (!persist()) return;
    const saved = listLocalDrafts().find(draft => !/:before-(?:account-load|merge):/.test(draft.key) && draft.article?.ownerId === accountId && draft.article.articleId === revision.article_id && draft.locale === revision.locale);
    const template = saved?.source || newDocumentSource(revision.locale);
    const source = articleSourceWithContent(template, revision.content);
    if (saved && saved.source !== source) saveLocalDraft({ ...saved, key: saved.key + ':before-account-load:' + crypto.randomUUID(), title: saved.title + ' · 载入账号版本前备份', savedAt: Date.now() });
    const article: ArticleBinding = { ownerId: accountId, articleId: revision.article_id, revisionId: revision.id, locale: revision.locale, baseVersion: revision.base_version, fingerprint: revision.fingerprint, draftVersion: revision.draft_version, status: revision.status, updatedAt: revision.updated_at, withdrawnAt: revision.withdrawn_at };
    replaceDocument({ key: saved?.key || 'article:' + accountId + ':' + revision.article_id, path: '', source, article, attachments: saved?.attachments });
  };
  const reconcileReview = (source: string, baseSource: string, resolution: ReviewResolution) => {
    if (!editorRef.current || !review || recordRef.current.key !== review.recordKey) return;
    const next = validateDocumentSource(source);
    if (next.id !== metadataRef.current.id || next.entityType !== metadataRef.current.entityType || next.locale !== metadataRef.current.locale) throw new Error('合并结果的词条身份需要与当前词条一致。');
    const before = liveSource(), current = recordRef.current, meta = metadataRef.current;
    saveLocalDraft({ ...current, key: current.key + ':before-merge:' + crypto.randomUUID(), source: before, title: (meta.name || meta.title || '词条') + ' · 合并前备份', locale: meta.locale || 'zh', savedAt: Date.now() });
    const loaded = loadWikiDocument(editorRef.current, source, current.path, true);
    contextRef.current = loaded.context; metadataRef.current = loaded.metadata; setMetadata(loaded.metadata);
    recordRef.current = { ...current, baseSource, resolution, create: resolution.currentSha === null }; setRecord(recordRef.current);
    refreshOutline(editorRef.current); persist(); setView('edit'); toast.success('已保留合并前备份并载入合并结果，请检查后再提交。');
  };
  const acceptSubmission = (result: ReviewSubmission) => {
    if (!editorRef.current || !review || recordRef.current.key !== review.recordKey) return;
    const next = validateDocumentSource(result.content);
    if (next.id !== metadataRef.current.id || next.entityType !== metadataRef.current.entityType || next.locale !== metadataRef.current.locale) throw new Error('提交结果与当前词条不匹配，请保留本地草稿后重新连接。');
    const currentSource = liveSource();
    const adopt = canAdoptSubmission(currentSource, result.localInput, result.content);
    if (adopt && result.content !== currentSource) {
      const loaded = loadWikiDocument(editorRef.current, result.content, result.path, true);
      contextRef.current = loaded.context; metadataRef.current = loaded.metadata; setMetadata(loaded.metadata); refreshOutline(editorRef.current);
    }
    const attachments = result.localAssets || recordRef.current.attachments;
    recordRef.current = { ...recordRef.current, path: result.path, create: result.create, baseSource: result.baseContent, attachments, resolution: undefined }; setRecord(recordRef.current); persist();
    const keptSource = adopt ? result.content : currentSource;
    const currentAttachments = [...new Map([...(review.snapshot.attachments || []), ...(attachments || []).map(asset => ({ ...asset, url: keptSource.includes(asset.url) ? asset.url : asset.originalUrl || asset.url }))].filter(asset => keptSource.includes(asset.url)).map(asset => [asset.url, asset])).values()];
    setReview({ ...review, snapshot: { ...review.snapshot, content: keptSource, attachments: currentAttachments, create: result.create } });
    if (!adopt) toast.info('已恢复上次提交结果。之后新增的本地修改也已保留，可检查后更新同一份投稿。');
  };
  const currentImageScope = useRef(record.key + ':' + revision); currentImageScope.current = record.key + ':' + revision;
  const imageScope = useMemo<ImageUploadScope>(() => ({
    key: record.key + ':' + revision, purpose: metadata.entityType === 'editorial-article' ? 'article' : 'entry',
    isCurrent: () => currentImageScope.current === record.key + ':' + revision && !editorRef.current?.isDestroyed,
    lookup: url => { const attachment = recordRef.current.attachments?.find(asset => asset.url === url || asset.originalUrl === url); return { attachment, image: attachment?.staged?.image || metadataRef.current.articleMediaRefs?.find((image: any) => (image.src || '/_private/article-assets/' + image.assetId) === url) }; },
    remember: attachment => { if (recordRef.current.key !== record.key) return; recordRef.current = { ...recordRef.current, attachments: [...(recordRef.current.attachments || []).filter(asset => asset.url !== attachment.url), attachment] }; setRecord(recordRef.current); changed(); },
  }), [record.key, revision, metadata.entityType, changed]);
  return <CatalogContext.Provider value={catalogContext}><ImageUploadContext.Provider value={imageScope}><TooltipProvider delayDuration={350}><div className="wiki-workbench" data-properties={showProperties} data-view={view}>
    <div className="wiki-desktop-library">{navigator}</div>
    <div className="wiki-workbench-main"><header ref={headerSize.ref} className="wiki-workbench-header">
      <Button variant="ghost" size="icon" className="wiki-mobile-menu" aria-label={t("打开写作导航")} onClick={() => setNavigationOpen(true)}><Menu /></Button>
      <div className="wiki-document-heading"><div className="wiki-breadcrumb"><strong>{title || '词条'}</strong>{opening ? <Loader2 className="animate-spin" aria-label={t("正在读取词条")} /> : null}</div><span className="wiki-save-status" role="status">{storageError ? <AlertCircle aria-hidden="true" /> : status === '正在保存…' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{status}<HelpTip label="保存与投稿" text="本地保存只在当前浏览器。保存账号草稿后可继续修改；提交审核后才会进入审核队列。"/></span></div>
      <div className="wiki-header-actions">
        {headerSize.width >= 1080 ? <Button variant="ghost" onClick={() => setMobileLibrary(true)}><FileText data-icon="inline-start" />{t("打开词条")}</Button> : null}
        {headerSize.width >= 1120 ? <Button variant="ghost" onClick={() => { if (persist()) toast.success('草稿已保存到本地'); }}><Save data-icon="inline-start" />{t("保存")}</Button> : null}
        {headerSize.width >= 900 ? <Button variant="ghost" disabled={!editor || pending} onClick={exportDocument}><Download data-icon="inline-start" />{t("导出")}</Button> : null}
        {headerSize.width >= 620 ? <Button variant="default" disabled={!editor || pending || view === 'review'} onClick={openReview}><Send data-icon="inline-start" />{t("检查与投稿")}</Button> : null}
        <Button variant="outline" aria-label={view === 'preview' ? t("继续编辑") : t("预览")} aria-pressed={view === 'preview'} disabled={pending} onClick={() => changeView(view === 'preview' ? 'edit' : 'preview')}>{view === 'preview' ? <Pencil data-icon="inline-start" /> : <Eye data-icon="inline-start" />}<span>{view === 'preview' ? t("编辑") : t("预览")}</span></Button>
        <Button variant="ghost" disabled={view === 'review'} aria-label={t("词条属性")} aria-expanded={compactLayout ? mobileProperties : showProperties && view !== 'preview'} aria-haspopup={compactLayout ? 'dialog' : undefined} onClick={() => { if (view === 'preview') { setView('edit'); setShowProperties(true); if (compactLayout) setMobileProperties(true); } else compactLayout ? setMobileProperties(true) : setShowProperties(!showProperties); }}><SlidersHorizontal data-icon="inline-start" /><span>{t("属性")}</span></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={t("文档操作")}><MoreHorizontal /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="min-w-44"><DropdownMenuGroup>
          <DropdownMenuItem disabled={!editor || pending || view === 'review'} onSelect={openReview}><Send />{t("检查修改与投稿")}</DropdownMenuItem><DropdownMenuItem onSelect={() => { if (persist()) toast.success('草稿已保存到本地'); }}><Save />{t("保存本地草稿")}</DropdownMenuItem><DropdownMenuItem disabled={!editor || pending} onSelect={exportDocument}><Download />{t("导出 Markdown")}</DropdownMenuItem><DropdownMenuItem onSelect={() => { setMobileLibrary(true); }}>{t("打开其他词条")}</DropdownMenuItem><DropdownMenuItem onSelect={newDocument}>{t("新建词条")}</DropdownMenuItem><DropdownMenuItem onSelect={() => fileInput.current?.click()}>{t("导入 Markdown")}</DropdownMenuItem><DropdownMenuItem onSelect={openDrafts}>{t("本地草稿")}</DropdownMenuItem>
        </DropdownMenuGroup><DropdownMenuSeparator /><DropdownMenuGroup><DropdownMenuItem onSelect={() => { document.documentElement.classList.toggle('dark', !dark); setDark(!dark); }}>{dark ? <Sun /> : <Moon />}{dark ? t("浅色主题") : t("深色主题")}</DropdownMenuItem><DropdownMenuItem onSelect={() => changeView(view === 'source' ? 'edit' : 'source')}><Code2 />{view === 'source' ? t("返回正文") : t("查看 Markdown 源码")}</DropdownMenuItem></DropdownMenuGroup>{editorHost()?<><DropdownMenuSeparator/><DropdownMenuGroup><HostNavigation menu/></DropdownMenuGroup></>:null}</DropdownMenuContent></DropdownMenu>
      </div>
    </header><ResizablePanelGroup orientation="horizontal" className="wiki-content-grid" data-editing-dock={editingDock}>
      <ResizablePanel id="writing" minSize={compactLayout ? 0 : 350} className="wiki-writing-panel"><main className="wiki-writing-panel h-full"><div className={cn(view !== 'edit' && 'hidden')}><EditorToolbar editor={editor} open={openTarget} editingContent={Boolean(target)} /></div>
        {editingDock && compactLayout ? <div className="wiki-compact-node-dock">{nodeEditor}</div> : null}
        {storageError || loadError ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{storageError || loadError}</AlertDescription></Alert> : null}
        <div ref={writingScroll} className={cn('wiki-writing-scroll', view !== 'edit' && 'hidden')} onScroll={event => {
          if (scrollFrame.current !== null) return;
          const container = event.currentTarget;
          scrollFrame.current = requestAnimationFrame(() => {
            scrollFrame.current = null; const instance = editorRef.current; if (!instance) return;
            const boundary = container.getBoundingClientRect().top + 100; let position = outline[0]?.position ?? null;
            for (const item of outline) { const element = instance.view.nodeDOM(item.position); if (element instanceof HTMLElement && element.getBoundingClientRect().top <= boundary) position = item.position; }
            setActiveOutline(position);
          });
        }}><div ref={canvasSize.ref} className="wiki-article-canvas">
          <TextareaAutosize ref={titleInput} minRows={1} className="wiki-article-title resize-none overflow-hidden" aria-label={t("词条标题")} placeholder={t("未命名词条")} value={title} onChange={event => changeMetadata({ ...metadata, [metadata.name !== undefined ? 'name' : 'title']: event.target.value.replace(/\r?\n/g, ' ') })} onKeyDown={event => {
            if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
              event.preventDefault();
              editorRef.current?.commands.focus('start');
            }
          }} />
          {metadata.romanizedName || metadata.romanizedTitle ? <p className="wiki-article-romanized">{metadata.romanizedName || metadata.romanizedTitle}</p> : null}
          <NovelSurface key={record.key + ':' + revision} source={record.source} path={record.path} currentSource={currentSource} onReady={ready} onUpdate={documentUpdated} onTransaction={refreshOutline} open={openTarget} />
          <Button variant="ghost" className="wiki-continue-writing" onClick={() => { if (editor) editor.chain().focus().insertContentAt(editor.state.doc.content.size, { type: 'paragraph' }).run(); }}>{t("输入 / 插入内容")}</Button>
        </div></div>
        {view === 'source' ? <section className="wiki-source-pane"><div className="wiki-pane-heading"><div><h2>{t("Markdown 源码")}</h2><p>{pending ? t("修改已暂存，应用后可预览或导出。") : t("正文和词条属性的完整保存内容。")}</p></div><div className="flex gap-2"><Button variant="outline" disabled={!pending} onClick={() => { pendingRef.current = undefined; setPending(false); setSourceValue(liveSource()); persist(); setView('edit'); }}>{t("放弃修改")}</Button><Button disabled={!pending || !editor} onClick={applySource}>{t("应用源码")}</Button></div></div><SourceEditor value={sourceValue} onChange={sourceChanged} height="calc(100vh - 190px)" /></section> : null}
        {view === 'preview' ? <PreviewPane source={liveSource()} title={title} /> : null}
        {view === 'review' && articleReview ? <Suspense fallback={<p role="status">{t("正在打开文章检查…")}</p>}><ArticleReviewPane key={articleReview.recordKey} snapshot={articleReview.snapshot} onBack={() => setView('edit')} onAccepted={acceptArticle} onOpen={openArticle} /></Suspense> : null}
        {view === 'review' && review ? <Suspense fallback={<p role="status">{t("正在打开修改检查…")}</p>}><ReviewPane key={review.recordKey} snapshot={review.snapshot} onBack={() => setView('edit')} onRestore={restoreReviewDraft} onSubmitted={acceptSubmission} onReconcile={reconcileReview} /></Suspense> : null}
      </main></ResizablePanel>{['edit', 'source'].includes(view) && !compactLayout && (showProperties || editingDock) ? <><ResizableHandle withHandle className="wiki-properties-resizer" aria-label={t("调整词条属性栏宽度")} /><ResizablePanel id="properties" elementRef={propertiesScroll} defaultSize={propertiesWidth.current} minSize={320} maxSize={560} groupResizeBehavior="preserve-pixel-size" onResize={(size, _id, previous) => { if (previous && size.inPixels >= 320) { propertiesWidth.current = size.inPixels; try { localStorage.setItem('kamitsubaki-novel-local-prototype:properties-width', String(size.inPixels)); } catch { /* Width still works without storage. */ } } }} className="wiki-desktop-properties" style={{ overflow: "auto" }}>{editingDock ? nodeEditor : properties}</ResizablePanel></> : null}
    </ResizablePanelGroup></div>
    <Sheet open={navigationOpen} onOpenChange={setNavigationOpen}><SheetContent side="left" className="wiki-library-sheet"><SheetHeader className="sr-only"><SheetTitle>{t("写作导航")}</SheetTitle></SheetHeader>{navigator}</SheetContent></Sheet>
    <Sheet open={mobileLibrary} onOpenChange={setMobileLibrary}><SheetContent side="left" className="wiki-library-sheet"><SheetHeader className="sr-only"><SheetTitle>{t("词条库")}</SheetTitle></SheetHeader>{sidebar}</SheetContent></Sheet>
    <Sheet open={mobileProperties} onOpenChange={setMobileProperties}><SheetContent side="right" showCloseButton={false} className="wiki-properties-sheet"><SheetHeader className="sr-only"><SheetTitle>{t("词条属性")}</SheetTitle></SheetHeader>{properties}</SheetContent></Sheet>
    {nodeEditorHost && nodeEditor ? createPortal(nodeEditor, nodeEditorHost) : null}
    {newDocumentOpen?<NewDocumentDialog open onOpenChange={setNewDocumentOpen} initialLocale={metadata.locale||'zh'} onCreate={createDocument}/>:null}
    <Dialog open={draftsOpen} onOpenChange={setDraftsOpen}><DialogContent><DialogHeader><DialogTitle>{t("本地草稿")}</DialogTitle><DialogDescription>{t("这些草稿保存在当前浏览器中，可继续编辑或导出。")}</DialogDescription></DialogHeader><div className="wiki-draft-list">{drafts.length ? drafts.map(draft => <Button variant="ghost" className="wiki-draft-row" key={draft.key} onClick={() => { if (replaceDocument({ key: draft.key, path: draft.path, source: draft.source, baseSource: draft.baseSource, create: draft.create, attachments: draft.attachments, resolution: draft.resolution, article: draft.article, articleBase:draft.articleBase, pendingSource: draft.pendingSource, pendingNode: draft.pendingNode })) setDraftsOpen(false); }}><FileText data-icon="inline-start" /><span><strong>{draft.title}</strong><small>{new Date(draft.savedAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}</small></span></Button>) : <p>{t("还没有本地草稿。")}</p>}</div></DialogContent></Dialog>
    <input ref={fileInput} type="file" accept=".md,.markdown,text/markdown" className="hidden" aria-label={t("导入 Markdown 文件")} onChange={async event => { const input = event.currentTarget; const file = input.files?.[0]; if (!file) return; try { if (file.size > 1_000_000) throw new Error('Markdown 文件不能超过 1 MB'); const sequence = ++loadSequence.current; const source = await file.text(); if (sequence !== loadSequence.current) return; validateDocumentSource(source); replaceDocument({ key: 'import:' + crypto.randomUUID(), path: '', source }); } catch (error: any) { toast.error(error.message); } input.value = ''; }} />
    <Toaster richColors theme={dark ? 'dark' : 'light'} />
  </div></TooltipProvider></ImageUploadContext.Provider></CatalogContext.Provider>;
}
