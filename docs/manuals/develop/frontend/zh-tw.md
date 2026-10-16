---
book: "develop"
chapter: "frontend"
locale: "zh-tw"
order: 3
title: "前臺頁面與共享元件"
summary: "用統一頁面骨架、Reader 和控制元件規範擴充套件網站而不破壞既有體驗。"
generatedFromHash: "9005006fec28b9ec4d0e"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 頁面結構

一級區域為百科、文章、探索、LABs 和參與共建。頁面入口集中在 `src/lib/siteFeatures.mjs`；不要在首頁、頁首和二級頁各寫一套不同路徑。二級頁使用共享的 `WorkspaceShell`、`WorkspaceHeader` 等元件，返回與主要操作保持固定位置。新增功能先確定所屬區域及窄屏佈局，再加導航入口。

## 閱讀與內容展示

詞條、文章與說明書分別複用 `Reader.astro` 的合適形態。本說明書頁面使用 `variant="guide"`，傳入 Markdown 渲染得到的 headings，直接使用原目錄與錨點互動。不要用一組相似 CSS 冒充閱讀器。首頁清晰懸停背景、詞條閱讀背景、形態選擇器圖片＋名字和分批展開是迴歸基線；調整共享樣式時逐項核對。

## 操作與動效

跨頁導航、檢視切換與篩選應表現出不同語義；滑塊僅用於有實際切換關係的控制元件。控制元件維持清晰焦點、載入、空狀態和失敗反饋，圖片與字型預留尺寸。切換動畫可中斷，遵守減少動態效果設定；不能通過刪除閱讀背景或懸停反饋解決抽動。公共控制元件使用介面中性色，詞條主題色只用於對應內容。

## 複用時先選語義

跨頁跳轉用文本連結、麵包屑或 `WorkspaceLinkNavigation`；同頁互斥檢視用 `ContentTabs` 或有明確當前項的選擇組；篩選用搜索和 `WorkspaceFilters`；載入、無結果與錯誤使用 `WorkspaceState`、`WorkspaceEmptyState`。返回按鈕位於標題上方，主要操作在標題右側，窄屏轉到標題下方。不要為了所有頁面“統一”而放一排沒有真實關係的滑塊。

長文用 `Reader.astro`。百科傳 `variant="entry"` 並保留主題圖、側欄；文章用其文章形態；說明書章節使用 `variant="guide"` 和渲染器提供的 `headings`，目錄錨點的 `slug` 必須與正文 `id` 一致。這個元件已負責目錄跟隨、窄屏摺疊、鍵盤和減少動態效果，頁面不應複製一套相似的目錄指令碼。

## 視覺與互動迴歸

首頁條目、歌曲和專輯的清晰懸停背景，閱讀器背景與主題色，圖片＋名字的形態選擇、分批展開，都是保留項。新增元件預留圖片比例和控制元件尺寸，首次定位不播放位移動畫；快速切換需取消前一個動畫。深淺色、鍵盤焦點、窄屏和減少動態效果都應檢查。頁面級 CSS 只處理內容佈局，不覆蓋共享按鈕、篩選和彈窗狀態。
