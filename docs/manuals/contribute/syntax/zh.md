---
book: contribute
chapter: syntax
locale: zh
order: 4
title: Markdown 与词条属性完整指南
summary: 从第一次修改到新增完整词条：本站 Markdown、frontmatter、媒体、内容结构和提交前检查的统一参考。
---

这是一份**随用随查的参考**，不要求一次读完。第一次贡献时先读[选择投稿与开始准备](/zh/docs/contribute/start/)并选择投稿路线；真正编辑时，遇到标题、链接、图片、媒体或 frontmatter 字段，再从目录跳到对应章节。

## 开始之前

一次可靠的内容修改，可以按这条最短路径完成：

1. 确认目标文件位于 `src/content/`，并确认 `zh.md`、`ja.md` 或 `en.md` 与目标语言一致。
2. 只修改与本次目的有关的内容；新增事实时准备可追溯来源。
3. 保留 frontmatter 两侧的 `---`、原有字段、缩进和引号。
4. 在 GitHub 的 Preview / Changes 中检查差异，再提交 Pull Request。

本站使用 Markdown，而不是 wikitext。所有语法符号都应使用半角 ASCII 符号；中文输入法输入的全角 `＃`、`＊`、`（` 等不会被识别。

> 新手原则：优先完成“小而正确”的修改。不要顺手改动无关段落，也不要把 AI 输出当作事实来源。

## 标题

使用 `#` 创建标题，数量对应标题级别，最多六级。`#` 后必须有半角空格。词条正文通常从 `##` 开始，因为页面标题已经由 frontmatter 提供。

**写法：**

```md
## 二级标题
### 三级标题
```

**显示效果：**

### 三级标题示例

## 文本格式

**写法：**

```md
**加粗文本**
*斜体文本*
***粗斜体文本***
~~删除线文本~~
`行内代码`
```

**显示效果：**

**加粗文本**、*斜体文本*、***粗斜体文本***、~~删除线文本~~、`行内代码`

## 列表

### 无序列表

使用 `-` 或 `+`，并在符号后添加半角空格。

**写法：**

```md
- 项目一
- 项目二
```

**显示效果：**

- 项目一
- 项目二

### 有序列表

使用数字、半角句点和空格。

**写法：**

```md
1. 第一步
2. 第二步
3. 第三步
```

**显示效果：**

1. 第一步
2. 第二步
3. 第三步


## 超链接

**写法：**

```md
[本站地址](https://kamitsubaki.wiki/zh/)
```

**显示效果：**

[本站地址](https://kamitsubaki.wiki/zh/)

## 表格

使用 `|` 定义列，使用 `-` 定义表头分隔线。`:---` 左对齐、`:---:` 居中、`---:` 右对齐。

**写法：**

```md
| 艺人 | 歌名 | 歌词 |
| :--- | :---: | ---: |
| KAF | 糸 | 略 |
| RIM | 1999 | 略 |
```

**显示效果：**

| 艺人  |  歌名  |  歌词 |
| :-- | :--: | --: |
| KAF |  糸   |   略 |
| RIM | 1999 |   略 |

## Frontmatter

文件顶部的 frontmatter 用于填写词条属性，开始和结束标记都是 `---`。

**写法：**

```yaml
---
locale: zh
schemaVersion: 2
id: example-entry
entityType: editorial-article
articleCategory: archival
contentStatus: stub
title: 示例词条
---
```

**实际用途：** 页面会读取这些字段生成标题、语言关联和词条元数据；正文不会直接显示这段 YAML。

## 插入图片

**写法：**

```md
![花譜《糸》的封面](/images/songs/shi.webp)
```

**显示效果：** 页面会在当前位置显示图片；若图片暂未加入仓库，替代文本仍会说明图片内容。

请将图片放在 `public/images/` 目录下。网页路径从 `/images/` 开始，不要把 `public` 写进 URL。信息图片应写清画面内容或用途；纯装饰图可以使用空描述 `![](...)`。

图片原本上传、路径填写和文件分类请看[图片与文件教程](/zh/contribute/files/)。不要求压缩原图，超过站内附件限额时直接通过 GitHub 上传。

## 使用站内可视化编辑器

第一次编辑，先按[贡献指南](/zh/contribute/edit/)完成一处小修改，再到[可视化编辑器](/zh/contribute/editor/)载入原文。选中文字即可加粗、加链接、注音或隐藏剧透；空段落按 `/`，或点“插入内容”，添加表格、图片、媒体与双语歌词。

通过顶部“词条属性”填写资料，右侧预览与内容块属性检查效果。可站内提交审核，也可导出完整 Markdown 与原图一起放入同一个 GitHub PR。本机草稿自动保存，含图片草稿暂不支持云端保存；填写图片地址不会自动上传文件。复杂内容可切换源码修改。

## Wiki 短语法与受控媒体

在学会基本的 Markdown 语法后，可以使用少量受支持的 HTML 完成注音、折叠和语义标记。正文会在构建时经过安全清理，并不是浏览器支持的所有 HTML 都能使用。

### 安全边界

正文仅允许以下几类标签：

- 结构：`p`、`h1`–`h6`、`blockquote`、`hr`、`br`、`div`、`span`。
- 文本语义：`a`、`abbr`、`b`、`strong`、`i`、`em`、`u`、`s`、`del`、`mark`、`small`、`code`、`pre`、`kbd`、`samp`、`var`、`sub`、`sup`、`cite`、`q`、`time`。
- 列表与数据：`ul`、`ol`、`li`、`dl`、`dt`、`dd`、`table`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`。
- Wiki 排版：`ruby`、`rt`、`rp`、`details`、`summary`、`figure`、`figcaption`、`picture`、`img`、`source`。

属性也采用白名单：普通链接、图片替代文本、表格跨度等标准属性会保留；`class` 只允许站点已经定义的少数用途。以下内容会被移除：

- `script`、`style`、`iframe`、`object`、`embed`、`form` 等可执行或可加载任意第三方内容的标签。
- `onclick`、`onmouseover`、`onerror` 等所有 `on*` 事件属性，以及内联 `style`。
- `javascript:` 等危险 URL 协议；正文自定义的 `id` / `name` 会添加安全前缀，避免覆盖页面对象。

贡献者通常不需要直接编写这些 HTML。优先使用下面的 Wiki 短语法；站点会在代码中生成对应标签，再经过同一白名单检查。需要新的交互效果时，请在 PR 中提议新增可复用短语法，不要把脚本或第三方播放器代码直接粘进词条。

### Wiki 短语法速查

短语法采用类似函数的 `{{名称::参数}}` 形式，名称和参数数量都是固定的：

| 用途 | 写法 |
| --- | --- |
| 注音 | `{{ruby::正文::注音}}` |
| 注音与罗马音 | `{{ruby::正文::假名::romaji}}` |
| 黑幕 / 剧透 | `{{spoiler::默认隐藏的文字}}` |
| 高亮 | `{{mark::重点}}` |
| 缩写解释 | `{{abbr::V.W.P::Virtual Witch Phenomenon}}` |
| 键盘按键 | `{{kbd::Ctrl+K}}` |
| 机器可读日期 | `{{time::显示文字::2026-07-19}}` |
| 小字、上标、下标 | `{{small::文字}}`、`{{sup::2}}`、`{{sub::2}}` |
| 台繁 / 港繁词汇人工覆写 | `{{zh-variant::简中::台繁::港繁}}` |
| 日文原文（不简繁转换） | `{{ja::日本語の原題}}` |
| 歌词切换按钮 | `{{lyrics-controls::zh}}`（按文件语言改为 `ja` / `en`） |

行内短语法的参数只填写纯文本，不嵌套 Markdown 或 HTML；双冒号 `::` 是参数分隔符，也不会破坏 Markdown 表格。`zh-variant` 的三个参数顺序固定为简中、台繁、港繁。名称拼错或参数数量不正确时不会生成标签，而会保留原文，方便在预览中发现问题。

**写法：**

```md
{{mark::重点内容}}
{{abbr::V.W.P::Virtual Witch Phenomenon}}
按下 {{kbd::Ctrl+K}}
{{time::2026 年 7 月 19 日::2026-07-19}}
H{{sub::2}}O 与 x{{sup::2}}
{{small::补充说明}}
```

**显示效果：**

{{mark::重点内容}}、{{abbr::V.W.P::Virtual Witch Phenomenon}}、按下 {{kbd::Ctrl+K}}、{{time::2026 年 7 月 19 日::2026-07-19}}、H{{sub::2}}O 与 x{{sup::2}}、{{small::补充说明}}

歌曲页把 `{{lyrics-controls::zh}}` 单独放在一段，并紧接在 `.my-lyric-box` 歌词容器之前。站点会生成当前语言所需的注音、翻译、罗马音和逐字歌词按钮；日文版会自动省略翻译按钮。语言参数必须与文件的 `locale` 一致。

### 歌词页面完整写法

歌词页由三部分组成：本地化切换按钮、歌词容器、重复的歌词行。按钮必须单独占一段并紧挨歌词容器；每个 `lyric-line` 对应一行原文和一行翻译。

#### 代码语法

```md
{{lyrics-controls::语言}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>原文<rt class="furi">假名</rt><rt class="roma">romaji</rt></ruby>
</div>
<div class="cn-lyric">中文翻译</div>
</div>

</div>
```

- `语言` 使用当前文件的 `zh`、`ja` 或 `en`。
- `furi` 是“显示注音”轨道，`roma` 是“切换罗马音”轨道。
- 中文翻译使用 `cn-lyric`；英文翻译使用 `trans-lyric`；日文文件不写翻译 `<div>`。
- 假名本身不需要注音时，也可以只写罗马音：`<ruby>なら<rt class="roma">nara</rt></ruby>`。
- 每增加一行歌词，就完整复制一组 `lyric-line`。不要把 `{{ruby::...}}` 短语法放进这段原始 HTML；HTML 块内部不会再次解析 Markdown 短语法。

#### 写法

下面是一段可直接复制到中文歌曲文件中的完整单行歌词：

```md
{{lyrics-controls::zh}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">若是错误</div>
</div>

</div>
```

#### 实例

上面的代码会显示为可切换的歌词练习组件：

{{lyrics-controls::zh}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">若是错误</div>
</div>

</div>

### 逐字歌词时间轴

需要卡拉 OK 式逐字动画时，在每个歌词单元前直接写入 `[mm:ss.xx]` 或 `[mm:ss.xxx]` 时间标记。时间表示该单元相对于歌词计时器起点的开始时刻；播放期间，歌词会在相邻时间点之间从左向右连续填色。点击“播放”会从 `00:00.00` 开始计时，点击有时间标记的歌词行会跳到该行并继续播放，点击“重置”则回到起点。

- `mm` 和 `ss` 必须各为两位数字，小数部分可以是两位或三位，例如 `[00:03.50]`、`[01:02.345]`。
- 时间标记紧贴它控制的 `<ruby>` 或纯文本，二者之间不要加空格。每个需要独立高亮的单元都要有自己的开始时间。
- 每个 `.jp-lyric` 的第一个时间标记同时作为整行的跳转时间；翻译行建议在开头写入相同的行首时间。
- 每个单元会填色到下一个时间标记；一行的最后一个单元会延续到下一行，末行则使用短暂的自动收尾时间。
- 时间应按播放顺序递增。允许只为部分歌词添加时间；没有时间标记的行会保持普通显示。
- 只编写方括号时间标记，不要手写站点生成的 `lrc-tag`、`lrc-word` 或脚本。时间必须人工试听校准，不能让 AI 猜测。
- 当前歌词计时器是独立计时器，不会自动读取上方 YouTube、bilibili 或其他试听播放器的播放进度。

#### 写法

```md
{{lyrics-controls::zh}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">[00:00.00]若是错误</div>
</div>

</div>
```

#### 实例

启用逐字歌词后，下面两个日文单元会分别从 `0` 秒和 `0.8` 秒开始由左向右填色：

{{lyrics-controls::zh}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">[00:00.00]若是错误</div>
</div>

</div>

<span id="ai-lyrics-html"></span>

### AI 辅助生成歌词 HTML

歌词较长时，可以把已有的原文、读音、罗马音和翻译交给 AI 做机械排版。AI 只能转换你提供的内容，不能作为歌词、翻译或读音的来源；粘贴前仍需逐行校对，并确认内容来源允许用于本次贡献。

#### 提示词语法

将下面整段复制给 AI，再替换最后五个输入区域：

```md
你是 KAMITSUBAKI Wiki 的歌词 HTML 排版助手。请把我提供的歌词轨道转换成本站格式。

必须遵守：
1. 只转换输入，不补写歌词、不翻译、不改写、不猜测缺失读音。
2. 只输出可直接粘贴进 Markdown 的内容，不要解释，不要使用代码围栏。
3. 第一行输出 {{lyrics-controls::文件语言}}，随后只生成一个 <div class="my-lyric-box"> 容器。
4. 每行使用 <div class="lyric-line">；日文原文放入 <div class="jp-lyric">。
5. 有假名和罗马音时使用 <ruby>原文<rt class="furi">假名</rt><rt class="roma">romaji</rt></ruby>。
6. 只有罗马音时使用 <ruby>原文<rt class="roma">romaji</rt></ruby>；没有可靠读音时保留纯原文。
7. 中文翻译使用 cn-lyric，英文翻译使用 trans-lyric；日文文件或未提供翻译时不生成翻译 div。
8. 严格保持原有行数、顺序、标点和文字。无法逐词对齐时，以整行一个 ruby 保留我提供的整行读音，不自行拆词。
9. 转义文本中的 <、>、&。禁止 style、所有 on* 属性、script、iframe、id 和未经要求的标签。
10. 检查所有 div、ruby、rt 均正确闭合，按钮与歌词容器之间只保留一个空行。

【文件语言】
zh / ja / en

【日文原文：每行对应一行歌词】
在这里粘贴

【假名：可选，行数必须与原文一致】
在这里粘贴

【罗马音：可选，行数必须与原文一致】
在这里粘贴

【翻译：可选，行数必须与原文一致】
在这里粘贴
```

#### 写法

只替换输入区，例如：

```md
【文件语言】
zh

【日文原文】
間違い

【假名】
まちがい

【罗马音】
machigai

【翻译】
若是错误
```

#### 输出实例

合格的 AI 输出应类似下面这样，并能直接粘贴进歌曲正文：

```md
{{lyrics-controls::zh}}

<div class="my-lyric-box">
<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違い<rt class="furi">まちがい</rt><rt class="roma">machigai</rt></ruby>
</div>
<div class="cn-lyric">若是错误</div>
</div>
</div>
```

### Ruby 注音

贡献者只需填写正文和读音：

```md
{{ruby::局部坏死::zheng ge hao huo}}
```

如果需要逐字精准对齐，可以连续调用：

```md
{{ruby::清::hun}}{{ruby::楚::dun}}
```

显示如下：

- {{ruby::清::hun}}{{ruby::楚::dun}}

### 需要默认隐藏的补充内容

少量行内内容使用黑幕短语法，较长内容使用下一节的折叠块。两种写法都不需要文章脚本。

`spoiler` 的参数只能是纯文本，不要在 `{{spoiler::...}}` 内部放入 `**加粗**`、Markdown 链接或 HTML，否则短语法会作为原文显示。如果整段黑幕都需要加粗，可以写成 `**{{spoiler::隐藏文字}}**`；需要在隐藏内容中混排标题、列表或链接时，请改用下一节的 `details` 折叠块。

**写法：**

```md
剧情结局是：{{spoiler::这里是默认隐藏的文字}}
```

**显示效果：**

剧情结局是：{{spoiler::这里是默认隐藏的文字}}

### 收起与展开

使用成对的 `details` 短语法。开始和结束标记必须各占一段，前后留一个空行；中间仍可使用 Markdown：

```md
{{details::点击展开完整曲目}}

1. 第一首歌曲
2. **第二首歌曲**

{{/details}}
```

显示效果如下：

{{details::点击展开完整曲目}}

1. 第一首歌曲
2. **第二首歌曲**

{{/details}}

普通段落换行请直接空一行；仅在表格单元格等特殊位置才需要白名单中的 `<br>`。

### 插入音频/视频

本站提供统一的媒体嵌入短语法。将下面的语法单独放在一行，构建时会自动生成响应式、安全且延迟加载的 `iframe`：

```md
@[来源](媒体 ID 或分享链接 "可选标题")
```

支持的来源名称为 `youtube`、`bilibili`、`apple-music`、`spotify`、`netease`（网易云音乐）和 `qq-music`。YouTube、bilibili、网易云音乐和 QQ 音乐可直接填写单曲/视频 ID；所有来源均支持常见的分享链接。

```md
@[youtube](3Wtx6k2vInU "花譜 - 糸")
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[apple-music](https://music.apple.com/cn/song/example/123456789)
@[spotify](https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT)
@[netease](2637083551)
@[qq-music](001ABCDEF)
```

**显示实例：**

@[youtube](3Wtx6k2vInU "花譜 - 糸")

#### 聚合媒体切换

同一作品在多个平台都有官方内容时，可以用一个聚合块把原有媒体短语法组合起来。页面只显示当前选择的平台，并提供按钮切换；原来的单个 `@[来源](...)` 写法保持不变。

##### 代码语法

```md
{{media-switcher::聚合播放器标题}}
@[来源一](媒体 ID 或分享链接 "可选标题")
@[来源二](媒体 ID 或分享链接 "可选标题")
{{/media-switcher}}
```

##### 写法

- 标题必填，并应使用当前词条语言，例如作品名或“官方视听”。
- 每条内容仍使用原来的媒体短语法；支持来源及地址验证规则完全相同。
- 各行可以直接连续书写，不需要插入空行；同一行书写也能解析，但为了审阅和维护，推荐每个平台单独一行。
- 一个聚合块接受 `2–6` 个不同平台。同一平台不能重复，不能嵌套聚合块，也不能混入普通段落。
- 聚合块中的所有来源必须有效；只要有一个未知平台、恶意地址或错误 ID，整块就不会生成 iframe，而会保留为可见文本方便修正。
- 无 JavaScript 时所有已验证播放器会顺序显示；启用 JavaScript 后使用按钮或键盘方向键、Home、End 切换。

##### 实例

```md
{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}
```

**显示实例：**

{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}

在 Markdown 表格的同一个单元格中可以连续填写多个短语法，播放器会按照填写顺序纵向排列。该单元格只能包含短语法及空格，不要混入说明文字：

```md
| 作曲 | 作词 | 试听 |
| --- | --- | --- |
| Wiz_nicc | Wiz_nicc | @[bilibili](BV13ZZNYQEQx) @[netease](2637083551) |
```

无法识别的来源或地址会保留为普通链接，不会生成任意第三方 iframe。新内容应使用短语法，以保持来源范围、尺寸、隐私属性和样式一致；不要直接复制第三方网站给出的原始 `<iframe>`。

## 艺人页的外部链接品牌卡片

艺人页有两处可以填写官方链接，它们使用同一套平台识别与品牌样式，但写法不同。

### 资料卡中的官方链接

资料卡使用 frontmatter 的 `officialLinks`。每项必须同时填写显示名称 `label` 和完整地址 `href`：

```yaml
officialLinks:
  - label: "官方网站"
    href: "https://kaf.kamitsubaki.jp/"
  - label: "YouTube"
    href: "https://www.youtube.com/@virtual_kaf"
```

### 正文中的外部链接

正文必须使用独立的二级标题 `## 外部链接`，并在其下直接书写普通 Markdown 无序列表。每一项都要把平台或页面名称写进链接文字：

```md
## 外部链接

- [官方网站](https://kaf.kamitsubaki.jp/)
- [YouTube](https://www.youtube.com/@virtual_kaf)
- [X (Twitter)](https://x.com/virtual_kaf)
```

- 不要写成 `- YouTube：<https://...>`、`- <https://...>` 或只有说明文字的列表项；这些写法无法生成完整卡片。
- 不要使用“参考资料与外部链接”之类的混合标题。资料来源放在独立的 `## 参考资料` 下，供读者访问的官方主页和社交账号放在 `## 外部链接` 下。
- 中文、日文和英文艺人正文分别使用 `外部链接`、`外部リンク` 和 `External Links`；标题必须保持准确，站点才能识别。
- JavaScript 可用时，列表会在艺人页增强为带平台 Logo、品牌色和外链箭头的响应式链接卡片；语义仍是用于跳转的链接，不是表单按钮。没有 JavaScript 时，它会保留为可读、可点击的普通列表。
- 当前可识别 Bilibili、YouTube、X/Twitter、TikTok、Instagram、微博、Niconico、Spotify、Apple Music、网易云音乐、pixiv、piapro、Steam、Wikipedia 和 KAMITSUBAKI 官方站点；其他网址使用通用网站样式。
- 不要在正文中粘贴平台 SVG 或远程 Logo，图标由站点统一提供。

## 提交前自检

- 文件路径和 `locale` 对应，三语文件共享同一个稳定 `id`、`entityType` 和关系身份。
- frontmatter 的两个 `---`、YAML 缩进和字段类型没有被破坏。
- 日期使用 `YYYY-MM-DD`，时长使用 `MM:SS` 或 `HH:MM:SS`。
- 新事实有可靠来源，链接能打开，信息图片有合适的替代文本。
- 艺人正文的外链使用独立的 `## 外部链接` 和 `- [名称](网址)` 列表，没有裸网址或混合标题。
- 媒体使用 `@[来源](...)`，正文不包含脚本、事件属性、密码、令牌或个人隐私。
- Preview / Changes 中只有本次需要的修改，没有误删其他语言或无关内容。

## 属性块指南

V3 词条使用 Metadata Schema v2。正文语法保持不变；属性必须与实体类型匹配，不能继续复制旧版 translationKey、顶层 image 或旧艺人目录模板。

```yaml
schemaVersion: 2
id: example-article
locale: zh
entityType: editorial-article
title: Example article
articleCategory: archival
contentStatus: stub
relatedEntities: []
```

| 实体类型 | 主要字段与规则 |
| --- | --- |
| `person` / `virtual-avatar` / `unit` | `name`、`romanizedName`、`roles`、`lifecycle` |
| `software-voice` | `name`、`romanizedName`、`voiceEngines`，以及 `relations` 中的 `based-on-voice` 关系 |
| `work-track` | `title`、`romanizedTitle`、`performers`、`credits` |
| `work-release` | `title`、`releaseType`、`tracks`；发布后还需 `releaseDate` |
| `project` | `name` 或 `title`；发布后还需 `status` |
| `organization` | `name` 或 `title`、`orgType` |
| `live-event` | `name` 或 `title`、`eventType`、`headliners`；发布后还需 `dateRange` |
| `lore-concept` | `name` 或 `title`、`loreCategory` |
| `editorial-article` | `title`、`articleCategory`；发布后还需 `author` 和 `publishDate` |

`presentation.image` / `presentation.theme` / `presentation.morphing` 控制词条的视觉呈现。请使用嵌套 YAML，例如：

```yaml
presentation:
  image: /images/artists/kaf/cover.jpg
```

`relations` 使用稳定 ID 关联实体。`performers` 决定歌曲目录；多个主要表演者使用 `collaborations`。前台内容目录规则定义在 `contentLayout.mjs`。详情参见 [V3 贡献指南](/zh/docs/contribute/entry/)和[元数据规范](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/V3.0.0/docs/category-optimization/metadata-schema-v2.md)。

## 混合简繁转换与生成文件

本站把 `zh.md` 作为中文内容的唯一维护源，但文件正文与可转换的 Frontmatter 文案可以任意混用简体中文、台湾繁体或香港繁体，无须先统一字形。网页读取时会自动识别并规范化：`zh` 输出简中，`zh-tw` 输出台湾繁体，`zh-hk` 输出香港繁体。两种繁体文件由 `scripts/generate-traditional-chinese.mjs` 在开发、检查、测试与构建前生成；不要直接编辑或提交生成的 `zh-tw.md`、`zh-hk.md`、`zh-tw.json` 和 `zh-hk.json`。

```md
编辑：src/content/people/solo/kaf/zh.md
生成：src/content/people/solo/kaf/zh-tw.md
生成：src/content/people/solo/kaf/zh-hk.md
```

转换器先把混合输入通过 OpenCC 统一为简体中间形，再按当前页面转换为 `cn`、`twp` 或 `hkp` 地区输出；即使同一段中交替出现 `软件`、`軟體` 和 `軟件`，也不需要额外标记。Frontmatter 会先解析再按字段处理，以下内容保持不变：

- `id`、兼容期 `translationKey`、`code` 和罗马字字段；
- 日期、时长、色值、目录编号、图片路径和外部 URL；
- Markdown 代码块、行内代码、数学公式、HTML 标签与属性、链接目标；
- 官方专名保护表中要求保留的词汇。

站内 Markdown 链接的 `/zh/` 路径会改写为目标繁体路径，但链接显示文字仍正常转换。歌词控件的 `{{lyrics-controls::zh}}` 也会在生成文件中同步为目标 locale。

### 正文词汇的局部人工覆写

自动转换无法判断特定语境，或同一个词需要明确指定简中、台湾、香港写法时，可以在 `zh.md` 正文的可见文字中使用：

```md
这款{{zh-variant::软件::軟體::軟件}}用于管理虚拟歌手资料。
```

简中页面显示 `软件`，生成的 `zh-tw` 显示 `軟體`，`zh-hk` 显示 `軟件`。三个参数必须都是纯文本且不能为空；台繁和港繁参数是人工最终结果，选中后不会再次交给 OpenCC 转换。代码块、行内代码、数学公式、HTML 标签或属性、URL 和链接目标中的 `zh-variant` 不会执行。

这项短语法只用于正文中少量、依语境决定的词汇，不要放进 frontmatter，也不要包住整句或整段。多篇文章反复出现的官方专名应维护下方的全局保护表，而不是在每一处重复短语法。

### 日文原文与和制汉字

中文词条里常引用日文原题、歌词或专有名词。转换器会自动保护：

- 含假名的日文片段（如 `赤い洗礼`、`眼裏の懐疑`）；
- 日文新字体 / 和制汉字（如 `戯`、`声帯`、`実`、`図`）；
- `{{ruby::正文::假名}}` 中读音含假名的注音底字；
- `class="jp-lyric"` 或 `lang="ja"` 的 HTML 区块内容；
- 与同目录 `ja.md` 标题一致的 frontmatter `title` / 曲目标题。

纯汉字、且不含上述信号的日文原题（如 `独白`、`灯火`）可用：

```md
{{ja::独白}}
```

简中、台繁、港繁页面都会原样显示 `独白`，不会被 OpenCC 改写。也可写成 `<span lang="ja">独白</span>`。

### 维护不转换词汇

不应由 OpenCC 自行处理的艺名、组织名、企划名和产品名统一写入：

```md
public/TraditionalChineseConvert.json
```

基本写法：

```yaml
{
  "source": "V.W.P",
  "preserve": true,
  "category": "group"
}
```

台湾与香港需要指定相同或不同的目标写法时：

```yaml
{
  "source": "神椿市建设中。",
  "tw": "神椿市建設中。",
  "hk": "神椿市建設中。",
  "category": "project"
}
```

词汇会按最长匹配优先并采用 Unicode NFC 规范化。转换时先用占位符遮蔽，完成 OpenCC 后再恢复；不要把路径、普通句子或只为修正文风的大片段加入保护表。

修改中文 `zh.md` 内容或保护表后运行：

```md
pnpm i18n:generate
pnpm check
pnpm test
pnpm build
```

检查重点包括：专名是否正确、代码和 URL 是否未变、繁体内部链接是否指向对应 locale，以及生成结果中是否残留保护占位符。

## 发言块与快速导入

词条和文章共用同一套发言功能。在编辑器的“插入”菜单选择发言或快速导入；发言者在发言编辑处添加和修改，只填写名字即可，头像、颜色和关联词条都是可选项。发言者与文档作者不同。

快速导入支持“姓名：正文”，先检查预览，再直接插入；没有姓名的段落保持普通正文。多段发言可使用对话框提供的模板。导入不覆盖文章属性，插入可以一次撤销。不要把 AI 推测的发言者或补写的内容当作原文。

在编辑器建立发言者后，源码模式中的发言使用稳定角色标识：

```md
:::speech speaker_1
这里是已核对来源的发言正文。

同一发言可以包含多个段落。
:::
```

角色名单保存在文档的 `speech-roles` JSON 代码块中；保留已有配置，不复制第二份名单或随意修改角色 ID。未定义角色、重复标识或未闭合标记应先修复。通过预览核对姓名、段落、链接与原文，再按词条或文章各自的投稿流程提交。

## 高级用法：保留的 HTML 语法

短语法适合大多数贡献者，但原有的安全 HTML 写法仍然支持，便于维护旧词条或进行更精细的排版。HTML 必须写在正文中并遵守前文的白名单；`style`、`onmouseover`、`onclick`、`script` 和原始 `iframe` 会被安全清理。

### HTML Ruby 注音

**写法：**

```html
<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>
<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>
```

**显示效果：**

<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>；<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>

### HTML 黑幕

旧版依靠内联样式和鼠标事件的写法不再允许；保留的安全 HTML 使用站点定义好的 `wiki-spoiler` 类。

**写法：**

```html
<span class="wiki-spoiler" tabindex="0">默认隐藏的文字</span>
```

**显示效果：**

<span class="wiki-spoiler" tabindex="0">默认隐藏的文字</span>

### HTML 收起与展开

**写法：**

```html
<details>
  <summary>点击展开完整曲目</summary>
  <p>这里是默认收起的补充内容。</p>
</details>
```

**显示效果：**

<details>
  <summary>点击展开完整曲目</summary>
  <p>这里是默认收起的补充内容。</p>
</details>

### HTML 语义标记与换行

**写法：**

```html
<mark>重点</mark>
<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>
按下 <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O，x<sup>2</sup>
```

**显示效果：**

<mark>重点</mark>、<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>、按下 <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O，x<sup>2</sup>

原始 HTML 只用于白名单内的静态排版。音频和视频仍应使用 `@[来源](...)`，歌词按钮仍应使用 `{{lyrics-controls::zh}}`，这样交互能力由站点代码统一维护。
