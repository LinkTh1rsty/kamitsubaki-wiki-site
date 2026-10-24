# 任务：把 citiao 清洗数据合并进神椿观测站词条库（字段级合并 · 严禁编造）

你是一名资深数据合并工程师。你面前有一份**已经清洗并比对完成的第三方资料**，以及一个**内容丰富的既有 Astro 词条库**。
你的工作是把前者的字段合并进后者，**保留后者已有的一切**，并且**绝不编造任何内容**。

本任务不是写作、不是翻译、不是补全缺失资料。**你只搬运已经存在的数据。**

---

## 0. 一句话验收标准

> 合并后：既有条目的正文、图片、分类、配色、外链**一字未失**；新数据里明确有的字段**按新数据更新**；新数据里没有的字段**保持原样**；任何来源都没有的信息**保持空缺**，绝不出现"看起来合理但没人写过的内容"。

---

## 1. 环境与路径（Windows + PowerShell）

| 角色 | 路径 | 权限 |
|---|---|---|
| 目标仓库 | `F:\kamitsubaki-wiki-site` | **可写**（仅 `src/content/**`） |
| Schema 定义 | `F:\kamitsubaki-wiki-site\src\content.config.ts` | **只读**，技术最高权威 |
| 新数据（清洗产出） | `E:\PF\citiao_merged_output\01_CLEANSED\` | **只读** |
| 决策索引 | `E:\PF\citiao_merged_output\_parsed\{artist,disc,log}_decisions.json`、`05_MERGE_MANIFEST.json` | **只读** |
| 报告 | `E:\PF\citiao_merged_output\{02_DIFF_REPORT,03_CONFLICT_LOG,04_DEDUPLICATION_LOG,06_CHECKLIST}.md` | **只读** |
| 原始资料库 | `E:\PF\citiao_consolidated\` | **只读** |

命令（工作目录必须是仓库根）：`pnpm test`、`pnpm check`、`pnpm build`。三者都会自动先跑 `pnpm i18n:generate`（生成 zh-tw / zh-hk）。**不得使用 npm / yarn。**

---

## 2. 权威顺序（冲突时按此裁定）

1. `src/content.config.ts` —— 字段是否存在、是否必填、正则形态。**schema 说的算。**
2. `src/content/**` 既有条目 —— 必须保留的内容。
3. `E:\PF\citiao_merged_output\01_CLEANSED\**` —— **字段值的优先来源**。
4. `_parsed\*_decisions.json` —— 决定某条是 MERGE / MODIFY / ADD / SKIP。
5. `02..06` 报告 —— 背景、冲突记录、人工待办。

---

## 3. 铁律（违反任意一条即视为任务失败）

1. **禁止生成任何未经来源给出的内容**：日期、标题、罗马字、简介文案、翻译、歌词、制作人员、网址、图片路径、配色值、关键词、分类名——只要不是"从既有文件里读到的"，就不许写。
2. **禁止翻译**。日语/英语字段缺失时不得自行翻译中文补齐（除非用户在本轮明确授权）。
3. **禁止占位/假数据**：不得复制其它艺人的图片充当新艺人配图，不得写入 0 字节图片，不得写"待补充""TODO""未知"以外的虚构值。
4. **禁止删除或清空既有内容**：不得删字段、不得删正文段落、不得把库内丰富正文替换成清洗骨架。
5. **禁止整文件覆盖**：对既有条目只能做**字段级编辑**。
6. **禁止改动**：`src/content.config.ts`、`package.json`、`scripts/**`、`public/**`、`tests/**`、`E:\PF\**` 下的任何文件。
7. **禁止新建 collection**（术语 glossary 本轮**不落库**，只作为评审清单）。
8. **禁止使用** `E:\PF\citiao_merged_output\_scripts\apply_to_site.py`（原因见 §8）。
9. 遇到任何不确定 → **不动该条 + 写入报告**，绝不猜测。
10. 所有写入必须可追溯：每条变更都要能在"变更日志"里找到 `路径 | 字段 | 旧值 → 新值 | 依据来源`。

---

## 4. 合并语义（这是本任务的核心，务必逐条执行）

### 4.1 已有条目（决策为 MERGE / MODIFY）

对 `zh.md / ja.md / en.md` **分别**处理：

- **frontmatter**：逐字段比对"库内值"与"清洗值"。
  - 清洗数据里**有值**且与库内不同 → **采用清洗值**，并记入变更日志（附理由）。
  - 清洗数据里**没有该字段** → **原样保留库内值**，不动。
  - 清洗数据该字段为**空串 / null** → 视为"没有"，保留库内值。
  - 清洗数据该字段被标记 `UNVERIFIED`、或被判定为截断/乱码（含 `...`、`ã`、`/ DISCOGRAPHY` 这类解析残片）→ **保留库内值**，并列入"待人工核实"。
  - 库内**额外存在**、而 schema 与清洗数据都没有的字段 → 一律保留（例如 `categoryTitle`、`itemOrder`、`code`、`duration`、`image`、`theme`、`seo`、`license`、`officialLinks`、`featuredEntries`）。
- **正文**：**默认一字不改**。除非本任务后续明确要求追加，否则不新增、不删减、不重排、不改标点。
- **图片 / 配色 / 外链**：绝不由新数据覆盖，除非清洗数据给出的值与库内不同且格式合规。

### 4.2 新条目（决策为 ADD）

- 只有**必填字段齐全**、且**每个字段值都能在来源文件中找到**的条目才允许落库。
- 每个条目创建 `zh.md`、`ja.md`、`en.md` 三个文件（若某语言存在必填字段无法满足，见 §5.3，则**不创建该语言文件**）。
- 三语必须共用同一个 `translationKey`。
- 只写 `content.config.ts` 中声明过的字段。清洗数据里多出来的字段（例如 songs/albums/logs 的 `contentStatus`、albums 的 `artistId`）**不要写**——schema 未声明，写了会被丢弃。
- 正文沿用清洗产出中的骨架（`## 简介` + `## 来源`），**但要修正**：`来源` 一节不得出现 `E:\PF\...` 这类本地绝对路径；改为站内相对链接或 https 链接，若两者都无则**删掉该行**（不留伪链接）。
- 可选增强（**默认关闭**）：若原始资料库中该实体的档案里有**现成的中文段落**，可以"原样照抄"进正文并标注 `## 源数据摘录`。**只许逐字复制，不许改写、不许合并句子、不许翻译。** 每条照抄都要在报告中列出原文来源文件。

### 4.3 跳过（SKIP）

决策为 SKIP 的一律不落库。若你发现某条被标为 ADD、但库内已存在同一条目（见 §7.1），**改按 4.1 的合并规则处理，不得覆盖**。

---

## 5. 必填字段与三个特殊场景

先完整读一遍 `src/content.config.ts`。以下是必须记住的要点：

- `artists` 必填：`locale, translationKey, name, romanizedName, statusLabel, status, image`；`contentStatus` 有默认值。
- `projects` 必填：`locale, translationKey, kind, title, description, order`。
- `logs` 必填：`locale, translationKey, date, type, title, order`。
- `songs` 必填：`locale, translationKey, title, artist, artistId`；`artistId` 必须匹配 `^[a-z0-9]+(?:-[a-z0-9]+)*$`；若写 `artistIds`，必须包含 `artistId` 且不得重复。
- `albums` 必填：`locale, translationKey, title, artist`。
- 日期：`^\d{4}(-\d{2}(-\d{2})?)?$`；时长：`^\d{1,2}:\d{2}(:\d{2})?$`；链接：https 或站内 `/` 开头的相对路径。

### 5.1 `artists.image` 缺失（`azsagawa`、`onuma-parsley`）

`image` 是必填。处理顺序：

1. 先查 `F:\kamitsubaki-wiki-site\public\images\artists\<slug>.{png,jpg,jpeg,webp}` 是否真的存在；
2. 存在 → 写该真实路径；
3. 不存在 → **该艺人不落库，其名下全部作品一并暂缓落库**（`azsagawa` 7 首、`onuma-parsley` 11 首），统一写入"待补图片清单"，等用户提供图片后再补。

**绝对禁止**用其它艺人的图片顶替，也禁止写空文件。

### 5.2 `projects` 新厂牌的 `ja/en` 缺 `description`

`phenomenon-record`、`anarchic-record`、`kamitsubaki-creation` 三个厂牌的清洗数据里，`ja.md` / `en.md` 缺必填 `description`（原始资料里只有中文描述）。

- **只落 `zh.md`**，`ja.md` / `en.md` 本轮不创建。
- 把"待补日文/英文厂牌描述"写进报告。
- **不得**用中文顶替、不得自行翻译。

### 5.3 其它"必填但来源没有"的情况

一律遵循同一原则：**宁可不落库，也不填假值**，并在报告中列为"因缺必填字段未落库"。

---

## 6. `logs` 的额外规则

库内现有 4 条 logs 的惯例（请照此对齐形态）：

```
translationKey: "2022-08-24-kaf-fukakai3"   # 日期 + 英文 slug，不是纯日期
date: "2022.08.24"                          # 展示用，点分隔
eventDate: "2022-08-24"                     # schema 正则要求
type: "LIVE"                                # 库内使用 LIVE 等语义值
order: 20
```

清洗产出中的问题必须修正后再落库（见 §7.4、§7.5）。另外：库内 logs 仅 4 条，本轮将新增约 493 条，**务必按年份分批写入并分批校验**（2018–2019 / 2020–2021 / 2022–2023 / 2024 / 2025–2026）。

---

## 7. 执行前必须修正的 7 个已知问题（已实测确认）

### 7.1 两条 ADD 其实库内已有 —— 会导致覆盖丢字段（最高优先级）

| 目标 | 库内现状 | 清洗数据 | 后果 |
|---|---|---|---|
| `src/content/songs/guiano/originals/月` | `releaseDate 2022-11-22`、`duration 03:32`、`code`、`image`、分类字段 | `2022-11-23`、`title「月」`、**无 duration/code/image** | 直接覆盖会丢字段、图片挂掉 |
| `src/content/songs/guiano/originals/風` | `releaseDate 2022-10-20`、`duration 02:59`、`code`、`image` | `2022-10-21`、`title「風」`、**无上述字段** | 同上 |

处理：这两条**按 4.1 合并**，不新建、不覆盖；`releaseDate` 采用清洗值并在报告中**高亮标注供人工复核**；`title` 保留库内写法（不含「」）或按新值更新——二者都要记录；`duration/code/image/分类字段` 一律保留库内值。

### 7.2 新艺人缺 `image`
见 §5.1。

### 7.3 新厂牌 `ja/en` 缺 `description`
见 §5.2。

### 7.4 `logs` 有 4 组 `translationKey` 重复（12 个文件）

| 键 | 冲突文件 |
|---|---|
| `2022-07-17`（纯日期） | ヰ世界情緒『暮れなずむ約束』/ ヰ世界情緒展 |
| `2024-08-08`（纯日期） | 同日两条事件 |
| `2024-12-19`（纯日期） | 同日两条事件 |
| `2024-01-14-花譜-4th-one-man-live-怪歌-で` | 因 `title[:20]` 截断而撞车 |

处理：**同日多事件加序号**（`2024-08-08`、`2024-08-08-2`）或改用完整 slug；**不得 20 字符截断**。目录名与 `translationKey` 应保持一致。

### 7.5 `logs` 有 1 条事件被同 slug 覆盖（494 条 ADD → 493 个目录）

从 `_parsed\log_decisions.json` 找出 `target_path` 重复的那一对事件，给其中一条换一个不冲突的目录名与 `translationKey`，**两条都要落库**，不得静默丢失。

### 7.6 4 条歌曲的 `artistId` 在库内不存在

`src/content/songs/misumi/**` 共 4 条，`misumi` 既不在库内 51 位艺人中，也不在本次 ADD 艺人清单里。
处理：这 4 条**本轮不落库**，写入"因 artistId 无对应艺人未落库"清单。（`azsagawa`、`onuma-parsley` 名下的歌曲随艺人一起走 §5.1 的规则。）

### 7.7 不要照搬来源里明显损坏的 URL

原始资料库中存在拼错的链接，例如 `https://kamitsubaki.jp/artist/ciel.md/`（多余 `.md`）。
规则：外链只写来源中**格式明显正确**的 URL；可疑链接一律不入库并列入报告。

---

## 8. 为什么不能用现成的 `apply_to_site.py`

`E:\PF\citiao_merged_output\_scripts\apply_to_site.py`（676 行）**已被审查出四个致命缺陷，禁止运行**：

1. `ensure_image()` 会复制 `grp.jpg` / `kaf.jpg` 冒充新艺人配图，兜底写 0 字节文件 —— **造假**。
2. 自带 `parse_yaml_loose` / `serialize_fm`，会把既有条目的 frontmatter **整块重写**（所有字符串被加引号），造成格式回归 —— 违反"保留原始内容"。
3. ADD 分支**没有"目标已存在"检查**，会直接覆盖库内条目 —— 即 §7.1 的事故。
4. 不含任何校验步骤（`pnpm test/check/build`）。

你可以读它理解意图，但**必须改用逐字段编辑**的方式落库（用真正能解析 YAML 的库，或精确的文本补丁）。

---

## 9. 执行计划（分批，每批结束必须校验并汇报）

**批 0 · 预检（只读，不动任何文件）**
1. 读 `src/content.config.ts`；2. 读三个 `*_decisions.json` 与 `05_MERGE_MANIFEST.json` 统计条数；
3. 核实 §7 的七项；4. 输出《预检报告》：拟新增/合并/修改/暂缓的条数 + 待人工决策清单。
**先输出预检报告，等用户确认后再进入批 1。**

**批 1 · 艺人 + 厂牌**（2 个艺人、3 个厂牌，最小可验证面）→ 校验 → 汇报
**批 2 · MODIFY 6 条艺人出道日期**（`teresa`、`sekai`、`valis`、`kanzaki-iori`、`guiano`、`kashiimoimi`；按用户既定口径"源优先"采用新值，并逐条记录旧→新）→ 校验 → 汇报
**批 3 · 唱片** `albums` 46 → 校验 → 汇报；`songs` 241 → 校验 → 汇报
**批 4 · 编年** `logs` 493，按年份分 5 小批 → 每小批校验 → 汇报
**批 5 · 收尾**：`pnpm test` → `pnpm check` → `pnpm build`，全程贴出真实输出。

其它要求：
- 建议先 `git switch -c citiao-merge`（或等价分支），**每批一次 commit**，便于回滚；若不便建分支，至少每批后贴 `git diff --stat`。
- 每批写入后立刻跑 `pnpm check`，失败立即修，**不要攒到最后**。
- 单批写入时，先写 `zh.md`；`ja.md`/`en.md` 只写来源中确实存在的内容。

---

## 10. 每批必须产出的"变更日志"

追加到 `F:\kamitsubaki-wiki-site\.local\citiao-merge-log.md`（无则创建；`.local/` 已被 git 忽略）：

```markdown
## 批 N · <范围> · <时间>
### 新增（ADD）
- src/content/artists/solo/azsagawa/{zh,ja,en}.md | translationKey=azsagawa | 来源=01_CLEANSED/artists/solo/azsagawa
### 合并（MERGE）
- src/content/songs/guiano/originals/月/zh.md | releaseDate: 2022-11-22 → 2022-11-23 | 依据=disc_decisions.json#L??
- src/content/songs/guiano/originals/月/zh.md | 保留: duration/code/image/categoryTitle（新数据无此字段或不可信）
### 未落库 / 待人工决策
- src/content/songs/misumi/** ×4 | 原因=库内无 artistId=misumi 的艺人
- artists/solo/azsagawa | 原因=缺必填 image，且 public/images/artists/ 下无真实图片
### 校验
- pnpm check → 通过 / 失败（贴关键输出）
```

同时在最终汇报中给出**未落库清单**与**待人工核实清单**（UNVERIFIED credits 40 条、79 条无法解析 artistId 的唱片、6 条日期冲突、80 条术语）。

---

## 11. 完成定义（DoD）

全部满足才算完成：

- [ ] 既有条目的正文、`image`、`theme`、`seo`、分类字段、外链**无一处丢失**（用 `git diff` 逐条自证）。
- [ ] 所有新增条目通过 `pnpm check`（`astro check` + Zod 校验）。
- [ ] 三语 `translationKey` 一致，且同 collection + 同语言下**无重复**。
- [ ] 所有 `artistId` 都能在库内找到对应艺人（或该艺人同批落库）。
- [ ] 全库无 `E:\PF\...` 之类的本地绝对路径出现在正文里。
- [ ] `pnpm test`、`pnpm build` 通过。
- [ ] 变更日志 + 未落库清单 + 待人工核实清单齐备。
- [ ] 未修改 `E:\PF\**`、`src/content.config.ts`、`scripts/**`、`public/**`、`package.json`。

---

## 12. 最终汇报格式（≤ 60 行中文）

1. 四类决策的实际落库条数（新增 / 合并 / 修改 / 跳过）。
2. 每批的校验命令与结果（真贴输出，不要复述"应该通过"）。
3. 变更日志关键条目（尤其 `guiano/月`、`風` 的日期与字段保留情况）。
4. 未落库清单（含原因）：缺 image 的艺人及其作品、`misumi` 4 条、缺日/英描述的厂牌、缺必填字段的条目。
5. 待人工核实清单：40 条 UNVERIFIED credits、79 条无 artistId 唱片、6 条日期冲突、80 条术语。
6. 下一步建议（但**不要擅自执行**）：补图片、补日英描述、术语是否新建 collection、正文扩充。
