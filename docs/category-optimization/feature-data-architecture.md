# KAMITSUBAKI FAN WIKI 功能型数据集架构设计规范 (Feature Data Architecture)

> **版本**：v1.0.0 (Master Feature Specification)  
> **状态**：APPROVED / IMPLEMENTATION BASELINE  
> **文档性质**：功能型数据集架构基准与开发实施指南（非实施代码）  
> **归档位置**：`docs/category-optimization/feature-data-architecture.md`  
> **适用范围**：`kamitsubaki-wiki-site` 全景时间轴 (Chronicle) 与 设定资料图库 (Reference Gallery)  
> **冻结声明**：Architecture frozen at this version. Future breaking changes require a new RFC/version.  
> **事实维护说明**：架构设计冻结，但百科事实数据仍持续维护、更新与纠错 (Architecture is frozen; factual catalog content remains continuously maintainable and correctable)。

---

## 目录
- [一、 功能型数据 (Feature Data) 的定位与边界](#一-功能型数据-feature-data-的定位与边界)
- [二、 全景时间轴 (Chronicle) 数据架构](#二-全景时间轴-chronicle-数据架构)
  - [2.1 目录组织与存储策略](#21-目录组织与存储策略)
  - [2.2 Timeline Event 字段规范表](#22-timeline-event-字段规范表)
  - [2.3 历史叙事轨道注册表 (Timeline Track Registry) 与交汇点 (Convergence Point)](#23-历史叙事轨道注册表-timeline-track-registry-与交汇点-convergence-point)
  - [2.4 事件类型注册表 (Event Type Registry)](#24-事件类型注册表-event-type-registry)
  - [2.5 历史纪元注册表 (Era Registry) 与日期自动化推导](#25-历史纪元注册表-era-registry-与日期自动化推导)
  - [2.6 日期精度与时间区间规范](#26-日期精度与时间区间规范)
  - [2.7 多语言维护与自动繁简生成机制](#27-多语言维护与自动繁简生成机制)
  - [2.8 时间轴与百科词条的双向穿梭联动 (Cross-Entity Linking)](#28-时间轴与百科词条的双向穿梭联动-cross-entity-linking)
  - [2.9 完整实战范例：年份数据集与代表事件](#29-完整实战范例年份数据集与代表事件)
- [三、 设定资料图库 (Reference Gallery) 数据架构](#三-设定资料图库-reference-gallery-数据架构)
  - [3.1 设定图库定位与目录存储策略](#31-设定图库定位与目录存储策略)
  - [3.2 Gallery Item 字段规范表](#32-gallery-item-字段规范表)
  - [3.3 六大核心维度定义与受控注册表](#33-六大核心维度定义与受控注册表)
  - [3.4 多语言备注与来源证据 (Source & Provenance) 体系](#34-多语言备注与来源证据-source--provenance-体系)
  - [3.5 前台多维复合筛选与详情展示交互规范](#35-前台多维复合筛选与详情展示交互规范)
  - [3.6 完整实战范例：角色设定图库数据集](#36-完整实战范例角色设定图库数据集)
- [四、 自动化校验规则 (Validation Rules)](#四-自动化校验规则-validation-rules)
- [五、 新建与日常维护工作流](#五-新建与日常维护工作流)

---

## 一、 功能型数据 (Feature Data) 的定位与边界

在 KAMITSUBAKI FAN WIKI 的整体数据模型中，内容严格划分为两大类别：

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 WIKI 数据二元模型                                       │
├────────────────────────────────────────┬───────────────────────────────────────────────┤
│ A. 普通百科词条 (Content Entries)       │ B. 功能型数据集 (Feature Data)                 │
├────────────────────────────────────────┼───────────────────────────────────────────────┤
│ • 拥有独立展示 URL 与完整页面           │ • 依附于专属功能大屏，单项记录不设独立 URL    │
│ • 人物、组合、企划、唱片、曲目、专栏   │ • 全景时间轴事件 (Chronicle)、设定资料图 (Gallery)│
│ • 结构：一个实体 × 一个语言 = 1个 Markdown│ • 结构：按主题或年份聚合的结构化 YAML 数据文件  │
│ • 特征：强叙述性、适合长篇正文补充     │ • 特征：高频检索、参数化密集、数量庞大        │
└────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 为什么不对每个时间轴事件和每张设定图建立单独的 Markdown 文件？
1. **防范文件膨胀与维护灾难**：截至 2026-09 统计快照，全站收录了 518 项历史大事件与大量官方设定图。如果每项都新建 Markdown，将导致海量琐碎文件，极度拖慢构建速度；
2. **非独立阅读页面**：用户不会单独打开一个只包含一句话的“2021年某月某日发售单曲”网页，时间轴事件是在**连续的时间上下文**中被消费的；
3. **数据一致性聚合**：按年份维护 YAML，方便批量排序、区间检索和全量校验。

---

## 二、 全景时间轴 (Chronicle) 数据架构

### 2.1 目录组织与存储策略
时间轴数据采用**按年份分片（Yearly Sharding）**模式存放于数据层：

```text
src/data/chronicle/
├── 2018.yml                 # 创立黎明期事件 (出道、神椿创立等)
├── 2019.yml
├── 2020.yml
├── 2021.yml                 # V.W.P 结成、同位体爆发
├── 2022.yml                 # 武道馆不可解参狂等
├── 2023.yml
├── 2024.yml                 # 代代木决战、MBO 独立与 PNDR 启动
├── 2025.yml                 # 电视动画全国播映、主机游戏三部曲
└── 2026.yml                 # 新纪元事件记录
```

---

### 2.2 Timeline Event 字段规范表

每个年份 YAML 包含一个根键 `year: number`，以及事件列表 `events: Event[]`。

| 字段路径 (Field Path) | 类型 (Type) | 必填 | 多语言 | 默认值 | 允许值 / 校验规则 | 说明 |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `string` | **是** | 否 | 无 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | 事件全局唯一永久 ID（短横线命名，可包含年份前缀惯例，但不强制绑定具体日，避免未来补充精确日期迫使 ID 改名） |
| `date.start` | `string` | **是** | 否 | 无 | `YYYY`, `YYYY-MM`, `YYYY-MM-DD` | 起始日期（支持不同精度） |
| `date.end` | `string` | 否 | 否 | 无 | 格式同上 | 结束日期（跨日演出/展会必填） |
| `date.precision` | `enum` | **是** | 否 | `day` | `day` \| `month` \| `year` | 日期真实精度，严禁无事实证据瞎编具体日 |
| `text.zh.title` | `string` | **是** | 简中 | 无 | 1~60 字符 | 事件简中标题 |
| `text.zh.summary` | `string` | **是** | 简中 | 无 | 纯文本或轻量 Markdown | 事件简中概述 |
| `text.ja.title` | `string` | **是** | 日文 | 无 | 日文原版标题 | 事件日文标题 |
| `text.ja.summary` | `string` | **是** | 日文 | 无 | 日文原版概述 | 事件日文概述 |
| `text.en.title` | `string` | **是** | 英文 | 无 | 英文官方/翻译标题 | 事件英文标题 |
| `text.en.summary` | `string` | **是** | 英文 | 无 | 英文概述 | 事件英文概述 |
| `tracks` | `string[]` | **是** | 否 | 无 | 引自 Timeline Track Registry | 归属叙事轨道（允许多选，形成交汇点） |
| `eventTypes` | `string[]` | **是** | 否 | 无 | 引自 Event Type Registry | 事件客观形态分类 (如 `live`, `release`, `announcement` 等) |
| `importance` | `enum` | **是** | 否 | `regular` | `milestone` \| `major` \| `regular` | 事件历史重要等级（`milestone` 获得高亮光效） |
| `eraOverride` | `string` | 否 | 否 | 无 | 仅当跨年特殊界定时允许手动覆盖纪元 ID | 默认由系统根据日期自动判定 |
| `related` | `array` | 否 | 否 | `[]` | `[{ entity: string, role: string }]` | 关联百科词条 ID（用于双向穿梭） |
| `articles` | `string[]` | 否 | 否 | `[]` | 专栏文章 ID 数组 | 深度特稿直接链接 |
| `sources` | `array` | 条件必填 | 否 | `[]` | 依据引证列表（重大事件 `major` / `milestone` 至少 1 项） | 史料真实性凭据 |

---

### 2.3 历史叙事轨道注册表 (Timeline Track Registry) 与交汇点 (Convergence Point)

为了避免将全部事件压在一根单维线上导致信息拥堵，时间轴划分为四大并行叙事轨道：

| Track ID | 中文轨道名称 | 英文显示 | 涵盖事件范畴 | 代表事件范例 |
| :--- | :--- | :--- | :--- | :--- |
| `music-live` | 音乐与现场演艺轨道 | Music & Live Stage | 个人/组合演唱会、专辑发售、单曲公开、流媒体上架 | 花谱武道馆参狂、V.W.P《運命》发售 |
| `project-verse` | 企划宇宙与多媒体轨道 | Projects & Lore Verse | 神椿市建设中动画、游戏三部曲、小说出版、ARG 解谜 | TBS 动画开播、《協奏中。》全平台上线 |
| `isotope-synth` | 同位体与合成声学轨道 | Isotopes & Synth Voice | 音乐同位体软件发售、合成引擎换代升级、官方编译合辑 | 可不 CeVIO AI 发售、羽累 SV 引擎更新 |
| `organization-biz`| 组织架构与商业基建轨道 | Organization & Business| THINKR 母体变迁、Studio 设立、MBO 独立、PNDR 平台 | THINKR 实施 50 亿 MBO、PNDR 平台启动 |

#### 轨道交汇点机制 (The Convergence Point)
当一项重大复合事件同时标有多个轨道（例如：代代木决战既是演唱会，又现场宣布了廻花降临与重大商业动作），该事件属于**多轨交汇点**：
- 前台渲染：在多轨视图中，该时间点跨越轨道展示**高亮贯通发光柱 (Convergence Beam)**；
- 观测者意义：向用户清晰呈现神椿历史上“虚实交融、多维并进”的核心转折点。

---

### 2.4 事件类型注册表 (Event Type Registry)

用于精确过滤“这个事件到底是什么性质”：

| Event Type ID | 中文类型名称 | 适用范围说明 |
| :--- | :--- | :--- |
| `live` | 现场或线上演出 | 专场演唱会、联合演剧、XR 演艺、音乐节出展 |
| `release` | 唱片与作品发售 | 正规专辑、EP、单曲、影视原声带 (OST)、演唱会 BD |
| `announcement` | 官方重大发表 | 新艺人公布、新形态发表、重大企划披露 |
| `organization-change`| 组织与架构变动 | 成立新工作室、厂牌架构调整、资本运作、人事任命 |
| `anime` | 电视动画衍生 | 电视动画开播、剧场版上映、PV 发布 |
| `game` | 互动游戏发布 | 音乐节奏游戏、主机文字冒险、VR 互动项目发布 |
| `publication` | 图书与文学出版 | 世界观小说发行、官方设定画集出版、漫画连载 |
| `exhibition` | 空间展示与展会 | 魔女展、当代艺术联展、涉谷概念快闪空间 |

> **重要性与事件性质解耦原则**：`milestone` 为事件重要等级标识（由 `importance: milestone` 承载），不再作为客观形态类型列入 `eventTypes`，彻底消除双重语义冗余。

---

### 2.5 历史纪元注册表 (Era Registry) 与日期自动化推导

> **严正中立性声明**：四大历史纪元为 **KAMITSUBAKI FAN WIKI 编辑部所采用的史料编年分期法 (Editorial Historical Periodization)**，旨在便于读者理清发展脉络，**绝非 THINKR 官方权威发布的企划期数**。

#### 纪元自动化计算规则
事件无需人工填写 `era` 字段，系统根据 `date.start` 自动比对区间推导：

```text
┌───────────────────────────┬─────────────────────────┬──────────────────────────────┐
│ 纪元标识 (Era ID)          │ 时间区间 (Date Range)    │ 编年分期阐述 (Editorial Context)│
├───────────────────────────┼─────────────────────────┼──────────────────────────────┤
│ `era1-founding`           │ 2018-10-01 ~ 2020-12-31 │ 【创立期 · 黎明破晓】        │
│                           │                         │ 花谱出道，KAMITSUBAKI 正式成立，│
│                           │                         │ 魔女五人组全员集结完毕。     │
├───────────────────────────┼─────────────────────────┼──────────────────────────────┤
│ `era2-expansion`          │ 2021-01-01 ~ 2022-12-31 │ 【扩张期 · 武道馆与同位体】  │
│                           │                         │ V.W.P 正式结成，登顶武道馆， │
│                           │                         │ 音乐同位体可不诞生引发全网创作。│
├───────────────────────────┼─────────────────────────┼──────────────────────────────┤
│ `era3-transmedia`         │ 2023-01-01 ~ 2024-12-31 │ 【跨媒体期 · 虚实深化与决战】│
│                           │                         │ SINKA LIVE 虚实多幕剧探索，  │
│                           │                         │ 代代木竞技场决战，MBO 独立。 │
├───────────────────────────┼─────────────────────────┼──────────────────────────────┤
│ `era4-new-era`            │ 2025-01-01 ~ 2099-12-31 │ 【新纪元 · 宇宙交汇与基础设施】│
│                           │                         │ 电视动画全国开播，游戏三部曲，│
│                           │                         │ PNDR 平台走向行业基础设施。  │
└───────────────────────────┴─────────────────────────┴──────────────────────────────┘
```

---

### 2.6 日期精度与时间区间规范

禁止为了排版对齐而编造虚假日期。统一采用结构化日期模型：

```yaml
# 案例 A：精确到日的一日 Live
date:
  start: "2022-08-24"
  precision: "day"

# 案例 B：跨两日的 ARENA 竞技场大战
date:
  start: "2024-01-13"
  end: "2024-01-14"
  precision: "day"

# 案例 C：仅明确到月份的早期活动
date:
  start: "2019-10"
  precision: "month"

# 案例 D：持续数月的展会
date:
  start: "2023-04-28"
  end: "2023-06-11"
  precision: "day"
```

---

### 2.7 多语言维护与自动繁简生成机制

为杜绝重复劳动与翻译脱节，时间轴遵循全站强制的多语言生成规则：

```text
       【人工维护文本 (Source)】
     ┌───────────┬───────────┬───────────┐
     │  text.zh  │  text.ja  │  text.en  │
     └─────┬─────┴───────────┴───────────┘
           │
           ▼ (执行 pnpm i18n:generate 管道)
     ┌───────────────────────────────────┐
     │ 繁简转换转换器 (OpenCC 词汇映射)   │
     └─────┬───────────────────────┬─────┘
           ▼                       ▼
     【text.zh-tw】          【text.zh-hk】
      (自动生成/免人工维护)    (自动生成/免人工维护)
```

源文件 `src/data/chronicle/*.yml` 中**只保存 zh、ja、en**，构建脚本在编译期动态填充繁体变体或生成运行时缓存，保持源数据轻盈。

---

### 2.8 时间轴与百科词条的双向穿梭联动 (Cross-Entity Linking)

时间轴不是孤立的清单，而是贯穿全站实体的索骥中枢。

#### 联动结构：`related` 数组
```yaml
related:
  - entity: "kaf"                  # 关联实体全局 ID
    role: "subject"                # subject (主体) | performer (参演) | organizer (主办)
  - entity: "fukakai-san-kyou"     # 关联具体 Live 词条
    role: "featured-live"
  - entity: "thinkr"               # 关联组织
    role: "organizer"
```

#### 双向自动派生
1. **时间轴大屏 ➔ 词条**：点击事件卡片上的艺人、演出、唱片徽章，直接跳转至对应的百科详情页面；
2. **词条 ➔ 时间轴**：当用户在浏览《花谱》或《不可解参(狂)》页面时，页面底部的「编年史足迹 (Chronicle Footprints)」模块通过反向索引，**全自动汇总该实体参与的所有历史大事件**，无需人工维护第二份列表。

---

### 2.9 完整实战范例：年份数据集与代表事件 (`src/data/chronicle/2024.yml`)

```yaml
schemaVersion: 1
year: 2024

events:
  - id: "2024-01-14-kaf-kaika-announcement"
    date:
      start: "2024-01-14"
      precision: "day"
    text:
      zh:
        title: "花谱在国立代代木第一体育馆「怪歌」中宣布实体二刀流形态「廻花」"
        summary: |
          在花谱 4th ONE-MAN LIVE「怪歌」现场末尾，大屏幕披露全新企划，花谱突破虚拟外壳限制，
          正式公布以真实躯体创作歌曲并现场弹唱的全新艺人身份「廻花 (KAIKA)」。
      ja:
        title: "花譜、国立代々木競技場第一体育館「怪歌」にて新プロジェクト「廻花」を発表"
        summary: |
          4th ONE-MAN LIVE「怪歌」の終盤において、バーチャルとリアルの境界を超える
          シンガーソングライター・プロジェクト「廻花」としての活動開始をサプライズ発表した。
      en:
        title: "KAF Announces Real-Avatar Dual Form 'KAIKA' at 4th Live 'KAIKA' in Yoyogi Arena"
        summary: |
          At the conclusion of KAF 4th ONE-MAN LIVE 'KAIKA' at the Yoyogi National Gymnasium,
          KAF unveiled the singer-songwriter identity 'KAIKA', exploring artistic expression beyond the virtual model.
    tracks:
      - "music-live"
      - "project-verse"
    eventTypes:
      - "live"
      - "announcement"
    importance: "milestone"
    related:
      - entity: "kaf"
        role: "subject"
      - entity: "kaika"
        role: "announced-form"
      - entity: "fukakai-4-kaika"
        role: "featured-live"
      - entity: "thinkr"
        role: "organizer"
    articles:
      - "kaika-artistic-evolution"
    sources:
      - id: "src-kaika-announcement-official"
        type: "press-release"
        title: "花譜、リアルアーティスト「廻花」としての始動を発表"
        publisher: "KAMITSUBAKI STUDIO"
        url: "https://kamitsubaki.jp/news/2024/01/14/01/"
        publishedAt: "2024-01-14"
        checkedAt: "2026-09-18"

  - id: "2024-06-20-thinkr-mbo-independent"
    date:
      start: "2024-06-20"
      precision: "day"
    text:
      zh:
        title: "THINKR 宣布实施 50 亿日元管理层收购 (MBO) 脱离 Avex 集团，KDDI 战略领投"
        summary: |
          株式会社 THINKR 正式宣布完成约 50 亿日元的 MBO，脱离 Avex 集团实现资本独立；
          同时接受电信巨头 KDDI 等资本的战略投资，全面发力虚拟内容中台与新媒体基建。
      ja:
        title: "THINKR、エイベックスからのMBO実施とKDDI等からの資金調達を発表"
        summary: |
          株式会社THINKRはマネジメント・バイアウト（MBO）を通じてエイベックスグループから独立し、
          KDDI等を引受先とする第三者割当増資を実施したことを発表した。
      en:
        title: "THINKR Announces 5-Billion Yen MBO Independence from Avex and KDDI Strategic Investment"
        summary: |
          THINKR Co., Ltd. officially completed a management buyout of approximately 5 billion yen
          from Avex Group to regain operational independence, securing strategic backing from KDDI.
    tracks:
      - "organization-biz"
    eventTypes:
      - "organization-change"
    importance: "milestone"
    related:
      - entity: "thinkr"
        role: "subject"
      - entity: "piedpiper"
        role: "lead-executive"
    articles:
      - "thinkr-capital-and-mbo-study"
    sources:
      - id: "src-mbo-press-release"
        type: "press-release"
        title: "THINKR、MBO実施とKDDI等からの資金調達に関するお知らせ"
        publisher: "株式会社THINKR"
        url: "https://thinkr.jp/news/20240620_mbo/"
        publishedAt: "2024-06-20"
        checkedAt: "2026-09-18"
```

---

## 三、 设定资料图库 (Reference Gallery) 数据架构

### 3.1 设定图库定位与目录存储策略
神椿拥有顶级的视觉艺术资产（如 PALOW. 的角色原案三视图、衣装解构图、川サキ的文字图形实验、神椿市概念设计）。

> **核心定位**：设定图库不是普通的个人相册，而是**具备角色、形态、设计标签、时间时期、贡献者和考据备注的生产级视觉档案数据库**。

#### 存储策略
按主要角色或企划划分 YAML 文件，集中存放在数据层：

```text
src/data/galleries/
├── kaf.yml                  # 花谱视觉设定全谱系
├── rim.yml                  # 理芽视觉设定
├── harusaruhi.yml           # 春猿火视觉设定
├── isekaijoucho.yml         # ヰ世界情绪视觉设定
├── koko.yml                 # 幸祜视觉设定
├── kafu.yml                 # 可不声库与产品包装设计
├── valis.yml                # VALIS 马戏团衣装与三视图
├── kamitsubaki-city.yml     # 神椿市都市场景、复兴局概念设计图
└── girls-revolution.yml     # 少女革命角色戏剧概念设定
```

---

### 3.2 Gallery Item 字段规范表

每个图库 YAML 包含一个主体声明 `subject: string`（必须引用一个合法的 Entity ID，如 `kaf` 或 `kamitsubaki-city`），以及素材列表 `items: GalleryItem[]`。

| 字段路径 (Field Path) | 类型 (Type) | 必填 | 多语言 | 默认值 | 允许值 / 校验规则 | 说明 |
| :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| `id` | `string` | **是** | 否 | 无 | 全局唯一图片素材编号 | 建议格式：`{subject}-{form}-{seq}` |
| `image.src` | `string` | **是** | 否 | 无 | 站内绝对路径或稳定 CDN URL | 高清原图地址 |
| `image.thumbnail` | `string` | 否 | 否 | 自动生成 | 预览缩略图路径 | 若缺省由 Astro 图片管道自动切图 |
| `image.dimensions`| `object`| 否 | 否 | 无 | `{ width: number, height: number }` | 避免排版位移累积 (CLS) |
| `characters` | `string[]` | 条件必填 | 否 | 无 | 必须全部为合法的 Entity ID | 角色类视觉资料必填；非角色视觉资料（城市场景、建筑设定、企划 Logo、道具图）可选/缺省 |
| `form` | `string` | 条件必填 | 否 | 无 | 引自 Form Registry (带角色前缀) | 角色/服装/形态资料必填；场景/道具/建筑/企划概念图可选 (严禁强行填默认值) |
| `tags` | `string[]` | **是** | 否 | 无 | 引自 Gallery Tag Registry | 设计视角与部件标签 |
| `date` | `string` | 否 | 否 | 无 | `YYYY`, `YYYY-MM`, `YYYY-MM-DD` | 官方首次公开或对应设计期 |
| `uploader` | `string` | **是** | 否 | 无 | 添加者的 Wiki 用户名/贡献者代号 | **注明：收录者，非原图画师** |
| `uploadedAt` | `string` | **是** | 否 | 当前日期 | `YYYY-MM-DD` | 录入时间戳 |
| `notes.zh` | `string` | 否 | 简中 | 无 | Markdown 考据说明 | 简中设计背景与细节说明 |
| `notes.ja` | `string` | 否 | 日文 | 无 | Markdown 考据说明 | 日文原版设计考据 |
| `notes.en` | `string` | 否 | 英文 | 无 | Markdown 考据说明 | 英文设计考据 |
| `source.type` | `enum` | **是** | 否 | 无 | 见来源受控类型 | `official-artbook` \| `official-x` \| `art-exhibition` \| `product-packaging` |
| `source.title` | `string` | 否 | 否 | 无 | 来源出版物/展会/页面标题 | 来源标题 |
| `source.publisher` | `string` | 否 | 否 | 无 | 发布机构（如 `PALOW.` 或 `THINKR`） | 出处机构 |
| `source.url` | `string` | 否 | 否 | 无 | 原始出处永久链接 | 网络出处链接 (与实体出版物 title + page 二选一) |
| `source.page` | `string` | 否 | 否 | 无 | 实体画册页码 (如 `p.12-15`) | 实体书刊出处 (不强制要求在线 URL) |
| `source.publishedAt`| `string`| 否 | 否 | 无 | 原始发帖/出版日期 | 来源发布日 |

---

### 3.3 六大核心维度定义与受控注册表

#### 1. 角色实体 (Character)
必须引用合法的 Entity ID：
- 单人图：`characters: ["kaf"]`
- 双生共演：`characters: ["kaf", "kaika"]`
- 旗舰合体：`characters: ["kaf", "rim", "harusaruhi", "isekaijoucho", "koko"]`

#### 2. 形态与身份版本 (Form Registry)
明确定义该图对应角色宇宙中的具体哪一阶段。**Form ID 采用带角色前缀的全局唯一命名**，防止跨角色冲突：

| Form ID | 中文名称 | 说明与覆盖角色 |
| :--- | :--- | :--- |
| `kaf-default-v1` | 花谱经典初代形象 (普遍体) | 2018–2019 花谱早期经典连帽衫常服造型 |
| `kaf-combat-v2` | 花谱战斗形态 / 深化觉醒 | 不可解弐、魔女集会具有羽毛/武装装束 |
| `kaf-vwp-form` | 花谱 V.W.P 礼服态 | V.W.P 合体演出统一仪轨礼服 |
| `kaf-kaika` | 廻花实体创作形态 | 实体吉他、无皮套素描手稿质感 |
| `rim-default-v1` | 理芽经典初代形象 | 2019 理芽早期短发日常衣装造型 |
| `rim-vwp-form` | 理芽 V.W.P 礼服态 | V.W.P 仪式礼服姿态 |
| `kafu-default` | 可不初代官方声库形象 | 2021 CeVIO AI 声库官方包装主视觉 |
| `morisaki-kaho-default`| 森先化步神椿市虚构住民形态 | 动画与文字冒险游戏中的高中生常服 |
| `sinka-special` | SINKA LIVE 虚实演剧衣装 | 深化各场次专属演剧服 |

#### 3. 标签字典 (Gallery Tag Registry)
受控标签分为三大视角维度（禁止直接使用中文作为键名，前端自动本地化翻译）：

```yaml
# 视角与构图标签
- "front-view"         # 正视图
- "back-view"          # 后视图
- "side-view"          # 侧视图
- "full-body"          # 全身三视图
- "close-up"           # 脸部与发饰特写

# 内容与设计标签
- "costume"            # 服装解构与剪裁细节
- "expression-sheet"   # 表情差分一览
- "3d-model-mesh"      # 3D 骨骼与多边形建模线框
- "concept-art"        # 氛围概念设计原画
- "prop-accessory"     # 随身武器、发饰、特异点道具

# 资产性质标签
- "official-final"     # 官方定案最终设定
- "design-draft"       # 废案或早期草图对比
```

#### 4. 首次公开时间 (Date)
忠实记录历史设计周期，支持 `YYYY`、`YYYY-MM`、`YYYY-MM-DD`。

#### 5. 贡献收录者 (Uploader)
记录哪位 Wiki 维护者为资料库录入了该资产，与原作者严格区分。

#### 6. 深度考据备注 (Notes)
支持 Markdown 语法，用于记录画师的推特设计阐述、色彩象征隐喻或版本细微改动。

---

### 3.4 多语言备注与来源证据 (Source & Provenance) 体系

图片资产极易陷入“来源不明的二传图”陷阱，因此 `source` 规范要求必须提供可追溯依据：
- `source.type` 必填；
- 出处凭证采用“在线 URL”或“实体书刊 `title + page`”二选一，不强制实体画册具备远程 URL：

```yaml
# 案例 A：实体出版画册（无需远程 URL）
source:
  type: "official-artbook"
  title: "魔女図鑑 - PALOW. CHARACTER DESIGN WORKS"
  publisher: "KAMITSUBAKI RECORD"
  page: "p.42-45"
  publishedAt: "2021-10-20"

# 案例 B：网络官方发帖（提供永久 URL）
source:
  type: "official-x"
  title: "PALOW. 设计案公开推文"
  publisher: "PALOW."
  url: "https://x.com/PALOW_/status/174652..."
  publishedAt: "2024-01-14"
```

来源类型受控枚举：
- `official-site`：艺人官网、企划特设站
- `official-artbook`：实体出版画册、演出场刊 (Pamphlet)
- `official-x`：画师本人或官方推特附带设计说明的原帖
- `game-client-extract`：游戏客户端公开界面截取素材
- `bd-bonus-booklet`：演唱会 BD 附带特典解说册

---

### 3.5 前台多维复合筛选与详情展示交互规范

前台设定资料大屏提供**多维实时无刷新过滤工具栏**：

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [ 角色 Character ]  [全部] [花譜] [理芽] [春猿火] [ヰ世界情緒] [幸祜] [V.W.P] [可不]      │
│ [ 形态 Form      ]  [全部] [初代普遍体] [战斗形态] [V.W.P合体] [廻花] [神椿市住民]      │
│ [ 设计标签 Tags  ]  [全部] [三视图] [服装结构] [表情差分] [道具特写] [概念草图]          │
│ [ 时期 Timeline  ]  2018 ────────────────────────── 2026                               │
│ [ 来源 Publisher ]  [全部] [PALOW.] [川サキ] [公式设定集] [神椿工作室]                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### 详情弹窗 (Lightweight Inspector Modal)
点击任一图片卡片，弹出沉浸式大图观察器：
- 左侧：高清大图（支持缩放平移、自适应深色暗房背景）；
- 右侧数据面板：
  - 核心角色（徽章链接直跳人物词条）
  - 所属形态与阶段
  - 设计属性标签芯片
  - 首次公开日期
  - 来源出处与原帖永久链接
  - 深度考据 Notes
  - 贡献收录者标识
- **边界说明**：第一版**不实现**复杂局部热点打点（Hotspot Annotation）与多 Asset 打包组，优先保证纯静态极速加载与高可用性。

---

### 3.6 完整实战范例：角色设定图库数据集 (`src/data/galleries/kaf.yml`)

```yaml
schemaVersion: 1
galleryId: "kaf-reference"
subject: "kaf"

items:
  - id: "kaf-default-v1-front"
    image:
      src: "/images/gallery/kaf/kaf-default-sheet-01.jpg"
      thumbnail: "/images/gallery/kaf/thumbs/kaf-default-sheet-01.webp"
      dimensions:
        width: 2480
        height: 3508
    characters:
      - "kaf"
    form: "kaf-default-v1"
    tags:
      - "character-sheet"
      - "full-body"
      - "front-view"
      - "official-final"
      - "costume"
    date: "2018-10-18"
    uploader: "link"
    uploadedAt: "2026-09-18"
    notes:
      zh: |
        花谱初代标志性连帽衫造型三视图原案。
        由 PALOW. 亲自绘制，确立了粉色发丝、三色同心环瞳孔与拉普拉斯纹理的视觉基石。
      ja: |
        花譜の初期シグネチャーであるパーカー姿の設定三面図。
        PALOW.によるキャラクター原案であり、ピンク髪と三重瞳の意匠が確立された。
      en: |
        Original design sheet of KAF's iconic hoodie outfit from her debut in 2018.
        Illustrated by PALOW., establishing the core visual identity.
    source:
      type: "official-artbook"
      title: "魔女図鑑 KAMITSUBAKI ART WORKS Vol.1"
      publisher: "KAMITSUBAKI RECORD"
      page: "12"
      publishedAt: "2021-10-20"

  - id: "kaf-kaika-costume-concept"
    image:
      src: "/images/gallery/kaf/kaika-costume-draft-01.jpg"
      thumbnail: "/images/gallery/kaf/thumbs/kaika-costume-draft-01.webp"
      dimensions:
        width: 1920
        height: 1080
    characters:
      - "kaf"
      - "kaika"
    form: "kaf-kaika"
    tags:
      - "costume"
      - "concept-art"
      - "official-final"
    date: "2024-01-14"
    uploader: "link"
    uploadedAt: "2026-09-18"
    notes:
      zh: |
        代代木第一体育馆「怪歌」中公布的「廻花」实体演出服装与手绘吉他设计案。
        去除了虚拟 3D 角色常见的高饱和度外设，转为朴实质朴的黑白色块与粗织布料质感。
      ja: |
        代々木競技場「怪歌」にて披露された「廻花」のステージ衣装およびペイントギター設計図。
      en: |
        Stage costume and hand-painted guitar design draft for 'KAIKA' unveiled at Live 'KAIKA' 2024.
    source:
      type: "official-x"
      publisher: "PALOW."
      url: "https://x.com/PALOW_/status/174652..."
      publishedAt: "2024-01-14"
```

---

## 四、 自动化校验规则 (Validation Rules)

在运行 `pnpm validate:content` 时，验证器自动覆盖两大 Feature Datasets：

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                          FEATURE DATA 自动化校验矩阵                                    │
├──────────────────────────────────────┬─────────────────────────────────────────────────┤
│ Chronicle 校验项                     │ Reference Gallery 校验项                         │
├──────────────────────────────────────┼─────────────────────────────────────────────────┤
│ • Event ID 符合正则且全站全局唯一    │ • Item ID 符合规范且全局唯一                    │
│ • date.start 日期合法，精度与格式对齐│ • characters 中引用的 ID 必须在 People/Units 存在│
│ • date.end 不得早于 date.start       │ • form 必须存在于 Form Registry 中               │
│ • tracks 必须全部属于 4 大合法轨道   │ • tags 必须全部存在于 Gallery Tag Registry 中    │
│ • related.entity 必须在 Registry 存在│ • image.src 本地文件不存在属于 Hard Error        │
│ • sources 重大事件必须包含合法出处   │ • 远程 URL 可达性仅作 Warning / 可选检查任务      │
│ • text.zh 必须包含非空的 title/summary│ • source 必须完整定义 type 与 URL 或书刊页码      │
└──────────────────────────────────────┴─────────────────────────────────────────────────┘
```

---

## 五、 新建与日常维护工作流

### 1. 新增一条历史大事件流程
1. 打开 `src/data/chronicle/{年份}.yml`（若该年份尚不存在则新建）；
2. 在 `events` 列表中追加事件对象；
3. 输入日期与精度（`precision: day | month | year`）；
4. 填写简中、日文、英文三语的 `title` 和 `summary`（无需填写繁体）；
5. 勾选归属的 1~2 条 `tracks`（如同时属于 `music-live` 与 `project-verse` 则自动成为交汇点）；
6. 在 `related` 中关联涉及的角色 ID、演出 ID 或唱片 ID；
7. 运行本地校验命令确保无语法和断链错误：
   ```bash
   pnpm validate:content
   ```

### 2. 新增一张设定资料图流程
1. 将高清图像置入 `public/images/gallery/{subject}/`；
2. 打开 `src/data/galleries/{subject}.yml`；
3. 追加 Item 对象，指定唯一 ID；
4. 在 `characters` 中填入出现的人物实体 ID（非角色视觉资料如城市场景图可省略）；
5. 在 `form` 中填入受控的形态代码（如 `kaf-default-v1` 或 `kaf-kaika`；场景/建筑图可缺省）；
6. 从受控词表中选取 2~5 个 `tags`（如 `costume`, `front-view`）；
7. 记录上传者标识与官方来源信息（`source`）；
8. 运行本地验证完成录入。
