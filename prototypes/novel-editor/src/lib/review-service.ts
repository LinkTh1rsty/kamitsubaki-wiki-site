import {editorFetch,localEditorHost} from './editor-host';
import { entitySourcePath } from '../../../../src/lib/contentLayout.mjs';
import { importMarkdown, validateDraft } from '../../../../src/lib/visualEditor.mjs';
import { metadataDisplayLabel } from './metadata-guide';
import type { WikiMetadata } from './wiki-document';
import { reviewAttachments, prepareReviewImage, type ReviewAttachment } from './review-attachments';
export type { ReviewAttachment } from './review-attachments';

export type ReviewAccount = { id: string; name: string };
export type ReviewResolution = { accountId: string; currentSha: string | null; submissionId?: string; version?: number; expectedHead?: string | null };
export type ReviewSnapshot = { path: string; content: string; title: string; kind: string; create: boolean; baseContent?: string; baseSha?: string | null; attachments?: ReviewAttachment[]; resolution?: ReviewResolution };
export type ReviewConflict = { original: string | null; yours: string; current: string; currentSha: string | null; headSha: string | null; id?: string; version?: number; branchContent?: string | null };
export type ReviewSource = { path: string; content: string; sha: string | null };
export type ReviewDraft = ReviewSnapshot & { version: number };
export type ReviewSubmission = ReviewSnapshot & { id: string; version: number; operation?: string; headSha?: string | null; status: string; sync: string; revision: number; number?: number; summary: string; source?: string; comments?: { body: string; author?: string; kind?: string; line?: number }[]; commentCount?: number; syncError?: string; assets?: { id: string; url?: string; alt?: string; source?: string }[]; localAssets?: ReviewAttachment[]; localInput?: string };
export type ReviewPage = { submissions: ReviewSubmission[]; nextBefore: number | null; nextId: string | null };
export type ReviewState = { account: ReviewAccount; snapshot: ReviewSnapshot; base: ReviewSource; draft: ReviewDraft | null; selected: ReviewSubmission | null; page: ReviewPage; conflict: boolean; pending: SubmissionRequest | null; recovered?: ReviewSubmission };
export type SubmissionRequest = ReviewSnapshot & { accountId: string; operation: string; id?: string; version?: number; resolve?: boolean; expectedHead?: string | null; summary: string; source: string; assetIds: string[]; clientAssets?: ReviewAttachment[]; clientOriginalContent?: string };
export type ReviewNotes = { summary: string; source: string; imageSources?: Record<string, string> };
export class ReviewError extends Error {
  constructor(message: string, public status = 0) { super(message); }
}
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const pendingKey = (account: string, path: string) => 'kamitsubaki-novel-local-prototype:review-operation:' + encodeURIComponent(account) + ':' + encodeURIComponent(path);
const notesKey = (account: string, path: string) => 'kamitsubaki-novel-local-prototype:review-notes:' + encodeURIComponent(account) + ':' + encodeURIComponent(path);
const open = (item: ReviewSubmission) => ['open', 'changes'].includes(item.status);

export function reviewSnapshot(path: string, content: string, baseContent?: string, ledger: ReviewAttachment[] = []): ReviewSnapshot {
  const draft = importMarkdown(content, 'articles', path) as any;
  const metadata = draft.meta as WikiMetadata;
  if (metadata.entityType === 'editorial-article' || path.startsWith('src/content/articles/')) throw new ReviewError('文章使用独立的文章投稿流程。词条审核入口适用于人物、作品、组织和企划。');
  if (!path) {
    if (!metadata.id) throw new ReviewError('请先在词条属性的高级设置中填写永久标识，用小写英文、数字和连字符，例如 my-project。');
    try { path = entitySourcePath(metadata); } catch { throw new ReviewError('请检查词条类型、永久标识和语言后再提交。'); }
  }
  const errors = validateDraft({ ...draft, path }) as string[];
  if (errors.length) {
    const contentErrors: Record<string, string> = { path: '词条目录与分类', url: '正文中的图片或媒体地址', inline: '特殊文字格式', ruby: '振假名注音', details: '折叠说明的标题', lyrics: '歌词或时间标记', code: '代码块的语言', 'media-switcher': '媒体切换的名称和平台地址' };
    const labels = [...new Set(errors.map(key => contentErrors[key] || metadataDisplayLabel(key)))];
    throw new ReviewError('请补全或检查：' + labels.join('、') + '。可返回词条属性修改。');
  }
  const attachments = reviewAttachments(content, draft.blocks, ledger, metadata);
  if (attachments.some(asset => asset.url.startsWith('/images/novel-prototype/') && !/^\/images\/novel-prototype\/[a-f0-9]{64}\.(png|jpg|webp|gif)$/.test(asset.url))) throw new ReviewError('本机图片路径不完整，请返回正文重新选择图片。');
  return { path, content, title: metadata.name || metadata.title, kind: path.split('/')[2], create: !draft.path, baseContent, ...(attachments.length ? { attachments } : {}) };
}

// The prototype is intentionally bound to the existing local service. A mode
// check before every write prevents a proxy/configuration mistake publishing it.
export class LocalReviewService {
  constructor(private request: typeof fetch = (url, options) => editorFetch(url, options), private storage: Storage = localStorage) {}
  localAccount(expected?: string, signal?: AbortSignal) { return this.session(expected, signal); }
  private async api<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal): Promise<T> {
    if (method !== 'GET') {
      const current = await this.api<{ account: ReviewAccount; mode: string }>('/api/editor/session');
      if ((localEditorHost()?current.mode !== 'local':current.mode !== 'github')) throw new ReviewError('当前入口只进行本地投稿测试，请连接本地服务。');
      const owner = (body as { accountId?: string })?.accountId;
      if (owner && owner !== current.account?.id) throw new ReviewError('登录账号已变化，请重新连接并检查当前账号的草稿和投稿。', 409);
    }
    let response: Response;
    try { response = await this.request(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined, signal }); }
    catch (error: any) { if (error.name === 'AbortError') throw error; throw new ReviewError('连接中断，正文仍保存在本地。恢复连接后可重试。'); }
    let result: any;
    try { result = await response.json(); } catch { throw new ReviewError('投稿测试服务暂未连接，正文仍保存在本地。', !response.ok && response.status >= 400 && response.status < 500 ? response.status : 0); }
    if (!response.ok) throw new ReviewError(result?.error || '请求失败，请保留本地草稿后重试。', response.status);
    return result as T;
  }
  private async session(expected?: string, signal?: AbortSignal) {
    const data = await this.api<{ account: ReviewAccount; mode: string }>('/api/editor/session', 'GET', undefined, signal);
    if ((localEditorHost()?data.mode !== 'local':data.mode !== 'github')) throw new ReviewError('当前入口只进行本地投稿测试，请连接本地服务。');
    if (!data.account?.id || (expected && data.account.id !== expected)) throw new ReviewError('登录账号已变化，请重新连接并检查当前账号的草稿和投稿。', 409);
    return data.account;
  }
  pending(account: string, path: string): SubmissionRequest | null {
    try { const value = JSON.parse(this.storage.getItem(pendingKey(account, path)) || 'null'); return value?.accountId === account && value?.path === path && typeof value?.operation === 'string' ? value : null; } catch { return null; }
  }
  notes(account: string, path: string): ReviewNotes {
    try { const value = JSON.parse(this.storage.getItem(notesKey(account, path)) || 'null'); return { summary: typeof value?.summary === 'string' ? value.summary : '', source: typeof value?.source === 'string' ? value.source : '', ...(value?.imageSources && typeof value.imageSources === 'object' && !Array.isArray(value.imageSources) ? { imageSources: Object.fromEntries(Object.entries(value.imageSources).filter((entry): entry is [string, string] => typeof entry[1] === 'string')) } : {}) }; } catch { return { summary: '', source: '' }; }
  }
  saveNotes(account: string, path: string, notes: ReviewNotes) {
    try { this.storage.setItem(notesKey(account, path), JSON.stringify(notes)); } catch { throw new ReviewError('修改说明暂时无法保存在浏览器中，请保留这段文字后重试。正文草稿不受影响。'); }
  }
  async load(snapshot: ReviewSnapshot, signal?: AbortSignal): Promise<ReviewState> {
    const account = await this.session(undefined, signal);
    const query = 'accountId=' + encodeURIComponent(account.id);
    const [base, draft, page] = await Promise.all([
      this.api<ReviewSource>('/api/editor/source?path=' + encodeURIComponent(snapshot.path) + (snapshot.create ? '&create=1' : '') + '&' + query, 'GET', undefined, signal),
      this.api<ReviewDraft | null>('/api/editor/draft?path=' + encodeURIComponent(snapshot.path) + '&' + query, 'GET', undefined, signal),
      this.api<ReviewPage>('/api/editor/submissions?' + query, 'GET', undefined, signal),
    ]);
    let active = page.submissions.find(item => item.path === snapshot.path && open(item));
    // An older open proposal can be beyond the first history page. Discover it
    // before offering a new submission for the same file.
    let cursor = page.nextBefore, cursorId = page.nextId;
    const seen = new Set<string>();
    while (!active && cursor !== null) {
      const key = cursor + ':' + cursorId;
      if (seen.has(key)) throw new ReviewError('投稿记录暂时无法完整读取，请稍后重新连接。');
      seen.add(key);
      const next = await this.api<ReviewPage>('/api/editor/submissions?' + query + '&before=' + cursor + '&beforeId=' + encodeURIComponent(cursorId || '~'), 'GET', undefined, signal);
      page.submissions.push(...next.submissions.filter(item => !page.submissions.some(prior => prior.id === item.id)));
      page.nextBefore = next.nextBefore; page.nextId = next.nextId;
      active = next.submissions.find(item => item.path === snapshot.path && open(item)); cursor = next.nextBefore; cursorId = next.nextId;
    }
    let selected = active ? await this.api<ReviewSubmission>('/api/editor/submissions/' + active.id + '?' + query, 'GET', undefined, signal) : null;
    const pending = this.pending(account.id, snapshot.path);
    // A lost HTTP response can already have created this submission. Recognize
    // the exact operation, including after reload, before allowing another one.
    const recognized = pending && (!pending.id ? page.submissions.find(item => item.id === pending.operation) : selected?.id === pending.id && selected.version === (pending.version || 0) + 1 && selected.content === pending.content && selected.summary === pending.summary && JSON.stringify(selected.assets?.map(asset => asset.id) || []) === JSON.stringify(pending.assetIds) ? selected : null);
    let recovered: ReviewSubmission | undefined;
    if (recognized && pending) {
      const detail = selected?.id === recognized.id ? selected : await this.api<ReviewSubmission>('/api/editor/submissions/' + recognized.id + '?' + query, 'GET', undefined, signal);
      recovered = { ...detail!, localAssets: pending.clientAssets, localInput: pending.clientOriginalContent || pending.content };
      if (selected?.id === recovered.id) selected = recovered;
      this.storage.removeItem(pendingKey(account.id, snapshot.path));
    }
    const resolution = snapshot.resolution;
    const approved = resolution?.accountId === account.id && resolution.currentSha === base.sha && (!selected ? !resolution.submissionId : resolution.submissionId === selected.id && resolution.version === selected.version && resolution.expectedHead === selected.headSha);
    const changedBase = snapshot.baseSha !== undefined ? snapshot.baseSha !== base.sha : snapshot.baseContent !== undefined && snapshot.baseContent !== base.content;
    const proposalConflict = Boolean(selected && (selected.sync === 'conflict' || selected.baseSha !== undefined && selected.baseSha !== base.sha));
    return { account, snapshot, base, draft, page, selected, pending: recovered ? null : pending, recovered, conflict: changedBase || proposalConflict && !approved || Boolean(resolution && !approved) };
  }
  async conflict(state: ReviewState, signal?: AbortSignal): Promise<ReviewConflict> {
    await this.session(state.account.id, signal);
    if (state.selected) return this.api('/api/editor/submissions/' + encodeURIComponent(state.selected.id) + '/conflict?accountId=' + encodeURIComponent(state.account.id), 'GET', undefined, signal);
    const base = await this.api<ReviewSource>('/api/editor/source?path=' + encodeURIComponent(state.snapshot.path) + '&accountId=' + encodeURIComponent(state.account.id), 'GET', undefined, signal);
    return { original: state.snapshot.baseContent || null, yours: state.snapshot.content, current: base.content, currentSha: base.sha, headSha: null };
  }
  async page(account: ReviewAccount, before: number, beforeId: string | null) {
    await this.session(account.id);
    return this.api<ReviewPage>('/api/editor/submissions?accountId=' + encodeURIComponent(account.id) + '&before=' + before + '&beforeId=' + encodeURIComponent(beforeId || '~'));
  }
  async detail(account: ReviewAccount, id: string) {
    await this.session(account.id);
    return this.api<ReviewSubmission>('/api/editor/submissions/' + encodeURIComponent(id) + '?accountId=' + encodeURIComponent(account.id));
  }
  async refresh(account: ReviewAccount, id: string) {
    await this.session(account.id);
    return this.api<ReviewSubmission>('/api/editor/submissions/' + encodeURIComponent(id) + '/refresh', 'POST', { accountId: account.id });
  }
  async saveDraft(state: ReviewState) {
    await this.session(state.account.id);
    if (state.conflict) throw new ReviewError('原文已更新。请先核对最新内容，避免覆盖其他人的修改。', 409);
    if (state.snapshot.attachments?.some(asset => asset.url.startsWith('/images/novel-prototype/'))) throw new ReviewError('含本机图片的草稿已自动保存在浏览器中。填写图片来源后，可将正文和图片一起提交审核。');
    return this.api<{ version: number }>('/api/editor/draft', 'PUT', { ...state.snapshot, baseSha: state.base.sha, baseContent: state.base.content, accountId: state.account.id, version: state.draft?.version || 0 });
  }
  async submit(state: ReviewState, summary: string, source: string, imageSources: Record<string, string> = {}) {
    await this.session(state.account.id);
    if (state.conflict) throw new ReviewError('原文已更新，请先核对最新内容。', 409);
    const resolution = state.snapshot.resolution;
    if (resolution && (resolution.accountId !== state.account.id || resolution.currentSha !== state.base.sha || resolution.submissionId && (resolution.submissionId !== state.selected?.id || resolution.version !== state.selected.version || resolution.expectedHead !== state.selected.headSha))) throw new ReviewError('原文或审核记录又有更新，请重新核对两边修改。', 409);
    if (!summary.trim() || summary.length > 200 || /[\u0000-\u001f\u007f]/.test(summary)) throw new ReviewError('请用 200 字以内说明这次修改了什么。');
    if (source.trim()) { try { const url = new URL(source.trim()); if (!['http:', 'https:'].includes(url.protocol)) throw Error(); } catch { throw new ReviewError('请填写完整的 HTTP 或 HTTPS 资料来源链接。'); } }
    if (!state.snapshot.resolution?.submissionId && state.snapshot.content === (state.selected?.content || state.base.content)) throw new ReviewError('这次没有新的修改，可返回正文继续编辑。');
    if (this.pending(state.account.id, state.snapshot.path)) throw new ReviewError('上一次提交的结果还未确认，请先重试上次提交。');
    const attachments = state.snapshot.attachments || [];
    if (attachments.length > 8) throw new ReviewError('每次投稿最多附带 8 张新图片，请先减少图片或分次完善词条。');
    let content = state.snapshot.content, total = 0;
    const uploaded: string[] = [], clientAssets: ReviewAttachment[] = [];
    for (const attachment of attachments) {
      const imageSource = imageSources[attachment.url] ?? attachment.source;
      if (attachment.staged) {
        if (attachment.staged.purpose !== 'entry' || attachment.staged.ownerId !== state.account.id) throw new ReviewError('图片属于另一位上传者，请切回原账号或重新选择图片。', 409);
        // Notes changed after staging must be refreshed through the same API.
        const staged = attachment.staged as typeof attachment.staged & { source?: string; alt?: string };
        if (imageSource.trim() && imageSource.trim() === staged.source && attachment.alt.trim() === staged.alt) {
          total += staged.size;
          if (total > 20 * 1024 * 1024) throw new ReviewError('投稿图片合计不能超过 20 MiB，请先减少图片。');
          uploaded.push(staged.id); clientAssets.push(attachment); continue;
        }
      }
      const existing = state.selected?.assets?.find(asset => asset.url === attachment.url && asset.source === imageSource.trim() && asset.alt === attachment.alt.trim());
      if (existing) { uploaded.push(existing.id); clientAssets.push({ ...attachment, source: imageSource.trim() }); continue; }
      const prepared = await prepareReviewImage(attachment, imageSource, this.request);
      total += prepared.metadata.size;
      if (total > 20 * 1024 * 1024) throw new ReviewError('投稿图片合计不能超过 20 MiB，请先减少图片。');
      const asset = await this.api<{ id: string; url: string }>('/api/editor/assets', 'POST', { ...prepared.metadata, content: prepared.content, accountId: state.account.id });
      content = content.split(attachment.url).join(asset.url); uploaded.push(asset.id);
      clientAssets.push({ ...attachment, url: asset.url, originalUrl: prepared.originalUrl, source: prepared.metadata.source });
    }
    if (!state.snapshot.resolution?.submissionId && content === (state.selected?.content || state.base.content)) throw new ReviewError('图片和正文与上次提交相同，尚无新的修改。');
    const payload: SubmissionRequest = { ...state.snapshot, resolution: undefined, ...(resolution?.submissionId ? { resolve: true, expectedHead: resolution.expectedHead } : {}), attachments: undefined, content, clientOriginalContent: state.snapshot.content, baseContent: state.base.content, baseSha: state.base.sha, accountId: state.account.id, id: state.selected?.id, version: state.selected?.version, operation: crypto.randomUUID(), summary: summary.trim(), source: source.trim(), assetIds: [...new Set([...(state.selected?.assets || []).filter(asset => content.includes(asset.id)).map(asset => asset.id), ...uploaded])], ...(clientAssets.length ? { clientAssets } : {}) };
    // Store the complete immutable request before sending. If the browser loses
    // the response, retrying this request uses the server's existing idempotency.
    try { this.storage.setItem(pendingKey(state.account.id, state.snapshot.path), JSON.stringify(payload)); } catch { throw new ReviewError('浏览器无法保存提交恢复记录，请先导出备份再提交。'); }
    return this.send(state.account, payload);
  }
  async retryPending(state: ReviewState) {
    await this.session(state.account.id);
    const payload = this.pending(state.account.id, state.snapshot.path);
    if (!payload) throw new ReviewError('没有待恢复的提交，请重新连接检查投稿结果。');
    return this.send(state.account, payload);
  }
  private async send(account: ReviewAccount, payload: SubmissionRequest) {
    try {
      const { clientAssets, clientOriginalContent, ...wire } = payload;
      const result = await this.api<ReviewSubmission>('/api/editor/submissions', 'POST', wire);
      const notes = this.notes(account.id, payload.path);
      if (notes.summary.trim() === payload.summary && notes.source.trim() === payload.source) this.storage.removeItem(notesKey(account.id, payload.path));
      this.storage.removeItem(pendingKey(account.id, payload.path)); return { ...result, localInput: clientOriginalContent || payload.content, ...(clientAssets?.length ? { localAssets: clientAssets } : {}) };
    } catch (error) {
      // Only a definite client rejection permits a new operation. Transport and
      // server failures keep the exact request until its outcome is known.
      if (error instanceof ReviewError && error.status >= 400 && error.status < 500) this.storage.removeItem(pendingKey(account.id, payload.path));
      throw error;
    }
  }
  async retry(account: ReviewAccount, item: ReviewSubmission) { await this.session(account.id); return this.api('/api/editor/submissions/' + item.id + '/retry', 'POST', { accountId: account.id }); }
  async withdraw(account: ReviewAccount, item: ReviewSubmission) { await this.session(account.id); return this.api<ReviewSubmission>('/api/editor/submissions/' + item.id + '/withdraw', 'POST', { accountId: account.id, version: item.version }); }
  async switchAccount(account: ReviewAccount) { if(!localEditorHost())throw new ReviewError("正式网站请通过账号菜单切换身份。"); await this.session(account.id); await this.api('/__local/session', 'POST', { account: account.id === 'alice' ? 'bob' : 'alice' }); }
}
