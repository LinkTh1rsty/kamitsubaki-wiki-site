---
book: develop
chapter: start
locale: en
order: 1
title: Environment and startup
summary: Install the pinned runtime, start an independent server, and configure explicit local origins.
---

## Prepare the environment

Read the repository README and use the exact Node.js patch in `.node-version`, with pnpm 11.1.1. Another Node 22 patch is not an equivalent runtime. Give the task its own branch, worktree, and available port.

```sh
node --version
pnpm --version
pnpm node:check
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 18000
```

Startup prepares the editor, shared UI, and Traditional Chinese content. The first run can take time. Wait for the terminal to print the local URL before opening it, and avoid starting another server on the same port.

## Single-site and integrated development

Static pages, documentation, and encyclopedia content can be developed from the frontend checkout alone. Real account, article, and gallery transitions need compatible local services. A running frontend does not establish that an integrated workflow works.

Isolated mode requires `WORKSPACE_ISOLATED=true`, `PUBLIC_WORKSPACE_ISOLATED=true`, and `PUBLIC_WORKSPACE_API_ORIGIN`, `PUBLIC_WORKSPACE_WIKI_ORIGIN`, `PUBLIC_WORKSPACE_COMPANION_ORIGIN`. Use distinct ports on `http://127.0.0.1`; the Wiki origin must match this frontend. Point business API variables at the local API and `PUBLIC_SITE_URL` at the local Wiki.

Do not copy production environment files, cookies, or databases. Correct missing or conflicting local settings rather than switching to production services to finish a test.

## Verify the result

Open the home page, documentation, and an encyclopedia entry. Check the terminal for runtime errors. Record the branch, commit, runtime, startup command, and port. Record isolated-mode limitations for external fonts, images, and login providers separately.

If startup fails, read the first error and consult [Troubleshooting](/en/docs/develop/troubleshooting/). Establish a correct runtime and dependency installation before changing business code.
