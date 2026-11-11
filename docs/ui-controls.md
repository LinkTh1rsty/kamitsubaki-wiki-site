# 共用按钮与表单控件

这些 Astro 封装采用 daisyUI 5 的样式，保留原生 HTML 元素和网站主题。新增页面优先使用它们；字段标签、说明、错误信息和业务脚本仍由页面负责。

```astro
---
import WorkspaceButton from '../components/WorkspaceButton.astro';
import WorkspaceControl from '../components/WorkspaceControl.astro';
---
<form>
  <label for="title">标题</label>
  <WorkspaceControl id="title" name="title" required maxlength="200" />
  <label>类型
    <WorkspaceControl as="select" name="type">
      <option value="">全部</option>
      <option value="song">歌曲</option>
    </WorkspaceControl>
  </label>
  <label>摘要
    <WorkspaceControl as="textarea" name="summary" rows={4}>默认内容</WorkspaceControl>
  </label>
  <label><WorkspaceControl type="checkbox" name="details" />显示更多信息</label>
  <WorkspaceButton type="submit" tone="primary">提交</WorkspaceButton>
  <WorkspaceButton type="reset" tone="quiet">重置</WorkspaceButton>
</form>
```

## 行为约定

- `WorkspaceButton` 支持 `primary`、`secondary`（默认）、`quiet`。`href` 会生成链接；按钮默认 `type="button"`，表单提交和 `method="dialog"` 关闭动作应明确写 `type="submit"`。
- 禁用链接去掉 `href`，保留 `aria-disabled="true"` 和 `tabindex="-1"`；禁用按钮保留原生 `disabled`。原有 `data-*`、`aria-*`、`form` 等属性直接传给元素。
- `WorkspaceControl` 默认生成 `<input>`，通过 `as="select"` / `as="textarea"` 生成原生选择框和多行文本框。`rows` / `cols` 使用数字表达式，例如 `rows={4}`。
- 保留原生 `name`、`value`、`checked`、`required`、`pattern`、`maxlength`、`autocomplete`、`list` 与键盘行为；不插入额外 DOM 容器、不增加客户端初始化脚本。
- 错误状态使用 `aria-invalid="true"`，并通过 `aria-describedby` 关联页面中的错误说明。
- `file`、`hidden`、`radio`、`range` 沿用原生或专用控件；富文本正文、代码编辑器、命令面板、实体卡片和导航项使用各自的实现。

## 样式约定

- daisyUI 使用 `dui-` 前缀，关闭内置主题。每个共用控件自身带有 `data-ui-kit`，可在 WorkspaceShell 内外独立使用。
- `src/styles/uiKit.css` 是网站样式适配层，负责主题变量、按钮层级、焦点、禁用状态和移动字号。不要在每个页面重新定义控件的完整基础样式。
- 保留工作台和编辑器的桌面密度；手机宽度下，输入和选择框使用 16px 字号，普通按钮和文本控件至少 44px 高。多行文本框保留 `rows` 和纵向缩放。
- 工作台工具栏和投稿面板的旧基础规则仅适用于未迁移的原生控件；布局、分组、选中状态和动态内容继续沿用现有 CSS。
- 五种语言的控件文字仍从页面的原有词典取得。

开发时可在 `/zh/ui-preview/` 查看原有控件、daisyUI 原始控件和共用封装的状态。该页面不生成生产路由。

## 活动日历与后台共用

官方活动与社群活动共用 `CalendarMonth.astro`、`CalendarNavigation.astro` 和 `src/lib/calendarMonth.js`。数据适配器负责各自的日程与时区；月份网格只接受日期范围，不推断举办时区或默认结束时长。

社群筛选通过浏览器 Popover 顶层显示，复用 `editorPopover.mjs` 的 Floating UI 定位。原生选择框和时区提示使用系统指针，避免自定义鼠标被原生选择器遮挡。

后端管理表单与前端申请表使用同一编辑器源码，管理控件 CSS 从项目固定的 daisyUI 版本与 `uiKit.css` 编译生成，不在后端重写基础样式。修改共享控件或活动布局后，在前端仓库运行以下命令，并提交两仓库的对应结果：

```sh
node scripts/build-community-ui-kit.mjs --backend /path/to/isolated/backend
node scripts/build-community-ui-kit.mjs --backend /path/to/isolated/backend --check
```

路径必须显式指定，以免覆盖其他会话的后台工作树。

后台共用壳层也使用这份编译结果。`adminWorkspace.js` 适配服务器生成和动态创建的控件，保留已有表单、路由和账号权限。桌面按工作类别展示导航；手机导航使用原生 `dialog` 顶层，支持 Esc、焦点返回及内部滚动。页面内其他弹窗应通过自己的 `data-*` 标识查询，避免把导航弹窗当成内容弹窗。

企划表单允许保存不完整草稿；提交前校验通过字段错误与可聚焦摘要展示。管理员的私有草稿、审核阅读视图和当前公开版本分别维护，切换时确认未提交输入，发布后重新读取当前版本。
