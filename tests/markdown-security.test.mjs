import assert from 'node:assert/strict';
import test from 'node:test';

import { renderMarkdownFragment } from '../src/lib/markdown.mjs';

test('preserves the documented semantic Wiki HTML allowlist', async () => {
  const rendered = await renderMarkdownFragment(`
<abbr title="World Health Organization">WHO</abbr>
<mark>highlight</mark>
<time datetime="2026-07-19">today</time>
<ruby>糸<rt class="furi">いと</rt><rt class="roma">ito</rt></ruby>
<details open><summary>More</summary><p>Text</p></details>
<figure><picture><source srcset="/images/example.webp" type="image/webp"><img src="/images/example.png" alt="Example"></picture><figcaption>Caption</figcaption></figure>
  `);

  assert.match(rendered, /<abbr title="World Health Organization">WHO<\/abbr>/);
  assert.match(rendered, /<mark>highlight<\/mark>/);
  assert.match(rendered, /<time datetime="2026-07-19">today<\/time>/);
  assert.match(rendered, /<ruby>糸<rt class="furi">いと<\/rt><rt class="roma">ito<\/rt><\/ruby>/);
  assert.match(rendered, /<details open><summary>More<\/summary>/);
  assert.match(rendered, /<picture><source srcset="\/images\/example\.webp"><img src="\/images\/example\.png" alt="Example"><\/picture>/);
});

test('removes executable elements, event handlers, inline styles, and unsafe URLs', async () => {
  const rendered = await renderMarkdownFragment(`
<script>alert('script')</script>
<style>body { display: none }</style>
<form action="https://evil.example"><input name="token"></form>
<object data="https://evil.example/payload"></object>
<embed src="https://evil.example/payload">
<iframe src="https://evil.example/player"></iframe>
<img src="x" onerror="alert('image')" style="position:fixed" alt="safe alt">
<a href="javascript:alert('link')" onclick="alert('click')" style="color:red">safe text</a>
  `);

  assert.doesNotMatch(rendered, /<(?:script|style|form|object|embed|iframe)\b/i);
  assert.doesNotMatch(rendered, /\son[a-z]+\s*=|\sstyle=|javascript:/i);
  assert.match(rendered, /<img src="x" alt="safe alt">/);
  assert.match(rendered, /<a>safe text<\/a>/);
});

test('prefixes authored identifiers to prevent DOM clobbering', async () => {
  const rendered = await renderMarkdownFragment('<a id="current" name="legacy">anchor</a>');

  assert.match(rendered, /id="wiki-content-current"/);
  assert.match(rendered, /name="wiki-content-legacy"/);
});

test('retains only the fixed attributes used by safe site interactions', async () => {
  const rendered = await renderMarkdownFragment(`
<div class="my-lyric-controls arbitrary-class">
  <button type="button" data-lyric-action="ruby" data-show-label="Show" data-hide-label="Hide" onclick="alert(1)">Hide</button>
  <button type="button" class="sync-play-btn arbitrary-class" data-lyric-action="sync-play-pause" data-primary-label="Play" data-alternate-label="Pause" hidden onclick="alert(1)">Play</button>
</div>
<div class="my-lyric-box"><div class="lyric-line"><span class="lrc-tag arbitrary-class" data-time="1.25" hidden onclick="alert(1)"></span>Line</div></div>
<span class="wiki-spoiler arbitrary-class" tabindex="0" onmouseover="alert(1)">Secret</span>
  `);

  assert.match(rendered, /class="my-lyric-controls"/);
  assert.match(rendered, /data-lyric-action="ruby"/);
  assert.match(rendered, /class="sync-play-btn" data-lyric-action="sync-play-pause"/);
  assert.match(rendered, /class="lrc-tag" data-time="1\.25" hidden/);
  assert.match(rendered, /data-show-label="Show"/);
  assert.match(rendered, /class="wiki-spoiler" tabindex="0"/);
  assert.doesNotMatch(rendered, /arbitrary-class|onclick|onmouseover/);
});

test('materializes shortcodes only through controlled iframe origins and capabilities', async () => {
  const rendered = await renderMarkdownFragment('@[youtube](https://youtu.be/3Wtx6k2vInU "KAF - Ito")');

  assert.match(rendered, /src="https:\/\/www\.youtube-nocookie\.com\/embed\/3Wtx6k2vInU"/);
  assert.match(rendered, /loading="lazy"/);
  assert.match(rendered, /allow="encrypted-media; picture-in-picture; fullscreen"/);
  assert.match(rendered, /referrerpolicy="strict-origin-when-cross-origin"/);
  assert.doesNotMatch(rendered, /youtube\.com\/embed|autoplay|clipboard-write|web-share/);
});

test('media switcher materializes only validated child providers after sanitization', async () => {
  const rendered = await renderMarkdownFragment(`
{{media-switcher::Official media}}

@[youtube](https://youtu.be/3Wtx6k2vInU)

@[bilibili](https://www.bilibili.com/video/BV1CJ411b7Ym)

{{/media-switcher}}
  `);

  assert.match(rendered, /data-media-switcher/);
  assert.match(rendered, /youtube-nocookie\.com/);
  assert.match(rendered, /player\.bilibili\.com/);
  assert.doesNotMatch(rendered, /<wiki-media-(?:embed|switcher)|javascript:|onclick=/);

  const authored = await renderMarkdownFragment(`
<wiki-media-switcher data-label="Unsafe">
  <wiki-media-embed data-provider="youtube" data-target="javascript:alert(1)"></wiki-media-embed>
  <wiki-media-embed data-provider="unknown" data-target="https://evil.example"></wiki-media-embed>
</wiki-media-switcher>
  `);
  assert.doesNotMatch(authored, /wiki-media-switcher|iframe|evil\.example|javascript:/);

  const duplicateProvider = await renderMarkdownFragment(`
<wiki-media-switcher data-label="Duplicate">
  <wiki-media-embed data-provider="youtube" data-target="3Wtx6k2vInU"></wiki-media-embed>
  <wiki-media-embed data-provider="youtube" data-target="anotherVideo"></wiki-media-embed>
</wiki-media-switcher>
  `);
  assert.doesNotMatch(duplicateProvider, /wiki-media-switcher|iframe/);

  const mixedAuthoredContent = await renderMarkdownFragment(`
<wiki-media-switcher data-label="Mixed">
  <wiki-media-embed data-provider="youtube" data-target="3Wtx6k2vInU"></wiki-media-embed>
  <p>Unexpected prose</p>
  <wiki-media-embed data-provider="bilibili" data-target="BV1CJ411b7Ym"></wiki-media-embed>
</wiki-media-switcher>
  `);
  assert.doesNotMatch(mixedAuthoredContent, /wiki-media-switcher|iframe/);
});

test('drops raw iframes even when their hostname is an approved media provider', async () => {
  const approvedOrigin = await renderMarkdownFragment(
    '<iframe src="https://www.youtube.com/embed/3Wtx6k2vInU"></iframe>',
  );
  const unknownOrigin = await renderMarkdownFragment('<iframe src="https://evil.example/player"></iframe>');

  assert.doesNotMatch(approvedOrigin, /iframe|youtube/);
  assert.doesNotMatch(unknownOrigin, /iframe|evil\.example/);
});

test('sanitizes math source before trusted KaTeX output is generated', async () => {
  const rendered = await renderMarkdownFragment('Inline $x^2$');

  assert.match(rendered, /class="katex"/);
  assert.match(rendered, /<math xmlns="http:\/\/www\.w3\.org\/1998\/Math\/MathML">/);
});
