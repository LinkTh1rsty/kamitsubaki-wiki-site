> 历史归档 / Historical archive / 過去の資料。当前说明请查阅新版文档；本文中的旧计划不代表现行实现。

# 文章阅读器

文章列表与动态阅读页的布局位于 articleWorkspace.css；词条、账户和图库使用各自组件。

公开 API 的 author 保留发布时署名；authorAvatarUrl 是可选字段，由后端按原 owner_id 的既有账号合并映射提供。无头像、坏头像、不安全 URL 均显示现有图标。旧服务无新字段时也能阅读；不能按昵称猜测绑定。

src/lib/articleReaderPresentation.mjs 由客户端及 Pages Function 共用，负责转义后的作者、分类、来源和日期展示。服务端页面预先带标题、元信息、简介和正文，客户端加载目录、关联词条及权限。网络刷新失败保留已有正文并显示重试；重试不重复目录条目或绑定正文点击处理。
