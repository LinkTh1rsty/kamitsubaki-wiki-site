# アーキテクチャ

[English](architecture.en.md) / [中文](architecture.md) / [日本語](architecture.ja.md)

このサイトは Astro の静的 Wiki です。URL ベースの国際化を使い、コンテンツと実装を分離しています。

## 実行形態

```text
/      -> /zh/ にリダイレクト
/zh/   -> 中国語サイト
/ja/   -> 日本語サイト
/en/   -> 英語サイト
```

本番ビルドは静的 HTML、CSS、ブラウザ JavaScript です。実行時にバックエンドは必要ありません。

## コンテンツの流れ

```text
src/content/**/*.json or .md
  -> src/content.config.ts が schema を検証
  -> Astro Content Collections がレコードを読み込む
  -> src/lib/homeData.mjs がローカライズ、グループ化、ソートを行う
  -> src/lib/metadata.mjs がページメタデータを生成
  -> src/pages/[locale]/index.astro がトップページを描画
  -> src/pages/[locale]/artists/[...id].astro が記事ページを描画
  -> src/components/*.astro が UI を描画
```

実装ファイルは props 経由でコンテンツを受け取ります。公開コンテンツの大きな配列をコンポーネントやページに直接書かないでください。

## 主なディレクトリ

```text
src/content.config.ts   Content Collections schema
src/content/            編集可能な Wiki コンテンツ
src/lib/                データ整形、i18n、metadata ヘルパー
src/pages/              静的ルート
src/components/         表示コンポーネント
src/layouts/            共通 HTML レイアウト
src/styles/global.css   Tailwind 入口とグローバル視覚システム
src/scripts/            ブラウザ操作
tests/                  Node テスト
```

## Content Collections

- `site`: JSON のサイト外枠とページラベル
- `artists`: アーティスト、クリエイター、ユニット、音楽的同位体の Markdown 記事
- `projects`: プロジェクトの Markdown レコード
- `logs`: タイムラインの JSON レコード

schema は `src/content.config.ts` にあり、`pnpm check` で検証されます。

トップページ DATABASE のアーティスト分類は `src/content/artists/<category>/<entry>/<locale>.md` の第一階層フォルダから自動生成されます。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder`、`code` は任意の表示上書きです。

## メタデータ

ページメタデータは `src/lib/metadata.mjs` で生成します。コンテンツファイルは任意の `seo` frontmatter で上書きできます。未設定の場合、Markdown の最初の段落を説明として自動取得し、`image` をリンクプレビューに使います。

`BaseLayout.astro` は description、canonical、Open Graph、Twitter card、robots を出力します。デプロイ時に `PUBLIC_SITE_URL` を設定すると、絶対 canonical URL を生成できます。

## リーダー UI

アーティスト詳細ページは安定した Wiki レイアウトを保ちます。

- コンパクトなナビゲーションバー。
- 言語切り替えと編集入口を持つ記事ヘッダー。
- 見出しがある場合の目次。
- 本文がある場合の Markdown 記事。
- メタデータ情報パネル。

空の本文は有効で、仮テキストは表示しません。

## スタイルとアセット

Tailwind CSS v4 は `@tailwindcss/vite` でコンパイルします。実行時 Tailwind CDN は追加しないでください。

グローバルスタイルは `src/styles/global.css` にあり、フォント、色、レスポンシブなリーダー組版、情報パネル、目次、プリローダー、カーソル、reveal、noise、リスト演出を含みます。

## 検証

CI とローカル開発では同じコマンドを使います。

```bash
pnpm test
pnpm check
pnpm build
```

GitHub Actions ワークフローは `.github/workflows/ci.yml` にあります。
