> 历史参考：本文不再定义开发维护流程；当前规范见仓库 maintenance/README.md。

# UI 组件调研与 daisyUI 接入方案

日期：2026-10-11。状态：架构与官方资料调研完成，用户已选择 daisyUI，等待进入实现阶段。

## 结论与范围

采用 daisyUI 5 作为通用控件的样式基础，保留 Astro 组件接口、原生 HTML 表单和现有业务脚本。Floating UI 继续负责浮层定位；PhotoSwipe、Uppy 继续承担图库预览和上传队列。通过网站自己的组件封装 daisyUI，避免业务页面直接依赖大量第三方样式约定。

接入在架构上可行。“无损”是需要验收的目标，尚未由真实接入试验证明。daisyUI 提供组件 CSS 与示例结构，不能替代搜索、上传、审核、认证、草稿恢复等业务流程，也不能自动保证所有自定义交互的无障碍行为。

本次只新增此文档并创建分支，没有安装依赖、修改运行代码或部署。调研依据是本地源码及官方仓库、文档、发布记录；没有开展组件原型、浏览器验收或体积实测。

## 分支与当前基线

- 前端仓库：`kamitsubaki-wiki-site`。
- 原分支：`feat/gallery-improvements`；新分支：`codex/ui-components-20261011`。
- 创建起点：`d61700d43b31e373184b21cb28117e6b2f4fcf7c`。
- 当前工作目录有大量原有未提交改动，新分支切换保留了它们；它们并未因此成为新分支中的提交。此文档也尚未提交。
- 相邻 companion 与 backend 是独立仓库，没有随前端切换分支。
- `.account-worktrees/wiki` 的 `codex/account-optimization-20261011` 有另外一组未提交账号改动；已读取其账号入口和客户端接口，尚未合并。实施涉及账号组件前，需要以其最终接口协调整合。

## 本地架构实况

### 渲染与导航

`astro.config.mjs` 使用 `output: 'static'`、Vite 和 Tailwind 4 插件。没有 React/Vue 集成。`BaseLayout.astro` 输出完整 HTML、SEO 元数据、字体与全局样式，并加载网站交互脚本。

`src/scripts/navigationMotion.js` 使用跨文档 View Transitions、`pageswap`/`pagereveal`，保持完整页面导航。当前没有 Astro ClientRouter；不能按 SPA 的挂载假设改写事件初始化。需要保留编辑器离页提示、返回状态和浏览器历史行为。

### 组件、样式与规模

读取当前工作目录得到：106 个 Astro 组件，48 个独立 CSS 文件，47 个 JS 脚本，164 个 mjs 工具模块。计数只包含对应扩展名，不能代表全部源码文件。

`global.css` 约 7,205 行；独立 CSS 合计约 12,687 行，不含 Astro 文件中的内联样式。30 个独立样式文件使用 `!important`，12 个 Astro 组件含 `is:global`。这些是静态规模指标，不等于存在同数量的缺陷，也不是压缩后的体积。

`BaseLayout.astro` 加载多份全局样式。部分规则使用 `html body`、元素选择器和较高优先级，例如 `contextActions.css`。新增组件 CSS 可能被旧规则覆盖；只加类名前缀不能解决旧样式向新控件渗透的问题。

已有 `WorkspaceButton`、`ContextAction`、`WorkspaceFilters`、`ContentTabs`、`WorkspaceState`、`Icon` 等复用入口。这些适合逐步改造，而不是另建第二套页面组件。

### 主题与字体

`global.css` 定义 `--theme-*`、界面强调色与分语言字体。网站已有 `html[data-theme='light']` 机制。

`public/ui-tokens.css` 提供 `--ui-*` 颜色、字体、间距、圆角、触控尺寸、动效和层级。它已经包含部分共享控件样式，属于现有公共接口，不应整份替换。

`scripts/sync-ui-tokens.mjs` 将这份 CSS 同步到 backend 的 `generatedUiTokens.js`，并更新静态游戏引用和共享字体、折叠动效。前端 UI token 改动会牵涉 Worker 控制台及游戏。首批 daisyUI 适配 CSS 应留在前端局部样式中，之后再决定哪些变量需要提升为公共 token。

`formControls.css` 专门处理中文、繁体中文、日文原生 select 的字体与 option。使用 daisyUI 原生 select 可以继续利用这套语言策略。

### 状态与业务边界

`WorkspaceFilters.astro` 依赖 `input,select`、`HTMLSelectElement`、`selectedIndex`、原生 reset，以及 `input/change` 事件。daisyUI 对原生元素加类名，能保留这些协议；Web Components 需要额外桥接。

`siteSearch.js` 已实现搜索结果、输入法组合状态、快捷键、方向键、焦点循环；daisyUI 只负责呈现层。`databaseBrowse.js` 及工具模块负责筛选、视图和 URL 状态，接入必须保留现有数据属性。

`confirmDialog.mjs`、`modalScroll.mjs` 管理原生 dialog、取消行为、焦点恢复和移动端滚动锁；`editorPopover.mjs` 已接入 Floating UI。新增 daisyUI modal 外观时要检查滚动锁和原生 top layer，不能同时叠加两套开关状态。

账号状态使用共享脚本、CustomEvent、BroadcastChannel 和带凭据的 API 请求。独立账号工作树还使用中央认证客户端动态导入。首批试点不承担账号迁移；未来只改其表现层并保持认证接口。

Companion 也是 Astro，但当前没有 Tailwind；backend 当前主目录主要使用 Worker 生成 HTML。安装前端 daisyUI 插件不会自动改善这两处。需要另行规划构建产物和公共 token 的消费方式。

## 候选组件库比较

成熟度以维护主体、发布记录、文档、框架兼容、定制能力和迁移成本综合判断。没有只按 stars 排名，也没有把官方无障碍设计目标当作独立认证。

| 项目 | 类型及许可 | 本次核实的能力与维护信号 | 本站判断 |
| --- | --- | --- | --- |
| [daisyUI](https://github.com/saadeghi/daisyui) | Tailwind 组件 CSS；MIT | 官方发布页显示 v5.7.47，9 月 30 日发布；配置支持 prefix、include/exclude、主题开关和变量 root；原生 button/select/dialog 示例 | 用户首选；作为样式基础进入实施 |
| [Floating UI](https://github.com/floating-ui/floating-ui) | 定位引擎；MIT | 支持原生 DOM；发布列表有 DOM 1.8.0，与本站安装一致；定位和 React 交互能力需要区分 | 保留并通过网站封装扩大复用 |
| [Web Awesome](https://github.com/shoelace-style/webawesome) | Web Components；开源部分 MIT，另有 Pro | Font Awesome 团队；发布页显示 v3.14.0，9 月 24 日发布，含 SSR 修复；可按组件导入，支持表单与 CSS parts | 架构兼容，但 Shadow DOM、表单值及加载时机有适配成本；暂不与 daisyUI 并行接入 |
| [Radix Primitives](https://github.com/radix-ui/primitives) | React 无样式交互组件；MIT | 官方文档说明焦点、键盘和 ARIA 管理、增量接入；GitHub Releases 页为空，维护应查官方 release notes 和包版本 | 有成熟交互能力，但本站需要 React 运行时与组件迁移，留作以后复杂区域候选 |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | 可复制定制的组件源码；MIT | 官方 Astro 指南要求 React 和 Tailwind；发布页显示 CLI shadcn@4.21.4，10 月 7 日发布；CLI 版本不是所有组件的统一运行时版本 | 范例丰富；复制后的组件更新需要自己管理，当前不引入 |
| [React Aria](https://github.com/adobe/react-spectrum) | React 无样式交互组件；Apache-2.0 | Adobe 维护；官方组件 v1.22.0，10 月 9 日发布；无默认样式，支持 CSS/Tailwind、状态属性 | 适合复杂表单交互，但接入成本高于目前 daisyUI 路线，作为未来候选 |

版本是调研时官网/仓库显示的记录；安装前再次核对 npm 元数据和 lockfile。网页抓取可能有缓存，不把这些记录当作所有包的绝对最新版本。

## daisyUI 专项接入设计

### 配置与样式隔离

建议使用 daisyUI 5，首次固定精确版本。当前查到的 5.7.47 可作为候选，具体以实施时 npm 核验为准。不要同时更新 Astro、Tailwind 等已有依赖。

配置草案如下，尚未在本项目编译验证：

```css
@plugin "daisyui" {
  themes: false;
  prefix: "dui-";
  root: "[data-ui-kit]";
  include: button, input, textarea, select, checkbox, radio, toggle, badge, loading, skeleton;
}
```

采用已有 Tailwind 入口，不重复导入 Tailwind/Preflight。插件配置在正式编译前核对官方组件文件标识。

`root` 限定的是相关 CSS 变量的注入位置，不会把所有组件选择器或现有全局规则自动隔离。实际隔离依靠前缀、明确的 include 清单、局部变量桥接和旧样式审查共同完成。

禁用内置主题后，必须完整补齐控件需要的变量，否则组件颜色和尺寸可能不完整。在 `[data-ui-kit]` 定义 daisyUI 所需主题变量，继承网站现有 light/dark 与强调色。主题切换仍由网站脚本负责。

| daisyUI 变量角色 | 现有网站变量/策略 |
| --- | --- |
| 基础背景、表面、文本 | `--ui-color-canvas`、`--ui-color-surface`、`--ui-color-text`；base-200/300 按现有表面层次补齐 |
| primary 与其文字 | 首轮使用现有主要按钮的前景/背景配对；强调色按钮单独验收对比度 |
| secondary、accent、neutral 及各 content 色 | 从网站主题配对明确映射，不能只设置 primary |
| info、success、warning、error 及各 content 色 | 复用现有语义色并定义可读文字色，验证亮暗主题 |
| 圆角、控件尺寸、边框、阴影深度 | 对齐 `--ui-radius-*`、触控 44px 和现有间距；补齐 daisyUI 的尺寸/边框/效果变量 |
| 字体、减少动画偏好 | 继承网站语言字体和 `prefers-reduced-motion` 规则 |

第三方的默认按钮背景、hover、outline 和 disabled 状态都需要适配，不能靠全站 `!important` 强压。发现旧 CSS 覆盖时，优先收窄旧选择器或删除被替代的局部规则，每次只处理试点相关部分。

### 组件封装与协议

优先从现有 `WorkspaceButton` 和 `ContextAction` 找一个小范围入口做适配。链接与按钮的语义分开处理，保留 href、type、disabled、aria、id、name、value 和 data 属性。提交按钮显式保留 submit，普通操作按钮使用 button。

输入、选择和复选框保持原生元素；按需要新增 `UiField.astro` 等薄封装，集中处理 label、说明、错误和 required 的关联。简单样式不必为了封装而套多余 DOM。

业务 JS 继续根据既有 `data-*` 访问元素，不根据 `dui-*` 类名识别业务动作。loading/skeleton 保持 `aria-busy` 与可读状态文字，不能只展示动画。

首轮不把 Card Diet 的解释、统计、状态文本重新装成 card/alert/stats 组件。daisyUI 的可用组件数量不决定页面应该有多少卡片。

## 实施顺序与交付物

1. **组件样例与依赖接入**：基于现有 `ComponentExamples.astro` 的调用路径，做可在本地独立比较的展示区；固定依赖，加入前缀、include 和主题桥接。先展示按钮、输入、选择、复选、禁用、错误及加载状态。交付旧/新对照、编译结果及增量 CSS/JS 数据。
2. **单页真实试点**：Database 搜索与筛选区是优先候选，其原生表单和状态边界明确。只迁移控件；保留记录卡片、筛选算法、URL、分页和 Grid/List。交付移动端及亮暗主题效果、筛选重置/返回恢复证据。
3. **通用工作区推广**：逐个替换贡献、图库管理中的通用控件，保持草稿、上传队列、所有者切换和错误重试协议。检查未替换组件仍正常工作。
4. **浮层与复杂控件**：按实际需要生成 modal/dropdown/tabs 样式。原生 dialog、焦点、滚动锁和 Floating UI 保持单一控制入口；CSS 示例不能代替 ARIA 菜单、标签页或组合选择框的完整键盘实现。
5. **跨站与账号表现层**：协调账号工作树的最终接口，评估 Worker 产物和 companion 的独立构建；之后才扩展公共 token。每个仓库独立分支、构建与发布验收。

每个阶段以小范围替换为单位。回退时撤销该阶段组件/CSS适配；不更改业务数据格式和 API，因此不需要 UI 专项数据迁移。任何涉及业务行为的后续改动须单独定义范围。

## 验收要求

- 原界面与试点界面对照：亮/暗主题，中文、繁体中文、日文、英文；320–430px、平板和桌面；长文本、空值、错误与禁用状态。
- DOM/表单：保留 data 属性、id/label 关联、name/value、FormData、required、reset 和 Enter 提交；避免链接误变提交按钮。
- 真实行为：Database 搜索、条件组合、重置、分页、Grid/List、URL 刷新与详情返回；与账号/上传有关的阶段再增加对应业务验收。
- 键盘与辅助语义：Tab 顺序、可见焦点、输入法组合输入、Esc、焦点恢复、状态提示；复杂组件逐项验证语义，不能仅依赖库名宣称通过。
- CSS：检查未迁移首页和读者页、markdown 表格与原生 details 不受新规则影响；确认 old/new CSS 的优先级和 theme 变量都按设计生效。
- 动效与移动端：减少动画、触控尺寸、长列表、页面滚动及 dialog 开关后的滚动位置。
- 构建：按变更范围运行类型/编译和相关已有测试；避免为纯样式增加镜像测试。必要行为测试覆盖状态协议。
- 性能：对比真实构建产物的 CSS/JS 字节和路由加载情况；daisyUI 本身是 CSS 库，但实际产物增量仍需测量，当前没有数值结论。

## 官方证据入口

- [daisyUI 配置](https://daisyui.com/docs/config/)：prefix、include/exclude、themes、root 的具体含义。
- [daisyUI 主题](https://daisyui.com/docs/themes/)：主题开关、自定义颜色、圆角和尺寸变量。
- [daisyUI 发布](https://github.com/saadeghi/daisyui/releases)、[MIT 许可](https://github.com/saadeghi/daisyui/blob/master/LICENSE)。
- [button](https://daisyui.com/components/button/)、[select](https://daisyui.com/components/select/)、[modal](https://daisyui.com/components/modal/)：原生结构及样式用法。
- [Floating UI](https://github.com/floating-ui/floating-ui)、[发布](https://github.com/floating-ui/floating-ui/releases)。
- [Web Awesome 安装](https://webawesome.com/docs)、[select API](https://webawesome.com/docs/components/select/)、[发布](https://github.com/shoelace-style/webawesome/releases)：按需导入、可选原生 reset、表单值、CSS parts 和 SSR 维护信号。
- [Radix 能力](https://www.radix-ui.com/primitives/docs/overview/introduction)、[官方更新记录](https://www.radix-ui.com/primitives/docs/overview/releases)、[许可](https://github.com/radix-ui/primitives/blob/main/LICENSE)。
- [shadcn Astro 指南](https://ui.shadcn.com/docs/installation/astro)、[发布](https://github.com/shadcn-ui/ui/releases)、[许可](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md)。
- [React Aria 定制](https://react-aria.adobe.com/styling)、[发布](https://github.com/adobe/react-spectrum/releases)、[Apache-2.0 许可](https://github.com/adobe/react-spectrum/blob/main/LICENSE)。
- [Astro 框架组件](https://docs.astro.build/en/guides/framework-components/)：React 等组件与按需 hydration 的接入方式。

部分 Web Awesome 资源页请求失败，未以失败页支持结论；改用成功读取的安装与组件 API 页面。当前方案不依赖这些未读页面。
