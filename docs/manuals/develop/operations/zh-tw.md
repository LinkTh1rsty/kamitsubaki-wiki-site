---
book: "develop"
chapter: "operations"
locale: "zh-tw"
order: 4
title: "前臺開發與驗收"
summary: "按修改範圍檢查前臺，並區分本地效果與真實投稿流程。"
generatedFromHash: "288532f828de9d77ad8c"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

main 是生產來源。任務與外部 PR 保持目標 main，由協調者固定原始提交併整合到短期 release 分支。每個 PR 的檢查和審查通過後，再驗證整體候選。使用者明確批准具體候選清單後，使用 merge commit 一次合入釋出批次。正常生產由 Cloudflare Git 整合執行 node scripts/release-build.mjs，釋出前後核對 main 和公開發布標記。禁止繞過釋出入口上傳舊構建。記錄實際來源提交、部署 ID，以及賬號導航和相簿迴歸結果。

[Repository maintenance / 倉庫維護 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
