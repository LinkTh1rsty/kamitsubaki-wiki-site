# Medle 旋律猜谜游戏接入方案

> 状态：待评审（P0 合规确认后即可开工）
> 日期：2026-09-11
> 参考项目：[ayuusweetfish/Medle](https://github.com/ayuusweetfish/Medle)（线上版 <https://medle.ayu.land/>）

## 1. 结论

**可以做，且改动面清晰。** Medle 本质上是一个静态客户端小游戏 + 一层很薄的 Deno 服务端（只负责按日期出题、隐藏未来谜题、上报统计）。本站已有完全对口的接入先例（记忆回廊 / kamitsubaki-explorer）：游戏本体放 `public/games/<name>/` 作为自包含静态应用，Astro 侧用薄壳页面 iframe 嵌入，按 locale 出多语言路由。移植工作量集中在"服务端逻辑静态化"与"谜题内容神椿化"两件事上，真正的长期成本是谜题内容制作，而非代码。

## 2. 参考项目分析

### 2.1 玩法

- 每日一题：一段世界名曲旋律，用圆圈按节奏逐个跳出（玩家先只有节奏信息）。
- 玩家填简谱（1–7，支持升降号与高低八度标记），游戏按所填音高用钢琴采样回放。
- Wordle 式三色反馈：绿 = 音与位置都对；黄 = 旋律含此音但位置不对；灰 = 旋律中无此音（或该音数量已用完，两轮匹配避免重复计数）。
- 尝试次数：音符数 N ≥ 10 时 6 次，否则 5 次。
- 揭晓：曲名 / 作者 / 背景介绍 + 原曲录音片段回放 + Wordle 式 emoji 战绩分享。
- 左上角归档页可玩历史谜题。
- 支持 5 种记谱法显示（简谱数字 / 唱名 / 字母 / 罗马数字 / Aikin），对日英用户天然友好。

### 2.2 技术架构

| 层 | 内容 | 体积 |
|---|---|---|
| 服务端 | `server.js`（Deno 1.29）：路由、按日期出题、隐藏未来题（`DEBUG=1` 解锁）、`/analytics` 统计、构建压缩 | 单文件 |
| 客户端 | `page/index.html` + `index.css` + `index.js` + `languages.js`（原生 JS，无框架）+ `clipboard.min.js` | JS 28KB / CSS 17KB |
| 音频 | Salamander Grand Piano 采样 `pf-{MIDI}.ogg/.mp3`（16 个，共约 1.6MB）+ `pop.wav` / `beat.wav` 音效 | ~1.7MB |
| 字体 | VarelaRound / emoji(FxEmojis) / icons(Font Awesome) 三个 woff2 | ~23KB |
| 谜题 | 仓库 `puzzles` 分支，一题一个 YAML（001.yml–099.yml）+ `reveal/NNN.mp3` 原曲揭晓音频 | 每题 <2KB |

服务端端点（静态化改造的对象）：

| 端点 | 行为 | 静态化方案 |
|---|---|---|
| `GET /` | index.html（注入 JS/CSS 与 `headerLang`） | 直接部署静态 HTML，locale 改由 URL 参数注入 |
| `GET /puzzle` | 今日谜题（未解时不含 `tune`，Cookie `solved=1` 后含） | 静态 `puzzles/manifest.json` + `puzzles/NNN.json`，客户端按日期选题（答案可检视，同原版 Wordle 的取舍） |
| `GET /archive` | 历史谜题列表 | manifest.json 即归档数据 |
| `GET /archive/NNN` | 历史谜题完整数据 | 同上 NNN.json |
| `GET /reveal/NNN.mp3` | 原曲录音揭晓音频 | **移除**（版权规避），改为钢琴合成回放 + 站内歌曲条目链接 |
| `POST /analytics` | 战绩统计上报 | 移除（或后续接自建统计，非必需） |

每日切换逻辑：以 GMT+8 子夜为界，编号 = 距 2022-02-22 的天数 + 1。

### 2.3 谜题数据格式（原版）

```yaml
tune:
  - [3, 4]        # [音级, 拍数]；音级 1-7，# 前缀表升号，* 后缀升高八度、** 后缀降低八度
  - [5, 2]
  - [2, 4]
tuneBeatDur: 225        # 每拍毫秒数
tunePitchBase: G4       # 基准音高（简谱 1 = 此音）
metronome: [0, 6]       # [重拍间隔, 细分]
tuneRevealBeatDur: 310  # 揭晓演奏速度
tuneRevealOffset: 3085  # 原曲音频起始偏移（静态版移除 reveal 音频后此字段废弃）
zh-Hans: { title: 雪花, author: 张帅, desc: ... }
en: { title: ..., author: ..., desc: ... }
curator: Ayu
```

### 2.4 许可证

- 源码双许可：**木兰公共许可证（MulanPubL）或 AGPL 二选一**，均为 copyleft。
- 钢琴采样：Salamander Grand Piano（保留署名）；字体：Varela Round / FxEmojis / Font Awesome / Rounded M+（各自许可，保留声明）。
- **选择 MulanPubL**（规避 AGPL 的网络 copyleft 对本站其余代码的潜在影响）。

## 3. 本站接入先例（记忆回廊模式）

现有游戏"记忆回廊"的接入方式，新游戏逐项复用即可：

- 游戏本体：`public/games/kamitsubaki-explorer/`（index.html + game.js + style.css + assets，自包含静态应用）。
- Astro 薄壳：`src/pages/[locale]/games/memory-corridor.astro` —— `getStaticPaths()` 按 `supportedLocales` 出路由，`BaseLayout` + `SiteNav` + 全屏 `<iframe src="/games/kamitsubaki-explorer/index.html?locale=${locale}">`，`allow="autoplay"`（音频游戏必需），页内隐藏 AI 聊天等悬浮组件。
- 入口：`ExperiencePortals.astro` 首页门户卡片、`MemoryCorridorEntryLink.astro` 条目页入口、labs 区块、`src/content/site/*.json` 导航。
- 游戏数据 API 先例：`src/pages/[locale]/game-index.json.ts`（构建期从 content collections 导出游戏用 JSON，静态 `prerender`）。

## 4. 方案对比

| 方案 | 做法 | 优点 | 缺点 | 结论 |
|---|---|---|---|---|
| A. 静态移植（推荐） | 拷贝 Medle 客户端进 `public/games/medle/`，服务端逻辑改为静态 JSON + 客户端按日期选题 | 保留成熟玩法与动效；工作量小；契合现有游戏接入先例 | 需履行 MulanPubL copyleft（游戏部分开源 + 署名）；答案在 JSON 中可被检视 | **推荐** |
| B. 自研重写 | 按相同玩法从零实现 Astro 岛屿 | 无 copyleft 牵连，代码风格统一 | 丢弃已验证的实现；工作量数倍；手感难复刻 | 否 |
| C. iframe 嵌入 medle.ayu.land | 直接嵌第三方站 | 零成本 | 内容（古典/世界名曲）与神椿主题无关；外部可用性依赖；品牌割裂 | 否 |

## 5. 目标架构（方案 A）

### 5.1 新增文件

```
public/games/medle/
  index.html            # 源自 Medle page/index.html，改静态化
  index.css             # 源自 page/index.css（视觉可按站点主题微调，保持原版风味）
  index.js              # 源自 page/index.js，替换数据获取层（见 §6）
  languages.js          # 扩为 zh / zh-tw / zh-hk / ja / en（见 §8）
  clipboard.min.js      # 原样
  fonts/                # 三个 woff2 原样
  samples/              # pf-*.ogg/.mp3 + pop.wav + beat.wav 原样
  puzzles/
    manifest.json       # { epoch, puzzles: [{ id, title(各语言), songId, publishedAt }] }
    001.json ...        # 转换后的谜题（格式见 §7）
  LICENSE               # MulanPubL 全文（COPYING.MulanPubL.md）
  NOTICE                # 原作者署名 ayuusweetfish + 上游链接 + 采样/字体署名
src/pages/[locale]/games/medle.astro   # 薄壳（复制 memory-corridor.astro 模式）
scripts/medle-puzzles-build.mjs        # YAML/源数据 → JSON + manifest 生成
scripts/medle-puzzles-validate.mjs     # 校验（见 §7.3），纳入 pnpm test
tests/medle-puzzles.test.mjs           # 校验脚本单测
puzzles-src/                           # 谜题源文件（YAML，人类编辑），仓库根或 content 下
```

### 5.2 修改文件

| 文件 | 修改 |
|---|---|
| `src/pages/[locale]/games/medle.astro` | 新增薄壳页（5 locale 路由、SiteNav、iframe `?locale=` 传参、隐藏悬浮组件） |
| `src/components/ExperiencePortals.astro` | 增加"旋律观测 / Medle"入口卡片 |
| `src/content/site/{zh,zh-tw,zh-hk,ja,en}.json` | 导航/门户文案（zh-tw/zh-hk 由 opencc 流程生成，仅需维护 zh 源） |
| `src/pages/[locale]/labs/[section].astro` | labs 区块登记（若适用） |
| `package.json` | 新增 `medle:build` / `medle:validate` 脚本；`pretest` 链入校验 |

## 6. 静态化改造点（index.js 数据获取层）

保留游戏逻辑、动效、判定（`check()` 两轮匹配）、记谱法、分享功能原样。仅替换以下 I/O：

1. **取今日谜题**：原版 `GET /puzzle` → 改为
   - `fetch('puzzles/manifest.json')` 得 `{ epoch, puzzles[] }`；
   - 客户端计算 `dayIndex = floor((Date.now() - epoch) / 86400000)`（**GMT+8 对齐**：用 `UTC+8` 午夜为界）；
   - `puzzleId = puzzles[dayIndex % puzzles.length].id`（循环池，见 §9 策略讨论）；
   - `fetch('puzzles/{puzzleId}.json')` 得谜题体。
2. **归档**：原版 `GET /archive` → manifest 中 `publishedAt <= today` 的条目渲染为归档列表；`/{id}?past` 链接改为 `?past={id}` 参数在本页内切换。
3. **已解判定**：原版服务端 Cookie `solved=1` 控制 `tune` 下发 → 静态版 tune 随 JSON 全量下发（可检视，接受），已解状态记 `localStorage["solved:{puzzleId}"]` 用于界面状态与"今日已完成"提示。
4. **移除**：`POST /analytics` 调用、`/reveal/{id}.mp3` 加载（连带 `tuneRevealOffset` 字段废弃）。
5. **语言注入**：原版服务端注入 `headerLang` → 改为读 iframe URL `?locale=` 参数（薄壳页传入），优先级仍为 `localStorage.lang > URL 参数 > navigator.language`。
6. **采样加载**：路径 `/static/samples/...` → 相对路径 `samples/...`；`tunePitchBase` 限定在已发布采样覆盖区间（当前 16 个采样），超出时对旋律整体移调——简谱玩法不受影响（详见 §10 风险表）。
7. **分享文本**：`https://medle.ayu.land/` → `https://kamitsubaki.wiki/{locale}/games/medle`，标题 `Medle #N` 可改为 `旋律观测 #N`（含各语言）。

## 7. 谜题数据格式（神椿扩展）

### 7.1 源文件（YAML，`puzzles-src/NNN.yml`，人类编辑）

在原版字段基础上扩展：

```yaml
id: 1
songId: kaf/xxxxx        # 对应 src/content/songs 条目 id（用于揭晓页链接与本地化标题）
tune:
  - [3, 4]
  - [5, 2]
tuneBeatDur: 225
tunePitchBase: G4
metronome: [0, 6]
tuneRevealBeatDur: 310
officialUrl: https://www.youtube.com/...   # 官方流媒体（揭晓页"听原曲"按钮）
zh-Hans: { title: 曲目名, author: 演唱/作编曲, desc: 一句话背景 }
zh-Hant: { ... }          # 可选，缺省时由 opencc 从 zh-Hans 生成
ja: { title: ..., author: ..., desc: ... }  # 可选，缺省回落 en
en: { title: ..., author: ..., desc: ... }
curator: 署名
```

### 7.2 构建产物（`public/games/medle/puzzles/*.json`，脚本生成，不手改）

- `medle-puzzles-build.mjs`：读取 `puzzles-src/*.yml` → 校验 → 生成 `NNN.json` 与 `manifest.json`。
- 挂接 `prebuild`（与 i18n:generate 同链），保证 `pnpm dev/build` 前自动产出。

### 7.3 校验规则（`medle-puzzles-validate.mjs`，纳入 `pnpm test`）

- `songId` 必须存在于 songs collection（构建期校验，失效即报错）；
- 音级 ∈ 1–7（允许 `#` 前缀、`*`/`**` 后缀）；拍数为正数；
- 音符总数 6–20（玩法体验区间）；
- `tunePitchBase` 落在采样覆盖区间内；
- 必填语言字段齐全（zh-Hans、en）；
- id 连续且唯一。

## 8. i18n 方案

- 游戏内 UI：languages.js 扩为 5 语言；zh-tw / zh-hk 与主站一致，可由 zh 源经 opencc 生成（复用 `scripts/generate-traditional-chinese.mjs` 流程或在 medle 构建脚本内调用 opencc-js）。
- 谜题 desc：至少维护 zh-Hans + en；ja 建议维护（日本用户占比高）；zh-Hant 自动生成。
- 薄壳页 copy 对象照抄 memory-corridor.astro 的 5 locale 模式。

## 9. 每日出题与归档策略

站点为手动部署，无法保证每日有新题入库，两种策略：

| 策略 | 行为 | 取舍 |
|---|---|---|
| **S1 循环池（推荐）** | `dayIndex % pool.length`，每天都有题；manifest 记录每题 publishedAt，归档展示已发布题 | 永远有题可玩；老玩家会遇重复；新题随部署自然加入循环 |
| S2 批次发布 | 每次部署追加一批，题尽显示"等待更新" | 更接近原版"每日新题"仪式感；需要稳定供题，否则开天窗 |

建议 S1 起步，题池 ≥ 60 后评估是否切 S2。

## 10. 风险与权衡

| 风险 | 说明 | 缓解 |
|---|---|---|
| MulanPubL copyleft | 衍生游戏需同许可公开源码 + 署名 | 游戏目录独立 LICENSE/NOTICE；建议将 `public/games/medle/`（含 puzzles-src）以单独公开仓库或 wiki 仓库公开目录形式提供源码；游戏"关于"页注明上游 |
| 答案可检视 | 静态站无法隐藏未来/当日答案（原版 Wordle 同样如此） | 接受；循环池降低"剧透"影响 |
| 神椿曲目旋律版权 | 粉丝 wiki 非商业使用、单乐句简谱、**不提供原曲音频** | 与现有歌词内容同级风险敞口；每题 8–16 音、附官方链接导向正版；不放 reveal mp3 |
| 采样音域限制 | 现成采样仅 16 个音 | tunePitchBase 限定区间内；必要时整体移调（简谱相对音高玩法不受影响）；长期可从 Salamander 补采样 |
| 内容制作瓶颈 | 简谱转写需要乐感，AI 生成需人工校对 | 起步 30 题精选（各艺人代表曲标志性乐句）；后续接 contribute 流程开放投稿 |
| 隐私 | 原版 /analytics 移除后纯本地运行 | localStorage 仅存本地，无需改隐私声明 |

## 11. 内容池建设计划

### 11.1 半自动出题管线（推荐）

设计原则：**agent 起草 + 脚本校验 + 人工抽验**，不做全自动无人值守。各环节自动化程度：

| 环节 | 自动化程度 | 实现方式 |
|---|---|---|
| 选题 | 全自动 | 从 songs collection 按艺人/专辑筛选代表曲 |
| 乐句定位 | 高度自动 | 复用站内歌词时间戳管线（`scripts/lyrics-cache.json` + 歌曲 md 内 `[mm:ss.xx]` 行首标记）：从歌词结构识别副歌首行，直接取起止时间 |
| 元数据 | 全自动 | 从 content collections 生成 title/author/songId/officialUrl；desc 由 LLM 撰写 zh/en/ja，zh-Hant 走 opencc |
| 旋律转写 | 自动起草 | 见 §11.2，需人工终审 |
| 质量评分 | 自动 | 转写结果与原片段音高序列做相关性比对，低于阈值进人工队列 |
| 终审 | 人工 | 约 1 分钟/题，游戏内试听合成效果确认 |

### 11.2 转写技术路线（音频 → 简谱）

输入：合法自备音频 + 起止时间（来自歌词时间戳）；音频仅本地处理，不入库、不上站。

1. 人声分离：Demucs / BS-Roformer（可选但推荐， vocals 转写准确率显著提升）；
2. 音高提取：Spotify Basic Pitch（ONNX 本地推理，模型约 30MB）或 pYIN / CREPE；
3. 调式检测：Krumhansl-Schmuckler 调性分析（librosa）→ 确定 tunePitchBase 与音级映射；
4. 节奏量化：librosa beat tracking 对齐拍点 → 拍数；
5. 输出 draft YAML → `medle:validate` → 自动评分 → 人工试听。

环境约束：Python 工具链与模型全部安装至 F 盘 venv（C 盘余量不足）；依赖与模型下载走 Clash 代理（127.0.0.1:7897）。

### 11.3 备选来源

- 网络既有粉丝简谱采集转换：起步快，但准确性参差、授权灰色，仍需同样的人工校对；可作转写管线的对照参考。
- 纯 LLM 凭记忆写谱：**否决**（旋律数据幻觉不可控）。

### 11.4 推进节奏

- 试点：先 5 题走通全管线，评估自动评分阈值与人工试听通过率，再决定是否扩量；
- 首批 30 题：花谱、理芽、春猿火、异世界情绪、幸祜、VWP 及合作曲的标志性乐句（副歌第一句优先），每题 8–16 音；
- 后续：随新歌发布补题；成熟后在 contribute 区开放投稿（校验脚本即审稿工具）。

## 12. 实施步骤（每步附验证手段）

| 阶段 | 内容 | 验证 |
|---|---|---|
| P0 | 合规确认：确认采用 MulanPubL、确认游戏部分源码公开方式 | 本方案评审通过 |
| P1 | 静态移植：page/* → public/games/medle/，按 §6 改造数据层；本地起静态服务器试玩原版 99 题池（转换 puzzles 分支 YAML 做联调样本） | `pnpm dev` 后 `/games/medle/index.html` 可完整游玩、音频正常 |
| P2 | 谜题管线：编写 build/validate 脚本与单测；制作首批 5–10 道神椿谜题 | `pnpm test` 通过；校验器能拦下坏数据 |
| P3 | 站点接入：薄壳页、ExperiencePortals 入口、导航文案、5 locale 检查 | `/{locale}/games/medle` 五语言路由可用；`pnpm build` 无错 |
| P4 | 神椿化收尾：揭晓页链接歌曲条目与官方流媒体、分享文案本地化、NOTICE/关于页署名 | 揭晓页跳转正确；分享文本 emoji 网格正确 |

工作量估计：P1+P3 约 1 个工作日（机械改造为主）；P2 视首批谜题制作速度；P4 半个工作日。

## 13. 附录：客户端关键事实（摘自上游 index.js）

- 尝试次数：`N >= 10 ? 6 : 5`（N = 旋律音符数）。
- 判定：`check()` 两轮匹配（先标全对，再标错位存在），emoji：⚪ 无 / 🟡 错位 / 🟢 正确。
- 状态持久化：仅设置项（`tip` `first` `sfx` `metronome` `dark` `highcon` `notation` `lang`）存 localStorage 并同步 Cookie；战绩原版只上报服务器、不落盘 → 静态版已解状态新增 `solved:{id}` 键。
- 采样加载：仅加载"可达音"（本曲音域 ± 八度/升降号组合），`pf-{MIDI}.ogg` 失败回退 `.mp3`，全部 decodeAudioData 预载后显示开始按钮。
- 语言：注册表 `window.languages` + `data-t` 属性字典替换；`localStorage.lang` 优先。
- 分享：ClipboardJS；当日题只发站点根 URL，历史题带编号。
