# 条目分类、团体和观测形态维护

一个实体只有一个稳定 ID、一份各语言正文和一个主地址。分类入口、团体关系、形态分组分别描述“在哪里找到”“属于谁”“怎样关联展示”，不要复制 Markdown 来表达多个分类。

## 主归档与多分类入口

```yaml
classification:
  primary: solo
  additional:
    - creators
    - staff
```

`primary` 是主导航分类 ID，决定规范 URL；新人物填写它也决定源文件目录。示例文件为 `src/content/people/solo/<id>/zh.md`，地址为 `/zh/database/artists/solo/<id>/`。

`additional` 为分类地图节点 ID 列表，增加入口，所有入口指向同一实体地址。已有条目可只填写 additional；没有新字段时，继续使用原分类地图与归档规则。主动修改 primary / group 时，须迁移文件并维护旧 URL 重定向，不能把改入口当成改主归档。

各语言的 classification 必须一致，正文与显示名各自翻译。校验会阻止分类漂移。

分类路径、标签、默认实体类型来自 `src/data/navigation-categories.json`；分类树和人工顺序来自 `src/data/classification-map.json`。新增通用分类只修改配置，不向组件添加实体 ID 判断。`discover` 仅用于原本自动收录的目录（当前曲目库）；人物不会仅凭 vocalist 标签破坏已批准名单，新人物明确填写 primary 后进入目录。

## 团体自动识别

创建 `entityType: unit` 的团体条目，填写稳定 ID、名字、角色和活动状态。目录自动创建 `group-<团体ID>` 分支。已有地图中的分组、标题和排序优先保留。

成员声明真实关系：

```yaml
relations:
  - type: member-of
    target: new-unit
classification:
  primary: groups
  group: new-unit
  additional:
    - creators
```

示例唯一源文件为 `src/content/people/groups/new-unit/members/<id>/zh.md`，唯一地址为 `/zh/database/artists/groups/new-unit/members/<id>/`。group 必须同时有对应 member-of 关系，并指向 unit 实体。

多团体成员写多条 member-of，每个团体分支会自动收录。主归档只选一个；也可以继续使用 solo，省略 group。新增或结束成员关系不会自行改变旧 URL。历史成员可保留起止日期，目录仍保留该档案。不要把谱系、配音来源或同公司所属写成 member-of。

## 多种观测形态

沿用原设计文档的数据模型：

```yaml
presentation:
  image: /images/example.webp
  morphing:
    group: example-family
    slot: virtual-artist
    order: 1
    # label: 特殊形态名  # 可选，当前语言的显示名
relations:
  - type: persona-related
    target: example-other-form
```

同谱系的独立条目使用相同 group，各自保留 ID、正文、图片与分类。组件自动聚合，按 order 排序，未填写时排后，同序按稳定 ID 排序。原有 group / slot / order 格式兼容，不需要批量修改正文。

分组只负责 UI 聚合，不自动推断真实身份。persona-related、based-on-voice、fictional-counterpart 等关系仍须准确声明。

通用形态标签来自 `src/data/morph-slots.json`（中文、英文、日文），编辑器同步读取选项；单个条目的特殊名称填写 label，未知 slot 会显示原值。

## 可复用选择器

```astro
<MorphingSwitcher entries={registry.morphs(entry.data.id, locale)}
  current={entry.data.id} locale={locale}/>
```

阅读器在组内有两个以上条目时显示组件。图片＋名字保留，底层使用 SelectionGroup。鼠标指向或键盘聚焦时指示块跟随目标，离开后回到当前档案；aria-current 始终代表真实所在页。链接支持键盘、另开标签和浏览器返回，减少动态效果设置关闭动画。

其他链接组可使用 `SelectionGroup as="nav" data-selection-preview`，链接设置 aria-current，无需另写定位脚本。

## 编辑与校验

编辑器的“分类与归档”可添加 primary / additional / group；“图片与呈现 → 观测形态分组”可补充 group / slot / label / order。导出再导入保留这些字段。

```sh
pnpm validate:content
node scripts/v3/sync-editor-schema.mjs --check
```

校验涵盖未知分类、主分类类型不兼容、主团体缺少成员关系、团体目标不存在、附加节点不存在、多语言分类不一致。前台字段与目录规则以本仓库来源为准；涉及服务端变更时由维护者按私有流程处理。

前台使用新字段前，应核对页面、编辑器和公开数据的一致性。真实投稿、审核和公开仍须按实际账号流程验收；服务端更新由维护者私有流程处理。
