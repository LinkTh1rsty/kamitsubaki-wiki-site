# 外部リンクのブランドカード

アーティスト／アルバムの情報欄と、アーティスト本文の「外部リンク」セクションは、同じプラットフォーム判定とビジュアルを共有します。ブランド SVG は `simple-icons` から取得してビルド時またはサイトスクリプトでインライン化し、実行時の CDN には依存しません。

## 記述方法

情報欄では frontmatter の `officialLinks` を使います。

```yaml
officialLinks:
  - label: "YouTube"
    href: "https://www.youtube.com/@example"
```

アーティスト本文では、レベル 2 見出しと通常の Markdown リストを使います。見出しは `外部链接`、`外部連結`、`外部リンク`、`External Links` のいずれかです。

```md
## 外部リンク

- [YouTube](https://www.youtube.com/@example)
- [X (Twitter)](https://x.com/example)
```

JavaScript が無効でも、読みやすくクリック可能な通常リストとして残ります。有効な場合は `siteInteractions.js` が該当するアーティスト本文だけをレスポンシブなブランドカードへ段階的に拡張します。情報欄のカードは Astro が静的 HTML として出力します。

## 判定と拡張

`src/lib/externalPlatforms.mjs` が唯一のプラットフォーム登録表です。判定順はドメイン、KAMITSUBAKI ドメイン、リンク名、汎用サイトのフォールバックです。Bilibili、YouTube、X/Twitter、TikTok、Instagram、Weibo、Niconico、Spotify、Apple Music、NetEase Cloud Music、pixiv、piapro、Steam、Wikipedia、KAMITSUBAKI 系サイトと主要な短縮ドメインを扱います。

新しいサービスを追加するときは、公式 `simple-icons` オブジェクトを読み込み、`platformDefinitions` にメタデータと判定条件を追加し、`tests/external-platforms.test.mjs` にテストケースを追加してから `pnpm check && pnpm test && pnpm build` を実行してください。コンテンツ内への SVG コピーやリモートロゴ URL は使わず、キーボードフォーカスと `prefers-reduced-motion` を維持してください。

