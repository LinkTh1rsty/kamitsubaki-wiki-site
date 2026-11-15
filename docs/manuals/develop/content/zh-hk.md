---
book: "develop"
chapter: "content"
locale: "zh-hk"
order: 3
title: "內容模型與多語言"
summary: "按實際 schema 維護實體、目錄、關係和五語言內容，保留業務審計資料。"
generatedFromHash: "47016dd4d55b49b774ae"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 找到事實來源

內容目錄規則見 `src/content/README.md` 和 `src/lib/contentLayout.mjs`；實際字段由 `src/content.config.ts`、`src/lib/entitySchema.mjs` 與註冊表約束。分類依據 `src/data/classification-map.json`。歷史規範可以解釋背景，但不能覆蓋當前校驗規則。

同一實體在一個目錄內維護 `zh.md`、`ja.md`、`en.md`，跨語言沿用穩定 ID。顯示名、目錄位置和網址不是同一個概念；改顯示名不應改實體 ID。不要通過複製整份內容目錄來修復分類。

## 字段、關係與特徵數據

根據實體類型選擇字段。歌曲表演者、製作署名、發行關係等結構化字段影響索引與頁面；正文鏈接不會自動建立所有業務關係。關係修改後檢查正向和反向展示。

時間軸事件、分類字典與百科正文分工明確。圖庫和文章投稿狀態由服務提供，不把它們寫成靜態詞條字段。完整寫作和字段實例見[內容格式](/zh-hk/docs/contribute/format/)與[語法參考](/zh-hk/docs/contribute/syntax/)。

## 多語言修改流程

先確認實際源語言。簡中、日文和英文獨立維護；台灣與香港繁體通過 `pnpm i18n:generate` 生成。保留代碼標識、URL、授權和引用信息，不翻譯穩定 ID。

正式文檔存放在 `docs/manuals/{分类}/{章节}/{语言}.md`，其 frontmatter 的 `book`、`chapter`、`locale` 與目錄相符，`order` 決定順序。各語言章節集合與排序一致，內鏈指向同一語言。

## 校驗與受保護資料

```sh
pnpm validate:content
pnpm i18n:generate
pnpm docs:check
```

檢查實際差異，不把生成器引起的無關變化提交進來。構建校驗仍讀取的歷史 JSON 清單、文章源稿和轉換原稿屬於業務資料；即使位於 docs 或 maintenance，也不能按舊説明文檔一併移動。

校驗通過後構建並核對詞條鏈接、多語言切換和關聯展示。失敗時回到首個字段或路徑錯誤；不要重建審計基線來掩蓋正文損失。
