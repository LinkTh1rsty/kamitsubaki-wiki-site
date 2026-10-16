---
book: "develop"
chapter: "content"
locale: "zh-tw"
order: 2
title: "分類、後設資料與內容維護"
summary: "使用分類地圖、schema 和結構化關聯維護百科及探索資料。"
generatedFromHash: "3b80731c555c79197e70"
generated: true
generatedFrom: "zh"
---

<!-- AUTO-GENERATED FROM zh; DO NOT EDIT DIRECTLY. -->

## 內容身份

百科原始檔位於 `src/content/`，以穩定 ID、實體型別和語言確定身份。後設資料協議 `schemaVersion: 2` 與網站版本 V3 不同。修改欄位時先檢視 `src/lib/entitySchema.mjs`、`src/lib/metadata.mjs` 和 `src/lib/contentLayout.mjs`，再檢查前臺編輯器欄位；不能只改頁面標籤。簡中、日文、英文源稿共享同一實體身份，繁體由簡中生成。

## 分類與目錄

人物、團體、專案等分類依據 `src/data/classification-map.json` 與詳細分類地圖；不能從“藝人”標籤推斷首頁層級。新增實體的原始檔路徑由內容佈局規則生成，但首頁目錄的稽核分類節點仍需顯式維護。歌曲按 `performers`、發行作品按 `releaseType` 等結構欄位歸檔；不要把網頁 URL 當原始檔路徑。

## 關聯與功能資料

`relations`、`performers`、`credits` 和形態譜系驅動關聯檔案、作品署名與切換器。文章關聯詞條必須顯式儲存目標 ID，不從正文 WikiLink 推斷。時間軸事件在 `src/data/chronicle/`，紀元區間由 `src/data/taxonomy/eras.yml` 定義；普通正文日期不會自動變成事件。相簿角色目錄與實體後設資料保持一致；圖片和稽核狀態由站點服務提供，不作為百科 Markdown 維護。

## 改動流程

修改分類、欄位或目錄規則後，檢查現有詞條遷移與多語言對應，執行內容校驗，並檢查前臺編輯器及相簿角色列表。保留舊正文和來源，必要時通過遷移報告驗證原檔案雜湊；不要為使校驗通過而批次重寫事實。

## 一個實體、多個入口

`classification.primary` 決定主歸檔，`classification.additional` 增加發現入口；同一實體的不同分類不復制 Markdown。團體成員要有真實的 `member-of` 關係和團體目標；形態譜系由 `presentation.morphing.group` 聚合，獨立形態仍各有 ID、正文、圖片和分類。關係不能因為外觀相近就自動推斷。

| 資料變更 | 維護位置 | 不能代替它的做法 |
| --- | --- | --- |
| 人物／團體層級 | `src/data/classification-map.json`、實體分類欄位 | 在首頁元件裡寫死 ID。 |
| 歌曲／專輯歸檔 | `performers`、`releaseType` 等後設資料 | 根據 URL 字串猜測型別。 |
| 時間軸事件 | `src/data/chronicle/` 和紀元配置 | 僅在正文寫日期。 |
| 形態與關聯 | `presentation.morphing`、`relations` | 從正文提及自動推斷身份。 |
| 相關文章 | 文章修訂中的顯式詞條 ID | 掃描文章 WikiLink。 |

## 新增詞條的維護順序

先查穩定 ID 和所有語言、選擇準確實體型別，再按分類地圖決定主歸檔與額外入口。建立 `zh.md`、`ja.md`、`en.md` 時應核對內容語言，不能把中文複製成日英“譯文”。繁體由生成器產生。填入有來源的屬性和正文後，執行 `pnpm validate:content`；如果改動了 schema 或編輯器欄位，再檢查前臺輸入與預覽。移動既有主路徑需保留舊 URL 重定向，使用遷移報告核對正文未意外改變。

## 分類和形態的最小示例

下例是**結構示例**，`example-unit` 等 ID 僅供說明，不是站內已存在的檔案；實際目標 ID 必須先在目錄中確認。

```yaml
schemaVersion: 2
id: example-member
locale: zh
entityType: person
name: 示例成员
romanizedName: Example Member
roles: [vocalist]
lifecycle:
  activity: active
classification:
  primary: groups
  group: example-unit
  additional: [creators]
relations:
  - type: member-of
    target: example-unit
presentation:
  morphing:
    group: example-family
    slot: virtual-artist
    order: 1
```

`group` 需要目標團體是 `unit`，並且 `relations` 中有匹配的 `member-of`；不能只填一個資料夾名。多團體成員可以有多條成員關係，但主歸檔仍只有一個。形態組只決定選擇器聚合，不自動斷言人物身份；需要真實關係時另填恰當的 `relations` 型別。額外分類是同一檔案的目錄入口，不是第二份 Markdown。

遷移已存在實體時，先執行只讀報告確認舊 URL、語言、ID 和正文雜湊，再遷移路徑並加重定向。校驗跨語言的分類一致性、關聯目標存在性及佔位狀態；有錯誤時修正欄位或來源，不為通過檢查而製造正文事實。欄位完整定義以倉庫的 `src/lib/entitySchema.mjs` 為準。
