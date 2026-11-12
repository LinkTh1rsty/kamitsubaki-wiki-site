---
book: develop
chapter: operations
locale: zh
order: 6
title: 检查与发布
summary: 运行仓库门禁，核对真实行为，并通过既有发布入口追溯来源。
---

## 准备检查

记录当前提交与工作区状态，使用固定 Node 版本和锁文件依赖。下面命令在仓库根目录执行；编辑器子包由主站构建准备。与其他服务联调时采用本机隔离配置。

```sh
pnpm node:check
pnpm test
pnpm check
pnpm ui:tokens:check
pnpm check:ui-icons
pnpm docs:check
pnpm lyrics:timestamps:audit -- --strict
pnpm build
node scripts/v3/check-built-links.mjs
pnpm pages:assets:audit
```

当前命令以 package.json 和 CI 为准。上游删除的检查记录为“不再提供”，不能伪报通过或为了旧清单恢复过时脚本。缺少后端检出时，测试启动器会跳过部分跨仓库测试；必须在结果中注明。

## 检查通过意味着什么

测试检查规则与状态，Astro 检查类型与模板，文档检查语言和链接，构建链接审计检查输出页面，资源审计检查 Pages 文件限制。命令退出 0 不能证明真实登录、供应商、投稿审核或生产发布成功。

账号、图库和编辑器变更检查列表、详情、操作、刷新后读回。界面变更覆盖桌面和手机、明暗主题、键盘、网络错误与恢复。使用模拟数据时明确标记模拟范围。

## 候选与集成

开始任务、集成前和发布前刷新远端并核对 main。固定候选提交、成员原始 head、检查结果、审查证据及回退方式；保留其他任务和作者的提交。新 main 到来后重新集成并验证受影响部分。

代码仓库 main 合并和生产写入需要用户对具体候选的明确批准。通过 CI 或提交计划不等于发布授权。

## 正式构建与发布标记

Cloudflare Git 集成从 main 执行 `node scripts/release-build.mjs`。该入口校验来源并生成 `/.well-known/wiki-release.json`。不要直接上传其他目录的旧产物来绕过入口。

构建前后核对来源提交，部署后核对公开标记和部署 ID。云构建恢复仍须使用同一入口的 production 产物并再次核对 main。实际生产日志和发布标记才是生产证据。

## 保存证据

记录环境、提交、命令、退出码、截图和限制。分别说明本机样例、实际本地行为及生产证据。失败时保留首个错误和上下文；恢复方法见[故障排查](/zh/docs/develop/troubleshooting/)。
