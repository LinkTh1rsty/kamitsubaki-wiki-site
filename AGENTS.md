# Wiki 公共前端与百科内容 — Agent instructions

## Shared workflow policy v1

- Before work, verify the task ID, owner, allowed paths, repository, branch, worktree and acceptance criteria. One writer owns each worktree; reviews use read-only access or another worktree.
- Fetch origin at session start, before integration and immediately before release. Compare with current remote main; integrate new main in the task worktree and rerun affected checks. Never overwrite newer work with an old snapshot.
- Use task/<task-id> and release/<batch-id>. Preserve other tasks, uncommitted work, legacy refs and data. Never force-push main, reset another checkout, share mutable databases, or kill another task's service.
- Agents may implement, test, commit, push and prepare/review PRs within the approved task. Code-repository main merges and production writes require the user's explicit approval of the fixed release manifest. Preparing a plan or passing CI is not release approval.
- Original PRs target main. Integrate exact reviewed heads into a candidate with merge commits, retaining authorship. Audit every member PR before the one final release PR; never rely on indirect merge status as review evidence.
- Preserve user IDs, credentials, provider callbacks, migrations and data. Account UI stays on the Wiki domain. Never recreate user Passkeys without user action. Verify account and gallery together after shared UI releases.
- Local tests use isolated data and local APIs. Production public reads require an explicit endpoint allowlist. Never expose private data, production cookies or secrets to previews or untrusted PRs.
- Record environment, commit, command, result and limitations. Distinguish simulated fixtures, actual local behavior and production evidence. Keep documentation with its owning source; do not regenerate a workspace docs mirror.

## Repository commands

Read CONTRIBUTING.md and maintenance/README.md. Runtime: Node.js 22，pnpm 11.1.1.

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
```

## Release boundary

Wiki 使用 Cloudflare Git 集成从 main 执行 `node scripts/release-build.mjs`。生产构建前后验证来源，发布后核对 `/.well-known/wiki-release.json` 和部署 ID；不得绕过此入口直接上传 Pages。云构建恢复也必须使用同一入口的 --production 产物并再次核对 main。

All earlier maintenance plans/reports are historical evidence, not current workflow policy. Preserve public reader/contributor instructions and business data. Never infer production approval from this standardization task.
