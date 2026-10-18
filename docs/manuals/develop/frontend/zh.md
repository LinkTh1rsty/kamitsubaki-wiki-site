---
book: develop
chapter: frontend
locale: zh
order: 3
title: 前台页面与共享组件
summary: 用统一页面骨架、Reader 和控件规范扩展网站而不破坏既有体验。
---

开发环境使用 Node.js 22 和 pnpm 11.1.1。安装执行 pnpm install --frozen-lockfile。每个任务使用独立分支、工作树、端口和测试数据；从最新 main 开始并定期整合。候选环境显式设置本地 API 地址，不直接复用连接生产的在线开发脚本。提交前运行测试、Astro 检查、共享组件和文档检查、构建与链接审计。构建成功不代表登录、投稿或图库状态转换已验收。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
