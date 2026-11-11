# 《KAMITSUBAKI Wiki Metadata Schema v2.0 设计规范》
> **版本**：v2.0.0 (Master Content Specification)  
> **状态**：APPROVED / IMPLEMENTATION BASELINE  
> **文档性质**：百科全域 Content Entry 架构基准与开发实施指南（非实施代码）  
> **归档位置**：`docs/category-optimization/metadata-schema-v2.md`  
> **适用范围**：`kamitsubaki-wiki-site` 所有百科词条与研究专栏内容集合  
> **冻结声明**：Architecture frozen at this version. Future breaking changes require a new RFC/version.  
> **事实维护说明**：架构设计冻结，但百科事实数据仍持续维护、更新与纠错 (Architecture is frozen; factual catalog content remains continuously maintainable and correctable)。

---

## 目录
- [一、 背景与目标](#一-背景与目标)
- [二、 现有 Schema 深度审计](#二-现有-schema-深度审计)
- [三、 当前体系的核心问题与风险](#三-当前体系的核心问题与风险)
- [四、 Schema v2.0 核心设计原则](#四-schema-v20-核心设计原则)
- [五、 Content 与 Feature Data 二元分工](#五-content-与-feature-data-二元分工)
- [六、 核心内容模型：Markdown + Frontmatter 规范](#六-核心内容模型markdown--frontmatter-规范)
- [七、 中文主源与多语言自动化管线](#七-中文主源与多语言自动化管线)
- [八、 Entity ID 永久稳定规范](#八-entity-id-永久稳定规范)
- [九、 前台分类不等于底层数据类型](#九-前台分类不等于底层数据类型)
- [十、 三层数据架构：Domain Fields + Generic Relations + Derived Graph](#十-三层数据架构domain-fields--generic-relations--derived-graph)
- [十一、 Entity Type Registry (实体类型注册表)](#十一-entity-type-registry-实体类型注册表)
- [十二、 Role Registry (职能职责注册表)](#十二-role-registry-职能职责注册表)
- [十三、 Relation Type Registry (关系类型注册表)](#十三-relation-type-registry-关系类型注册表)
- [十四、 Relationship Ownership (关系单一所有权规则)](#十四-relationship-ownership-关系单一所有权规则)
- [十五、 生命状态机体系 (Lifecycle & Permanent Archive)](#十五-生命状态机体系lifecycle--permanent-archive)
- [十六、 五大核心功能在 Metadata 中的落地机制](#十六-五大核心功能在-metadata-中的落地机制)
  - [16.1 脑暴功能 01：四位一体形态切换器 (Entity Morphing Switcher)](#161-脑暴功能-01四位一体形态切换器-entity-morphing-switcher)
  - [16.2 脑暴功能 02：制作人与曲风流派透视 (Creator & Genre Perspective)](#162-脑暴功能-02制作人与曲风流派透视-creator--genre-perspective)
  - [16.3 脑暴功能 03：全景时间轴的多轨并行数据联动](#163-脑暴功能-03全景时间轴的多轨并行数据联动)
  - [16.4 脑暴功能 04：概念悬浮气泡卡片 (Lore Hover Card) 与 WikiLink](#164-脑暴功能-04概念悬浮气泡卡片-lore-hover-card-与-wikilink)
  - [16.5 脑暴功能 05：历史归属与永久归档 (Permanent Archive & Independence)](#165-脑暴功能-05历史归属与永久归档-permanent-archive--independence)
- [十七、 全域 11 大核心实体 Schema 字段规范表](#十七-全域-11-大核心实体-schema-字段规范表)
  - [17.1 People Schema (个人歌手、创作者、监督团队)](#171-people-schema-个人歌手创作者监督团队)
  - [17.2 Unit Schema (音乐与演艺组合)](#172-unit-schema-音乐与演艺组合)
  - [17.3 Isotope Schema (音乐同位体合成声库)](#173-isotope-schema-音乐同位体合成声库)
  - [17.4 Song Schema (曲目与乐谱元数据)](#174-song-schema-曲目与乐谱元数据)
  - [17.5 Release Schema (唱片与作品编目)](#175-release-schema-唱片与作品编目)
  - [17.6 Edition Schema (版本与限定物理介质)](#176-edition-schema-版本与限定物理介质)
  - [17.7 Project Schema (企划宇宙与多媒体 IP)](#177-project-schema-企划宇宙与多媒体-ip)
  - [17.8 Organization Schema (组织机构、工作室与厂牌)](#178-organization-schema-组织机构工作室与厂牌)
  - [17.9 Live / Event Schema (现场演出与大型活动)](#179-live--event-schema-现场演出与大型活动)
  - [17.10 Lore Schema (世界观、术语与设定住民)](#1710-lore-schema-世界观术语与设定住民)
  - [17.11 Article Schema (深度专栏与考据特稿)](#1711-article-schema-深度专栏与考据特稿)
- [十八、 来源依据规范 (Sources & Citations)](#十八-来源依据规范sources--citations)
- [十九、 受控字典注册表 (Taxonomy Registries)](#十九-受控字典注册表taxonomy-registries)
- [二十、 多媒体平台映射标准 (Media Standard)](#二十-多媒体平台映射标准media-standard)
- [二十一、 视觉展示解耦规范 (Presentation Schema)](#二十一-视觉展示解耦规范presentation-schema)
- [二十二、 SEO 自动化与覆盖策略](#二十二-seo-自动化与覆盖策略)
- [二十三、 构建期实体索引中枢 (Build-Time Entity Registry)](#二十三-构建期实体索引中枢build-time-entity-registry)
- [二十四、 全量自动化校验矩阵 (Validator Rules)](#二十四-全量自动化校验矩阵validator-rules)
- [二十五、 Legacy → V2.0 字段迁移对照总表](#二十五-legacy--v20-字段迁移对照总表)
- [二十六、 七步平滑演进与向后兼容策略](#二十六-七步平滑演进与向后兼容策略)
- [二十七、 新建词条维护工作流](#二十七-新建词条维护工作流)
- [二十八、 全域 11 大核心实体完整实战范例 (Frontmatter + Body)](#二十八-全域-11-大核心实体完整实战范例frontmatter--body)
- [二十九、 决策摘要与实施优先级清单 (Implementation Checklist)](#二十九-决策摘要与实施优先级清单implementation-checklist)

---

## 一、 背景与目标

KAMITSUBAKI FAN WIKI 是一个由粉丝维护的非官方资料系统，记录 KAMITSUBAKI STUDIO 与 THINKR 旗下艺人、唱片、音乐作品、跨媒体企划及历史大事件。

当前系统采用 Astro Content Collections 搭建，涵盖 `zh`、`zh-tw`、`zh-hk`、`ja`、`en` 五大多语言环境。随着收录的歌曲达到数千首（截至 2026 年 9 月统计快照）、专辑上百部、演出近百场，原有的文件路径耦合、硬编码内部 URL 和缺乏规范关系的设计，已难以支撑全景时间轴、制作人作品穿透和形态联动等高阶功能。

本设计规范确立 **Metadata Schema v2.0**，为后续开发与数据重构提供唯一定案基准。

---

## 二、 现有 Schema 深度审计

经完整扫描代码库（`src/content.config.ts`、`src/lib/homeData.mjs`、`src/lib/staticPaths.mjs` 等核心逻辑），当前元数据字段的审计结果如下：

### 2.1 字段分类审计表
| 现有字段名 | 现状所在集合 | 本质属性分类 | 审计结论与处置方案 |
| :--- | :--- | :--- | :--- |
| `translationKey` | 全部集合 | 跨语言标识符 | **过渡保留 (Legacy Compatibility Only)**。当前用于跨语言同实体匹配；在 Schema v2 中实体唯一主键由永久 `id` 全面接管，新增词条不得依赖 translationKey 作为主键，待 Legacy 兼容层退役后可最终移除。 |
| `id` | 全部集合 | 永久实体标识符 | **核心主键**。Schema v2 正式主键，全站唯一、语言无关、路径无关、永久稳定。 |
| `locale` | 全部集合 | 语言标识 | **核心基础字段**。所有语言 Markdown Frontmatter 中必须显式声明（如 `locale: "zh"`）。 |
| `categorySlug` | 路径推导 | 路径耦合分类 | **废弃**。当前 `parseArtistPath` 截取物理目录作为分类，必须删除。 |
| `categoryOrder` / `itemOrder` | artists / songs / albums | 展示排序 | **重构**。移入 `presentation.sortOrder`，与百科事实解耦。 |
| `categoryTitle` / `categorySubtitle` | artists / songs / albums | UI 展示文案 | **废弃**。由前台模板或受控字典生成，不再侵入数据条目。 |
| `artistId` / `artistIds` | songs | 数据库关系 | **规范化重构**。升级为强类型的 `performers` 数组。 |
| `composer` / `lyricist` | songs | 创作者名单 | **规范化重构**。原为纯文本，升级为可生成图谱引用的 `credits`。 |
| `album` (在 song 中) | songs | 归属反向链接 | **废弃**。违反单一事实来源，改由 Release 自动反查生成。 |
| `tracks[].songId` | albums | 数据库关系 | **优秀设计，保留**。Release 单向持有收录关系。 |
| `featuredEntries[].href` | artists | 强行写死死链 | **废弃**。死链风险极高，改由 `relations` 引用目标 ID 动态生成。 |
| `affiliations` | artists | 组织归属 | **重构**。升级为支持历史起止时间的结构化数组。 |
| `status` / `statusLabel` / `inactive` | artists | 混合状态 | **重构**。拆解为清晰的 `lifecycle` 状态机。 |
| `theme` | artists / songs / albums | 视觉色彩 | **保留**。移入 `presentation.theme`。 |

---

## 三、 当前体系的核心问题与风险

1. **路径深度绑定语义 (Path-Coupled Semantics)**：系统依赖文件在哪个目录来推测它是单人还是组合，导致文件不能轻易移动；
2. **多语言事实数据冗余 (Fact Redundancy)**：同一首歌曲的发行日期、制作人、时长在不同语言的 Markdown Frontmatter 中被重复书写；
3. **缺乏反向索引机制 (Lack of Derived Graph)**：查找某位制作人的全部供曲必须全文扫描，效率极低；
4. **状态概念混淆 (Status Overloading)**：将“活动状态”、“自立门户”、“永久归档”混为一个状态字段。

---

## 四、 Schema v2.0 核心设计原则

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              SCHEMA V2.0 五大核心戒律                                  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 路径不表示身份   ── 文件存放路径仅负责存储组织，实体的本质由 ID 与 Relations 决定   │
│ 2. Entity ID 永久稳定── 实体 ID 语言无关、分类无关、永久稳定不变                       │
│ 3. 拒绝写死内部 URL ── 所有内部引用通过 target ID 关联，链接由系统统一生成             │
│ 4. 单一事实来源(SSOT)── 一项事实只在拥有方声明一次（如 Release 声明 Track，Song 不声明）│
│ 5. 事实与叙事分工明确── Frontmatter 管机器可处理的事实，Markdown Body 管人类叙事与解说 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 五、 Content 与 Feature Data 二元分工

全站数据严密划分为两类形态，防止数据模型失真：

```text
KAMITSUBAKI FAN WIKI
│
├─ A. CONTENT ENTRIES (百科独立词条与专栏)
│   │  采用【Markdown + YAML Frontmatter】单文件结构
│   │  一个实体 × 一个语言 = 一个 Markdown 文件
│   │
│   ├── People (独立歌手、制作人、监督团队)
│   ├── Units (音乐演艺组合)
│   ├── Isotopes (音乐同位体)
│   ├── Songs (单曲与作品)
│   ├── Releases (唱片与原声大碟)
│   ├── Lives (演出与大型活动)
│   ├── Organizations (机构、工作室与厂牌)
│   ├── Projects (企划宇宙与多媒体 IP)
│   ├── Lore (世界观、术语与设定住民)
│   └── Articles (深度专栏与考据特稿)
│
└─ B. FEATURE DATA (大型功能型数据集)
    │  采用【结构化聚合 YAML】，不强制一事一文
    │
    ├── Chronicle (全景时间轴数据，按年份分片存储于 src/data/chronicle/)
    └── Reference Gallery (设定资料图库数据，按主体存储于 src/data/galleries/)
```

---

## 六、 核心内容模型：Markdown + Frontmatter 规范

放弃之前讨论的 `entity.yml + locale.md` 物理分离方案，采纳对 Astro 生态与贡献者体验最友好、最不易出错的**单文件内聚模型**：

```text
src/content/people/kaf/
├── zh.md                # 简体中文 (中文唯一人工主源)
├── ja.md                # 日本语 (独立人工维护)
├── en.md                # English (独立人工维护)
├── zh-tw.md             # 繁体中文 (台湾) [由 zh.md 自动生成]
└── zh-hk.md             # 繁体中文 (香港) [由 zh.md 自动生成]
```

### Frontmatter 与 Markdown Body 的边界划分
- **Frontmatter (结构化事实)**：ID、类型、角色、日期、状态机、演艺阵容 (performers)、制作团队 (credits)、曲目单 (tracks)、关联 (relations)、所属机构 (affiliations)、媒体 (media)、曲风 (genres)、标签 (tags)、展示视觉 (presentation)；
- **Markdown Body (叙述性正文)**：人物经历、艺术演进背景、制作访谈、作品赏析、歌词、世界观解析、史料考据长文。

---

## 七、 中文主源与多语言自动化管线

```text
       Authoritative Authored Locales (人工维护主源)
      ┌───────────┬───────────┬───────────┐
      │   zh.md   │   ja.md   │   en.md   │
      │ (中文主源)│ (独立人工)│ (独立人工)│
      └─────┬─────┴───────────┴───────────┘
            │
            ▼ (Traditional Converter 词汇映射管道)
      ┌───────────────────────────────────┐
      │             OpenCC                │
      └─────┬───────────────────────┬─────┘
            ▼                       ▼
        zh-tw.md                zh-hk.md
      (自动生成)              (自动生成)
```

- **多语言铁律**：
  - `zh` 是中文体系内唯一人工主源；
  - `ja` 与 `en` 为独立人工维护语言；
  - `zh-tw` 与 `zh-hk` 由 `zh` 自动派生，包含专属标识注释，严禁手动修改；
- **构建防线**：构建脚本仅抓取人工源，在构建期自动同步繁体副本。

---

## 八、 Entity ID 永久稳定规范

全站所有 Content Entry 与 Feature Item 必须拥有全局唯一的稳定 ID：
- **格式规范**：必须匹配正则 `^[a-z0-9]+(?:-[a-z0-9]+)*$`（纯小写字母、数字、短横线）；
- **语言无关**：不同语言文件（`zh.md`、`ja.md`、`en.md`）必须使用**完全相同的 ID**；
- **永久稳定**：已发布的 ID 不随目录调整或所属 Studio 变动而修改；
- **冲突消解**：若不同领域名称重合，采用后缀消解（如组合用 `vwp`，企划用 `vwp-project`；专辑用 `awakening-album`，单曲用 `awakening-song`）；
- **兼容支持**：支持 `aliases: string[]` 记录历史旧 slug，系统自动配置 301 重定向。

---

## 九、 前台分类不等于底层数据类型

严格解耦以下五个不同维度的概念：
1. **Navigation Category (前台导航入口)**：UI 引导分类（如 `Artists`、`Creators`、`Discography`）；
2. **Entity Type (实体基础类型)**：本体论分类（`person`、`unit`、`work-track`、`work-release` 等）；
3. **Role (实体角色职责)**：兼具多重身份（如 MIMI 拥有 `artist` 与 `composer`，可同时出现在歌手与制作人导航）；
4. **Physical Directory (存储路径)**：工程文件组织位置（仅为磁盘物理路径）；
5. **Canonical URL (规范访问路径)**：由系统通过 `EntityRegistry` 动态计算得出的路由。

---

## 十、 三层数据架构：Domain Fields + Generic Relations + Derived Graph

为了兼顾**编辑录入体验**与**全站图谱自动化**，Schema v2.0 确立三层结构：

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. 领域专用字段 (Domain Fields) ── 高频、业务直观 (performers, credits, tracks, ...) │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. 通用语义关系 (Generic Relations) ── 语义关系 (member-of, persona-related, ...)    │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. 派生图谱引擎 (Derived Graph) ── 构建期将上述两者全部转换为统一 Graph Edge，反向自动推导 │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 十一、 Entity Type Registry (实体类型注册表)

| Entity Type ID | 中文实体类型名称 | 适用主体说明 | 代表性实体验证范例 |
| :--- | :--- | :--- | :--- |
| `person` | 真实人物实体 | 现实中存在的人（歌手、制作人、画师、监督） | カンザキイオリ, PALOW., PIEDPIPER, 廻花 (实体) |
| `virtual-avatar` | 虚拟化身实体 | 以 3D 虚拟形象为活动主体的歌手/艺人 | 花譜, 理芽, 春猿火, ヰ世界情緒, 幸祜, 明透, 存流 |
| `unit` | 演艺/音乐组合 | 多个艺人或创作者组成的合体演艺团体 | V.W.P, Albemuth, VALIS, DUSTCELL, 心世紀, 罪十罰 |
| `software-voice` | 合成声学软件 | 具备人格化设定的语音合成软件/产品 | 可不 (KAFU), 星界, 裏命, 狐子, 羽累 |
| `work-track` | 独立曲目单曲 | 单一录音版本的独立音乐作品 | 《心臓と絡繰》, 《線》, 《侵入》, 《フォニイ》 |
| `work-release` | 唱片发布物 | 包含单曲盘、EP、完整大碟、原声带的发行介质 | 《観測》, 《NEW ROMANCER》, 《運命》, 《神椿市OST》 |
| `project` | 企划宇宙/IP | 跨媒体多矩阵大型企划项目 | 神椿市建設中。, 少女革命計画, 音楽的同位体企划 |
| `organization` | 机构与厂牌 | 母体公司、创作者工作室或唱片发行厂牌 | THINKR, KAMITSUBAKI STUDIO, ALLT, PHENOMENON |
| `live-event` | 演出与活动 | 专场演唱会、演剧式演出、线下展会 | 不可解参(狂), 魔女集会 JOINT SHOW, SINKA LIVE |
| `lore-concept` | 世界观概念 | 神椿市世界观名词、虚构地点、剧情住民 | 魔女特异点, 普遍体, Q市, 森先化歩, 天秤之塔 |
| `editorial-article`| 研究专栏文章 | 深度长篇特稿、商业考据与艺术分析文章 | 花谱廻花双生演进分析, THINKR 资本与 MBO 考据 |

---

## 十二、 Role Registry (职能职责注册表)

| Role ID | 中文职责说明 | 允许多选 | 典型应用范例 |
| :--- | :--- | :---: | :--- |
| `virtual-singer` | 虚拟歌手/歌姬 | 是 | 花谱, 理芽, ヰ世界情绪 |
| `singer-songwriter`| 创作型歌手 | 是 | 廻花 (KAIKA) |
| `vocalist` | 歌手/主唱 | 是 | EMA, 梓川 |
| `composer` | 作曲家 | 是 | カンザキイオリ, Guiano, 大沼パセリ, MIMI |
| `lyricist` | 作词家 | 是 | カンザキイオリ, 香椎モイミ |
| `arranger` | 编曲家 | 是 | 雄之助, 大沼パセリ |
| `producer` | 统括制作人 | 是 | PIEDPIPER |
| `illustrator` | 形象原案/插画师 | 是 | PALOW. |
| `visual-director` | 映像/排版监督 | 是 | 川サキ |
| `scenario-writer` | 世界观/小说编剧 | 是 | 月岛总记 |

---

## 十三、 Relation Type Registry (关系类型注册表)

### 13.1 Authorable Relations (编辑者可手写关系) 与 Derived Inverse (系统反向派生关系)
关系类型严格区分为**作者手写关系 (Authorable)** 与 **系统派生关系 (Derived Inverse)**。编辑者仅在拥有方声明 Authorable 关系，构建引擎通过图谱索引自动推导其反向关系，严禁两端人工重复手写维护。

| Relation Type ID (手写关系) | 逆向关系 (Inverse 派生) | 允许 Source | 允许 Target | 语义与说明 |
| :--- | :--- | :--- | :--- | :--- |
| `member-of` | `has-member` | `person`, `virtual-avatar` | `unit` | 组合成员归属（由个人指向组合） |
| `persona-related` | `persona-related` | `person`, `virtual-avatar` | `person`, `virtual-avatar` | 实体双生形态对位联动 (如 花谱 ⇄ 廻花，对称关系) |
| `voice-source-of` | `based-on-voice` | `person`, `virtual-avatar` | `software-voice` | 声学生源提供关系 (由人类艺人指向同位体，反向为 based-on-voice) |
| `based-on-voice` | `voice-source-of` | `software-voice` | `person`, `virtual-avatar` | 声音模型源自 (由同位体指向声源艺人，反向为 voice-source-of) |
| `fictional-counterpart`| `fictional-counterpart`| `person`, `virtual-avatar` | `lore-concept` | 现实艺人与虚构住民映射 (如 花谱 ➔ 森先化歩，对称关系) |
| `character-designed-by`| `designed-character` | `virtual-avatar`, `software-voice` | `person` | 角色形象原案设计者 (由化身/声库指向画师) |
| `affiliated-with` | `has-affiliated-entity`| 任意实体 | `organization` | 机构、工作室或母体归属关联 |
| `related-project` | `has-related-entity` | 任意实体 | `project` | 深度参与或从属的大型企划 |
| `related-release` | `related-to-event` | `live-event`, `project` | `work-release` | 演出或企划关联发行的正式唱片/影像介质 (如演唱会实况盘) |
| `derived-from` | `derivative-work` | `work-track` | `work-track` | 曲目衍生关系 (Remix/Acoustic ➔ 原曲) |
| `soundtrack-for` | `has-soundtrack` | `work-release` | `project` | 企划或游戏专属原声带 (由唱片指向企划) |
| `theme-song-for` | `has-theme-song` | `work-track` | `project` | 企划或动画主题曲 (由单曲指向企划) |

> **边界说明：关于现实演出场馆 (Venues)**  
> 演出场馆（如日本武道馆、国立代代木第一体育馆）为现实物理设施，已在 Live Event Schema 中通过结构化 `venue: { name, city, country, isVirtual }` 字段原生承载，**严禁将现实场馆作为 `lore-concept` 处理**。因此 `held-at-venue` 与 `venue-for` 关系从首版 Relation Registry 中彻底移除。

---

## 十四、 Relationship Ownership (关系单一所有权规则)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              关系所有权黄金法则 (SSOT)                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 演唱关系：由【Song.performers】声明 ➔ 系统自动反查生成【艺人演唱作品列表】           │
│ 2. 制作名单：由【Song.credits】声明 ➔ 系统自动反查生成【制作人供曲全景矩阵】           │
│ 3. 唱片收录：由【Release.tracks】声明 ➔ 系统自动反查生成【歌曲被哪些唱片收录】          │
│ 4. 演出曲目：由【Live.setlist】声明 ➔ 系统自动反查生成【歌曲现场演出履历】             │
│ 5. 组合成员：由【个人.relations.member-of】声明 ➔ 系统自动反查生成【组合成员名单】     │
│ 6. 同位体声源：由【同位体.relations.based-on-voice】声明 ➔ 系统自动生成【艺人声源输出】 │
│ 7. 机构所属：由【个人/组合.affiliations】声明 ➔ 系统自动生成【Studio 旗下艺人矩阵】     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 十五、 生命状态机体系 (Lifecycle & Permanent Archive)

解耦原本混乱的单一状态字段，建立三维度的 `lifecycle` 规范：

```yaml
lifecycle:
  activity: "active"                   # active (活跃) | hiatus (休眠) | ended (结项/毕业) | unknown
  startedAt: "2018-10-18"             # 出道或成立日期
  endedAt: null                       # 终止日期 (若有)
  archive:
    mode: "none"                      # none (常规运行) | permanent (永久观测归档，如存流)
    archiveDate: null                 # 归档入库日期
    archiveNote: null                 # 归档致辞说明
```

- **独立与毕业的表达**：创作者从神椿自立独立时（如 カンザキイオリ），其活动状态保持 `activity: "active"`，而在 `affiliations` 中记录：
  ```yaml
  affiliations:
    - organization: "kamitsubaki-studio"
      startDate: "2019-10-18"
      endDate: "2023-03-31"
      current: false
      endReason: "independent"        # independent (自立独立) | completed | transferred
  ```

---

## 十六、 五大核心功能在 Metadata 中的落地机制

### 16.1 脑暴功能 01：四位一体形态切换器 (Entity Morphing Switcher)
- **底层百科语义**：通过 `relations` 保留最真实的跨实体关系；
- **前端展示分组**：通过 `presentation.morphing` 声明 UI 滑块分组：
  ```yaml
  # 花谱 (kaf/zh.md)
  relations:
    - type: "persona-related"
      target: "kaika"
    - type: "voice-source-of"
      target: "kafu"
    - type: "fictional-counterpart"
      target: "morisaki-kaho"
  presentation:
    morphing:
      group: "kaf-family"
      slot: "virtual-artist"
      order: 1
  ```
  前台组件通过 `presentation.morphing.group` 自动聚合并排展示滑块。

### 16.2 脑暴功能 02：制作人与曲风流派透视 (Creator & Genre Perspective)
- **不建第二套数据**：完全由系统扫描全域 `Song.credits` 与 `Song.genres` 自动生成制作人矩阵（作词、作曲、编曲作品分类清单）与曲风聚合页；
- **防伪造机制**：曲风必须来自受控词表 `genres.yml`。

### 16.3 脑暴功能 03：全景时间轴的多轨并行数据联动
- 详见独立的 `feature-data-architecture.md` 文档。时间轴中的 `related` 数组引用百科词条 ID，词条详情页自动反查时间轴足迹。

### 16.4 脑暴功能 04：概念悬浮气泡卡片 (Lore Hover Card) 与 WikiLink
- **不单独建数据文件**：支持内部标记语法 `[[entity-id|显示文字]]`（如 `[[sinka-live|SINKA LIVE]]`）；
- 构建引擎通过 `entity-id` 查 Registry，直接抽取其 `name`、`summary`、`presentation.image`、`entityType`，在鼠标悬停时弹出高科技微卡片。

### 16.5 脑暴功能 05：历史归属与永久归档 (Permanent Archive & Independence)
- 存流 (ARU) 等实体在 `lifecycle.archive.mode: "permanent"` 激活时，前台自动加载微光幽蓝粒子质感与 `STATUS: PERMANENT OBSERVATION` 专属徽章。

---

## 十七、 全域 11 大核心实体 Schema 字段规范表

### 17.1 People Schema (个人歌手、创作者、监督团队)
适用实体：花谱、理芽、廻花、カンザキイオリ、Guiano、MIMI、PALOW.、PIEDPIPER 等。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 全局唯一 ID |
| `entityType` | `enum` | **是** | `person` \| `virtual-avatar` |
| `name` | `string` | **是** | 本地化展示名称 |
| `romanizedName`| `string` | **是** | 罗马音/英文展示名 |
| `ruby` | `string` | 否 | 日文平假名注音 |
| `roles` | `string[]` | **是** | 引自 Role Registry |
| `lifecycle` | `object` | **是** | 见第 15 章生命状态机 |
| `affiliations` | `array` | 否 | 机构归属历史区间 |
| `relations` | `array` | 否 | 见第 13 章关系注册表 |
| `officialLinks` | `array` | 否 | 官方主页、SNS 链接 |
| `presentation` | `object` | 否 | 主题色、封面立绘、形态滑块 |
| `sources` | `array` | 否 | 资料依据引证 |

### 17.2 Unit Schema (音乐与演艺组合)
适用实体：V.W.P、Albemuth、VALIS、DUSTCELL、心世紀、罪十罰。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 组合 ID (如 `vwp`) |
| `entityType` | `literal` | **是** | 固定为 `unit` |
| `name` / `romanizedName` | `string` | **是** | 组合中英文名称 |
| `roles` | `string[]` | **是** | 演艺定位 (如 `["virtual-group"]`) |
| `lifecycle` | `object` | **是** | 成立与活动状态 |
| `affiliations` | `array` | 否 | 归属厂牌与工作室 |
| `relations` | `array` | 否 | 关联企划 (成员由个体声明，此处不维护) |

### 17.3 Isotope Schema (音乐同位体合成声库)
适用实体：可不、星界、裏命、狐子、羽累。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 软件 ID (如 `kafu`) |
| `entityType` | `literal` | **是** | 固定为 `software-voice` |
| `voiceEngines` | `array` | **是** | `[{ engine: "cevio-ai", releaseDate: "..." }]` |
| `relations` | `array` | **是** | **必须包含** `based-on-voice: "xxx"` |
| `commercialLicense`| `object` | 否 | 二创商用授权级别说明 |

### 17.4 Song Schema (曲目与乐谱元数据)
适用实体：全域数千首音乐单曲。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 曲目稳定 ID |
| `entityType` | `literal` | **是** | 固定为 `work-track` |
| `title` / `romanizedTitle` | `string` | **是** | 正式曲名 |
| `releaseDate` | `string` | 否 | 首发公开日期 |
| `duration` | `string` | 否 | `MM:SS` 格式时长 |
| `performers` | `array` | **是** | `[{ entity: string, role: string }]` |
| `credits` | `array` | **是** | 词曲编混制作名单 (支持 entity 与 name) |
| `relations` | `array` | 否 | `derived-from` (原曲衍生), `theme-song-for` |
| `genres` | `string[]` | 否 | 引自 `genres.yml` 受控词典 |
| `tags` | `string[]` | 否 | 分类标签 (如 `official-milestone`) |
| `media` | `array` | 否 | YouTube / Apple Music / Spotify 映射 |

### 17.5 Release Schema (唱片与作品编目)
适用实体：正规专辑 (Album)、EP、限定单曲盘 (Single)、原声带 (Soundtrack)、Live 音源。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 唱片 ID (如 `kansoku`) |
| `entityType` | `literal` | **是** | 固定为 `work-release` |
| `releaseType` | `enum` | **是** | `album` \| `ep` \| `single` \| `soundtrack` \| `live-album` |
| `releaseDate` | `string` | **是** | 官方发行日期 |
| `primaryArtist`| `string` | 否 | 挂名核心艺人/组合 ID |
| `label` | `string` | 否 | 关联厂牌 ID |
| `catalogNumber`| `string` | 否 | 商品番号 |
| `tracks` | `array` | **是** | 官方曲目序列清单 (唯一收录事实源) |
| `editions` | `array` | 否 | 见第 17.6 章多版本体系 |

### 17.6 Edition Schema (版本与限定物理介质)
记录 α/β 双版、通常盘、初回 BOX 等物理特典配置：
```yaml
editions:
  - id: "alpha"
    name: "α版 (Alpha)"
    format: "cd-special-box"
    catalogNumber: "ANTCD-46501"
    bonusItems: ["PALOW. 绘制原画立牌"]
```

### 17.7 Project Schema (企划宇宙与多媒体 IP)
适用实体：神椿市建設中。、少女革命計画、音楽的同位体企划。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 企划 ID |
| `entityType` | `literal` | **是** | 固定为 `project` |
| `status` | `enum` | **是** | 企划推进状态 (`active` \| `completed` \| `frozen`)，区别于自然人实体的 `lifecycle` |
| `subProjects` | `array` | 否 | 子专案清单 (动画、各游戏、小说) |

### 17.8 Organization Schema (组织机构、工作室与厂牌)
适用实体：THINKR、旗下各大创意工作室与实验室（KAMITSUBAKI STUDIO / KYOKAI STUDIO / ALLT STUDIO / PHASE STUDIO / QA STUDIO / UNKNOWN LAB）、唱片厂牌、PNDR 平台。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 机构 ID |
| `entityType` | `literal` | **是** | 固定为 `organization` |
| `orgType` | `enum` | **是** | `parent-company` \| `creative-studio` \| `record-label` \| `platform` |
| `parentOrg` | `string` | 否 | 上级母体 ID (如 `thinkr`) |

### 17.9 Live / Event Schema (现场演出与大型活动)
适用实体：不可解系列、魔女集会系列、SINKA LIVE、代代木 ARENA 决战、官方魔女展。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 演出 ID (如 `fukakai-san-kyou`) |
| `entityType` | `literal` | **是** | 固定为 `live-event` |
| `eventType` | `enum` | **是** | `oneman-live` \| `joint-live` \| `xr-sinka-live` \| `exhibition` |
| `dateRange` | `object` | **是** | `{ start: "...", end: "..." }` |
| `venue` | `object` | 否 | 场馆信息 `{ name: "日本武道館", city: "Tokyo" }` |
| `headliners` | `string[]` | **是** | 领衔主力艺人 ID |
| `setlist` | `array` | 否 | 完整曲目单 (引用 `songId`) |

### 17.10 Lore Schema (世界观、术语与设定住民)
适用实体：魔女特异点、普遍体、Q市、天秤之塔、森先化歩、谷置狸眼。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 概念 ID |
| `entityType` | `literal` | **是** | 固定为 `lore-concept` |
| `loreCategory` | `enum` | **是** | `glossary-term` \| `fictional-resident` \| `geography` \| `concept` |
| `relations` | `array` | 否 | `fictional-counterpart` (对应现实艺人) |

### 17.11 Article Schema (深度专栏与考据特稿)
适用实体：6 篇深度研究与考据长文 (基于 2026-09 统计快照)。

| 字段名 | 类型 | 必填 | 说明 |
| :--- | :--- | :---: | :--- |
| `schemaVersion` | `number` | **是** | 固定为 `2` |
| `id` | `string` | **是** | 文章 ID (如 `kaika-artistic-evolution`) |
| `entityType` | `literal` | **是** | 固定为 `editorial-article` |
| `articleCategory`| `enum` | **是** | `business` \| `art-philosophy` \| `profile` \| `infrastructure` \| `archival` |
| `author` | `string` | **是** | 执笔作者或编辑部代号 |
| `publishDate` | `string` | **是** | 初版发布日期 |
| `relatedEntities`| `string[]`| 否 | 特稿深入探讨的核心实体 ID 数组 |

---

## 十八、 来源依据规范 (Sources & Citations)

所有客观事实字段与专栏分析支持依据凭据：
```yaml
sources:
  - id: "src-kaika-announcement"
    type: "official-site"              # official-site | press-release | interview | physical-liner-notes
    title: "廻花 始動告知"
    publisher: "KAMITSUBAKI STUDIO"
    url: "https://kamitsubaki.jp/news/2024/01/14/01/"
    publishedAt: "2024-01-14"
```

---

## 十九、 受控字典注册表 (Taxonomy Registries)

在 `src/data/taxonomy/` 建立受控字典，禁止在前台 Frontmatter 中自由输入无规则字符串：
- `genres.yml`：`literature-rock`, `urban-r-and-b`, `future-bass`, `poetic-edm`, `speed-piano-pop`, `gothic-pop`, `rap-spoken-word` 等；
- `tags.yml`：官方标签与编辑部分类标签（编辑部标签必须带有 `editorial:` 前缀，如 `editorial:double-edged-philosophy`，严禁将编辑部分析伪装为官方设定）。

---

## 二十、 多媒体平台映射标准 (Media Standard)

解耦特定流媒体平台，统一收纳于 `media` 数组：
```yaml
media:
  - platform: "youtube"
    type: "music-video"
    id: "f3j2i9A1bc"
    url: "https://www.youtube.com/watch?v=f3j2i9A1bc"
  - platform: "apple-music"
    type: "track-stream"
    id: "1735849259"
  - platform: "spotify"
    type: "track-stream"
    id: "4uLU6hMCjMI75M1A2"
```

---

## 二十一、 视觉展示解耦规范 (Presentation Schema)

```yaml
presentation:
  image: "/images/artists/kaf.jpg"
  theme:
    accentColor: "#F29AC2"
    surfaceColor: "#111321"
    palette:
      - { label: "花譜粉", value: "#F29AC2" }
      - { label: "深渊蓝", value: "#111321" }
  badge: "01"
  sortOrder: 1
```

---

## 二十二、 SEO 自动化与覆盖策略

所有词条的 SEO 标题与摘要默认在构建期**由系统全自动推导**：
- 默认 Title：`{name} ({romanizedName}) · KAMITSUBAKI FAN WIKI`
- 默认 Description：自动截取 Markdown 正文首段摘要
- Frontmatter 仅提供非必须的覆盖项：
  ```yaml
  seo:
    titleOverride: "花譜 (KAF) 全景深度档案"
    noindex: false
  ```

---

## 二十三、 构建期实体索引中枢 (Build-Time Entity Registry)

在构建期，Astro 构建管道通过静态中枢解析全部实体并派生全网双向 Graph：
```typescript
// 核心 API 规范
resolveEntity(id: string): UnifiedEntity;
resolveEntityUrl(id: string, locale: string): string; // 根据 entityType 动态计算 URL，绝不依赖路径
getIncomingRelations(id: string): GraphEdge[];        // 自动获取所有反向关联 (谁收录了我、谁参与了我)
getOutgoingRelations(id: string): GraphEdge[];        // 获取主动声明的关系
```

---

## 二十四、 全量自动化校验矩阵 (Validator Rules)

开发 `scripts/validate-content.mjs`，在 CI/CD 与构建前执行强制校验：
1. **全局唯一性**：检查全站所有实体 ID 是否绝对唯一；
2. **关系孤岛与断链**：检查所有 `relations.target`、`performers.entity`、`credits.entity`、`tracks.songId` 是否真实存在，发现死链立即报错并阻断构建；
3. **受控词表校验**：检查曲目的 `genres` 是否引自合法的 `genres.yml`；
4. **多语言对齐**：检查是否存在缺失主源 `zh.md` 的孤儿条目。

---

## 二十五、 Legacy → V2.0 字段迁移对照总表

| 旧版字段 (Legacy) | 新版对应规范 (Schema v2.0) | 迁移执行策略 |
| :--- | :--- | :--- |
| `code: "01"` | `presentation.badge: "01"` | 移入展示层 |
| `categoryOrder` / `itemOrder` | `presentation.sortOrder` | 移入展示层 |
| `categoryTitle` / `categorySubtitle` | *(废弃，由前台模板生成)* | 确认前台模板已就绪后清除；迁移脚本必须记录日志，不得无校验静默删除 |
| `artistId` / `artistIds` | `performers: [{ entity: id, role: "lead-vocal" }]` | 转换为强类型演唱列表 |
| `composer` (纯字符串) | `credits: [{ role: "composer", entity: id }]` | 匹配制作人 ID，未匹配存 name；无法映射时保留旧字段并输出 migration warning |
| `lyricist` (纯字符串) | `credits: [{ role: "lyricist", entity: id }]` | 匹配制作人 ID，未匹配存 name；无法映射时保留旧字段并输出 migration warning |
| `album` (在 song 中) | *(废弃，由 Release 反向索引生成)* | 确认 Release.tracks 反向映射完整无漏后方可清除；未匹配曲目生成 migration warning 并记录至 report |
| `featuredEntries[].href` | `relations: [{ type: "...", target: id }]` | 提取末段 slug 转换为 target ID；无法解析的链接保留并告警 |
| `affiliations` (纯字符串数组) | `affiliations: [{ organization: id, current: true }]`| 转换为结构化机构数组 |
| `status: "ACTIVE"` | `lifecycle: { activity: "active" }` | 规范化状态机 |
| `inactive: true` | `requires classification` | **严禁自动映射为永久归档**。必须人工分类复核：常规活动结束设置 `activity: "ended"`；仅当确认符合永久观测归档语义时（如存流）方可设置 `archive: { mode: "permanent" }` |

### 迁移安全铁律 (Migration Safety Guardrails)
1. **禁止静默删除 (No Silent Dropping)**：迁移脚本不得在无法确认映射成功时静默删除任何旧字段。
2. **三态处置原则**：
   - 映射完全成功：写入新字段，安全清理旧字段；
   - 无法完全映射：保留旧字段不丢失，终端输出详细 Warning；
   - 人工复核确认后：人工签署清理。
3. **强制审计日志**：迁移执行必须输出 `migration-report.json`，详细记录每个文件的旧值、新值、未匹配条目与回退保护。

---

## 二十六、 七步平滑演进与向后兼容策略

1. **Phase 0 (规范确立)**：本设计规范审核冻结；
2. **Phase 1 (词表基建)**：建立受控词典（`genres.yml` 等）；
3. **Phase 2 (双模兼容 Loader)**：改造 `src/content.config.ts`，支持旧字段向新结构的动态转换；
4. **Phase 3 (脚本开发)**：编写自动化迁移脚本与数据校验工具；
5. **Phase 4 (标杆试点)**：选取花谱、V.W.P、可不、《心臓と絡繰》4 个词条先行试转并验证页面；
6. **Phase 5 (全量迁移)**：全量脚本跑通存量曲目与专辑，跑通自动化校验；
7. **Phase 6 (前台切换与旧代码退役)**：前台页面改用 `EntityRegistry`，完全移除旧逻辑。

---

## 二十七、 新建词条维护工作流

对于后续人工或 Agent 添加新词条，严格遵循以下 4 步工作流：
1. **确立稳定 ID**：选定简短、语义清晰的 kebab-case 全局唯一 ID（如 `new-song`）；
2. **建立中文主源**：创建 `src/content/{collection}/{id}/zh.md`；
3. **填写 Frontmatter 与正文**：
   - 在 Frontmatter 严格按照字段表填入结构化事实与关系 ID；
   - 在 Markdown Body 撰写中文介绍、背景与歌词；
4. **运行验证与自动生成**：
   - 执行 `pnpm validate:content` 确保无断链与非法字段；
   - 执行 `pnpm i18n:generate` 自动由 `zh.md` 派生繁体版本。

---

## 二十八、 全域 11 大核心实体完整实战范例 (Frontmatter + Body)

以下范例全部采用真实神椿数据编写，生动呈现 Frontmatter 事实与 Markdown Body 叙述的分工：

### 范例 1：个人虚拟艺人 —— 花谱 (`src/content/people/kaf/zh.md`)
```markdown
---
schemaVersion: 2
id: "kaf"
locale: "zh"
entityType: "virtual-avatar"
name: "花譜"
romanizedName: "KAF"
ruby: "かふ"
roles:
  - "virtual-singer"

lifecycle:
  activity: "active"
  startedAt: "2018-10-18"

affiliations:
  - organization: "kamitsubaki-studio"
    type: "studio"
    startDate: "2019-10-18"
    current: true

relations:
  - type: "member-of"
    target: "vwp"
  - type: "persona-related"
    target: "kaika"
  - type: "voice-source-of"
    target: "kafu"
  - type: "fictional-counterpart"
    target: "morisaki-kaho"
  - type: "character-designed-by"
    target: "palow"

officialLinks:
  - platform: "official-site"
    label: "花譜 官方网站"
    url: "https://kaf.kamitsubaki.jp/"
  - platform: "youtube"
    label: "花譜 官方 YouTube 频道"
    url: "https://www.youtube.com/@kaf_official"

presentation:
  image: "/images/artists/kaf.jpg"
  theme:
    accentColor: "#F29AC2"
    surfaceColor: "#111321"
    palette:
      - { label: "花譜粉", value: "#F29AC2" }
      - { label: "深渊蓝", value: "#111321" }
  morphing:
    group: "kaf-family"
    slot: "virtual-artist"
    order: 1
---

## 概述

花譜是 KAMITSUBAKI STUDIO 旗下最早公开活动的虚拟歌手，也是虚拟歌手组合 V.W.P 的核心成员之一。她在 2018 年 10 月正式出道，不公开真实容貌，而以 3D 虚拟形象展开音乐活动。

在神椿体系中，花譜是厂牌创立的原点，曾于 2022 年在日本武道馆举办 3rd ONE-MAN LIVE「不可解参(狂)」，并在 2024 年于代代木竞技场「怪歌」中公开了实体创作歌手平行企划「廻花」。

## 音乐风格与创作脉络

早期主要作品由词曲作家カンザキイオリ制作，构筑了独特的文学摇滚与自白叙事风格。2021 年起，花譜开启了与多位现实流行音乐人合作的「组曲」企划，持续拓宽表达边界。
```

### 范例 2：旗舰音乐组合 —— V.W.P (`src/content/units/vwp/zh.md`)
```markdown
---
schemaVersion: 2
id: "vwp"
locale: "zh"
entityType: "unit"
name: "V.W.P"
romanizedName: "Virtual Witch Phenomenon"
roles:
  - "virtual-group"

lifecycle:
  activity: "active"
  startedAt: "2021-03-13"

affiliations:
  - organization: "phenomenon-record"
    type: "record-label"
    current: true

relations:
  - type: "affiliated-with"
    target: "kamitsubaki-studio"
  - type: "related-project"
    target: "kamitsubaki-city"

presentation:
  image: "/images/artists/vwp.jpg"
  theme:
    accentColor: "#9333ea"
---

## 组合简介

V.W.P（Virtual Witch Phenomenon - 虚拟魔女现象）是由花譜、理芽、春猿火、ヰ世界情緒、幸祜五位虚拟歌手共同组成的旗舰音乐组合。该组合在 2021 年 3 月花譜「不可解弐 Q2」演唱会中正式宣告结成。

其代表唱片包括正规大碟《運命》与《覚醒》，并演唱了多媒体企划《神椿市建設中。》的系列主题曲。
```

### 范例 3：核心统括制作人 —— PIEDPIPER (`src/content/people/piedpiper/zh.md`)
```markdown
---
schemaVersion: 2
id: "piedpiper"
locale: "zh"
entityType: "person"
name: "PIEDPIPER"
romanizedName: "PIEDPIPER"
roles:
  - "producer"

lifecycle:
  activity: "active"

affiliations:
  - organization: "thinkr"
    type: "parent-company"
    current: true
  - organization: "kamitsubaki-studio"
    type: "studio"
    current: true

officialLinks:
  - platform: "x"
    label: "PIEDPIPER 个人官方 X"
    url: "https://x.com/PIEDPIPER"
---

## 个人简介

PIEDPIPER 是株式会社 THINKR 的创始人及统括制作人，也是神椿工作室（KAMITSUBAKI STUDIO）全企划的主策划。他主导了花谱出道、五魔女发掘、音乐同位体系列孵化以及神椿市世界观企划的统括构建。
```

### 范例 4：官方音乐同位体 —— 可不 (`src/content/isotopes/kafu/zh.md`)
```markdown
---
schemaVersion: 2
id: "kafu"
locale: "zh"
entityType: "software-voice"
name: "可不"
romanizedName: "KAFU"
ruby: "かふ"
roles:
  - "software-voice"

lifecycle:
  activity: "active"
  startedAt: "2021-07-07"

voiceEngines:
  - engine: "cevio-ai"
    releaseDate: "2021-07-07"
  - engine: "synthesizer-v"
    releaseDate: "2024-04-18"

relations:
  - type: "based-on-voice"
    target: "kaf"

commercialLicense:
  tier: "open-derivative"
  allowCommercial: true

officialLinks:
  - platform: "official-site"
    label: "音楽的同位体 公式网站"
    url: "https://musical-isotope.kamitsubaki.jp/"

presentation:
  image: "/images/artists/kafu.jpg"
  theme:
    accentColor: "#facc15"
  morphing:
    group: "kaf-family"
    slot: "isotope"
    order: 3
---

## 软件简介

可不（KAFU）是以虚拟歌手花譜的声音特征作为基础建模开发的官方音乐同位体语音合成声库。2021 年 7 月基于 Techno-Speech 的 CeVIO AI 引擎首发，2024 年新增了 Dreamtonics 的 Synthesizer V AI 双引擎版本。

其著名衍生殿堂曲包括《フォニイ》、《キュートなカノジョ》、《マーシャル・マキシマイザー》等。
```

### 范例 5：代表性单曲 —— 《心臓と絡繰》 (`src/content/songs/shinzo-to-karakuri/zh.md`)
```markdown
---
schemaVersion: 2
id: "shinzo-to-karakuri"
locale: "zh"
entityType: "work-track"
title: "心臓と絡繰"
romanizedTitle: "Shinzou to Karakuri"
ruby: "しんぞうとからくり"
releaseDate: "2018-12-28"
duration: "04:14"

performers:
  - entity: "kaf"
    role: "lead-vocal"

credits:
  - role: "lyricist"
    entity: "kanzaki-iori"
  - role: "composer"
    entity: "kanzaki-iori"
  - role: "arranger"
    entity: "kanzaki-iori"

genres:
  - "literature-rock"

media:
  - platform: "youtube"
    type: "music-video"
    id: "f3j2i9A1bc"
    url: "https://www.youtube.com/watch?v=f3j2i9A1bc"
---

## 作品解说

《心臓と絡繰》是花譜早期发布的代表性原创单曲之一，由カンザキイオリ包办词曲与编曲。该曲以深沉的钢琴和弦与激烈的鼓点开场，探讨了青春期对于自身存在形态的迷茫与坚守。

## 歌词

{{lyrics-controls::zh}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>ほんの<rt class="roma">honno</rt></ruby><ruby>一部<rt class="furi">いちぶ</rt><rt class="roma">ichibu</rt></ruby><ruby>だけ<rt class="roma">dake</rt></ruby><ruby>見<rt class="furi">み</rt><rt class="roma">mi</rt></ruby><ruby>せ<rt class="roma">se</rt></ruby><ruby>た<rt class="roma">ta</rt></ruby><ruby>だけ<rt class="roma">dake</rt></ruby><ruby>で<rt class="roma">de</rt></ruby>
</div>
<div class="cn-lyric">只给你看了一小部分</div>
</div>

<div class="lyric-line">
<div class="jp-lyric">
<ruby>全<rt class="furi">すべ</rt><rt class="roma">sube</rt></ruby><ruby>て<rt class="roma">te</rt></ruby><ruby>読<rt class="furi">よ</rt><rt class="roma">yo</rt></ruby><ruby>ま<rt class="roma">ma</rt></ruby><ruby>れ<rt class="roma">re</rt></ruby><ruby>たら<rt class="roma">tara</rt></ruby><ruby>どう<rt class="roma">dou</rt></ruby><ruby>しよ<rt class="roma">shiyo</rt></ruby><ruby>う<rt class="roma">u</rt></ruby>
</div>
<div class="cn-lyric">要是全都被看穿了怎么办</div>
</div>

</div>
```

### 范例 6：正规录音室大碟 —— 《観測》 (`src/content/releases/kansoku/zh.md`)
```markdown
---
schemaVersion: 2
id: "kansoku"
locale: "zh"
entityType: "work-release"
title: "観測"
romanizedTitle: "Kansoku"
releaseType: "album"
releaseDate: "2019-09-11"
primaryArtist: "kaf"
label: "phenomenon-record"
catalogNumber: "ANTCD-46500"

tracks:
  - disc: 1
    number: "01"
    songId: "kakushin-instrumental"
  - disc: 1
    number: "02"
    songId: "ito"
  - disc: 1
    number: "03"
    songId: "wasurete-shimae"
  - disc: 1
    number: "04"
    songId: "shinzo-to-karakuri"

editions:
  - id: "alpha"
    name: "α版 (Alpha)"
    catalogNumber: "ANTCD-46501"
  - id: "beta"
    name: "β版 (Beta)"
    catalogNumber: "ANTCD-46502"
---

## 专辑介绍

《観測》是花譜的第一张正规录音室大碟，汇聚了她出道前十一个月内由カンザキイオリ制作的全部主力原创曲目。实体专辑推出了视觉设计完全不同的 α 版与 β 版双包装。
```

### 范例 7：多媒体企划 —— 少女革命計画 (`src/content/projects/girls-revolution/zh.md`)
```markdown
---
schemaVersion: 2
id: "girls-revolution"
locale: "zh"
entityType: "project"
title: "少女革命計画"
romanizedTitle: "Girls Revolution Project"
status: "active"
startDate: "2024-03-01"

relations:
  - type: "affiliated-with"
    target: "thinkr"

subProjects:
  - "心世紀 (Sinseiki)"
  - "罪十罰 (Tsumitobatsu)"
---

## 企划概述

少女革命計画是 THINKR 于 2024 年推出的原创跨次元 IP 企划。通过心世纪与罪十罚两个虚拟歌手三人组，结合 3D 短片戏剧、音乐发行与跨次元演艺，构建全新叙事宇宙。
```

### 范例 8：组织工作室 —— KAMITSUBAKI STUDIO (`src/content/organizations/kamitsubaki-studio/zh.md`)
```markdown
---
schemaVersion: 2
id: "kamitsubaki-studio"
locale: "zh"
entityType: "organization"
name: "KAMITSUBAKI STUDIO"
romanizedName: "KAMITSUBAKI STUDIO"
orgType: "creative-studio"
foundingDate: "2019-10-18"
parentOrg: "thinkr"

relations:
  - type: "affiliated-with"
    target: "thinkr"
---

## 工作室简介

KAMITSUBAKI STUDIO 是株式会社 THINKR 旗下专门面向虚拟艺人孵化、多媒体世界观创作与先锋音乐发行的创意工作室。旗下拥有花谱、理芽、春猿火、ヰ世界情緒、幸祜等核心虚拟艺人。
```

### 范例 9：旗舰现场演出 —— 不可解参(狂) (`src/content/lives/fukakai-san-kyou/zh.md`)
```markdown
---
schemaVersion: 2
id: "fukakai-san-kyou"
locale: "zh"
entityType: "live-event"
title: "花譜 3rd ONE-MAN LIVE「不可解参(狂)」"
romanizedTitle: "KAF 3rd ONE-MAN LIVE 'Fukakai San (Kyou)'"
eventType: "oneman-live"

dateRange:
  start: "2022-08-24"
  end: "2022-08-24"

venue:
  name: "日本武道館"
  city: "Tokyo"
  country: "JP"
  isVirtual: false

organizer: "thinkr"
headliners:
  - "kaf"

guestPerformers:
  - "vwp"
  - "hoshimachi-suisei"

setlist:
  - number: "01"
    songId: "shinzo-to-karakuri"
  - number: "02"
    songId: "ito"

relations:
  - type: "related-release"
    target: "fukakai-san-live-album"
---

## 演出回顾

2022 年 8 月 24 日，花譜于日本武道馆成功举办了个人 3rd ONE-MAN LIVE「不可解参(狂)」。这是虚拟歌手领域首度在武道馆举办大规模单人专场，全场门票售罄，推特全球趋势达到第一。
```

### 范例 10：世界观专有名词 —— 魔女特异点 (`src/content/lore/singularity/zh.md`)
```markdown
---
schemaVersion: 2
id: "singularity"
locale: "zh"
entityType: "lore-concept"
name: "魔女特异点"
romanizedName: "Witch Singularity"
loreCategory: "glossary-term"
belongToUniverse: "kamitsubaki-verse"
---

## 术语定义

在神椿世界观中，「魔女特异点」是指持有特殊声波振动频率、能够干涉世界物理法则并扭转崩落态的特定个体。在神椿市平行线中，五位魔女分别对应不同的特异点核心。
```

### 范例 11：深度专栏文章 —— 花谱廻花双生演进深度分析 (`src/content/articles/kaika-artistic-evolution/zh.md`)
```markdown
---
schemaVersion: 2
id: "kaika-artistic-evolution"
locale: "zh"
entityType: "editorial-article"
title: "花谱与廻花双生艺术演进深度分析：跨越虚拟皮套边界的二刀流创作哲学"
romanizedTitle: "Analysis on KAF and KAIKA Dual-Form Evolution"
articleCategory: "art-philosophy"
author: "LinkTh1rsty"
publishDate: "2026-09-17"

relatedEntities:
  - "kaf"
  - "kaika"
---

## 引言

2024 年 1 月 14 日，代代木第一体育馆「怪歌」演唱会的末尾，大屏幕上打出了打破虚拟外壳的文字。这一刻标志着神椿从单一的虚拟歌姬偶像模式，跃迁至虚实并进的复合二刀流艺术探索。

## 虚拟皮套与身体性的解构

对于传统 VTuber 而言，皮套既是保护屏障也是表现枷锁。花谱公开廻花，并非放弃虚拟身份，而是将“虚拟躯体”与“现实肉身”置于同等平行的创作对位线上……
```

---

## 二十九、 决策摘要与实施优先级清单 (Implementation Checklist)

### 决策摘要 (Decisions Locked)
1. **内容存储彻底确立单文件内聚模型**：采用 `Markdown + Frontmatter`，弃用 `entity.yml + locale.md` 物理分离；
2. **多语言以简中为中文唯一人工主源**：繁体通过构建脚本动态生成，杜绝维护负担；ja 与 en 为独立人工维护语言；
3. **关系采用 Domain Fields + Generic Relations**：高频字段语义清晰，构建时自动派生反向图谱；
4. **歌曲歌词注音保持现行体系 (100% 兼容)**：歌词注音维持目前的写法，继续内嵌在各语言的 Markdown Body 中（采用标准的 HTML `<ruby>` / `<rt class="furi">` / `<rt class="roma">` 结构与 `{{lyrics-controls}}` 机制），不拆分为外部独立文件，彻底保障现有歌词文件 (基于 2026-09 统计快照，包含多语言版本) 的稳定性与兼容性。

### 实施优先级清单
- **P0（基础设施）**：创建 `src/data/taxonomy/` 受控词典，建立 `src/lib/entityRegistry.ts` 核心框架；
- **P1（数据加载与迁移脚本）**：改造 `src/content.config.ts` 兼容层，编写自动化迁移脚本；
- **P2（全量数据清洗）**：执行迁移脚本，清洗存量数据，通过 `validate:content` 强校验；
- **P3（前台组件适配）**：升级各前台页面，基于 Registry 动态渲染关系与链接。
