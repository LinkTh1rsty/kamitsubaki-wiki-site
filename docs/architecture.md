# 架构说明

[English](architecture.en.md) / [中文](architecture.md) / [日本語](architecture.ja.md)

这是一个静态 Astro Wiki，使用 URL 级国际化，并把内容和实现分离。

## 运行形态

```text
/      -> 重定向到 /zh/
/zh/   -> 中文站点
/ja/   -> 日文站点
/en/   -> 英文站点
```

生产构建输出静态 HTML、CSS 和浏览器 JavaScript，运行时不需要后端。

## 内容流

```text
src/content/**/*.json or .md
  -> src/content.config.ts 校验 schema
  -> Astro Content Collections 加载记录
  -> src/lib/homeData.mjs 本地化、分组、排序
  -> src/lib/metadata.mjs 生成页面元数据
  -> src/pages/[locale]/index.astro 渲染首页
  -> src/pages/[locale]/artists/[...id].astro 渲染条目页
  -> src/components/*.astro 渲染 UI
```

实现文件应通过 props 接收内容。不要在组件或页面里硬编码大段公开内容数组。

## 主要目录

```text
src/content.config.ts   Content Collections schema
src/content/            可编辑百科内容
src/lib/                数据整理、i18n、metadata 工具
src/pages/              静态路由
src/components/         展示组件
src/layouts/            共享 HTML 布局
src/styles/global.css   Tailwind 入口和全局视觉系统
src/scripts/            浏览器交互
tests/                  Node 测试
```

## Content Collections

- `site`：站点外壳和页面标签，来源为 JSON。
- `artists`：艺人、创作者、组合、音乐同位体的 Markdown 条目。
- `projects`：企划 Markdown 记录。
- `logs`：时间线 JSON 记录。

schema 位于 `src/content.config.ts`，由 `pnpm check` 校验。

首页 DATABASE 的艺人分类从 `src/content/artists/<category>/<entry>/<locale>.md` 的第一层文件夹自动推导。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder` 和 `code` 只是可选展示覆盖。

## 元数据

页面元数据由 `src/lib/metadata.mjs` 生成。内容文件可以用可选 `seo` frontmatter 覆盖；未填写时，系统会自动扫描 Markdown 第一段作为描述，并使用 `image` 生成分享卡片。

`BaseLayout.astro` 输出 description、canonical、Open Graph、Twitter card 和 robots。部署时设置 `PUBLIC_SITE_URL` 可以生成绝对 canonical URL。

## 阅读器 UI

艺人详情页保持稳定的 Wiki 阅读布局：

- 紧凑导航栏。
- 带语言切换和编辑入口的文章头。
- 有标题时显示目录。
- 有正文时显示 Markdown 文章。
- 右侧/下方信息面板。

空正文是有效状态，不渲染占位文本。

## 样式与资源

Tailwind CSS v4 通过 `@tailwindcss/vite` 编译。不要添加运行时 Tailwind CDN。

全局样式位于 `src/styles/global.css`，包括字体、颜色、响应式阅读排版、信息面板、目录、预加载、光标、reveal、noise 和列表动效。

## 验证

CI 和本地开发使用同一套命令：

```bash
pnpm test
pnpm check
pnpm build
```

GitHub Actions 工作流位于 `.github/workflows/ci.yml`。
