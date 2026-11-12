---
book: "develop"
chapter: "start"
locale: "zh-tw"
order: 1
title: "環境與啟動"
summary: "安裝固定執行時，啟動獨立開發服務，並配置可核對的本機來源。"
generatedFromHash: "9af4466aa45812a3c099"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 準備環境

先閱讀倉庫 README，使用 `.node-version` 指定的 Node.js 補丁版本和 pnpm 11.1.1。不要用“同為 Node 22”代替精確版本。為本任務保留獨立分支、工作樹和空閒埠。

```sh
node --version
pnpm --version
pnpm node:check
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 18000
```

啟動命令會準備編輯器、共享介面和繁體內容。首次安裝或構建可能較慢；等待終端列印本機訪問地址後再開啟瀏覽器。不要重複啟動同一埠。

## 單站與跨服務開發

只修改靜態頁面、文件或百科內容時，可以獨立克隆前端。賬號、文章和相簿的真實狀態轉換需要匹配的本機服務；單站啟動成功不代表跨服務驗收通過。

隔離模式同時設定 `WORKSPACE_ISOLATED=true`、`PUBLIC_WORKSPACE_ISOLATED=true`，以及 `PUBLIC_WORKSPACE_API_ORIGIN`、`PUBLIC_WORKSPACE_WIKI_ORIGIN`、`PUBLIC_WORKSPACE_COMPANION_ORIGIN`。三個來源必須是不同埠的 `http://127.0.0.1` 地址；Wiki 來源對應當前前端。業務 API 變數指向本機 API，`PUBLIC_SITE_URL` 指向本機 Wiki。

不要複製生產環境檔案、Cookie 或資料庫。隔離配置遺漏或互相沖突時應先修正配置，不切回生產服務來完成測試。

## 核對結果

確認首頁、文件、詞條可開啟，終端沒有執行時版本錯誤。記錄分支、提交、執行時、啟動命令與埠。遠端字型、外部圖片和登入供應商在隔離環境的限制應單獨記錄。

如果啟動失敗，先看終端首個錯誤，再查[故障排查](/zh-tw/docs/develop/troubleshooting/)。更改業務程式碼前先確保依賴和執行時正確。
