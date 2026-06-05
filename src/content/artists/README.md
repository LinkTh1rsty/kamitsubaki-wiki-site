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

The first folder level controls the homepage category automatically. Optional fields such as `categoryTitle`, `categorySubtitle`, `categoryOrder`, `itemOrder`, and `code` only customize labels and ordering.
