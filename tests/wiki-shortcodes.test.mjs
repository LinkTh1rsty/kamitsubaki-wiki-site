import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';

async function collectMarkdownFiles(directory) {
  const files = [];

  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMarkdownFiles(path));
    else if (entry.name.endsWith('.md')) files.push(path);
  }

  return files;
}

function removeCodeExamples(source) {
  return source
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, '')
    .replace(/`[^`\n]*`/g, '');
}

test('renders fixed inline Wiki aliases without authored HTML', async () => {
  const rendered = await renderMarkdownFragment(`
{{ruby::糸::いと}} {{ruby::間違::まちが::machiga}}
{{spoiler::hidden}} {{mark::important}} {{abbr::V.W.P::Virtual Witch Phenomenon}}
{{kbd::Ctrl+K}} H{{sub::2}}O x{{sup::2}} {{small::note}} {{time::today::2026-07-19}}
  `);

  assert.match(rendered, /<ruby>糸<rt>いと<\/rt><\/ruby>/);
  assert.match(rendered, /<ruby>間違<rt class="furi">まちが<\/rt><rt class="roma">machiga<\/rt><\/ruby>/);
  assert.match(rendered, /<span class="wiki-spoiler" tabindex="0">hidden<\/span>/);
  assert.match(rendered, /<mark>important<\/mark>/);
  assert.match(rendered, /<abbr title="Virtual Witch Phenomenon">V\.W\.P<\/abbr>/);
  assert.match(rendered, /<kbd>Ctrl\+K<\/kbd>/);
  assert.match(rendered, /H<sub>2<\/sub>O x<sup>2<\/sup>/);
  assert.match(rendered, /<small>note<\/small>/);
  assert.match(rendered, /<time datetime="2026-07-19">today<\/time>/);
});

test('renders a details alias while preserving Markdown inside the block', async () => {
  const rendered = await renderMarkdownFragment(`
{{details::Track list}}

1. **First song**
2. Second song

{{/details}}
  `);

  assert.match(rendered, /<details><summary>Track list<\/summary>/);
  assert.match(rendered, /<ol>/);
  assert.match(rendered, /<strong>First song<\/strong>/);
  assert.match(rendered, /<\/details>/);
});

test('escapes shortcode arguments and leaves unknown or malformed calls as text', async () => {
  const rendered = await renderMarkdownFragment(`
{{abbr::A&B::letters & more}}
{{unknown::value}}
{{ruby::missing-reading}}
  `);

  assert.match(rendered, /<abbr title="letters &#x26; more">A&#x26;B<\/abbr>/);
  assert.match(rendered, /\{\{unknown::value\}\}/);
  assert.match(rendered, /\{\{ruby::missing-reading\}\}/);
});

test('content does not put Markdown markup inside plain-text Wiki shortcode arguments', async () => {
  const contentRoot = fileURLToPath(new URL('../src/content/', import.meta.url));
  const files = await collectMarkdownFiles(contentRoot);
  const invalid = [];
  const richMarkup = /\{\{(?:ruby|spoiler|mark|abbr|kbd|time|small|sub|sup)::[^}\n]*(?:\*\*|__|\[[^\]]+\]\(|<\/?[a-z][^>]*>)[^}\n]*\}\}/gi;

  for (const path of files) {
    const source = removeCodeExamples(await readFile(path, 'utf8'));
    for (const match of source.matchAll(richMarkup)) {
      const line = source.slice(0, match.index).split('\n').length;
      invalid.push(`${path}:${line}: ${match[0]}`);
    }
  }

  assert.deepEqual(invalid, [], invalid.join('\n'));
});

test('does not open an unterminated details block', async () => {
  const rendered = await renderMarkdownFragment('{{details::Missing close}}\n\nBody');

  assert.doesNotMatch(rendered, /<details>/);
  assert.match(rendered, /\{\{details::Missing close\}\}/);
});

test('inline aliases remain intact inside Markdown table cells', async () => {
  const rendered = await renderMarkdownFragment(`
| Title | Reading |
| --- | --- |
| 糸 | {{ruby::糸::いと}} |
  `);

  assert.match(rendered, /<td><ruby>糸<rt>いと<\/rt><\/ruby><\/td>/);
  assert.equal((rendered.match(/<td>/g) || []).length, 2);
});

test('renders localized song lyric controls from one block alias', async () => {
  const zh = await renderMarkdownFragment('{{lyrics-controls::zh}}\n\n<div class="my-lyric-box">Lyrics</div>');
  const ja = await renderMarkdownFragment('{{lyrics-controls::ja}}\n\n<div class="my-lyric-box">歌詞</div>');

  assert.match(zh, /^<div class="my-lyric-controls">/);
  assert.equal((zh.match(/data-lyric-action=/g) || []).length, 3);
  assert.match(zh, /data-lyric-action="translation"/);
  assert.doesNotMatch(zh, /data-lyric-action="sync-/);
  assert.match(zh, /aria-pressed="false">隐藏注音<\/button>/);
  assert.match(zh, /<\/div>\n<div class="my-lyric-box">Lyrics<\/div>$/);
  assert.equal((ja.match(/data-lyric-action=/g) || []).length, 2);
  assert.doesNotMatch(ja, /data-lyric-action="translation"/);
});

test('renders synchronized controls only when the document has timeline data', async () => {
  const rendered = await renderMarkdownFragment(`
{{lyrics-controls::zh}}

<div class="my-lyric-box"><div class="lyric-line"><div class="jp-lyric">
[00:00.80]<ruby>愛<rt class="furi">あい</rt></ruby>
</div></div></div>
  `);

  assert.equal((rendered.match(/data-lyric-action=/g) || []).length, 6);
  assert.match(rendered, /data-lyric-action="sync-lyrics"/);
  assert.match(rendered, /data-lyric-action="sync-play-pause"[^>]*class="sync-play-btn" hidden>播放<\/button>/);
  assert.match(rendered, /data-lyric-action="sync-reset" class="sync-reset-btn" hidden>重置<\/button>/);
});

test('renders synchronized lyric timestamps as sanitized inert markers', async () => {
  const rendered = await renderMarkdownFragment(`
<div class="my-lyric-box"><div class="lyric-line"><div class="jp-lyric">
[00:00.80]<ruby>愛<rt class="furi">あい</rt></ruby>[01:02.345]<ruby>歌<rt class="furi">うた</rt></ruby>
</div></div></div>
  `);

  assert.match(rendered, /<span class="lrc-tag" data-time="0\.8" hidden><\/span>/);
  assert.match(rendered, /<span class="lrc-tag" data-time="62\.345" hidden><\/span>/);
  assert.doesNotMatch(rendered, /\[00:00\.80\]|\[01:02\.345\]|style=/);
});

test('keeps fenced code language highlighting enabled', async () => {
  const rendered = await renderMarkdownFragment('```js\nconst answer = 42;\n```');

  assert.match(rendered, /<pre class="shiki github-dark"/);
  assert.match(rendered, /<span class="line"><span style="color:/);
  assert.match(rendered, /const/);
});

test('long contributor guides can satisfy the reveal observer threshold', async () => {
  const interactions = await readFile(new URL('../src/scripts/siteInteractions.js', import.meta.url), 'utf8');

  assert.match(interactions, /threshold:\s*0\.01/);
});
