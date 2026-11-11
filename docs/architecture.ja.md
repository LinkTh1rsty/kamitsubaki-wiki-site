# V3 フロントエンド構成

このリポジトリは静的フロントエンド、百科の内容、利用者に見える投稿画面を管理します。サーバー側は非公開ソースです。コード、内部データモデル、運用資料はここでは提供しません。

| フロントの情報源 | 役割 |
| --- | --- |
| `src/content/` | 多言語の百科 Markdown と Schema v2 メタデータ。 |
| `src/data/classification-map.json` | 審査済みの分類と一覧階層。 |
| `src/lib/entitySchema.mjs`、`src/lib/entityRegistry.mjs` | フロントの項目検証、安定 ID、公開経路、関連。 |
| `src/lib/contentLayout.mjs` | 百科の原稿ディレクトリ規則。 |
| `src/data/chronicle/`、`src/data/taxonomy/eras.yml` | 公開年表と紀元。 |
| `docs/manuals/` | 三冊のサイト内説明書の Markdown 原稿。 |

百科の変更は GitHub の提案が審査・マージされ、静的サイトに反映された後に公開されます。記事とギャラリーはサイトの投稿・審査画面を使用します。フロントは利用者に見える状態を示し、サーバー内部は説明しません。

[開発説明書](manuals/develop/architecture/ja.md) · [投稿説明書](manuals/contribute/start/ja.md) · [コンテンツディレクトリ](../src/content/README.md) · [文書一覧](README.md)
