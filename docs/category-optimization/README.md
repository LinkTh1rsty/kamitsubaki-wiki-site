# 分类与元数据规范

阅读顺序：

1. [分类总案](classification-master-plan.md)：分类目标与边界。
2. [详细分类地图](classification-detailed-map.md)：首页和数据库的审核层级。
3. [元数据 Schema v2](metadata-schema-v2.md)：实体字段、关系和生命周期。
4. [功能数据架构](feature-data-architecture.md)：时间轴、图库和跨条目功能的初始设计。

分类地图是人工编目依据，运行时数据位于 `src/data/classification-map.json`。元数据规范描述协议，实际校验以 `src/lib/entitySchema.mjs` 为准；二者不一致时必须修正规范或实现，不能靠页面硬编码绕过。
