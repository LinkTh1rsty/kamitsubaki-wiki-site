---
book: develop
chapter: architecture
locale: zh
order: 1
title: 前台仓库与集成边界
summary: 了解公开前台、百科源稿和三类投稿在界面上的边界。
---

主站使用 Astro 生成静态页面。百科源内容位于 src/content，实体标识与分类由内容注册表和元数据决定。src/components 保存页面组件，src/lib 保存共享行为，scripts 保存构建与验证入口。账号与图库共享界面改动必须一起验收。公开前端可以独立克隆和检查，跨服务验收由维护者在隔离环境执行。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
