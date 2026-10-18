---
book: develop
chapter: architecture
locale: ja
order: 1
title: フロントエンドのリポジトリと連携範囲
summary: 公開フロント、百科の原稿、利用者に見える投稿経路を理解します。
---

公開サイトは Astro で静的生成します。百科の原稿は src/content にあり、安定した ID、メタデータと登録情報から分類と URL を決定します。src/components は画面部品、src/lib は共通処理、scripts はビルドと検証を管理します。共通 UI の変更ではアカウント導線とギャラリーを一緒に確認します。公開フロントエンドは単独で取得・検証でき、サービス間の受け入れ確認は保守担当者の分離環境で行います。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
