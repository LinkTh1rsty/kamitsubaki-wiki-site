---
book: develop
chapter: architecture
locale: zh
order: 2
title: 架构与集成边界
summary: 理解静态页面、公开接口、编辑器与独立服务各自负责的内容。
---

## 从入口追踪行为

主站由 Astro 生成静态页面，路由位于 `src/pages`，页面组件在 `src/components`，共享规则在 `src/lib`，构建和校验入口在 `scripts`。处理问题时先找当前路由，再追踪组件、数据加载和样式，不依据旧方案猜测实现。

百科 Markdown 位于 `src/content`；时间轴事件在 `src/data/chronicle`。文章和图库存在动态服务边界，公开阅读结果与用户私有草稿不能混为一类数据。

## 编辑器和影像馆

`prototypes/novel-editor` 是正式共用编辑器源码，主站的 `build:editor` 会安装并构建该子包，再输出到静态资源目录。不要把生成后的编辑器资源当作源代码修改。

`prototypes/chronoframe-explore` 是独立影像馆服务，按该目录 README 配置。主站保留现有入口；文档或界面改动不能假设它与 Wiki 共用运行时、数据库或发布过程。

## 接口与身份边界

公开页面只读取所需的公开字段。私有草稿、审核讨论和账号操作依赖服务端权限；前端隐藏按钮不能替代权限校验。账号界面留在 Wiki 域名，返回地址使用精确来源注册表。

共享账号导航或图库界面有变化时，两处一起检查。保留现有用户 ID、绑定与回调；不要重建身份或 Passkey 来绕过配置问题。

## 变更前后核对

先记录现有路由、查询参数、数据来源和状态转换，再做最小修改。至少检查首次访问、刷新、失败重试及旧链接。区分静态构建、本机模拟和真实服务结果。

下一步阅读[内容模型](/zh/docs/develop/content/)与[页面和共享组件](/zh/docs/develop/frontend/)。
