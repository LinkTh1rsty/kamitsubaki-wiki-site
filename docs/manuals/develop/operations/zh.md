---
book: develop
chapter: operations
locale: zh
order: 4
title: 前台开发与验收
summary: 按修改范围检查前台，并区分本地效果与真实投稿流程。
---

main 是生产来源。任务与外部 PR 保持目标 main，由协调者固定原始提交并集成到短期 release 分支。每个 PR 的检查和审查通过后，再验证整体候选。用户明确批准具体候选清单后，使用 merge commit 一次合入发布批次。正常生产由 Cloudflare Git 集成执行 node scripts/release-build.mjs，发布前后核对 main 和公开发布标记。禁止绕过发布入口上传旧构建。记录实际来源提交、部署 ID，以及账号导航和图库回归结果。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
