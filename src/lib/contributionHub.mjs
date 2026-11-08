import {resolveLocaleCopy} from './i18n.mjs';
export const hubDocuments=['overview','editor','github','files','syntax','format','licensing'];
export const contributionHub = locale => resolveLocaleCopy({
 zh:{title:'贡献中心',intro:'从开始编辑到提交审核，按顺序阅读需要的文档。所有指南都在这一页。',home:'返回首页',editor:'打开编辑器',editorNote:'准备好后直接开始编辑；已有草稿和投稿仍在独立编辑器中。',tabs:['快速入门','站内编辑','GitHub 投稿','图片与文件','语法与属性','内容与格式','授权与署名'],contents:'本篇目录',source:'编辑原文',target:'当前目标文件'},
 en:{title:'Contribution hub',intro:'From your first edit to review. Read the documents in order or jump to the one you need, all on this page.',home:'Back to home',editor:'Open editor',editorNote:'Ready to write? Your drafts and submissions stay in the separate editor.',tabs:['Quick start','In-site editing','GitHub workflow','Images and files','Syntax and properties','Content and style','Licensing'],contents:'In this document',source:'Edit source',target:'Selected source file'},
 ja:{title:'貢献センター',intro:'編集からレビューまで、順番に読むか必要な文書を選べます。すべてのガイドをこのページにまとめました。',home:'ホームへ',editor:'エディターを開く',editorNote:'準備ができたら執筆へ。下書きと投稿は独立したエディターに残ります。',tabs:['はじめに','サイト内編集','GitHub投稿','画像とファイル','構文と属性','内容と書式','許諾と署名'],contents:'この文書の目次',source:'原文を編集',target:'対象ファイル'}
},locale);

export const hubOverview=locale=>resolveLocaleCopy({
 zh:`第一次来，不必先读完全部文档。先选一个熟悉的词条，完成一处小修改，再按需要查阅后面的指南。

## 四步完成第一次贡献

1. **选一处修改。** 从错字、失效链接、明确的日期或一句翻译开始。涉及事实时，先准备能直接支持改动的来源。
2. **打开编辑器。** 登录 Wiki，选择“编辑旧词条”，确认标题与语言。准备新建词条时，先搜索，避免重复。
3. **修改并检查。** 编辑正文，检查词条属性与预览；提交前查看差异，确认没有误删内容，并保存草稿。
4. **提交审核。** 写清改了什么、为什么改、来源是什么。之后在“投稿与评论”跟进；审核合并并部署后才会显示到正式词条。

[阅读站内编辑步骤](#editor) · [了解 GitHub 投稿](#github)

## 按任务选择学习路径

| 你想做什么 | 建议阅读顺序 |
| --- | --- |
| 修错字、补资料、改翻译 | [站内编辑](#editor) → [内容与格式](#format) → 提交审核 |
| 新建词条 | [站内编辑](#editor) → [图片与文件](#files)中的目录分类 → [语法与属性](#syntax)中的对应字段 |
| 添加图片或封面 | [图片与文件](#files) → [授权与署名](#licensing) → 填写图片地址 |
| 做表格、列表、注音或媒体排版 | [语法与属性](#syntax) → 编辑器预览 |
| 直接修改仓库文件、公告或指南 | [GitHub 投稿](#github) → 同一分支提交 → 创建 PR |

## 提交前记住这三件事

- **写自己能核实的内容。** 不确定的资料先说明，不用占位文字或猜测填满词条。
- **把来源和授权一起留下。** 上传图片不会自动获得使用许可；词条附件按图片文档提交；设定图库从图库管理页上传，经站长审核后公开，不走 GitHub。
- **草稿、投稿、发布是三步。** 保存草稿不等于提交；创建 PR 不等于已经发布。收到意见后继续更新原投稿。

## 这页怎么用

上面的滑块按“快速入门 → 站内编辑 → GitHub 投稿 → 图片与文件 → 语法与属性 → 内容与格式 → 授权与署名”排列。点击直接切换正文；左侧目录可以跳到本篇章节，浏览器返回可回到前一处。准备好后使用右上角的“打开编辑器”。`,
 en:`You do not need to read every document before contributing. Start with one small change to an article you know, then consult the guides as needed.

## Your first contribution in four steps

1. **Choose one change.** Fix a typo, a broken link, a verified date or a translation. Gather a direct source for factual changes.
2. **Open the editor.** Sign in, choose Edit existing article, and confirm the title and language. Search before creating a new article to avoid duplicates.
3. **Edit and check.** Review the article properties, preview and diff. Make sure nothing was accidentally removed, and save your draft.
4. **Submit for review.** Explain the change, reason and sources. Follow Submissions and comments. Publication follows review, merge and successful deployment.

[Read the editing steps](#editor) · [Use GitHub instead](#github)

## Choose a learning path

| Your task | Suggested reading order |
| --- | --- |
| Correct text, add facts or translate | [In-site editing](#editor) → [Content and style](#format) → review |
| Create an article | [In-site editing](#editor) → folders in [Images and files](#files) → fields in [Syntax and properties](#syntax) |
| Add an image or cover | [Images and files](#files) → [Licensing](#licensing) → enter the image path |
| Format tables, lists, ruby or media | [Syntax and properties](#syntax) → editor preview |
| Edit repository files, announcements or guides | [GitHub workflow](#github) → commit on one branch → open a PR |

## Three things to remember

- **Verify your facts.** Explain uncertainty instead of filling gaps with guesses or placeholder text.
- **Keep sources and permissions.** Uploading an image does not grant permission. Article attachments follow the file guide. Reference gallery images use the gallery manager and owner review, without GitHub.
- **Saving, submitting and publishing are separate.** A draft is not a submission, and a PR is not publication. Update the same submission after feedback.

## Using this page

The tabs progress from quick start through editing, GitHub, files, syntax, style and licensing. They switch the document without leaving this page. Use the document contents to jump to a section, browser Back to return, and Open editor when ready.`,
 ja:`最初にすべてを読む必要はありません。よく知っている記事の小さな修正から始め、必要なガイドを参照してください。

## 初めての貢献は四つの手順で

1. **一つの修正を選ぶ。** 誤字、リンク切れ、確認できる日付、翻訳などから始めます。事実の変更には直接裏付ける出典を用意します。
2. **エディターを開く。** ログインし、既存記事を選んで名前と言語を確認します。新規作成前は検索して重複を避けます。
3. **編集して確認する。** 記事属性、プレビュー、差分を見て、意図しない削除がないか確認し、下書きを保存します。
4. **レビューに提出する。** 変更点・理由・出典を説明します。投稿とコメントで進捗を確認し、レビュー・マージ・デプロイ後に公開されます。

[サイト内編集の手順](#editor) · [GitHubで投稿する](#github)

## 目的に合わせた学習順序

| 目的 | 読む順序 |
| --- | --- |
| 誤字修正・資料追加・翻訳 | [サイト内編集](#editor) → [内容と書式](#format) → 提出 |
| 記事を新規作成 | [サイト内編集](#editor) → [画像とファイル](#files)の分類 → [構文と属性](#syntax)の項目 |
| 画像・カバーを追加 | [画像とファイル](#files) → [許諾と署名](#licensing) → パス指定 |
| 表・リスト・ルビ・メディア | [構文と属性](#syntax) → プレビュー |
| 告知・ガイド・リポジトリの編集 | [GitHub投稿](#github) → 同じブランチでコミット → PR |

## 提出前の三つのポイント

- **確認できる内容を書く。** 不明点は説明し、推測や仮本文で埋めません。
- **出典と許諾を残す。** 画像のアップロード自体は使用許可ではありません。記事添付はファイルガイドに従います。設定資料はギャラリー管理画面から送信し、管理者の承認後に公開します。GitHub は使用しません。
- **保存・提出・公開は別です。** 下書き保存やPR作成だけでは公開されません。意見を受けたら同じ投稿を更新します。

## このページの使い方

はじめに、サイト内編集、GitHub、画像、構文、書式、許諾の順に並んでいます。タブでページを移動せず文書を切り替え、目次で章へ進めます。ブラウザーの戻るで前の位置へ。準備ができたら右上のエディターを開いてください。`
},locale);
