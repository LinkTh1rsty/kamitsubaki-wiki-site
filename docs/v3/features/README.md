# Fan Archive 本轮功能说明

当前十二项交付、操作和资料缺口见 [F01–F12 完成说明](f01-f12-completion.md)，检查证据见 [本轮补全验收](../acceptance/2026-10-14-f01-f12-completion.md)。

原候选整理日期：2026-10-13。后续实现更新见[2026-10-14 扩展功能](archive-expansion.md)与[Open Data](open-data.md)；下文保留原六项候选的历史范围，不作为当前未完成清单。

整理日期：2026-10-13。本目录分别说明本轮完成的六项功能，包括用途、入口、操作方法、数据依据、当前限制和维护位置。

当前总体规划见[Fan Archive 整合 Roadmap](../fan-archive-roadmap.md)：保留原十二项编号，合并共享对话第二轮二十五项设想及全站 UI／UX、数据质量与 Support 工作。

代码与说明随 [PR #72](https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/pull/72) 提交。本次整理时 PR 尚未合并，功能已在候选分支和本机预览验证；是否出现在正式站点，以合并与发布结果为准。

## 六份独立说明

| 原提案 | 说明文档 | 页面入口 | 本轮交付 |
| --- | --- | --- | --- |
| 1. Graph 全站关系图谱 | [Graph](graph.md) | `/zh/graph/` | 全图与周边探索、筛选、节点详情、路径比较、分享及图片导出 |
| 3. Story Mode 入坑路线 | [Story Mode](story-mode.md) | `/zh/explore/stories/` | 五条六章导览、按需媒体、已读进度、续读与章节分享 |
| 5. Live Archive 演出档案馆 | [Live Archive](live-archive.md) | `/zh/explore/lives/` | 演出检索、活动详情、曲目展示与歌曲的反向演出历史 |
| 7. Credits Database 创作者档案 | [Credits Database](credits-database.md) | `/zh/explore/credits/` | 创作者索引、署名筛选、合作艺人与年份概况 |
| 9. Discovery Engine 随机探索 | [Discovery Engine](discovery-engine.md) | `/zh/explore/discovery/` | 偏好推荐、推荐依据、每日路线、换路线与分享复现 |
| 11. Knowledge Status 资料完整度 | [Knowledge Status](knowledge-status.md) | `/zh/contribute/missing/` | 字段完整度、缺项看板、组合筛选与实际词条编辑入口 |

以上入口均支持 `zh`、`en`、`ja`、`zh-tw`、`zh-hk`。换语言不会改变实体身份；Story 的已读进度和 Discovery 的固定日期路线也保持一致。

本机候选预览的起点是 [Story Mode 目录](http://127.0.0.1:4339/zh/explore/stories/)。预览服务运行时，可用相同地址前缀打开表中的其他路径。

## 这些功能怎样一起使用

新人可以先用 Story Mode 获得阅读顺序；读到一个感兴趣的名字后，在 Graph 看它的关系，在 Discovery 找下一条探索线索。歌曲可以继续进入创作者查询或演出历史；看到资料缺项时，再从完整度看板进入贡献流程。

这六项复用既有词条、稳定实体 ID、署名、演出资料和 Chronicle。Chronicle、图库、账号和原有世界观导览是已有基础，本轮没有将它们重新计为新增功能。

## 对原十二项提案的覆盖

“已实现”表示本轮交付了可使用的功能，不表示原提案中的所有扩展设想或档案数据已经齐全。

| 项目 | 本轮状态 | 仍需推进的范围 |
| --- | --- | --- |
| 1. Graph | 已实现 | 持续补充有来源的关联资料 |
| 2. Atlas | 未新增 | 现实与虚拟双地图、巡礼路线 |
| 3. Story Mode | 已实现 | 更多导览主题和编辑选材 |
| 4. Music Universe | 部分基础被复用 | 完整 Remix／Cover／版本关系及专门音乐探索界面 |
| 5. Live Archive | 查询与展示已实现 | 实际 Setlist、票种、商品、报道、观众贡献等档案内容 |
| 6. Visual Evolution | 未新增 | 可拖动的形态演化时间轴与完整使用记录 |
| 7. Credits Database | 查询已实现 | 更完整的署名、创作者人物档案及全面统计 |
| 8. Archive Statistics | 未新增 | 独立数据中心与年度报告 |
| 9. Discovery Engine | 已实现 | 扩充真实风格标签与更多公开文章关联 |
| 10. Collection / My Archive | 未新增 | 公开 Collection、Follow／Fork；既有收藏基础不等于这些能力 |
| 11. Knowledge Status | 已实现 | 任务认领、协作状态、积分与成就 |
| 12. Archive API / Open Data | 未新增 | 稳定公开接口、版本与引用规范；页面数据索引不等于公开 API 产品 |

## 检查与维护

实现交付前完成了自动测试、类型检查、构建和浏览器检查。最近一轮候选复查为 812 项测试通过，类型检查无错误、无警告，构建生成 9,749 个页面。构建仍报告已有资料警告，完整记录见[功能复查与 UI 调整](../acceptance/2026-10-13-archive-review.md)，初始交付记录见 [Story Mode 验收](../acceptance/2026-10-13-story-mode.md)。这些检查不代表实际账号登录、投稿审核或全部第三方媒体播放已经完成验收。

本目录是功能使用与维护说明；详细验证过程见[验收目录](../acceptance/README.md)，共享数据规则见[功能数据与关联维护](../feature-maintenance.md)。修改资料后需重新校验与构建，数据统计以对应构建的资料快照为准。
