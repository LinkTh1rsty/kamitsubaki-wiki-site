---
book: develop
chapter: frontend
locale: ja
order: 3
title: フロントエンドと共通部品
summary: 共通ページ構造、Reader、操作規約で既存の読書体験を守りながら拡張します。
---

Node.js 22 と pnpm 11.1.1 を使用し、pnpm install --frozen-lockfile で導入します。タスクごとにブランチ、作業ツリー、ポートとテストデータを分離し、最新 main から開始して更新を取り込みます。候補環境にはローカル API を明示し、本番接続の開発スクリプトを流用しません。提出前にテスト、Astro、共通部品、文書、ビルドとリンクを検証します。ビルド成功だけでログイン・投稿・ギャラリーの状態遷移を検証済みとはしません。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
