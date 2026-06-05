# Contributing Guide

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

This guide is the main reference for editing the wiki and opening a Pull Request.

## Edit Content

Most edits belong in `src/content/`.

```text
src/content/site/       Site navigation, section labels, footer text (.json)
src/content/artists/    Artist, creator, unit, and isotope pages (.md)
src/content/projects/   Project pages and cards (.md)
src/content/logs/       Timeline/update rows (.json)
src/content/contribute/ GitHub edit-guide copy (.json)
```

Do not edit `dist/`, `.astro/`, or `node_modules/`.

## Three-Language Files

The site supports three locale routes:

```text
/zh/  Chinese, default
/ja/  Japanese
/en/  English
```

Every translatable record should have all three language files. When adding a page, create `zh.md`, `ja.md`, and `en.md`, and keep the same `translationKey`.

## Markdown Shape

Markdown files use YAML frontmatter for structured data.

```yaml
---
locale: zh
translationKey: kaf
name: "花谱"
romanizedName: "KAF"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
seo:
  title: "花谱 - KAMITSUBAKI WIKI"
  description: "Custom text for search results and link previews."
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花谱"
    - "KAF"
---
```

Write article content after the second `---`. Empty bodies are allowed, but do not add filler text.

## Homepage Display

The homepage DATABASE scans the first folder level under `src/content/artists/` as the category.

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ homepage category
```

To add a new category, create a new first-level folder and add three-language entries. `categoryTitle`, `categorySubtitle`, `categoryOrder`, `itemOrder`, and `code` are optional display overrides. When they are missing, the site uses the folder name, entry name, and default sorting.

## Metadata

The `seo` block is optional. When it is missing, the site scans the entry automatically:

- `name`, `romanizedName`, category, and status become fallback metadata.
- The first Markdown paragraph becomes the page description.
- `image` becomes the Open Graph and Twitter preview image.

Use `seo.title`, `seo.description`, `seo.image`, `seo.keywords`, or `seo.noindex` only when a page needs manual control. Set `PUBLIC_SITE_URL` during deployment to make canonical URLs and local images absolute.

## Add A New Entry

1. Create a folder under the right content category.
2. Add `zh.md`, `ja.md`, and `en.md`.
3. Keep `translationKey` identical across the three files.
4. Fill the required frontmatter fields.
5. Leave the body empty if real content is not ready.
6. Run local verification.
7. Open a Pull Request.

## Verify Locally

CI and local development use the same commands:

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
5. Open a Pull Request into `main`.
6. Wait for GitHub Actions CI.
7. Fix CI or review feedback in the same branch.

The CI workflow lives at `.github/workflows/ci.yml`.

## Merge Checklist

- No filler article text.
- All required locale files exist.
- `pnpm test`, `pnpm check`, and `pnpm build` pass.
- The PR changes only relevant files.
- Generated folders such as `dist/` are not committed.
