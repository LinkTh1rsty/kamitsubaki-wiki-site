---
book: contribute
chapter: syntax
locale: ja
order: 4
title: Markdown・記事属性 完全ガイド
summary: 初めての修正から新規記事作成まで、Markdown、frontmatter、メディア、記事構成、PR 前確認を一つにまとめたリファレンスです。
---

これは最初から最後まで暗記する教材ではなく、**必要なときに参照するリファレンス**です。初めての貢献では[投稿を選んで準備する](/ja/docs/contribute/start/)で作業を選び、編集中に見出し、リンク、画像、メディア、frontmatter で迷ったときだけ該当章へ移動してください。

## 編集を始める前に

最短で確実な流れは次のとおりです。

1. 対象が `src/content/` 配下にあり、`zh.md`、`ja.md`、`en.md` が目的の言語と一致することを確認します。
2. 今回の目的に必要な箇所だけを変更し、新しい事実には追跡可能な出典を用意します。
3. frontmatter の両方の `---`、既存フィールド、インデント、引用符を保ちます。
4. Pull Request を作成する前に Preview / Changes で差分を確認します。

本サイトは Wikitext ではなく Markdown を使用します。構文記号は半角 ASCII で入力してください。日本語・中国語入力の全角記号は Markdown として機能しません。

> 初心者の原則：小さく正確な変更を優先してください。無関係な段落をついでに整理せず、AI の出力を事実の出典として扱わないでください。

## 見出し

`#` で見出しを作成します。記号の数が階層に対応し、最大6階層まで使えます。`#` の後ろには半角スペースが必要です。ページタイトルは frontmatter から表示されるため、記事本文は通常 `##` から始めます。

**記述例：**

```md
## レベル2の見出し
### レベル3の見出し
```

**表示例：**

### レベル3の見出し例

## テキストの書式

**記述例：**

```md
**太字テキスト**
*斜体テキスト*
***太字斜体テキスト***
~~取り消し線テキスト~~
`インラインコード`
```

**表示例：**

**太字テキスト**、*斜体テキスト*、***太字斜体テキスト***、~~取り消し線テキスト~~、`インラインコード`

## リスト

### 箇条書きリスト

`-` または `+` を使用します。

**記述例：**

```md
- 項目1
- 項目2
```

**表示例：**

- 項目1
- 項目2

リスト記号の後ろには、必ず半角スペースを入れてください。

### 番号付きリスト

数字の後ろにピリオドを付けます。

**記述例：**

```md
1. 手順1
2. 手順2
3. 手順3
```

**表示例：**

1. 手順1
2. 手順2
3. 手順3

## ハイパーリンク

**記述例：**

```md
[本サイト](https://kamitsubaki.wiki/ja/)
```

**表示例：**

[本サイト](https://kamitsubaki.wiki/ja/)

## 表

`|` で列を区切り、`-` で見出し行との区切りを定義します。

**記述例：**

```md
| アーティスト | 楽曲名 | 歌詞 |
| :--- | :---: | ---: |
| KAF | 糸 | 省略 |
| RIM | 1999 | 省略 |
```

**表示例：**

| アーティスト | 楽曲名 | 歌詞 |
| :--- | :---: | ---: |
| KAF | 糸 | 省略 |
| RIM | 1999 | 省略 |

配置方法：

- `:---`：左揃え
- `:---:`：中央揃え
- `---:`：右揃え

## Frontmatter

ファイル上部のFrontmatterには、編集する記事の属性を記述します。

Frontmatterの開始記号と終了記号には、どちらも `---` を使用します。

例：

```yaml
---
locale: ja
schemaVersion: 2
id: example-entry
entityType: editorial-article
articleCategory: archival
contentStatus: stub
title: 記事の例
---
```

**表示結果：** ページはこれらのフィールドからタイトル、言語間の関連、メタデータを生成します。YAML ブロック自体は記事本文に表示されません。
## 画像の挿入

**記述例：**

```md
![花譜「糸」のカバー画像](/images/songs/shi.webp)
```

**表示結果：** この位置に画像が表示されます。画像がまだ追加されていない場合も、代替テキストが内容を説明します。

画像ファイルは `public/images/` に配置しますが、Markdown の URL は `/images/` から始め、`public` を含めません。情報を持つ画像には内容を説明する代替テキストを付け、装飾画像では `![](...)` のように空にできます。

原本アップロード・パス・分類は[画像とファイル](/ja/contribute/files/)を参照。原本は圧縮せず、サイト内添付の上限を超える場合はGitHubへ直接アップロードします。

## エディターを使う

最初は[貢献ガイド](/ja/contribute/edit/)で小さな修正を行い、[エディター](/ja/contribute/editor/)に原文を読み込みます。文字選択で太字・リンク・ルビ・ネタバレを設定。空の段落で `/`、または「内容を挿入」で表・画像・メディア・対訳歌詞を追加します。

上部の記事プロパティで資料を入力し、右側のプレビューとブロック属性で確認します。サイト内提出、または完全なMarkdownを出力して原本と同じGitHub PRに追加できます。端末の下書きは自動保存しますが、画像付き下書きはクラウド保存未対応です。画像URLの記入だけではアップロードされません。複雑な編集はソースで行います。

## Wiki 短縮構文と管理されたメディア

Markdown の基本を学んだ後は、ルビ、折りたたみ、意味付けのために、サイトが対応する一部の HTML を使用できます。本文の HTML はビルド時に安全化されるため、ブラウザーが対応するすべての要素を利用できるわけではありません。

### 安全境界

本文では次の種類の要素だけを許可します。

- 構造：`p`、`h1`–`h6`、`blockquote`、`hr`、`br`、`div`、`span`。
- テキストの意味付け：`a`、`abbr`、`b`、`strong`、`i`、`em`、`u`、`s`、`del`、`mark`、`small`、`code`、`pre`、`kbd`、`samp`、`var`、`sub`、`sup`、`cite`、`q`、`time`。
- リストとデータ：`ul`、`ol`、`li`、`dl`、`dt`、`dd`、`table`、`thead`、`tbody`、`tfoot`、`tr`、`th`、`td`。
- Wiki 向け表現：`ruby`、`rt`、`rp`、`details`、`summary`、`figure`、`figcaption`、`picture`、`img`、`source`。

属性もホワイトリスト方式です。通常のリンク、画像の代替テキスト、表のセル結合などは保持されますが、`class` はサイト側で実装済みの用途だけに制限されます。次の内容は削除されます。

- `script`、`style`、`iframe`、`object`、`embed`、`form` など、コード実行や任意の外部コンテンツ読み込みにつながる要素。
- `onclick`、`onmouseover`、`onerror` などすべての `on*` イベント属性と、インライン `style`。
- `javascript:` など危険な URL スキーム。本文で指定した `id` / `name` には安全な接頭辞が付き、ページ側のオブジェクトを上書きできません。

投稿者がこの HTML を直接書く必要は通常ありません。下記の Wiki 短縮構文を優先してください。サイト側のコードが対応する要素を生成し、その結果も同じホワイトリストで検査されます。新しい操作が必要な場合は PR で再利用可能な短縮構文を提案し、スクリプトや外部プレイヤーのコードを記事へ貼り付けないでください。

### Wiki 短縮構文一覧

短縮構文は関数に似た `{{名前::引数}}` 形式です。名前と引数の数は固定されています。

| 用途 | 構文 |
| --- | --- |
| ルビ | `{{ruby::本文::読み}}` |
| 読みとローマ字 | `{{ruby::本文::かな::romaji}}` |
| ネタバレ / 伏せ字 | `{{spoiler::隠す文字}}` |
| 強調表示 | `{{mark::重要}}` |
| 略語の説明 | `{{abbr::V.W.P::Virtual Witch Phenomenon}}` |
| キーボード入力 | `{{kbd::Ctrl+K}}` |
| 機械可読の日付 | `{{time::表示文字::2026-07-19}}` |
| 小文字、上付き、下付き | `{{small::文字}}`、`{{sup::2}}`、`{{sub::2}}` |
| 台湾・香港繁体字の語彙上書き | `{{zh-variant::簡体字::台湾繁体字::香港繁体字}}` |
| 日本語原文（変換しない） | `{{ja::日本語の原題}}` |
| 歌詞切り替えボタン | `{{lyrics-controls::ja}}`（各ファイルでは `zh` / `en` に変更） |

インライン構文の引数はプレーンテキストです。内部に Markdown や HTML を入れず、二重コロン `::` を引数の区切りとして使います。Markdown 表の中でも列を壊しません。`zh-variant` の三つの引数は、簡体字、台湾繁体字、香港繁体字の順に固定されています。名前や引数数が誤っている場合は元の文字列が表示されるため、Preview で間違いを確認できます。

**記述例：**

```md
{{mark::重要な内容}}
{{abbr::V.W.P::Virtual Witch Phenomenon}}
{{kbd::Ctrl+K}} を押す
{{time::2026年7月19日::2026-07-19}}
H{{sub::2}}O と x{{sup::2}}
{{small::補足説明}}
```

**表示例：**

{{mark::重要な内容}}、{{abbr::V.W.P::Virtual Witch Phenomenon}}、{{kbd::Ctrl+K}} を押す、{{time::2026年7月19日::2026-07-19}}、H{{sub::2}}O と x{{sup::2}}、{{small::補足説明}}

楽曲ページでは `{{lyrics-controls::ja}}` を独立した段落にし、`.my-lyric-box` 歌詞コンテナの直前に置きます。サイトが各言語用のルビ、翻訳、ローマ字、同期歌詞ボタンを生成し、日本語版では翻訳ボタンを自動的に省略します。引数はファイルの `locale` と一致させてください。

### 歌詞ページの完全な書き方

歌詞ページは、ローカライズされた切り替えボタン、歌詞コンテナ、繰り返す歌詞行の3部分で構成します。ボタンは独立した段落としてコンテナの直前に置き、各 `lyric-line` に原文1行を記述します。

#### コード構文

```md
{{lyrics-controls::言語}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>原文<rt class="furi">かな</rt><rt class="roma">romaji</rt></ruby>
</div>
</div>

</div>
```

- `言語` は現在のファイルに合わせて `zh`、`ja`、`en` のいずれかにします。
- `furi` は「注音を表示」ボタンで切り替えるかな、`roma` はローマ字トラックです。
- 中国語訳は `cn-lyric`、英語訳は `trans-lyric` を使い、日本語ファイルでは翻訳用 `<div>` を記述しません。
- かな自体にルビが不要な場合は、ローマ字だけを書けます：`<ruby>なら<rt class="roma">nara</rt></ruby>`。
- 行を増やすたびに `lyric-line` 一式を複製します。この生 HTML ブロック内に `{{ruby::...}}` 短縮構文を置かないでください。HTML ブロック内部では Markdown 短縮構文が再解析されません。

#### 書き方

日本語の楽曲ファイルへコピーできる、1行分の完全な例です。

```md
{{lyrics-controls::ja}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
</div>

</div>
```

#### 実例

上のコードは、操作できる歌詞練習コンポーネントとして表示されます。

{{lyrics-controls::ja}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby><ruby>い<rt class="roma">i</rt></ruby>
</div>
</div>

</div>

### 同期歌詞のタイムライン

カラオケ風の単語アニメーションを表示する場合は、各歌詞単位の直前に `[mm:ss.xx]` または `[mm:ss.xxx]` のタイムタグを記述します。時刻は歌詞タイマーの開始点を基準とした、その単位の開始時刻です。再生中は隣り合うタイムタグの間を左から右へ連続的に塗り進めます。「再生」で `00:00.00` から計時し、タイムタグ付きの行をクリックするとその行へ移動して再生を続け、「リセット」で先頭へ戻ります。

- `mm` と `ss` はそれぞれ2桁、小数部は2桁または3桁です。例：`[00:03.50]`、`[01:02.345]`。
- タイムタグは対象の `<ruby>` またはプレーンテキストへ空白を入れず直結します。個別に強調する単位ごとに開始時刻が必要です。
- 各 `.jp-lyric` の最初のタイムタグは、その行をクリックしたときの移動先にもなります。翻訳行がある場合は、先頭に原文と同じ行開始時刻を付けることを推奨します。
- 各単位は次のタイムタグまで塗り進みます。行末の単位は次の行まで続き、最終行には短い自動終了時間が適用されます。
- 時刻は再生順に増加させます。一部の行だけにタイムタグを付けることもでき、タグのない行は通常表示のままです。
- 投稿者が書くのは角括弧のタイムタグだけです。サイト生成後の `lrc-tag`、`lrc-word`、スクリプトを手書きしないでください。時刻は実際に試聴して調整し、AI に推測させないでください。
- 現在の歌詞タイマーは独立しており、上部の YouTube、bilibili、その他の試聴プレイヤーの再生位置を自動取得しません。

#### 書き方

```md
{{lyrics-controls::ja}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
</div>

</div>
```

#### 実例

同期歌詞を有効にすると、次の2つの日本語単位が `0` 秒と `0.8` 秒から順に左から右へ塗られます。

{{lyrics-controls::ja}}

<div class="my-lyric-box">

<div class="lyric-line">
<div class="jp-lyric">
[00:00.00]<ruby>間違<rt class="furi">まちが</rt><rt class="roma">machiga</rt></ruby>[00:00.80]<ruby>い<rt class="roma">i</rt></ruby>
</div>
</div>

</div>

### 歌詞 HTML を生成する AI プロンプト

長い歌詞では、手元にある原文、読み、ローマ字、翻訳を AI に機械的に整形させられます。AI を歌詞・翻訳・読みの出典にはせず、貼り付け前に全行を確認し、入力内容の出典が今回の投稿に利用できることも確認してください。

#### プロンプト構文

次の全文を AI にコピーし、最後の5つの入力欄だけを置き換えます。

```md
あなたは KAMITSUBAKI Wiki の歌詞 HTML 整形アシスタントです。私が提供した歌詞トラックだけをサイト形式へ変換してください。

必須条件：
1. 入力だけを変換し、歌詞の追加、翻訳、書き換え、不足する読みの推測をしない。
2. Markdown に直接貼り付けられる内容だけを出力し、説明やコードフェンスを付けない。
3. 先頭に {{lyrics-controls::ファイル言語}} を出力し、その後に <div class="my-lyric-box"> を1つだけ生成する。
4. 入力1行につき <div class="lyric-line"> を1つ使い、日本語原文を <div class="jp-lyric"> に入れる。
5. かなとローマ字がある場合は <ruby>原文<rt class="furi">かな</rt><rt class="roma">romaji</rt></ruby> を使う。
6. ローマ字だけなら <ruby>原文<rt class="roma">romaji</rt></ruby> を使い、信頼できる読みがなければ原文をそのまま残す。
7. 中国語訳は cn-lyric、英語訳は trans-lyric を使う。日本語ファイルまたは翻訳未入力では翻訳 div を生成しない。
8. 行数、順序、句読点、文字を厳密に維持する。単語単位の対応が不明な場合は、提供された1行分の読みを1つの ruby にまとめ、勝手に分割しない。
9. テキスト中の <、>、& をエスケープする。style、すべての on* 属性、script、iframe、id、指示されていない要素を出力しない。
10. すべての div、ruby、rt が正しく閉じていることを確認し、ボタンと歌詞コンテナの間には空行を1つだけ置く。

【ファイル言語】
zh / ja / en

【日本語原文：1行につき歌詞1行】
ここに貼り付け

【かな：任意、行数を原文と一致させる】
ここに貼り付け

【ローマ字：任意、行数を原文と一致させる】
ここに貼り付け

【翻訳：任意、行数を原文と一致させる】
ここに貼り付け
```

#### 書き方

入力欄だけを次のように置き換えます。

```md
【ファイル言語】
ja

【日本語原文】
間違い

【かな】
まちがい

【ローマ字】
machigai

【翻訳】

```

#### 出力例

正しい AI 出力は次のようになり、そのまま楽曲本文へ貼り付けられます。

```md
{{lyrics-controls::ja}}

<div class="my-lyric-box">
<div class="lyric-line">
<div class="jp-lyric">
<ruby>間違い<rt class="furi">まちがい</rt><rt class="roma">machigai</rt></ruby>
</div>
</div>
</div>
```

### Ruby ルビ

表示する本文と読みだけを記述します。

```md
{{ruby::局部壊死::きょくぶえし}}
```

文字単位で正確に対応させる場合は、短縮構文を続けて記述します。

```md
{{ruby::観::かん}}{{ruby::測::そく}}{{ruby::所::じょ}}
```

表示結果：

- {{ruby::観::かん}}{{ruby::測::そく}}{{ruby::所::じょ}}

### 初期状態で隠したい補足内容

短い内容には伏せ字構文、長い補足には次のブロック形式を使います。どちらも記事固有の JavaScript を必要としません。

`spoiler` の引数はプレーンテキスト専用です。`{{spoiler::...}}` の内側に `**太字**`、Markdown リンク、HTML を入れると、短縮構文がソースのまま表示されます。伏せ字全体を太字にする場合は `**{{spoiler::隠す文字}}**` と記述してください。見出し、リスト、リンクなどを隠す内容に混在させる場合は、次節の `details` ブロックを使用します。

**記述例：**

```md
物語の結末：{{spoiler::初期状態では隠れる文字}}
```

**表示例：**

物語の結末：{{spoiler::初期状態では隠れる文字}}

### 折りたたみと展開

対になる `details` マーカーを使います。開始・終了マーカーはそれぞれ独立した段落にし、前後に空行を置いてください。内部では通常の Markdown を使用できます。

```md
{{details::全曲リストを表示}}

1. 1曲目
2. **2曲目**

{{/details}}
```

表示結果：

{{details::全曲リストを表示}}

1. 1曲目
2. **2曲目**

{{/details}}

通常の段落は空行で分けます。表のセルなど特殊な場所だけ、ホワイトリストに含まれる `<br>` を使用してください。

### 音声・動画の埋め込み

本サイトでは共通のメディア短縮構文を使用できます。次の構文を1行だけで記述すると、ビルド時にレスポンシブで安全な遅延読み込み `iframe` が生成されます。

```md
@[プロバイダー](メディア ID または共有 URL "任意のタイトル")
```

プロバイダー名は `youtube`、`bilibili`、`apple-music`、`spotify`、`netease`、`qq-music` に対応しています。YouTube、bilibili、NetEase Cloud Music、QQ Music は動画・楽曲 ID の直接指定にも対応し、すべてのプロバイダーで一般的な共有 URL を使用できます。

```md
@[youtube](3Wtx6k2vInU "花譜 - 糸")
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[apple-music](https://music.apple.com/cn/song/example/123456789)
@[spotify](https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT)
@[netease](2637083551)
@[qq-music](001ABCDEF)
```

**表示例：**

@[youtube](3Wtx6k2vInU "花譜 - 糸")

#### 集約メディア切り替え

同じ作品に複数プラットフォームの公式コンテンツがある場合、既存のメディア短縮構文を一つの集約ブロックにまとめられます。ページには選択中のソースと切り替えボタンが表示され、従来の単独 `@[provider](...)` 構文はそのまま利用できます。

##### コード構文

```md
{{media-switcher::切り替えタイトル}}
@[1つ目のプロバイダー](メディアIDまたは共有URL "任意のキャプション")
@[2つ目のプロバイダー](メディアIDまたは共有URL "任意のキャプション")
{{/media-switcher}}
```

##### 書き方

- 作品名や「公式視聴」など、現在の言語に合うタイトルが必須です。
- 各項目は従来のメディア構文を使い、対応プロバイダーと URL の検証規則も同じです。
- 各行は空行を挟まず続けて記述できます。一行にまとめても解析されますが、レビューと保守のため、プラットフォームごとに一行で書くことを推奨します。
- 一つのブロックには異なる `2–6` プラットフォームを指定できます。同じプロバイダーの重複、集約ブロックの入れ子、通常段落の混在はできません。
- すべてのソースが有効である必要があります。不明なプロバイダー、危険な URL、不正な ID が一つでもある場合、ブロック全体は iframe を生成せず、修正できるようソーステキストを表示します。
- JavaScript がない場合は検証済みプレイヤーを順番に表示します。JavaScript がある場合はボタン、方向キー、Home、End で切り替えられます。

##### 実例

```md
{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}
```

**表示例：**

{{media-switcher::花譜 - 糸}}
@[bilibili](BV1CJ411b7Ym "花譜 - 糸")
@[youtube](3Wtx6k2vInU "花譜 - 糸")
{{/media-switcher}}

同じ Markdown 表のセルに複数の短縮構文を続けて記述すると、記述順に縦方向へ表示されます。そのセルには短縮構文と空白だけを記述し、説明文を混在させないでください。

```md
| 作曲 | 作詞 | プレイヤー |
| --- | --- | --- |
| Wiz_nicc | Wiz_nicc | @[bilibili](BV13ZZNYQEQx) @[netease](2637083551) |
```

認識できないプロバイダーや URL は通常のリンクとして残り、任意の第三者 iframe は生成されません。新規コンテンツでは、許可プロバイダー、プライバシー属性、サイズ、スタイルを統一するため短縮構文を使用し、第三者サイトの生の `<iframe>` を貼り付けないでください。

## アーティストページの外部リンク・ブランドカード

アーティストページでは、2 か所に公式リンクを記述できます。どちらも同じプラットフォーム判定とブランド表示を使いますが、記述方法は異なります。

### 情報欄の公式リンク

情報欄では frontmatter の `officialLinks` を使用します。各項目には表示名 `label` と完全な URL `href` の両方が必要です。

```yaml
officialLinks:
  - label: "公式サイト"
    href: "https://kaf.kamitsubaki.jp/"
  - label: "YouTube"
    href: "https://www.youtube.com/@virtual_kaf"
```

### 本文の外部リンク

本文では、独立したレベル2見出し `## 外部リンク` を正確に記述し、その直下に通常の Markdown 箇条書きリストを置きます。各リンクの文字列にはプラットフォーム名またはページ名を含めてください。

```md
## 外部リンク

- [公式サイト](https://kaf.kamitsubaki.jp/)
- [YouTube](https://www.youtube.com/@virtual_kaf)
- [X (Twitter)](https://x.com/virtual_kaf)
```

- `- YouTube：<https://...>`、`- <https://...>`、説明文だけの項目は使用しないでください。これらの形式では完全なカードを生成できません。
- 「出典と外部リンク」のような複合見出しは使用しないでください。根拠資料は独立した `## 出典` に、読者向けの公式サイトや SNS は `## 外部リンク` に分けます。
- 中国語・日本語・英語のアーティスト本文では、それぞれ `外部链接`、`外部リンク`、`External Links` を使用します。サイトが認識できるよう、見出しを正確に記述してください。
- JavaScript が有効な場合、アーティストページではリストがプラットフォーム Logo、ブランド色、外部リンク矢印を備えたレスポンシブなリンクカードになります。フォーム用ボタンではなく、移動用リンクとしての意味は保たれます。JavaScript がない場合は、読みやすくクリック可能な通常のリストとして残ります。
- Bilibili、YouTube、X/Twitter、TikTok、Instagram、Weibo、Niconico、Spotify、Apple Music、NetEase Cloud Music、pixiv、piapro、Steam、Wikipedia、KAMITSUBAKI 公式サイトを識別できます。その他の URL には汎用サイト表示を使用します。
- プラットフォームの SVG やリモート Logo 画像を本文へ貼り付けないでください。アイコンはサイト側で一元管理します。

## PR 前チェック

- ファイルパスと `locale` が対応し、各言語版で同じ安定 `id`、`entityType`、関係先 ID を使っている。
- 2 つの `---`、YAML のインデント、フィールド型を壊していない。
- 日付は `YYYY-MM-DD`、再生時間は `MM:SS` または `HH:MM:SS`。
- 新しい事実に信頼できる出典があり、リンクが開き、情報画像に適切な代替テキストがある。
- アーティスト本文のリンクは独立した `## 外部リンク` と `- [表示名](URL)` のリストを使い、生の URL や複合見出しがない。
- メディアは `@[provider](...)` を使用し、本文にスクリプト、イベント属性、認証情報、トークン、個人情報がない。
- Preview / Changes に今回の変更だけがあり、他言語や無関係な内容を誤って削除していない。

## 属性ブロックガイド

V3 の記事は Metadata Schema v2 を使用します。本文の構文は変わりません。属性はエンティティの種類に合わせ、旧 translationKey、トップレベルの image、旧アーティスト用テンプレートはコピーしないでください。

```yaml
schemaVersion: 2
id: example-article
locale: ja
entityType: editorial-article
title: Example article
articleCategory: archival
contentStatus: stub
relatedEntities: []
```

| エンティティ型 | 主なフィールドと規則 |
| --- | --- |
| `person` / `virtual-avatar` / `unit` | `name`、`romanizedName`、`roles`、`lifecycle` |
| `software-voice` | `name`、`romanizedName`、`voiceEngines`、および `relations` 内の `based-on-voice` 関係 |
| `work-track` | `title`、`romanizedTitle`、`performers`、`credits` |
| `work-release` | `title`、`releaseType`、`tracks`。公開後は `releaseDate` も必須 |
| `project` | `name` または `title`。公開後は `status` も必須 |
| `organization` | `name` または `title`、`orgType` |
| `live-event` | `name` または `title`、`eventType`、`headliners`。公開後は `dateRange` も必須 |
| `lore-concept` | `name` または `title`、`loreCategory` |
| `editorial-article` | `title`、`articleCategory`。公開後は `author` と `publishDate` も必須 |

`presentation.image` / `presentation.theme` / `presentation.morphing` は記事の表示を制御します。次のようにネストした YAML を使用してください。

```yaml
presentation:
  image: /images/artists/kaf/cover.jpg
```

`relations` は安定 ID でエンティティを関連付けます。`performers` は楽曲フォルダーを決定し、主な出演者が複数いる場合は `collaborations` を使用します。フロントの内容配置規則は `contentLayout.mjs` で定義します。詳しくは [V3 貢献ガイド](/ja/docs/contribute/entry/)と[メタデータ仕様](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/V3.0.0/docs/category-optimization/metadata-schema-v2.md)を参照してください。

## 簡体字・繁体字の混在変換と生成ファイル

中国語コンテンツは `zh.md` を唯一の編集元としますが、本文と変換対象の Frontmatter 文言には簡体字、台湾繁体字、香港繁体字を自由に混在させられます。事前に字形を統一する必要はありません。ページ読込時に自動判定・正規化され、`zh` は簡体字、`zh-tw` は台湾繁体字、`zh-hk` は香港繁体字で表示されます。繁体字ファイルは `scripts/generate-traditional-chinese.mjs` により開発・検査・テスト・ビルドの前に生成されます。生成された `zh-tw.md`、`zh-hk.md`、`zh-tw.json`、`zh-hk.json` を直接編集またはコミットしないでください。

```md
編集：src/content/people/solo/kaf/zh.md
生成：src/content/people/solo/kaf/zh-tw.md
生成：src/content/people/solo/kaf/zh-hk.md
```

変換器は混在入力を OpenCC でいったん簡体字の中間形に統一し、現在のページに応じて `cn`、`twp`、`hkp` の地域出力へ変換します。同じ段落に「软件」「軟體」「軟件」が混在しても追加の記法は不要です。Frontmatter は解析後にフィールド単位で処理し、次の値は変換しません。

- `id`、互換期間だけの `translationKey`、`code`、ローマ字フィールド
- 日付、長さ、色、カタログ番号、画像パス、外部 URL
- Markdown のコードブロック、インラインコード、数式、HTML のタグと属性、リンク先
- 公式固有名詞の保護表に登録された語

Markdown 内部リンクの `/zh/` は対象 locale のパスに変更されますが、表示テキストは通常どおり変換されます。`{{lyrics-controls::zh}}` も生成先の locale に同期します。

### 本文語彙の局所的な手動上書き

自動変換では判断できない文脈、または簡体字・台湾・香港の表記を明示したい語には、編集元の `zh.md` の可視テキストに次の短縮構文を置きます。

```md
这款{{zh-variant::软件::軟體::軟件}}用于管理虚拟歌手资料。
```

簡体字ページでは `软件`、生成された `zh-tw` では `軟體`、`zh-hk` では `軟件` と表示されます。三つの引数はすべて空でないプレーンテキストにします。選択された台湾・香港の引数は人が指定した最終結果であり、OpenCC で再変換されません。コードブロック、インラインコード、数式、HTML のタグや属性、URL、リンク先では実行されません。

この短縮構文は、本文中の少数の文脈依存語にだけ使用します。frontmatter に置かず、文や段落全体を囲まないでください。複数の記事で繰り返す公式固有名詞は、下記の共通保護表で管理します。

### 日本語原文と国字・新字体

中国語ページ内の日本語原題・歌詞・固有名詞は、変換器が次を自動保護します。

- かなを含む日本語らしき連なり（例：`赤い洗礼`、`眼裏の懐疑`）
- 日本の新字体・国字（例：`戯`、`声帯`、`実`、`図`）
- 読みがかなである `{{ruby::本文::読み}}` のベース
- `class="jp-lyric"` または `lang="ja"` の HTML ブロック
- 同じディレクトリの `ja.md` と一致する frontmatter の `title` / 曲名

かなも新字体も含まない日本語原題（例：`独白`、`灯火`）は次のように書きます。

```md
{{ja::独白}}
```

### 変換しない語の管理

OpenCC に任せないアーティスト名、組織名、企画名、製品名は次のファイルで一元管理します。

```md
public/TraditionalChineseConvert.json
```

そのまま保持する例：

```yaml
{
  "source": "V.W.P",
  "preserve": true,
  "category": "group"
}
```

台湾・香港向けの表記を指定する例：

```yaml
{
  "source": "神椿市建设中。",
  "tw": "神椿市建設中。",
  "hk": "神椿市建設中。",
  "category": "project"
}
```

語は長いものから照合し、Unicode NFC で正規化されます。OpenCC の前にプレースホルダーで隠し、変換後に復元します。パス、一般文、文体修正だけを目的とした長い文章を保護表へ追加しないでください。

中国語の `zh.md` 本文または保護表を変更した後は、次を実行します。

```md
pnpm i18n:generate
pnpm check
pnpm test
pnpm build
```

固有名詞、コード、URL、繁体字版の内部リンク、未復元プレースホルダーを確認してください。

## 高度な使い方：対応する生 HTML

通常は短縮構文が簡単ですが、旧記事の保守や細かなマークアップのため、従来の安全な HTML 形式も引き続き利用できます。HTML は前述のホワイトリスト内に限定され、`style`、`onmouseover`、`onclick`、`script`、生の `iframe` はサニタイザーによって削除されます。

### HTML Ruby ルビ

**記述例：**

```html
<ruby>局部壊死<rt>きょくぶえし</rt></ruby>
<ruby>観<rt>かん</rt>測<rt>そく</rt>所<rt>じょ</rt></ruby>
```

**表示例：**

<ruby>局部壊死<rt>きょくぶえし</rt></ruby>、<ruby>観<rt>かん</rt>測<rt>そく</rt>所<rt>じょ</rt></ruby>

### HTML 伏せ字

インラインスタイルやマウスイベント属性に依存した旧形式は利用できません。安全な生 HTML では、サイト定義の `wiki-spoiler` クラスを使用します。

**記述例：**

```html
<span class="wiki-spoiler" tabindex="0">初期状態では隠れる文字</span>
```

**表示例：**

<span class="wiki-spoiler" tabindex="0">初期状態では隠れる文字</span>

### HTML 折りたたみ

**記述例：**

```html
<details>
  <summary>全曲リストを表示</summary>
  <p>この補足内容は初期状態では閉じています。</p>
</details>
```

**表示例：**

<details>
  <summary>全曲リストを表示</summary>
  <p>この補足内容は初期状態では閉じています。</p>
</details>

### HTML の意味要素と改行

**記述例：**

```html
<mark>重要</mark>
<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>
<kbd>Ctrl+K</kbd> を押す<br>
H<sub>2</sub>O と x<sup>2</sup>
```

**表示例：**

<mark>重要</mark>、<abbr title="Virtual Witch Phenomenon">V.W.P</abbr>、<kbd>Ctrl+K</kbd> を押す<br>
H<sub>2</sub>O と x<sup>2</sup>

生 HTML はホワイトリスト内の静的マークアップ専用です。メディアには `@[provider](...)`、歌詞操作には `{{lyrics-controls::ja}}` を使い、操作機能はサイトコードで一元管理してください。
