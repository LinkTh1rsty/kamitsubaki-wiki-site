---
book: contribute
chapter: syntax
locale: en
order: 4
title: Complete Markdown and Entry Property Guide
summary: "One reference for a first edit or a complete new entry: Markdown, frontmatter, media, content structure, and pre-PR checks."
---

Use this as a **look-up reference**, not a chapter you must memorize. For a first contribution, choose a route in [Choose a contribution](/en/docs/contribute/start/). While editing, jump here only when you need a heading, link, image, media embed, or frontmatter field.

## Before you edit

The shortest reliable workflow is:

1. Confirm that the target is under `src/content/` and that `zh.md`, `ja.md`, or `en.md` matches the intended locale.
2. Change only what the contribution needs, and prepare a traceable source for new facts.
3. Preserve both `---` markers, existing fields, indentation, and quotes in frontmatter.
4. Review Preview / Changes before opening the Pull Request.

This site uses Markdown rather than wiki text. Syntax characters must be half-width ASCII characters; full-width punctuation entered by a Chinese or Japanese input method will not work.

> Beginner rule: prefer a small, correct change. Do not reorganize unrelated paragraphs, and never use AI output as a factual source.

## Headings

Use `#` to create headings. Its count determines the level, up to six, and it must be followed by a space. Entry bodies normally begin with `##`, because the page title already comes from frontmatter.

**Source:**

```md
## Level-two heading
### Level-three heading
```

**Rendered result:**

### Level-three heading example

## Text formatting

**Source:**

```md
**Bold text**
*Italic text*
***Bold italic text***
~~Strikethrough text~~
`Inline code`
```

**Rendered result:**

**Bold text**, *italic text*, ***bold italic text***, ~~strikethrough text~~, `inline code`

## Lists

### Unordered lists

Use `-` or `+`:

**Source:**

```md
- Item one
- Item two
```

**Rendered result:**

- Item one
- Item two

Remember to add a space after the list marker.

### Ordered lists

Use a number followed by a period:

**Source:**

```md
1. First step
2. Second step
3. Third step
```

**Rendered result:**

1. First step
2. Second step
3. Third step

## Links

**Source:**

```md
[Visit this site](https://kamitsubaki.wiki/en/)
```

**Rendered result:**

[Visit this site](https://kamitsubaki.wiki/en/)

## Tables

Use `|` to define columns and `-` to define the header separator:

**Source:**

```md
| Artist | Song | Lyrics |
| :--- | :---: | ---: |
| KAF | 糸 | Omitted |
| RIM | 1999 | Omitted |
```

**Rendered result:**

| Artist | Song | Lyrics |
| :--- | :---: | ---: |
| KAF | 糸 | Omitted |
| RIM | 1999 | Omitted |

Alignment rules:

- `:---` means left-aligned.
- `:---:` means centered.
- `---:` means right-aligned.

## Frontmatter

The frontmatter block at the top of a file contains the properties of the entry being edited.

A frontmatter block begins and ends with `---`.

For example:

```yaml
---
locale: en
schemaVersion: 2
id: example-entry
entityType: editorial-article
articleCategory: archival
contentStatus: stub
title: Example Entry
---
```

**Rendered result:** the page reads these fields to generate its title, locale relationship, and metadata; the YAML block is not displayed as article text.
## Inserting images

**Source:**

```md
![Cover art for KAF's Ito](/images/songs/shi.webp)
```

**Rendered result:** the image appears at this position. If the asset is temporarily unavailable, its alternative text still explains the intended content.

Place the file in `public/images/`, but use a public URL beginning with `/images/`; do not include `public` in the URL. Describe informative images clearly. Decorative images may use an empty description: `![](...)`.

See [Images and files](/en/contribute/files/) for original uploads, path mapping and folder rules. Originals are not compressed; upload through GitHub when they exceed the in-site attachment limits.

## Use the built-in visual editor

Follow the [contribution guide](/en/contribute/edit/) for your first small change, then load the original in the [visual editor](/en/contribute/editor/). Select text for bold, links, ruby or spoilers. Press `/` in an empty paragraph or use Insert content for tables, images, media and bilingual lyrics.

Use Article properties in the top bar for metadata, and Preview and Block properties to inspect content. Submit in-site or export complete Markdown and include it with originals in one GitHub PR. Local drafts save automatically; image drafts cannot be saved to cloud storage yet. Entering an image URL does not upload a file. Use Source for complex edits.

## Wiki shortcodes and controlled media

After learning the Markdown basics, you may use a small, supported subset of HTML for ruby text, disclosure panels, and semantic markup. Article HTML is sanitized during the build; not every element supported by a browser is permitted here.

### Security boundary

Article bodies allow only these groups of elements:

- Structure: `p`, `h1`–`h6`, `blockquote`, `hr`, `br`, `div`, and `span`.
- Text semantics: `a`, `abbr`, `b`, `strong`, `i`, `em`, `u`, `s`, `del`, `mark`, `small`, `code`, `pre`, `kbd`, `samp`, `var`, `sub`, `sup`, `cite`, `q`, and `time`.
- Lists and data: `ul`, `ol`, `li`, `dl`, `dt`, `dd`, `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, and `td`.
- Wiki layout: `ruby`, `rt`, `rp`, `details`, `summary`, `figure`, `figcaption`, `picture`, `img`, and `source`.

Attributes are allowlisted too. Normal link, image-alt, and table-span attributes are retained; `class` is limited to the few patterns implemented by the site. The following are removed:

- Executable or arbitrary third-party containers such as `script`, `style`, `iframe`, `object`, `embed`, and `form`.
- Every `on*` event attribute, including `onclick`, `onmouseover`, and `onerror`, plus inline `style`.
- Dangerous URL schemes such as `javascript:`. Authored `id` and `name` values receive a safe prefix so article content cannot shadow page objects.

Contributors normally do not need to write this HTML directly. Prefer the Wiki shortcodes below: site code creates the matching elements and the result still passes through the same allowlist. Propose a reusable shortcode in the PR when a new interaction is needed; do not paste scripts or third-party player snippets into an article.

### Wiki shortcode reference

Shortcodes use a function-like `{{name::argument}}` form. Every name and argument count is fixed:

| Purpose | Syntax |
| --- | --- |
| Ruby reading | `{{ruby::text::reading}}` |
| Reading plus romaji | `{{ruby::text::kana::romaji}}` |
| Spoiler / redaction | `{{spoiler::hidden text}}` |
| Highlight | `{{mark::important}}` |
| Abbreviation | `{{abbr::V.W.P::Virtual Witch Phenomenon}}` |
| Keyboard input | `{{kbd::Ctrl+K}}` |
| Machine-readable date | `{{time::display text::2026-07-19}}` |
| Small, superscript, subscript | `{{small::text}}`, `{{sup::2}}`, `{{sub::2}}` |
| Taiwan / Hong Kong vocabulary override | `{{zh-variant::Simplified::Taiwan::Hong Kong}}` |
| Japanese original (never converted) | `{{ja::日本語の原題}}` |
| Lyric toggle buttons | `{{lyrics-controls::en}}` (use `zh` / `ja` for those files) |

Inline arguments are plain text: do not nest Markdown or HTML inside them. A double colon `::` separates arguments and remains safe inside Markdown tables. The three `zh-variant` arguments are always ordered Simplified Chinese, Taiwan Traditional Chinese, then Hong Kong Traditional Chinese. A misspelled name or incorrect argument count remains visible as source text so the mistake can be found in Preview.

**Source:**

```md
{{mark::Important}}
{{abbr::V.W.P::Virtual Witch Phenomenon}}
Press {{kbd::Ctrl+K}}
{{time::July 19, 2026::2026-07-19}}
H{{sub::2}}O and x{{sup::2}}
{{small::Additional note}}
```

**Rendered result:**

{{mark::Important}}, {{abbr::V.W.P::Virtual Witch Phenomenon}}, press {{kbd::Ctrl+K}}, {{time::July 19, 2026::2026-07-19}}, H{{sub::2}}O and x{{sup::2}}, {{small::additional note}}

On a song page, place `{{lyrics-controls::en}}` in its own paragraph immediately before the `.my-lyric-box` lyric container. The site generates the localized kana, translation, romaji, and synchronized-lyric controls; Japanese automatically omits the translation control. The argument must match the file's `locale`.

### Complete lyric-page authoring

A lyric page has three parts: localized controls, the lyric container, and repeated lyric lines. The controls must occupy their own paragraph immediately before the container. Each `lyric-line` contains one source line and its translation.

#### Code syntax

```md
{{lyrics-controls::locale}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>source<rt class="furi">kana</rt><rt class="roma">romaji</rt></ruby>
</div>
<div class="trans-lyric">English translation</div>
</div>

</div>
```

- Replace `locale` with the current file's `zh`, `ja`, or `en`.
- `furi` is the kana track controlled by “Show kana”; `roma` is the romanization track.
- Chinese uses `cn-lyric`, English uses `trans-lyric`, and Japanese omits the translation `<div>`.
- If kana needs no furigana, provide only romaji: `<ruby>なら<rt class="roma">nara</rt></ruby>`.
- Copy the complete `lyric-line` group for every additional line. Do not put `{{ruby::...}}` shortcodes inside this raw HTML block; Markdown shortcodes are not parsed again inside an HTML block.

#### Authoring

This is a complete single-line example that can be copied into an English song file:

```md
{{lyrics-controls::en}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="trans-lyric">If it is a mistake</div>
</div>

</div>
```

#### Example

The code above renders as an interactive lyric-practice component:

{{lyrics-controls::en}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="trans-lyric">If it is a mistake</div>
</div>

</div>

### Synchronized lyric timeline

For karaoke-style word animation, write a `[mm:ss.xx]` or `[mm:ss.xxx]` timestamp immediately before each lyric unit. A timestamp is the unit's start time relative to the lyric timer, and the lyric fills continuously from left to right between adjacent timestamps. “Play” starts at `00:00.00`, selecting a timed lyric line seeks to that line and continues playback, and “Reset” returns to the beginning.

- `mm` and `ss` must each contain two digits; the fractional part may contain two or three digits. Valid examples include `[00:03.50]` and `[01:02.345]`.
- Put the timestamp directly against its `<ruby>` element or plain text, with no intervening space. Every unit that should highlight independently needs its own start time.
- The first timestamp in each `.jp-lyric` also becomes that line's seek time. If a translation line is present, give it the same line-start timestamp at the beginning.
- Each unit fills until the next timestamp. The final unit in a line continues to the next line, while the final line receives a short automatic tail.
- Keep timestamps increasing in playback order. Partial timing is allowed; lines without timestamps remain normally displayed.
- Author only the bracketed timestamps. Do not write the generated `lrc-tag`, `lrc-word`, or any script. Calibrate times by listening to the track and never ask AI to estimate them.
- The lyric timer is currently independent and does not automatically read the playback position of the YouTube, bilibili, or other media player above it.

#### Authoring

```md
{{lyrics-controls::en}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="trans-lyric">[00:00.00]If it is a mistake</div>
</div>

</div>
```

#### Example

After synchronized lyrics are enabled, the two Japanese units below begin filling from left to right at `0` and `0.8` seconds:

{{lyrics-controls::en}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="trans-lyric">[00:00.00]If it is a mistake</div>
</div>

</div>

### AI prompt for generating lyric HTML

For long lyrics, an AI assistant can mechanically format source text, readings, romaji, and translations that you already have. AI is not a source for lyrics, translations, or readings: verify every line before pasting and make sure the material's source permits this contribution.

#### Prompt syntax

Copy the complete prompt below and replace its five input sections:

```md
You are a lyric HTML formatter for the KAMITSUBAKI Wiki. Convert only the lyric tracks I provide into the site's format.

Requirements:
1. Only transform the input. Do not add lyrics, translate, rewrite, or guess missing readings.
2. Output only content that can be pasted directly into Markdown. Do not explain and do not use a code fence.
3. Begin with {{lyrics-controls::file locale}}, followed by exactly one <div class="my-lyric-box"> container.
4. Use one <div class="lyric-line"> per input line and put Japanese source text inside <div class="jp-lyric">.
5. With kana and romaji, use <ruby>source<rt class="furi">kana</rt><rt class="roma">romaji</rt></ruby>.
6. With romaji only, use <ruby>source<rt class="roma">romaji</rt></ruby>. With no reliable reading, keep plain source text.
7. Use cn-lyric for Chinese translations and trans-lyric for English translations. Omit the translation div for Japanese files or missing translations.
8. Preserve line count, order, punctuation, and text exactly. If word-level alignment is uncertain, use one ruby for the whole line with the supplied whole-line reading; do not invent segmentation.
9. Escape <, >, and & in text. Never output style, any on* attribute, script, iframe, id, or unrequested elements.
10. Check that every div, ruby, and rt is closed correctly. Leave exactly one blank line between the controls and lyric container.

[FILE LOCALE]
zh / ja / en

[JAPANESE SOURCE — one lyric line per line]
Paste here

[KANA — optional; line count must match source]
Paste here

[ROMAJI — optional; line count must match source]
Paste here

[TRANSLATION — optional; line count must match source]
Paste here
```

#### Authoring

Replace only the input sections, for example:

```md
[FILE LOCALE]
en

[JAPANESE SOURCE]
間違い

[KANA]
まちがい

[ROMAJI]
machigai

[TRANSLATION]
If it is a mistake
```

#### Output example

A valid AI response should resemble this and be ready to paste into the song body:

```md
{{lyrics-controls::en}}

<div class="my-lyric-box">
<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違い<rt class="furi">まちがい</rt><rt class="roma">machigai</rt></ruby>
</div>
<div class="trans-lyric">If it is a mistake</div>
</div>
</div>
```

### Ruby readings

Provide only the displayed text and its reading:

```md
{{ruby::局部坏死::zheng ge hao huo}}
```

For precise character-by-character alignment, place calls next to each other:

```md
{{ruby::清::hun}}{{ruby::楚::dun}}
```

The result is:

- {{ruby::清::hun}}{{ruby::楚::dun}}

### Content hidden by default

Use the spoiler shortcode for short inline content and the block form below for longer optional content. Neither form requires article-level JavaScript.

The `spoiler` argument is plain text. Do not put `**bold text**`, Markdown links, or HTML inside `{{spoiler::...}}`, because the shortcode will remain visible as source text. To bold the complete spoiler, write `**{{spoiler::hidden text}}**`. Use the `details` block in the next section when hidden content needs headings, lists, links, or other mixed formatting.

**Source:**

```md
The ending is: {{spoiler::hidden by default}}
```

**Rendered result:**

The ending is: {{spoiler::hidden by default}}

### Collapsible content

Use paired `details` markers. Each marker must occupy its own paragraph with a blank line around it; normal Markdown remains available between them:

```md
{{details::Show the complete track list}}

1. First song
2. **Second song**

{{/details}}
```

The result is:

{{details::Show the complete track list}}

1. First song
2. **Second song**

{{/details}}

For ordinary paragraphs, insert a blank line. Use the allowlisted `<br>` only in special locations such as a table cell.

### Embedding audio and video

This site provides one media shortcode. Put it on a line by itself and the build will generate a responsive, restricted, lazy-loaded `iframe`:

```md
@[provider](media ID or share URL "optional title")
```

Supported provider names are `youtube`, `bilibili`, `apple-music`, `spotify`, `netease`, and `qq-music`. YouTube, bilibili, NetEase Cloud Music, and QQ Music accept a video or song ID directly; all providers accept their common share URLs.

```md
@[youtube](3Wtx6k2vInU "KAF - Ito")
@[bilibili](BV1CJ411b7Ym "KAF - Ito")
@[apple-music](https://music.apple.com/cn/song/example/123456789)
@[spotify](https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT)
@[netease](2637083551)
@[qq-music](001ABCDEF)
```

**Rendered example:**

@[youtube](3Wtx6k2vInU "KAF - Ito")

#### Aggregated media switcher

When the same work has official media on several platforms, wrap the existing media shortcodes in one aggregate block. The page shows one selected source with platform buttons; the original standalone `@[provider](...)` syntax remains unchanged.

##### Code syntax

```md
{{media-switcher::Switcher title}}
@[first-provider](media-ID-or-share-URL "optional caption")
@[second-provider](media-ID-or-share-URL "optional caption")
{{/media-switcher}}
```

##### Authoring

- A localized title is required, such as the work title or “Official media.”
- Every item keeps the original media syntax and the same provider and URL validation rules.
- Lines may be consecutive without blank lines. A single-line block also parses, but one platform per line is recommended for review and maintenance.
- A switcher accepts `2–6` distinct platforms. Do not repeat a provider, nest switchers, or mix ordinary paragraphs into the block.
- Every source must validate. One unknown provider, hostile URL, or malformed ID prevents the entire block from creating an iframe and leaves visible source text for correction.
- Without JavaScript, validated players appear in source order. With JavaScript, use the buttons, arrow keys, Home, or End to switch sources.

##### Example

```md
{{media-switcher::KAF - Ito}}
@[bilibili](BV1CJ411b7Ym "KAF - Ito")
@[youtube](3Wtx6k2vInU "KAF - Ito")
{{/media-switcher}}
```

**Rendered example:**

{{media-switcher::KAF - Ito}}
@[bilibili](BV1CJ411b7Ym "KAF - Ito")
@[youtube](3Wtx6k2vInU "KAF - Ito")
{{/media-switcher}}

Multiple shortcodes may be placed in the same Markdown table cell. Players are stacked vertically in source order. The cell must contain only shortcodes and whitespace, without explanatory text:

```md
| Composer | Lyricist | Players |
| --- | --- | --- |
| Wiz_nicc | Wiz_nicc | @[bilibili](BV13ZZNYQEQx) @[netease](2637083551) |
```

An unrecognized provider or target remains a normal link and never becomes an arbitrary third-party iframe. New content should use the shortcode so provider scope, privacy attributes, sizing, and styling stay consistent; do not paste raw third-party `<iframe>` snippets.

## Branded external-link cards on artist pages

Artist pages can show official links in two places. Both use the same platform detection and brand styling, but their source syntax is different.

### Official links in the infobox

The infobox reads `officialLinks` from frontmatter. Every item must provide both a display `label` and a complete `href`:

```yaml
officialLinks:
  - label: "Official Website"
    href: "https://kaf.kamitsubaki.jp/"
  - label: "YouTube"
    href: "https://www.youtube.com/@virtual_kaf"
```

### External links in the article body

Use the exact standalone level-two heading `## External Links`, followed immediately by an ordinary Markdown unordered list. Put the platform or page name inside each link:

```md
## External Links

- [Official Website](https://kaf.kamitsubaki.jp/)
- [YouTube](https://www.youtube.com/@virtual_kaf)
- [X (Twitter)](https://x.com/virtual_kaf)
```

- Do not write `- YouTube: <https://...>`, `- <https://...>`, or a list item containing only descriptive text. Those forms cannot produce a complete card.
- Do not combine the section with sources under a heading such as “Sources and External Links.” Put evidence in a separate `## Sources` section and reader-facing official pages or social accounts under `## External Links`.
- Chinese, Japanese, and English artist articles use `外部链接`, `外部リンク`, and `External Links`, respectively. The heading must be exact so the site can recognize it.
- With JavaScript, the artist page enhances the list into responsive link cards with platform logos, brand colors, and an external-link arrow. They remain navigation links rather than form buttons. Without JavaScript, the source remains a readable, clickable list.
- Recognized platforms include Bilibili, YouTube, X/Twitter, TikTok, Instagram, Weibo, Niconico, Spotify, Apple Music, NetEase Cloud Music, pixiv, piapro, Steam, Wikipedia, and official KAMITSUBAKI sites. Other URLs receive the generic website style.
- Do not paste platform SVG or remote logo images into the article; the site supplies the icons centrally.

## Pre-PR checklist

- The path matches `locale`, and localized siblings share one stable `id`, `entityType`, and relationship identity.
- Both `---` markers, YAML indentation, and field types are intact.
- Dates use `YYYY-MM-DD`; durations use `MM:SS` or `HH:MM:SS`.
- New facts have reliable sources, links open, and informative images have useful alternative text.
- Artist-body links use a standalone `## External Links` heading and `- [Label](URL)` list items, with no bare URLs or combined heading.
- Media uses `@[provider](...)`; the body contains no scripts, event handlers, credentials, tokens, or private information.
- Preview / Changes contains only the intended edit and no accidental deletion of another locale.

## Property block guide

V3 entries use Metadata Schema v2. Markdown stays unchanged; metadata must match the entity type. Do not copy legacy translationKey, top-level image or artist-folder templates.

```yaml
schemaVersion: 2
id: example-article
locale: en
entityType: editorial-article
title: Example article
articleCategory: archival
contentStatus: stub
relatedEntities: []
```

| entityType | Fields |
| --- | --- |
| person / virtual-avatar / unit | name, romanizedName, roles, lifecycle |
| software-voice | name, romanizedName, voiceEngines, relations (based-on-voice) |
| work-track | title, romanizedTitle, performers, credits |
| work-release | title, releaseType, tracks; releaseDate when published |
| project | name or title; status when published |
| organization | name or title, orgType |
| live-event | name or title, eventType, headliners; dateRange when published |
| lore-concept | name or title, loreCategory |
| editorial-article | title, articleCategory; author and publishDate when published |

`presentation.image` / `presentation.theme` / `presentation.morphing` control visual presentation. Use nested YAML, for example:

```yaml
presentation:
  image: /images/artists/kaf/cover.jpg
```

`relations` links entities by stable ID. `performers` determines song folders; multiple primary performers use `collaborations`. Frontend content layout rules are defined in `contentLayout.mjs`. Refer to [V3 contribution guide](/en/docs/contribute/entry/) and [metadata specification](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/V3.0.0/docs/category-optimization/metadata-schema-v2.md).

## Mixed-script Chinese conversion and generated files

`zh.md` is the single maintained source for Chinese content, but its prose and convertible Frontmatter copy may freely mix Simplified, Taiwan Traditional, and Hong Kong Traditional Chinese. Authors do not need to normalize character forms first. At page-read time the site detects and normalizes the mixed input: `zh` displays Simplified Chinese, `zh-tw` displays Taiwan Traditional Chinese, and `zh-hk` displays Hong Kong Traditional Chinese. The two Traditional files are generated by `scripts/generate-traditional-chinese.mjs` before development, checks, tests, and builds. Do not edit or commit generated `zh-tw.md`, `zh-hk.md`, `zh-tw.json`, or `zh-hk.json` files.

```md
Edit:      src/content/people/solo/kaf/zh.md
Generated: src/content/people/solo/kaf/zh-tw.md
Generated: src/content/people/solo/kaf/zh-hk.md
```

The converter first canonicalizes mixed input through a Simplified Chinese intermediate form, then emits the current page as OpenCC `cn`, `twp`, or `hkp` regional output. No annotation is needed when `软件`, `軟體`, and `軟件` appear in the same paragraph. Frontmatter is parsed and converted field by field. The following remain unchanged:

- `id`, compatibility-only `translationKey`, `code`, and romanized fields;
- dates, durations, colors, catalog numbers, image paths, and external URLs;
- Markdown code blocks, inline code, mathematics, HTML tags and attributes, and link destinations;
- official terms listed in the protected-term table.

An internal `/zh/` Markdown link is rewritten to the target Traditional Chinese locale while its visible label is converted normally. `{{lyrics-controls::zh}}` is also changed to the generated locale.

### Local article-vocabulary overrides

When automatic conversion cannot determine the context, or a term needs explicit Simplified, Taiwan, and Hong Kong forms, place this shortcode in visible prose in the maintained `zh.md` file:

```md
这款{{zh-variant::软件::軟體::軟件}}用于管理虚拟歌手资料。
```

The Simplified Chinese page displays `软件`, generated `zh-tw` displays `軟體`, and generated `zh-hk` displays `軟件`. All three arguments must be nonempty plain text. The selected Taiwan or Hong Kong argument is the final human-authored value and is not sent through OpenCC again. The shortcode is inert inside code blocks, inline code, mathematics, HTML tags or attributes, URLs, and link destinations.

Use this only for small, context-dependent vocabulary in article prose. Do not put it in frontmatter or wrap whole sentences or paragraphs. Repeated official names shared by multiple articles belong in the global protected-term table below.

### Japanese originals and wasei kanji

When Chinese entries quote Japanese titles, lyrics, or proper nouns, the converter automatically preserves:

- Japanese-looking runs that contain kana (for example `赤い洗礼`)
- Japanese shinjitai / kokuji characters (for example `戯`, `実`)
- Ruby bases whose reading is kana
- HTML blocks with `class="jp-lyric"` or `lang="ja"`
- Frontmatter `title` / track titles that match the sibling `ja.md`

For pure-kanji Japanese titles without those signals, write:

```md
{{ja::独白}}
```

### Maintaining protected terms

Artist, organization, project, and product names that OpenCC must not decide are maintained in:

```md
public/TraditionalChineseConvert.json
```

To preserve a term exactly:

```yaml
{
  "source": "V.W.P",
  "preserve": true,
  "category": "group"
}
```

To specify Taiwan and Hong Kong output:

```yaml
{
  "source": "神椿市建设中。",
  "tw": "神椿市建設中。",
  "hk": "神椿市建設中。",
  "category": "project"
}
```

Terms are Unicode NFC-normalized and matched longest first. They are masked with placeholders before OpenCC and restored afterward. Do not add paths, ordinary prose, or long passages intended only to force a stylistic rewrite.

After changing a Chinese `zh.md` source or the table, run:

```md
pnpm i18n:generate
pnpm check
pnpm test
pnpm build
```

Review official names, unchanged code and URLs, locale-correct internal links, and the absence of unresolved placeholders.

## Speech blocks and bulk import

Entries and articles share speech tools. Choose a speech block or bulk import from the editor's Insert menu. Add or edit speakers while editing a speech block; only a name is required. Avatars, colors, and related entries are optional. A speaker is separate from the document author.

Bulk import accepts “Name: text”. Check the preview, then insert it directly. Unlabelled passages remain ordinary prose. Use the dialog's template for multi-paragraph speeches. Import does not overwrite document properties, and insertion can be undone in one step. Never treat AI-inferred speakers or invented dialogue as source material.

After registering a speaker in the editor, source mode uses its stable role ID:

```md
:::speech speaker_1
Speech text checked against its source.

One speech can contain several paragraphs.
:::
```

The speaker registry is stored in a `speech-roles` JSON code block in the document. Preserve it rather than duplicating the registry or casually changing role IDs. Correct undefined speakers, duplicate IDs, and unclosed markers. Check names, paragraphs, links, and source fidelity in preview, then submit through the entry or article workflow.

## Advanced: supported raw HTML

Shortcodes are the easiest option, but the original safe HTML forms remain supported for maintaining older entries or controlling markup precisely. HTML must stay within the allowlist described above. The sanitizer removes `style`, `onmouseover`, `onclick`, `script`, and raw `iframe` content.

### HTML ruby readings

**Source:**

```html
<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>
<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>
```

**Rendered result:**

<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>; <ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>

### HTML spoiler text

The old version based on inline styles and mouse event attributes is no longer accepted. Safe raw HTML uses the site-defined `wiki-spoiler` class.

**Source:**

```html
<span class="wiki-spoiler" tabindex="0">Hidden by default</span>
```

**Rendered result:**

<span class="wiki-spoiler" tabindex="0">Hidden by default</span>

### HTML disclosure panel

**Source:**

```html
<details>
  <summary>Show the complete track list</summary>
  <p>This supplementary content is collapsed by default.</p>
</details>
```

**Rendered result:**

<details>
  <summary>Show the complete track list</summary>
  <p>This supplementary content is collapsed by default.</p>
</details>

### HTML semantic elements and line breaks

**Source:**

```html
<mark>Important</mark>
<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>
Press <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O and x<sup>2</sup>
```

**Rendered result:**

<mark>Important</mark>, <abbr title="Virtual Witch Phenomenon">V.W.P</abbr>, press <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O and x<sup>2</sup>

Raw HTML is only for static allowlisted markup. Continue to use `@[provider](...)` for media and `{{lyrics-controls::en}}` for lyric controls so site code owns all interaction behavior.
