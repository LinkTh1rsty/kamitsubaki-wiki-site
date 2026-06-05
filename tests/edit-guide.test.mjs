import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

async function fileExists(path) {
  try {
    await access(new URL(path, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

async function readSource(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('edit source links route through the local contributor guide first', async () => {
  const artistPage = await readSource('../src/pages/[locale]/artists/[...id].astro');
  const articleHeader = await readSource('../src/components/WikiArticleHeader.astro');

  assert.match(artistPage, /\/contribute\/edit\?target=/);
  assert.match(artistPage, /encodeURIComponent\(githubSourceHref\)/);
  assert.doesNotMatch(articleHeader, /target="_blank"/);
});

test('localized contributor guide gates the GitHub edit link behind completion steps', async () => {
  assert.equal(await fileExists('../src/pages/[locale]/contribute/edit.astro'), true);

  const guidePage = await readSource('../src/pages/[locale]/contribute/edit.astro');

  assert.match(guidePage, /getStaticPaths/);
  assert.match(guidePage, /data-guide-step/g);
  assert.match(guidePage, /data-github-edit-link/);
  assert.match(guidePage, /URLSearchParams/);
  assert.match(guidePage, /github\.com\/LinkTh1rsty\/kamitsubaki-wiki-site\/edit\/main\/src\/content\//);
});

test('contributor guide copy lives in editable content files', async () => {
  for (const locale of ['zh', 'ja', 'en']) {
    assert.equal(await fileExists(`../src/content/contribute/edit-guide/${locale}.json`), true);
  }

  const contentConfig = await readSource('../src/content.config.ts');
  const guidePage = await readSource('../src/pages/[locale]/contribute/edit.astro');

  assert.match(contentConfig, /editGuide/);
  assert.match(guidePage, /getCollection\('editGuide'\)/);
  assert.doesNotMatch(guidePage, /const copy = \{/);
  assert.doesNotMatch(guidePage, /编辑前快速学习/);
  assert.doesNotMatch(guidePage, /Quick guide before editing/);
});
