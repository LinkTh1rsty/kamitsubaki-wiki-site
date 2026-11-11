# 外部链接品牌卡片

艺人和专辑资料卡、艺人正文的“外部链接”段落共用同一套平台识别与视觉样式。品牌 SVG 来自 `simple-icons`，在构建阶段或站点脚本中内联，不依赖运行时 CDN。

## 内容写法

资料卡使用 frontmatter 的 `officialLinks`：

```yaml
officialLinks:
  - label: "YouTube"
    href: "https://www.youtube.com/@example"
```

艺人正文使用二级标题和普通 Markdown 无序列表。标题必须是 `外部链接`、`外部連結`、`外部リンク` 或 `External Links`：

```md
## 外部链接

- [YouTube](https://www.youtube.com/@example)
- [X (Twitter)](https://x.com/example)
```

没有 JavaScript 时，这仍然是可读、可点击的普通列表。JavaScript 可用时，`siteInteractions.js` 会只在艺人正文中把该列表增强为响应式品牌卡片；资料卡由 Astro 直接输出完整卡片。

## 平台识别

`src/lib/externalPlatforms.mjs` 是唯一的平台注册表。识别顺序是：

1. 精确域名或子域名；
2. KAMITSUBAKI 官方域名；
3. 链接标题文本；
4. 通用网站兜底。

当前覆盖 Bilibili、YouTube、X/Twitter、TikTok、Instagram、微博、Niconico、Spotify、Apple Music、网易云音乐、pixiv、piapro、Steam、Wikipedia 和 KAMITSUBAKI 官方站点。`b23.tv`、`youtu.be`、`nico.ms` 等短链接也会识别。

## 扩展新平台

1. 从 `simple-icons` 导入官方图标对象。
2. 在 `platformDefinitions` 增加 `id`、显示名、品牌色、图标、域名和标题匹配规则。
3. 在 `tests/external-platforms.test.mjs` 增加域名和标题测试。
4. 运行 `pnpm check && pnpm test && pnpm build`。

不要在内容文件中复制 SVG，也不要用远程图片地址作为品牌图标。动效必须保留键盘焦点状态，并遵守 `prefers-reduced-motion`。

