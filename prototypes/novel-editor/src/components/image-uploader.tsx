import {workbenchText as t} from '@/lib/workbench-copy';
import {editorApiUrl,localEditorHost,registerStagedImage} from '@/lib/editor-host';
import { useContext, useEffect, useRef, useState } from 'react';
import Dashboard from '@uppy/dashboard';
import {uploadLocale} from '../../../../src/lib/uploadLocale.mjs';
import {editorHost} from '@/lib/editor-host';
import '@uppy/core/css/style.min.css';
import '@uppy/dashboard/css/style.min.css';
import { createImageUploadQueue } from '../../../../src/lib/galleryUploadQueue.mjs';
import { imageCandidate } from '../../../../src/lib/editorAttachments.mjs';
import { ImageUploadContext } from '@/lib/image-upload-context';
import { LocalReviewService } from '@/lib/review-service';
import type { ArticleImage } from '@/lib/article-document';
import type { ReviewAttachment } from '@/lib/review-attachments';
import { Button } from '@/components/ui/button';

// Dashboard owns selection, drag/drop, progress, cancellation and retry. The
// site queue owns transport; this adapter only supplies the existing API jobs.
export function ImageUploader({ source, image, dark, onUploaded, onBusy }: {
  source: string; image: ArticleImage; dark: boolean;
  onUploaded: (attachment: ReviewAttachment) => void; onBusy: (busy: boolean) => void;
}) {
  const scope = useContext(ImageUploadContext);
  const host = useRef<HTMLDivElement>(null);
  const current = useRef({ source, image, onUploaded, onBusy }); current.current = { source, image, onUploaded, onBusy };
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!scope || !host.current) return;
    setReady(false); setError('');
    let cancelled = false, transport: ReturnType<typeof createImageUploadQueue> | undefined;
    let settling = 0, transferComplete = false;
    const sessions = new LocalReviewService();
    const run = async () => {
      try {
        const account = await sessions.localAccount();
        const submittedNotes = new Map<string, { source: string; image: ArticleImage }>();
        if (cancelled || !scope.isCurrent() || !host.current) return;
        transport = createImageUploadQueue({ locale:editorHost()?.locale, restrictions: { maxNumberOfFiles: 1, maxFileSize: scope.purpose === 'entry' ? 25 * 1024 * 1024 : 20 * 1024 * 1024, allowedFileTypes: scope.purpose === 'entry' ? ['image/png', 'image/jpeg', 'image/webp'] : ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] },
          onBeforeUpload: () => {
            if (!scope.isCurrent()) return false;
            const note = current.current;
            if (scope.purpose === 'entry' && (!note.source.trim() || note.source.length > 2048 || /[\u0000-\u001f\u007f]/.test(note.source))) {
              transport!.queue.info('请先填写一行图片来源链接或授权说明。', 'error', 5000); return false;
            }
            for (const file of transport!.queue.getFiles()) {
              if (file.meta.preparing) { transport!.queue.info('正在准备图片，请稍后上传。', 'info', 3000); return false; }
              transport!.setJob(file.id, { id: file.id, file: file.data, url: editorApiUrl(scope.purpose === 'article' ? '/api/articles/assets' : '/api/editor/assets'), headers: localEditorHost()?{ 'X-Novel-Local-Account': account.id }:{}, metadata: { accountId: account.id, declaredMime: file.type, source: note.source.trim(), alt: note.image.alt, name: file.name } });
              submittedNotes.set(file.id, { source: note.source.trim(), image: structuredClone(note.image) });
            }
            return true;
          },
          onResult: async (result: any) => {
            if (cancelled || !scope.isCurrent()) return;
            if (result.error) { setError(result.error.message); return; }
            settling++;
            try {
              await sessions.localAccount(account.id);
              if (cancelled || !scope.isCurrent()) return;
              const asset = result.response.asset || result.response;
              if (!/^[a-f0-9]{64}$/.test(asset.id) || !(asset.reference || asset.url)) throw Error(t('图片暂存回执不完整，请重试。'));
              const note = submittedNotes.get(result.id);
              if (!note) throw Error(t('图片填写信息已变化，请重新选择。'));
              registerStagedImage(asset.id);
              const attachment: ReviewAttachment = { url: asset.reference || asset.url, alt: note.image.alt, source: note.source, staged: { purpose: scope.purpose, id: asset.id, ownerId: account.id, size: asset.size, mime: asset.mime, source: note.source, alt: note.image.alt.trim(), ...(scope.purpose === 'article' ? { image: { ...note.image, assetId: asset.id } } : {}) } };
              scope.remember(attachment); current.current.onUploaded(attachment); setError('');
            } catch (err: any) { if (!cancelled) setError(err.message); }
            finally { settling--; if (!cancelled && transferComplete && !settling) current.current.onBusy(false); }
          },
        });
        const { queue } = transport;
        queue.use(Dashboard, { target: host.current, inline: true, width: '100%', height: 280, locale: uploadLocale(editorHost()?.locale), theme: dark ? 'dark' : 'light', proudlyDisplayPoweredByUppy: false, hideProgressDetails: false, showRemoveButtonAfterComplete: true, note: scope.purpose === 'entry' ? t("PNG、JPEG、WebP；超过 4 MiB 会另存压缩副本，原图保持不变。") : t("PNG、JPEG、WebP、GIF；单张最多 20 MiB。"), fileManagerSelectionType: 'files' });
        queue.on('file-added', async (file: any) => {
          if (scope.purpose !== 'entry') return;
          queue.setFileMeta(file.id, { preparing: true });
          try {
            const original = new File([file.data], file.name, { type: file.type });
            const candidate = await imageCandidate(original);
            if (cancelled || !queue.getFile(file.id)) return;
            queue.setFileState(file.id, { data: candidate.file, size: candidate.file.size, type: candidate.file.type, name: candidate.file.name });
            queue.setFileMeta(file.id, { preparing: false });
            if (candidate.optimized) queue.info('已准备压缩副本，原图保持不变。', 'info', 4000);
          } catch (err: any) { if (!cancelled && queue.getFile(file.id)) { queue.removeFile(file.id); setError(err.message); } }
        });
        queue.on('upload', () => { transferComplete = false; setError(''); current.current.onBusy(true); });
        queue.on('complete', () => { transferComplete = true; if (!settling) current.current.onBusy(false); });
        queue.on('cancel-all', () => current.current.onBusy(false));
        setReady(true);
      } catch (err: any) { if (!cancelled) setError(err.message); }
    };
    void run();
    return () => { cancelled = true; transport?.destroy(); current.current.onBusy(false); };
  }, [scope?.key, scope?.purpose, dark, attempt]);
  return <section className="wiki-image-upload" aria-label={t("上传图片")}><p className="wiki-node-editor-help">{t("图片使用站内私有暂存，完成编辑后插入正文，随投稿一起审核。")}</p>{!ready && !error ? <p role="status">{t("正在连接图片暂存…")}</p> : null}<div ref={host} />{error ? <p role="alert" className="text-destructive">{error}</p> : null}{error && !ready ? <Button variant="outline" onClick={() => setAttempt(value => value + 1)}>{t("重新连接上传")}</Button> : null}</section>;
}
