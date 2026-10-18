> 历史参考：本文不再定义开发维护流程；当前规范见仓库 maintenance/README.md。

# 界面图标

界面功能图标统一使用 Lucide（ISC），品牌标志使用 Simple Icons（CC0）。站点 Logo、装饰插画、人物关系图和内容图片保留原素材。图标随应用打包或构建到本地文件，不依赖运行时 CDN。

## 使用方式

- Astro：从 `src/components/Icon.astro` 引入组件，例如 `<Icon name="arrow-up-right" />`。
- 动态 DOM：从 `src/lib/icons.mjs` 引入 `createIcon`；可信界面模板可用 `iconMarkup`。
- 翻译文字中已有前后缀箭头的场合，可用 `IconLabel.astro` 或 `setIconLabel`。尺寸中的乘号、键盘提示等有文字含义的字符仍保持文字。
- 品牌：使用 `PlatformIcon`、`ProviderIcon` 或 `ContactIcon`。

图标本身为装饰元素，纯图标按钮必须由按钮提供 `aria-label`。线宽固定为 2，图标使用 `currentColor`，一般大小为 18px；操作按钮使用 20px。请不要手写 SVG 路径、用字符代替功能图标，或复制网上的路径到组件。

## 添加及校验

在 `src/lib/icons.mjs` 中显式导入所需 Lucide 图标并注册名称；只选择实际需要的图标。

`pnpm icons:generate` 更新 CSS/独立游戏/后台使用的本地图标资源及品牌数据。许可证位于 `public/icons/LICENSE-lucide.txt`。后台图标样式也由同一脚本同步生成。

`pnpm check:ui-icons` 检查未知图标名、手写 SVG 和字符图标回流；`node --test tests/site-icons.test.mjs` 校验安全转义和动态标签更新。
