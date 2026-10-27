---
book: "develop"
chapter: "operations"
locale: "zh-hk"
order: 4
title: "前台開發與驗收"
summary: "按修改範圍檢查前台，並區分本地效果與真實投稿流程。"
generatedFromHash: "a0b538733b91c2ed01a0"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

main 是生產來源。任務與外部 PR 保持目標 main，由協調者固定原始提交併集成到短期 release 分支。每個 PR 的檢查和審查通過後，再驗證整體候選。用户明確批准具體候選清單後，使用 merge commit 一次合入發佈批次。正常生產由 Cloudflare Git 集成執行 node scripts/release-build.mjs，發佈前後核對 main 和公開發布標記。禁止繞過發佈入口上傳舊構建。記錄實際來源提交、部署 ID，以及賬號導航和圖庫迴歸結果。

[Repository maintenance / 倉庫維護 / 保守手順](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/blob/main/maintenance/README.md)
