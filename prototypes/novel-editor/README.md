# Novel 编辑器本地原型

独立 React 工作台，用 Novel 1.0.2 / Tiptap 2.27.3、Tailwind 4、shadcn/ui 重建编辑界面。输入框和勾选控件接入站内 daisyUI 5.7.47 及共享 UI tokens；通用浮层继续使用 shadcn/Radix。不载入旧 `visualEditor.js` 或旧编辑器 CSS；文本选区、输入、撤销、表格、拖拽、斜杠菜单和气泡菜单由成熟编辑器处理。Wiki 业务内容使用 Tiptap 扩展适配，内容解析和阅读渲染继续复用现有 Wiki 模块。

## 启动

需要 Node.js 24 和 pnpm 11。从这个分支的仓库根目录运行：

```sh
pnpm install --frozen-lockfile
pnpm --dir prototypes/novel-editor install --frozen-lockfile
pnpm dev:novel
```

打开 <http://127.0.0.1:4371/>。独立依赖目录保持 Novel 的 Tiptap 2 与主站现有 Tiptap 3 探针分离。原型有自己的 TypeScript 检查，不加入 Astro 主站编译。

## 可操作范围

- 搜索并读取仓库中的中文、日文、英文词条，导入或导出 Markdown。新建时直接选择文章、虚拟艺人、人物、组合、音乐同位体、歌曲、唱片、演出、企划、组织或设定，并看到用途说明；支持简体中文、日文、英文，创建后直接填写标题。
- Novel 斜杠命令、选区气泡菜单、段落样式、列表、任务、链接、表格、图片、块拖拽及原生撤销。图片缩放复用 Moveable，绑定当前图片节点；尺寸、配文和内容描述可保存、重开、撤销。
- Wiki 注音与罗马字、剧透、缩写、按键、日期、中文变体、数学公式、折叠说明、平台媒体及媒体切换。
- 歌词支持逐字原文、振假名、罗马字、译文和递增时间戳；已有歌词 HTML 保留原格式。
- 元数据按基本资料、类型专属资料、关系与来源、展示与收录分组，提供中文用途说明、例子和必填提示。所属组织日期显示为加入 / 离开日期，可选日期、链接和词条关联清空时按原有 schema 保存。属性栏支持拖宽和键盘调整，窄屏使用全宽表单。
- 可搜索的词条关系、当前文档大纲、素材定位、正文查找、按可用宽度收纳的工具栏、可选源码视图、持久主题，以及窄屏抽屉导航。
- 特殊段落在原位置编辑，行内效果在属性区编辑；可移除特殊效果并保留文字。折叠内容转为普通段落时保留嵌套格式和表格。
- 块拖拽沿用 Novel / ProseMirror 的原生移动与撤销，用 Atlassian Pragmatic auto-scroll 处理写作区边缘连续滚动，不接管原生 drop。
- 自动保存到本地浏览器；刷新恢复最近词条、未应用的源码修改及未完成的特殊内容填写。草稿使用独立 `kamitsubaki-novel-local-prototype:v1:` 命名空间。
- 本机审核检查页复用现有词条 API，支持中文属性差异、阅读效果检查、服务端草稿版本保护、同一投稿更新、撤回、状态读取与假账号隔离。正文源码差异作为可选检查展开。中断时保存完整提交请求，用同一个提交编号恢复；每次写入前核对服务为本地模式。

选图、缩略图、进度、取消及重试复用 Uppy Dashboard，运输层直接共用本站 `galleryUploadQueue.mjs`。词条上传使用现有 `/api/editor/assets`，文章上传使用现有 `/api/articles/assets`，均为本地私有暂存；上传成功后完成编辑即可插入。图片内容描述、正文配文与来源分开填写；文章作者、来源名称与使用依据直接在图片旁填写，检查页沿用这些资料。词条大图继续复用站内 WebP 副本处理，原始文件保持不变。旧的本机图片 URL 和 JSON 附件调用继续兼容；粘贴与拖入沿用 Novel 的入口，使用同一个 Uppy 队列保存本机副本，投稿时再接入既有附件链路。

个人文章检查页复用现有文章 API，支持账号草稿、图片说明、提交审核、退回补充、撤回、创建修改稿和历史记录。账号草稿使用版本与正文指纹保护，连接中断后恢复同一次保存；恢复结果不会覆盖之后的新写作。新图片随草稿私有暂存，暂存后仍可补充来源；重复使用同一张图片沿用已有登记。审核通过后可在原位查看当前公开正文，使用真实公开副本及图片路径。上述审核与公开结果均限于本机测试数据库。

已有词条的 ID、语言和类型锁定。源码先通过解析和身份检查再应用；未应用源码时，预览和导出会等待用户应用修改。新增 Wiki 块插入在所选块之后，避免覆盖已有特殊内容。

## Markdown 契约

`src/lib/wiki-document.ts` 复用主站 `visualEditor.mjs` 中的内容解析和块序列化函数，不使用它的界面或编辑交互。每组导入内容保存原文和语义快照：未修改组保留原文，修改组由 Tiptap 序列化。无修改保存保持原文件字节，包括 YAML 注释、未知字段、BOM 和 CRLF。修改元数据保留未知键和值，但 YAML 排版可能规范化。

普通文本、列表、链接和 Markdown 表格是原生 Tiptap 节点。Wiki 短码是行内语义节点；媒体、折叠内容、歌词和公式是可编辑的领域节点。复杂 HTML 和未知片段保留原文，并通过阅读器安全渲染器展示。已有 HTML 表格会导入原生表格；完整源码视图仍作为可选维护工具。合并单元格等超出 Markdown 表格能力的结构保存为公开 HTML，移除编辑器内部节点载荷。

`/__novel/catalog` 和 `source` 只读本分支的 `src/content`。预览复用主站的 Markdown 渲染、HTML 安全策略、Wiki 链接解析和预览，以及阅读器歌词、剧透与媒体切换逻辑。资料卡与主站共用 `entityInfoModel.mjs` 和样式，支持组织名称、起止日期、制作名单、官方链接和配色；草稿自引用显示当前填写内容。预览用于检查保存内容，完整阅读页的导航、作品档案与图库布局仍由正式页面提供。编辑状态的媒体切换使用 shadcn Tabs。

上传仅写入原型的 `prototypes/novel-editor/.local/images/<SHA256>.<ext>`，限制 PNG/JPEG/WebP/GIF 和 10 MB，检查文件签名。Vite 本地接口继续通过 `/images/novel-prototype/<SHA256>.<ext>` 读取；旧原型图片在启动时校验 SHA256 后迁移，原地址保持有效。此目录被 Git 忽略，并与主站 `public` 和图库扫描隔离。迁移工作台时需要保留这些原图；导出的 Markdown 不会把本地图片发布到线上。

## 验证

```sh
pnpm --dir prototypes/novel-editor test
pnpm --dir prototypes/novel-editor build
pnpm --dir prototypes/novel-editor check:corpus --json /tmp/novel-corpus-check.json
```

针对性测试覆盖现有兼容性样本、特殊节点编辑、表格对齐和合并单元格、YAML、换行格式、原生撤销，以及真实花譜词条的三种语言。全集检查逐一导入仓库词条并比较无修改保存的完整字节；它不替代浏览器交互验证。Node 测试只对 Novel 可选组件导入的 CSS 使用空模块钩子，浏览器仍正常加载真实样式。

本地操作检查使用 Codex 内置浏览器，覆盖斜杠插入、选区加粗、注音编辑、歌词时间保存、表格增行/撤销、媒体切换、上传、源码应用、身份保护、导出及刷新恢复；桌面与手机布局分别检查。

## 原型边界

当前是进行中的本地原型，完整交互验收与网站入口迁移尚未完成。本机词条审核与个人文章投稿均已接入现有服务；正式认证、旧站内文章的维护者入口和主站编辑路由仍待迁移。旧站内文章保留原有维护者权限，不会直接复制成个人新投稿。原文冲突已接入本地检查：使用 node-diff3 合并不同位置的修改；重叠属性与正文用中文两栏选择，保留合并前备份与原生撤销。审核分支另有改动时先核对分支，再合并最新原文；提交继续校验原文、投稿版本和分支版本。比较在 Worker 中执行，超时或离开页面会停止任务。词条图片附件已接入本地审核：PNG/JPEG/WebP 与正文一起暂存，每份最多 8 张、合计 20 MiB，每张要求来源或授权说明；较大原图生成不超过 4 MiB 的 WebP 副本，原图保留。GIF 支持本地预览，投稿时明确提示改用支持的格式。提交后沿用已有图片附件，并保留本地原图记录用于恢复。私有暂存图片通过本机代理预览，不复制到公开内容目录。仓库词条不会被此原型直接覆盖，线上版本也未发布。Vite 本地接口仅在开发服务器中运行，`dist` 是构建检查产物，不能独立提供词条读取或预览服务。

本机审核服务在隔离的后端 worktree 启动，设置 `EDITOR_LOCAL_PORT=18879`、`EDITOR_LOCAL_ORIGIN=http://127.0.0.1:4371` 和 `EDITOR_SITE_DIR` 为当前前端 worktree 后运行 `node scripts/editor/local.mjs`。服务使用 SQLite 和 Alice / Bob 假账号，GitHub 提交由本地模拟器处理；不连接线上写入。Vite 只代理这一个本机地址。

主入口 JS 目前约 2.26 MB（gzip 717 KB），源码编辑器、投稿页与中文搜索转换按需分包，字体按字符范围加载。KaTeX 与 YAML 共用依赖，避免重复打包。链接预览与阅读器共用 Floating UI 定位，首次键盘聚焦、滚动和窗口变化均有对应处理。接入正式入口前仍需针对编辑路由做加载和体积优化。Novel 不提供完整应用样式；通用控件来自 shadcn 和站内 daisyUI 包装，工作台布局及 Wiki 内容样式集中在 `src/index.css`。

## 设计与来源

`design/workbench-concept.png` 是实现前生成的工作台概念参考，不作为网站内容素材。设计方向：黑灰背景、轻紫色操作强调、左侧当前写作导航、中间宽幅写作区、右侧文档与选择属性，中文衬线标题，正文依靠留白与分隔建立层级。

- [Novel](https://github.com/steven-tey/novel)：Apache-2.0；使用 npm 包及公开组合 API，不复制或维护内核分叉。
- [Tiptap](https://github.com/ueberdosis/tiptap)：MIT。
- [shadcn/ui](https://github.com/shadcn-ui/ui)：MIT；通用组件由 CLI 生成，按钮补齐 React 18 的 ref 转发，关闭控件本地化。
- [tiptap-markdown](https://github.com/aguingand/tiptap-markdown)：MIT。
- [CodeMirror](https://github.com/codemirror/dev)：MIT，用于 Markdown/YAML 源码编辑。
- [daisyUI](https://github.com/saadeghi/daisyui)：MIT，沿用本站限定作用域及控件 tokens。
- [node-diff3](https://github.com/bhousel/node-diff3)：MIT，使用经过本地测试的 3.1.2 完整发布包处理三方合并。
- [Pragmatic drag and drop](https://github.com/atlassian/pragmatic-drag-and-drop)：Apache-2.0，仅用于拖拽期间的写作区自动滚动。
- [Uppy](https://github.com/transloadit/uppy)：MIT，共用站内队列和 XHRUpload，使用 Dashboard 展示完整上传交互。
- [Moveable](https://github.com/daybrush/moveable)：MIT，直接绑定原生图片，处理比例缩放与控件定位。
- [react-textarea-autosize](https://github.com/Andarist/react-textarea-autosize)：MIT，标题随内容及窗口宽度自动换行伸缩，使用 8.5.9。

当前重构与验证状态见 [第一轮验证记录](../../qa/2026-10-13-novel-editor/README.md)。记录明确区分自动检查、浏览器实测和待验收项目。

### 延续现有界面的帮助与反馈规则

沿用已选写作工作台的字体、配色和布局。字段说明、保存/投稿区别、审核/上线阶段以及撤回/删除边界使用小问号，点击、触屏和键盘均能打开，Esc 关闭；必填标记与实际错误保持可见。弹层最大宽度 320px，距视口至少 16px，不推动正文。阅读辅助说明继续通过 aria-describedby 关联。

网站导航与账号并入桌面侧栏及手机文档菜单，不另加顶部导航条。操作反馈保留在固定账号状态行，后台重读不插入新的整行提示；保留正在处理状态和可重试错误。旧稿版本号明确标记为草稿保存版本，避免与审查轮次或公开版本混淆。
