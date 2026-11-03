import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { LocalReviewService, reviewSnapshot, type ReviewSnapshot, type ReviewSubmission } from '../src/lib/review-service';
import { canAdoptSubmission, reviewAttachments } from '../src/lib/review-attachments';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL3cAAAAASUVORK5CYII=', 'base64');

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const snapshot: ReviewSnapshot = { path: 'src/content/people/solo/kaf/zh.md', title: '花譜', kind: 'people', content: '新内容', baseContent: '原内容', create: false };
function fakeServer() {
  const server = { account: 'alice', mode: 'local', base: '原内容', sha: 'sha-a', draftVersion: 0, draft: null as any, entry: null as ReviewSubmission | null, submissions: [] as ReviewSubmission[], lostResponse: false, reject: 0, writes: [] as { path: string; body: any }[] };
  const request: typeof fetch = async (url, options) => {
    const path = String(url).split('?')[0];
    const body = options?.body ? JSON.parse(String(options.body)) : undefined;
    if (path.startsWith('/images/novel-prototype/') && (options?.method || 'GET') === 'GET') return new Response(png, { headers: { 'Content-Type': 'image/png' } });
    if (path === '/api/editor/session') return Response.json({ account: { id: server.account, name: server.account }, mode: server.mode });
    if (options?.method === 'GET') {
      if (path === '/api/editor/source') return Response.json({ path: snapshot.path, content: server.base, sha: server.sha });
      if (path === '/api/editor/draft') return Response.json(server.draft);
      if (path === '/api/editor/submissions') return Response.json({ submissions: server.submissions.length ? server.submissions : server.entry ? [server.entry] : [], nextBefore: null, nextId: null });
      if (path.startsWith('/api/editor/submissions/')) return Response.json(server.entry);
    }
    server.writes.push({ path, body });
    if (server.reject) return Response.json({ error: '原文已更新' }, { status: server.reject });
    if (path === '/api/editor/draft') {
      if (body.version !== server.draftVersion) return Response.json({ error: '草稿已在其他页面更新，请重新读取' }, { status: 409 });
      server.draft = { ...body, version: ++server.draftVersion }; return Response.json({ version: server.draftVersion });
    }
    if (path === '/api/editor/submissions') {
      if (!server.entry) server.entry = { ...body, assets: body.assetIds.map((id: string) => ({ id })), id: body.operation, status: 'open', sync: 'pending', version: 1, revision: 1 };
      if (server.lostResponse) { server.lostResponse = false; throw new TypeError('Failed to fetch'); }
      return Response.json(server.entry);
    }
    if (path === '/api/editor/assets') return Response.json({ id: body.id, url: body.url });
    throw Error('Unexpected request: ' + path);
  };
  return { server, request };
}

test('directly staged entry uploads retain ownership and join the existing submission without reupload',async()=>{
 const {server,request}=fakeServer(),client=new LocalReviewService(request,new MemoryStorage()),id='f'.repeat(64),url='/images/contributions/'+id+'.png';
 const attachment={url,alt:'图片说明',source:'本人创作',staged:{purpose:'entry' as const,id,ownerId:'alice',size:100,mime:'image/png',source:'本人创作',alt:'图片说明'}};
 const loaded=await client.load({...snapshot,content:snapshot.content+'\n![图片说明]('+url+')\n',attachments:[attachment]});
 const result=await client.submit(loaded,'补充图片','');assert.deepEqual(result.assets?.map(asset=>asset.id),[id]);assert.equal(server.writes.filter(row=>row.path==='/api/editor/assets').length,0);
 const other=new LocalReviewService(request,new MemoryStorage());server.account='bob';server.entry=null;const changed=await other.load({...snapshot,content:loaded.snapshot.content,attachments:[attachment]}),writes=server.writes.length;
 await assert.rejects(other.submit(changed,'补充图片',''),/另一位上传者/);assert.equal(server.writes.length,writes);
});
test('local review uses real source metadata and readable schema errors', async () => {
  const source = await readFile(new URL('../../../src/content/people/solo/kaf/zh.md', import.meta.url), 'utf8');
  const ready = reviewSnapshot(snapshot.path, source, source);
  assert.equal(ready.path, snapshot.path); assert.equal(ready.content, source); assert.equal(ready.create, false);
  assert.throws(() => reviewSnapshot('', source.replace(/^id:.*$/m, 'id: ""')), /永久标识/);
  assert.throws(() => reviewSnapshot(snapshot.path, source.replace(/^romanizedName:.*$/m, 'romanizedName: ""')), /罗马字名称/);
  assert.throws(() => reviewSnapshot(snapshot.path, source.replace('/images/artists/kaf.jpg', '/images/novel-prototype/test.jpg')), /本机图片路径/);
});
test('lost submission response retries the exact operation and content after editor changes', async () => {
  const { server, request } = fakeServer(); const storage = new MemoryStorage(); const client = new LocalReviewService(request, storage);
  const state = await client.load(snapshot); server.lostResponse = true;
  await assert.rejects(client.submit(state, '补充资料', ''), /连接中断/);
  const pending = client.pending('alice', snapshot.path)!;
  assert.ok(pending.operation); assert.equal(pending.content, snapshot.content);
  const recreated = new LocalReviewService(request, storage);
  const result = await recreated.retryPending({ ...state, snapshot: { ...snapshot, content: '之后又修改的文字' } });
  assert.equal(result.id, pending.operation);
  const posts = server.writes.filter(item => item.path === '/api/editor/submissions');
  assert.deepEqual(posts[1].body, posts[0].body, 'retry cannot use a different snapshot or summary');
  assert.equal(recreated.pending('alice', snapshot.path), null);
});
test('reload recognizes a created submission with a lost response instead of creating a duplicate', async () => {
  const { server, request } = fakeServer(); const storage = new MemoryStorage(); const client = new LocalReviewService(request, storage);
  const state = await client.load(snapshot); server.lostResponse = true;
  await assert.rejects(client.submit(state, '补充资料', ''), /连接中断/);
  const recovered = await new LocalReviewService(request, storage).load(snapshot);
  assert.equal(recovered.pending, null); assert.equal(recovered.selected?.content, snapshot.content);
  assert.equal(server.writes.filter(item => item.path === '/api/editor/submissions').length, 1);
});
test('account change and production service mode prevent any write', async () => {
  const { server, request } = fakeServer(); const client = new LocalReviewService(request, new MemoryStorage());
  const state = await client.load(snapshot); server.account = 'bob';
  await assert.rejects(client.saveDraft(state), /登录账号已变化/);
  await assert.rejects(client.submit(state, '补充资料', ''), /登录账号已变化/);
  server.account = 'alice'; server.mode = 'github';
  await assert.rejects(client.saveDraft(state), /只进行本地投稿测试/);
  assert.equal(server.writes.length, 0);
});
test('changed main source blocks submission and draft writes while preserving the snapshot', async () => {
  const { server, request } = fakeServer(); server.base = '他人更新的原文'; server.sha = 'sha-b';
  const client = new LocalReviewService(request, new MemoryStorage()); const state = await client.load(snapshot);
  assert.equal(state.conflict, true); assert.equal(state.snapshot.content, '新内容');
  await assert.rejects(client.submit(state, '补充资料', ''), /原文已更新/);
  await assert.rejects(client.saveDraft(state), /原文已更新/);
  assert.equal(server.writes.length, 0);
});
test('service drafts use compare-and-swap versions and reject stale pages', async () => {
  const { server, request } = fakeServer(); const client = new LocalReviewService(request, new MemoryStorage()); const state = await client.load(snapshot);
  assert.equal((await client.saveDraft(state)).version, 1);
  await assert.rejects(client.saveDraft(state), /草稿已在其他页面更新/);
  assert.equal(server.draftVersion, 1); assert.equal(server.draft.content, snapshot.content);
});
test('definite rejection clears an operation while server failures keep a recoverable request', async () => {
  const { server, request } = fakeServer(); const client = new LocalReviewService(request, new MemoryStorage()); const state = await client.load(snapshot);
  server.reject = 409; await assert.rejects(client.submit(state, '修正资料', ''), /原文已更新/); assert.equal(client.pending('alice', snapshot.path), null);
  server.reject = 503; await assert.rejects(client.submit(state, '修正资料', ''), /原文已更新/); assert.ok(client.pending('alice', snapshot.path));
  await assert.rejects(client.submit(state, '修正新资料', ''), /上一次提交/);
});
test('browser fetch is called without binding it to the service instance', async () => {
  const { request } = fakeServer(); const previous = globalThis.fetch;
  try {
    globalThis.fetch = async function(url, options) { assert.equal(this, undefined, 'WebKit requires the correct native fetch receiver'); return request(url, options); };
    const state = await new LocalReviewService(undefined, new MemoryStorage()).load(snapshot); assert.equal(state.account.id, 'alice');
  } finally { globalThis.fetch = previous; }
});
test('an older open submission is discovered beyond the first history page', async () => {
  const { server, request } = fakeServer();
  const existing: ReviewSubmission = { ...snapshot, id: 'existing-submission', status: 'open', sync: 'synced', version: 4, revision: 2, summary: '上一版修改' };
  server.entry = existing;
  let pages = 0;
  const paginated: typeof fetch = async (url, options) => {
    const address = new URL(String(url), 'http://local');
    if (address.pathname === '/api/editor/submissions' && options?.method === 'GET') {
      pages++;
      return Response.json(address.searchParams.has('before') ? { submissions: [existing], nextBefore: null, nextId: existing.id } : { submissions: [{ ...existing, id: 'other', path: 'src/content/units/other/zh.md', status: 'closed' }], nextBefore: 100, nextId: 'other' });
    }
    return request(url, options);
  };
  const state = await new LocalReviewService(paginated, new MemoryStorage()).load(snapshot);
  assert.equal(pages, 2); assert.equal(state.selected?.id, 'existing-submission'); assert.equal(state.selected?.version, 4);
});
test('unfinished review notes survive reopening and stay isolated by account and document', () => {
  const { request } = fakeServer(); const storage = new MemoryStorage();
  const client = new LocalReviewService(request, storage); client.saveNotes('alice', snapshot.path, { summary: '还未提交的修改说明', source: 'https://example.com/original' });
  assert.deepEqual(new LocalReviewService(request, storage).notes('alice', snapshot.path), { summary: '还未提交的修改说明', source: 'https://example.com/original' });
  assert.deepEqual(client.notes('bob', snapshot.path), { summary: '', source: '' });
  assert.deepEqual(client.notes('alice', 'src/content/units/vwp/zh.md'), { summary: '', source: '' });
});
test('local images become verified submission attachments and keep an original ledger for reopening', async () => {
  const { server, request } = fakeServer(); const client = new LocalReviewService(request, new MemoryStorage());
  const url = '/images/novel-prototype/' + 'a'.repeat(64) + '.png';
  const content = snapshot.content + `\n\n![测试图片](${url})`;
  const state = await client.load({ ...snapshot, content, attachments: [{ url, alt: '测试图片', source: '' }] });
  await assert.rejects(client.submit(state, '补充图片', ''), /填写一行来源/);
  const result = await client.submit(state, '补充图片', '', { [url]: '本地功能测试专用图片，不作为发布素材' });
  const upload = server.writes.find(item => item.path === '/api/editor/assets')!;
  assert.equal(Buffer.from(upload.body.content, 'base64').compare(png), 0);
  assert.ok(!result.content.includes('/images/novel-prototype/')); assert.ok(result.content.includes('/images/contributions/'));
  assert.equal(result.assets?.[0].id, upload.body.id); assert.equal(result.localAssets?.[0].originalUrl, url); assert.equal(result.localInput, content);
  const wire = server.writes.find(item => item.path === '/api/editor/submissions')!.body;
  assert.equal(wire.clientAssets, undefined); assert.equal(wire.clientOriginalContent, undefined);
  assert.equal(reviewAttachments(result.content, [], result.localAssets)[0].originalUrl, url);
  assert.equal(reviewAttachments(content + '\n继续写作', [], result.localAssets)[0].url, url, 'newer local prose still has its original image');
});
test('a lost image submission response restores both the operation and its original image ledger', async () => {
  const { server, request } = fakeServer(); const storage = new MemoryStorage(); const client = new LocalReviewService(request, storage);
  const url = '/images/novel-prototype/' + 'b'.repeat(64) + '.png';
  const content = snapshot.content + `\n\n![测试图片](${url})`;
  const state = await client.load({ ...snapshot, content, attachments: [{ url, alt: '测试图片', source: '本地功能测试专用图片' }] });
  server.lostResponse = true; await assert.rejects(client.submit(state, '补充图片', ''), /连接中断/);
  const newer = { ...snapshot, content: content + '\n之后新增的正文' };
  const recovered = await new LocalReviewService(request, storage).load(newer);
  assert.equal(recovered.pending, null); assert.equal(recovered.recovered?.localInput, content); assert.equal(recovered.recovered?.localAssets?.[0].originalUrl, url);
  assert.equal(canAdoptSubmission(newer.content, recovered.recovered?.localInput, recovered.recovered!.content), false, 'recovering an old packet must not overwrite newer prose');
  assert.equal(canAdoptSubmission(content, recovered.recovered?.localInput, recovered.recovered!.content), true);
  assert.equal(server.writes.filter(item => item.path === '/api/editor/submissions').length, 1);
});

test('updating an existing proposal reuses its unchanged image and allows a service draft', async () => {
  const { server, request } = fakeServer();
  const id = 'c'.repeat(64), original = '/images/novel-prototype/' + id + '.png', url = '/images/contributions/' + id + '.png';
  const asset = { id, url, alt: '保留图片', source: '已确认来源' };
  server.entry = { ...snapshot, id: 'same-proposal', content: '上一版正文\n![' + asset.alt + '](' + url + ')', version: 2, revision: 2, status: 'open', sync: 'synced', summary: '上一版', assets: [asset] };
  const client = new LocalReviewService(request, new MemoryStorage());
  const state = await client.load({ ...snapshot, content: server.entry.content + '\n新补充的正文', attachments: [{ url, originalUrl: original, alt: asset.alt, source: asset.source }] });
  assert.equal((await client.saveDraft(state)).version, 1);
  await client.submit(state, '补充正文', '');
  const submission = server.writes.find(item => item.path === '/api/editor/submissions')!.body;
  assert.equal(submission.id, 'same-proposal'); assert.equal(submission.version, 2);
  assert.deepEqual(submission.assetIds, [id]);
  assert.equal(server.writes.filter(item => item.path === '/api/editor/assets').length, 0);
});
test('every attachment write rechecks account and local mode after reading the image', async () => {
  for (const change of ['account', 'mode']) {
    const { server, request } = fakeServer();
    const guarded: typeof fetch = async (url, options) => {
      if (String(url).startsWith('/images/')) { if (change === 'account') server.account = 'bob'; else server.mode = 'github'; }
      return request(url, options);
    };
    const client = new LocalReviewService(guarded, new MemoryStorage());
    const url = '/images/novel-prototype/' + 'd'.repeat(64) + '.png';
    const state = await client.load({ ...snapshot, content: snapshot.content + '\n![](' + url + ')', attachments: [{ url, alt: '', source: '测试来源' }] });
    await assert.rejects(client.submit(state, '添加图片', ''), change === 'account' ? /账号已变化/ : /只进行本地投稿测试/);
    assert.equal(server.writes.length, 0);
  }
});

test('only real image references become attachments; code examples and removed images stay ordinary text', () => {
  const url = '/images/novel-prototype/' + 'e'.repeat(64) + '.png';
  const canonical = '/images/contributions/' + 'e'.repeat(64) + '.png';
  const code = '```markdown\n![示例](' + url + ')\n```\n\n`![示例](' + url + ')`';
  assert.deepEqual(reviewAttachments(code, []), []);
  assert.deepEqual(reviewAttachments('`![已移除图片](' + canonical + ')`', [], [{ url: canonical, originalUrl: url, alt: '', source: '来源' }]), []);
  assert.equal(reviewAttachments('正文 ![实际图片](' + url + ')', [])[0].alt, '实际图片');
  assert.equal(reviewAttachments('没有正文图片', [], [], { title: '封面', presentation: { image: url } })[0].alt, '封面');
  assert.equal(reviewAttachments('<details><summary>图片</summary>\n\n![折叠图片](' + url + ')\n\n</details>', []).length, 1);
});

test('resolved proposals retain head and version guards; any newer source needs another comparison', async () => {
  const { server, request } = fakeServer(); server.base = '最新原文'; server.sha = 'sha-b';
  server.entry = { ...snapshot, id: 'conflicting-proposal', headSha: 'head-a', baseSha: 'sha-a', status: 'open', sync: 'conflict', version: 3, revision: 1, summary: '我的旧修改' };
  const client = new LocalReviewService(request, new MemoryStorage());
  const stale = await client.load({ ...snapshot, baseContent: server.base }); assert.equal(stale.conflict, true);
  const merged = { ...snapshot, content: '我的修改与最新原文已合并', baseContent: server.base, resolution: { accountId: 'alice', currentSha: 'sha-b', submissionId: server.entry.id, version: 3, expectedHead: 'head-a' } };
  const ready = await client.load(merged); assert.equal(ready.conflict, false);
  await client.submit(ready, '核对两边改动', '');
  const wire = server.writes.find(item => item.path === '/api/editor/submissions')!.body;
  assert.equal(wire.resolve, true); assert.equal(wire.expectedHead, 'head-a'); assert.equal(wire.version, 3); assert.equal(wire.baseSha, 'sha-b');
  server.sha = 'sha-c'; server.base = '原文再次更新'; assert.equal((await client.load(merged)).conflict, true);
});
test('resolving a conflict may intentionally retain the same prose, but a newer review head pauses it', async () => {
  const { server, request } = fakeServer(); server.base = '最新原文'; server.sha = 'sha-b';
  server.entry = { ...snapshot, id: 'same-prose', headSha: 'head-a', baseSha: 'sha-a', status: 'open', sync: 'conflict', version: 4, revision: 1, summary: '保留正文' };
  const client = new LocalReviewService(request, new MemoryStorage());
  const resolved = { ...snapshot, baseContent: server.base, resolution: { accountId: 'alice', currentSha: 'sha-b', submissionId: 'same-prose', version: 4, expectedHead: 'head-a' } };
  await client.submit(await client.load(resolved), '已核对，保留这一版正文', '');
  assert.equal(server.writes.find(row => row.path === '/api/editor/submissions')!.body.resolve, true);
  server.entry.headSha = 'head-b'; server.entry.baseSha = 'sha-b'; server.entry.sync = 'synced';
  assert.equal((await client.load(resolved)).conflict, true, 'a new branch head cannot reuse an old approval even if main is unchanged');
});

test('explicit refresh reconciles upstream status and rejects a changed account', async()=>{
 const calls:{path:string;method:string;body:any}[]=[];let owner='alice';
 const request:typeof fetch=async(url,options)=>{
  const path=String(url);if(path==='/api/editor/session')return Response.json({account:{id:owner,name:owner},mode:'local'});
  calls.push({path,method:options?.method||'GET',body:JSON.parse(String(options?.body||'null'))});
  return Response.json({id:'pr-1',status:'merged',sync:'synced'});
 };
 const service=new LocalReviewService(request,new MemoryStorage());
 assert.equal((await service.refresh({id:'alice',name:'alice'},'pr-1')).status,'merged');
 assert.deepEqual(calls,[{path:'/api/editor/submissions/pr-1/refresh',method:'POST',body:{accountId:'alice'}}]);
 owner='bob';await assert.rejects(service.refresh({id:'alice',name:'alice'},'pr-1'),/账号已变化/);
 assert.equal(calls.length,1);
});
