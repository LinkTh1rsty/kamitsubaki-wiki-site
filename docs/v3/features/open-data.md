# Archive Open Data v1

页面入口：`/zh/explore/open-data/`（支持五语言），可选择当前／已保存版本、核对 SHA-256、预览集合、下载 JSON／CSV／ZIP 和引用说明。哈希不符时禁用下载。完整说明见 [F01–F12 完成说明](f01-f12-completion.md)。

接口入口：`/api/archive/v1/manifest.json`。接口为公开静态 JSON，允许跨站读取，不要求登录，也不包含个人记录、账号、草稿、审核者身份或房间参与者。

| 资源 | 返回内容 |
| --- | --- |
| `entities.json` | 稳定实体 ID、共享事实、分语言名称/摘要/路由、已记录媒体及修订元数据 |
| `relations.json` | 有方向的实体关系及对应记录 |
| `events.json` | 时间轴事件、日期精度、分语言叙述及来源 |
| `calendar.json` | 精确到日的事件，供历史月日查询使用 |
| `physical.json` | 独立实体物品；发行版次另见实体的 `facts.editions` |
| `credits.json` | 作品 ID、制作角色、创作者身份或记录名称及来源关联 |
| `evidence.json` | 字段证据、明确关联的来源与人工核对状态 |
| `translations.json` | 分语言叙述及转换生成标志 |
| `issues.json` | 缺失关系、事实差异等公开资料问题 |
| `schema.json` | 快照的机器可读资料契约 |
| `catalogue.json` | `{version:1,current,snapshots:[{hash,current,url}]}`，列出当前和已提交的不可变快照 |
| `snapshots/<SHA-256>.json` | 包含上述档案集合的固定内容快照 |

除 manifest、catalogue、schema 和完整快照外，资源具有 `{version:1,snapshot,records}` 信封。`version` 表示契约主版本；`snapshot` 是使用稳定对象键排序后计算的档案内容 SHA-256，与获取时刻不同。实体身份使用 `id`，请不要用译文标题、路径末段或数组位置作为主键。

日期精度分别保留年、月与日。缺值、空列表和未连接关系只表示当前未收录，不表示历史上不存在。Setlist 统计只覆盖有曲目记录的演出；部分曲目摘录不能当作完整场次。字段证据只有明确的 `field` 与 `sourceIds` 关联才成立。`reviewed` 表示记录的人工核对状态，不保证来源永远可用。

语言无关事实从规范资料提取；`narratives` 保存分语言标题、摘要及路由。未写译文时使用有标记的原文回退；繁体转换通过 `generated` 标明。`issues` 保留原始译文事实差异，便于后续审阅。

引用时写明：实体 ID、快照 SHA-256、具体来源 URL、访问日期，以及 KAMITSUBAKI Wiki 贡献者。本站原创文字遵循站点说明的 CC BY-NC-SA 4.0；来源文字、图片、录音、影片与官方嵌入仍遵循各权利人的使用条件。数据接口不授予第三方素材版权。

维护者用 `pnpm archive:snapshot` 主动保存需要长期引用的快照；保存结果在 `public/api/archive/v1/snapshots/`，须随资料变更一起检查和提交。构建不会自动写入源码。`pnpm archive:snapshots:check` 校验已有快照内容与文件名哈希，已保存的哈希文件不得覆写或删除。manifest 指向当前快照；旧快照只有经过主动保存与发布后才可长期访问。
