# Catalog 高级筛选开发 Prompt（Mimo-X-Pro 适用）

> 用途：将本文整段作为任务 prompt 投喂给 Mimo-X-Pro，驱动其在 `F:\kamitsubaki-wiki-site` 仓库内完成功能清单第 22 项「高级筛选」。
> 背景判断：该功能基于现有 catalog 数据即可实现，不需要新增任何内容条目，属于低成本、收益立现的改进。
> 联网：本任务**不要求任何新增依赖**；仅当确需查阅外部文档时，代理走 `http://127.0.0.1:7897`（详见第 9 节）。

---

## 1. 角色

你是一名资深 Astro 前端工程师，在一个已上线的多语言静态 wiki 仓库中独立工作。你的任务是为音乐目录（catalog）页面实现**高级筛选**功能，并保证仓库现有校验全部通过。你只能修改本 prompt 允许范围内的文件，禁止做任何需求外的重构。开始写代码前，必须先通读第 3.8 节列出的「必读文件」。

## 2. 任务

### 2.1 范围与分期

| 阶段 | 页面 | 内容 | 优先级 |
|---|---|---|---|
| P1 | `src/pages/[locale]/songs/artists/[artist].astro` | 艺人歌曲目录高级筛选 | 必做 |
| P2 | `src/pages/[locale]/albums/artists/[artist].astro` | 艺人专辑目录高级筛选 | 必做 |
| P3 | `src/pages/[locale]/songs/index.astro` 与 `src/pages/[locale]/albums/index.astro` | 目录首页卡片按名称过滤（单个文本框） | 时间允许再做 |

两个必做页面的筛选逻辑共用同一套模块（见 4.1），实现顺序：先 P1 打磨完整，再以最小差异复制到 P2。

### 2.2 P1：艺人歌曲目录筛选器规格

在 `category-jump` 导航与分类列表之间插入筛选栏，提供：

1. **关键词搜索**（单个文本框）：匹配 `title` / `album` / `composer` / `lyricist` 四个字段，必须使用 `src/lib/cjkSearch.mjs` 的 `foldCjkSearchText` 做折叠比对（兼容简繁、大小写、全半角）。
2. **分类多选 chips**：选项即页面现有的分类 sections（含 `uncategorized` 兜底组），默认全选；点击 chip 切换选中态，对应分类整组显示/隐藏。
3. **年份区间**：起、止两个 `select`，选项由当前数据实际出现的年份升序推导（`releaseDate` 可能只有 `YYYY` 或 `YYYY-MM` 格式，年份一律取前 4 位），不允许硬编码年份。
4. **合作曲开关**（checkbox）：仅显示 `artistIds` 数组长度 > 1 的条目。
5. **排序 select**：
   - 默认 = 现状（按分类分组，组内 itemOrder → releaseDate → title）；
   - 标题（A→Z，用 `localeCompare`，locale 取当前页面语言）；
   - 发布日期（新→旧，缺失日期排最后）；
   - 时长（长→短，需解析 `MM:SS` / `HH:MM:SS`，缺失排最后）。
   - 选择非默认排序时切换为**平铺列表**（脱离分组，复用现有 song-row 行标记）；切回默认时必须**精确还原**原始分组结构（初始化时记录每个行的归属 section 与顺序）。
6. **结果反馈**：实时计数（如 `12 / 38`）放在 `aria-live="polite"` 容器中；筛选结果为空时显示空态文案 + 「清除筛选」按钮；分类分组被过滤为空时隐藏该 section，且 `category-jump` 导航中对应锚点同步隐藏，各 section 的计数同步更新。

### 2.3 P2：艺人专辑目录筛选器规格

与 P1 同构，差异如下：

1. 关键词匹配 `title` / `romanizedTitle` / `label` / `catalogNumber`。
2. 类型 chips：facet 值由 `entry.data.type` 在数据中实际出现的值推导（**禁止硬编码** Album/EP 等枚举）；`type` 缺失的条目归入「未标注」组。
3. 年份区间：同 P1。
4. 排序：默认（现状） / 发布日期（新→旧） / 标题 / 曲目数（`trackCount` 降序，缺失排最后）。
5. 先阅读该页面现有结构再动手，行标记、分组方式与 P1 不完全相同，以实际为准。

### 2.4 交互与状态

- 筛选状态同步到 URL query（`history.replaceState`），建议参数名：`q`、`cat`（逗号分隔多值）、`year_from`、`year_to`、`collab`、`sort`；页面加载时解析 query 还原筛选状态（分享链接、刷新不丢状态）。
- 「清除筛选」清空全部条件并同步清除 query。
- 输入类控件 `input` 事件即时过滤（文本框可加 ~150ms 防抖）；选择类控件 `change` 事件即时生效。

## 3. 仓库事实（已核实，必须遵守）

### 3.1 技术栈与形态

- Astro（`output` 为静态，页面全部 SSG 预渲染）+ TypeScript（strict）+ Tailwind CSS v4（经 `@tailwindcss/vite`）。
- **纯静态站点，无服务器运行时**。筛选必须 100% 在客户端完成，禁止新增 API 端点、禁止运行时 fetch。
- 包管理器 pnpm，**禁止引入任何新依赖**（无 React/Vue/Alpine/lit；不装任何 npm 包）。客户端交互一律原生 JavaScript。

### 3.2 关键命令

```bash
pnpm dev      # 本地开发（predev 会先跑 i18n:generate）
pnpm check    # astro check，类型校验
pnpm test     # node --test tests/*.test.mjs（pretest 会先跑 i18n:generate）
pnpm build    # 构建（prebuild 会先跑 i18n:generate）
pnpm preview  # 预览 dist
```

### 3.3 目录与数据模型

内容集合定义在 `src/content.config.ts`，本功能关心的字段：

- **songs**：`title`、`artist`、`artistId`（slug）、`artistIds?`（数组，含主 artistId）、`composer?`、`lyricist?`、`album?`、`duration?`（`MM:SS` 或 `HH:MM:SS`）、`releaseDate?`（`YYYY` / `YYYY-MM` / `YYYY-MM-DD`）、`code?`、`categoryTitle?`、`categoryOrder?`、`itemOrder?`、`image?`。
- **albums**：在 songs 基础上去掉 composer/lyricist/album/artistIds，另有 `romanizedTitle?`、`type?`（自由字符串）、`description?`、`label?`、`catalogNumber?`、`trackCount?`（非负整数）、`duration?`、`tracks?`。
- 条目路径形态：`artist/category/song-slug/{locale}.md`；`entry.id` 去掉最后一段（locale 文件名）即为内容路径。

### 3.4 分类体系（不要自己发明）

`src/lib/musicCatalog.mjs` 从**目录路径**推导分类，规范 slug 共六个（含排序权重）：`originals`(10)、`covers`(20)、`genealogy`(30)、`suites`(40)、`collaborations`(50)、`projects`(60)；另有别名归一（如 `original`→`originals`、`genealogy-songs`→`genealogy`）与 `uncategorized` 兜底。P1 页面 SSR 时已经用 `groupSongsByCategory` 生成分组，筛选脚本直接消费页面 DOM 里的分组即可，**禁止另行推导分类**。

### 3.5 i18n 规则

- 站点 5 个 locale：`zh`（默认）、`zh-tw`、`zh-hk`、`ja`、`en`。
- 页面内 UI 文案用 `resolveLocaleCopy({ zh, ja, en }, localeCode)`，**只需提供 zh/ja/en 三份**，zh-tw/zh-hk 由该函数自动从 zh 转换（`ui: true`）。先例见 songs 页面现有 `copy` 对象。
- `src/content/` 下的 zh-tw、zh-hk 内容文件由 `scripts/generate-traditional-chinese.mjs` 自动生成，**禁止手改**；本功能不应改动 `src/content/` 任何文件。

### 3.6 客户端脚本与 DOM 约定

- 脚本放在 `src/scripts/*.js`（原生 JS 模块），在 `.astro` 文件末尾以 `<script> import '../scripts/xxx.js'; </script>` 引入（先例：`src/components/SiteSearch.astro` 第 136 行附近）。
- 脚本选择器一律用 `data-*` 钩子属性（如 `data-catalog-filter-root`、`data-filter-chip`），禁止用 class 或 id 做 JS 选择器。
- 需要 JS 使用的字符串模板（如计数文案）以 `data-*` 属性 SSR 到 DOM 上，由脚本读取替换，**禁止在 JS 里硬编码任何自然语言文案**。
- 纯逻辑（状态解析/序列化、过滤、排序、时长解析、年份推导）抽到 `src/lib/catalogFilter.mjs` 供 `node --test` 直接测试；`src/scripts/catalogFilter.js` 只做 DOM 接线。

### 3.7 测试基线（重要）

- 干净树上 `pnpm test` 存在 **4 个预先失败的用例**（与本项目历史相关）。动手前先跑一次 `pnpm test` 记录基线；完成后重跑，**对比基线，只要不出现新失败即为通过**。不要去修那 4 个历史失败。
- 新增测试文件：`tests/catalog-filter.test.mjs`，风格参照 `tests/home-music-randomization.test.mjs`（`node:test` + 断言纯函数）。

### 3.8 必读文件（动手前先读）

1. `src/content.config.ts` — 数据 schema
2. `src/lib/musicCatalog.mjs` — 分组/分类逻辑
3. `src/lib/i18n.mjs` — `resolveLocaleCopy` / `supportedLocales`
4. `src/lib/cjkSearch.mjs` — `foldCjkSearchText`
5. `src/pages/[locale]/songs/artists/[artist].astro` — P1 宿主页面
6. `src/pages/[locale]/albums/artists/[artist].astro` — P2 宿主页面
7. `src/pages/[locale]/songs/index.astro` — 目录首页（P3）
8. `src/scripts/personalLibrary.js` — 脚本书写风格参照
9. `src/components/SiteSearch.astro` — script 引入模式参照
10. `tests/home-music-randomization.test.mjs` — 测试风格参照
11. `package.json` — 命令与依赖

若本 prompt 与仓库实际代码冲突，以仓库实际为准，并在最终汇报中明确指出冲突点。

## 4. 实现约束（架构决定，按此执行）

### 4.1 SSR DOM 即数据源

- 筛选所需数据在 SSR 时以 `data-filter-*` 属性写在每个条目行上（如 `data-filter-title`、`data-filter-album`、`data-filter-composer`、`data-filter-lyricist`、`data-filter-year`、`data-filter-duration`、`data-filter-cats`、`data-filter-collab`、`data-filter-order`），脚本读取这些属性完成过滤，通过 `hidden` 属性 / 节点移动控制显隐与排序。
- **禁止**「JSON island + 客户端重新渲染整表」的方案（会与现有 SSR 的 `ResponsiveImage`、懒加载、主题标记脱节）。
- 筛选栏本身的静态标记（含全部文案、选项骨架）由 `.astro` SSR 输出，外包一层 `hidden`，脚本初始化成功后再移除——**无 JS 时用户看到的是完整的原始目录**（渐进增强）。

### 4.2 可访问性

- chips 用 `<button aria-pressed>`；每个控件配可见 label（沿用页面的 font-mono 微标签风格）。
- 结果计数容器 `aria-live="polite"`。
- 全部控件键盘可操作；`focus-visible` 样式沿用页面现有的 `color-mix(in srgb, var(--catalog-accent) ...)` 写法。

### 4.3 主题与动效

- 深色为默认；必须补 `:global(html[data-theme='light'])` 浅色覆盖（宿主页面里已有大量先例可抄）。
- `@media (prefers-reduced-motion: reduce)` 下去掉过渡动画。
- 样式以 Tailwind 工具类为主，配合页面现有的 `--catalog-accent` / `--catalog-surface` 变量；微标签统一 `font-mono text-[9px] uppercase tracking-[0.16em~0.2em]` + `text-white/xx` 透明度阶梯，控件底色 `bg-white/[0.02~0.05]`、边框 `border-white/10`。

## 5. 明确禁止

1. 引入任何新依赖或修改 `package.json`。
2. 修改 `src/content/` 下任何内容文件。
3. 修改 `home-catalog.json.ts`、`search-index.json.ts` 等 JSON 端点。
4. 重构 `src/lib/musicCatalog.mjs` 现有导出的签名（可以新增导出）。
5. 触碰工作区里已存在的未提交改动（当前包括 `src/pages/[locale]/albums/[...id].astro`、`src/pages/[locale]/artists/[...id].astro`、`src/pages/[locale]/songs/[...id].astro`、`src/styles/reader.css` 及 `scripts/_debug/` 下未跟踪文件——这是他人进行中的工作，禁止 revert/stash/覆盖）。
6. `git commit` / `git push`（除非用户明确要求）。

## 6. 验收清单

自动化：

- [ ] `pnpm check` 无新增错误。
- [ ] `pnpm test` 相对基线无新增失败。
- [ ] `pnpm build` 成功产出。

手动（`pnpm build && pnpm preview`，艺人 slug 用 `ls src/content/songs/` 自行发现，至少抽 2 位艺人）：

- [ ] 5 个 locale（`/zh/`、`/zh-tw/`、`/zh-hk/`、`/ja/`、`/en/`）的 P1/P2 页面筛选栏文案正确（zh-tw/zh-hk 为自动转换结果）。
- [ ] 关键词搜索简繁互通（如 zh 页面搜「花譜」与「花谱」命中一致）。
- [ ] 分类/类型 chips、年份区间、合作曲开关、四种排序各自正确；排序来回切换后页面结构与初始状态完全一致。
- [ ] 筛选状态写入 query，刷新后还原；「清除筛选」恢复全量。
- [ ] 浅色主题（页面右上角主题切换）下筛选栏无白底残留；375px 宽度无横向溢出；系统开启「减少动态效果」时无动画。
- [ ] 浏览器禁用 JS 后，页面退化为完整原始目录，无报错。
- [ ] 纯键盘（Tab / Enter / Space / 方向键）可完成全部筛选操作。

## 7. 交付物与汇报格式

预期新增/修改：

- 新增 `src/lib/catalogFilter.mjs`（纯逻辑）
- 新增 `src/scripts/catalogFilter.js`（DOM 接线）
- 新增 `tests/catalog-filter.test.mjs`
- 修改 `src/pages/[locale]/songs/artists/[artist].astro`
- 修改 `src/pages/[locale]/albums/artists/[artist].astro`
- （P3 若做）修改 `src/pages/[locale]/songs/index.astro`、`src/pages/[locale]/albums/index.astro`

最终汇报必须包含：改动文件清单（逐文件一句话说明）、第 6 节逐项勾选结果、测试基线对比（改动前后失败数）、遗留问题与取舍说明。

## 8. 环境注意事项（Windows）

- 仓库在 Windows（Git Bash）上开发，保持既有行尾风格，勿做全文件行尾重写。
- `astro` 偶发 `EPERM ... .astro/data-store.json` 文件锁错误：**重试一次即可**，不是你的代码问题。
- `i18n:generate` 先删后建目录，偶发并发竞态导致构建 `ENOENT`：重跑一次构建即可。
- `.git/index` 若出现 0 字节损坏（罕见），按仓库既有恢复流程处理或报告用户，勿自行删库。

## 9. 联网说明

- 本任务**离线可完成**：不装依赖、不查外部 API；仓库内的必读文件足以覆盖全部所需知识。
- 仅当你确需查阅 Astro / Tailwind v4 官方文档时，代理走 `http://127.0.0.1:7897`：
  ```bash
  export HTTP_PROXY=http://127.0.0.1:7897
  export HTTPS_PROXY=http://127.0.0.1:7897
  ```
- 任何情况下，产出代码不得引入运行时网络依赖（静态站点，筛选必须离线可用）。
