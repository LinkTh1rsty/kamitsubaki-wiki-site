# Architecture

This site is a static Astro wiki with URL-based internationalization and content separated from implementation.

## Runtime

```text
/      -> redirects to /zh/
/zh/   -> Chinese site
/ja/   -> Japanese site
/en/   -> English site
```

The production build is static HTML, CSS, and browser JavaScript. It does not require a backend at runtime.

## Content Flow

```text
src/content/**/*.json or .md
  -> src/content.config.ts validates schemas
  -> Astro Content Collections load records
  -> src/lib/homeData.mjs localizes, groups, and sorts records
  -> src/pages/[locale]/index.astro renders the home page
  -> src/pages/[locale]/artists/[...id].astro renders wiki articles
  -> src/components/*.astro render UI
```

Implementation files should receive content through props. Do not hardcode large public-facing content arrays in components or pages.

## Main Directories

```text
src/content.config.ts   Content Collection schemas
src/content/            Editable wiki content
src/lib/                Data shaping and i18n helpers
src/pages/              Static routes
src/components/         Presentational components
src/layouts/            Shared HTML layout
src/styles/global.css   Tailwind entry and global visual system
src/scripts/            Browser interactions
tests/                  Node test runner checks
```

## Content Collections

- `site`: site chrome and page labels from JSON
- `artists`: Markdown wiki pages for artists, creators, units, and isotopes
- `projects`: Markdown project records
- `logs`: JSON timeline rows

Schemas live in `src/content.config.ts`. `pnpm check` validates them.

## Reader UI

Artist detail pages keep a stable wiki layout:

- compact navigation bar
- article header with language links and edit-source link
- optional table of contents when headings exist
- Markdown article body when content exists
- infobox metadata panel

Empty article bodies are valid and render without fake filler text.

## Styling And Assets

Tailwind CSS v4 is compiled through `@tailwindcss/vite`. Do not add a runtime Tailwind CDN script.

Global styles live in `src/styles/global.css`, including:

- theme fonts and colors
- responsive wiki reader typography
- infobox and table-of-contents styles
- preloader, cursor, reveal, noise, and list-row effects

## Verification

CI and local development use the same commands:

```bash
pnpm test
pnpm check
pnpm build
```

The GitHub Actions workflow is `.github/workflows/ci.yml`.
