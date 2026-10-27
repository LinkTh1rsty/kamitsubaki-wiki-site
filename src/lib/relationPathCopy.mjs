import { resolveLocaleCopy } from './i18n.mjs';
import { entityLabel } from './entityLabels.mjs';
import { authorableRelations } from './entityContract.mjs';

export function relationPathCopy(locale) {
  const copy = resolveLocaleCopy({
    zh: { title: '两条线索之间', intro: '选两个词条，寻找它们在现有档案中的最短连接。',
      from: '起点', to: '终点', placeholder: '输入名称或词条 ID', find: '寻找连接', swap: '交换起终点',
      chronicle: '包含时间轴事件', hint: '可输入完整名称，或从建议中选择。重名时请选择带 ID 的结果。',
      invalid: '请为起点和终点选择明确的词条。', noPath: '当前档案中还没有找到连接。',
      noPathNote: '可尝试包含时间轴事件，或从词条页补充有来源的关联。',
      found: '找到最短连接 · {count} 步', same: '起点与终点是同一个词条。',
      evidence: '查看关联依据', explore: '以此为中心探索', fromHere: '作为起点', toHere: '作为终点',
      note: '每一步均来自已记录的关联。箭头保留原始关系方向；最短连接不代表关系强弱。',
      timeline: '时间轴关联', unknown: '关联', reverse: '反向查看', ready: '选择起终点后查看连接。',
      compare: '比较连接路径', compared: '找到 {count} 条连接路径', route: '路径 {index} · {count} 步',
      highlight: '在图中查看', limited: '展示至多三条较短且不重复经过节点的路径；可能还有其他连接。',
      filterNote: '路径使用当前类型、关系和时间轴条件。按具体关系区分路径，不衡量关系强弱。',
      filtered: '起终点不符合当前类型或时间轴条件，请调整条件后重试。' },
    en: { title: 'Between two discoveries', intro: 'Choose two entries to find their shortest connection in the archive.',
      from: 'From', to: 'To', placeholder: 'Enter a name or entry ID', find: 'Find a connection', swap: 'Swap endpoints',
      chronicle: 'Include chronicle events', hint: 'Enter a full name or choose a suggestion. Use the ID to distinguish matching names.',
      invalid: 'Choose an unambiguous entry for both endpoints.', noPath: 'No connection is recorded in the current archive.',
      noPathNote: 'Try including chronicle events, or add a sourced connection from an entry page.',
      found: 'Shortest connection · {count} steps', same: 'Both endpoints are the same entry.',
      evidence: 'View connection evidence', explore: 'Explore from here', fromHere: 'Use as start', toHere: 'Use as destination',
      note: 'Each step follows a recorded connection. Arrows retain the original direction; distance does not measure relationship strength.',
      timeline: 'Chronicle connection', unknown: 'Connection', reverse: 'Viewed in reverse', ready: 'Choose two entries to find a connection.',
      compare: 'Compare connection paths', compared: '{count} connection paths found', route: 'Path {index} · {count} steps',
      highlight: 'Show on graph', limited: 'Showing up to three shorter routes without repeated nodes. Other connections may exist.',
      filterNote: 'Paths use the current type, relation and chronicle filters. Different recorded relations distinguish paths; distance does not measure strength.',
      filtered: 'An endpoint is excluded by the type or chronicle filters. Adjust the filters and try again.' },
    ja: { title: '二つの手がかりをつなぐ', intro: '二つの記事を選び、記録された関連を最短の経路でたどります。',
      from: '出発点', to: '到着点', placeholder: '名前または記事 ID', find: 'つながりを探す', swap: '出発点と到着点を交換',
      chronicle: '年代記の出来事を含める', hint: '正式名を入力するか候補を選んでください。同名の記事は ID で区別します。',
      invalid: '出発点と到着点に記事を選んでください。', noPath: '現在の記録にはつながる経路がありません。',
      noPathNote: '年代記の出来事を含めるか、記事に出典のある関連を追記できます。',
      found: '最短の経路 · {count} ステップ', same: '出発点と到着点は同じ記事です。',
      evidence: '関連の根拠を確認', explore: 'ここから探索', fromHere: '出発点にする', toHere: '到着点にする',
      note: '各ステップは記録された関連に基づきます。矢印は元の方向を示し、距離は関係の強さを表しません。',
      timeline: '年代記との関連', unknown: '関連', reverse: '逆方向にたどる', ready: '二つの記事を選ぶと経路を表示します。',
      compare: '経路を比較', compared: '{count} 件の経路', route: '経路 {index} · {count} ステップ',
      highlight: 'グラフで表示', limited: '同じノードを繰り返さない短い経路を最大三件表示します。他の経路もあり得ます。',
      filterNote: '経路は種類・関連・年代記の条件を使用します。記録された関係で経路を区別し、距離を関係の強さとは扱いません。',
      filtered: '出発点または到着点が種類・年代記の条件の対象外です。条件を変更してください。' },
  }, locale);
  const types = [...Object.keys(authorableRelations), ...Object.values(authorableRelations),
    'performed-by', 'credited-to', 'includes-track', 'performed-track', 'headlined-by', 'guest-performer',
    'discusses', 'primaryArtist', 'label', 'parentOrg', 'organizer', 'belongToUniverse'];
  copy.relationLabels = Object.fromEntries(types.map(type => [type, entityLabel(type, locale)]));
  copy.relationLabels['chronicle-footprint'] = copy.timeline;
  copy.historical = entityLabel('historical', locale);
  copy.roleLabels = Object.fromEntries(['lead-vocal', 'guest-vocal', 'composer', 'lyricist', 'arranger',
    'illustrator', 'producer', 'mixer', 'visual-director', 'vocalist'].map(role => [role, entityLabel(role, locale)]));
  return copy;
}
