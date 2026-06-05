# Content Directory

This directory contains editable wiki content. Implementation code should read this content through Astro Content Collections instead of hardcoding records in components.

Use one file per locale. Markdown entries are stored in folders:

```text
artists/vwp/kaf/zh.md
artists/vwp/kaf/ja.md
artists/vwp/kaf/en.md
```

Keep `translationKey` identical across all translations of the same record.

See `docs/contributing.md` for the full editing guide.
