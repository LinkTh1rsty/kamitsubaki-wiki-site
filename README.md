# Wiki 网站与百科内容

Astro 网站、百科内容、投稿入口和编辑器。使用 `.node-version` 指定的 Node.js 和 pnpm 11.1.1。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

常用命令：`pnpm test`、`pnpm check`、`pnpm docs:check`、`pnpm build`。其余命令见 package.json，CI 配置见 .github/workflows。

`prototypes/novel-editor` 是正式编辑器源码，主站的 build:editor 会安装并构建它。`prototypes/chronoframe-explore` 是独立影像馆服务源码，两者仍由现有入口使用。

发布使用 `node scripts/release-build.mjs`，Cloudflare Git 集成执行此入口。相关配置和来源检查保留在脚本中。

- [读者手册](docs/manuals/site/start/zh.md)
- [投稿手册](docs/manuals/contribute/start/zh.md)
- [内容目录说明](src/content/README.md)
- [架构](docs/architecture.md)
- [活动中心](maintenance/activity-center.md)、[观测面板](maintenance/dashboard.md)、[文章阅读器](maintenance/article-reader.md)

本地跨服务隔离模式使用 WORKSPACE_ISOLATED=true、PUBLIC_WORKSPACE_ISOLATED=true，以及 PUBLIC_WORKSPACE_API_ORIGIN、PUBLIC_WORKSPACE_WIKI_ORIGIN、PUBLIC_WORKSPACE_COMPANION_ORIGIN 三个不同端口的回环地址。普通单站开发无需启用该模式。
