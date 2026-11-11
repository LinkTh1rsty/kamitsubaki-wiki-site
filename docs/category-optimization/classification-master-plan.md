# KAMITSUBAKI FAN WIKI 分类架构重构设计规范 (Classification Master Plan)

> **版本**：v2.0.0 (Master Edition)  
> **状态**：APPROVED / ARCHITECTURE FROZEN  
> **文档性质**：全站顶层产品架构基准与实施参考（非实施代码）  
> **适用范围**：`kamitsubaki-wiki-site` 前台导航系统、内容架构与功能数据集体系  
> **冻结声明**：Architecture frozen at this version. Future breaking changes require a new RFC/version.  
> **事实维护说明**：架构设计冻结，但百科事实数据仍持续维护、更新与纠错 (Architecture is frozen; factual catalog content remains continuously maintainable and correctable)。

---

## 目录
- [一、 规划愿景与核心架构](#一-规划愿景与核心架构)
- [二、 顶层全局信息架构图](#二-顶层全局信息架构图)
- [三、 支柱一：客观百科资料库 (Objective Database)](#三-支柱一客观百科资料库-objective-database)
- [四、 支柱二：研究与深度专栏 (Research & Editorial)](#四-支柱二研究与深度专栏-research--editorial)
- [五、 支柱三：全景纪元时间轴 (Master Chronicle)](#五-支柱三全景纪元时间轴-master-chronicle)
- [六、 独立功能型数据集 (Feature Data) 的划分](#六-独立功能型数据集-feature-data-的划分)
- [七、 网站前台导航与路由规范 (Routing & Navigation)](#七-网站前台导航与路由规范-routing--navigation)
- [八、 底层数据目录迁移与落地指南](#八-底层数据目录迁移与落地指南)

---

## 一、 规划愿景与核心架构

KAMITSUBAKI STUDIO 与 THINKR 旗下涵盖了虚拟艺人、现实创作人、音乐厂牌、跨媒体企划及长期历史叙事演进。作为一个非官方粉丝维基（Fan Wiki），系统必须兼顾**严谨的事实记录**、**深度的长篇研究**与**直观的历史脉络**。

本设计规范确立**三大支柱**驱动的顶层产品架构：

```text
========================================================================================================================
                                             【 KAMITSUBAKI FAN WIKI 】
                                         非官方观测数据库 · 全景架构体系
========================================================================================================================
                                                        │
         ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
         ▼                                              ▼                                              ▼
 ┌───────────────────────────────┐              ┌───────────────────────────────┐              ┌───────────────────────────────┐
 │   【 1. 客观百科资料库 】      │              │    【 2. 研究与深度专栏 】     │              │    【 3. 全景纪元时间轴 】     │
 │       OBJECTIVE DATABASE      │              │      RESEARCH & EDITORIAL     │              │       MASTER CHRONICLE        │
 ├───────────────────────────────┤              ├───────────────────────────────┤              ├───────────────────────────────┤
 │ • 严谨事实性 / 参数化词条     │              │ • 深度长篇特稿 / 考据专栏     │              │ • 跨越 8 年历史事件流式呈现   │
 │ • Markdown + Frontmatter 单文 │              │ • 资本 MBO / 艺术哲学 / 商业  │              │ • 独立 Feature Data 架构      │
 │ • 人物/音乐/企划/演出/世界观   │              │ • 多源争议事实交叉消解报告     │              │ • 四大叙事轨道与多维实时筛选  │
 └───────────────────────────────┘              └───────────────────────────────┘              └───────────────────────────────┘
```

---

## 二、 顶层全局信息架构图

```text
KAMITSUBAKI FAN WIKI
│
├─ 1. 客观百科资料库 (Objective Database)
│  ├─ 1.1 人物与艺人 (Solo Artists / Units / Creators / Staff)
│  ├─ 1.2 官方音乐同位体 (Isotopes)
│  ├─ 1.3 音乐唱片编目 (Releases / Songs)
│  ├─ 1.4 企划宇宙与 IP (Projects & IP)
│  ├─ 1.5 现场演出与大型活动 (Lives & Events)
│  ├─ 1.6 组织体系、工作室与厂牌 (Organizations & Studios)
│  └─ 1.7 世界观、术语词典与设定 (Lore & Universe)
│
├─ 2. 研究与深度专栏 (Research & Editorial)
│  ├─ 2.1 企划、组织与商业考据 (Business & Strategy)
│  ├─ 2.2 艺术哲学与演进特稿 (Art & Philosophy)
│  ├─ 2.3 人物与艺人深度特写 (Portraits & Profiles)
│  ├─ 2.4 产业与分发基础设施 (Infrastructure & Industry)
│  ├─ 2.5 史料对比与冲突消解 (Archival & Fact Alignment)
│  └─ 2.6 观测者记忆与深度乐评 (Observer's Voices)
│
└─ 3. 全景纪元时间轴 (Master Chronicle)
   ├─ 3.1 历史纪元分期 (The Four Historical Eras)
   ├─ 3.2 历史事件流 (Chronicle Event Stream - 截至 2026-09 统计快照已收录 518 项)
   ├─ 3.3 多轨并行筛选系统 (Multi-Track Filter)
   └─ 3.4 实体双向图谱穿梭 (Cross-Entity Linking)
```

---

## 三、 支柱一：客观百科资料库 (Objective Database)

> **中立性与客观性原则**：客观百科条目严格采用中立陈述，杜绝“现象级”、“传奇”、“巅峰”、“大宗师”等未经引证的主观修辞。所有事实尽可能附带官方或第三方新闻出处。

### 1.1 人物与艺人 (People & Artists)
彻底解耦台前虚拟化身、现实创作歌手、音乐组合与幕后核心制作团队：
- **个人歌手 (Solo Artists)**：花谱 (KAF)、理芽 (RIM)、春猿火 (HARUSARUHI)、ヰ世界情绪 (ISEKAIJOUCHO)、幸祜 (KOKO)、廻花 (KAIKA)、CIEL、明透 (ASU)、存流 (ARU)、梓川 (Azsagawa)、特蕾莎 (teresa)、雨宿り / Sooda；
- **演艺组合 (Units & Groups)**：V.W.P、Albemuth、VALIS、DUSTCELL、心世纪、罪十罚；
- **核心制作人 (Creators)**：カンザキイオリ (神崎一织)、Guiano、大沼パセリ、MIMI、雄之助、香椎モイミ、平田义久、Toa、HiFi-P、常磐等；
- **总策划与监督团队 (Staff & Directors)**：PIEDPIPER (统括制作人)、PALOW. (形象原案)、川サキ (映像导演/排版设计)、月岛总记 (世界观编剧)。

### 1.2 官方音乐同位体 (Musical Isotopes)
作为由人类艺人声音建模生成的独立语音合成产品档案：
- 可不 (KAFU) —— 对应声源：花谱
- 星界 (SEKAI) —— 对应声源：ヰ世界情绪
- 裏命 (RIME) —— 对应声源：理芽
- 狐子 (COKO) —— 对应声源：幸祜
- 羽累 (HARU) —— 对应声源：春猿火

### 1.3 音乐唱片编目 (Music Catalog & Discography)
统一整合曲目库与唱片发行介质（截至 2026-09 统计快照，收录 454 部正式发行介质）：
- **曲目总库 (Songs)**：包含录音版本、演唱者名单、词曲编混人员、歌词与多媒体试听；
- **唱片编目 (Releases)**：包含正规录音室大碟 (Album)、迷你专辑 (EP)、实体/数字限定单曲盘 (Single)、原声带 (Soundtrack)、Live 实况录音 (Live Album) 及多版本体系 (Editions)。

### 1.4 企划宇宙与 IP (Projects & Transmedia)
- **神椿市建設中。 (KAMITSUBAKI CITY)**：电视动画（TBS 全国联播网）、游戏三部曲（《協奏中。》《REGENERATE》《VR》）、小说编年及早期 ARG 解谜记录；
- **少女革命計画 (Girls Revolution Project)**：原创 IP 企划、心世纪与罪十罚音乐戏剧专案；
- **音楽的同位体企划**：双引擎技术沿革与二创商业授权规范；
- **UNKNOWN LAB Projects**：空间交互与前沿生成艺术实验专案。

### 1.5 现场演出与大型活动 (Lives & Events)
将重要演出从文字段落提拔为一级结构化实体：
- 个人专场（花谱 1st-4th「不可解」「怪歌」系列等）；
- 组合公演（V.W.P「魔女集会」「現象」系列）；
- 演剧式演出（SINKA LIVE 深化虚实融合多幕剧）；
- 线下展览（官方「魔女展」、概念快闪空间）。

### 1.6 组织体系、工作室与厂牌 (Organizations & Studios)
- **母体公司**：株式会社 THINKR（沿革、50亿日元 MBO 管理层收购、KDDI 战略投资）；
- **核心创作者工作室与实验室 (Creative Studios & Labs)**：
  - KAMITSUBAKI STUDIO（虚拟艺人孵化与音乐叙事综合工作室）
  - KYOKAI STUDIO（青年边缘亚文化与独立艺术探索）
  - ALLT STUDIO（创意视觉设计工作室 [Verification Required]）
  - PHASE STUDIO（3D CG 与数字视觉内容制作工作室 [Verification Required]）
  - QA STUDIO（质量管理与技术支持工作室 [Verification Required]）
  - UNKNOWN LAB（先锋交互技术与生成艺术实验专案）
- **创作者经纪与协作网络**：THINKR CREATIVE GUILD（创作者协作网络与经纪中台）；
- **唱片厂牌与发行网络**：PHENOMENON RECORD、SINSEKAI RECORD、ANARCHIC RECORD、GIRLS REVOLUTION、PNDR 独立音乐分发平台。

### 1.7 世界观、术语词典与设定 (Lore & Universe)
- **设定脉络 (Lore)**：现实轴、虚拟网络轴、神椿市平行轴三位一体宇宙体系；
- **专有名词 (Glossary)**：80+ 官方概念词条中日双语定义（特异点、普遍体、战斗形态、观测者、共犯者等）；
- **剧情住民 (Characters)**：神椿市虚构住民（森先化歩、谷置狸眼、朝主派流、夜河世界、輪廻此処）；
- **虚构地理 (Locations)**：Q市、复兴局、天秤之塔、中央空洞。

---

## 四、 支柱二：研究与深度专栏 (Research & Editorial)

> **定位与中立原则**：由具备深厚研究积累的观测者撰写的长篇特稿。专栏探讨允许包含学术分析与理论考据，但不做无端阴谋论猜想，不使用“商业内幕”等标题党修辞，规范统一为“商业考据”与“组织结构分析”。

首批六大核心专栏方向：
1. **企划、组织与商业考据 (Business & Strategy)**
   - 《THINKR 资本运作与商业模式研究：从 Avex 剥离、50 亿 MBO 到 KDDI 战略投资》
   - 《组织架构解密：从多 Studio 矩阵看 THINKR 的中台化内容生产机制》
2. **艺术哲学与演进特稿 (Art & Philosophy)**
   - 《花谱与廻花双生艺术演进深度分析：跨越虚拟皮套边界的二刀流创作哲学》
   - 《冷冽排版与破碎美学：PALOW. 与川サキ的视觉符号学体系剖析》
3. **人物与艺人深度特写 (Portraits & Profiles)**
   - 《统括制作人 PIEDPIPER 深度特写：虚拟演艺宇宙的构建逻辑》
   - 《カンザキイオリ生平创作心路全档：从神椿基石到自立歌者的演化轨迹》
4. **产业与分发基础设施 (Infrastructure & Industry)**
   - 《从内容工坊向行业基础设施跃迁：PNDR 独立音乐分发平台的商业闭环》
5. **史料对比与冲突消解 (Archival & Fact Alignment)**
   - 《神椿多源数据矩阵比对报告：萌娘百科、官方 FanWiki 与官方设定集差异考证》
   - 《全域实体命名、罗马音与多语言对齐考据白皮书》
6. **观测者记忆与深度乐评 (Observer's Voices)**
   - 《日本武道馆“不可解参狂”现场全纪实：虚拟演出迈向现实体育场馆的历程》
   - 《神椿编年曲风演化史：从早期 Vocaloid 摇滚到先锋未来低音的跨越》

---

## 五、 支柱三：全景纪元时间轴 (Master Chronicle)

> **定位与中立原则**：时间轴是独立的一级功能，串联跨越 8 年的历史事件流。四大历史纪元明确标注为“Wiki 编辑部史料编年分期”，不冒充官方定义。

### 5.1 四大历史纪元 (The Four Historical Eras)
1. **【创立期 · 黎明破晓】(2018.10 – 2020.12)**：花谱出道《线》，KAMITSUBAKI STUDIO 正式成立，魔女五人组全员集结完毕；
2. **【扩张期 · 武道馆与同位体】(2021.01 – 2022.12)**：V.W.P 组合结成，日本武道馆不可解参狂专场，音乐同位体可不诞生引发全网创作；
3. **【跨媒体期 · 虚实深化与决战】(2023.01 – 2024.12)**：SINKA LIVE 虚实演剧探索，代代木第一体育馆决战宣布廻花，THINKR 实施 MBO 独立；
4. **【新纪元 · 宇宙交汇与基础设施】(2025.01 – 2026+)**：TBS 电视动画全国开播，游戏三部曲全平台发售，PNDR 独立分发平台全面开放。

### 5.2 多轨叙事与交汇点 (Convergence Point)
- 详见 `feature-data-architecture.md`：四大叙事轨道（`music-live`、`project-verse`、`isotope-synth`、`organization-biz`）并行演进，复合重大事件形成高亮交汇贯通柱。

---

## 六、 独立功能型数据集 (Feature Data) 的划分

为避免大量琐碎记录造成文件膨胀与维护灾难，以下两项独立为结构化聚合数据集（Feature Data）：
1. **全景时间轴数据 (Chronicle)**：按年份存放于 `src/data/chronicle/{year}.yml`；
2. **设定资料图库数据 (Reference Gallery)**：按主体声明存放于 `src/data/galleries/{subject}.yml`。

两者均通过稳定 Entity ID 与客观百科词条实现双向图谱联动。

---

## 七、 网站前台导航与路由规范 (Routing & Navigation)

### 7.1 前台主导航设计 (Header Menu)
```text
[KAMITSUBAKI FAN WIKI]   [DATABASE ▾]   [ARTICLES]   [CHRONICLE]   [ABOUT]   |   [LABS ↗]  [🔍]  [MENU]
```

- **DATABASE (超级下拉菜单 Mega Menu)**：
  - 人物与艺人：Solo Artists / Units / Creators / Staff
  - 音乐资料：Albums / Singles / Soundtracks / Songs
  - 企划与同位体：神椿市建设中 / 少女革命 / 音乐同位体
  - 演出与活动：Live / Event / Exhibition
  - 组织与工作室：THINKR / 各 Studio / 厂牌
  - 世界观词典：Lore / Glossary / Character / Location
- **ARTICLES**：深度专栏文章列表与杂志流
- **CHRONICLE**：全景纪元时间轴交互大屏
- **ABOUT**：致观测者（前言、贡献指南、版权与社群）
- **LABS**：AI 观测端与知识图谱探索终端

### 7.2 规范路由映射
```text
/{locale}/                                  ── 首页
/{locale}/database/                         ── 客观百科总索引大厅
/{locale}/database/artists/solo/{slug}      ── 个人歌手
/{locale}/database/artists/groups/{slug}    ── 组合企划
/{locale}/database/creators/{slug}          ── 词曲创作者与制作人
/{locale}/database/staff/{slug}             ── 监督管理
/{locale}/database/isotopes/{slug}          ── 音乐同位体
/{locale}/database/projects/{slug}          ── 企划与 IP
/{locale}/database/music/albums/{slug}      ── 专辑唱片
/{locale}/database/music/songs/{slug}       ── 单曲作品
/{locale}/database/lives/{slug}             ── 现场与演出
/{locale}/database/studios/{slug}           ── 组织与工作室
/{locale}/database/lore/glossary/           ── 世界观专有名词典
/{locale}/articles/                         ── 深度专栏列表
/{locale}/articles/{category}/{slug}        ── 专栏正文
/{locale}/chronicle/                        ── 全景纪元时间轴大屏
/{locale}/gallery/                          ── 设定资料图库大屏
/{locale}/about/                            ── 站点关于与致观测者
/{locale}/about/contribute/                 ── 贡献指引
/{locale}/about/license/                    ── 版权声明
/{locale}/labs/                             ── AI 观测端与探索工具
```

---

## 八、 底层数据目录迁移与落地指南

### 8.1 目标目录划分
```text
src/
├── content/                                # A 类：所有百科词条与专栏 (Markdown + Frontmatter)
│   ├── site/                               # 站点 i18n 基础文案
│   ├── people/                             # 个人歌手、创作者、管理团队
│   ├── units/                              # 演艺组合
│   ├── isotopes/                           # 音乐同位体声库
│   ├── projects/                           # 多媒体企划
│   ├── releases/                           # 唱片编目大库
│   ├── songs/                              # 单曲总库
│   ├── lives/                              # 现场演出档案
│   ├── organizations/                      # 组织与工作室
│   ├── lore/                               # 世界观名词与虚构居民
│   └── articles/                           # 深度专栏长篇特稿
└── data/                                   # B 类：功能型数据集与受控词典
    ├── chronicle/                          # 时间轴年份 YAML 数据
    ├── galleries/                          # 设定图库主体 YAML 数据
    └── taxonomy/                           # 曲风、标签、角色等受控字典
```

---

*本规划为 KAMITSUBAKI FAN WIKI 全域产品与数据架构之项目架构基准与实施参考。*
