---
book: develop
chapter: frontend
locale: zh
order: 4
title: 页面与共享组件
summary: 复用页面骨架、阅读器、原生控件、图片与安全渲染规则。
---

## 选择现有骨架

普通工具与投稿页面使用 `WorkspaceShell`、`WorkspaceHeader` 和站点导航；连续正文使用 `Reader`。词条、文章与指南有不同阅读布局，新增页面应选合适的模式，避免全局改动破坏其他阅读器。

文档通过独立布局复用主站导航、页脚和指南阅读器。样式限定在文档区域，宽屏提供章节侧栏与页内目录，手机提供可展开导航。正文不依赖搜索脚本才能阅读。

## 按钮、表单和图标

`WorkspaceButton` 的 `href` 生成链接；按钮默认 type 为 button，表单提交须明确 `type="submit"`。保持原生 disabled、name、value 和键盘行为。使用 `WorkspaceControl` 的 select、textarea 模式时保留字段标签。

错误用 `aria-invalid` 表示，通过 `aria-describedby` 关联说明。页面负责校验和状态，不把业务逻辑塞进基础控件。图标使用 `Icon` 和现有 Lucide 资源，只有图标的按钮应有本地化的可访问名称。

主题和间距使用现有 token；共享控件的基础外观由 UI 适配层维护，不在每页复制一套。

## 图片和媒体

使用 `ResponsiveImage` 并提供真实显示尺寸。缩略图是原图的独立展示副本，不能覆盖原图；`pnpm images:generate` 可单独生成。WebP 候选、缓存目录和构建输出不作为内容源提交。

海报按完整显示规则处理；图片失效时保留文字和操作。外部媒体使用受控短语法，正文原始 iframe 不能替代媒体解析器。

## Markdown 的信任边界

Markdown 与 HTML 先解析，再经过共享安全过滤；受控媒体占位随后解析为可信播放器，最后运行站点变换。不要绕过 `wikiHtmlSchema` 或调整顺序来接纳未经审查的标签。

验证新增写法时同时检查编辑、源码、预览和公开渲染。完整语法见[语法与字段参考](/zh/docs/contribute/syntax/)。

## 验收

检查明暗主题、320px 手机、键盘、减少动态效果、长标题和断网重试。变更共享组件时同时检查账号与图库入口；命令见[检查与发布](/zh/docs/develop/operations/)。
