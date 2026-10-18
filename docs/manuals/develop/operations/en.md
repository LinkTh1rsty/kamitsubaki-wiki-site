---
book: develop
chapter: operations
locale: en
order: 4
title: Frontend development and acceptance
summary: Check frontend changes by scope and distinguish local behavior from real submissions.
---

main is the production source. Task and external PRs keep main as their target; the coordinator integrates fixed original commits into a short-lived release branch. Check and review every member, then validate the complete candidate. Only explicit user approval of that fixed manifest permits a single merge-commit release. Normal production uses Cloudflare Git integration with node scripts/release-build.mjs. Recheck main and the public release marker, never bypass the release entry point with an older build, and record the actual source commit, deployment ID, account navigation and gallery regression results.

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
