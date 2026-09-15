# 条目完整度评分开发 Prompt（Mimo-X-Pro / mimo-x-pro-preview 适用）

> 用途：将本文整段作为任务 prompt 投喂给 Mimo-X-Pro，驱动其在 `F:\kamitsubaki-wiki-site` 仓库内完成功能清单第 16 项「条目完整度评分」。
> 背景判断：该功能基于现有 frontmatter 数据即可实现，不需要新增任何内容条目或后端能力，属于低成本、收益立现的改进；同时它交付 roadmap Phase 0 的完整度规则引擎（`src/lib/entryCompleteness.mjs`），是后续 #17 缺失检测与 Phase 5 任务大厅的共用依赖。
> 联网：本任务**不要求任何新增依赖**；仅当确需查阅外部文档时，代理走 `http://127.0.0.1:7897`（详见第 9 节）。

---

## 1. 角色

你是一名资深 Astro 前端工程师，在一个已上线的多语言静态 wiki 仓库中独立工作。你的任务是交付一个**可单测的完整度规则引擎**，并在歌曲 / 专辑 / 艺人三类条目详情页展示评分结果，同时保证仓库现有校验全部通过。你只能修改本 prompt 允许范围内的文件，禁止做任何需求外的重构。开始写代码前，必须先通读第 3.8 节列出的「必读文件」。

## 2. 任务

### 2.1 范围与分期

| 阶段 | 内容 | 优先级 |
|---|---|---|
| P0 | 新建规则引擎 `src/lib/entryCompleteness.mjs` + 单测 | 必做 |
| P0 | 新建展示组件 `src/components/EntryCompleteness.astro`，挂载到三类条目详情页 | 必做 |
| P1 | 艺人歌曲/专辑目录页的列表角标 | 时间允许再做，且不得破坏已上线的高级筛选 |

### 2.2 P0：规则引擎规格（`src/lib/entryCompleteness.mjs`）

纯函数、同步、无 `node:fs` / `astro:content` 等环境依赖，可被 `node --test` 直接导入。

1. **规则定义**：按 collection（`songs` / `albums` / `artists`）各定义一组计分规则。schema 必填字段（如 songs 的 `title`/`artist`/`artistId`，artists 的 `name`/`romanizedName`/`image`）**不参与计分**——它们必然存在；计分只针对「schema 可选但对读者有价值」的字段。
2. **规则结构**：每条规则 `{ field, weight, check(value, data) }`。`check` 默认实现为「字段存在且非空」；数组字段（`officialLinks`/`lyricsSources`/`featuredEntries`/`tracks`/`affiliations`/`designCredits`）必须**长度 > 0** 才算得分，空数组视为缺失。
3. **默认规则与权重**（允许微调权重，但需在汇报中说明理由；字段集合不得随意增删）：
   - `songs`：`image` 2 · `releaseDate` 2 · `composer` 2 · `lyricist` 2 · `lyricsSources` 2 · `album` 1 · `duration` 1 · `code` 1 · `categoryTitle` 1
   - `albums`：`image` 2 · `releaseDate` 2 · `tracks` 2 · `type` 1 · `label` 1 · `catalogNumber` 1 · `trackCount` 1 · `description` 1 · `romanizedTitle` 1 · `officialLinks` 1
   - `artists`：`profileTagline` 2 · `officialLinks` 2 · `debutDate` 1 · `meta` 1 · `affiliations` 1 · `designCredits` 1 · `featuredEntries` 1 · `categoryTitle` 1
4. **API**（命名可微调，语义不得变）：
   - `computeCompleteness(collection, data)` → `{ score, missing, earned, total }`：`score` 为 0–100 整数（`Math.round(earned / total * 100)`；`total === 0` 时返回 100）；`missing` 为缺失项数组 `[{ field, weight }]`，按 weight 降序；`earned`/`total` 为权重分子分母。
   - `completenessTier(score)` → `'complete' | 'good' | 'brief' | 'stub'`：≥90 / ≥60 / ≥30 / <30。
   - 特例：artists 的 `contentStatus === 'stub'` 时，`score` 封顶为 29（即强制落入 `stub` 档），`missing` 仍按实际字段计算。
   - 未知 collection 抛 `Error`（信息含 collection 名）。
5. **单测**：新建 `tests/entry-completeness.test.mjs`（`node:test` 风格参照 `tests/home-music-randomization.test.mjs`），至少覆盖：全字段满分、全缺失 0 分、空数组视为缺失、stub 封顶、权重降序、未知 collection 抛错、三档边界值（90/60/30）。

### 2.3 P0：展示组件与页面挂载

1. 新建 `src/components/EntryCompleteness.astro`，props 接收 `{ score, tier, missing, labels }`（`missing` 元素含本地化后的字段显示名，由调用页负责映射）。
2. 展示内容：分数 + 进度条 + 分档标签 + 「缺失字段」摘要（用 `<details>/<summary>` 实现展开，**不需要任何客户端 JS**）。字段显示名须本地化（见 3.5）。
3. 挂载位置（SSR 计算结果直接渲染，无客户端脚本）：详情页侧栏，信息框组件之下、`ContributorRoster` 之上（若侧栏结构与描述不符，以实际 DOM 为准，选择信息框之后的最近位置）：
   - `src/pages/[locale]/songs/[...id].astro`（信息框为 `WikiInfoBox`）
   - `src/pages/[locale]/albums/[...id].astro`（信息框为 `AlbumInfoBox`）
   - `src/pages/[locale]/artists/[...id].astro`（信息框为 `WikiInfoBox`）
4. 三处页面都在 frontmatter 直接调用 `computeCompleteness(collection, entry.data)`——`getCollection` 拿到的条目就是完整 frontmatter 数据，**不需要、也不允许**为评分去读磁盘上的 md 源文件。

### 2.4 P1：列表角标（可选）

在 `src/pages/[locale]/songs/artists/[artist].astro` 与 `src/pages/[locale]/albums/artists/[artist].astro` 的每个条目行内加一个小的完整度圆点/百分比角标（SSR 渲染 `title` 属性承载分数与分档）。**硬性约束**：这两个页面已上线高级筛选（`SongCatalogFilter.astro` / `AlbumCatalogFilter.astro` / `src/scripts/catalogFilter.js`），行 DOM 上的 `data-filter-*` 属性与分组结构是筛选的数据源——角标只能作为行内的新增叶子节点，不得改动任何既有 `data-*` 属性、行标签名或分组包裹结构；完成后必须重跑 `tests/catalog-filter.test.mjs` 确认无回归。

## 3. 仓库事实（已核实，必须遵守）

### 3.1 技术栈与形态

- Astro（`output` 为静态，页面全部 SSG 预渲染）+ TypeScript（strict）+ Tailwind CSS v4（经 `@tailwindcss/vite`）。
- **纯静态站点，无服务器运行时**。评分 100% 在构建时（SSR frontmatter）完成，禁止新增 API 端点、禁止运行时 fetch。
- 包管理器 pnpm，**禁止引入任何新依赖**。

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

- **songs**：必填 `title`/`artist`/`artistId`；可选 `artistIds?`、`composer?`、`lyricist?`、`album?`（专辑**标题字符串**，非 id）、`duration?`（`MM:SS`/`HH:MM:SS`）、`releaseDate?`（`YYYY`/`YYYY-MM`/`YYYY-MM-DD`）、`code?`、`categoryTitle?`、`itemOrder?`、`image?`、`lyricsSources?`（数组）。
- **albums**：必填 `title`/`artist`；可选 `romanizedTitle?`、`type?`、`description?`、`label?`、`catalogNumber?`、`trackCount?`、`duration?`、`releaseDate?`、`image?`、`officialLinks?`、`tracks?`（数组，元素含 `title`/`number?`/`duration?`/`songId?`）。
- **artists**：必填 `name`/`romanizedName`/`statusLabel`/`status`/`image`；另有 `contentStatus`（`'stub' | 'published'`，默认 `published`）；可选 `code?`、`categoryTitle?`、`meta?`、`debutDate?`、`profileTagline?`、`designCredits?`、`affiliations?`、`officialLinks?`、`featuredEntries?`。
- **重要**：songs/albums/artists 三个集合的 loader 是 `metadataOnlyGlob`（`retainBody: false`）——`getCollection` 返回的条目**没有 `body` 字段**（正文在条目页内经 `renderContentEntry(entry)` 按需读取）。完整度评分只基于 frontmatter，不得依赖正文。
- 条目 `entry.id` 形态：`artist/category/slug/{locale}`（如 `kaf/originals/quiz/zh`）。

### 3.4 i18n 规则

- 站点 5 个 locale：`zh`（默认）、`zh-tw`、`zh-hk`、`ja`、`en`。
- 页面内 UI 文案用 `resolveLocaleCopy({ zh, ja, en }, localeCode)`，**只需提供 zh/ja/en 三份**，zh-tw/zh-hk 由该函数自动从 zh 转换。先例见 `src/pages/[locale]/songs/[...id].astro` 的 `articleLabels` 对象。
- `src/content/` 下的 zh-tw、zh-hk 内容文件由 `scripts/generate-traditional-chinese.mjs` 自动生成，**禁止手改**；本功能不应改动 `src/content/` 任何文件。
- 缺失字段的显示名（如「作曲」「歌词来源」「官方链接」）属于 UI 文案，走 `resolveLocaleCopy`；`EntryCompleteness.astro` 组件本身只接收已本地化的字符串，不在组件内做语言判断。

### 3.5 组件与样式约定

- 详情页侧栏现状（以 `songs/[...id].astro` 为参照）：`<aside>` 内依次是 `WikiInfoBox`（albums 页为 `AlbumInfoBox`）与 `ContributorRoster`。
- 深色为默认主题；浅色覆盖写法参照宿主页面现有的 `:global(html[data-theme='light'])` 先例。
- 视觉风格与信息框保持一致：微标签 `font-mono text-[9px] uppercase tracking-[0.2em]` + `text-white/35` 阶梯；容器 `rounded-md border border-white/10 bg-white/[0.035]`；进度条等可用页面既有 CSS 变量（如 `--wiki-accent-color`，详情页已在 `.wiki-theme-shell` 上注入）。
- `@media (prefers-reduced-motion: reduce)` 下不得有动画。

### 3.6 测试基线（重要）

- 动手前先跑一次 `pnpm test` 记录基线（仓库历史上存在若干与本任务无关的预先失败用例）。完成后重跑，**对比基线，只要不出现新失败即为通过**；不要修历史失败。

### 3.7 git 约定

- 当前工作树是干净的（已核实）。动手前仍先 `git status` 确认；若发现他人未提交改动，禁止 revert/stash/覆盖，在汇报中说明。
- 禁止 `git commit` / `git push`（除非用户明确要求）。

### 3.8 必读文件（动手前先读）

1. `src/content.config.ts` — 数据 schema（字段必填/可选的唯一权威来源）
2. `src/lib/i18n.mjs` — `resolveLocaleCopy` / `supportedLocales` / `defaultLocale`
3. `src/components/WikiInfoBox.astro` — 侧栏信息框样式参照
4. `src/components/AlbumInfoBox.astro` — 专辑信息框样式参照
5. `src/pages/[locale]/songs/[...id].astro` — 侧栏挂载点参照（含 copy 对象写法）
6. `src/pages/[locale]/albums/[...id].astro`、`src/pages/[locale]/artists/[...id].astro` — 另两个宿主页面
7. `tests/home-music-randomization.test.mjs` — 测试风格参照
8. `package.json` — 命令与依赖
9. （仅 P1）`src/components/SongCatalogFilter.astro`、`src/scripts/catalogFilter.js`、`tests/catalog-filter.test.mjs` — 列表角标的共存约束

若本 prompt 与仓库实际代码冲突，以仓库实际为准，并在最终汇报中明确指出冲突点。

## 4. 实现约束（架构决定，按此执行）

1. **SSR 即全部**：评分在 `.astro` frontmatter 计算并直接渲染为静态 HTML；不新增任何 `src/scripts/*.js` 客户端脚本；组件内不出现 `<script>`。
2. 引擎只导出纯函数与规则常量；规则常量需导出（如 `COMPLETENESS_RULES`），供 #17 缺失检测与测试复用。
3. 分档配色用语义化区分（如 complete/good/brief/stub 四档），深浅色主题均需可读；禁止硬编码与页面风格冲突的鲜亮底色。
4. 无 JS 时页面必须完整可用（本设计天然满足）；`<details>` 展开交互在禁用 JS 时同样可用。

## 5. 明确禁止

1. 引入任何新依赖或修改 `package.json`。
2. 修改 `src/content/` 下任何内容文件、`src/content.config.ts` 的 schema。
3. 修改 `home-catalog.json.ts`、`search-index.json.ts` 等既有 JSON 端点。
4. 改动 `catalogFilter.mjs` / `catalogFilter.js` / `SongCatalogFilter.astro` / `AlbumCatalogFilter.astro` 的既有行为（P1 只允许加角标叶子节点）。
5. 在组件或脚本里硬编码自然语言文案（一律走 `resolveLocaleCopy`）。
6. `git commit` / `git push`。

## 6. 验收清单

自动化：

- [ ] `pnpm check` 无新增错误。
- [ ] `pnpm test` 相对基线无新增失败，且 `tests/entry-completeness.test.mjs` 全部通过。
- [ ] `pnpm build` 成功产出。

手动（`pnpm build && pnpm preview`，抽查至少 2 个完整条目 + 1 个字段稀疏条目；艺人 slug 用 `ls src/content/songs/` 自行发现）：

- [ ] 三类详情页（songs/albums/artists）侧栏出现完整度面板，分数、分档、缺失字段摘要与实际 frontmatter 一致。
- [ ] 5 个 locale 下面板文案正确（zh-tw/zh-hk 为自动转换结果）。
- [ ] `contentStatus: stub` 的艺人条目被强制压到 stub 档。
- [ ] 浅色主题下面板无白底残留、对比度可读；375px 宽度无横向溢出。
- [ ] 浏览器禁用 JS 后面板仍完整可见、`<details>` 可展开。
- [ ] （P1）目录页角标不影响筛选：关键词/分类/年份/排序行为与角标引入前完全一致。

## 7. 交付物与汇报格式

预期新增/修改：

- 新增 `src/lib/entryCompleteness.mjs`
- 新增 `src/components/EntryCompleteness.astro`
- 新增 `tests/entry-completeness.test.mjs`
- 修改 `src/pages/[locale]/songs/[...id].astro`、`src/pages/[locale]/albums/[...id].astro`、`src/pages/[locale]/artists/[...id].astro`（仅加 import、copy 字段与组件挂载）
- （P1 若做）修改两个目录页 `.astro`

最终汇报必须包含：改动文件清单（逐文件一句话说明）、规则权重最终表（含与 2.2 默认值的差异及理由）、第 6 节逐项勾选结果、测试基线对比（改动前后失败数）、遗留问题与取舍说明。

## 8. 环境注意事项（Windows）

- 仓库在 Windows（Git Bash）上开发，保持既有行尾风格，勿做全文件行尾重写。
- `astro` 偶发 `EPERM ... .astro/data-store.json` 文件锁错误：**重试一次即可**，不是你的代码问题。
- `i18n:generate` 先删后建目录，偶发并发竞态导致构建 `ENOENT`：重跑一次构建即可。
- `.git/index` 若出现 0 字节损坏（罕见），按仓库既有恢复流程处理或报告用户，勿自行删库。

## 9. 联网说明

- 本任务**离线可完成**：不装依赖、不查外部 API；仓库内的必读文件足以覆盖全部所需知识。
- 仅当你确需查阅 Astro / Tailwind v4 官方文档时，可使用代理 `http://127.0.0.1:7897` 联网：
  ```bash
  export HTTP_PROXY=http://127.0.0.1:7897
  export HTTPS_PROXY=http://127.0.0.1:7897
  ```
- 任何情况下，产出代码不得引入运行时网络依赖（静态站点，评分结果在构建时固化）。
