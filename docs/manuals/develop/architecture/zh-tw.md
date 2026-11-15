---
book: "develop"
chapter: "architecture"
locale: "zh-tw"
order: 2
title: "架構與整合邊界"
summary: "理解靜態頁面、公開介面、編輯器與獨立服務各自負責的內容。"
generatedFromHash: "4e9d2b6fec61167c762f"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 從入口追蹤行為

主站由 Astro 生成靜態頁面，路由位於 `src/pages`，頁面元件在 `src/components`，共享規則在 `src/lib`，構建和校驗入口在 `scripts`。處理問題時先找當前路由，再追蹤元件、資料載入和樣式，不依據舊方案猜測實現。

百科 Markdown 位於 `src/content`；時間軸事件在 `src/data/chronicle`。文章和相簿存在動態服務邊界，公開閱讀結果與使用者私有草稿不能混為一類資料。

## 編輯器和影像館

`prototypes/novel-editor` 是正式共用編輯器原始碼，主站的 `build:editor` 會安裝並構建該子包，再輸出到靜態資源目錄。不要把生成後的編輯器資源當作原始碼修改。

`prototypes/chronoframe-explore` 是獨立影像館服務，按該目錄 README 配置。主站保留現有入口；文件或介面改動不能假設它與 Wiki 共用執行時、資料庫或釋出過程。

## 介面與身份邊界

公開頁面只讀取所需的公開欄位。私有草稿、稽核討論和賬號操作依賴服務端許可權；前端隱藏按鈕不能替代許可權校驗。賬號介面留在 Wiki 域名，返回地址使用精確來源登錄檔。

共享賬號導航或相簿介面有變化時，兩處一起檢查。保留現有使用者 ID、繫結與回撥；不要重建身份或 Passkey 來繞過配置問題。

## 變更前後核對

先記錄現有路由、查詢引數、資料來源和狀態轉換，再做最小修改。至少檢查首次訪問、重新整理、失敗重試及舊連結。區分靜態構建、本機模擬和真實服務結果。

下一步閱讀[內容模型](/zh-tw/docs/develop/content/)與[頁面和共享元件](/zh-tw/docs/develop/frontend/)。
