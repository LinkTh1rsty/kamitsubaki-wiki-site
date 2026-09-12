# 缺失资料自动检测开发 Prompt（Mimo-X-Pro / mimo-x-pro-preview 适用）

> 用途：将本文整段作为任务 prompt 投喂给 Mimo-X-Pro，驱动其在 `F:\kamitsubaki-wiki-site` 仓库内完成功能清单第 17 项「缺失资料自动检测」。
> 背景判断：该功能复用 #16 的完整度规则引擎（`src/lib/entryCompleteness.mjs`），叠加跨语言一致性与跨条目引用检查，检测结果以条目页提示条呈现；同一检测 API 后续供 Phase 5 编辑任务大厅消费，因此 issue 结构必须稳定、可枚举。
> 联网：本任务**不要求任何新增依赖**；仅当确需查阅外部文档时，代理走 `http://127.0.0.1:7897`（详见第 9 节）。

---

## 1. 角色

你是一名资深 Astro 前端工程师，在一个已上线的多语言静态 wiki 仓库中独立工作。你的任务是交付一个**可单测的缺失资料检测引擎**，并在歌曲 / 专辑 / 艺人三类条目详情页渲染「待补全提示条」，同时保证仓库现有校验全部通过。你只能修改本 prompt 允许范围内的文件，禁止做任何需求外的重构。开始写代码前，必须先通读第 3.8 节列出的「必读文件」。

## 2. 任务

### 2.1 前置依赖

本任务假设 #16 已交付 `src/lib/entryCompleteness.mjs`（导出 `computeCompleteness` 与规则常量）。动手前先确认该文件存在：

- **存在**：直接复用其 `missing` 结果，不得修改其既有导出签名（可以新增导出）。
- **不存在**：先按 `docs/entry-completeness-prompt.md` 第 2.2 节的最小规格补建该文件（规则引擎 + 默认权重，不做其 UI 部分），并在汇报中说明走了此分支。

### 2.2 范围与分期

| 阶段 | 内容 | 优先级 |
|---|---|---|
| P0 | 新建检测引擎 `src/lib/missingData.mjs` + 单测 | 必做 |
| P0 | 新建提示条组件 `src/components/MissingDataNotice.astro`，挂载到三类条目详情页 | 必做 |
| P1 | 聚合静态 JSON 端点 `src/pages/[locale]/missing-data.json.ts`（供未来任务大厅） | 时间允许再做 |

### 2.3 P0：检测引擎规格（`src/lib/missingData.mjs`）

纯函数、同步、无 `node:fs` / `astro:content` 依赖，可被 `node --test` 直接导入。引擎 import `entryCompleteness.mjs` 的 `computeCompleteness`。

1. **内容索引**：`buildContentIndex({ songs, albums, artists })` → 索引对象，至少包含：
   - `localeSetsByIdPath`：`Map<idPath, Set<locale>>`，idPath = `entry.id` 去掉最后一段 locale（如 `kaf/originals/quiz/zh` → `kaf/originals/quiz`）。三个集合的条目合并统计。
   - `artistKeys`：`Set<string>`，artists 集合全部 `data.translationKey`。
   - `albumTitleIndex`：`Map<string, idPath[]>`，key 为「`artistId` 或 `artist` 名 + 折叠后专辑标题」的组合键；标题折叠用 `src/lib/cjkSearch.mjs` 的 `foldCjkSearchText`。
   - `songIdPaths`：`Set<string>`，songs 集合全部 idPath（专辑 `tracks[].songId` 的取值形态即 idPath，如 `harusaruhi/covers/caffeine`，已核实）。
2. **单条目检测**：`detectEntryIssues({ collection, entry, index, body? })` → `issues` 数组。每个 issue 结构固定为：
   ```js
   { kind: string, severity: 'info' | 'warning', refs?: string[] }
   ```
   `kind` 枚举（命名不得改，Phase 5 将消费）：
   - `missing-fields`（warning）：来自 `computeCompleteness(collection, entry.data).missing`，`refs` 为缺失字段名数组；无缺失则不产生此 issue。
   - `missing-locale`（info）：当前 idPath 在 `zh` / `ja` / `en` 三个**人工维护语言**中缺哪一个，就产生一条对应 issue（`refs: ['ja']` 等）。**`zh-tw`/`zh-hk` 由 `scripts/generate-traditional-chinese.mjs` 自动生成，一律不计入检查**。zh 缺失理论上不可能（zh 是全站 fallback 源），代码按通用逻辑处理即可。
   - `unknown-artist`（warning，仅 songs）：`data.artistId` 及 `data.artistIds[]` 中任一 slug 不在 `index.artistKeys` 中，`refs` 为未识别的 slug 列表。
   - `album-not-linked`（info，仅 songs）：`data.album` 有值，但在 `albumTitleIndex` 中按「同艺人 + 折叠标题」匹配不到专辑条目；`refs: [data.album]`。匹配不到不排除是标题写法差异，所以定为 info。
   - `track-song-missing`（warning，仅 albums）：`data.tracks[]` 中凡有 `songId` 的，`songId` 不在 `index.songIdPaths` 中；`refs` 为缺失的 songId 列表（去重）。
   - `tracks-unlinked`（info，仅 albums）：`tracks` 非空但**全部**没有 `songId`。
   - `thin-body`（info，可选检查）：仅当调用方传入 `body` 字符串时执行——去除空白与 Markdown 标记后正文长度 < 50 字符。未传 `body` 时跳过（不得视为缺失）。
3. **汇总**：`summarizeIssues(issues)` → `{ total, warnings, infos }`。
4. **单测**：新建 `tests/missing-data.test.mjs`，用内存构造的假条目覆盖：三语齐套无 issue、缺 ja/en 各产生一条、zh-tw/zh-hk 不参与、artistId 未识别、album 标题折叠匹配（简繁/大小写差异仍可命中）、songId 缺失与去重、tracks 全未链接、`missing-fields` 的 refs 透传、未传 body 时无 `thin-body`。

### 2.4 P0：提示条组件与页面挂载

1. 新建 `src/components/MissingDataNotice.astro`，props 接收 `{ issues, summary, labels, editHref }`（组件只渲染已本地化文案，不做语言判断）。
2. 展示：severity 图标（纯 CSS/字符，不引图标库）+ 汇总行（如「该条目有 N 项待补全资料」）+ `<details>` 展开的 issue 明细列表 + 「去编辑补充」链接（`editHref`）。**无任何 issue 时不渲染任何 DOM**（调用页用条件渲染）。
3. 挂载位置：详情页**正文列顶部**（正文 `<article>` 之前；无正文的条目挂在主栏区域起始处），三个宿主页面：
   - `src/pages/[locale]/songs/[...id].astro`
   - `src/pages/[locale]/albums/[...id].astro`
   - `src/pages/[locale]/artists/[...id].astro`
4. 各页面 frontmatter 中：`getCollection` 取三个集合 → `buildContentIndex` → `detectEntryIssues`。`body` 入参传 `renderContentEntry(entry)` 返回的 `articleBody`（这些页面已有该调用先例）。
5. `editHref` 复用详情页现有惯例：`/{locale}/contribute/edit?target=${encodeURIComponent(contentSourcePath)}`，其中 `contentSourcePath = src/content/{collection}/{id}/{getEditableLocale(localeCode)}.md`（songs 详情页已有完全相同的写法，照抄）。
6. 若 #16 的 `EntryCompleteness.astro` 已存在：提示条与其**信息同源**（`missing-fields` 即完整度缺失项），样式互相呼应，但仍是独立组件、独立挂载；不要合并两个组件。

### 2.5 P1：聚合 JSON 端点（可选）

新建 `src/pages/[locale]/missing-data.json.ts`（`export const prerender = true`）：构建期遍历三集合，输出全站 issue 清单的瘦身 JSON（每条仅 `idPath`、`collection`、`issues: [{ kind, refs? }]`，不含文案）。体积控制在数百 KB 内；若超出，去掉 `refs` 只留 `kind`。该端点是 Phase 5 任务大厅的数据源，本阶段不建任何消费它的页面。

## 3. 仓库事实（已核实，必须遵守）

### 3.1 技术栈与形态

- Astro（`output` 为静态，页面全部 SSG 预渲染）+ TypeScript（strict）+ Tailwind CSS v4（经 `@tailwindcss/vite`）。
- **纯静态站点，无服务器运行时**。检测 100% 在构建时完成，禁止运行时 fetch、禁止新增依赖。
- 包管理器 pnpm。

### 3.2 关键命令

```bash
pnpm dev      # 本地开发（predev 会先跑 i18n:generate）
pnpm check    # astro check，类型校验
pnpm test     # node --test tests/*.test.mjs（pretest 会先跑 i18n:generate）
pnpm build    # 构建（prebuild 会先跑 i18n:generate）
pnpm preview  # 预览 dist
```

### 3.3 目录与数据模型

内容集合定义在 `src/content.config.ts`：

- **songs**：`title`、`artist`、`artistId`（slug）、`artistIds?`、`composer?`、`lyricist?`、`album?`（**标题字符串**）、`duration?`、`releaseDate?`、`code?`、`categoryTitle?`、`image?`、`lyricsSources?`。
- **albums**：`title`、`artist`、`romanizedTitle?`、`type?`、`label?`、`catalogNumber?`、`trackCount?`、`tracks?`（`songId?` 取值为歌曲 idPath，已核实约 290 个专辑文件使用）、`officialLinks?`、`image?`。
- **artists**：`name`、`romanizedName`、`translationKey`（**与 songs 的 `artistId` slug 对应**，详情页现有代码 `artistEntries.find(a => a.data.translationKey === entry.data.artistId)` 可证）、`contentStatus`、`image` 等。
- **条目 id 形态**：`entry.id = idPath + '/' + locale`，如 `kaf/originals/quiz/zh`；idPath 即跨语言同一条目的天然分组键（同目录下的 `zh.md`/`ja.md`/`en.md`/`zh-tw.md`/`zh-hk.md` 五文件为一组）。
- **正文可得性**：三集合 loader 为 `metadataOnlyGlob`（`retainBody: false`），`getCollection` 条目**无 `body`**；条目详情页通过 `renderContentEntry(entry)`（`src/lib/contentSource.mjs`）获得 `{ html, headings, body }`。因此 `thin-body` 只能在详情页上下文执行，列表/JSON 聚合上下文不传 `body`。
- **路由 fallback**：`buildLocalizedStaticPaths`（`src/lib/staticPaths.mjs`）会为缺失语言的条目用 zh 源合成路由——所以「某语言页面能打开」不代表「该语言有独立文件」；检测必须以 `localeSetsByIdPath` 的真实文件存在性为准，不得以路由存在性为准。

### 3.4 i18n 规则

- 站点 5 个 locale：`zh`（默认）、`zh-tw`、`zh-hk`、`ja`、`en`。
- UI 文案用 `resolveLocaleCopy({ zh, ja, en }, localeCode)`，只提供 zh/ja/en 三份；zh-tw/zh-hk 自动转换。
- `src/content/` 下 zh-tw、zh-hk 文件为自动生成，**禁止手改**；本功能不改动 `src/content/` 任何文件。
- issue 的人类可读文案在页面 copy 对象里按 `kind` 映射（含 `refs` 插值，如字段名、locale 名、songId），`missingData.mjs` 内**不得出现任何自然语言文案**。

### 3.5 组件与样式约定

- 提示条视觉：与站点既有 notice/banner 风格一致（参照 `ContentLicenseNotice.astro`），`border border-white/10 bg-white/[0.03]` 系容器 + font-mono 微标签；warning/info 用不同程度的强调色区分，深浅主题均可读（浅色覆盖写法参照宿主页面 `:global(html[data-theme='light'])` 先例）。
- `@media (prefers-reduced-motion: reduce)` 下无动画；`<details>` 交互无 JS 依赖。

### 3.6 测试基线（重要）

- 动手前先跑一次 `pnpm test` 记录基线（仓库历史上存在若干与本任务无关的预先失败用例）。完成后重跑，**对比基线，只要不出现新失败即为通过**；不要修历史失败。

### 3.7 git 约定

- 当前工作树是干净的（已核实）。动手前仍先 `git status` 确认；若发现他人未提交改动，禁止 revert/stash/覆盖，在汇报中说明。
- 禁止 `git commit` / `git push`（除非用户明确要求）。

### 3.8 必读文件（动手前先读）

1. `src/content.config.ts` — 数据 schema
2. `src/lib/entryCompleteness.mjs` — #16 规则引擎（若已存在）
3. `src/lib/cjkSearch.mjs` — `foldCjkSearchText`
4. `src/lib/staticPaths.mjs` — idPath 拆分与 locale fallback 语义
5. `src/lib/i18n.mjs` — `resolveLocaleCopy` / `getEditableLocale` / `supportedLocales`
6. `src/pages/[locale]/songs/[...id].astro` — `renderContentEntry`、`sourceHref` 构造、copy 对象写法的直接参照
7. `src/pages/[locale]/albums/[...id].astro`、`src/pages/[locale]/artists/[...id].astro` — 另两个宿主页面
8. `src/components/ContentLicenseNotice.astro` — 提示条样式参照
9. `tests/home-music-randomization.test.mjs` — 测试风格参照
10. `package.json` — 命令与依赖

若本 prompt 与仓库实际代码冲突，以仓库实际为准，并在最终汇报中明确指出冲突点。

## 4. 实现约束（架构决定，按此执行）

1. **SSR 即全部**：检测在 `.astro` frontmatter（或 P1 的 `.json.ts` 端点）构建时执行；不新增客户端脚本；组件内不出现 `<script>`。
2. 引擎与 UI 分层：`missingData.mjs` 只产出结构化 issue，文案映射全部在页面 copy 对象；issue `kind` 枚举一旦交付不得重命名（Phase 5 依赖）。
3. 性能：`buildContentIndex` 在每个详情页 frontmatter 各跑一次是可接受的（三集合合计约万级条目，`getCollection` 读内存 store）；不得为它引入构建缓存/全局状态等复杂机制。
4. 提示条优先级：issue 排序 warning 在前、info 在后，同 severity 按 kind 字典序；明细默认折叠。

## 5. 明确禁止

1. 引入任何新依赖或修改 `package.json`。
2. 修改 `src/content/` 下任何内容文件、`src/content.config.ts` 的 schema。
3. 修改 `home-catalog.json.ts`、`search-index.json.ts` 等既有 JSON 端点（P1 是**新增**端点，不算修改）。
4. 修改 `entryCompleteness.mjs` 的既有导出签名；修改 `buildLocalizedStaticPaths` 的行为。
5. 在引擎或组件里硬编码自然语言文案（一律走 `resolveLocaleCopy`）。
6. 把 zh-tw/zh-hk 计入跨语言检查（它们是生成物）。
7. `git commit` / `git push`。

## 6. 验收清单

自动化：

- [ ] `pnpm check` 无新增错误。
- [ ] `pnpm test` 相对基线无新增失败，且 `tests/missing-data.test.mjs` 全部通过。
- [ ] `pnpm build` 成功产出。

手动（`pnpm build && pnpm preview`，至少抽查：1 个三语齐套且字段完整的条目、1 个缺 ja 或 en 的条目、1 个 tracks 含 songId 的专辑）：

- [ ] 完整条目不渲染提示条；有缺失的条目提示条内容与实际 frontmatter / 文件齐套情况一致。
- [ ] 缺 ja/en 的条目在**任意语言版本页面**都能看到对应 `missing-locale` 提示（包括 zh-tw 页面——它的数据是生成的，但检测针对真实文件）。
- [ ] 「去编辑补充」链接指向正确的 `/{locale}/contribute/edit?target=...` 地址。
- [ ] 5 个 locale 文案正确；浅色主题无白底残留；375px 宽度无横向溢出；禁用 JS 后 `<details>` 仍可展开。
- [ ] （P1）`/{locale}/missing-data.json` 可 fetch，结构与 2.5 一致，体积合理。

## 7. 交付物与汇报格式

预期新增/修改：

- 新增 `src/lib/missingData.mjs`
- 新增 `src/components/MissingDataNotice.astro`
- 新增 `tests/missing-data.test.mjs`
- 修改 `src/pages/[locale]/songs/[...id].astro`、`src/pages/[locale]/albums/[...id].astro`、`src/pages/[locale]/artists/[...id].astro`（仅加 import、copy 字段、index 构建与组件挂载）
- （P1 若做）新增 `src/pages/[locale]/missing-data.json.ts`
- （若前置缺失）补建 `src/lib/entryCompleteness.mjs` 并在汇报中注明

最终汇报必须包含：改动文件清单（逐文件一句话说明）、是否走了 2.1 的补建分支、issue kind 最终清单（含与 2.3 的差异及理由）、第 6 节逐项勾选结果、测试基线对比（改动前后失败数）、遗留问题与取舍说明。

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
- 任何情况下，产出代码不得引入运行时网络依赖（静态站点，检测结果在构建时固化）。
