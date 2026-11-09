# 全站 UI 规范（Design System）

本文是 Wiki、Companion、审核后台（admin-ui）和账号页（auth-ui）共用的 UI 标准。设计 token 的唯一来源是本仓库的 `public/ui-tokens.css` 和 `src/styles/uiKit.css`，其他仓库通过同步脚本取得副本，不要在下游手改。

## 1. 组件库分工

| 端 | 技术 | 组件来源 |
|---|---|---|
| Wiki 前台、Companion（Astro） | daisyUI 5（`dui-` 前缀，关闭内置主题） | `WorkspaceButton`、`WorkspaceControl`、`ContextAction`、`WorkspaceLinkCard`；Companion 使用同步副本 |
| 编辑器、审核后台、账号页（React） | shadcn/ui（Radix + Tailwind） | 编辑器 `prototypes/novel-editor/src/components/ui`；审核后台和账号页逐步迁移到同一套组件，CSS 变量映射到下面的 token |

React 端的 shadcn 主题变量（`--background`、`--foreground`、`--primary`、`--border`、`--radius` 等）必须映射到 `--ui-*` token，不得另定颜色。

## 2. 设计 token（`public/ui-tokens.css`）

- **颜色**：`--ui-color-canvas / surface / text / body / muted / accent / success / warning / error`，深浅主题由站点主题变量驱动。
- **字号**：辅助信息 12–13px，表单标签、控件及工作区正文 14px，分区内小标题 16px，分区与对话框标题 20px，页面主标题统一用 `--ui-font-title`（26–32px）。页面标题、分区标题与正文左侧使用同一条对齐线。长文正文使用 `--ui-font-reading`，维持独立的阅读行距。
  - 使用 `--ui-font-title`、`--ui-font-section`、`--ui-font-subheading` 和 `--ui-leading-heading`；审核详情和邮件主题属于分区，按 20px 处理。
  - 例外：注音 `rt`、上下标、`aria-hidden` 的纯装饰坐标文字。
  - 手机上的输入框用 16px，防止 iOS 自动缩放。
- **间距**：4 / 8 / 12 / 16 / 24 / 32 / 48（`--ui-space-*`）。
- **圆角**：控件 4px（`--ui-radius-control`），面板 8px（`--ui-radius-panel`）。不要写死 2px、3px。
- **点击区**：最小 44px（`--ui-hit-target`）。只有桌面上的高密度工具栏可以用 32px。
- **层级**：`--ui-layer-sticky` 20、`--ui-layer-floating` 42、`--ui-layer-navigation` 50、`--ui-layer-popover` 60、`--ui-layer-dialog` 100、`--ui-layer-toast` 110、`--ui-layer-viewer`（图片查看器）。新代码不得直接写数字 z-index。
- **动效**：`--ui-duration*`、`--ui-ease`。必须尊重 `prefers-reduced-motion`。

## 3. 交互约定

- **按钮层级**：`primary`（每个区域最多一个）/ `secondary`（默认）/ `quiet`，危险操作用 `danger`（React 端）。图标和文字之间的 gap 为 8px。
- **链接箭头**：站内导航用 `arrow-right`，悬停时横向移动；只有离开本站或新标签页打开时才用 `arrow-up-right`。用 `linkArrowIcon(href, target)` 判断，不要手写。
- **光标**：只有可点击的启用元素显示 pointer；禁用元素显示 not-allowed。不要用 `!important` 全局覆盖。
- **图片加载失败**：全局 `img[data-broken]` 隐藏破图标记和 alt 文字，保留浅色占位框。`placehold.co` 这类占位地址视为没有图片，由 `entityRegistry` 统一过滤。
- **浮动入口**：手机上向下滚动时自动隐藏，向上滚动、到达页尾或获得焦点时恢复（`floatingAutoHide.js`）。新增浮动按钮必须加进同一个选择器，并使用 `--ui-layer-floating`。
- **标题**：每个页面恰好一个 `<h1>`。
- **错误**：错误信息显示在出错的字段或区域旁边，用 `aria-invalid` 加 `aria-describedby` 关联；toast 只用于全局确认类提示，同一条消息不得叠加。
- **帮助提示 `?`**：只在内容补充了可见文字以外的信息时才使用；不得复述标签或说明。

## 4. 文案与术语

装饰性英文大写标签（eyebrow / kicker）作为品牌调性保留，但：不加序号（`01 /`），不和标题重复，不出现在与其栏目不符的页面。

统一术语：

| 概念 | 统一用词 |
|---|---|
| 给内容做贡献 | 投稿（活动类用“报名”） |
| 管理员检查 | 审核 |
| 打回修改 | 需要修改（彻底不收录用“未通过”） |
| 对外可见 | 发布 |
| 编辑工具 | 编辑器 |
| 个人区 | 我的空间 |
| 图片区 | 图库 |
| 社区活动 | 观测者企划（官方的叫“官方活动”） |
| 支持本站 | 支持本站 |
| 首页面板 | 观测面板 |
| 条目 | 词条 |
| 草稿 | 草稿 |
| Passkey | 通行密钥 |

## 5. 同步与检查

```sh
pnpm ui:tokens:sync && pnpm ui:tokens:check          # token → 管理端
node scripts/sync-companion-ui.mjs [--check]          # 共享控件 → companion
node scripts/build-community-ui-kit.mjs --backend <path> [--check]   # daisyUI 控件 → backend
```

修改共享控件或 token 后，要同时提交下游仓库的同步结果。

## 6. 共享编辑器宿主

2026-11-09 用户确认：管理界面内嵌 Wiki 前台编辑器，维护同一套编辑架构。保留管理导航，编辑器使用同一入口、组件、设计变量和按账号隔离的草稿；不再自动跳转，也不维护另一份富文本编辑器。

内嵌入口继承当前主题，保留目标内容的语言与标识；新建内容默认使用后台当前界面语言。加载失败时在原区域给出重试及新页继续编辑入口。手机菜单和工具栏的实际按钮点击区至少 44px；Radix 触发器改变 data-slot 时也必须生效。文章的主操作是提交审核，通过及公开状态仍按审核流程显示。

## 7. 管理工作区（2026-11-09 选定）

用户选择[方案 3](design/admin-workspace.png)：桌面窄导航栏、可持续操作的记录列表、右侧审阅面板；手机打开完整详情并提供返回队列入口。照片默认显示，详情只保留内容、讨论、记录三个标签。讨论只保留一个可见性切换；审核按钮位于详情底部。

沿用本站印章与共享设计变量，正文 14–16px、辅助文字至少 12px；桌面导航 80px，主区 24px 间距，手机 16px，移动操作至少 44px。主操作使用强调色，列表选中使用低对比底色；来源、状态和权限信息保持可读，禁止用装饰卡片替代数据层级。

表格采用 TanStack Table 管理记录模型，shadcn/Radix 提供按钮、标签、输入和面板；旧业务属性通过适配层保留，逐步替换旧组件。支持者和权益沿用同一外壳、表格与表单规范。


## 8. 神椿图库（2026-11-09 选定）

图库使用方案 1。桌面将「浏览」「我的投稿」「上传」放在页头右侧，手机将这三个入口放在标题下方。浏览先展示照片，桌面四列、手机两列。搜索和「筛选图片」并列，对象目录放在筛选内。选中的对象使用浅层底色和文本强调，区别于上传等主要操作。

页头沿用 Wiki 标志、衬线标题和共享设计变量。导航和筛选使用站内无衬线字体，照片缩略图用统一比例裁切，详情保留原图比例。标签和照片信息取自真实图库记录。

照片和设定组共用上传导航。「我的投稿」聚合图片与审核状态，草稿继续通过创作者中心管理。旧图片库链接转到「我的投稿」，旧本机草稿可以通过恢复入口续传。


### 图库投稿表单

上传采用第 3 套批量编目方案。共用出处在前，字段始终可见。桌面一张图占一行，手机改为逐图卡片。每张图的标题直接在行内填写，不使用文件名或共用标题代填。作者、出处和使用依据可以继承同批资料，原始链接和授权说明按使用依据提示。分类和补充区直接显示并标明选填，关联词条在可见的搜索框中选取。上传说明用直达文档的链接。

Wiki 的照片、设定组和年表表单复用投稿字段结构。React 管理端沿用已有输入控件，使用同样的标签、说明和字段错误顺序。缺失资料定位到该字段；审核进度以服务端状态和操作回执显示。表单不使用「资料已确认」之类的人工勾选。
