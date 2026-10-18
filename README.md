# Wiki 公共前端与百科内容

本仓库的源码与维护流程入口。main 是生产来源，日常开发使用独立任务分支，候选验收后由用户批准发布。

读者与投稿说明见 [使用手册](docs/manuals/site/start/zh.md) 和 [投稿指南](docs/manuals/contribute/start/zh.md)。内容目录见 [内容说明](src/content/README.md)。服务端由维护者独立管理，公开开发不需要访问私有源码。

## 开发

运行环境：Node.js 22，pnpm 11.1.1。

```sh
pnpm install --frozen-lockfile
```

本地启动与隔离要求见 [维护手册](maintenance/README.md)，检查与贡献流程见 [CONTRIBUTING](CONTRIBUTING.md)。构建通过不等于真实业务或生产验收通过。

## 发布

Wiki 使用 Cloudflare Git 集成从 main 执行 `node scripts/release-build.mjs`。生产构建前后验证来源，发布后核对 `/.well-known/wiki-release.json` 和部署 ID；不得绕过此入口直接上传 Pages。云构建恢复也必须使用同一入口的 --production 产物并再次核对 main。

## 文档

[当前维护入口](maintenance/README.md) · [文档迁移清单](maintenance/document-migration.json)。旧方案、报告和内部说明保留为历史证据，不再作为开发规范。

[历史架构参考](docs/architecture.md)
