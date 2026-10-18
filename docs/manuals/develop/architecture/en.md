---
book: develop
chapter: architecture
locale: en
order: 1
title: Frontend repository and integration boundaries
summary: Understand the public frontend, encyclopedia sources, and user-visible submission paths.
---

Astro generates the public static site. Encyclopedia sources live in src/content; entity IDs, metadata and the content registry determine classification and routes. Components live in src/components, shared behavior in src/lib, and build/check entry points in scripts. Validate account navigation and gallery behavior together after shared UI changes. The public frontend can be cloned and checked independently; maintainers perform cross-service acceptance in an isolated environment.

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
