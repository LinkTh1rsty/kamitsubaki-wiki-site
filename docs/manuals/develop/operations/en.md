---
book: develop
chapter: operations
locale: en
order: 6
title: Checks and release
summary: Run repository gates, verify actual behavior, and trace releases through the established entry point.
---

## Prepare the checks

Record the current commit and working-tree state. Use the pinned Node patch and locked dependencies. Run these commands from the repository root; the main build prepares the editor subpackage. Use isolated local configuration for service integration.

```sh
pnpm node:check
pnpm test
pnpm check
pnpm ui:tokens:check
pnpm check:ui-icons
pnpm docs:check
pnpm lyrics:timestamps:audit -- --strict
pnpm build
node scripts/v3/check-built-links.mjs
pnpm pages:assets:audit
```

Use package.json and CI as the current command inventory. Record upstream-deleted checks as no longer provided, rather than passing them or restoring obsolete scripts to satisfy an old list. Without a backend checkout, the test runner skips some cross-repository tests; disclose that limitation.

## What a passing check establishes

Tests check rules and states; Astro checks types and templates; documentation checks languages and links; output-link audits check generated pages; asset audits check Pages limits. Exit code 0 does not establish real login, provider connectivity, review workflow, or production release success.

For account, gallery, and editor changes, check lists, details, actions, and readback after refresh. Check UI on desktop and mobile, both themes, keyboards, network failures, and recovery. Identify which behavior used fixtures.

## Candidates and integration

Refresh remotes and compare main at task start, before integration, and before release. Fix the candidate commit, member heads, checks, reviews, and rollback procedure. Preserve other tasks and authors' commits. Integrate newer main and rerun affected checks.

Merging repository main and writing production require explicit user approval of the concrete candidate. Passing CI or submitting a plan is not release approval.

## Production build and release marker

Cloudflare Git integration runs `node scripts/release-build.mjs` from main. The entry point verifies provenance and produces `/.well-known/wiki-release.json`. Do not bypass it by uploading an older output from another directory.

Verify source commits before and after the build, then verify the public marker and deployment ID. Cloud-build recovery still uses production output from the same entry point and rechecks main. Actual production logs and the marker establish production evidence.

## Preserve evidence

Record the environment, commit, commands, exit codes, screenshots, and limitations. Distinguish fixtures, actual local behavior, and production evidence. Preserve the first failure and its context. See [Troubleshooting](/en/docs/develop/troubleshooting/) for recovery steps.
