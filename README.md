# KAMITSUBAKI Wiki Site

非官方 KAMITSUBAKI STUDIO 粉丝百科，使用 Astro 构建为静态站点。

这个仓库面向 GitHub Pull Request 工作流：贡献者编辑内容文件，在本地运行同一套检查，提交 PR，由 CI 验证后再合并和部署。

## 语言

- [English](README.en.md)
- [中文](README.md)
- [日本語](README.ja.md)

## 应该编辑哪里

大多数百科贡献只需要改 `src/content/`。

```text
src/content/site/       导航、分区标题、页脚等站点文案 (.json)
src/content/artists/    艺人、创作者、组合、音乐同位体条目 (.md)
src/content/projects/   企划卡片与企划条目 (.md)
src/content/logs/       时间线/更新记录 (.json)
```

实现代码在这些目录：

```text
src/components/         Astro UI 组件
src/pages/              路由和页面组合
src/layouts/            共享页面布局
src/styles/             全局 CSS 与 Tailwind 样式
src/scripts/            浏览器交互脚本
tests/                  Node 测试
```

## 快速开始

使用 `pnpm`。

```bash
pnpm install
pnpm dev
```

Astro 会输出本地预览地址，例如：

```text
http://127.0.0.1:4321/
```

打开 `/zh/`、`/ja/` 或 `/en/` 预览对应语言。

## 编辑百科条目

艺人条目是带 YAML frontmatter 的 Markdown 文件。

```text
src/content/artists/vwp/kaf/zh.md
src/content/artists/vwp/kaf/ja.md
src/content/artists/vwp/kaf/en.md
```

企划条目使用同样的三语文件结构：

```text
src/content/projects/arg/kamitsubaki-city/zh.md
src/content/projects/arg/kamitsubaki-city/ja.md
src/content/projects/arg/kamitsubaki-city/en.md
```

同一个条目的三种语言必须使用相同的 `translationKey`。

```yaml
---
locale: zh
translationKey: kaf
code: "01"
name: "花谱"
romanizedName: "KAF"
categoryId: "cat-vwp"
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
---
```

正文写在第二个 `---` 之后。正文可以留空，所以可以先补结构化信息，之后再完善文章内容。

Markdown 支持标题、列表、表格、链接、代码块，以及通过 KaTeX 渲染的 LaTeX 公式。

## 新增条目

1. 在 `src/content/artists/` 或 `src/content/projects/` 下选择正确分类。
2. 为条目创建一个文件夹，例如 `src/content/artists/vwp/new-artist/`。
3. 添加 `zh.md`、`ja.md`、`en.md`。
4. 三个文件使用相同的 `translationKey`。
5. 设置排序字段，例如 `categoryOrder`、`itemOrder` 或 `order`。
6. 运行下面的验证命令。
7. 发起 Pull Request。

## 本地验证

发 PR 前请运行：

```bash
pnpm test
pnpm check
pnpm build
```

这些命令分别用于：

- `pnpm test`：检查内容分离、国际化假设和关键内容记录。
- `pnpm check`：运行 Astro 诊断并校验 Content Collections schema。
- `pnpm build`：生成静态站点并确认所有路由能构建。

## GitHub PR 与 CI 流程

1. 从 `main` 创建或同步你的分支。
2. 编辑 `src/content/` 里的内容。
3. 运行本地验证。
4. 提交改动。
5. 推送分支。
6. 向 `main` 发起 Pull Request。
7. GitHub Actions 会运行和本地一致的 CI 检查。
8. 如果 CI 失败，在同一个分支继续修复。
9. 通过 review 并合并后，静态站点可以使用 `pnpm build` 生成的 `dist/` 输出部署。

CI 工作流位于 `.github/workflows/ci.yml`。

## 贡献规则

- 应该在 `src/content/` 编辑百科内容。
- 新增可翻译条目时，应同步添加三种语言文件。
- 同一个条目的三种语言必须保持相同的 `translationKey`。
- PR 前运行 `pnpm test`、`pnpm check`、`pnpm build`。
- 不要编辑 `dist/`、`.astro/`、`node_modules/`。
- 不要把内容硬编码进组件或页面。
- 不要添加占位文章正文。宁可留空，也不要填假内容。

## 文档

- [贡献指南](docs/contributing.md)
- [架构说明](docs/architecture.md)

## 技术栈

- Astro 静态输出
- pnpm 包管理器
- Astro Content Collections
- Tailwind CSS v4 through Vite
- Markdown 与 KaTeX 数学公式支持
