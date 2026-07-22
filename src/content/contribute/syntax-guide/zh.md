---
locale: zh
translationKey: syntax-guide
title: Markdown 与词条属性完整指南
description: "从第一次修改到新增完整词条：本站 Markdown、frontmatter、媒体、内容结构和提交前检查的统一参考。"
---

这是一份**随用随查的参考**，不要求一次读完。第一次贡献时先在本页上方选择路线；真正编辑时，遇到标题、链接、图片、媒体或 frontmatter 字段，再从目录跳到对应章节。

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
translationKey: example-entry
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

## 关于 Markdown 编辑器

实际上，markdown格式并不需要特殊的编辑器。你甚至可以用备忘录和记事本写md文件（只需在保存时更改扩展名为.md即可）。
对于没有接触过markdown格式的各位朋友，一个即时可视化的编辑器可能会更加适合你的编辑流程。在这里，本人推荐使用Obsidian进行编辑，功能较为全面且同时有多平台客户端。

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
| 歌词切换按钮 | `{{lyrics-controls::zh}}`（按文件语言改为 `ja` / `en`） |

行内短语法的参数只填写纯文本，不嵌套 Markdown 或 HTML；双冒号 `::` 是参数分隔符，也不会破坏 Markdown 表格。名称拼错或参数数量不正确时不会生成标签，而会保留原文，方便在预览中发现问题。

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

- 文件路径和 `locale` 对应，三语文件共享同一个 `translationKey`。
- frontmatter 的两个 `---`、YAML 缩进和字段类型没有被破坏。
- 日期使用 `YYYY-MM-DD`，时长使用 `MM:SS` 或 `HH:MM:SS`。
- 新事实有可靠来源，链接能打开，信息图片有合适的替代文本。
- 艺人正文的外链使用独立的 `## 外部链接` 和 `- [名称](网址)` 列表，没有裸网址或混合标题。
- 媒体使用 `@[来源](...)`，正文不包含脚本、事件属性、密码、令牌或个人隐私。
- Preview / Changes 中只有本次需要的修改，没有误删其他语言或无关内容。

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
