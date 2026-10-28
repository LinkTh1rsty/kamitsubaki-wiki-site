# Wiki ↔ Folia QQ 作品目录

Wiki 的 `src/data/music-listen.json` 是双方共用的公开作品身份表。词条的显式 QQ 官方链接优先；没有显式链接时读取此表。只接入 QQ 音乐，入口沿用既有设计，独立标签直接进入 Folia 原生专辑或歌曲卡片，不自动播放。Wiki 与 QQ 账户会话分离。

2026-10-28 核验：158 张 Wiki 专辑中接入 75 张；1557 首歌曲中接入 1017 首，共 1092 个 Wiki 词条、1082 个 QQ 作品身份。原有 16 条身份保持。尚未确认的 623 个条目逐项记录在 [覆盖清单](music-listen-coverage.json)，未确认不等于 QQ 没有收录。

## 核验依据

- 艺人使用 Wiki 已著录的姓名及别名定位 QQ 公开艺人目录。存在同名人物时，用多首已知作品核对；不能唯一辨认的艺人不猜测。
- 专辑核对艺人、原文或 Wiki 已著录的多语言标题、发行日期、完整曲数和曲序；有时长记录时容差两秒。保留 Live、Remix、Inst 等版本信息。已完整辨认的专辑内允许平台省略 feat 署名，不允许两个不同的明确客演署名互换。
- 歌曲优先使用已核验专辑的准确曲序；否则核对实际 QQ 专辑曲目中的标题、艺人、时长与发行日期。日期指首发而平台指后续收录时，仅在完整艺人目录内唯一录音，或多个条目有相同音频文件身份时接受。目录不完整时不使用此推断。
- QQ 自带的中文翻译、原文标题字段与大小写/标点差异可归一；不做模糊搜索替换，也不把同名翻唱当成原曲。Wiki 著录的 Cover 版本仍需对应艺人、准确专辑日期和完整曲序。
- 一段录音可以关联多个 Wiki 词条；每个 QQ 身份仅有一个默认反向词条。由其他已核验别名词条进入时保留该来源。歌曲保存已核验的专辑 ID 与标题，即使 Wiki 未建立该专辑页也能定位原生卡片。

## 维护流程

以下脚本只用于离线编辑目录，匿名读取 QQ 公开元数据，不读取账号、Cookie、歌词或音频地址。运行时播放仍由 Folia 原生 Omni/QQ 控制器负责。缓存、候选和原始证据放在工作区外的任务私有目录，不提交到仓库。

```sh
node scripts/music-listen/audit-catalog.mjs --stage artists --out /path/to/private-audit
node scripts/music-listen/review-artists.mjs --out /path/to/private-audit
node scripts/music-listen/audit-catalog.mjs --stage songs --out /path/to/private-audit
node scripts/music-listen/audit-catalog.mjs --stage match --out /path/to/private-audit
```

可显式传 `--proxy`；每次运行用 `--max-requests` 限制新增公开读取。核验日期默认 UTC 当日，也可用 `--verified-at YYYY-MM-DD` 固定目录批次日期。脚本输出 `proposed.json` 与 `review.json`，不会自动覆盖正式目录。编辑者需复核新增候选、冲突与异常，保留已核验的录音版本，再将批准的提案写入 `src/data/music-listen.json`。

```sh
node scripts/music-listen/check-catalog.mjs
node scripts/music-listen/coverage-report.mjs /path/to/private-audit/review.json
node --test tests/music-listen.test.mjs tests/music-listen-match.test.mjs
```

Folia 源库执行 `node dev/deploy/importWikiMusicCatalog.mjs /absolute/path/to/wiki/src/data/music-listen.json`，只导入公开身份及源 SHA256。测试逐条检查所有词条的目标专辑、歌曲焦点及回链。随后分别构建 Wiki 与 Folia，验证桌面、手机的实际原生卡片与缩略图。新增作品沿用此流程；未映射的词条不会生成猜测链接。

## 边界

此目录验证作品对应关系，不证明 QQ 账号拥有完整播放权限。免费完整版/会员播放仍待原生播放器实测，不能用打开卡片替代音频验收。当前仅预览；`PUBLIC_FOLIA_ORIGIN` 默认关闭，Wiki 生产发布及音乐正式域名需要独立批准。

覆盖清单的 `release-not-found` / `song-not-found` 表示本次读取的目录没有通过核验的候选；部分艺人目录未完整返回，因此不表示平台不存在该作品。`tracklist-mismatch` 表示标题、曲数、曲序或时长不一致；`edition-date-unconfirmed` 表示未能唯一确定录音版本；`lookup-failed` 表示公开接口拒绝详情读取；`artist-unresolved` 表示艺人身份待确认。
