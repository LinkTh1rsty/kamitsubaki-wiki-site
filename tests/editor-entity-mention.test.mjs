import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { parse } from 'yaml';
import { entityRoute } from '../src/lib/entityModel.mjs';
import { entityLabel } from '../src/lib/entityLabels.mjs';
import { buildEditorEntityMention, normalizeEditorEntityRecord, safeEditorEntityUrl, searchEditorEntityCatalog } from '../src/lib/editorEntityMention.mjs';
import { renderMarkdownDocument } from '../src/lib/markdown.mjs';

const entity = { kind:'people', id:'observer', entityType:'virtual-avatar', title:'観測者', romanized:'Kansokusha', aliases:['カミツバキ'], url:'/zh/database/artists/solo/observer/' };

test('mention links accept the same canonical route shape as published V3 entities', async () => {
  const source = await readFile(new URL('../src/content/people/solo/kaf/zh.md',import.meta.url),'utf8');
  const data = parse(source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/)[1]);
  const url = `/zh${entityRoute(data)}`;
  assert.equal(url,'/zh/database/artists/solo/kaf/');
  assert.equal(safeEditorEntityUrl(url,'zh','kaf'),url);
  assert.equal(buildEditorEntityMention({...entity,id:'kaf',title:'花譜',url}).markdown,`[花譜](${url})`);
});

test('search folds simplified, traditional, Japanese kanji and kana', () => {
  const catalog = [entity,{...entity,id:'other',title:'別の曲',romanized:'Another song',aliases:[],url:'/zh/database/music/songs/other/'}];
  assert.deepEqual(searchEditorEntityCatalog(catalog,'观测',{locale:'zh'}).map(item=>item.id),['observer']);
  assert.deepEqual(searchEditorEntityCatalog(catalog,'觀測',{locale:'zh'}).map(item=>item.id),['observer']);
  assert.deepEqual(searchEditorEntityCatalog(catalog,'かみつばき',{locale:'zh'}).map(item=>item.id),['observer']);
  assert.deepEqual(searchEditorEntityCatalog(catalog,'Kansokusha',{locale:'zh'}).map(item=>item.id),['observer']);
  assert.deepEqual(searchEditorEntityCatalog(catalog,' ',{locale:'zh'}),[]);
});

test('mention suggestions can reuse readable site-wide type labels in every UI language', () => {
  for(const locale of ['zh','zh-tw','zh-hk','ja','en'])
    for(const type of ['virtual-avatar','work-track','work-release','live-event'])
      assert.notEqual(entityLabel(type,locale),type,`${locale}: ${type}`);
});

test('legacy and malformed records never produce a mention', () => {
  const bad = [
    {...entity,url:null},
    {...entity,url:'https://example.com/observer/'},
    {...entity,url:'//example.com/zh/database/artists/solo/observer/'},
    {...entity,url:'/ja/database/artists/solo/observer/'},
    {...entity,url:'/zh/database/artists/solo/observer/?preview=1'},
    {...entity,url:'/zh/database/artists/solo/../observer/'},
    {...entity,url:'/zh/database/artists/solo/%6fbserver/'},
    {...entity,url:'/zh/database/artists/solo/other/'},
    {...entity,id:'observer/other'},
    {...entity,entityType:'imaginary-type'},
  ];
  for (const record of bad) {
    assert.equal(normalizeEditorEntityRecord(record,'zh'),null);
    assert.equal(buildEditorEntityMention(record,{locale:'zh'}),null);
  }
  assert.deepEqual(searchEditorEntityCatalog([...bad,entity],'観測',{locale:'zh'}).map(item=>item.id),['observer']);
});

test('a selected label cannot break out of the Markdown link', async () => {
  const value = buildEditorEntityMention(entity,{locale:'zh',label:'<img src=x onerror=alert(1)>](javascript:alert(1))'});
  assert.ok(value);
  assert.doesNotMatch(value.markdown,/<img|\]\(javascript:/);
  const {html} = await renderMarkdownDocument(value.markdown);
  assert.match(html,/href="\/zh\/database\/artists\/solo\/observer\/"/);
  assert.doesNotMatch(html,/<img|href="javascript:/);
});
