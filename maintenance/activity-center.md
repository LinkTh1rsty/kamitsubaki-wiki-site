# 活动中心

公开入口为 `/{locale}/events/`，无参数默认观测者企划，官方位于第二个标签（`?source=official`）；旧 `/{locale}/community/activities/` 打开同一组件的企划标签。来源、月份、视图、筛选和所选日期保存在 URL；标签分别记住当前页面内的筛选。默认桌面月历、760px 以下列表，周一起始。

## 组件和数据

月历、列表、事件跨日和更多弹层使用 FullCalendar 6.1.21 标准插件；只通过日期和事件 hooks 补充业务内容。旧 CalendarMonth 适配器保留给兼容调用和既有测试，新活动中心不加载其隐藏原生事件层的样式。地区复用 Tom Select、Floating UI，海报使用 PhotoSwipe；没有 Premium 依赖。interaction 授权位于 `../licenses/fullcalendar-interaction.txt`。

前台读取 `/api/activity-center`，`source=official|community`；后端契约见相邻后端维护手册。原始日程决定日期归属；具体时刻显示本地对照，全天日期不转换，未知结束不补默认时长。

- 首页活动宣传已移入[观测面板](dashboard.md)，按企划、官方顺序各至多两项；人工精选优先，未来30天近期点补足；无内容收起。
- 全站活动、工具和 AI 入口由观测面板统一接管；发电独立。保留窗口互斥、手机焦点与背景隔离、沉浸界面隐藏。
- 企划详情沿用词条阅读器的标题、正文与资料卡；嵌入海报使用 contain 完整显示，点击原海报入口由 PhotoSwipe 放大。Dashboard 与列表的规整图片区同样完整显示原图。保留原图、正文和静态HTML，增强失败不删除正文。首屏为日期/地点/参与入口，手机海报置于关键摘要之后；图片失效时移除空图框。
- 分享文案不携带入口统计参数。PNG 为1080×1440，使用已公开海报、署名、二维码；预览提供再次保存和手机长按保存。图片读取超时后仍可复制文本。
- 企划链接可增加 `role`、`primary`、`startsAt`、`endsAt`；旧投稿表单与旧后台编辑器会保留这些元数据。
- 统计仅汇总曝光、详情、参与外链、复制、图片和日历操作。企划卡片入口参数 `entry` 用于归属汇总，不标识个人，不代表报名或站外发送。

## 本机验收

在登记的独立任务目录安装前后端及后端 auth-ui/admin-ui 的锁文件依赖。Wiki 正式构建另需安装 `prototypes/novel-editor` 依赖；构建脚本会运行该子包。

后端 `scripts/activity-center-preview.mjs` 提供合成身份、内存数据库和注入的官方来源。仅监听本任务登记端口。开发边界在隔离模式把动态企划详情交给这个本机渲染器；生产仍由 Pages Functions 处理。

Wiki 启动必须按 `maintenance/README.md` 配置隔离注册表及全部业务 API；不得载入生产 .env。390px 验收入口由本机 API 的 `/__local__/responsive?path=/zh/events/` 提供。结束前记录进程、端口、截图、命令和限制。

单元测试：`node --test tests/activity-center.test.mjs tests/calendar-month.test.mjs tests/workspace-boundary.test.mjs`。其余检查仍按 CONTRIBUTING 执行。生产联调和发布需要独立批准与证据；本机样例不证明上游真实连通性。

## 已选第一方案（2026-10-25）

主规范为 [DESIGN.md](../DESIGN.md)，选稿及桌面/手机实图见 [视觉验收](../design-qa.md#活动中心第一方案验收2026-10-25)。桌面标题与来源切换同排、单行工具栏、双栏完整海报索引、月历与当日详情；手机默认列表，时间范围、搜索及视图移动到唯一筛选面板，保留同一表单节点，不复制状态。布局切换监听器随组件卸载清理。

未定日期不提供定位或单活动 ICS；仅日期已知不等于全天开放，不额外写“全天”。加载阶段不锁定默认日期，返回数据后选择实际活动日。月份列表标题使用月份，不显示日历补齐周造成的范围。

本机真实内容展示可给后端预览脚本设置 `ACTIVITY_PREVIEW_PUBLIC_SNAPSHOT`（公开 API 快照）和 `ACTIVITY_PREVIEW_POSTER_DIR`（含 activity-poster-0.jpg、activity-poster-1.jpg）。这些只用于一次性内存库，不能导入私有记录。作者端回执分别标明宣传开始/结束与时区；审核通过不等于取得推荐位置。
