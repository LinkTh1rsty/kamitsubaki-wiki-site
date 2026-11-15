---
book: develop
chapter: content
locale: en
order: 3
title: Content models and languages
summary: Maintain entities, paths, relations, and five languages against the actual schema.
---

## Identify the source of truth

Path rules live in `src/content/README.md` and `src/lib/contentLayout.mjs`. Actual fields are constrained by `src/content.config.ts`, `src/lib/entitySchema.mjs`, and the registries. Classification follows `src/data/classification-map.json`. Historical specifications explain context; they do not override current validation.

Keep an entity's `zh.md`, `ja.md`, and `en.md` together with the same stable ID. Display names, source paths, and public URLs are separate concepts. Renaming an entry should not change its ID. Do not copy the entire content tree to fix classification.

## Fields, relations, and feature data

Use fields appropriate to the entity type. Performers, production credits, and release relations affect indexes and pages. A link in prose does not create every business relation. Check both forward and reverse displays after changing a relation.

Chronicle events, taxonomy dictionaries, and encyclopedia prose have separate responsibilities. Article and gallery submission states come from services rather than static entity fields. See the [Style guide](/en/docs/contribute/format/) and [Syntax reference](/en/docs/contribute/syntax/) for complete authoring examples.

## Update languages

Identify the actual source language. Simplified Chinese, Japanese, and English are maintained independently; Taiwan and Hong Kong Traditional Chinese are generated with `pnpm i18n:generate`. Preserve code identifiers, URLs, licenses, citations, and stable IDs.

Published documentation lives at `docs/manuals/{book}/{chapter}/{locale}.md`. Its `book`, `chapter`, and `locale` frontmatter must match the path; `order` controls navigation. Keep the chapter inventory and order aligned across languages, with links in the same language.

## Validation and protected material

```sh
pnpm validate:content
pnpm i18n:generate
pnpm docs:check
```

Review the actual diff and exclude unrelated generator changes. Historical JSON still read by validators, article source documents, and conversion originals are business material. Do not move them with obsolete prose merely because they live under docs or maintenance.

Build after validation and check entry links, language switching, and relations. Fix the first field or path error; do not recreate an audit baseline to conceal lost prose.
