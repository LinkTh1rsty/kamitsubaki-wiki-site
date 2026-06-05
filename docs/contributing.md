# 贡献指南

[English](contributing.en.md) / [中文](contributing.md) / [日本語](contributing.ja.md)

这份文档是编辑百科和提交 Pull Request 的主要参考。

## 编辑内容

大多数修改都在 `src/content/`。

```text
src/content/site/       站点导航、分区标题、页脚文案 (.json)
src/content/artists/    艺人、创作者、组合、音乐同位体条目 (.md)
src/content/projects/   企划页面和卡片内容 (.md)
src/content/logs/       时间线/更新记录 (.json)
src/content/contribute/ GitHub 编辑教程页文案 (.json)
```

不要编辑 `dist/`、`.astro/` 或 `node_modules/`。

## 三语文件

站点支持三个语言路由：

```text
/zh/  中文，默认语言
/ja/  日文
/en/  英文
```

每个可翻译记录都应该有三份语言文件。新增条目时请同时创建 `zh.md`、`ja.md`、`en.md`，并保持相同的 `translationKey`。

## Markdown 结构

Markdown 文件使用 YAML frontmatter 存放结构化数据。

```yaml
---
locale: zh
translationKey: kaf
name: "花谱"
romanizedName: "KAF"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
seo:
  title: "花谱 - KAMITSUBAKI WIKI"
  description: "用于搜索结果和链接预览的自定义描述。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花谱"
    - "KAF"
---
```

正文写在第二个 `---` 后面。正文可以留空，但不要写占位介绍。

## 首页展示

首页 DATABASE 会自动扫描 `src/content/artists/` 的第一层文件夹作为分类。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ 首页分类
```

新增分类时，只需要新建第一层文件夹并放入三语条目。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder` 和 `code` 都是可选覆盖字段；不填时会使用文件夹名、条目名和默认排序。

## 元数据

`seo` 是可选字段。不填写时，站点会自动扫描：

- `name`、`romanizedName`、分类和状态作为兜底元数据。
- Markdown 正文第一段作为页面描述。
- `image` 作为 Open Graph 和 Twitter 分享图。

只有需要精确控制搜索结果或分享卡片时，才填写 `seo.title`、`seo.description`、`seo.image`、`seo.keywords` 或 `seo.noindex`。部署时设置 `PUBLIC_SITE_URL` 可以让 canonical URL 和站内图片变成绝对地址。

## 新增条目

1. 在正确的内容分类下创建文件夹。
2. 添加 `zh.md`、`ja.md`、`en.md`。
3. 三个文件使用相同的 `translationKey`。
4. 填写必要 frontmatter。
5. 正文未准备好时可以留空。
6. 运行本地验证。
7. 发起 Pull Request。

## 本地验证

CI 和本地使用同一套命令：

```bash
pnpm test
pnpm check
pnpm build
```

如果 `pnpm check` 报内容 schema 错误，请对照 `src/content.config.ts` 检查对应文件。

## Pull Request 流程

1. 从 `main` 创建分支。
2. 修改内容或实现。
3. 运行本地验证。
4. 提交并推送分支。
5. 向 `main` 发起 Pull Request。
6. 等待 GitHub Actions CI。
7. 在同一分支修复 CI 或 review 问题。

CI 工作流在 `.github/workflows/ci.yml`。

## 合并前检查

- 没有占位正文。
- 所有必要语言文件都存在。
- `pnpm test`、`pnpm check`、`pnpm build` 通过。
- PR 只包含相关文件。
- 不提交 `dist/` 等生成目录。
