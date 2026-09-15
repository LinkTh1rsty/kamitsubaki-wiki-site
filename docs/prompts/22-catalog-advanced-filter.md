# 任务：为现有歌曲 Catalog 实现「高级筛选」（路线图 #22）

## 你的角色

你是一名资深前端工程师，在一个已存在的 Astro 静态站点仓库中工作。本任务为功能实现任务：为现有歌曲 catalog 页面增加纯前端的高级筛选能力。仓库已有完整的构建与测试工具链，你不需要也不允许搭建新工程。

## 仓库与工作目录

- 项目根目录：`F:\kamitsubaki-wiki-site`（Windows 环境，Git Bash shell）
- 技术栈：Astro（static 输出）+ Tailwind CSS v4（`@tailwindcss/vite`）+ TypeScript。**没有 React/Vue 等前端框架**，所有客户端交互均为 `.astro` 组件内的原生 `<script>`（由 Vite 打包，可直接 `import` 项目内 `.mjs` 模块）。
- 包管理器：**pnpm 11.1.1**（严禁使用 npm / yarn；严禁新增任何依赖）。
- 常用命令：
  - `pnpm dev` — 开发服务器（端口 4321；`predev` 会自动跑 i18n 生成脚本）
  - `pnpm build` — 生产构建（输出到 `dist/`）
  - `pnpm test` — 运行全部测试（`node --test tests/*.test.mjs`）
  - `pnpm check` — Astro 类型检查
- 联网说明（重要）：本机处于受限网络环境，**本任务预期完全不需要联网**。如确实需要访问外网（例如查证文档），必须走本地 Clash 代理：
  - Git Bash 临时用法：`HTTPS_PROXY=http://127.0.0.1:7897 HTTP_PROXY=http://127.0.0.1:7897 <命令>`
  - PowerShell：`$env:HTTPS_PROXY="http://127.0.0.1:7897"; $env:HTTP_PROXY="http://127.0.0.1:7897"`
  - 即使联网也不允许安装新依赖。

## i18n 约定

站点有 5 个语言路由：`zh / zh-tw / zh-hk / ja / en`，页面路径为 `/[locale]/...`。页面文案统一通过 `resolveLocaleCopy({ zh: {...}, ja: {...}, en: {...} }, localeCode)` 解析（`src/lib/i18n.mjs`），`zh-tw / zh-hk` 会自动回退到 `zh`。**新增 UI 文案只需提供 zh / ja / en 三份**，写法参照现有页面。

## 现状（已核实，直接采信即可）

### Catalog 页面结构

- `src/pages/[locale]/songs/index.astro`：歌曲 catalog 首页，展示艺人卡片网格，点击进入单艺人 catalog。
- `src/pages/[locale]/songs/artists/[artist].astro`：**单艺人歌曲 catalog 页（本次改造目标）**。页面结构自上而下为：返回链接 → hero（艺人封面/简介/统计）→ `MusicSubnav` → `category-jump` 锚点导航（按分类跳转）→ 若干 `<section class="catalog-category">` 分类区块，每个区块内是歌曲行 `<a class="song-row">` 网格。
- 数据管线：`getCollection('songs')` → `getLocalizedEntries` → `buildArtistSongCatalog(sortedSongs, artistEntries, localeCode)`（`src/lib/musicCatalog.mjs`），产出 `group.categories[].entries[]`。分类 slug 由目录路径解析（`parseSongCatalogPath`），已知标准分类：`originals / covers / genealogy / suites / collaborations / projects`，也存在艺人自定义分类（如 `instrumentals / remixes`）。

### 数据规模与内容模型

- 内容目录：`src/content/songs/<artist>/<category>/<song>/<locale>.md`，全站约 1537 首（zh 口径）、51 位艺人；单人曲库最大约数百首，纯前端筛选无性能压力。
- 歌曲 frontmatter schema（`src/content.config.ts` 的 `songSchema`，**只读，不得修改**）：
  - `title`（string，必有）
  - `artist` / `artistId` / `artistIds[]`
  - `releaseDate`（可选，格式 `YYYY` | `YYYY-MM` | `YYYY-MM-DD`，可能缺失）
  - `album`（可选，收录专辑名）、`composer`（可选）、`lyricist`（可选）
  - `duration`（可选，`MM:SS`）、`code`、`categoryOrder`、`itemOrder`、`image`

### 可直接复用的现有模块

- `src/lib/cjkSearch.mjs` 导出 `foldCjkSearchText(value)`：NFKC + 小写 + 简繁/日文汉字/片假名折叠，专为 CJK 搜索词归一化设计（`SiteSearch.astro` 已在客户端使用，证明可在浏览器侧打包运行）。关键词匹配**必须**对 haystack 与 query 都做 fold 后再比较。
- 向客户端传数据的现有惯例（参考 `src/components/SiteSearch.astro`）：在元素上用 `data-*` 属性携带 `JSON.stringify(...)` 结果，`<script>` 内读取解析。
- 样式惯例：暗色主题优先，亮主题用 `:global(html[data-theme='light']) ...` 覆盖；大量使用 CSS 变量（`--theme-panel-solid`、`--theme-fg-rgb`、`--catalog-accent` 等）；标签类文字用 `font-mono text-[9px]~text-[10px] uppercase tracking-[0.2em] text-white/xx`；交互需处理 `:focus-visible`；动画需包裹 `@media (prefers-reduced-motion: reduce)` 降级。
- 测试惯例：`tests/*.test.mjs` 使用 `node:test` + `node:assert`，针对 `src/lib/` 下的纯逻辑模块测试（参考 `tests/albums.test.mjs` 等任一现有用例的写法）。

## 需求规格

### 范围

- **主目标**：改造 `src/pages/[locale]/songs/artists/[artist].astro`，在 `category-jump` 导航上方（或与其合并）新增「高级筛选」工具栏。
- **不在本期范围**：`/songs` 首页、`/albums` 相关页面、events 页面。不得顺手改动。
- 如抽象得当（筛选核心逻辑为独立 lib），可在总结中说明后续复用到 albums catalog 的路径，但本期不实现。

### 功能

1. **关键词筛选**：单个输入框，匹配歌曲的 `title`、`album`、`composer`、`lyricist`。匹配前用 `foldCjkSearchText` 双向折叠；子串匹配即可。输入做 150ms 左右 debounce。
2. **分类筛选**：chips / checkbox 组，选项为该艺人**实际存在**的分类（即用当前页面 `categories` 数组，文案沿用现有 `category.title`）。默认全选；取消勾选即隐藏对应歌曲。多选之间为「或」关系。
3. **发行年份筛选**：从 `releaseDate` 提取年份（`YYYY-MM-DD` → `YYYY`），生成该艺人实际存在的年份下拉（倒序），另含「全部」与「未知年份」选项（无 `releaseDate` 的歌曲归入后者）。
4. **收录专辑筛选**：下拉列出该艺人歌曲中出现过的全部 `album` 值（去重、按名称排序），另含「全部」。缺失 `album` 的歌曲在选中具体专辑时被过滤掉。
5. **排序**：提供「默认顺序 / 发行日期 新→旧 / 发行日期 旧→新 / 标题 A→Z」四种。默认顺序即构建期 `categories[].entries[]` 的现有顺序（用 `data-*` 下标恢复）。日期排序中缺失日期的排最后；标题排序用 `localeCompare` 并传当前 locale。排序在各分类区块内分别进行（不跨分类重排）。
6. **结果计数与空态**：工具栏区域显示「当前命中 X / 共 Y 首」，用 `aria-live="polite"` 区域播报；当某分类区块内 0 命中时隐藏整个区块（含标题）并同步禁用/隐藏对应 `category-jump` 链接；全部 0 命中时显示空态提示文案。
7. **清除筛选**：一键重置所有控件并恢复完整列表。
8. **URL 同步**：筛选状态（q / 分类集合 / year / album / sort）序列化到 `location.hash`（如 `#q=xxx&cat=originals,covers&year=2023&sort=date-desc`），页面加载时从 hash 还原，便于分享与刷新保留。hash 解析必须防御性（忽略非法值）。

### 技术与体验约束

- **纯前端、渐进增强**：筛选只隐藏/显示/重排已渲染的 DOM，不发起任何网络请求；禁用 JS 时页面必须与现状完全一致（所有控件可用 `hidden` 起步，由脚本启用）。
- **推荐实现方式**（可微调，不接受引入框架）：构建期在每行 `<a class="song-row">` 上输出筛选所需 `data-*` 属性（fold 后的标题/专辑/词曲作者、分类 slug、releaseDate、年份、专辑名、默认序号）；新增一个可复用组件（如 `src/components/SongCatalogFilter.astro`）承载工具栏 UI 与 `<script>` 逻辑；纯函数（年份提取、过滤谓词、排序比较器、hash 编解码）抽到 `src/lib/catalogFilter.mjs` 以便测试。
- 关键词 fold 结果应在构建期算好放入 `data-*`（避免客户端对每行重复计算）；查询词在客户端 fold。
- **i18n**：全部 UI 文案（筛选标签、占位符、全部/未知年份、排序选项、计数、空态、清除按钮）走 `resolveLocaleCopy`，提供 zh / ja / en。
- **主题与无障碍**：暗/亮双主题视觉正常；全部控件键盘可达，`:focus-visible` 样式与页面现有元素一致；控件有正确 `label` / `fieldset` / `legend`；动画遵循 `prefers-reduced-motion`。
- **性能**：每次输入/变更只遍历一次歌曲行做显隐切换；不得使用 `innerHTML` 重绘列表。

### 测试

- 新增 `tests/catalog-filter.test.mjs`，覆盖 `src/lib/catalogFilter.mjs` 的纯逻辑：年份提取（含 `YYYY` / `YYYY-MM` / `YYYY-MM-DD` / 缺失）、过滤谓词（关键词 fold 匹配、分类/年份/专辑组合、缺字段行为）、排序比较器（缺日期排尾）、hash 编解码往返与非法输入容错。
- `pnpm test` 必须全绿（含既有 60+ 用例，不得破坏）。

### 红线（违反即视为失败）

1. 不得修改 `src/content/**` 下任何内容文件；不得修改 `src/content.config.ts` 的 schema。
2. 不得新增 npm 依赖；不得改动 `package.json` / `pnpm-lock.yaml`。
3. 不得改动范围外页面（`/songs` 首页、albums、events、首页组件等）；`MusicSubnav` 等共享组件如需触碰必须先说明理由。
4. 不得破坏现有锚点：`category-jump` 链接与 `#song-category-*` id 保持可用。

## 工作流程要求

1. **先读后写**：动手前通读 `src/pages/[locale]/songs/artists/[artist].astro`、`src/lib/musicCatalog.mjs`、`src/lib/cjkSearch.mjs`、`src/lib/i18n.mjs` 中 `resolveLocaleCopy` 的实现，以及 `src/components/SiteSearch.astro` 的 data-* / script 写法。
2. **最小侵入**：预期改动 = 新增 `SongCatalogFilter.astro`、`catalogFilter.mjs`、`catalog-filter.test.mjs` 三个文件 + 对 `[artist].astro` 的有限修改（引入组件、给歌曲行补 data-*）。如需额外改动先停下来说明。
3. **验证**：依次运行 `pnpm test`、`pnpm check`、`pnpm build`，全部通过后启动 `pnpm dev`，人工核验 `http://localhost:4321/zh/songs/artists/kaf`（曲库最大的艺人）的：关键词（含繁体/日文输入）、分类多选、年份、专辑、排序、hash 分享还原、无 JS 回退。另抽查 `/en/songs/artists/kaf` 与亮主题。
4. **交付总结**：输出变更文件清单（新增/修改）、各项验证命令的结果、以及手动核验清单的勾选情况。

## 验收清单（逐项自查）

- [ ] 四类筛选 + 排序可任意组合，结果正确（抽查花谱曲库中至少 3 组已知歌曲）
- [ ] 繁体中文、日文假名关键词均能命中（fold 生效）
- [ ] 分类区块随筛选正确显隐，jump 链接同步状态
- [ ] hash 可还原完整筛选状态；非法 hash 不报错
- [ ] 禁用 JS 页面与改造前一致
- [ ] zh / ja / en 文案齐全，亮主题正常，键盘可操作
- [ ] `pnpm test` / `pnpm check` / `pnpm build` 全部通过
- [ ] 未触碰红线
