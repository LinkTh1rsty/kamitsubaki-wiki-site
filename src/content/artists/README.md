# Artist Content

Artists are grouped by page category:

```text
vwp/       V.W.P artists
solo/      solo artists and units
creators/  composers, illustrators, and other creators
isotopes/  musical isotope entries
```

Each entry has three locale files using the same `translationKey`.

Example:

```text
vwp/kaf/zh.md
vwp/kaf/ja.md
vwp/kaf/en.md
```

The `categoryId`, `categoryOrder`, and `itemOrder` fields still control how entries appear on the page. The folder is for editor convenience and repository organization.
