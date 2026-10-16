---
book: "develop"
chapter: "operations"
locale: "zh-tw"
order: 4
title: "前臺開發與驗收"
summary: "按修改範圍檢查前臺，並區分本地效果與真實投稿流程。"
generatedFromHash: "78bb87c01d0611b66fd1"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 本地準備

在前臺倉庫確認當前分支與未提交修改，安裝 Node.js 和 pnpm，執行 `pnpm install --frozen-lockfile`、`pnpm dev`。說明書只在本倉庫 `docs/manuals/` 編輯，再執行 `node scripts/sync-docs.mjs` 更新工作區映象。環境金鑰不得寫進倉庫、截圖或瀏覽器日誌。服務端的執行、釋出和故障處理屬於維護者的私有流程，不在此提供。

## 按改動檢查

| 前臺變更 | 建議檢查 |
| --- | --- |
| 文件正文與連結 | `node scripts/check-docs.mjs`、`node scripts/sync-docs.mjs --check`。 |
| 分類與詞條後設資料 | `pnpm validate:content`，檢查受影響的語言和目錄。 |
| 頁面、控制元件與閱讀器 | `pnpm check`、`pnpm build`，在桌面和窄屏實際操作。 |
| 投稿介面 | 本機草稿、登入狀態、錯誤提示、提交回執與創作者中心跳轉。 |

前臺構建通過只證明靜態產物可生成。模擬響應、瀏覽器預覽和真實賬號提交應在驗收記錄中分別標註，不能相互代替。測試前保留原有詞條正文和稽核記錄，避免用測試內容覆蓋真實資料。

## 前臺釋出邊界

前臺候選需記錄提交號、構建結果、受影響頁面、可見迴歸項和恢復版本。上線前由維護者確認依賴服務已可用，再檢查詞條提案、文章公開和相簿上傳各自的真實流程。若頁面與服務狀態不一致，暫停前臺釋出並保留可復現的頁面地址及回執編號；服務端排查和恢復由私有運維流程處理。本公開說明書不包含服務端倉庫、配置、資料遷移或部署命令。
