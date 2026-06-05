# コントリビューションガイド

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

この文書は、Wiki を編集して Pull Request を作成するための主要なガイドです。

## 編集する場所

ほとんどの編集は `src/content/` で行います。

```text
src/content/site/       ナビゲーション、セクション名、フッター文言 (.json)
src/content/artists/    アーティスト、クリエイター、ユニット、音楽的同位体の記事 (.md)
src/content/projects/   プロジェクトページとカード (.md)
src/content/logs/       タイムライン/更新記録 (.json)
src/content/contribute/ GitHub 編集ガイドの文言 (.json)
```

`dist/`、`.astro/`、`node_modules/` は編集しないでください。

## 三言語ファイル

サイトは次の三つの言語ルートを持ちます。

```text
/zh/  中国語、デフォルト
/ja/  日本語
/en/  英語
```

翻訳可能なレコードには三言語のファイルを用意します。新しいページを追加するときは `zh.md`、`ja.md`、`en.md` を作り、同じ `translationKey` を使ってください。

## Markdown の形

Markdown ファイルは YAML frontmatter で構造化データを持ちます。

```yaml
---
locale: zh
translationKey: kaf
name: "花谱"
romanizedName: "KAF"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
seo:
  title: "花谱 - KAMITSUBAKI WIKI"
  description: "検索結果とリンクプレビュー用のカスタム説明。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花谱"
    - "KAF"
---
```

本文は二つ目の `---` の後に書きます。本文は空でも構いませんが、仮の紹介文は入れないでください。

## トップページ表示

トップページの DATABASE は `src/content/artists/` の第一階層フォルダを分類として自動取得します。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ トップページ分類
```

新しい分類を追加するときは、第一階層フォルダを作り、三言語の記事を入れてください。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder`、`code` は任意の表示上書きです。未設定の場合、フォルダ名、記事名、デフォルトの並び順を使います。

## メタデータ

`seo` ブロックは任意です。未設定の場合、サイトは記事から自動で取得します。

- `name`、`romanizedName`、カテゴリ、ステータスをフォールバックのメタデータに使います。
- Markdown 本文の最初の段落をページ説明に使います。
- `image` を Open Graph と Twitter のプレビュー画像に使います。

検索結果や共有カードを手動で制御したい場合だけ、`seo.title`、`seo.description`、`seo.image`、`seo.keywords`、`seo.noindex` を設定してください。デプロイ時に `PUBLIC_SITE_URL` を設定すると、canonical URL とローカル画像が絶対 URL になります。

## 新しい項目を追加する

1. 適切なコンテンツカテゴリにフォルダを作成します。
2. `zh.md`、`ja.md`、`en.md` を追加します。
3. 三つのファイルで同じ `translationKey` を使います。
4. 必須 frontmatter を入力します。
5. 本文がまだない場合は空のままで構いません。
6. ローカル検証を実行します。
7. Pull Request を作成します。

## ローカル検証

CI とローカル開発では同じコマンドを使います。

```bash
pnpm test
pnpm check
pnpm build
```

`pnpm check` が content schema エラーを出した場合は、該当ファイルを `src/content.config.ts` と見比べてください。

## Pull Request の流れ

1. `main` からブランチを作成します。
2. コンテンツまたは実装を編集します。
3. ローカル検証を実行します。
4. ブランチにコミットして push します。
5. `main` への Pull Request を作成します。
6. GitHub Actions CI を待ちます。
7. CI やレビューの指摘は同じブランチで修正します。

CI ワークフローは `.github/workflows/ci.yml` にあります。

## マージ前チェック

- 仮の本文がない。
- 必要な言語ファイルがすべて存在する。
- `pnpm test`、`pnpm check`、`pnpm build` が通る。
- PR が関連ファイルだけを変更している。
- `dist/` などの生成ディレクトリをコミットしていない。
