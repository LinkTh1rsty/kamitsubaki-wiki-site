---
book: "develop"
chapter: "start"
locale: "zh-hk"
order: 1
title: "環境與啓動"
summary: "安裝固定運行時，啓動獨立開發服務，並配置可核對的本機來源。"
generatedFromHash: "9af4466aa45812a3c099"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 準備環境

先閲讀倉庫 README，使用 `.node-version` 指定的 Node.js 補丁版本和 pnpm 11.1.1。不要用“同為 Node 22”代替精確版本。為本任務保留獨立分支、工作樹和空閒端口。

```sh
node --version
pnpm --version
pnpm node:check
pnpm install --frozen-lockfile
pnpm dev --host 127.0.0.1 --port 18000
```

啓動命令會準備編輯器、共享界面和繁體內容。首次安裝或構建可能較慢；等待終端打印本機訪問地址後再打開瀏覽器。不要重複啓動同一端口。

## 單站與跨服務開發

只修改靜態頁面、文檔或百科內容時，可以獨立克隆前端。賬號、文章和圖庫的真實狀態轉換需要匹配的本機服務；單站啓動成功不代表跨服務驗收通過。

隔離模式同時設置 `WORKSPACE_ISOLATED=true`、`PUBLIC_WORKSPACE_ISOLATED=true`，以及 `PUBLIC_WORKSPACE_API_ORIGIN`、`PUBLIC_WORKSPACE_WIKI_ORIGIN`、`PUBLIC_WORKSPACE_COMPANION_ORIGIN`。三個來源必須是不同端口的 `http://127.0.0.1` 地址；Wiki 來源對應當前前端。業務 API 變量指向本機 API，`PUBLIC_SITE_URL` 指向本機 Wiki。

不要複製生產環境文件、Cookie 或數據庫。隔離配置遺漏或互相沖突時應先修正配置，不切回生產服務來完成測試。

## 核對結果

確認首頁、文檔、詞條可打開，終端沒有運行時版本錯誤。記錄分支、提交、運行時、啓動命令與端口。遠程字體、外部圖片和登錄供應商在隔離環境的限制應單獨記錄。

如果啓動失敗，先看終端首個錯誤，再查[故障排查](/zh-hk/docs/develop/troubleshooting/)。更改業務代碼前先確保依賴和運行時正確。
