# 功能数据与关联维护

## 统一实体身份

`id` 是跨语言、跨文件和关联的稳定键。显示名称与磁盘路径可以变化，既有 ID 不随之改变。实体来源是 `src/content/`，共享字段校验由 `src/lib/entitySchema.mjs` 执行，路由与关系由 `entityModel.mjs`、`entityRegistry.mjs` 解析。

## 分类与主页

依据详细地图维护 `src/data/classification-map.json`。人物在明确的组别节点出现，不因为兼任身份自动改到个人层级。地图未编目的内容不应随意塞入已审核分组。目录调整使用 `node scripts/v3/organize-content.mjs` 预演，确认后 `--apply`，再检查编辑器路径同步。

## 时间轴与足迹

事件保存在 `src/data/chronicle/`，纪元区间在 `src/data/taxonomy/eras.yml`。填写事件日期、实体关联和来源，日期驱动纪元归属；词条中的普通日期或正文段落不会自动变成时间轴事件。关联 ID 必须存在，跨语言事件共用事件身份。运行 `pnpm validate:content` 检查事件与引用，再在时间轴和相应实体阅读器查看足迹。

## 形态、署名与反向关联

`presentation.morphing` 指定同一形态组、槽位和顺序。`performers` 表示表演者，`credits` 表示署名，`relations` 表示一般实体关系，`affiliations` 表示所属。使用结构字段建立关联，不在模板写死某个艺人 ID。正向字段经过实体索引生成反向入口；添加关系后检查两端阅读器。

## 图库与文章

图库资料变更通过[设定投稿流程](../manuals/contribute/gallery/zh.md)审核后才显示在公开页面；新增可选角色须更新实体，并检查前台选择器与图库目录。

文章使用独立投稿页面，经审核后才公开，不通过百科 GitHub PR，见[文章投稿说明](../manuals/contribute/article/zh.md)。正文与来源许可需要单独核对，不能以图片上传或实体关联代替出处。

## 发布前检查

先验证内容与文档镜像，再构建。人工检查本次影响的入口、选择器、阅读器目录与背景、跨条目跳转、手机布局。投稿、附件和图库须分别记录真实流程证据；仅看到图片或模拟响应不能证明上传审核流程已通过。
