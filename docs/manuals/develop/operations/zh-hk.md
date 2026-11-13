---
book: "develop"
chapter: "operations"
locale: "zh-hk"
order: 6
title: "檢查與發佈"
summary: "運行倉庫門禁，核對真實行為，並通過既有發佈入口追溯來源。"
generatedFromHash: "610d658444d3c06b23c7"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 準備檢查

記錄當前提交與工作區狀態，使用固定 Node 版本和鎖文件依賴。下面命令在倉庫根目錄執行；編輯器子包由主站構建準備。與其他服務聯調時採用本機隔離配置。

```sh
pnpm node:check
pnpm test
pnpm check
pnpm ui:tokens:check
pnpm check:ui-icons
pnpm docs:check
pnpm lyrics:timestamps:audit -- --strict
pnpm build
node scripts/v3/check-built-links.mjs
pnpm pages:assets:audit
```

當前命令以 package.json 和 CI 為準。上游刪除的檢查記錄為“不再提供”，不能偽報通過或為了舊清單恢復過時腳本。缺少後端檢出時，測試啓動器會跳過部分跨倉庫測試；必須在結果中註明。

## 檢查通過意味着什麼

測試檢查規則與狀態，Astro 檢查類型與模板，文檔檢查語言和鏈接，構建鏈接審計檢查輸出頁面，資源審計檢查 Pages 文件限制。命令退出 0 不能證明真實登錄、供應商、投稿審核或生產發佈成功。

賬號、圖庫和編輯器變更檢查列表、詳情、操作、刷新後讀回。界面變更覆蓋桌面和手機、明暗主題、鍵盤、網絡錯誤與恢復。使用模擬數據時明確標記模擬範圍。

## 候選與集成

開始任務、集成前和發佈前刷新遠端並核對 main。固定候選提交、成員原始 head、檢查結果、審查證據及回退方式；保留其他任務和作者的提交。新 main 到來後重新集成並驗證受影響部分。

代碼倉庫 main 合併和生產寫入需要用户對具體候選的明確批准。通過 CI 或提交計劃不等於發佈授權。

## 正式構建與發佈標記

Cloudflare Git 集成從 main 執行 `node scripts/release-build.mjs`。該入口校驗來源並生成 `/.well-known/wiki-release.json`。不要直接上傳其他目錄的舊產物來繞過入口。

構建前後核對來源提交，部署後核對公開標記和部署 ID。雲構建恢復仍須使用同一入口的 production 產物並再次核對 main。實際生產日誌和發佈標記才是生產證據。

## 保存證據

記錄環境、提交、命令、退出碼、截圖和限制。分別説明本機樣例、實際本地行為及生產證據。失敗時保留首個錯誤和上下文；恢復方法見[故障排查](/zh-hk/docs/develop/troubleshooting/)。
