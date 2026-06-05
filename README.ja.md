# KAMITSUBAKI Wiki Site

Astro で構築された、非公式 KAMITSUBAKI STUDIO ファン Wiki の静的サイトです。

このリポジトリは GitHub Pull Request ワークフローを前提にしています。コントリビューターはコンテンツファイルを編集し、ローカルで同じ検証を実行し、PR を作成し、CI で確認してからマージとデプロイへ進みます。

## 言語

- [English](README.en.md)
- [中文](README.md)
- [日本語](README.ja.md)

## 編集する場所

ほとんどの Wiki 編集では `src/content/` だけを触れば十分です。

```text
src/content/site/       ナビゲーション、セクション名、フッターなどのサイト文言 (.json)
src/content/artists/    アーティスト、クリエイター、ユニット、音楽的同位体の記事 (.md)
src/content/projects/   プロジェクトカードとプロジェクト記事 (.md)
src/content/logs/       タイムライン/更新ログ (.json)
src/content/contribute/ GitHub 編集ガイドの文言 (.json)
```

実装コードは次の場所にあります。

```text
src/components/         Astro UI コンポーネント
src/pages/              ルートとページ構成
src/layouts/            共通レイアウト
src/styles/             グローバル CSS と Tailwind スタイル
src/scripts/            ブラウザ側のインタラクション
tests/                  Node テスト
```

## クイックスタート

`pnpm` を使用します。

```bash
pnpm install
pnpm dev
```

Astro は次のようなローカル URL を表示します。

```text
http://127.0.0.1:4321/
```

`/zh/`、`/ja/`、`/en/` を開くと各言語版を確認できます。

## Wiki 記事の編集

アーティスト記事は YAML frontmatter 付きの Markdown ファイルです。

```text
src/content/artists/vwp/kaf/zh.md
src/content/artists/vwp/kaf/ja.md
src/content/artists/vwp/kaf/en.md
```

プロジェクト記事も同じ 3 言語ファイル構成です。

```text
src/content/projects/arg/kamitsubaki-city/zh.md
src/content/projects/arg/kamitsubaki-city/ja.md
src/content/projects/arg/kamitsubaki-city/en.md
```

同じ記事の翻訳では、すべて同じ `translationKey` を使ってください。

```yaml
---
locale: ja
translationKey: kaf
code: "01"
name: "花譜"
romanizedName: "KAF"
categoryTitle: "仮想世代の魔女達"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
seo:
  title: "花譜 - KAMITSUBAKI WIKI"
  description: "検索結果とリンクプレビュー用のカスタム説明。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花譜"
    - "KAF"
---
```

本文は 2 つ目の `---` の後に書きます。本文は空でも問題ありません。先に構造化データだけ追加し、記事本文は後から整備できます。

Markdown は見出し、リスト、表、リンク、コードブロック、KaTeX による LaTeX 数式をサポートします。

## トップページ表示とフォルダ

トップページの DATABASE は `src/content/artists/` の第一階層フォルダを分類として自動取得します。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ トップページ分類
```

新しい分類を追加するときは、第一階層フォルダを作り、三言語の記事を入れてください。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder`、`code` は任意の表示上書きです。未設定の場合、フォルダ名、記事名、デフォルトの並び順を使います。

## メタデータとリンクプレビュー

`seo` ブロックは任意です。未設定の場合、サイトは次の情報を自動で取得します。

- `name`、`romanizedName`、カテゴリ、ステータスをフォールバックのメタデータに使います。
- Markdown 本文の最初の段落をページ `description` に使います。
- `image` を Open Graph と Twitter のプレビューカードに使います。

検索結果や共有プレビューを正確に制御したい場合だけ、`seo.title`、`seo.description`、`seo.image`、`seo.keywords`、`seo.noindex` を設定してください。

デプロイ時に `PUBLIC_SITE_URL` を設定できます。例: `https://example.com`。canonical URL とローカル画像パスは自動で絶対 URL になります。

## 新しい記事を追加する

1. `src/content/artists/` または `src/content/projects/` で正しい分類を選びます。
2. 例として `src/content/artists/vwp/new-artist/` のように記事用フォルダを作ります。
3. `zh.md`、`ja.md`、`en.md` を追加します。
4. 3 ファイルで同じ `translationKey` を使います。
5. アーティスト分類はフォルダから自動生成されます。表示を調整したい場合だけ `categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder`、`code` を設定します。
6. 下の検証コマンドを実行します。
7. Pull Request を作成します。

## ローカル検証

PR を作る前に実行してください。

```bash
pnpm test
pnpm check
pnpm build
```

各コマンドの役割:

- `pnpm test`: コンテンツ分離、i18n の前提、重要なコンテンツレコードを確認します。
- `pnpm check`: Astro 診断と Content Collections schema の検証を行います。
- `pnpm build`: 静的サイトを生成し、すべてのルートがビルドできることを確認します。

## GitHub PR と CI の流れ

1. `main` からブランチを作成、または最新状態に同期します。
2. `src/content/` の内容を編集します。
3. ローカル検証を実行します。
4. 変更をコミットします。
5. ブランチを push します。
6. `main` に向けて Pull Request を作成します。
7. GitHub Actions が同じ検証コマンドで CI を実行します。
8. CI が失敗した場合は、同じブランチで修正します。
9. レビュー後にマージされると、`pnpm build` で生成される `dist/` を使って静的サイトをデプロイできます。

CI ワークフローは `.github/workflows/ci.yml` にあります。

## コントリビューションルール

- Wiki コンテンツは `src/content/` で編集してください。
- 翻訳可能な記事を追加するときは、3 言語ファイルをそろえてください。
- 同じ記事では 3 言語すべてで同じ `translationKey` を使ってください。
- PR 前に `pnpm test`、`pnpm check`、`pnpm build` を実行してください。
- `dist/`、`.astro/`、`node_modules/` は編集しないでください。
- コンテンツをコンポーネントやページにハードコードしないでください。
- 仮の本文は追加しないでください。偽の内容より、空のままの方が安全です。

## ドキュメント

- [コントリビューションガイド](docs/contributing.ja.md)
- [アーキテクチャ](docs/architecture.ja.md)

## 技術スタック

- Astro static output
- pnpm package manager
- Astro Content Collections
- Tailwind CSS v4 through Vite
- Markdown with KaTeX math support
