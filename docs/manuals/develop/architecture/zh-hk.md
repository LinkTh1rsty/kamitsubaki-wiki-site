---
book: "develop"
chapter: "architecture"
locale: "zh-hk"
order: 2
title: "架構與集成邊界"
summary: "理解靜態頁面、公開接口、編輯器與獨立服務各自負責的內容。"
generatedFromHash: "4e9d2b6fec61167c762f"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 從入口追蹤行為

主站由 Astro 生成靜態頁面，路由位於 `src/pages`，頁面組件在 `src/components`，共享規則在 `src/lib`，構建和校驗入口在 `scripts`。處理問題時先找當前路由，再追蹤組件、數據加載和樣式，不依據舊方案猜測實現。

百科 Markdown 位於 `src/content`；時間軸事件在 `src/data/chronicle`。文章和圖庫存在動態服務邊界，公開閲讀結果與用户私有草稿不能混為一類數據。

## 編輯器和影像館

`prototypes/novel-editor` 是正式共用編輯器源碼，主站的 `build:editor` 會安裝並構建該子包，再輸出到靜態資源目錄。不要把生成後的編輯器資源當作源代碼修改。

`prototypes/chronoframe-explore` 是獨立影像館服務，按該目錄 README 配置。主站保留現有入口；文檔或界面改動不能假設它與 Wiki 共用運行時、數據庫或發佈過程。

## 接口與身份邊界

公開頁面只讀取所需的公開字段。私有草稿、審核討論和賬號操作依賴服務端權限；前端隱藏按鈕不能替代權限校驗。賬號界面留在 Wiki 域名，返回地址使用精確來源註冊表。

共享賬號導航或圖庫界面有變化時，兩處一起檢查。保留現有用户 ID、綁定與回調；不要重建身份或 Passkey 來繞過配置問題。

## 變更前後核對

先記錄現有路由、查詢參數、數據來源和狀態轉換，再做最小修改。至少檢查首次訪問、刷新、失敗重試及舊鏈接。區分靜態構建、本機模擬和真實服務結果。

下一步閲讀[內容模型](/zh-hk/docs/develop/content/)與[頁面和共享組件](/zh-hk/docs/develop/frontend/)。
