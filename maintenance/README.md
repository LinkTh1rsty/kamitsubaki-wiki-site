# Wiki 公共前端与百科内容 维护手册

## 本地开发

Node.js 22，pnpm 11.1.1。安装命令见 [贡献说明](../CONTRIBUTING.md)。基础启动示例：

```sh
pnpm dev --host 127.0.0.1 --port 18000
```

启动前确认端口可用。独立克隆可以运行仓库检查；跨服务候选由维护者工作区统一启动。不要从日常环境复制生产 .env、Cookie 或数据库；单仓库检查不需要其他私有仓库。默认脚本若连接生产服务，不作为隔离候选入口。

## 检查与验收

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

检查依据为 .github/workflows/ci.yml。记录 HEAD、环境、退出码与真实状态转换。账号、图库、编辑器和管理端改动需列表/详情/动作/刷新后读回；模拟身份仅证明本地流程。

## 发布

Wiki 使用 Cloudflare Git 集成从 main 执行 `node scripts/release-build.mjs`。生产构建前后验证来源，发布后核对 `/.well-known/wiki-release.json` 和部署 ID；不得绕过此入口直接上传 Pages。云构建恢复也必须使用同一入口的 --production 产物并再次核对 main。

开始任务、集成前、发布前都 fetch 并核对当前 main；main 或生产部署变化就停止并重新验收。固定清单记录候选提交、代码树、PR 原始 head、检查、独立审查、迁移与回退。用户批准后才合并发布 PR。所有生产分支更新必须快进，禁止强推。

## 文档生命周期

本手册、README、CONTRIBUTING 与 AGENTS 为当前维护入口。迁移清单中的 historical-reference 文档仅供研究和恢复。公开读者/投稿内容继续维护；修改旧内容前核对实际功能和当前契约，不把旧设计当现行实现。

## 隔离本机账号来源

统一启动器必须同时设置 WORKSPACE_ISOLATED=true、PUBLIC_WORKSPACE_ISOLATED=true，以及 PUBLIC_WORKSPACE_API_ORIGIN、PUBLIC_WORKSPACE_WIKI_ORIGIN、PUBLIC_WORKSPACE_COMPANION_ORIGIN。三个值必须是不同端口的 http://127.0.0.1 来源。各业务 API 环境变量指向该 API，PUBLIC_SITE_URL 指向当前前端自身。账号返回地址与站点导航只采用这份精确注册表；遗漏或不匹配配置会报错，不能回退生产。

隔离模式的 CSP 限制脚本、样式、字体、图片与连接来源。远程字体、Turnstile 和外部图片不会加载；本机 fixture 不证明这些真实供应商能力。普通模式不启用此策略。基础 pnpm dev 示例只是单仓库开发，不代表已配置隔离候选。
