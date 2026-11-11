# Unified production baseline (2026-10-12)

Production source is remote `main`. The October 11 account release and gallery/icon release are now reconciled in source. Feature branches must incorporate main before release; never upload a directory based on an older production snapshot.

Cloudflare Git production builds use `node scripts/release-build.mjs`. The build checks that HEAD equals current remote main, runs regression tests and the icon audit, builds with explicit online service URLs, audits output, and checks main again before deployment. A newer push invalidates an older in-progress build. The generated `/.well-known/wiki-release.json` identifies the deployed commit.

1. Fetch main and merge the intended feature in an isolated checkout. Preserve unpublished work in other checkouts.
2. Run tests, Astro check, icon audit, online build and browser checks for both account and gallery paths.
3. Fast-forward push the reconciled commit to main. Cloudflare performs the production build; do not bypass it using raw Pages uploads or old build artifacts.
4. Verify canonical deployment source and the public release marker. Check avatar/name menu, profile, main-site security, gallery opening/navigation and icons.
5. If production or main changes while preparing a release, integrate those changes first. Do not reset production to the captured older version.

Backend, Companion and gateway use their own remote main baselines. Keep existing runtime configuration and database schema intact when changing frontend code.

---

# 历史资料已归档

这份历史记录已移至仓库外的维护者归档，不作为公开开发文档提供。前台开发请参阅[开发说明书](../manuals/develop/architecture/zh.md)，投稿流程请参阅[贡献说明书](../manuals/contribute/start/zh.md)。
