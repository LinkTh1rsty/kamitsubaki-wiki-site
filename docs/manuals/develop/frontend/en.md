---
book: develop
chapter: frontend
locale: en
order: 4
title: Pages and shared components
summary: Reuse page shells, readers, native controls, image handling, and safe rendering.
---

## Choose an existing shell

Use `WorkspaceShell`, `WorkspaceHeader`, and site navigation for ordinary tool and contribution pages, and `Reader` for continuous prose. Entries, articles, and guides have different reading layouts. Choose the appropriate mode without breaking other readers through global overrides.

Documentation has a dedicated layout that reuses site navigation, the footer, and the guide reader. Its styles stay inside the documentation area. Wide screens show chapter navigation and a page outline; phones have expandable navigation. Reading the body does not depend on the search script.

## Buttons, forms, and icons

A `WorkspaceButton` with `href` produces a link. Buttons default to type button; explicitly use `type="submit"` for submission. Preserve native disabled, name, value, and keyboard behavior. Label fields when using the select and textarea modes of `WorkspaceControl`.

Connect errors with `aria-invalid` and `aria-describedby`. Pages own validation and state; basic controls do not own business logic. Use `Icon` and the existing Lucide assets, with localized accessible names for icon-only buttons.

Use existing theme and spacing tokens. Do not copy shared control foundation styles into every page.

## Images and media

Use `ResponsiveImage` with real display sizes. Thumbnails are separate display copies and must not overwrite originals. Run `pnpm images:generate` when needed. Generated WebP files, caches, and build outputs are not content sources to commit.

Keep posters fully visible and retain text and actions when an image fails. Use controlled shortcodes for external media instead of authored iframes.

## Markdown trust boundary

Markdown and HTML are parsed and passed through the shared sanitizer. Controlled media placeholders are then resolved into trusted players, followed by site transforms. Do not bypass `wikiHtmlSchema` or reorder the pipeline to admit unreviewed tags.

Verify new syntax in editing, source mode, preview, and published rendering. See the complete [Syntax and fields reference](/en/docs/contribute/syntax/).

## Verify

Check light and dark themes, 320px screens, keyboard use, reduced motion, long titles, and network recovery. Check account and gallery entry points after shared UI changes. Commands are in [Checks and release](/en/docs/develop/operations/).
