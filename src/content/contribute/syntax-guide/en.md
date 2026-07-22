---
locale: en
translationKey: syntax-guide
title: Complete Markdown and Entry Property Guide
description: "One reference for a first edit or a complete new entry: Markdown, frontmatter, media, content structure, and pre-PR checks."
---

Use this as a **look-up reference**, not a chapter you must memorize. For a first contribution, choose a route above. While editing, jump here only when you need a heading, link, image, media embed, or frontmatter field.

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
translationKey: example-entry
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

## About Markdown editors

Markdown does not require a specialized editor. You can even create a Markdown file using a basic text editor such as Notepad, as long as you save the file with the `.md` extension.

For users who are unfamiliar with Markdown, an editor with real-time preview may provide a more convenient workflow.

Obsidian is recommended because it offers a comprehensive feature set and is available on multiple platforms.

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
| Lyric toggle buttons | `{{lyrics-controls::en}}` (use `zh` / `ja` for those files) |

Inline arguments are plain text: do not nest Markdown or HTML inside them. A double colon `::` separates arguments and remains safe inside Markdown tables. A misspelled name or incorrect argument count remains visible as source text so the mistake can be found in Preview.

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

- The path matches `locale`, and localized siblings share one `translationKey`.
- Both `---` markers, YAML indentation, and field types are intact.
- Dates use `YYYY-MM-DD`; durations use `MM:SS` or `HH:MM:SS`.
- New facts have reliable sources, links open, and informative images have useful alternative text.
- Artist-body links use a standalone `## External Links` heading and `- [Label](URL)` list items, with no bare URLs or combined heading.
- Media uses `@[provider](...)`; the body contains no scripts, event handlers, credentials, tokens, or private information.
- Preview / Changes contains only the intended edit and no accidental deletion of another locale.

## Property block guide

If you do not understand the properties in an entry's frontmatter block, refer to the explanations below.

### Common properties

The following properties are shared by every entry category:

- `locale`: Identifies the language version of the document. The available values are `zh` for Chinese, `en` for English, and `ja` for Japanese. Enter the value corresponding to the language of the entry you are editing.
- `translationKey`: A shared identifier connecting different language versions of the same entry. The Chinese, Japanese, and English files for the same entry must use the same value.

**Source example:**

```yaml
locale: en
translationKey: kaf-originals-shi
```

**Result:** the file joins the English collection and links to the Japanese and Chinese files that share this `translationKey`.

### Artist properties

**Minimal example:**

```yaml
name: KAF
romanizedName: KAF
statusLabel: Activity status
status: Active
image: /images/artists/kaf.webp
```

**Result:** the artist page uses “KAF” as its heading and displays the status and profile image.

| Property | Type | Required | Purpose and content |
| :---: | :---: | :---: | :--- |
| `locale` | `zh / ja / en` | Yes | Language of the current entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same person |
| `code` | String | No | Artist number, archive number, or internal identifier |
| `name` | String | Yes | Person's name as displayed in the current language |
| `romanizedName` | String | Yes | Romanized, Latin-alphabet, or international display name |
| `categoryTitle` | String | No | Main title of the category to which the artist belongs |
| `categorySubtitle` | String | No | Subtitle or English description of the category |
| `categoryOrder` | Number | No | Sorting value between categories; smaller values are usually displayed first |
| `itemOrder` | Number | No | Sorting value of the current artist within the category |
| `meta` | String | No | Short metadata shown on a list card, such as a role, affiliation, or brief summary |
| `debutDate` | String | No | Debut date. The recommended format is `YYYY-MM-DD`, although the schema does not enforce it |
| `profileTagline` | String | No | Introductory tagline displayed on the artist detail page |
| `designCredits` | String array | No | List of character designers, visual designers, modelers, and other production staff |
| `affiliations` | String array | No | Labels, groups, projects, or organizations with which the artist is affiliated |
| `officialLinks` | Object array | No | Official website and official social-media links |
| `officialLinks[].label` | String | Yes | Link name, such as `Official Site` or `YouTube` |
| `officialLinks[].href` | String | Yes | Official link URL |
| `featuredEntries` | Object array | No | Other entries prominently associated with the artist |
| `featuredEntries[].label` | String | Yes | Display name of the associated content |
| `featuredEntries[].href` | String | Yes | Path to the associated entry |
| `featuredEntries[].kind` | Fixed enum | Yes | Type of associated content. Must be `artist`, `project`, `album`, or `song` |
| `theme` | Shared theme object | No | Customized color theme for the artist detail page |
| `statusLabel` | String | Yes | Heading of the status field, such as `Activity Status` |
| `status` | String | Yes | Actual status, such as `Active` or `Inactive` |
| `inactive` | Boolean | No | Whether the artist is inactive. `true` normally indicates that activities have ended or the entry has been archived |
| `image` | String | Yes | Path to the main image, avatar, or character illustration |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information for the entry |

### Project properties

**Minimal example:**

```yaml
kind: project
title: Kamitsubaki City Under Construction
description: A Kamitsubaki world-building project
order: 10
```

**Result:** the project is sorted by `order` and its title and description form the listing card.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current project entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same project |
| `kind` | String | Yes | Project type, such as `project`, `game`, or `virtual-world`. The schema does not restrict this field to predefined values |
| `title` | String | Yes | Project title |
| `description` | String | Yes | Short description of the project, normally used on list cards or as a page summary |
| `order` | Number | Yes | Sorting value in the project list |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Log properties

**Minimal example:**

```yaml
date: "2026-07-19"
type: update
title: Site content update
order: 10
```

**Result:** the log page displays its date, type, and title and sorts it by `order`.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current log entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same log |
| `date` | String | Yes | Date of the log. The recommended format is `YYYY-MM-DD`, although the schema does not validate it |
| `type` | String | Yes | Log type, such as `update`, `notice`, or `maintenance` |
| `title` | String | Yes | Log title |
| `summary` | String | No | Short summary of the log |
| `order` | Number | Yes | Sorting value of the log |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Song properties

Store song files as `artist ID / category / song ID / locale.md`, for example `songs/kaf/originals/shi/en.md`. The first artist folder is the entry's canonical storage location, while its category folder is reused in every associated artist catalog. Recommended folders are `originals`, `covers`, `genealogy`, `suites`, `collaborations`, and `projects`; any additional folder automatically becomes a new category.

**Minimal example:**

```yaml
title: Ito
artist: KAF
artistId: kaf
releaseDate: "2018-12-06"
duration: "03:52"
```

**Sharing one entry between artists:** create only one song folder for the same recording. Choose one primary artist as the canonical location, keep `artistId` equal to the first path folder, and put every artist catalog that should include the recording in `artistIds`. For example, keep “古傷” only at `songs/harusaruhi/collaborations/古傷-furukizu/`:

```yaml
title: 古傷
artist: 幸祜×春猿火
artistId: harusaruhi
artistIds:
  - harusaruhi
  - koko
code: apple-1678038919
```

You now maintain only `zh.md`, `ja.md`, and `en.md` in that folder. The same entry appears under Collaborations for both Harusaruhi and KOKO, and both catalog items link to the same canonical page. Do not copy the body, `translationKey`, or artwork metadata into `songs/koko/`. `artistIds` must include `artistId` and must not contain duplicates; putting `artistId` first is recommended. When present, `code` must identify one unique recording and must not be reused by another song folder.

**Result:** the song page displays its title, artist, release date, and duration and appears in every artist list named by `artistIds`. If `artistIds` is omitted, it appears only under `artistId`.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current song entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same song |
| `title` | String | Yes | Song title |
| `artist` | String | Yes | Main performer or artist name |
| `artistId` | Lowercase slug | Yes | Canonical storage artist, such as `kaf`; it must match the first folder in the song path |
| `artistIds` | List of lowercase slugs | No | Every artist catalog that should include this same entry; required for multi-artist songs, must include `artistId`, and must not contain duplicates |
| `composer` | String | No | Composer |
| `lyricist` | String | No | Lyricist |
| `album` | String | No | Album containing the song |
| `duration` | String | No | Song duration. The recommended format is `03:45`, although the schema does not validate it |
| `releaseDate` | String | No | Release date. The recommended format is `YYYY-MM-DD` |
| `code` | String | No | Unique recording, archive, or internal identifier; it must not be repeated in another song folder |
| `categoryTitle` | String | No | Title of the category to which the song belongs |
| `categorySubtitle` | String | No | Subtitle of the category |
| `categoryOrder` | Number | No | Sorting value between categories |
| `itemOrder` | Number | No | Sorting value of the song within its category |
| `image` | String | No | Path to the song artwork, single cover, or album cover |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

### Album properties

**Minimal example:**

```yaml
title: Observation α
artist: KAF
type: Album
releaseDate: "2019-09-11"
tracks:
  - number: 1
    title: Ito
    songId: kaf/originals/shi
```

**Result:** the album page builds its metadata and track list; a track with `songId` links to the corresponding song page.

| Property | Type | Required | Purpose and content |
| --- | --- | :---: | --- |
| `locale` | `zh / ja / en` | Yes | Language of the current album entry |
| `translationKey` | String | Yes | Shared identifier used by all language versions of the same album |
| `title` | String | Yes | Album title |
| `romanizedTitle` | String | No | Romanized, Latin-script, or international display title |
| `artist` | String | Yes | Main album artist |
| `type` | String | No | Release type, such as `Album`, `EP`, or `Mini Album` |
| `description` | String | No | Short description shown near the detail-page heading |
| `releaseDate` | String | No | Release date. The recommended format is `YYYY-MM-DD` |
| `label` | String | No | Releasing label |
| `catalogNumber` | String | No | Catalog or product number |
| `trackCount` | Number | No | Total number of tracks |
| `duration` | String | No | Total album duration |
| `code` | String | No | List number, archive number, or internal identifier |
| `categoryTitle` | String | No | Title of the album category |
| `categorySubtitle` | String | No | Subtitle of the album category |
| `categoryOrder` | Number | No | Sorting value between categories |
| `itemOrder` | Number | No | Sorting value of the album within its category |
| `image` | String | No | Path or URL for the album cover |
| `officialLinks` | Object array | No | Official, purchase, or streaming links; each item uses `label` and `href` |
| `tracks` | Object array | No | Track list. Each item requires `title` and may include `disc`, `number`, `artist`, `duration`, and `songId` |
| `tracks[].songId` | String | No | Path of a related song entry on this site, such as `kaf/originals/shi` |
| `theme` | Shared theme object | No | Custom color theme for the album detail page |
| `seo` | Shared SEO object | No | Search-engine and social-sharing information |

#### Song and album backfill standard

Backfill work has two independently reviewable levels:

- **Catalog-ready:** paths, required metadata, official sources, local high-resolution artwork, official links, and a minimal body are reliable. Track links, lyrics, or long-form text may still be incomplete if the missing scope is stated clearly.
- **Complete entry:** adds verified tracks, internal song links, body copy, usable lyric material, and all three locales. Completeness never means filling uncertain fields.

##### Directory code syntax

```md
songs/<artistId>/<category>/<songId>/<locale>.md
albums/<artistId>/<albumId>/<locale>.md
```

##### Authoring

Group songs by artist and then song category. Group albums only by artist and album ID; do not reproduce the artist-category UI as album folders. Use stable lowercase slugs for `artistId`, `songId`, and `albumId`, and share one `translationKey` across locales.

##### Example

```md
src/content/songs/kaf/originals/shi/
├── zh.md
├── ja.md
└── en.md

src/content/albums/kaf/kansoku-alpha/
├── zh.md
├── ja.md
└── en.md
```

##### Song acceptance criteria

- The path's `artistId`, category, and `songId` agree with the metadata. Reuse `originals`, `covers`, `genealogy`, `suites`, `collaborations`, or `projects` when applicable.
- Titles, dates, and credits are supported by official sites, official upload descriptions, legitimate release pages, or reliable interviews. AI output is not a source.
- `categoryOrder` and `itemOrder` do not conflict with existing entries and preserve a stable public or site order.
- `image` resolves to a real repository asset, not an expiring URL, search thumbnail, placeholder, or unnecessary duplicate.
- Use controlled media syntax such as `@[bilibili](BV...)`; do not add raw `<iframe>` markup, autoplay, or unofficial reuploads.
- The body identifies the work and cites traceable sources. Lyrics are optional. If added, distinguish original, translation, and romanization, reuse the lyric controls, and verify provenance and copyright boundaries.
- Prefer `zh.md`, `ja.md`, and `en.md` together. List missing translations or facts in the PR instead of inventing text or adding placeholder prose.

##### Album acceptance criteria

- **Catalog-ready minimum:** title, artist, type, verified release information, official artwork, at least one official or licensed streaming link, a shared three-locale `translationKey`, and a short source-backed body.
- Prefer the highest-quality artwork available from Apple Music or another licensed service or official product page. Use a square image of at least `1500 × 1500` when available; reject search thumbnails, screenshots, placeholders, and artificial upscales.
- Store artwork at `public/images/albums/<artistId>/<albumId>.jpg` and reference `/images/albums/<artistId>/<albumId>.jpg` in frontmatter rather than relying on a third-party image URL.
- `trackCount` matches the verified total. When `tracks` is present, check disc number, sequence, title, artist, and duration against the official track list.
- Add `tracks[].songId` only when the target song entry exists. A track without a page keeps its `title` and must not create a broken link.
- Separate standard, reissue, remix, and live editions only when they are officially distinct releases; never mix dates or track lists from different editions.
- If tracks or body copy are incomplete, state the scope in both the entry and PR. Do not fabricate data or imply that coverage is complete.
- Structural metadata, sequence, artwork, and links remain aligned across locales; localize display text and prose only.

##### Body code syntax

```md
## About the release

Describe the work, release context, and verified production information.

## Official media

@[bilibili](BVxxxxxxxxxx)

## Backfill status

Core metadata and official links are complete; track links will be added as song entries become available.

## Sources

- [Official release page](https://example.com/official)
- [Apple Music](https://music.apple.com/example)
```

##### Authoring

Make only claims supported by sources. The status note should tell reviewers and future editors what is complete and what remains, without presenting plans or guesses as encyclopedia facts.

##### Example

Use `src/content/songs/kaf/`, `src/content/albums/kaf/`, and `public/images/albums/kaf/` as current references. Before submitting, run:

```md
pnpm check
pnpm test
pnpm build
```

Passing checks is the minimum technical bar; it does not replace source, track-order, link, or artwork-quality review.

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
