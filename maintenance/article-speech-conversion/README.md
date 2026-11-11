# 访谈格式转换工具与资料

`original/` 保留转换前文章数据，`converted/` 保存转换后的 Markdown 与 JSON，`manifest.json` 记录对应关系。这些内容资料继续保留。

```sh
node scripts/convert-existing-interviews.mjs
node scripts/preview-converted-interviews.mjs
```

预览脚本需要已构建的 dist，仅监听本机地址。图片缓存位于忽略提交的 `.workspace-runtime/article-speech-media/`；缺失缓存时头像使用占位。

发言块使用方法、格式模板和供作者复制的转换提示词见 [编辑说明](../../docs/editor/speech-blocks.md)。
