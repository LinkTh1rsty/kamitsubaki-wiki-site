# Branded External-Link Cards

Artist and album infoboxes and the artist article's External Links section share one platform registry and visual system. Brand SVGs come from `simple-icons` and are inlined at build time or by the site script; there is no runtime icon CDN.

## Authoring

Use `officialLinks` in infobox frontmatter:

```yaml
officialLinks:
  - label: "YouTube"
    href: "https://www.youtube.com/@example"
```

In an artist article, use a level-two heading followed by a normal Markdown list. Supported headings are `外部链接`, `外部連結`, `外部リンク`, and `External Links`:

```md
## External Links

- [YouTube](https://www.youtube.com/@example)
- [X (Twitter)](https://x.com/example)
```

Without JavaScript this remains a readable, clickable list. With JavaScript, `siteInteractions.js` progressively enhances only that artist-article list into responsive brand cards. Astro renders infobox cards in full on the server.

## Detection and extension

`src/lib/externalPlatforms.mjs` is the single platform registry. Detection order is domain, KAMITSUBAKI domain, link label, then the generic website fallback. It covers Bilibili, YouTube, X/Twitter, TikTok, Instagram, Weibo, Niconico, Spotify, Apple Music, NetEase Cloud Music, pixiv, piapro, Steam, Wikipedia, and KAMITSUBAKI sites, including common short domains.

To add a platform, import its official `simple-icons` object, add its metadata and matchers to `platformDefinitions`, add cases to `tests/external-platforms.test.mjs`, and run `pnpm check && pnpm test && pnpm build`. Do not copy SVG into content or use remote logo URLs. Keep keyboard focus visible and respect `prefers-reduced-motion`.

