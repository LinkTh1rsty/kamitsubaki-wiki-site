---
book: develop
chapter: troubleshooting
locale: en
order: 7
title: Troubleshooting
summary: Diagnose runtime, ports, content, translations, images, and submission states from the first error.
---

## Preserve the situation

Record the URL, commit, language, steps, expected and actual results, and first terminal or network error. Save or export unsent prose before investigating the environment. Do not start by deleting content, resetting another worktree, or clearing an account.

## Runtime or installation failures

Run `node --version`, `pnpm --version`, and `pnpm node:check`. Match `.node-version` and install with `pnpm install --frozen-lockfile`. Check the branch and dependency changes before regenerating a lockfile.

For editor build failures, inspect the first subpackage installation or build error. Edit production editor sources, not generated directories.

## Server startup and API errors

Check whether another process of yours occupies the port. Choose an available task port without stopping another task's service. For integration failures, verify all local origins and API settings agree, then check that the services are running.

Restrictions on external images, fonts, and providers in isolated mode do not establish damaged data. Verify UI with local fixtures and report real service connectivity separately.

## Content, translations, and links

Start with the first `pnpm validate:content` report and check entity types, required fields, stable IDs, and relation targets. Use `pnpm docs:check` to identify missing languages, ordering errors, and broken links.

For stale Traditional Chinese, edit the Simplified Chinese source and run `pnpm i18n:generate`. Japanese and English require independently maintained prose. For incorrect language destinations, check chapter identity and translated URLs.

After building, run `node scripts/v3/check-built-links.mjs`. Preserve redirects for old entry points. Do not hide missing content by deleting links.

## Images and search

Check the original URL, permission, and usage evidence before inspecting thumbnails and requests. Run `pnpm images:generate` after changing local images without overwriting originals. Keep prose available when images fail.

Documentation search covers published chapters in the current language. Try a shorter title or body keyword. If loading fails, check that the matching language's docs/search-index.json exists, then retry. Historical archives do not appear in results.

## Draft and public state differ

Local saves, cloud drafts, submitted revisions, approved revisions, and public versions are separate states. Read receipts, conflicts, or returned-review feedback in the original record. Do not create duplicates to bypass a failure. Follow the [Review guide](/en/docs/contribute/review/).

If the issue remains, provide reproduction steps, environment, errors, and checks already performed. Exclude production cookies, credentials, private prose, and other people's records.
