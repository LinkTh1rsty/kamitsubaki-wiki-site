---
book: develop
chapter: architecture
locale: en
order: 2
title: Architecture and integration boundaries
summary: Understand the responsibilities of static pages, public APIs, the editor, and separate services.
---

## Trace behavior from the entry point

Astro generates the main site's static pages. Routes live in `src/pages`, components in `src/components`, shared rules in `src/lib`, and build and validation entry points in `scripts`. Identify the current route, then trace its components, data loading, and styles. Do not infer implementation from an old design.

Encyclopedia Markdown lives in `src/content`; chronicle events live in `src/data/chronicle`. Articles and gallery features cross dynamic service boundaries. Published content and private drafts are different classes of data.

## Editor and visual archive

`prototypes/novel-editor` contains the production shared editor. The main site's `build:editor` installs and builds that package, then copies its output into static resources. Edit the source rather than generated editor files.

`prototypes/chronoframe-explore` is a separate visual-archive service. Follow its own README. A documentation or UI change must not assume it shares the Wiki's runtime, database, or release process.

## API and identity boundaries

Public pages read only the public fields they need. Drafts, review conversations, and account operations depend on server permissions; hiding a button is not an authorization check. Account UI stays on the Wiki domain, with return URLs drawn from the exact origin registry.

Check both account and gallery interfaces after shared navigation or UI changes. Preserve user IDs, bindings, and callbacks. Do not recreate identities or Passkeys to work around configuration issues.

## Check before and after a change

Record the current route, query parameters, data source, and state transitions before making the smallest useful change. Check first visits, refreshes, failure recovery, and old links. Distinguish static builds, simulated local results, and actual service behavior.

Continue with [Content models](/en/docs/develop/content/) and [Pages and shared components](/en/docs/develop/frontend/).
