# 文档入口

- [阅读手册](manuals/site/start/zh.md)
- [投稿手册](manuals/contribute/start/zh.md)
- [开发与运行](manuals/develop/start/zh.md) · [日本語](manuals/develop/start/ja.md) · [English](manuals/develop/start/en.md)
- [架构与集成](manuals/develop/architecture/zh.md) · [内容模型](manuals/develop/content/zh.md)
- [检查与发布](manuals/develop/operations/zh.md) · [故障排查](manuals/develop/troubleshooting/zh.md)

正式站点入口为 `/{locale}/docs/`，内容只由 `manuals/` 构建。简中、日文、英文同步维护，台湾与香港繁体由现有生成器生成。修改章节后运行 `pnpm i18n:generate` 和 `pnpm docs:check`。

[迁移清单](migration-map.json)记录来源提交、原文件哈希、对应新版章节和归档位置。[历史归档](legacy/README.md)只供追溯，不进入文档路由或搜索。文章源稿和构建仍读取的 JSON 清单保留原位置；上游已删除的资料不恢复。
