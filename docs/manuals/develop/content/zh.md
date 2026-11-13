---
book: develop
chapter: content
locale: zh
order: 3
title: 内容模型与多语言
summary: 按实际 schema 维护实体、目录、关系和五语言内容，保留业务审计资料。
---

## 找到事实来源

内容目录规则见 `src/content/README.md` 和 `src/lib/contentLayout.mjs`；实际字段由 `src/content.config.ts`、`src/lib/entitySchema.mjs` 与注册表约束。分类依据 `src/data/classification-map.json`。历史规范可以解释背景，但不能覆盖当前校验规则。

同一实体在一个目录内维护 `zh.md`、`ja.md`、`en.md`，跨语言沿用稳定 ID。显示名、目录位置和网址不是同一个概念；改显示名不应改实体 ID。不要通过复制整份内容目录来修复分类。

## 字段、关系与特征数据

根据实体类型选择字段。歌曲表演者、制作署名、发行关系等结构化字段影响索引与页面；正文链接不会自动建立所有业务关系。关系修改后检查正向和反向展示。

时间轴事件、分类字典与百科正文分工明确。图库和文章投稿状态由服务提供，不把它们写成静态词条字段。完整写作和字段实例见[内容格式](/zh/docs/contribute/format/)与[语法参考](/zh/docs/contribute/syntax/)。

## 多语言修改流程

先确认实际源语言。简中、日文和英文独立维护；台湾与香港繁体通过 `pnpm i18n:generate` 生成。保留代码标识、URL、授权和引用信息，不翻译稳定 ID。

正式文档存放在 `docs/manuals/{分类}/{章节}/{语言}.md`，其 frontmatter 的 `book`、`chapter`、`locale` 与目录相符，`order` 决定顺序。各语言章节集合与排序一致，内链指向同一语言。

## 校验与受保护资料

```sh
pnpm validate:content
pnpm i18n:generate
pnpm docs:check
```

检查实际差异，不把生成器引起的无关变化提交进来。构建校验仍读取的历史 JSON 清单、文章源稿和转换原稿属于业务资料；即使位于 docs 或 maintenance，也不能按旧说明文档一并移动。

校验通过后构建并核对词条链接、多语言切换和关联展示。失败时回到首个字段或路径错误；不要重建审计基线来掩盖正文损失。
