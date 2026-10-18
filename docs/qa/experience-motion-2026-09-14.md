> 历史参考：本文不再定义开发维护流程；当前规范见仓库 maintenance/README.md。

# 本地体验与动效检查（2026-09-14）

范围：`codex/wiki-editor-pr`，本地预览 `http://localhost:4358`。此记录不是线上验收。

## 代码审查发现与修改

| 区域 | 发现 | 本次处理 |
| --- | --- | --- |
| 贡献中心 | 标签切换直接替换正文，和 LABs 动效不一致 | 复用轻量切换动画，保留同一 DOM、URL 和浏览器历史 |
| 贡献中心 | 窄屏导航从两行缩为一行可能改变正文位置 | 保留展开时的导航占位高度 |
| 贡献中心 | 紧凑导航中，键盘选择的标签可能在可视范围外 | 仅滚动标签条使选中项可见，不滚动整个页面；保留鼠标可拖动的细滚动条 |
| 编辑器 | 模式与预览标签只有瞬时选中样式 | 加入随选中项移动的下划线，响应标签宽度与容器尺寸变化 |
| 编辑器 | 侧栏、模式、预览内容突然切换 | 仅在实际切换时淡入；不移动输入正文，不重建内容或草稿 |
| 编辑器 | 弹窗、菜单的打开反馈不一致 | 统一短时淡入、5px 位移及遮罩淡入；保留原有焦点与关闭逻辑 |
| 阅读器 | 长目录滚动条对比过重 | 改为细滚动条，预留滚动条空间 |
| 首页与工具栏 | 按下反馈不统一 | 增加不改变按钮尺寸的内描边和背景反馈，沿用现有圆角 |
| LABs | 面板切换位移和其他区域不同 | 复用同一动效函数，保留原有筛选器、初始化、路由与历史逻辑 |
| 全站基础变量 | 初查漏看 public/ui-tokens.css，误认为变量缺失；实为分散定义和覆盖问题 | 保留原有圆角，在 public/ui-tokens.css 接入统一动效参数 |
| 搜索 | 已有关闭动画和焦点恢复 | 保留原实现，未重复叠加动画 |

## 苹果风格动效参数

这是本项目对柔和减速与轻微回弹的实现，并非声称复刻 Apple 私有参数。

- 即时反馈：160ms。
- 标签、章节与内容切换：280ms，`cubic-bezier(.22,1,.36,1)`。
- 菜单、弹窗与浮层：360ms，`cubic-bezier(.2,.85,.25,1.06)`。
- 玻璃导航变形：480ms，连续减速曲线。
- 关闭过程：180ms，快速收束；保留现有焦点恢复时序。

## 动效规则

- 动效只解释状态变化；不对每次输入、保存或全文重排添加动画。
- `src/lib/uiMotion.mjs` 提供 `revealPanel` 和 `enhanceTabRail`，新页面优先复用。
- 同一区域快速切换时取消旧动画；完成后清理监听。
- 支持系统“减少动态效果”，运行期间切换该偏好也会取消面板动画。
- 折叠高度动画属于渐进增强：不支持相关 CSS 的浏览器仍使用原生开关。
- 不增加动画依赖，不更改上传、GitHub、账户接口。

## 本轮验证

- 类型检查：0 错误、0 警告、19 条既有提示。
- 全套测试：346 通过、0 失败（含 4 项新的动效行为测试）。
- 已生成页面结构核对：简中、英文、日文贡献中心以及艺人、项目阅读器的目录锚点全部存在，没有重复 ID。
- 完整生产构建：9,324 页成功，耗时 5 分 35 秒（`/tmp/experience-build.log`）；该构建开始于最终曲线和圆角变量微调之前。最新微调另通过类型检查和 346 项测试，未重复完整构建。
- 浏览器视觉 QA：未完成。首次打开本地页面被自动审批拒绝，原因为审批模型容量不足。没有通过其他浏览器或自动化方式绕过。

## 仍需实际页面验收

- 桌面与窄屏：首页菜单、按钮、工具栏、玻璃导航的展开/收缩。
- 编辑器：已有草稿的模式/侧栏切换，输入法、弹窗焦点、标签滑块尺寸。
- 阅读器：长目录内部滚动、移动目录展开及底部限位。
- LABs：切换、返回/前进、筛选状态保留。
- 简中、英文、日文和深浅主题；减少动态效果模式。

所有新增效果暂留本地，未提交上线。


## 返工：仅改变动作，不增加玻璃材质

用户明确要求的是运动风格。新增 `navigationMotion.css` / `.js`：

- 原生跨文档过渡，同源页面推进与历史返回方向相反；不拦截链接或绕过离开页面提醒。
- 支持该功能时去掉遮挡页面过渡的旧 preloader，首次首页开场保留；不支持时继续原导航。
- 按钮按下缩至 94%，松开弹性恢复；导航卡片采用较小缩放。
- 菜单按其锚点展开，点击同一入口时收拢关闭；外部点击关闭保留现有行为。
- 贡献者详情从卡片所在横向位置展开，收拢时先完成动画再隐藏；减少动态效果时即时关闭。
- 不改变玻璃材质、透明度、颜色、背景或文字字体。
- 返工类型检查零错误；全套测试 349 通过。浏览器视觉验收仍被审批模型容量错误阻挡。

## Collaborator drawer, provider icons and floating-panel blur

- Replaced stacked scale/grid animations with an interruptible measured-height disclosure. Text is no longer stretched; stale close completions cannot hide a reopened panel.
- Added local inline GitHub and Google SVG icons to login buttons.
- Added background blur to navigation/tools menus and login backdrop; reduced the existing search overlay dimming. Reading surfaces remain opaque. Reduced-transparency/forced-color preferences disable blur.
- Local Chrome accessibility check confirmed collaborator expansion and revealed its full details. Screenshot verification was rejected by automatic approval review because the approval model was at capacity; visual acceptance of the new blur/icons remains pending.
- 350 unit tests passed, including interrupted close/reopen regression. No production deployment in this iteration.
