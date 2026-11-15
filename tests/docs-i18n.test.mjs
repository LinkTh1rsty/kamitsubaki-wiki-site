import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const localizedDocs = [
  'docs/manuals/contribute/start/zh.md',
  'docs/manuals/contribute/start/en.md',
  'docs/manuals/contribute/start/ja.md',
  'docs/manuals/contribute/format/zh.md',
  'docs/manuals/contribute/format/en.md',
  'docs/manuals/contribute/format/ja.md',
  'docs/manuals/develop/architecture/zh.md',
  'docs/manuals/develop/architecture/en.md',
  'docs/manuals/develop/architecture/ja.md',
];

async function fileExists(path) {
  try {
    await access(new URL(`../${path}`, import.meta.url));
    return true;
  } catch {
    return false;
  }
}

test('documentation exists in Chinese, English, and Japanese', async () => {
  for (const docPath of localizedDocs) {
    assert.equal(await fileExists(docPath), true, `${docPath} should exist`);
  }
});

test('readme files link to documentation in their own language', async () => {
  const zh = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const en = await readFile(new URL('../README.en.md', import.meta.url), 'utf8');
  const ja = await readFile(new URL('../README.ja.md', import.meta.url), 'utf8');

  assert.match(zh, /\(docs\/manuals\/contribute\/start\/zh\.md\)/);
  assert.match(zh, /\(docs\/manuals\/develop\/architecture\/zh\.md\)/);
  assert.match(en, /\(docs\/manuals\/contribute\/start\/en\.md\)/);
  assert.match(en, /\(docs\/manuals\/develop\/architecture\/en\.md\)/);
  assert.match(ja, /\(docs\/manuals\/contribute\/start\/ja\.md\)/);
  assert.match(ja, /\(docs\/manuals\/develop\/architecture\/ja\.md\)/);
});
