import {workbenchText as t} from '@/lib/workbench-copy';
import {editorFetch as fetch,editorHost,localEditorHost,previewAssetUrl,previewHTML,restoreBrowserImages,registerStagedImages} from '@/lib/editor-host';
import { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { ReaderInfoBox } from './reader-info-box';
import type { WikiMetadata } from '@/lib/wiki-document';
import type { entityInfoModel } from '../../../../src/lib/entityInfoModel.mjs';
import { enhanceReader } from '../../../../src/lib/readerEnhancements.mjs';
import { initializeReaderInteractions } from '../../../../src/lib/readerInteractions.mjs';
import { initWikiPreviews } from '../../../../src/lib/wikiPreviews';
async function jsonRequest(url: string, options: RequestInit) {
  const response = await fetch(url, options); const body = await response.json();
  if (!response.ok) throw new Error(body.error || '阅读预览暂时无法连接，请保留本地草稿后重试。'); return body;
}
export function PreviewPane({ source, title, compact = false }: { source: string; title: string; compact?: boolean }) {
  const [rendered, setRendered] = useState<{ html: string; previews: Record<string, any>; metadata: WikiMetadata; info: ReturnType<typeof entityInfoModel>; missing: string[]; version: number } | null>(null); const [error, setError] = useState('');
  const renderSequence = useRef(0);
  const previewRoot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!rendered || !previewRoot.current) return;
    const root = previewRoot.current; let active = true;
    document.documentElement.classList.add('has-js');
    enhanceReader(root, rendered.metadata.locale || 'zh');
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(link => {
      if (!link.getAttribute('href')?.startsWith('#')) { link.target = '_blank'; link.rel = 'noopener'; if (link.getAttribute('href')?.startsWith('/')) link.href = 'https://kamitsubaki.wiki' + link.getAttribute('href'); }
    });
    const stopInteractions = initializeReaderInteractions(root);
    const previews = Object.fromEntries(Object.entries(rendered.previews).map(([id, preview]) => [id, { ...preview, url: preview.url?.startsWith('/') ? 'https://kamitsubaki.wiki' + preview.url : preview.url }]));
    const stopPreviews = initWikiPreviews(root, previews);
    import('../../../../src/scripts/mediaSwitcher.js').then(module => { if (active) (module.initializeMediaSwitchers as (root: ParentNode) => void)(root); });
    return () => { active = false; stopInteractions(); stopPreviews(); };
  }, [rendered]);
  useEffect(() => { const controller = new AbortController(); setError(''); jsonRequest('/__novel/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source }), signal: controller.signal }).then(async result => { await restoreBrowserImages(source); if (!controller.signal.aborted) setRendered({ ...result, html:previewHTML(result.html), version: ++renderSequence.current }); }).catch(error => { if (error.name !== 'AbortError') setError(error.message); }); return () => controller.abort(); }, [source]);
  const article=rendered?.metadata.entityType==='editorial-article';
  return <section className={compact ? "wiki-review-reader" : "wiki-preview-pane"}>{!compact ? <h1>{title}</h1> : null}{!compact && rendered?.metadata.summary ? <p className="wiki-preview-summary">{rendered.metadata.summary}</p> : null}{error ? <Alert variant="destructive"><AlertCircle /><AlertDescription>{error}</AlertDescription></Alert> : !rendered ? <p role="status">{t("正在读取阅读器预览…")}</p> : <div className="wiki-preview-reader-layout" data-kind={article?'article':'entity'}><div key={rendered.version} ref={previewRoot} onErrorCapture={event=>{const image=event.target;if(image instanceof HTMLImageElement&&image.closest('.wiki-speech-avatar'))image.hidden=true;}} className="wiki-reader wiki-prose wiki-preview-prose" dangerouslySetInnerHTML={{ __html: rendered.html }} />{!compact && !article && rendered.info ? <ReaderInfoBox model={rendered.info} /> : null}</div>}</section>;
}
