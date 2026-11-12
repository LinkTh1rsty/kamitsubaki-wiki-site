---
book: "develop"
chapter: "frontend"
locale: "zh-hk"
order: 4
title: "頁面與共享組件"
summary: "複用頁面骨架、閲讀器、原生控件、圖片與安全渲染規則。"
generatedFromHash: "2f09f7f66c3a2a6e9ec3"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 選擇現有骨架

普通工具與投稿頁面使用 `WorkspaceShell`、`WorkspaceHeader` 和站點導航；連續正文使用 `Reader`。詞條、文章與指南有不同閲讀佈局，新增頁面應選合適的模式，避免全局改動破壞其他閲讀器。

文檔通過獨立佈局複用主站導航、頁腳和指南閲讀器。樣式限定在文檔區域，寬屏提供章節側欄與頁內目錄，手機提供可展開導航。正文不依賴搜尋腳本才能閲讀。

## 按鈕、表單和圖標

`WorkspaceButton` 的 `href` 生成鏈接；按鈕默認 type 為 button，表單提交須明確 `type="submit"`。保持原生 disabled、name、value 和鍵盤行為。使用 `WorkspaceControl` 的 select、textarea 模式時保留字段標籤。

錯誤用 `aria-invalid` 表示，通過 `aria-describedby` 關聯説明。頁面負責校驗和狀態，不把業務邏輯塞進基礎控件。圖標使用 `Icon` 和現有 Lucide 資源，只有圖標的按鈕應有本地化的可訪問名稱。

主題和間距使用現有 token；共享控件的基礎外觀由 UI 適配層維護，不在每頁複製一套。

## 圖片和媒體

使用 `ResponsiveImage` 並提供真實顯示尺寸。縮略圖是原圖的獨立展示副本，不能覆蓋原圖；`pnpm images:generate` 可單獨生成。WebP 候選、緩存目錄和構建輸出不作為內容源提交。

海報按完整顯示規則處理；圖片失效時保留文字和操作。外部媒體使用受控短語法，正文原始 iframe 不能替代媒體解析器。

## Markdown 的信任邊界

Markdown 與 HTML 先解析，再經過共享安全過濾；受控媒體佔位隨後解析為可信播放器，最後運行站點變換。不要繞過 `wikiHtmlSchema` 或調整順序來接納未經審查的標籤。

驗證新增寫法時同時檢查編輯、源碼、預覽和公開渲染。完整語法見[語法與字段參考](/zh-hk/docs/contribute/syntax/)。

## 驗收

檢查明暗主題、320px 手機、鍵盤、減少動態效果、長標題和斷網重試。變更共享組件時同時檢查賬號與圖庫入口；命令見[檢查與發佈](/zh-hk/docs/develop/operations/)。
