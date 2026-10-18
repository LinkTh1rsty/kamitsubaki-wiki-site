---
book: develop
chapter: operations
locale: ja
order: 4
title: フロントエンドの開発と確認
summary: 変更範囲に応じて確認し、ローカル表示と実際の投稿を区別します。
---

main を本番のソースとします。通常の PR と外部 PR は main を対象に保ち、調整担当が確定した元のコミットを短期 release ブランチへ統合します。各 PR の検証・レビュー後に候補全体を確認し、ユーザーがその確定した一覧を明示的に承認してから merge commit で一括反映します。通常の本番ビルドは Cloudflare Git 連携から node scripts/release-build.mjs を実行します。main と公開リリース情報を再確認し、古いビルドや別経路で保護を迂回せず、ソースコミット・デプロイ ID・アカウント導線とギャラリーの結果を記録します。

[Repository maintenance / 仓库维护 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
