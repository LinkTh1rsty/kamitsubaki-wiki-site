> 历史参考：本文不再定义开发维护流程；当前规范见仓库 maintenance/README.md。

# 脑暴方案 02：制作人与曲风流派透视维度 (Creator & Genre Perspective)

> **归档位置**：`docs/brainstorming/02-creator-and-genre-perspective.md`  
> **议题性质**：音乐资料库 / 交叉检索 / 创作者生态  

---

## 1. 核心背景与痛点
神椿拥有一大批极具个人色彩的王牌制作人与 P 主，且粉丝群体中有相当大比例属于“制作人死忠”或“特定曲风爱好者”：
- 很多人因为 **カンザキイオリ（神崎一织）** 的词曲而关注花谱；
- 很多人迷恋 **大沼パセリ** 制作的涩系 Urban R&B 和 Neo-Soul（为理芽、星界、EMA 等多人供曲）；
- 很多人喜欢 **雄之助** 的 Future Bass 电子舞曲与精密律动；
- 还有 **Guiano** 的自白抒情 EDM、**MIMI** 的极速钢琴流行。

如果音乐库仅支持“按台前歌手查专辑”，会导致这些重量级幕后产出被完全割裂。

---

## 2. 功能构想：多维穿透索引 (Multi-Perspective Catalog)

在 `DISCOGRAPHY` 音乐资料库中，设立三大等权穿透维度：

```text
┌────────────────────────────────────────────────────────────────────────┐
│  [按演唱者浏览 / By Artist]  [按制作人透视 / By Creator]  [按曲风流派 / By Genre] │
└────────────────────────────────────────────────────────────────────────┘
```

### 维度 A：按制作人透视 (Creator Matrix)
点进任一制作人（例如“大沼パセリ”），不仅展示其个人发布的专辑，系统聚合其**跨艺人供曲全景画卷**：
- 供曲对象：理芽（如《ユーエンミー》）、星界（如《エメラルド》）、EMA（DUSTCELL）、VALIS；
- 参与形态统计：作曲 / 作词 / 编曲 / 混音；
- 制作人生涯时间线：直观展示其为神椿不同艺人供曲的年份演进。

### 维度 B：按风格流派标签 (Genre Tags)
为 2000+ 首曲目打上专业、克制的曲风标签：
- `#文学摇滚 / 存在主义`（カンザキイオリ体系）
- `#Urban R&B / Neo-Soul`（大沼パセリ体系）
- `#Future Bass / Cyber-Electronic`（雄之助体系）
- `#Poetic EDM / Piano Ballad`（Guiano 体系）
- `#Speed Piano Pop`（MIMI 体系）
- `#Gothic Dark Pop`（香椎モイミ体系）
- `#Hard Hip-Hop / Spoken Flow`（春猿火自由律体系）

---

## 3. 技术落地思考
- 在 `songs` 集合的 Schema 中强化 `composer`、`arranger`、`lyricist` 字段为 slug 数组；
- 在构建静态索引时，自动反向聚合生成 `creator-works-map.json`；
- 前端支持即时无刷新筛选，观测者可一键收听/查看“某制作人在神椿留下的全部音乐足迹”。
