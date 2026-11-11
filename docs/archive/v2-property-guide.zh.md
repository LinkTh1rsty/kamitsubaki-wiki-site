# V2 historical reference — superseded by Metadata Schema v2

## 属性块指南

在编辑词条时，看不懂属性块的含义？在这里将会进行解释：

### 公有部分

以下属性是各类别词条共有的内容：
- locale：表记该文档版本，分为zh(中文)、en(英文)、ja(日文)三类。请按照所编辑词条的语言来填写。
- translationKey：多语言版本之间的共同标识。中文、日文、英文对应文件填写相同值。

**写法实例：**

```yaml
locale: zh
translationKey: kaf-originals-shi
```

**实际作用：** 当前文件加入中文内容集合，并与使用同一 `translationKey` 的日文、英文文件关联。

### 艺人部分

**最小实例：**

```yaml
name: 花譜
romanizedName: KAF
statusLabel: 活动状态
status: 活动中
image: /images/artists/kaf.webp
```

**显示结果：** 艺人页会以“花譜 / KAF”为标题，并显示状态和人物图片。

|            属性             |       类型       | 必填  |                   作用与填写内容                    |
| :-----------------------: | :------------: | :---: | :------------------------------------------: |
|         `locale`          | `zh / ja / en` |  是  |                    当前词条语言                    |
|     `translationKey`      |      字符串       |  是  |               同一人物不同语言版本的共同标识                |
|          `code`           |      字符串       |  否  |                人物编号、档案编号或内部代码                |
|          `name`           |      字符串       |  是  |                 当前语言中显示的人物名称                 |
|      `romanizedName`      |      字符串       |  是  |               罗马字、拉丁字母名称或国际显示名               |
|      `categoryTitle`      |      字符串       |  否  |                   所属分类的主标题                   |
|    `categorySubtitle`     |      字符串       |  否  |                所属分类的副标题或英文说明                 |
|      `categoryOrder`      |       数字       |  否  |              分类之间的排序值，较小值通常排在前面              |
|        `itemOrder`        |       数字       |  否  |                当前人物在所属分类内的排序值                |
|          `meta`           |      字符串       |  否  |           列表卡片上的简短元信息，例如身份、所属或一句概括           |
|        `debutDate`        |      字符串       |  否  |    出道日期。建议统一写为 `YYYY-MM-DD`     |
|     `profileTagline`      |      字符串       |  否  |                 人物详情页上的简介标语                  |
|      `designCredits`      |     字符串数组      |  否  |             角色设计、视觉设计、建模等制作人员名单              |
|      `affiliations`       |     字符串数组      |  否  |                所属厂牌、组合、企划或机构                 |
|      `officialLinks`      |      对象数组      |  否  |                 官方网站和官方社交链接                  |
|  `officialLinks[].label`  |      字符串       |  是  |      链接名称，例如 `Official Site`、`YouTube`       |
|  `officialLinks[].href`   |      字符串       |  是  |                    官方链接地址                    |
|     `featuredEntries`     |      对象数组      |  否  |                 人物页重点关联的其他词条                 |
| `featuredEntries[].label` |      字符串       |  是  |                   关联内容显示名称                   |
| `featuredEntries[].href`  |      字符串       |  是  |                    对应词条路径                    |
| `featuredEntries[].kind`  |      固定枚举      |  是  | 关联内容类型，只能是 `artist`、`project`、`album`、`song` |
|          `theme`          |     公共主题对象     |  否  |                当前人物详情页的个性化配色                 |
|       `statusLabel`       |      字符串       |  是  |               状态字段的标题，例如“活动状态”               |
|         `status`          |      字符串       |  是  |             实际状态，例如“活动中”“已停止活动”              |
|        `inactive`         |      布尔值       |  否  |        是否为非活动状态。通常 `true` 表示已停止活动或归档         |
|          `image`          |      字符串       |  是  |                 人物主图、头像或立绘路径                 |
|           `seo`           |   公共 SEO 对象    |  否  |                 当前词条的搜索和分享信息                 |

### 企划部分

**最小实例：**

```yaml
kind: project
title: 神椿市建設中。
description: 神椿世界观企划
order: 10
```

**显示结果：** 企划会按 `order` 排序，并使用标题和简介生成列表卡片。

|属性|类型|必填|作用与填写内容|
|:---:|:---:|:--:|:---:|
|`locale`|`zh / ja / en`|是|当前企划词条的语言|
|`translationKey`|字符串|是|同一企划多语言版本的共同标识|
|`kind`|字符串|是|企划类型，例如 `project`、`game`、`virtual-world`；Schema 不限制固定值|
|`title`|字符串|是|企划名称|
|`description`|字符串|是|企划简短介绍，通常用于列表卡片或页面摘要|
|`order`|数字|是|企划列表排序值|
|`seo`|公共 SEO 对象|否|搜索与分享信息|

### logs部分

**最小实例：**

```yaml
date: "2026-07-19"
type: update
title: 站点内容更新
order: 10
```

**显示结果：** 日志页面会显示日期、类型和标题，并按 `order` 排列。

|属性|类型|必填|作用与填写内容|
|:---:|:---:|:--:|:---:|
|`locale`|`zh / ja / en`|是|当前日志语言|
|`translationKey`|字符串|是|同一日志多语言版本的共同标识|
|`date`|字符串|是|日志日期。建议写 `YYYY-MM-DD`，但 Schema 不验证格式|
|`type`|字符串|是|日志类型，例如 `update`、`notice`、`maintenance`|
|`title`|字符串|是|日志标题|
|`summary`|字符串|否|日志简短摘要|
|`order`|数字|是|日志排序值|
|`seo`|公共 SEO 对象|否|搜索和分享信息|

### 歌曲部分

歌曲文件使用 `艺人 ID / 分类 / 歌曲 ID / 语言.md` 四级结构，例如 `songs/kaf/originals/shi/zh.md`。第一层艺人目录是该词条的规范存放位置，分类目录会同时用于所有关联艺人的目录页。推荐使用 `originals`（原创曲）、`covers`（翻唱曲）、`genealogy`（系谱曲）、`suites`（组曲）、`collaborations`（合作曲）和 `projects`（企划曲）；新建其他文件夹也能自动形成新分类。

**最小实例：**

```yaml
title: 糸
artist: 花譜
artistId: kaf
releaseDate: "2018-12-06"
duration: "03:52"
```

**多艺人共享词条：** 同一录音只能建立一个歌曲目录。任选一位主要艺人作为规范存放位置，并让 `artistId` 与路径第一层一致；再用 `artistIds` 写入所有需要收录该曲目的艺人 ID。例如《古傷》只保存在 `songs/harusaruhi/collaborations/古傷-furukizu/`：

```yaml
title: 古傷
artist: 幸祜×春猿火
artistId: harusaruhi
artistIds:
  - harusaruhi
  - koko
code: apple-1678038919
```

这样只需维护该目录中的 `zh.md`、`ja.md` 和 `en.md`，同一个词条就会同时出现在春猿火与幸祜的“合作曲”分类中，两个目录项也会链接到同一个规范页面。不要再在 `songs/koko/` 下复制正文、`translationKey` 或封面资料。`artistIds` 中必须包含 `artistId`，且不能重复；建议把 `artistId` 写在第一项。若填写 `code`，它必须标识唯一录音，不可被另一歌曲目录重复使用。

**显示结果：** 歌曲详情页会显示标题、艺人、发布日期和时长，并归入 `artistIds` 指定的每一个艺人歌曲列表；未填写 `artistIds` 时只归入 `artistId`。

|属性|类型|必填|作用与填写内容|
|:---:|:---:|:--:|:---:|
|`locale`|`zh / ja / en`|是|当前歌曲词条语言|
|`translationKey`|字符串|是|同一歌曲多语言版本的共同标识|
|`title`|字符串|是|歌曲标题|
|`artist`|字符串|是|主演唱者或艺人名称|
|`artistId`|小写英文 ID|是|规范存放艺人 ID，例如 `kaf`；必须与歌曲路径第一层文件夹一致|
|`artistIds`|小写英文 ID 列表|否|需要收录此同一词条的所有艺人目录；多艺人歌曲必须填写，并包含 `artistId`，不得重复|
|`composer`|字符串|否|作曲者|
|`lyricist`|字符串|否|作词者|
|`album`|字符串|否|所属专辑|
|`duration`|字符串|否|歌曲时长。建议统一写 `03:45`，但 Schema 不验证格式|
|`releaseDate`|字符串|否|发行日期。建议使用 `YYYY-MM-DD`|
|`code`|字符串|否|唯一录音编号、档案编号或内部代码；不同歌曲目录不得重复|
|`categoryTitle`|字符串|否|所属分类标题|
|`categorySubtitle`|字符串|否|所属分类副标题|
|`categoryOrder`|数字|否|分类排序值|
|`itemOrder`|数字|否|歌曲在分类内的排序值|
|`image`|字符串|否|歌曲封面、单曲封面或专辑图片路径|
|`seo`|公共 SEO 对象|否|搜索和分享信息|

### 专辑部分

**最小实例：**

```yaml
title: 観測α
artist: 花譜
type: Album
releaseDate: "2019-09-11"
tracks:
  - number: 1
    title: 糸
    songId: kaf/originals/shi
```

**显示结果：** 专辑页会生成基本信息和曲目表；带 `songId` 的曲目可跳转到本站歌曲页。

|属性|类型|必填|作用与填写内容|
|:---:|:---:|:--:|:---:|
|`locale`|`zh / ja / en`|是|当前专辑词条语言|
|`translationKey`|字符串|是|同一专辑多语言版本的共同标识|
|`title`|字符串|是|专辑标题|
|`romanizedTitle`|字符串|否|专辑的罗马字、拉丁字母或国际显示名|
|`artist`|字符串|是|专辑主要艺人|
|`type`|字符串|否|作品类型，例如 `Album`、`EP`、`Mini Album`|
|`description`|字符串|否|用于详情页标题区的简短介绍|
|`releaseDate`|字符串|否|发行日期，建议使用 `YYYY-MM-DD`|
|`label`|字符串|否|发行厂牌|
|`catalogNumber`|字符串|否|商品编号或唱片编号|
|`trackCount`|数字|否|总曲目数|
|`duration`|字符串|否|专辑总时长|
|`code`|字符串|否|列表编号、档案编号或内部代码|
|`categoryTitle`|字符串|否|所属分类标题|
|`categorySubtitle`|字符串|否|所属分类副标题|
|`categoryOrder`|数字|否|分类排序值|
|`itemOrder`|数字|否|专辑在分类内的排序值|
|`image`|字符串|否|专辑封面路径或 URL|
|`officialLinks`|对象数组|否|官方页面、购买或串流链接；每项填写 `label` 与 `href`|
|`tracks`|对象数组|否|曲目表；每项必须填写 `title`，还可填写 `disc`、`number`、`artist`、`duration`、`songId`|
|`tracks[].songId`|字符串|否|关联本站歌曲词条的路径，例如 `kaf/originals/shi`|
|`theme`|公共主题对象|否|专辑详情页的个性化配色|
|`seo`|公共 SEO 对象|否|搜索和分享信息|

#### 歌曲与专辑补写标准

补写分为两个可以独立审核的完成度：

- **可进入目录：** 路径、必填元数据、官方来源、本地高清图片、官方链接和最小正文已经可靠；允许曲目互链、歌词或三语长文尚未完成，但必须明确说明缺少什么。
- **完整词条：** 在可进入目录的基础上，补齐确认过的曲目、站内歌曲互链、正文、可用的歌词资料和三语内容。完整不等于堆满字段，不确定的内容仍然应省略。

##### 目录代码语法

```md
songs/<artistId>/<category>/<songId>/<locale>.md
albums/<artistId>/<albumId>/<locale>.md
```

##### 写法

歌曲先按艺人、再按曲种分类；专辑只按艺人和专辑 ID 组织，不按曲种或艺人分类页面的 UI 分组重复建目录。`artistId`、`songId`、`albumId` 使用稳定的小写 slug，三语文件共用同一 `translationKey`。

##### 实例

```md
src/content/songs/kaf/originals/shi/
├── zh.md
├── ja.md
└── en.md

src/content/albums/kaf/kansoku-alpha/
├── zh.md
├── ja.md
└── en.md
```

##### 歌曲补写验收标准

- 路径中的 `artistId`、分类和 `songId` 与词条元数据一致，分类优先复用 `originals`、`covers`、`genealogy`、`suites`、`collaborations`、`projects`。
- 标题、发布日期、作词、作曲等事实由官方网站、官方投稿说明、正式发行页或可靠采访支持；AI 输出不能作为来源。
- `categoryOrder` 和 `itemOrder` 与现有文件不冲突，并保持公开顺序或已有站内顺序稳定。
- `image` 指向仓库内真实文件；不用临时外链、搜索缩略图、占位图或没有必要的重复图片。
- 视频使用 `@[bilibili](BV...)` 等受控短语法；不写原始 `<iframe>`，不自动播放，不嵌入非官方搬运。
- 正文至少说明“这是什么作品”并列出可追溯来源；没有歌词不会阻止词条进入目录。添加歌词时需区分原文、翻译、罗马音，沿用歌词控件，并确认来源与版权边界。
- 新词条优先同时补 `zh.md`、`ja.md`、`en.md`。暂缺的翻译或事实应在 PR 说明中列出，不写“待补充”、虚构译文或占位正文。

##### 专辑补写验收标准

- **可进入目录的最低条件：** 作品名、艺人、类型、已确认的发行信息、官方封面、至少一个官方或正版串流链接、三语共同 `translationKey`，以及有来源的最小正文。
- 封面优先从 Apple Music 等正版串流服务或官方商品页取得可用的最高质量版本，原则上为正方形且至少 `1500 × 1500`。禁止搜索缩略图、截图、占位图和单纯插值放大的假高清图。
- 封面保存为 `public/images/albums/<artistId>/<albumId>.jpg`，frontmatter 使用 `/images/albums/<artistId>/<albumId>.jpg`，不直接依赖第三方图片 URL。
- `trackCount` 与确认过的总曲数一致；填写 `tracks` 时按官方曲目表校对碟号、序号、标题、艺人和时长。
- 只有目标歌曲词条真实存在时才填写 `tracks[].songId`。未建歌曲页的曲目保留 `title` 即可，不制造坏链接。
- 普通版、再版、重混版、现场版只有在官方作为不同发行物时才拆分；不能把不同版本的发行日期和曲目混在同一词条。
- 曲目或正文未完成时，在正文和 PR 中明确范围，不用虚构数据补齐，也不能写成已经完整收录。
- 三语文件的结构元数据、曲序、封面和链接保持一致，只本地化显示名称与正文。

##### 正文代码语法

```md
## 作品简介

说明作品定位、发行背景和已核实的制作信息。

## 官方视听

@[bilibili](BVxxxxxxxxxx)

## 补写状态

当前已完成基本资料与官方链接；完整曲目互链将在对应歌曲词条建立后补齐。

## 来源

- [官方作品页](https://example.com/official)
- [Apple Music](https://music.apple.com/example)
```

##### 写法

只写来源能够支持的断言。补写状态要告诉审核者和后续编辑者“已经完成什么、还缺什么”，但不要把计划或猜测写成百科事实。

##### 实例

花谱现有补写可参考 `src/content/songs/kaf/`、`src/content/albums/kaf/` 与 `public/images/albums/kaf/`。提交前运行：

```md
pnpm check
pnpm test
pnpm build
```

检查通过只是最低条件，不能代替来源、曲序、链接和图片质量审核。

