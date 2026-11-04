# Dashboard 设计验收

2026-10-24；用户选择第一方案「阅读索引」，并要求参考现有网站实现 Dashboard。执行主规范：[DESIGN.md](DESIGN.md)。这是本机隔离数据与合成 AI 的验收，不是生产验证或上线批准。

## 视觉事实与比较方法

- 选定原稿：[selected-reading-index.png](docs/design/dashboard/selected-reading-index.png)，1182×1330 像素。方案板包含桌面/手机总览与 AI，是视觉示意而非导出的 CSS 设计文件。
- 实际桌面：[总览](docs/design/dashboard/qa/desktop-overview.png)、[AI](docs/design/dashboard/qa/desktop-ai.png)，1440×1024 像素，对应1440×1024 CSS视口，devicePixelRatio=1。
- 实际手机：[总览](docs/design/dashboard/qa/mobile-overview.png)、[AI](docs/design/dashboard/qa/mobile-ai.png)，390×844 像素，对应390×844 CSS视口，devicePixelRatio=1。原始浏览器截图保留上下文，未重绘或拉伸。
- 同画面对照：[总览完整比较](docs/design/dashboard/qa/comparison-overview.png)、[AI完整比较](docs/design/dashboard/qa/comparison-ai.png)，分别将原稿和实图的完整面板按相同宽度等比例放置，保留各自高度，不把示意图拉成实际视口。
- 细节比较：[海报、元信息、主入口和AI工具栏](docs/design/dashboard/qa/comparison-controls.png)。完整图不足以检查小控件，另用这些区域放大检查字体、对齐、图标及署名。
- 原稿桌面总览取(88,149)–(829,708)，AI取(89,817)–(829,1279)；手机总览取(898,120)–(1150,838)，AI取(898,878)–(1150,1309)。桌面实图面板取(160,122)–(1280,902)，手机保留50px以上背景及原始844px视口的截图，比较图中只移除顶部背景。对照脚本位于工作区任务包 compare-dashboard.py。

## 检查结果与迭代历史

没有剩余需要修复的 P0/P1/P2 视觉问题。

1. **[P2，已修复] 手机英文将来源切换折成两行。**
   证据：[修复前](docs/design/dashboard/qa/mobile-en-before.png)。长来源名称与日历文字争夺宽度，破坏单一横排切换器。来源禁止折行，手机日历采用40px图标入口，保留完整aria-label和title。[修复后](docs/design/dashboard/qa/mobile-en.png)及[五语言几何记录](docs/design/dashboard/qa/locale-checks.json)显示两个来源按钮在同一纵坐标，无横向页面溢出。
2. **[P2，已修复] 账号入口移入设置后，登出隐藏当前焦点。**
   初次浏览器操作后焦点落到页面，Esc直接关闭外层。updateAuthState现在只在嵌入区可见且当前账号操作被隐藏时，将焦点交给新出现的登录/登出操作。实际合成身份退出后焦点为「登录 / 注册」，Esc关闭设置且Dashboard保持打开；补充状态转换回归测试。
3. **[P2，已修复] 桌面用户消息与输入列的右边界不一致。**
   Viewport与Composer统一到46rem。最终实测两者均为736px宽、左350px、右1086px；用户消息右边界1074px，差值为内部留白及滚动条。见最终[AI实图](docs/design/dashboard/qa/desktop-ai.png)。
4. **[已修复的细节] AI工具栏图标与文字曾被旧grid样式排成上下两行；助手浅底色被旧透明背景覆盖。**
   工具按钮显式横排；浅底色放在现有assistant-ui消息容器，避免覆盖全站历史样式。见[工具栏放大对照](docs/design/dashboard/qa/comparison-controls.png)。

## 五个视觉维度

- **字体与排版：**标题沿用 Noto Serif SC Variable，桌面标题30px；正文和控件沿用 Montserrat Variable / Noto Sans SC Variable。标题22/20px、日期14px、正文14–15px，符合站内阅读器尺度。长中文标题、英日文及两种繁体均自然换行；来源保持横排。原稿中的生成字形不复制。
- **空间与节奏：**桌面活动/公告约2:1，主海报与信息并排，第二活动为紧凑记录；手机按标题/日期/地点、完整图、主入口、次活动及公告排列。四区桌面统一1120×780，手机统一约386–390×793.36（390×844视口；原生滚动条可能占4px），不随内容或加载变化。[桌面测量](docs/design/dashboard/qa/measurements.json)、[手机测量](docs/design/dashboard/qa/mobile-measurements.json)。
- **主题与颜色：**浅色实际纸面rgb(252,251,248)、正文rgb(51,56,50)、辅助#70766d，深色使用既有阅读器变量。[深色实图](docs/design/dashboard/qa/desktop-dark.png)。未增加蓝色品牌强调、装饰渐变、统计卡片或嵌套AI外壳。
- **图片质量：**使用仓库原始V.W.P Fate封面，非生成稿重画版本；原比例、底部Fate和V.W.P署名完整。正方形区统一contain，另实际验证720×1080、1280×720、360×3000、3000×360、坏图和无图。[比例记录](docs/design/dashboard/qa/ratio-checks.json)，[竖图](docs/design/dashboard/qa/ratio-portrait.png)、[超长图](docs/design/dashboard/qa/ratio-tall.png)、[超宽图](docs/design/dashboard/qa/ratio-panorama.png)、[坏图](docs/design/dashboard/qa/ratio-missing.png)。合成SVG仅用于边界验收，不替代产品素材。
- **文案与内容：**产品名为现有「观测面板」，使用真实公告记录与原接口字段，不复制方案板虚构公告日期/活动/缩略图。元信息保留原时区语义，日期待定只是一行辅助文字。AI测试明确标注「本机合成」，不声称模型真实回答或报名成功。

图标全部复用现有Lucide/Icon组件，工具栏为新对话、历史对话、设置；不复制生成稿的头像与附加图案。焦点轮廓、40–44px操作区、原生dialog背景隔离、Esc分层及来源方向键保持有效。

## 交互、状态及相关路径

- 实际打开总览、官方、公告、AI、工具，切区及关闭/重新打开；手机[滚动后的总览](docs/design/dashboard/qa/mobile-overview-scrolled.png)确认标题和页签固定、后续公告可访问。
- [冷加载](docs/design/dashboard/qa/desktop-cold-loading.png)来自本机活动接口真实四秒延迟；使用同形Skeleton，没有加载文字行。[缓存刷新](docs/design/dashboard/qa/desktop-cached-refresh.png)保持卡片与图片，状态文字为空。使用未缓存英文请求得到真实合成503，[局部错误](docs/design/dashboard/qa/desktop-error.png)保留公告和切换器，点击重试恢复两条活动。
- AI实际完成合成SSE、切区继续、停止、历史选择后返回、草稿跨区域/关闭保留；账号退出清除旧身份消息。模型运行时仍为原assistant-ui单实例，首次选择AI才加载。
- 企划详情从卡片进入，完整海报放大及Esc返回正常：[手机详情海报](docs/design/dashboard/qa/mobile-detail-poster.png)。账号与图库工具导航实际进入Wiki域名的对应页面；图库为隔离空列表，没有生产R2数据。
- 五语言、明暗实际浏览；重要提醒/每日/存储失败/动画中断/软键盘视口处理由现有行为测试覆盖。未把浏览器视口测试声称为真机软键盘验证。
- 最后浏览器控制台desktop/mobile的error和warn均为空：[console.json](docs/design/dashboard/qa/console.json)。故意注入的503、坏图及匿名合成401仅用于故障场景，不作为生产可用性结论。

## 有意适配与限制

原稿中的四个示意外壳高度不同，手机总览也超出目标视口；实现遵守已确认的四区同高、94dvh及内部滚动规则。保留现有阅读器字体尺度与字重，不将示意板的生成文字放大当作新的字号标准。日历在来源同行且手机为图标；主详情保持整卡唯一链接，避免嵌套链接。AI保留真实欢迎消息和原消息语义，使用站内中性色与现有发送图标，原稿的蓝色气泡/虚构头像不作为新品牌资产。

真实模型、OAuth/Turnstile供应商、外站报名结果、生产缓存及真机键盘没有在本次隔离环境验证。无main合并或生产发布。

## 检查清单

- [x] 原稿与实际同画面对照，完整视图和细节均检查
- [x] 桌面1440×1024、手机390×844、五语言、明暗及全部区域
- [x] 完整海报、所有比例、长标题、坏图与无图
- [x] 实际冷加载、缓存、503与重试
- [x] AI草稿、串流、停止、历史、账号状态及焦点分层
- [x] 相关行为回归和类型检查；完整构建最终日志由任务交付记录固定

final result: passed


## 活动中心第一方案验收（2026-10-25）

主规范：[DESIGN.md](DESIGN.md)。用户明确选择第一方案后实施；先前活动中心视觉版本已被替代。本节不改变上文 Dashboard 验收结论。

- 原稿：[第一方案](docs/design/activity-center/selected-option-1.png)。原始1536×1024方案板，标签中的视口尺寸是设计目标，不是各面板实际像素尺寸。
- 实际页面：[桌面1440×1024](docs/design/activity-center/desktop.png)、[手机390×844](docs/design/activity-center/mobile.png)、[手机筛选](docs/design/activity-center/mobile-filters.png)。截图来自实际浏览器内同源固定尺寸 iframe，无截图重绘或拉伸。
- [原稿与实图同画面对照](docs/design/activity-center/comparison.png)按比例缩放完整画面。保留阅读字体、细线、双栏企划、月历/当日详情及手机图片左置；未机械复制示意图的错误日期格、海报裁切或未定日期的导出按钮。复用当前主线页头、登录状态和原活动文本。
- [桌面详情](docs/design/activity-center/detail-desktop.png)、[手机详情](docs/design/activity-center/detail-mobile.png)使用真实上海ONLY原海报，正文与资料栏按阅读器规则排列，原图放大/关闭已验证。
- [作者回执](docs/design/activity-center/author-receipt.png)、[管理排期](docs/design/activity-center/admin-schedule.png)使用本机合成申请；通过审核与投放时间分开显示。下架活动显示下架，不再误报生效。

已修正：移动端控件堆叠、重复详情入口、主参与链接在面板卡片的嵌套位置、搜索图标遮挡、加载时默认日期过早锁定、单日“全天”误导、后台状态矛盾与作者起止日期缺少标签。真实浏览器复验默认日期为4月4日，日历周次正确；筛选展开、未来30天、恢复月历及Esc关闭可用。

视觉自检结果：passed（本机1440/390视口；最终审美验收仍交用户）。未验证生产登录、生产投放或通知送达。上海ONLY原介绍与海报的会场信息不一致，未擅自改动生产内容；原稿仅作为布局参考，不补造活动事实。

补充证据：[首页活动索引](docs/design/activity-center/home-index.png)、[搜索空状态](docs/design/activity-center/empty-search.png)。9720页构建与9936项链接检查通过；全站文件数超默认部署上限，详见任务HANDOFF，不属于视觉验收通过的含义。

用户复核纠正（2026-10-25）：此前“passed”漏掉月份文字与原生选择器图标重叠，不能作为无视觉缺陷证明。已为原生月份输入保留164px宽度、独立图标宽度及文字间距；重新检查1440/390截图，并操作4月→5月→4月。局部实图见 docs/design/activity-center/month-control-fixed.png。本次CSS修正晚于上一轮构建。

发布前复核：此前24697文件的结论来自打包尚未结束的中间产物；完整构建结束后为18319，未超过20000。已撤销“文件数阻断发布”的判断。此次发现并修复英文手机来源标签换行（短标签+完整aria-label）及失败状态当日栏误报无活动；320中文、390英文、768日文、1440中文及深色已实际查看。新增错误/缓存截图均为本机注入，不代表生产故障。
