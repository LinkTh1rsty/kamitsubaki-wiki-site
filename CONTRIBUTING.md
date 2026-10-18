# 开发贡献

阅读 [维护入口](maintenance/README.md) 与 AGENTS.md。从最新 origin/main 创建 `task/<id>`，使用独立工作树，记录目标、范围、基线和验收。

```sh
pnpm install --frozen-lockfile
```

提交前运行：

```sh
pnpm test
pnpm check
pnpm ui:tokens:check
pnpm check:ui-actions
pnpm docs:check
pnpm lyrics:timestamps:audit -- --strict
pnpm build
node scripts/v3/check-built-links.mjs
pnpm pages:assets:audit
python3 scripts/check-workflow.py
```

PR 保持目标 main，说明问题、最终行为、验证及限制。外部 PR 在不含生产凭据的隔离环境审查；保留作者与原始提交。协调者固定各 PR head 后集成 release/<batch>，最终发布 PR 使用 merge commit。每个成员必须有检查和审查证据。main 合并及生产写入须用户批准固定候选清单。

文档/测试变更与行为一起交付，不生成仓库外 docs 镜像。未完成任务保留登记，禁止清除其他任务的修改。
