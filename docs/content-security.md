# Content rendering security policy

This document defines the trust boundary for Markdown under `src/content/`. It is the maintainer reference; author-facing examples live in the three localized syntax guides under `docs/manuals/contribute/syntax/`.

## Trust model

Content files are treated as untrusted input, even when they arrive through a reviewed Pull Request. Rendering follows this order:

1. Markdown and raw HTML are parsed into a shared syntax tree.
2. Media shortcodes become inert `wiki-media-embed` placeholders.
3. `rehype-sanitize` removes every element and attribute outside `wikiHtmlSchema`.
4. Surviving media placeholders are resolved again and materialized as trusted iframe nodes.
5. Trusted site transforms such as KaTeX, Shiki code highlighting, and external-link attributes run last.

The order is deliberate: authored iframes never survive sanitization, while a shortcode can create only a player described by the local provider resolver.

## Authoring API

Generated HTML belongs in site code. Contributors use fixed, function-like aliases instead of copying element blocks:

| Author syntax | Generated capability |
| --- | --- |
| `{{ruby::text::reading}}` | Ruby annotation |
| `{{ruby::text::kana::romaji}}` | Toggle-compatible kana and romanization |
| `{{spoiler::text}}` | Accessible site-managed spoiler text |
| `{{mark::text}}`, `{{abbr::text::title}}`, `{{kbd::text}}` | Semantic inline elements |
| `{{time::text::datetime}}`, `{{small::text}}`, `{{sup::text}}`, `{{sub::text}}` | Fixed semantic variants |
| `{{details::title}}` … `{{/details}}` | Disclosure block containing Markdown |
| `{{lyrics-controls::zh}}` (`ja` / `en`) | Fixed localized lyric-practice buttons |
| `@[provider](target "caption")` | Controlled media player |
| `{{media-switcher::title}}` … `{{/media-switcher}}` | Accessible tabs around 2–6 existing media shortcodes |

`src/lib/wikiShortcodes.mjs` owns the non-media aliases and `src/lib/mediaEmbed.mjs` owns media. Inline arguments are plain text and are HTML-escaped before parsing; shortcode output is still sanitized. Unknown names and invalid argument counts remain visible as source text rather than guessing at author intent.

Fenced Markdown code is sanitized before the official Shiki rehype plugin adds trusted token colors. Do not add `style` to the author allowlist to preserve highlighted output: highlighting must remain after sanitization so authored inline styles are still removed.

## Allowed article HTML

The policy is defined in `src/lib/htmlPolicy.mjs` and starts from the maintained `rehype-sanitize` default schema. It additionally supports the Wiki features below.

| Purpose | Elements or attributes |
| --- | --- |
| Semantic text | `abbr`, `cite`, `mark`, `small`, `time`, `u` |
| Wiki notation | `ruby`, `rt`, `rp`; only `furi` and `roma` classes on `rt` |
| Disclosure and media captions | `details`, `summary`, `figure`, `figcaption` |
| Safe site interactions | `wiki-spoiler`; the fixed lyric container and button classes/data attributes |
| Math input | `math-inline` and `math-display` code classes, sanitized before KaTeX renders them |

The upstream default schema also covers headings, paragraphs, links, emphasis, code, lists, tables, images, task-list checkboxes, and other standard GitHub-style Markdown output. URL-bearing attributes retain the schema's protocol restrictions. Authored `id` and `name` values use the `wiki-content-` clobber prefix.

The following are always removed from authored HTML:

- `script`, `style`, `iframe`, `object`, `embed`, and `form` elements;
- inline `style` and all event attributes such as `onclick` and `onerror`;
- attributes, classes, and URL protocols not explicitly accepted by the schema.

Do not broaden the schema just to preserve a pasted embed or one-off styling. Prefer Markdown, a semantic allowlisted element, or a reusable site component.

## Controlled media shortcode

Use a shortcode on its own line:

```md
@[youtube](3Wtx6k2vInU "KAF - Ito")
```

Multiple shortcodes may occupy a table cell without other text. `src/lib/mediaEmbed.mjs` accepts only known provider names and validates each ID or URL against a fixed hostname and shape before generating an iframe.

To present the same work across several official platforms, use a block containing the unchanged single-provider syntax:

```md
{{media-switcher::KAF - Ito}}
@[bilibili](BV1CJ411b7Ym "KAF - Ito")
@[youtube](3Wtx6k2vInU "KAF - Ito")
{{/media-switcher}}
```

The block requires a title and 2–6 distinct valid providers. It does not accept repeated providers, arbitrary prose, nesting, or partially valid input. After sanitization, site code materializes the validated players into an accessible tab interface. A malformed block remains inert text and creates no iframe. The no-JavaScript fallback shows all validated players in source order.

| Provider | Accepted origin | Generated origin |
| --- | --- | --- |
| YouTube | `youtube.com`, `youtu.be`, or an ID | `youtube-nocookie.com` |
| bilibili | `bilibili.com`, `b23.tv`, BV/av ID | `player.bilibili.com` |
| Apple Music | `music.apple.com`, `embed.music.apple.com` | `embed.music.apple.com` |
| Spotify | `open.spotify.com` or Spotify URI | `open.spotify.com` |
| NetEase Music | `music.163.com` or numeric ID | `music.163.com` |
| QQ Music | `y.qq.com` or song ID | `i.y.qq.com` |

Generated players have a fixed lazy-loading policy, title, referrer policy, restricted feature permission list, and provider-specific sandbox where required. Unknown providers, foreign hostnames, malformed IDs, and executable URL schemes do not generate a player.

### Raw iframe migration

Raw iframes are removed even when they point to a supported provider. Historical player snippets have been migrated to shortcodes in the content source. When importing older Markdown, extract the media ID or sharing URL and rewrite it as a shortcode before merging; never add a compatibility exception to the HTML allowlist.

## Safely extending the policy

For a new semantic element or article interaction:

1. Explain the author need and prefer a reusable, accessible pattern.
2. Add only the minimum tag, attribute, class, or data value to `wikiHtmlSchema`.
3. Keep behavior in site JavaScript/CSS; never allow authored executable code or arbitrary styles.
4. Add positive and negative cases to `tests/markdown-security.test.mjs`.
5. Update all three localized syntax guides and this document.

For a new media provider, add a resolver that validates the exact input hostname/ID shape, emits a fixed HTTPS origin, grants the minimum iframe permissions, and rejects all mismatches. Add resolver, shortcode, hostile-hostname, and rendered-attribute tests.

## Review checklist

- `pnpm test`, `pnpm check`, and `pnpm build` pass.
- A permitted example survives and a near-miss is removed.
- No new raw `script`, `style`, iframe, event attribute, or arbitrary class is required in content.
- Generated iframe origins and `allow`/`sandbox` capabilities are no broader than necessary.
- The site syntax guide matches the implementation in all three languages.
