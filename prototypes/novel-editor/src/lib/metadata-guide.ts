import {workbenchText as t} from './workbench-copy';
import { metadataOptions, metadataLabel } from '../../../../src/lib/editorMetadata.mjs';

const commonLabels: Record<string, string> = { id: '永久标识', schemaVersion: '数据版本', locale: '语言', entityType: '词条类型', name: '名称', title: '标题', romanizedName: '罗马字名称', romanizedTitle: '罗马字标题', summary: '简介', aliases: '别名', tags: '标签', sources: '资料来源', relations: '关联词条', affiliations: '所属组织', officialLinks: '官方链接', roles: '身份', lifecycle: '活动信息', presentation: '展示设置', classification: '收录分类', seo: '搜索设置', tracks: '曲目列表', performers: '演唱者', credits: '制作名单', voiceEngines: '声库引擎', dateRange: '演出日期', venue: '场地', author: '作者', publishDate: '发布日期', relatedEntities: '相关词条', articleCategory: '文章分类', url: '链接地址', href: '链接地址', target: '关联词条', entity: '参与人物', releaseDate: '发行日期', releaseType: '发行形式' };
export function metadataDisplayLabel(path: string): string {
  const name = path.split('.').filter(key => !/^\d+$/.test(key)).at(-1) || path;
  const label = metadataGuide(path).label || commonLabels[name] || metadataLabel(name, 'zh');
  return label === name && /^[a-zA-Z]/.test(name) ? '兼容属性（' + name + '）' : label;
}

// Group existing fields without changing their schema or silently creating values.
const basic = ['romanizedName', 'romanizedTitle', 'aliases'];
const relations = ['relations', 'affiliations', 'relatedEntities', 'officialLinks', 'sources', 'lyricsSources', 'featuredEntries'];
const display = ['presentation', 'classification', 'seo', 'license', 'contentStatus', 'theme', 'categoryOrder', 'itemOrder', 'categorySubtitle', 'code', 'inactive'];
const handled = ['schemaVersion', 'name', 'title', 'locale', 'entityType', 'summary', 'tags', 'id', 'generated', 'generatedFrom', 'generatedFromHash', 'researchImport'];
export function metadataSections(meta: Record<string, any>) {
  const supported = metadataOptions(meta.artistId ? 'songs' : 'artists', meta) as string[];
  const all = [...new Set([...Object.keys(meta), ...supported])].filter(key => !handled.includes(key));
  const belongs = (keys: string[]) => keys.filter(key => all.includes(key));
  return {
    basic: belongs(basic),
    domain: all.filter(key => ![...basic, ...relations, ...display].includes(key) && supported.includes(key)),
    relations: belongs(relations),
    display: belongs(display),
    other: Object.keys(meta).filter(key => ![...handled, ...basic, ...relations, ...display, ...supported].includes(key)),
  };
}
type Guide = { description: string; placeholder?: string; label?: string };
const guides: Record<string, Guide> = {
  id: { description: '跨语言共用的永久标识，用于词条链接。只用小写英文、数字和短横线；已有词条不能在此改 ID。', placeholder: '例如 kaf 或 a-new-song' },
  romanizedName: { description: '名称下方的罗马字写法，也用于搜索；日文艺人可填官方英文名。', placeholder: '例如 KAF' },
  romanizedTitle: { description: '标题的罗马字或官方英文写法，显示在标题附近并用于搜索。', placeholder: '例如 Mahou' },
  aliases: { description: '帮助读者用旧名、简称或其他写法找到词条，每项只填一个名称。', placeholder: '例如 かふ' },
  releaseDate: { description: '作品首次公开发行的日期。支持年、年月或完整日期，按已确认的精度填写。', placeholder: '例如 2026-10-13' },
  duration: { description: '阅读页的信息栏会显示作品时长。', placeholder: '例如 03:42' },
  releaseType: { description: '决定阅读页和作品列表中的发行形式，如专辑、单曲。' },
  primaryArtist: { description: '选择这张唱片的主要艺人，阅读页会链接到艺人资料。', label: '主要艺人' },
  label: { description: '选择发行这张唱片的厂牌词条，阅读页可链接到厂牌资料。', label: '发行厂牌' },
  catalogNumber: { description: '实体唱片的官方品番；没有或未确认时留空。', placeholder: '例如 KTR-001', label: '唱片品番' },
  performers: { description: '歌曲的演唱者及职责，阅读页会显示对应艺人的链接。' },
  'performers.role': { label: '演唱职责', description: '填写在这首歌中的职责，而不是艺人的长期身份。' },
  credits: { description: '作词、作曲、编曲等制作名单。有词条时选站内人物，没有时填写署名。' },
  'credits.entity': { description: '有站内资料时选择人物；没有对应词条可以留空。', label: '制作人员词条（可选）' },
  'credits.name': { description: '官方制作名单上的署名。已选择人物时仍可补充不同的署名。', placeholder: '例如 カンザキイオリ', label: '署名' },
  'credits.role': { label: '制作职责', description: '官方制作名单中承担的职责。' },
  genres: { description: '曲风用于作品列表筛选，一项填写一种风格。', placeholder: '例如 文学摇滚', label: '曲风' },
  tracks: { description: '按唱片上的顺序列出曲目。选择站内歌曲可建立阅读链接，也可以只填写曲名。' },
  'tracks.title': { description: '唱片上印刷的曲目名称；没有站内歌曲时也可直接填写。', placeholder: '例如 魔法' },
  'tracks.number': { description: '当前碟片上的曲目序号。', placeholder: '例如 1' },
  'tracks.disc': { description: '多碟唱片的碟号，单碟填写 1。' },
  'tracks.artist': { description: '此曲的演唱者显示名称。', placeholder: '例如 花譜' },
  songId: { description: '关联已有歌曲，阅读页曲目列表可直接打开它。', label: '站内歌曲（可选）' },
  roles: { description: '在人物资料和列表中显示的长期身份，可添加多个。' },
  lifecycle: { description: '已确认的活动状态、起止日期及归档说明。未知信息可留空。' },
  'lifecycle.activity': { description: '在阅读页信息栏显示活动状态，不确定时选择“未确认”。' },
  affiliations: { description: '所属组合或厂牌及其有效时间。历史所属请取消“目前仍属该组织”。' },
  'affiliations.organization': { label: '所属组织 / 厂牌', description: '选择所属组织或厂牌的词条，阅读页会显示名称与资料链接。' },
  'affiliations.current': { label: '目前仍属该组织', description: '仍在这个组织活动时开启；历史所属请关闭，并填写离开日期。' },
  'affiliations.type': { label: '所属关系', description: '补充所属关系，例如签约艺人、成员或所属厂牌。未确认时留空。', placeholder: '例如 签约艺人' },
  'affiliations.startDate': { label: '加入日期', description: '正式加入或签约的日期。只知道年份时可以只填年份。', placeholder: '例如 2018-10-18' },
  'affiliations.endDate': { label: '离开日期', description: '正式离开或合约结束的日期。目前仍所属时留空。', placeholder: '例如 2026-10-13' },
  'affiliations.endReason': { label: '离开原因', description: '选择已公开确认的原因，未确认时可以不添加此项。' },
  relations: { description: '描述与其他词条的明确关系，如组合成员、声源、关联企划。' },
  'relations.type': { label: '关系类型', description: '选择两条词条之间的实际关系，读者会在关联资料中看到它。' },
  'relations.target': { description: '此关系指向的词条，例如所属的组合或相关企划。' },
  'relations.startDate': { label: '关系开始日期', description: '这项关系开始生效的日期，例如加入组合的日期。未确认时留空。', placeholder: '例如 2021-03-13' },
  'relations.endDate': { label: '关系结束日期', description: '这项关系停止生效的日期。关系仍存在时留空。', placeholder: '例如 2026-10-13' },
  'lifecycle.startedAt': { label: '开始活动日期', description: '艺人或组合开始公开活动的日期，阅读页资料栏会显示。', placeholder: '例如 2018-10-18' },
  'lifecycle.endedAt': { label: '结束活动日期', description: '正式结束活动的日期，仍活动或未确认时留空。', placeholder: '例如 2026-10-13' },
  'lifecycle.archive': { label: '归档说明', description: '记录永久停止更新或归档的情况，仍活动的词条通常无需设置。' },
  'lifecycle.archive.mode': { label: '归档方式', description: '没有永久归档声明时选择“不归档”。' },
  'lifecycle.archive.archiveDate': { label: '归档日期', description: '官方宣布或实际完成永久归档的日期。', placeholder: '例如 2026-10-13' },
  'lifecycle.archive.archiveNote': { label: '归档补充说明', description: '补充官方公布的归档背景或后续安排。', placeholder: '简要说明已确认的归档情况' },
  relatedEntities: { description: '文章涉及的人物、作品或企划，帮助读者继续查阅相关资料。' },
  sources: { description: '支持词条内容的参考资料。填写标题和原始链接，便于读者核对。' },
  'sources.title': { description: '原始公告、报道、书籍或访谈的标题。', placeholder: '例如 官方出道公告' },
  'sources.type': { description: '说明资料载体，优先选择官方来源。导入文件中的其他类型也会保留。' },
  'sources.publisher': { description: '发布资料的机构或媒体。', placeholder: '例如 神椿工作室', label: '发布方' },
  'sources.page': { description: '书籍或杂志的页码，网络来源可留空。', placeholder: '例如 24–26', label: '页码' },
  'sources.publishedAt': { description: '原始资料的发布日期。', placeholder: '例如 2026-10-13', label: '资料发布日期' },
  officialLinks: { description: '官网与官方账号入口，显示在阅读页资料栏。不要在这里填非官方转载。' },
  'officialLinks.label': { description: '链接在阅读页显示的名字。', placeholder: '例如 官方网站', label: '显示名称' },
  'officialLinks.platform': { description: '选择官方账号所在的平台。', label: '平台' },
  lyricsSources: { description: '歌词文本的出处与核对日期，方便后续编辑核验。' },
  'lyricsSources.label': { label: '歌词来源名称', description: '读者看到的来源名称，如官方歌词页或唱片歌词册。', placeholder: '例如 官方歌词页' },
  'lyricsSources.provider': { label: '歌词来源类型', description: '区分官方、出版方与歌词服务，便于核对出处。' },
  'lyricsSources.checkedAt': { label: '歌词核对日期', description: '你最后对照这份原始资料核验歌词的日期。', placeholder: '例如 2026-10-13' },
  media: { description: '作品的官方视频或音乐平台链接。正文中的媒体播放器需从“插入”添加。' },
  'media.platform': { description: '链接所在的音乐或视频平台。', label: '媒体平台' },
  'media.type': { description: '区分音乐视频、现场录像等内容。', label: '媒体类型' },
  'media.id': { label: '媒体编号（可选）', description: '平台给这段视频或音乐的编号。已经填写完整链接时通常无需再填。' },
  voiceEngines: { description: '声库使用的合成引擎及发行日期。', label: '声库引擎' },
  engine: { description: '声库使用的官方引擎名称。', placeholder: '例如 CeVIO AI', label: '合成引擎' },
  commercialLicense: { description: '声库商业使用规则的摘要及官方说明链接。', label: '商业使用许可' },
  'commercialLicense.summary': { label: '使用许可摘要', description: '简要说明已确认的商业使用规则，完整条款请填写官方链接。' },
  'voiceEngines.releaseDate': { label: '声库发行日期', description: '此引擎版本的声库公开发行日期。', placeholder: '例如 2021-07-07' },
  status: { description: '企划的当前进度，不确定时请先查证。', label: '企划状态' },
  subProjects: { description: '此企划下的子企划，可关联站内词条或填写名称。', label: '子企划' },
  orgType: { description: '说明组织的性质，如厂牌、母公司、创作工作室。', label: '组织类型' },
  parentOrg: { description: '存在上级机构时选择对应站内词条。', label: '上级机构' },
  eventType: { description: '在演出资料中区分专场、联合演出或其他活动。', label: '活动类型' },
  dateRange: { description: '活动实际举行的日期；单日活动只需开始日期。', label: '活动日期' },
  venue: { description: '演出地点和城市，线上活动可勾选“虚拟场地”。', label: '场地' },
  'venue.name': { label: '场地名称', description: '活动实际举办的场馆或线上平台名称。', placeholder: '例如 日本武道馆' },
  'dateRange.start': { label: '活动开始日期', description: '活动实际开始的日期。单日活动填写这一天即可。', placeholder: '例如 2026-10-13' },
  'dateRange.end': { label: '活动结束日期', description: '多日活动填写最后一天，单日活动可以留空。', placeholder: '例如 2026-10-15' },
  city: { description: '举办活动的城市。', placeholder: '例如 东京', label: '城市' },
  country: { description: '举办活动的国家或地区。', placeholder: '例如 日本', label: '国家或地区' },
  isVirtual: { description: '活动在虚拟或线上场地举行时启用。', label: '虚拟场地' },
  headliners: { description: '活动主要出演者，阅读页会关联艺人资料。' },
  guestPerformers: { description: '活动的客座或特别出演者。', label: '特别出演者' },
  organizer: { description: '活动主办机构的站内词条。', label: '主办方' },
  setlist: { description: '按实际演出顺序填写曲目。', label: '演出曲目' },
  loreCategory: { description: '区分术语、设定人物、地理与概念。', label: '设定分类' },
  belongToUniverse: { description: '这条设定所属的世界观词条。', label: '所属世界观' },
  articleCategory: { description: '文章在专栏中的分类。' },
  author: { description: '文章的作者显示名，请按实际署名填写。', placeholder: '例如 编辑部' },
  publishDate: { description: '文章的发布日期。保存本地草稿不会发布文章。', placeholder: '例如 2026-10-13' },
  presentation: { description: '阅读页封面、标记、配色与列表排序。' },
  'presentation.image': { description: '作为阅读页主图及列表封面。填写站内图片路径或 HTTPS 图片链接。', placeholder: '例如 /images/cover.webp', label: '主图 / 封面' },
  'presentation.badge': { label: '展示标记', description: '词条展示用的简短标记，没有需要时留空。', placeholder: '例如 官方企划' },
  'presentation.sortOrder': { label: '列表排序', description: '用于支持排序的列表；数字越小越靠前，通常保留默认值。' },
  classification: { description: '决定词条的导航归属。已有词条调整分类可能影响阅读地址，修改前请确认。' },
  'classification.primary': { description: '用于生成主要阅读地址。已有词条的改分类需要经过正常投稿审阅。' },
  'classification.additional': { description: '额外的导航入口，不改变词条的唯一身份。' },
  seo: { description: '搜索引擎和分享时使用的补充信息；留空沿用标题与简介。' },
  'seo.keywords': { label: '搜索关键词', description: '补充与词条紧密相关的名称、作品或术语；每项填写一个，不用重复堆砌。', placeholder: '例如 花譜' },
  'seo.titleOverride': { description: '搜索结果使用的标题；留空使用词条标题。', placeholder: '留空使用词条标题' },
  'seo.description': { description: '搜索结果摘要；留空使用词条简介。', placeholder: '留空使用词条简介' },
  'seo.image': { description: '分享链接的预览图片地址。', placeholder: 'https://…' },
  noindex: { description: '开启后建议搜索引擎不要收录此页面，通常保持关闭。' },
  license: { description: '说明资料或文章的授权及署名要求。只能填写已确认的授权。' },
  contentStatus: { description: '“待补充”表示资料仍不完整，不影响在本地继续填写。' },
  theme: { description: '词条的配色信息。阅读页会显示色板，其他颜色用于支持主题的展示。' },
  palette: { description: '色板中每项包含名称和十六进制颜色。' },
  'presentation.theme.name': { label: '配色名称', description: '这组词条配色的名称，方便后续维护。', placeholder: '例如 KAF Bloom' },
  'presentation.theme.palette.label': { label: '颜色名称', description: '色板中显示的颜色名称，便于读者理解。', placeholder: '例如 花譜粉' },
  'presentation.theme.palette.value': { label: '颜色值', description: '填写十六进制颜色，可用下方色块直观选择。', placeholder: '例如 #F29AC2' },
  'presentation.theme.accentColor': { label: '主题主色', description: '支持词条主题的界面使用此强调色。', placeholder: '例如 #F29AC2' },
  'presentation.theme.mutedColor': { label: '辅助色', description: '主题中的辅助颜色。', placeholder: '例如 #E63145' },
  'presentation.theme.surfaceColor': { label: '主题背景色', description: '支持词条主题的背景颜色。', placeholder: '例如 #111321' },
  'presentation.theme.highlightColor': { label: '高光色', description: '主题中较亮的点缀颜色。', placeholder: '例如 #FFF6FA' },
  'presentation.morphing': { label: '关联形态导航', description: '将同一角色的虚拟艺人、现实艺人或声库资料连接为可切换的形态导航。' },
  'presentation.morphing.group': { label: '形态分组标识', description: '同一组形态使用相同标识；不需要形态切换时不要添加。', placeholder: '例如 kaf-family' },
  'presentation.morphing.slot': { label: '形态类型', description: '说明当前词条在这组形态中属于哪一种身份。' },
  'presentation.morphing.label': { label: '形态显示名称', description: '在形态切换导航中显示的短名称。', placeholder: '例如 花譜' },
  'presentation.morphing.order': { label: '形态显示顺序', description: '形态切换导航中的排列顺序，数字越小越靠前。' },
  'classification.group': { label: '所属组合的导航标识', description: '仅在主要分类为组合成员时填写对应组合的词条标识，并在关系中添加“组合成员”。', placeholder: '例如 vwp' },
  'license.code': { label: '授权方式', description: '选择已确认的版权授权。没有开放授权时请勿自行指定创用 CC。' },
  'license.attribution': { label: '原作者署名', description: '原始内容的作者或权利人名称。' },
  'license.modifications': { label: '修改说明', description: '说明译文、节选、重新整理等相对于原文的修改。' },
  'license.note': { label: '授权补充说明', description: '补充已取得的授权范围或特别要求。' },
  editions: { description: '不同版本的名称、品番、载体与附赠品。', label: '发行版本' },
  'editions.id': { label: '版本标识', description: '区分同一作品的不同版本，使用小写英文、数字和短横线。', placeholder: '例如 limited-edition' },
  'editions.name': { label: '版本名称', description: '官方公布的版本名称。', placeholder: '例如 初回限定盘' },
  'editions.format': { label: '发行载体', description: '此版本的实体或数字载体。', placeholder: '例如 CD + Blu-ray' },
  'editions.bonusItems': { label: '附赠内容', description: '此版本包含的附赠品，一项填写一种。', placeholder: '例如 特典歌词册' },
  'subProjects.name': { label: '子企划名称', description: '没有站内词条时也可以直接填写官方名称。' },
  'subProjects.id': { label: '子企划标识（可选）', description: '已有资料中的标识可以保持原值；关联站内词条时优先使用“关联词条”。' },
  'subProjects.type': { label: '子企划类型', description: '简要说明子企划的形式，如游戏、动画、演出或展览。' },
  'sources.id': { label: '资料来源标识', description: '用于区分引用来源。原始文件已有标识时可保持原值。' },
  ruby: { label: '名称注音', description: '词条名称的官方读法。', placeholder: '例如 かふ' },
};
const dates = ['startedAt', 'endedAt', 'startDate', 'endDate', 'start', 'end', 'archiveDate', 'checkedAt'];
function rawMetadataGuide(path: string): Guide {
  const normalized = path.split('.').filter(key => !/^\d+$/.test(key)).join('.');
  const name = normalized.split('.').at(-1)!;
  if (guides[normalized]) return guides[normalized];
  if (dates.includes(name)) return { label: ({ startedAt: '开始活动日期', endedAt: '结束活动日期', startDate: '开始日期', endDate: '结束日期', start: '开始日期', end: '结束日期', archiveDate: '归档日期', checkedAt: '核对日期' } as Record<string, string>)[name], description: '按已确认的精度填写日期；未确认可留空。', placeholder: '例如 2026-10-13' };
  if (name === 'label' && normalized.includes('.')) return { label: '显示名称', description: '读者看到的短名称，请使用清晰易懂的文字。' };
  if (['url', 'href', 'sourceUrl'].includes(name)) return { description: '填写原始 HTTPS 链接，便于读者直接查阅。', placeholder: 'https://…' };
  if (['entity', 'organization', 'target'].includes(name)) return { description: '从词条库选择对应资料，让读者可以继续查阅。' };
  if (guides[name]) return guides[name];
  return { description: '导入文件中的兼容资料会保持原样。不确定用途时可保留原值。' };
}

export function metadataGuide(path: string): Guide {
  const guide = rawMetadataGuide(path);
  return { description: t(guide.description), label: t(guide.label), placeholder: t(guide.placeholder) };
}
