---
book: develop
chapter: start
locale: ja
order: 1
title: 環境と起動
summary: 固定ランタイムを用意し、独立した開発サーバーとローカル接続先を設定します。
---

## 環境を準備する

リポジトリの README を読み、`.node-version` が指定する Node.js のパッチ版と pnpm 11.1.1 を使います。同じ Node 22 系でも別のパッチ版で代用しません。タスクごとに独立したブランチ、作業ツリー、空きポートを用意します。

```sh
node --version
pnpm --version
pnpm node:check
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 18000
```

起動時にエディター、共通 UI、繁体字コンテンツを準備します。初回は時間がかかることがあります。ターミナルにローカル URL が表示されてからブラウザーで開き、同じポートで重複起動しないでください。

## 単体開発とサービス連携

静的ページ、ドキュメント、百科コンテンツの変更はフロント単体で開発できます。アカウント、記事、画像の状態遷移を確認するには対応するローカルサービスが必要です。単体の起動成功は連携確認の完了を意味しません。

隔離モードでは `WORKSPACE_ISOLATED=true`、`PUBLIC_WORKSPACE_ISOLATED=true` と、`PUBLIC_WORKSPACE_API_ORIGIN`、`PUBLIC_WORKSPACE_WIKI_ORIGIN`、`PUBLIC_WORKSPACE_COMPANION_ORIGIN` を同時に設定します。三つの接続先は異なるポートの `http://127.0.0.1` とし、Wiki は現在のフロントに合わせます。各 API の変数はローカル API、`PUBLIC_SITE_URL` はローカル Wiki に向けます。

本番の環境ファイル、Cookie、データベースをコピーしません。設定が不足・矛盾している場合は修正し、本番サービスに切り替えてテストを通さないでください。

## 結果を確認する

ホーム、ドキュメント、百科ページが開き、ランタイムのエラーがないことを確認します。ブランチ、コミット、実行環境、起動コマンド、ポートを記録します。隔離環境による外部フォント・画像・ログインプロバイダーの制約は別途記録します。

起動できない場合は最初のエラーを読み、[トラブルシューティング](/ja/docs/develop/troubleshooting/)を参照してください。業務コードを変える前に実行環境と依存関係を確認します。
