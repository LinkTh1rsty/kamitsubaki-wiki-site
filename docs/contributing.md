# Contributing Guide

This guide is the single reference for editing the wiki and opening a pull request.

## Edit Content

Most edits belong in `src/content/`.

```text
src/content/site/       Site chrome and labels (.json)
src/content/artists/    Artist and creator wiki pages (.md)
src/content/projects/   Project pages and cards (.md)
src/content/logs/       Timeline rows (.json)
```

Do not edit `dist/`, `.astro/`, or `node_modules/`.

## Language Files

The site supports three locale routes:

```text
/zh/  Chinese, default
/ja/  Japanese
/en/  English
```

Each translatable record should have all three locale files.

Artist example:

```text
src/content/artists/vwp/kaf/zh.md
src/content/artists/vwp/kaf/ja.md
src/content/artists/vwp/kaf/en.md
```

Project example:

```text
src/content/projects/arg/kamitsubaki-city/zh.md
src/content/projects/arg/kamitsubaki-city/ja.md
src/content/projects/arg/kamitsubaki-city/en.md
```

Use the same `translationKey` in every translation of the same record.

## Markdown Page Shape

Markdown files use YAML frontmatter for structured data.

```yaml
---
locale: zh
translationKey: kaf
code: "01"
name: "花谱"
romanizedName: "KAF"
categoryId: "cat-vwp"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
---
```

Write article content after the second `---`. Empty article bodies are allowed.

Supported article syntax:

- Markdown headings, lists, tables, links, and code blocks
- LaTeX math with KaTeX
- External links that open in a new tab
- Auto-generated table of contents from `##` and `###` headings

## Add A New Entry

1. Create a folder under the right content category.
2. Add `zh.md`, `ja.md`, and `en.md`.
3. Keep `translationKey` identical across the three files.
4. Fill the required frontmatter fields.
5. Leave the article body empty if the real content is not ready.
6. Run verification.
7. Open a pull request.

## Verify Locally

Run the same commands used by CI:

```bash
pnpm test
pnpm check
pnpm build
```

If `pnpm check` reports a content schema error, compare the failing file with `src/content.config.ts`.

## Pull Request Flow

1. Create a branch from `main`.
2. Edit content or implementation.
3. Run local verification.
4. Commit and push your branch.
5. Open a pull request into `main`.
6. Wait for GitHub Actions CI.
7. Fix any CI or review feedback in the same branch.

The CI workflow lives at `.github/workflows/ci.yml`.

## Production Checklist

Before merging:

- No filler article text.
- All required locale files exist.
- `pnpm test`, `pnpm check`, and `pnpm build` pass.
- The PR changes only relevant files.
- Generated folders such as `dist/` are not committed.
