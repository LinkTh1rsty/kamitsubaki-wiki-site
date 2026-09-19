# KAMITSUBAKI Wiki Site

[图片上传、路径与文件分类](docs/files-and-images.md) · [Wiki](https://kamitsubaki.wiki/zh/contribute/files/)

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
src/content/albums/     专辑条目与结构化曲目表 (.md)
src/content/songs/      歌曲条目 (.md)
src/content/projects/   企划卡片与企划条目 (.md)
src/content/logs/       时间线/更新记录 (.md)
src/content/contribute/ GitHub 编辑教程页文案 (.md)
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
categoryTitle: "虚拟世代的魔女们"
categorySubtitle: "VIRTUAL WITCH PHENOMENON"
categoryOrder: 1
itemOrder: 1
statusLabel: "STATUS"
status: "ACTIVE"
image: "https://placehold.co/1200x800/111/333?text=KAF"
seo:
  title: "花谱 - KAMITSUBAKI WIKI"
  description: "用于搜索结果和分享卡片的自定义描述。"
  image: "https://example.com/share-card.jpg"
  keywords:
    - "花谱"
    - "KAF"
---
```

正文写在第二个 `---` 之后。正文可以留空，所以可以先补结构化信息，之后再完善文章内容。

Markdown 支持标题、列表、表格、链接、代码块，以及通过 KaTeX 渲染的 LaTeX 公式。

## 首页展示与文件夹结构

首页 DATABASE 会自动扫描 `src/content/artists/` 的第一层文件夹作为分类。

```text
src/content/artists/vwp/kaf/zh.md
                    ^^^ 首页分类
```

新增分类时，只需要新建第一层文件夹并放入实际完成的语言条目。`categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder` 和 `code` 都是可选覆盖字段；不填写时，站点会从文件夹名、条目名和排序规则自动生成展示。

## 元数据与分享卡片

每个条目的 `seo` 字段都是可选的。没有填写时，站点会自动扫描：

- `name`、`romanizedName`、分类和状态用于标题与兜底描述。
- Markdown 正文的第一段用于页面 `description`。
- `image` 用于 Open Graph 和 Twitter 分享卡片。

需要精确控制搜索结果或社交平台预览时，再填写 `seo.title`、`seo.description`、`seo.image`、`seo.keywords` 或 `seo.noindex`。

部署时可以设置环境变量 `PUBLIC_SITE_URL`，例如 `https://example.com`。设置后，canonical URL 和站内图片地址会自动转成绝对地址。

## 新增条目

1. 在 `src/content/artists/`、`src/content/albums/`、`src/content/songs/` 或 `src/content/projects/` 下选择正确分类。
2. 为条目创建一个文件夹，例如 `src/content/artists/vwp/new-artist/`。
3. 添加已完成的 `zh.md`、`ja.md` 或 `en.md`；后续补充其余翻译。
4. 各语言文件使用相同的 `translationKey`。
5. 艺人分类会从文件夹自动生成；需要自定义显示时再设置 `categoryTitle`、`categorySubtitle`、`categoryOrder`、`itemOrder` 或 `code`。
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

### Cloudflare Pages 构建

Pages 的构建命令使用 `pnpm build`，输出目录使用 `dist`。在项目的
**Settings → Build → Build cache** 中启用构建缓存；Astro 的可恢复目录是
`node_modules/.astro`，缩略图缓存也存放在该目录内。参见
[Cloudflare 构建缓存说明](https://developers.cloudflare.com/pages/configuration/build-caching/)。

歌曲、专辑和艺人详情页通过 `src/lib/contentCollections.ts` 共享本次静态构建的内容集合，
避免每生成一页都重新深拷贝全站条目。调用方应只读这些集合；开发模式不缓存读取结果，
因此编辑内容后仍能即时更新。

仓库也提供 `.github/workflows/deploy-cloudflare-pages.yml`，可在 GitHub Actions 完成构建后
上传至 Pages。使用此方式需配置 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`，
并核对工作流中的 Pages 项目名。工作流的超时设置只作用于 GitHub Actions，不能延长
[Pages 自带构建的 20 分钟上限](https://developers.cloudflare.com/pages/platform/limits/)。

## 统一 AI 入口

Wiki 内的小组件和独立 `KAMITSUBAKI AI 观测终端` 使用同一个 AI v2 控制平面。这个公开仓库只保留 Astro 小组件、流式显示和三语文案；Worker/Gateway/AstrBot 负责登录、Agent、检索、历史、记忆、模型与防滥用。小组件默认打开第六个 Agent `observer`，完整角色大厅位于 `https://chat.kamitsubaki.wiki/<locale>/`。

前端通过环境变量连接后端：

本地联调：

```bash
PUBLIC_AI_OBSERVER_API_BASE=http://127.0.0.1:8787 pnpm dev --host 127.0.0.1
```

生产部署时，在静态站点环境变量中设置：

```env
PUBLIC_SITE_URL=https://kamitsubaki.wiki
PUBLIC_AI_OBSERVER_API_BASE=https://api.kamitsubaki.wiki
```

浏览器只调用统一后端 `/api/ai/v2/*`。当前小组件使用 bootstrap、chat 和 Observer 会话管理接口；不要在这个前端仓库中提交后端源码、模型密钥、数据库配置或服务端规则。完整交互与联调说明见[统一 AI 小组件](docs/ai-terminal.md)。

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

## 内容许可

本站有权许可的原创文字默认采用 CC BY-NC-SA 4.0。图片、封面、歌词、音视频、角色设计、Logo、商标和其他第三方素材不在默认文字许可范围内；采用其他协议的第三方文字继续遵循其原协议，并保留来源署名和修改说明。

条目可通过 `license` frontmatter 标记 `CC-BY-NC-SA-4.0`、`CC-BY-NC-SA-3.0-CN`、`rights-reserved` 或 `authorized-use`。具体字段、示例和 review 规则见[内容授权与来源标注](docs/licensing.md)。站点程序代码不随百科文字采用 CC 协议。

## 文档

- [贡献指南](docs/contributing.md)
- [架构说明](docs/architecture.md)
- [可复用阅读器组件](docs/reader-component.md)
- [统一 AI 小组件](docs/ai-terminal.md)
- [内容授权与来源标注](docs/licensing.md)
- [外部链接品牌卡片](docs/external-links.md)

## 技术栈

- Astro 静态输出
- pnpm 包管理器
- Astro Content Collections
- Tailwind CSS v4 through Vite
- Markdown 与 KaTeX 数学公式支持
