# 纯前端功能 Roadmap

> 范围：仅动本仓库（Astro 静态站 + 构建时 JSON + localStorage），不扩 `api.kamitsubaki.wiki`。
> 背景判断见对话与 [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)；高级筛选详规见 [advanced-filter-prompt.md](./advanced-filter-prompt.md)。
> 50 项功能中，本 roadmap 覆盖 **A 约 20 + B 约 12**（约 32 项可在无新后端前提下推进）。

---

## 0. 原则

1. **数据已在 frontmatter / catalog 里的，优先做展示与索引，不先扩 schema。**
2. **个人态一律 localStorage**，模式复用 `src/lib/personalLibrary.mjs`；登录云同步是后端迭代，本 roadmap 不阻塞。
3. **构建时可生成的索引**（反查、完整度、更新时间）走 `src/pages/[locale]/*.json.ts` 或 `src/lib/*` 聚合，前端只消费。
4. **不把 OAuth / 审核后台 / 云端草稿 / 真·网页直提 PR** 做进本阶段（见 §6 Deferred）。
5. 每个 Phase 结束必须过：`pnpm test` · `pnpm check` · `pnpm build`。

---

## 1. 总览

```text
Phase 0  数据地基          1 周   索引 JSON + 质量规则引擎
Phase 1  发现与筛选        1–2 周  22 高级筛选 / 16 完整度 / 17 缺失检测
Phase 2  音乐深挖          1–2 周  23/24 Credits / 30 Discography / 29 我听过 / 19 相关 / 28 关系图
Phase 3  个人空间          1–2 周  7 历史 / 9 关注 / 6+1 Dashboard / 10 徽章
Phase 4  版本与溯源        1 周    14/15/12/13/11
Phase 5  编辑辅助 MVP      1–2 周  45/46/41-Prefix/48 只读任务厅
Phase 6  歌词工具          1–2 周  35/36/40/33/34/31/32（37–39 视内容）
```

推荐执行顺序：**0 → 1 → 2 → 3 → 4 → 5 → 6**。  
若只抢两周：做满 **Phase 0 + 1**，再做 **29 + 30**（个人完成度闭环）。

---

## 2. Phase 0 — 数据地基（所有后续 Phase 的依赖）

| 产出 | 落点 | 说明 |
|------|------|------|
| 统一目录索引 | 新建 `src/lib/catalogIndex.mjs`；扩 `home-catalog.json.ts` 或新建 `catalog-index.json.ts` | 输出 songs/albums/artists 的精简记录：id、path、title、artist(s)、composer、lyricist、album、releaseDate、duration、type、image、counts |
| 完整度规则 | 新建 `src/lib/entryCompleteness.mjs` | 按 collection 定义 required/recommended 字段与权重，供 16/17/48 共用 |
| 个人态存储壳 | 扩 `src/lib/personalLibrary.mjs` 或新建 `src/lib/personalState.mjs` | 统一 versioned key：history / following / heard / badges / drafts 旁路 |
| 测试 | `tests/catalogIndex.test.mjs`、`tests/entryCompleteness.test.mjs` | 纯函数单测 |

**验收：** 构建产物里有一份可 fetch 的 `/{locale}/catalog-index.json`；完整度函数对现有 content 跑出稳定分数。

---

## 3. Phase 1 — 发现与筛选（对应 22 · 16 · 17）

### 3.1 #22 高级歌曲筛选（P0 最高优先）

| 项 | 内容 |
|----|------|
| 详规 | 已有 [advanced-filter-prompt.md](./advanced-filter-prompt.md) |
| P1 页面 | `src/pages/[locale]/songs/artists/[artist].astro` |
| P2 页面 | `src/pages/[locale]/albums/artists/[artist].astro` |
| P3 页面 | `src/pages/[locale]/songs/index.astro` · `albums/index.astro`（名称过滤） |
| 共用模块 | 新建 `src/lib/catalogFilter.mjs` + `src/scripts/catalogFilter.js` |
| 复用 | `src/lib/cjkSearch.mjs`（`foldCjkSearchText`）；现有 song-row DOM 结构 |
| 不改 | 内容 schema；无新依赖 |

### 3.2 #16 条目完整度评分

| 项 | 内容 |
|----|------|
| 详规 | 已有 [entry-completeness-prompt.md](./entry-completeness-prompt.md) |
| 规则 | `src/lib/entryCompleteness.mjs`（Phase 0） |
| UI | 条目页 info box 或列表角标：`Component` / `WikiInfoBox.astro` / 列表卡片 |
| 展示 | 分数 + 缺失字段摘要；深色浅色跟随全局 token |

### 3.3 #17 缺失资料自动检测

| 项 | 内容 |
|----|------|
| 详规 | 已有 [missing-data-detection-prompt.md](./missing-data-detection-prompt.md) |
| 规则源 | 同上 completeness；额外「跨语言一致性」检查（translationKey、三语齐套可后置） |
| 消费者 | 条目页提示条；Phase 5 任务大厅 |
| 落点 | `src/lib/entryCompleteness.mjs` + 页面内嵌 script 或 `src/scripts/completenessBadge.js` |

**Phase 1 验收：** 艺人歌曲目录可按关键词/分类/年份/合作曲/排序筛选并可分享 URL；任意列表或详情能看到完整度与缺失项。

---

## 4. Phase 2 — 音乐深挖（对应 23 · 24 · 29 · 30 · 19 · 28 · 27）

| # | 功能 | 落点 | 说明 |
|---|------|------|------|
| 23 | 作词作曲者数据库 | 构建：`catalogIndex` 反查；页面：新建 `src/pages/[locale]/credits/index.astro` + `[...person].astro` | 从 songs 的 `composer`/`lyricist` 字符串聚合成人物页（同名合并，展示曲目列表） |
| 24 | Credits 反向索引 | 同 23 一份数据 | 人物 → 歌曲；歌曲 → 人物双向 |
| 29 | 我听过标记 | `src/lib/personalLibrary.mjs` item 扩展 `heardAt` 或独立 `kamitsubaki-heard-v1` | 列表/详情 toggle；Dashboard 聚合 |
| 30 | Discography 完成度 | 新建 `src/lib/discographyProgress.mjs` + `src/scripts/discographyProgress.js` | 专辑 tracks（`songId`）× 已听/已收藏/站内有条目；专辑页 + Dashboard |
| 19 | 相关推荐 | 新建 `src/lib/relatedEntries.mjs`；挂详情页底部 | 规则：同 artist → 同 album → 同分类邻近；读 catalogIndex |
| 28 | 歌曲关系图 | `src/scripts/songGraph.js` + SVG；数据来自 catalogIndex 的 artist/album/credits 边 | 可先做艺人页「共作网络」小图，再做全站 |
| 27 | 歌曲发行时间线 | `src/scripts/releaseTimeline.js` 或 credits 页时间轴 | 仅用 `releaseDate`；无需新字段 |

**Phase 2 验收：** 从任一曲可进作曲者页；专辑页显示完成度；详情有相关推荐；「我听过」跨页保持。

---

## 5. Phase 3 — 个人空间（对应 7 · 9 · 6 · 1 · 10 · 21）

复用模式：`personalLibrary` + `BroadcastChannel('kamitsubaki-account')`（同步策略后置）。

| # | 功能 | 存储 key（建议） | 落点 |
|---|------|------------------|------|
| 7 | 阅读历史 | `kamitsubaki-history-v1` | 新建 `src/lib/readHistory.mjs` + `src/scripts/readHistory.js`；条目页 layout 挂载 |
| 9 | 关注艺人 | `kamitsubaki-following-v1` | 艺人页 Follow 按钮；Dashboard 列表 |
| 21 | 阅读进度 | `kamitsubaki-progress-v1:{path}` | 扩 `src/lib/readerEnhancements.mjs` 或旁路 script |
| 10 | 本地徽章 | `kamitsubaki-badges-v1` | 新建 `src/lib/badgeRules.mjs`：听满 N 曲、读完分类、编辑导出次数…由 history/heard/library 触发 |
| 6 | 我的空间 Dashboard | 聚合上述 | 扩 `src/pages/[locale]/account.astro` 游客区块，或新建 `src/pages/[locale]/me.astro` |
| 1 | 个人主页 | 同 Dashboard | **游客本地版**；已登录 profile 已有 API，不在此 Phase 扩云 |

**UI 落点：** `AccountChrome.astro` / `personalLibrary.js` / 新建 `src/scripts/personalDashboard.js`。

**Phase 3 验收：** 未登录用户有完整「我的空间」；数据可导出 JSON；与收藏库同风格交互。

---

## 6. Phase 4 — 版本与溯源（对应 14 · 15 · 12 · 13 · 11）

| # | 功能 | 策略 | 落点 |
|---|------|------|------|
| 14 | 最后更新时间 | **优先构建时**：从 git log 或 mtime 注入；避免每页打 GitHub API | 扩 `src/lib/metadata.mjs` 或 layout footer；可选 `meta` |
| 15 | 最近贡献者 | 已有 `pnpm contributors:sync` + `src/data/manualContributors.json` + `ContributorRoster.astro` | 增强：条目级 contributors（若 git 可解析）或仅站点级 |
| 12 | 版本历史 | **MVP**：条目页链到 GitHub commits path；**增强**：构建时快照最近 N 次 message 进 JSON | 新建 `src/pages/[locale]/entry-history/[...path].json.ts` 或前端 `src/scripts/entryHistory.js` 调 `api.github.com/repos/.../commits?path=`（注意配额） |
| 13 | Diff 对比 | 在 12 基础上：选两个 commit → 拉 raw blob → 前端 diff（可用轻量自研 line diff，避免重依赖） | `src/scripts/entryDiff.js` |
| 11 | 最近更新页 | 汇总 11：按日期倒序的变更列表 | 新建 `src/pages/[locale]/recent.astro`；数据来自构建时 changelog 或 logs collection 扩展 |

**约束：** GitHub REST 公开可匿名但有速率限制；生产建议 **build 时固化**，运行时只读静态 JSON。

**Phase 4 验收：** 任意条目可见「最后更新 / 打开仓库历史 / 两版本对比」；`/recent` 可用。

---

## 7. Phase 5 — 编辑辅助 MVP（对应 45 · 46 · 41-prefix · 48 · 44 已有）

已有能力（不要重做）：

- 可视化编辑 + 自动保存：`src/scripts/visualEditor.js`、`src/lib/visualEditor.mjs`
- 源码回填：`src/lib/editorSource.mjs` + `editor-source` 路由

| # | 功能 | 可交付形态（仍纯前端） | 落点 |
|---|------|------------------------|------|
| 45 | 表单式新建词条 | 扩展 visual editor 的 `newDraft` 向导；**导出 .md 下载** 或 **生成 GitHub「新建文件」URL** | `visualEditor.mjs` fields；editor 页 |
| 46 | 来源引用管理器 | 客户端引用库（title/url/checkedAt）；写入 lyricsSources / 正文链接列表；导出 frontmatter 片段 | 新建 `src/lib/citationStore.mjs` + editor 侧栏 |
| 41 | 网页内提交（Prefix） | **不做 token 提交**；做：①下载三语 md ②复制 PR body 模板 ③跳转 `github.com/.../new/main?filename=...&value=...`（value 有长度限制，超长则下载） | `src/scripts/editorExport.js` |
| 48 | 编辑任务大厅（只读） | 由 Phase 1 完整度引擎生成：按缺失字段聚合「待补任务」列表，支持按艺人/类型过滤；**无认领状态** | 新建 `src/pages/[locale]/tasks.astro` + `src/lib/taskBoard.mjs` |

**Phase 5 验收：** 新贡献者不装环境也能「填表 → 拿到可 PR 的文件/链接」；任务厅能指出全站最缺什么。

---

## 8. Phase 6 — 歌词与小游戏（对应 31–36 · 40；37–39 视内容）

| # | 功能 | 依赖 | 落点 |
|---|------|------|------|
| 35 | 假名/罗马音切换 | 已有 kuroshiro/wanakana + practice | 并入 `lyricsPractice.js` / reader lyrics controls |
| 36 | 歌词生词本 | localStorage | 新建 `src/lib/lyricsVocab.mjs`；歌词点选加入生词 |
| 40 | 时间轴制作器 | 无 | 新建 `src/pages/[locale]/tools/timeline.astro` + `src/scripts/timelineBuilder.js`；导出 LRC/JSON |
| 33 | AB 循环 | 有 LRC/时间轴 + 可控音源（iframe 多数不可 seek） | 有原生 audio/自托管时做；否则仅练习模式模拟 |
| 34 | 点词跳转 | 同 33 | 同 33 |
| 31 | 猜歌 | 元数据即可 | 扩 `src/pages/[locale]/games/`；复用 `game-index.json.ts` |
| 32 | 封面猜歌 | `image` 字段 | 同上 |
| 37–39 | 注释/多版本译文/Studio-Live 差 | **内容字段未齐则不做 UI** | 先在 schema 设计讨论，不在本 roadmap 强推 |

**Phase 6 验收：** 歌词页有罗马音切换与生词本；games 下至少一个元数据猜歌；时间轴工具可导出。

---

## 9. 功能 ↔ Phase 对照表（50 项）

| # | 功能 | Phase | 纯前端？ |
|---|------|-------|----------|
| 1 | 个人主页 | 3（本地） | 本地 A / 云 C |
| 2 | 多平台绑定 | — | C |
| 3 | Discord 登录 | — | D |
| 4 | LINE 登录 | — | D |
| 5 | 昵称头像 | 3（本地） | 本地 A / 云 C |
| 6 | 我的空间 | 3 | A |
| 7 | 阅读历史 | 3 | A |
| 8 | 收藏云同步 | — | C（已有半套） |
| 9 | 关注艺人 | 3 | A |
| 10 | 徽章 | 3 | A |
| 11 | 最近更新页 | 4 | A/B |
| 12 | 版本历史 | 4 | A/B |
| 13 | Diff | 4 | A/B |
| 14 | 最后更新时间 | 4 | A/B |
| 15 | 最近贡献者 | 4 | A/B |
| 16 | 完整度评分 | 1 | A |
| 17 | 缺失检测 | 1 | A |
| 18 | 随机词条 | 已有 / 可挂 3 | A |
| 19 | 相关推荐 | 2 | A |
| 20 | 快速摘要 | 1–2 | A/B |
| 21 | 阅读进度 | 3 | A |
| 22 | 高级筛选 | 1 | A |
| 23 | 作曲者库 | 2 | A/B |
| 24 | Credits 反查 | 2 | A/B |
| 25 | 歌曲版本树 | — | B（需内容字段） |
| 26 | 专辑版本对比 | — | B（需内容字段） |
| 27 | 发行历史 | 2/4 | A/B |
| 28 | 关系图 | 2 | A |
| 29 | 我听过 | 2 | A |
| 30 | Discography 完成度 | 2 | A |
| 31 | 猜歌 | 6 | A |
| 32 | 封面猜歌 | 6 | A |
| 33 | AB 循环 | 6 | A* |
| 34 | 点词跳转 | 6 | A* |
| 35 | 假名罗马音 | 6 | A |
| 36 | 生词本 | 6 | A |
| 37 | 逐句注释 | 6 后置 | B |
| 38 | 多版本翻译 | 6 后置 | B |
| 39 | Studio/Live 差 | 6 后置 | B |
| 40 | 时间轴制作器 | 6 | A |
| 41 | 网页提交 | 5 Prefix | Prefix A / 完整 C |
| 42 | 审核后台 | — | D |
| 43 | 云端草稿 | — | C |
| 44 | 自动保存 | 已有 | A |
| 45 | 表单新建 | 5 | A/B |
| 46 | 引用管理 | 5 | A |
| 47 | 失效链接检测 | 构建脚本 | B（浏览器 CORS 受限） |
| 48 | 任务大厅 | 1+5 | 列表 A / 认领 C |
| 49 | 全站统计 | 0/4 | A/B |
| 50 | 公共 API | 已有静态 JSON | 静态 B / 真 API D |

\*33/34 受「页面嵌入播放器能否 seek」限制。

---

## 10. Deferred（不要排进纯前端迭代）

| 项 | 原因 | 前置 |
|----|------|------|
| 2/3/4 OAuth 与绑定 | 必须后端身份与回调 | account API 扩展 |
| 8 云同步完整体验 | 已有基础，扩展示即可 | 后端 library  revision 策略 |
| 41 完整版网页直提 PR | 浏览器不能安全持有 write token | GitHub App / 后端 proxy |
| 42 审核后台 | 权限、队列、审计 | 独立服务 |
| 43 云端草稿 | 需账号存储 | account API |
| 48 认领/完成状态 | 需多用户一致状态 | 后端或 GitHub Issues 集成 |
| 25/26 版本树对比 | 缺 `versions` 等内容模型 | 内容 schema RFC |
| 37–39 注释与多版本歌词 | 缺结构化歌词版本 | 内容模型 + 可能的版权审慎 |

---

## 11. 建议里程碑

| 里程碑 | 包含 | 可对外讲的成果 |
|--------|------|----------------|
| **M1（约 2 周）** | Phase 0 + 1 | 「目录能筛、缺口可见」 |
| **M2（+2 周）** | Phase 2 + 29/30 | 「听过的歌、整张专辑完成度、作曲者页」 |
| **M3（+2 周）** | Phase 3 | 「本地我的空间」 |
| **M4（+1 周）** | Phase 4 | 「条目可溯源、全站最近更新」 |
| **M5（+1–2 周）** | Phase 5 | 「不装环境也能改词条、任务厅」 |
| **M6（弹性）** | Phase 6 | 「歌词工具与小游戏」 |

---

## 12. 每个 PR 的技术约束

1. 只改允许文件；不做无关重构。  
2. 新逻辑优先放 `src/lib/*.mjs`（可测）+ `src/scripts/*.js`（挂载）。  
3. 文案进 `src/content/site/` 或页面 copy 数据，不硬编码多语种长句进组件。  
4. 新静态 JSON 路由 `prerender = true`，注意体积（索引要瘦身）。  
5. 个人数据 key 必须带 `version` 与迁移策略（参考 library v1）。  
6. 完成后本地跑：`pnpm test && pnpm check && pnpm build`。

---

## 13. 与你原 top10 的映射

原推荐：**41、42、48、6、1、12、17、22、23、30**

| 原序 | 建议执行位置 |
|------|----------------|
| 17、22 | **M1 Phase 1** |
| 23、30 | **M2 Phase 2** |
| 6、1 | **M3 Phase 3** |
| 12 | **M4 Phase 4** |
| 48（只读） | **M5 Phase 5**（列表已在 M1 有数据） |
| 41 Prefix | **M5 Phase 5** |
| 42 | **Deferred** |
