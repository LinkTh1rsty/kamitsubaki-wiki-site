# 任务：歌词 ruby「原文居中于注音」修复（含注音防溢出）

> 本文件是面向实现模型的自洽实施 prompt。所有结论均已在本机实测验证，你（实现模型）无需追问、无需重新调研，严格按步骤执行即可。

## 0. 角色与硬约束

- 项目：`F:\kamitsubaki-wiki-site`，Astro 静态站，包管理器 **pnpm@11**（禁止 npm/yarn）。
- 禁止修改 `src/content/**` 内容文件；禁止改动构建管线、sanitize 白名单（`src/lib/htmlPolicy.mjs`）与可视化编辑器。
- 只允许改动/新建以下文件：
  1. `src/styles/global.css`（Phase 1）
  2. `src/styles/personalTools.css`（Phase 1）
  3. `src/scripts/rubyJustifyCenter.js`（Phase 2，新建）
  4. `src/scripts/siteInteractions.js`（Phase 2，仅新增一行 import 与一行初始化调用）
- 提交策略：Phase 1 单独一个 commit，Phase 2 单独一个 commit；commit message 用中文。

## 1. 需求（逐字确认，不得偏离）

让每个 ruby unit 的**原文（base text）位于其注音（rt）水平居中的位置**；为达成这一居中配对，允许破坏歌词原文原有的字距/节奏（即允许 ruby 盒撑宽、相邻 unit 的原文之间出现缝隙）。

**明确否决**：不得使用 `ruby-align: space-between` 或任何拉伸原文字符间距做两端对齐的方案（实测它会把多字原文的字符均布撑开，需求方已否决）。

## 2. 现状与实测证据

### 2.1 DOM 与 CSS 现状（已核实）

歌词以原始 HTML 写在 md 内容文件中，构建后结构不变：

```html
<div class="my-lyric-box">
  <div class="lyric-line">
    <div class="jp-lyric">
      <ruby>人生<rt class="furi">じんせい</rt><rt class="roma">jinsei</rt></ruby><ruby>は<rt class="roma">ha</rt></ruby>…
    </div>
    <div class="cn-lyric">人生就是一连串的冒险</div>
  </div>
</div>
```

- 每个 ruby unit = 原文 + 至多两个 `<rt>`（`rt.furi` 假名 / `rt.roma` 罗马音）；部分 unit 只有 `rt.roma`。
- 注音可见性由 `.my-lyric-box` 上的 class 控制（`src/scripts/siteInteractions.js` 约 602–604 行切换）：默认 `.roma{display:none}` 只显示 furi；`.show-romaji` 时反之；`.hide-ruby` 时全部隐藏。
- 现状 CSS：`src/styles/global.css:2481` `.my-lyric-box ruby { ruby-align: center; }`；`:2485` `.my-lyric-box rt { font-size: 0.6em; }`；`:2470` `.jp-lyric { letter-spacing: 0.03em; }`；`src/styles/personalTools.css:92` `.labs-practice-line ruby { ruby-align: center; }`。
- 逐字卡拉 OK 模式下 `SyncLyricsPlayer` 会把**整个** ruby 元素（不拆内部）包进 `.lrc-word` span。

### 2.2 问题机理（本机 Chrome 无头实测数据，探针复刻站点同款标记：20px 原文 / 0.6em 注音 / 0.03em 字距）

Chrome 的 `ruby-align: center` 对「注音比原文宽」的 unit 采用**悬垂（overhang）**模型：注音大致居中于原文，但超出部分**溢出 ruby 盒**侵入相邻空间，ruby 盒只部分撑宽且规则不一致：

| 用例 | 注音溢出 ruby 盒 | 中心偏移 |
|---|---|---|
| 楽/たの（假名模式） | 左 2.30px / 右 2.30px | 0 |
| 永遠/えいえん | 左 2.30px / 右 2.31px | +0.01 |
| 思/おも | 左 2.30px | −1.15 |
| 人生/じんせい | 右 2.16px | +1.08 |
| 楽/tano（罗马音模式） | 左 3.16px / 右 3.14px | −0.01 |

后果：歌词逐字注音密集，相邻 unit 的注音互相碰触甚至粘连；同时原文与注音的中心存在 ±1.2px 抖动——即用户看到的「原文与注音对不齐」。

### 2.3 已验证的修复算法

对每个 ruby unit：量出**可见注音层**相对 ruby 盒的左/右溢出量，给 ruby 元素加**等量 inline padding**（`padding-inline-start/end`），把注音完整容纳进盒内。溢出天然近似对称（center 语义），因此 padding 后原文恰好居中于注音。探针实测修复后全部用例：溢出 ≤0.02px，中心偏移 ≤0.01px（假名/罗马音两种显示模式均成立）。

## 3. Phase 1（必选，CSS）

### 3.1 `src/styles/global.css`

`.my-lyric-box ruby { ruby-align: center; }`（约 2481 行）改为：

```css
.my-lyric-box ruby {
  ruby-align: center;
  /* 阻止 Chrome 128+ 的可换行 ruby 启发式在长注音 unit 内部断行 */
  white-space: nowrap;
}
```

### 3.2 `src/styles/personalTools.css`

`.labs-practice-line ruby { ruby-align: center; }`（约 92 行）同样追加 `white-space: nowrap;`。

### 3.3 不要改动

- `src/styles/readerFormats.css:2` 的散文 ruby（正文散文保持 JIS 悬垂惯例，不在本次范围）。
- `.my-lyric-box rt { font-size: 0.6em }`、`.jp-lyric { letter-spacing: 0.03em }` 等其余声明。
- `src/styles/editorWorkbench.css`（编辑器内部预览）。

## 4. Phase 2（必选，JS 居中修正——本次核心）

### 4.1 挂载

- 新建 `src/scripts/rubyJustifyCenter.js`，导出 `initRubyJustifyCenter()`。
- `src/scripts/siteInteractions.js` 顶部加 `import { initRubyJustifyCenter } from './rubyJustifyCenter.js';`，并在其既有初始化流程末尾调用 `initRubyJustifyCenter()`。（该文件由 `src/layouts/BaseLayout.astro:179` 全站加载，无需新增 script 标签。）

### 4.2 算法（与 §2.3 实测代码一致）

作用域选择器：`'.my-lyric-box .jp-lyric ruby, .labs-practice-line ruby'`。

对每个匹配到的 ruby：

1. 先清除本模块此前写入的 inline padding（`ruby.style.paddingInlineStart/End = ''`），保证幂等。
2. 取**可见** rt：`ruby.querySelectorAll('rt')` 中第一个 `getComputedStyle(t).display !== 'none'` 的元素；取不到（如 `hide-ruby` 模式或该 unit 无可见注音）→ 跳过。
3. 读取 `rubyRect = ruby.getBoundingClientRect()`、`rtRect = rt.getBoundingClientRect()`：
   - `padL = Math.max(0, rubyRect.left - rtRect.left)`
   - `padR = Math.max(0, rtRect.right - rubyRect.right)`
   - 两者均 < 0.5px（防抖阈值）→ 跳过；
   - 否则 `ruby.style.paddingInlineStart = padL.toFixed(2) + 'px'`、`ruby.style.paddingInlineEnd = padR.toFixed(2) + 'px'`。
4. 不要测量/改动 canvas 字体，不要包裹、移动、增删任何 DOM 节点——**只允许写这两个 inline style**。`SyncLyricsPlayer` 重新挂载 ruby 时 inline style 随节点保留，天然兼容。

### 4.3 重算时机（三者缺一不可）

- `document.fonts.ready.then(runAll)`（Web 字体落地后宽度才准确）；
- 对每个 `.my-lyric-box` 与每个 `.labs-practice` 容器挂 `MutationObserver`，配置 `{ attributes: true, attributeFilter: ['class'] }`——`hide-ruby` / `show-romaji` / 练习工具 hints 切换后必须全量重算（`hide-ruby` 下不得残留任何 padding）；
- `window.resize` 防抖 200ms 后全量重算。

每次 `runAll` 对所有目标 ruby 执行「先清后算」（§4.2 第 1 步已保证），不产生累积偏移。

### 4.4 明确禁止

- 禁止引入 `ruby-align: space-between` 或对原文/注音设置 `letter-spacing` 做拉伸；
- 禁止改 `htmlPolicy.mjs`、sanitize、构建脚本、内容文件；
- 禁止给该模块加配置开关/全局 class——算法自身按溢出量自适应，现代与旧浏览器均安全（无溢出即零写入）。

## 5. 验收标准（逐条核验后才算完成）

构建与回归：

- [ ] `pnpm build` 成功；`pnpm test`（`node --test tests/*.test.mjs`）全绿；`pnpm check` 无新增错误。

几何（Chrome 最新版，任一含歌词歌曲页，如 `/zh/songs/yunosuke/originals/音速wo超ete/`）：

- [ ] 随机抽 10 个「注音宽于原文」的 ruby unit：可见 rt 不超出 ruby 盒（`rt.left - ruby.left ≥ -0.5` 且 `rt.right - ruby.right ≤ 0.5`）；rt 与 ruby 盒的水平中心偏移 |offset| ≤ 1.5px。
- [ ] 「切换罗马音」「隐藏注音」「启用逐字歌词」任意组合切换后上述条件仍成立；卡拉 OK 渐变高亮（`.lrc-word` 的 `background-clip: text`）显示正常；`hide-ruby` 状态下所有 ruby 无残留 inline padding。
- [ ] 歌词练习页（`.labs-practice-line`）切换 hints（假名/罗马音/无）后同样满足居中与防溢出。
- [ ] 360px 视口：`.jp-lyric` 无横向滚动；任何 ruby 内部无断行（长罗马音 unit 完整）。

回归：

- [ ] 正文散文 ruby（`readerFormats.css` 管辖）渲染与改动前一致。

推荐抽查样例（覆盖全部典型）：`人生/じんせい/jinsei`（注音略宽）、`楽/たの/tano`（单字原文）、`思/おも/omo`（非对称溢出）、`永遠/えいえん/eien`（双字原文宽注音）、`は/ha`（仅罗马音注音）。

## 6. 回滚

- Phase 1：`git revert` 对应 commit（两处 CSS 声明块）。
- Phase 2：`git revert` 对应 commit（删除新模块与 import/调用行）。
- 全程无内容文件与构建产物变更，回滚零残留。
