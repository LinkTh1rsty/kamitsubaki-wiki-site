# 可复用阅读器

长文本页面统一使用 `src/components/Reader.astro`。不要在页面重复写桌面目录、移动目录或章节滚动脚本。

## 最小用法

先用现有 Markdown 渲染器获取 `html` 和 `headings`，把正文放进默认插槽：

```astro
---
import Reader from '../components/Reader.astro';
import BaseLayout from '../layouts/BaseLayout.astro';
import {renderMarkdownDocument} from '../lib/markdown.mjs';
const {html, headings} = await renderMarkdownDocument(markdown);
---
<BaseLayout reading lang="zh" title="文章标题">
  <main class="reader-frame mx-auto px-4">
    <h1>文章标题</h1>
    <Reader headings={headings} contentsTitle="目录">
      <Fragment set:html={html} />
    </Reader>
  </main>
</BaseLayout>
```

示例中的相对 import 路径需要按页面所在目录调整。`BaseLayout reading` 启用网站既有阅读字体、纸张背景和阅读增强功能。HTML 必须来自本站渲染管线；不要把用户原始 HTML 直接传给 `set:html`。

## 三种布局

- `essay`（默认）：连续长文，适合项目介绍、日志、公告和文档。组件生成正文 `<article>`。
- `entry`：正文搭配资料卡，适合艺人、歌曲、专辑。默认插槽由页面组织，可包含正文 `<article>`、歌词工具和曲目表；`sidebar` 插槽放资料卡。
- `guide`：紧凑指南，适合说明书章节。组件生成正文 `<article>`；桌面显示固定目录，窄屏默认收起目录，读者可按需展开长目录。

```astro
<Reader variant="entry" headings={headings} contentsTitle={labels.contents} hasContent={hasMainContent}>
  <article class="wiki-reader wiki-prose prose prose-invert max-w-none">
    <Fragment set:html={html} />
  </article>
  <TrackList tracks={tracks} />
  <Fragment slot="sidebar">
    <InfoBox data={entry.data} />
    <ContributorRoster />
  </Fragment>
</Reader>
```

## 参数与插槽

| 参数 | 默认值 | 用途 |
| --- | --- | --- |
| `headings` | `[]` | 渲染器生成的 `{depth, slug, text}[]`；目录显示二、三级标题 |
| `contentsTitle` | `Contents` | 页面提供本地化的“目录”文字 |
| `variant` | `essay` | `essay`、`entry` 或 `guide` |
| `hasContent` | `true` | 无正文时关闭正文与目录，保留资料卡及空态 |
| `class` | 无 | 外层额外样式 |
| `proseClass` | 无 | `essay` / `guide` 正文额外样式 |
| 默认插槽 | 无 | 正文；`entry` 可组合其他正文工具 |
| `sidebar` 插槽 | 无 | 可选资料卡，桌面限高吸顶 |
| `empty` 插槽 | 无 | `hasContent={false}` 时显示的空态 |

## 内置行为和约束

组件复用 `TableOfContents.astro` 与 `readingNavigation.mjs`：章节滑块动画、滚动跟随、锚点历史、键盘焦点、减少动态效果偏好、窄屏目录折叠、目录限高与内部滚动。限位不越过阅读区域底部。

标题的 `slug` 必须与正文 `id` 一致。多个文档同时存在时，每份文档的 ID 必须唯一（贡献中心使用文档名前缀）。隐藏文档不参与跟踪，各阅读器单独更新高亮。切换隐藏面板后可派发 `document.dispatchEvent(new Event('wiki:toc-refresh'))`；尺寸变化和目录展开会自动重算。

带有额外吸顶工具栏时，可在阅读器祖先设置 `--reader-sticky-top`（像素值），供 `guide` 布局目录限位使用；现有贡献中心根据工具栏实际高度更新。普通长文无须配置。

已有接入：艺人、歌曲、专辑、项目、日志、贡献中心。页面继续负责标题、面包屑、数据加载、许可信息与页脚，阅读器只负责正文阅读区域。

## 动效复用

文档或面板切换使用 `src/lib/uiMotion.mjs` 的 `revealPanel(element, {direction})`。不传方向时只做透明度变化，适合编辑器；传入 `1` / `-1` 时沿切换方向移动 6px，适合导航面板。它会取消重复动画并尊重减少动态效果偏好。不要在输入、保存、数据刷新时反复调用。样式入口为 `src/styles/experienceMotion.css`。


`backgroundImage` accepts an existing entry cover. The optional decorative layer stays fixed behind the page, blurs the artwork and adds theme-aware reading masks. Artists, songs and albums pass their existing cover; pages without an image keep the plain background. It is hidden for reduced-transparency and forced-color preferences.
