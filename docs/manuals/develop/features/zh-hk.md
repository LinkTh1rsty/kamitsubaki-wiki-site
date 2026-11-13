---
book: "develop"
chapter: "features"
locale: "zh-hk"
order: 5
title: "功能維護"
summary: "按當前實現檢查活動中心、觀測面板、文章閲讀器和共用編輯器。"
generatedFromHash: "f5e84b720ac365b357c7"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 變更前準備

先復現問題，記錄頁面 URL、語言、視口、主題和數據來源。用本任務的隔離來源與數據驗證列表、詳情、操作和刷新後讀回，不用生產賬號或記錄測試。

## 活動中心

入口為 `/{locale}/events/`，默認觀測者企劃；`?source=official` 切換官方。舊活動入口保持兼容。來源、月份、視圖、篩選和日期保存在 URL，刷新或分享後應可恢復。

日曆使用 FullCalendar 標準插件；地區選擇複用 Tom Select，浮層用 Floating UI，海報查看用 PhotoSwipe。檢查跨日事件、更多彈層、無內容和失敗狀態。全天日期不轉換時區，未知結束不補默認時長，無確定日期的活動不生成定位或單活動日曆文件。

公開活動讀取 `/api/activity-center`。桌面默認月曆，手機默認列表；手機篩選沿用同一表單狀態。海報完整顯示，缺圖時仍可閲讀文字和打開詳情。分享文案不攜帶統計入口參數。

## 觀測面板與公告

BaseLayout 掛載一個 ObserverDashboard，包含總覽、公告、AI、工具。發電入口獨立。企劃與官方分別展示，不把曝光或點擊統計解釋為報名結果。

公告位於 `src/content/announcements`，沿用 translationKey、pinned、autoOpen、order。`reminderVersion` 僅在重要修訂確實需要重新提醒時遞增；普通修字不遞增。跨語言切換不應重複提醒。

AI 在首次選中時按需初始化。切換區域或關閉面板保留草稿與請求；賬號切換應取消舊請求並清空舊會話。檢查 Esc、背景隔離、關閉後焦點恢復和無 JavaScript 的普通入口。

## 文章閲讀器

`articleReaderPresentation.mjs` 由客户端與 Pages Function 共用，保持服務端首屏與後續刷新一致。author 保留原署名，頭像來自已有賬號映射；缺失或不安全的頭像用現有圖標，不按暱稱猜綁定。

刷新失敗保留標題和正文，允許重試；不重複插入目錄或綁定點擊事件。關聯詞條由明確的關聯 ID 決定，正文鏈接不等於業務關聯。

## 編輯器與發言塊

詞條和文章共用 `prototypes/novel-editor`。保留插入菜單、屬性、源碼和預覽之間的往返。發言者在發言編輯處維護，頭像、顏色和詞條綁定為可選項，與文檔作者分開。

快速導入先展示預覽，未標註發言者的段落保持普通正文。插入後可撤銷，不為可撤銷操作增加重複確認。保留原文、來源和未知寫法；操作説明見[語法參考](/zh-hk/docs/contribute/syntax/)。

## 結果與限制

檢查加載、空狀態、失敗、恢復以及手機焦點。測試文件可從對應功能名查找，完整門禁見[檢查與發佈](/zh-hk/docs/develop/operations/)。本機模擬不證明真實供應商、生產權限或發佈成功。
