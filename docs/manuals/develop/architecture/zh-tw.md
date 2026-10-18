---
book: "develop"
chapter: "architecture"
locale: "zh-tw"
order: 1
title: "前臺倉庫與整合邊界"
summary: "瞭解公開前臺、百科源稿和三類投稿在介面上的邊界。"
generatedFromHash: "4eee5151754dee568d1b"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

主站使用 Astro 生成靜態頁面。百科源內容位於 src/content，實體標識與分類由內容登錄檔和後設資料決定。src/components 儲存頁面元件，src/lib 儲存共享行為，scripts 儲存構建與驗證入口。賬號與相簿共享介面改動必須一起驗收。公開前端可以獨立克隆和檢查，跨服務驗收由維護者在隔離環境執行。

[Repository maintenance / 倉庫維護 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
