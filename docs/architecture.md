# V3 前台架构

本仓库维护静态前台、百科内容和用户可见的投稿界面。服务端闭源，不在公开仓库提供服务端代码、内部数据模型或运维文档。

| 前台来源 | 职责 |
| --- | --- |
| `src/content/` | 多语言百科 Markdown 和 Schema v2 元数据。 |
| `src/data/classification-map.json` | 经审核的分类与目录层级。 |
| `src/lib/entitySchema.mjs`、`src/lib/entityRegistry.mjs` | 前台字段校验、稳定 ID、公开路由与关联。 |
| `src/lib/contentLayout.mjs` | 百科源文件的目录规则。 |
| `src/data/chronicle/`、`src/data/taxonomy/eras.yml` | 公开时间轴事件与纪元区间。 |
| `docs/manuals/` | 三本站内说明书的 Markdown 来源。 |

百科变更经 GitHub 提案、审核、合并及静态站更新后公开。文章和图库走站点投稿与审核界面，前台只依据用户可见状态显示结果，不暴露服务端实现。

[开发说明书](manuals/develop/architecture/zh.md) · [贡献说明书](manuals/contribute/start/zh.md) · [内容目录](../src/content/README.md) · [文档索引](README.md)
