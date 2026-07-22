import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('layout does not depend on Tailwind CDN at runtime', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

  assert.equal(layout.includes('cdn.tailwindcss.com'), false);
  assert.equal(layout.includes('tailwind.config'), false);
});

test('localized typography uses complete real weights without synthetic bold', async () => {
  const layout = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');
  const stylesheet = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  for (const family of ['Noto+Sans+SC:wght@300;400;500;600;700', 'Noto+Sans+JP:wght@300;400;500;600;700', 'Montserrat:wght@100;200;300;400;500;600;700']) {
    assert.equal(layout.includes(family), true);
  }
  assert.match(layout, /display=optional/);
  assert.match(stylesheet, /:lang\(zh\)[\s\S]*Noto Sans SC/);
  assert.match(stylesheet, /:lang\(ja\)[\s\S]*Noto Sans JP/);
  assert.match(stylesheet, /:lang\(en\)[\s\S]*Montserrat/);
  assert.match(stylesheet, /font-synthesis:\s*none/);
  assert.match(stylesheet, /b,\s*\nstrong\s*\{\s*\n\s*font-weight:\s*600/);
});

test('Tailwind scans application templates without traversing the content archive', async () => {
  const stylesheet = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  assert.match(stylesheet, /@import\s+["']tailwindcss["']\s+source\(none\)/);
  for (const source of ['components', 'layouts', 'lib', 'pages', 'scripts']) {
    assert.match(stylesheet, new RegExp(`@source\\s+["']\\.\\.\\/${source}["']`));
  }
  assert.doesNotMatch(stylesheet, /@source\s+["']\.\.\/content/);
});
