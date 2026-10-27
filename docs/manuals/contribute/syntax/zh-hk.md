---
book: "contribute"
chapter: "syntax"
locale: "zh-hk"
order: 4
title: "Markdown 與詞條屬性完整指南"
summary: "從第一次修改到新增完整詞條：本站 Markdown、frontmatter、媒體、內容結構和提交前檢查的統一參考。"
generatedFromHash: "8c6ab637a91278370143"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

這是一份**隨用隨查的參考**，不要求一次讀完。第一次貢獻時先讀[選擇投稿與開始準備](/zh-hk/docs/contribute/start/)並選擇投稿路線；真正編輯時，遇到標題、鏈接、圖片、媒體或 frontmatter 字段，再從目錄跳到對應章節。

## 開始之前

一次可靠的內容修改，可以按這條最短路徑完成：

1. 確認目標文件位於 `src/content/`，並確認 `zh.md`、`ja.md` 或 `en.md` 與目標語言一致。
2. 只修改與本次目的有關的內容；新增事實時準備可追溯來源。
3. 保留 frontmatter 兩側的 `---`、原有字段、縮進和引號。
4. 在 GitHub 的 Preview / Changes 中檢查差異，再提交 Pull Request。

本站使用 Markdown，而不是 wikitext。所有語法符號都應使用半角 ASCII 符號；中文輸入法輸入的全角 `＃`、`＊`、`（` 等不會被識別。

> 新手原則：優先完成“小而正確”的修改。不要順手改動無關段落，也不要把 AI 輸出當作事實來源。

## 標題

使用 `#` 創建標題，數量對應標題級別，最多六級。`#` 後必須有半角空格。詞條正文通常從 `##` 開始，因為頁面標題已經由 frontmatter 提供。

**寫法：**

```md
## 二级标题
### 三级标题
```

**顯示效果：**

### 三級標題示例

## 文本格式

**寫法：**

```md
**加粗文本**
*斜体文本*
***粗斜体文本***
~~删除线文本~~
`行内代码`
```

**顯示效果：**

**加粗文本**、*斜體文本*、***粗斜體文本***、~~刪除線文本~~、`行内代码`

## 列表

### 無序列表

使用 `-` 或 `+`，並在符號後添加半角空格。

**寫法：**

```md
- 项目一
- 项目二
```

**顯示效果：**

- 項目一
- 項目二

### 有序列表

使用數字、半角句點和空格。

**寫法：**

```md
1. 第一步
2. 第二步
3. 第三步
```

**顯示效果：**

1. 第一步
2. 第二步
3. 第三步


## 超鏈接

**寫法：**

```md
[本站地址](https://kamitsubaki.wiki/zh/)
```

**顯示效果：**

[本站地址](https://kamitsubaki.wiki/zh/)

## 表格

使用 `|` 定義列，使用 `-` 定義表頭分隔線。`:---` 左對齊、`:---:` 居中、`---:` 右對齊。

**寫法：**

```md
| 艺人 | 歌名 | 歌词 |
| :--- | :---: | ---: |
| KAF | 糸 | 略 |
| RIM | 1999 | 略 |
```

**顯示效果：**

| 藝人  |  歌名  |  歌詞 |
| :-- | :--: | --: |
| KAF |  糸   |   略 |
| RIM | 1999 |   略 |

## Frontmatter

文件頂部的 frontmatter 用於填寫詞條屬性，開始和結束標記都是 `---`。

**寫法：**

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

**實際用途：** 頁面會讀取這些字段生成標題、語言關聯和詞條元數據；正文不會直接顯示這段 YAML。

## 插入圖片

**寫法：**

```md
![花譜《糸》的封面](/images/songs/shi.webp)
```

**顯示效果：** 頁面會在當前位置顯示圖片；若圖片暫未加入倉庫，替代文本仍會説明圖片內容。

請將圖片放在 `public/images/` 目錄下。網頁路徑從 `/images/` 開始，不要把 `public` 寫進 URL。信息圖片應寫清畫面內容或用途；純裝飾圖可以使用空描述 `![](...)`。

圖片原本上傳、路徑填寫和文件分類請看[圖片與文件教程](/zh-hk/contribute/files/)。不要求壓縮原圖，超過站內附件限額時直接通過 GitHub 上傳。

## 使用站內可視化編輯器

第一次編輯，先按[貢獻指南](/zh-hk/contribute/edit/)完成一處小修改，再到[可視化編輯器](/zh-hk/contribute/editor/)載入原文。選中文字即可加粗、加鏈接、注音或隱藏劇透；空段落按 `/`，或點“插入內容”，添加表格、圖片、媒體與雙語歌詞。

通過頂部“詞條屬性”填寫資料，右側預覽與內容塊屬性檢查效果。可站內提交審核，也可導出完整 Markdown 與原圖一起放入同一個 GitHub PR。本機草稿自動保存，含圖片草稿暫不支持雲端保存；填寫圖片地址不會自動上傳文件。複雜內容可切換源碼修改。

## Wiki 短語法與受控媒體

在學會基本的 Markdown 語法後，可以使用少量受支持的 HTML 完成注音、摺疊和語義標記。正文會在構建時經過安全清理，並不是瀏覽器支持的所有 HTML 都能使用。

### 安全邊界

正文僅允許以下幾類標籤：

- 結構：`p`、`h1`–`h6`、`blockquote`、`hr`、`br`、`div`、`span`。
- 文本語義：`a`、`abbr`、`b`、`strong`、`i`、`em`、`u`、`s`、`del`、`mark`、`small`、`code`、`pre`、`kbd`、`samp`、`var`、`sub`、`sup`、`cite`、`q`、`time`。
- 列表與數據：`ul`、`ol`、`li`、`dl`、`dt`、`dd`、`table`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`。
- Wiki 排版：`ruby`、`rt`、`rp`、`details`、`summary`、`figure`、`figcaption`、`picture`、`img`、`source`。

屬性也採用白名單：普通鏈接、圖片替代文本、表格跨度等標準屬性會保留；`class` 只允許站點已經定義的少數用途。以下內容會被移除：

- `script`、`style`、`iframe`、`object`、`embed`、`form` 等可執行或可加載任意第三方內容的標籤。
- `onclick`、`onmouseover`、`onerror` 等所有 `on*` 事件屬性，以及內聯 `style`。
- `javascript:` 等危險 URL 協議；正文自定義的 `id` / `name` 會添加安全前綴，避免覆蓋頁面對象。

貢獻者通常不需要直接編寫這些 HTML。優先使用下面的 Wiki 短語法；站點會在代碼中生成對應標籤，再經過同一白名單檢查。需要新的交互效果時，請在 PR 中提議新增可複用短語法，不要把腳本或第三方播放器代碼直接粘進詞條。

### Wiki 短語法速查

短語法採用類似函數的 `{{名称::参数}}` 形式，名稱和參數數量都是固定的：

| 用途 | 寫法 |
| --- | --- |
| 注音 | `{{ruby::正文::注音}}` |
| 注音與羅馬音 | `{{ruby::正文::假名::romaji}}` |
| 黑幕 / 劇透 | `{{spoiler::默认隐藏的文字}}` |
| 高亮 | `{{mark::重点}}` |
| 縮寫解釋 | `{{abbr::V.W.P::Virtual Witch Phenomenon}}` |
| 鍵盤按鍵 | `{{kbd::Ctrl+K}}` |
| 機器可讀日期 | `{{time::显示文字::2026-07-19}}` |
| 小字、上標、下標 | `{{small::文字}}`、`{{sup::2}}`、`{{sub::2}}` |
| 台繁 / 港繁詞彙人工覆寫 | `{{zh-variant::简中::台繁::港繁}}` |
| 日文原文（不簡繁轉換） | `{{ja::日本語の原題}}` |
| 歌詞切換按鈕 | `{{lyrics-controls::zh-hk}}`（按文件語言改為 `ja` / `en`） |

行內短語法的參數只填寫純文本，不嵌套 Markdown 或 HTML；雙冒號 `::` 是參數分隔符，也不會破壞 Markdown 表格。`zh-variant` 的三個參數順序固定為簡中、台繁、港繁。名稱拼錯或參數數量不正確時不會生成標籤，而會保留原文，方便在預覽中發現問題。

**寫法：**

```md
{{mark::重点内容}}
{{abbr::V.W.P::Virtual Witch Phenomenon}}
按下 {{kbd::Ctrl+K}}
{{time::2026 年 7 月 19 日::2026-07-19}}
H{{sub::2}}O 与 x{{sup::2}}
{{small::补充说明}}
```

**顯示效果：**

{{mark::重點內容}}、{{abbr::V.W.P::Virtual Witch Phenomenon}}、按下 {{kbd::Ctrl+K}}、{{time::2026 年 7 月 19 日::2026-07-19}}、H{{sub::2}}O 與 x{{sup::2}}、{{small::補充説明}}

歌曲頁把 `{{lyrics-controls::zh-hk}}` 單獨放在一段，並緊接在 `.my-lyric-box` 歌詞容器之前。站點會生成當前語言所需的注音、翻譯、羅馬音和逐字歌詞按鈕；日文版會自動省略翻譯按鈕。語言參數必須與文件的 `locale` 一致。

### 歌詞頁面完整寫法

歌詞頁由三部分組成：本地化切換按鈕、歌詞容器、重複的歌詞行。按鈕必須單獨佔一段並緊挨歌詞容器；每個 `lyric-line` 對應一行原文和一行翻譯。

#### 代碼語法

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

- `语言` 使用當前文件的 `zh`、`ja` 或 `en`。
- `furi` 是“顯示注音”軌道，`roma` 是“切換羅馬音”軌道。
- 中文翻譯使用 `cn-lyric`；英文翻譯使用 `trans-lyric`；日文文件不寫翻譯 `<div>`。
- 假名本身不需要注音時，也可以只寫羅馬音：`<ruby>なら<rt class="roma">nara</rt></ruby>`。
- 每增加一行歌詞，就完整複製一組 `lyric-line`。不要把 `{{ruby::...}}` 短語法放進這段原始 HTML；HTML 塊內部不會再次解析 Markdown 短語法。

#### 寫法

下面是一段可直接複製到中文歌曲文件中的完整單行歌詞：

```md
{{lyrics-controls::zh-hk}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">若是错误</div>
</div>

</div>
```

#### 實例

上面的代碼會顯示為可切換的歌詞練習組件：

{{lyrics-controls::zh-hk}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">若是錯誤</div>
</div>

</div>

### 逐字歌詞時間軸

需要卡拉 OK 式逐字動畫時，在每個歌詞單元前直接寫入 `[mm:ss.xx]` 或 `[mm:ss.xxx]` 時間標記。時間表示該單元相對於歌詞計時器起點的開始時刻；播放期間，歌詞會在相鄰時間點之間從左向右連續填色。點擊“播放”會從 `00:00.00` 開始計時，點擊有時間標記的歌詞行會跳到該行並繼續播放，點擊“重置”則回到起點。

- `mm` 和 `ss` 必須各為兩位數字，小數部分可以是兩位或三位，例如 `[00:03.50]`、`[01:02.345]`。
- 時間標記緊貼它控制的 `<ruby>` 或純文本，二者之間不要加空格。每個需要獨立高亮的單元都要有自己的開始時間。
- 每個 `.jp-lyric` 的第一個時間標記同時作為整行的跳轉時間；翻譯行建議在開頭寫入相同的行首時間。
- 每個單元會填色到下一個時間標記；一行的最後一個單元會延續到下一行，末行則使用短暫的自動收尾時間。
- 時間應按播放順序遞增。允許只為部分歌詞添加時間；沒有時間標記的行會保持普通顯示。
- 只編寫方括號時間標記，不要手寫站點生成的 `lrc-tag`、`lrc-word` 或腳本。時間必須人工試聽校準，不能讓 AI 猜測。
- 當前歌詞計時器是獨立計時器，不會自動讀取上方 YouTube、bilibili 或其他試聽播放器的播放進度。

#### 寫法

```md
{{lyrics-controls::zh-hk}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">[00:00.00]若是错误</div>
</div>

</div>
```

#### 實例

啓用逐字歌詞後，下面兩個日文單元會分別從 `0` 秒和 `0.8` 秒開始由左向右填色：

{{lyrics-controls::zh-hk}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
<div class="cn-lyric">[00:00.00]若是錯誤</div>
</div>

</div>

<span id="ai-lyrics-html"></span>

### AI 輔助生成歌詞 HTML

歌詞較長時，可以把已有的原文、讀音、羅馬音和翻譯交給 AI 做機械排版。AI 只能轉換你提供的內容，不能作為歌詞、翻譯或讀音的來源；粘貼前仍需逐行校對，並確認內容來源允許用於本次貢獻。

#### 提示詞語法

將下面整段複製給 AI，再替換最後五個輸入區域：

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

#### 寫法

只替換輸入區，例如：

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

#### 輸出實例

合格的 AI 輸出應類似下面這樣，並能直接粘貼進歌曲正文：

```md
{{lyrics-controls::zh-hk}}

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

貢獻者只需填寫正文和讀音：

```md
{{ruby::局部坏死::zheng ge hao huo}}
```

如果需要逐字精準對齊，可以連續調用：

```md
{{ruby::清::hun}}{{ruby::楚::dun}}
```

顯示如下：

- {{ruby::清::hun}}{{ruby::楚::dun}}

### 需要默認隱藏的補充內容

少量行內內容使用黑幕短語法，較長內容使用下一節的摺疊塊。兩種寫法都不需要文章腳本。

`spoiler` 的參數只能是純文本，不要在 `{{spoiler::...}}` 內部放入 `**加粗**`、Markdown 鏈接或 HTML，否則短語法會作為原文顯示。如果整段黑幕都需要加粗，可以寫成 `**{{spoiler::隐藏文字}}**`；需要在隱藏內容中混排標題、列表或鏈接時，請改用下一節的 `details` 摺疊塊。

**寫法：**

```md
剧情结局是：{{spoiler::这里是默认隐藏的文字}}
```

**顯示效果：**

劇情結局是：{{spoiler::這裏是默認隱藏的文字}}

### 收起與展開

使用成對的 `details` 短語法。開始和結束標記必須各佔一段，前後留一個空行；中間仍可使用 Markdown：

```md
{{details::点击展开完整曲目}}

1. 第一首歌曲
2. **第二首歌曲**

{{/details}}
```

顯示效果如下：

{{details::點擊展開完整曲目}}

1. 第一首歌曲
2. **第二首歌曲**

{{/details}}

普通段落換行請直接空一行；僅在表格單元格等特殊位置才需要白名單中的 `<br>`。

### 插入音頻/視頻

本站提供統一的媒體嵌入短語法。將下面的語法單獨放在一行，構建時會自動生成響應式、安全且延遲加載的 `iframe`：

```md
@[来源](媒体 ID 或分享链接 "可选标题")
```

支持的來源名稱為 `youtube`、`bilibili`、`apple-music`、`spotify`、`netease`（網易雲音樂）和 `qq-music`。YouTube、bilibili、網易雲音樂和 QQ 音樂可直接填寫單曲/視頻 ID；所有來源均支持常見的分享鏈接。

```md
@[youtube](3Wtx6k2vInU "花譜 - 糸")
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[apple-music](https://music.apple.com/cn/song/example/123456789)
@[spotify](https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT)
@[netease](2637083551)
@[qq-music](001ABCDEF)
```

**顯示實例：**

@[youtube](3Wtx6k2vInU "花譜 - 糸")

#### 聚合媒體切換

同一作品在多個平台都有官方內容時，可以用一個聚合塊把原有媒體短語法組合起來。頁面只顯示當前選擇的平台，並提供按鈕切換；原來的單個 `@[来源](...)` 寫法保持不變。

##### 代碼語法

```md
{{media-switcher::聚合播放器标题}}
@[来源一](媒体 ID 或分享链接 "可选标题")
@[来源二](媒体 ID 或分享链接 "可选标题")
{{/media-switcher}}
```

##### 寫法

- 標題必填，並應使用當前詞條語言，例如作品名或“官方視聽”。
- 每條內容仍使用原來的媒體短語法；支持來源及地址驗證規則完全相同。
- 各行可以直接連續書寫，不需要插入空行；同一行書寫也能解析，但為了審閲和維護，推薦每個平台單獨一行。
- 一個聚合塊接受 `2–6` 個不同平台。同一平台不能重複，不能嵌套聚合塊，也不能混入普通段落。
- 聚合塊中的所有來源必須有效；只要有一個未知平台、惡意地址或錯誤 ID，整塊就不會生成 iframe，而會保留為可見文本方便修正。
- 無 JavaScript 時所有已驗證播放器會順序顯示；啓用 JavaScript 後使用按鈕或鍵盤方向鍵、Home、End 切換。

##### 實例

```md
{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}
```

**顯示實例：**

{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}

在 Markdown 表格的同一個單元格中可以連續填寫多個短語法，播放器會按照填寫順序縱向排列。該單元格只能包含短語法及空格，不要混入説明文字：

```md
| 作曲 | 作词 | 试听 |
| --- | --- | --- |
| Wiz_nicc | Wiz_nicc | @[bilibili](BV13ZZNYQEQx) @[netease](2637083551) |
```

無法識別的來源或地址會保留為普通鏈接，不會生成任意第三方 iframe。新內容應使用短語法，以保持來源範圍、尺寸、隱私屬性和樣式一致；不要直接複製第三方網站給出的原始 `<iframe>`。

## 藝人頁的外部鏈接品牌卡片

藝人頁有兩處可以填寫官方鏈接，它們使用同一套平台識別與品牌樣式，但寫法不同。

### 資料卡中的官方鏈接

資料卡使用 frontmatter 的 `officialLinks`。每項必須同時填寫顯示名稱 `label` 和完整地址 `href`：

```yaml
officialLinks:
  - label: "官方网站"
    href: "https://kaf.kamitsubaki.jp/"
  - label: "YouTube"
    href: "https://www.youtube.com/@virtual_kaf"
```

### 正文中的外部鏈接

正文必須使用獨立的二級標題 `## 外部链接`，並在其下直接書寫普通 Markdown 無序列表。每一項都要把平台或頁面名稱寫進鏈接文字：

```md
## 外部链接

- [官方网站](https://kaf.kamitsubaki.jp/)
- [YouTube](https://www.youtube.com/@virtual_kaf)
- [X (Twitter)](https://x.com/virtual_kaf)
```

- 不要寫成 `- YouTube：<https://...>`、`- <https://...>` 或只有説明文字的列表項；這些寫法無法生成完整卡片。
- 不要使用“參考資料與外部鏈接”之類的混合標題。資料來源放在獨立的 `## 参考资料` 下，供讀者訪問的官方主頁和社交賬號放在 `## 外部链接` 下。
- 中文、日文和英文藝人正文分別使用 `外部链接`、`外部リンク` 和 `External Links`；標題必須保持準確，站點才能識別。
- JavaScript 可用時，列表會在藝人頁增強為帶平台 Logo、品牌色和外鏈箭頭的響應式鏈接卡片；語義仍是用於跳轉的鏈接，不是表單按鈕。沒有 JavaScript 時，它會保留為可讀、可點擊的普通列表。
- 當前可識別 Bilibili、YouTube、X/Twitter、TikTok、Instagram、微博、Niconico、Spotify、Apple Music、網易雲音樂、pixiv、piapro、Steam、Wikipedia 和 KAMITSUBAKI 官方站點；其他網址使用通用網站樣式。
- 不要在正文中粘貼平台 SVG 或遠程 Logo，圖標由站點統一提供。

## 提交前自檢

- 文件路徑和 `locale` 對應，三語文件共享同一個穩定 `id`、`entityType` 和關係身份。
- frontmatter 的兩個 `---`、YAML 縮進和字段類型沒有被破壞。
- 日期使用 `YYYY-MM-DD`，時長使用 `MM:SS` 或 `HH:MM:SS`。
- 新事實有可靠來源，鏈接能打開，信息圖片有合適的替代文本。
- 藝人正文的外鏈使用獨立的 `## 外部链接` 和 `- [名称](网址)` 列表，沒有裸網址或混合標題。
- 媒體使用 `@[来源](...)`，正文不包含腳本、事件屬性、密碼、令牌或個人隱私。
- Preview / Changes 中只有本次需要的修改，沒有誤刪其他語言或無關內容。

## 屬性塊指南

V3 詞條使用 Metadata Schema v2。正文語法保持不變；屬性必須與實體類型匹配，不能繼續複製舊版 translationKey、頂層 image 或舊藝人目錄模板。

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

| 實體類型 | 主要字段與規則 |
| --- | --- |
| `person` / `virtual-avatar` / `unit` | `name`、`romanizedName`、`roles`、`lifecycle` |
| `software-voice` | `name`、`romanizedName`、`voiceEngines`，以及 `relations` 中的 `based-on-voice` 關係 |
| `work-track` | `title`、`romanizedTitle`、`performers`、`credits` |
| `work-release` | `title`、`releaseType`、`tracks`；發佈後還需 `releaseDate` |
| `project` | `name` 或 `title`；發佈後還需 `status` |
| `organization` | `name` 或 `title`、`orgType` |
| `live-event` | `name` 或 `title`、`eventType`、`headliners`；發佈後還需 `dateRange` |
| `lore-concept` | `name` 或 `title`、`loreCategory` |
| `editorial-article` | `title`、`articleCategory`；發佈後還需 `author` 和 `publishDate` |

`presentation.image` / `presentation.theme` / `presentation.morphing` 控制詞條的視覺呈現。請使用嵌套 YAML，例如：

```yaml
presentation:
  image: /images/artists/kaf/cover.jpg
```

`relations` 使用穩定 ID 關聯實體。`performers` 決定歌曲目錄；多個主要表演者使用 `collaborations`。前台內容目錄規則定義在 `contentLayout.mjs`。詳情參見 [V3 貢獻指南](/zh-hk/docs/contribute/entry/)和[元數據規範](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/V3.0.0/docs/category-optimization/metadata-schema-v2.md)。

## 混合簡繁轉換與生成文件

本站把 `zh.md` 作為中文內容的唯一維護源，但文件正文與可轉換的 Frontmatter 文案可以任意混用簡體中文、台灣繁體或香港繁體，無須先統一字形。網頁讀取時會自動識別並規範化：`zh` 輸出簡中，`zh-tw` 輸出台灣繁體，`zh-hk` 輸出香港繁體。兩種繁體文件由 `scripts/generate-traditional-chinese.mjs` 在開發、檢查、測試與構建前生成；不要直接編輯或提交生成的 `zh-tw.md`、`zh-hk.md`、`zh-tw.json` 和 `zh-hk.json`。

```md
编辑：src/content/people/solo/kaf/zh.md
生成：src/content/people/solo/kaf/zh-tw.md
生成：src/content/people/solo/kaf/zh-hk.md
```

轉換器先把混合輸入通過 OpenCC 統一為簡體中間形，再按當前頁面轉換為 `cn`、`twp` 或 `hkp` 地區輸出；即使同一段中交替出現 `软件`、`軟體` 和 `軟件`，也不需要額外標記。Frontmatter 會先解析再按字段處理，以下內容保持不變：

- `id`、兼容期 `translationKey`、`code` 和羅馬字字段；
- 日期、時長、色值、目錄編號、圖片路徑和外部 URL；
- Markdown 代碼塊、行內代碼、數學公式、HTML 標籤與屬性、鏈接目標；
- 官方專名保護表中要求保留的詞彙。

站內 Markdown 鏈接的 `/zh/` 路徑會改寫為目標繁體路徑，但鏈接顯示文字仍正常轉換。歌詞控件的 `{{lyrics-controls::zh-hk}}` 也會在生成文件中同步為目標 locale。

### 正文詞彙的局部人工覆寫

自動轉換無法判斷特定語境，或同一個詞需要明確指定簡中、台灣、香港寫法時，可以在 `zh.md` 正文的可見文字中使用：

```md
这款{{zh-variant::软件::軟體::軟件}}用于管理虚拟歌手资料。
```

簡中頁面顯示 `软件`，生成的 `zh-tw` 顯示 `軟體`，`zh-hk` 顯示 `軟件`。三個參數必須都是純文本且不能為空；台繁和港繁參數是人工最終結果，選中後不會再次交給 OpenCC 轉換。代碼塊、行內代碼、數學公式、HTML 標籤或屬性、URL 和鏈接目標中的 `zh-variant` 不會執行。

這項短語法只用於正文中少量、依語境決定的詞彙，不要放進 frontmatter，也不要包住整句或整段。多篇文章反覆出現的官方專名應維護下方的全局保護表，而不是在每一處重複短語法。

### 日文原文與和制漢字

中文詞條裏常引用日文原題、歌詞或專有名詞。轉換器會自動保護：

- 含假名的日文片段（如 `赤い洗礼`、`眼裏の懐疑`）；
- 日文新字體 / 和制漢字（如 `戯`、`声帯`、`実`、`図`）；
- `{{ruby::正文::假名}}` 中讀音含假名的注音底字；
- `class="jp-lyric"` 或 `lang="ja"` 的 HTML 區塊內容；
- 與同目錄 `ja.md` 標題一致的 frontmatter `title` / 曲目標題。

純漢字、且不含上述信號的日文原題（如 `独白`、`灯火`）可用：

```md
{{ja::独白}}
```

簡中、台繁、港繁頁面都會原樣顯示 `独白`，不會被 OpenCC 改寫。也可寫成 `<span lang="ja">独白</span>`。

### 維護不轉換詞彙

不應由 OpenCC 自行處理的藝名、組織名、企劃名和產品名統一寫入：

```md
public/TraditionalChineseConvert.json
```

基本寫法：

```yaml
{
  "source": "V.W.P",
  "preserve": true,
  "category": "group"
}
```

台灣與香港需要指定相同或不同的目標寫法時：

```yaml
{
  "source": "神椿市建设中。",
  "tw": "神椿市建設中。",
  "hk": "神椿市建設中。",
  "category": "project"
}
```

詞彙會按最長匹配優先並採用 Unicode NFC 規範化。轉換時先用佔位符遮蔽，完成 OpenCC 後再恢復；不要把路徑、普通句子或只為修正文風的大片段加入保護表。

修改中文 `zh.md` 內容或保護表後運行：

```md
pnpm i18n:generate
pnpm check
pnpm test
pnpm build
```

檢查重點包括：專名是否正確、代碼和 URL 是否未變、繁體內部鏈接是否指向對應 locale，以及生成結果中是否殘留保護佔位符。

## 高級用法：保留的 HTML 語法

短語法適合大多數貢獻者，但原有的安全 HTML 寫法仍然支持，便於維護舊詞條或進行更精細的排版。HTML 必須寫在正文中並遵守前文的白名單；`style`、`onmouseover`、`onclick`、`script` 和原始 `iframe` 會被安全清理。

### HTML Ruby 注音

**寫法：**

```html
<ruby>局部坏死<rt>zheng ge hao huo</rt></ruby>
<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>
```

**顯示效果：**

<ruby>局部壞死<rt>zheng ge hao huo</rt></ruby>；<ruby>清<rt>hun</rt>楚<rt>dun</rt></ruby>

### HTML 黑幕

舊版依靠內聯樣式和滑鼠事件的寫法不再允許；保留的安全 HTML 使用站點定義好的 `wiki-spoiler` 類。

**寫法：**

```html
<span class="wiki-spoiler" tabindex="0">默认隐藏的文字</span>
```

**顯示效果：**

<span class="wiki-spoiler" tabindex="0">默認隱藏的文字</span>

### HTML 收起與展開

**寫法：**

```html
<details>
  <summary>点击展开完整曲目</summary>
  <p>这里是默认收起的补充内容。</p>
</details>
```

**顯示效果：**

<details>
  <summary>點擊展開完整曲目</summary>
  <p>這裏是默認收起的補充內容。</p>
</details>

### HTML 語義標記與換行

**寫法：**

```html
<mark>重点</mark>
<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>
按下 <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O，x<sup>2</sup>
```

**顯示效果：**

<mark>重點</mark>、<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>、按下 <kbd>Ctrl+K</kbd><br>
H<sub>2</sub>O，x<sup>2</sup>

原始 HTML 只用於白名單內的靜態排版。音頻和視頻仍應使用 `@[来源](...)`，歌詞按鈕仍應使用 `{{lyrics-controls::zh-hk}}`，這樣交互能力由站點代碼統一維護。
