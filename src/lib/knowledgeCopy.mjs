import { resolveLocaleCopy } from './i18n.mjs';
import {archiveCompletionCopy} from './archiveCompletionCopy.mjs';
import { entityLabel } from './entityLabels.mjs';
import { entityTypes } from './entityContract.mjs';

export function knowledgeCopy(locale) {
  const copy = resolveLocaleCopy({
    zh: { title: '资料完善看板', intro: '找到一处空白，为下一位观测者补上一条线索。', home: '参与共建',
      total: '已检查词条', needsWork: '可补充词条', gaps: '待补资料项', average: '平均元数据覆盖率',
      note: '按结构化字段的填写情况统计。补充资料时请核对来源；翻译缺项不计入元数据分数。',
      search: '搜索名称、别名或 ID', type: '词条类型', field: '待补字段', all: '全部', order: '排序',
      sorts: { missing: '缺项多的优先', score: '覆盖率低的优先', title: '按名称' },
      fieldTitle: '从一种资料开始', fieldNote: '选择你擅长补充的字段，查看需要帮助的词条。',
      results: '{shown} / {total} 条词条', empty: '没有符合条件的待补资料。可以清除筛选继续查找。',
      reset: '清除筛选', more: '再显示 24 条', open: '查看词条', edit: '补充资料',
      score: '元数据 {score} / 100', sourceLocale: '当前资料语言',
      download: '查看缺失资料索引', fallback: '启用 JavaScript 后可搜索、筛选和继续加载；下方词条仍可直接打开。',
      fields: { summary: '简介', sources: '资料来源', 'presentation.image': '图片', roles: '身份与职能',
        'lifecycle.startedAt': '开始活动日期', officialLinks: '官方链接', performers: '演唱者', credits: '制作名单',
        releaseDate: '发行日期', lyricsSources: '歌词来源', tracks: '收录曲目', primaryArtist: '主要艺人',
        'dateRange.start': '活动日期', 'venue.name': '场地', headliners: '主要出演者', setlist: '演出曲目', translation: '当前语言译文' } },
    en: { title: 'Archive contribution board', intro: 'Find a gap and leave the next observer a useful detail.', home: 'Contribute',
      total: 'Entries checked', needsWork: 'Entries to improve', gaps: 'Missing details', average: 'Average metadata coverage',
      note: 'Coverage measures filled structured fields. Check sources when contributing; missing translations do not change metadata scores.',
      search: 'Search names, aliases or IDs', type: 'Entry type', field: 'Missing field', all: 'All', order: 'Sort',
      sorts: { missing: 'Most missing details', score: 'Lowest coverage', title: 'By name' },
      fieldTitle: 'Start with a field', fieldNote: 'Choose the information you can help document.',
      results: '{shown} / {total} entries', empty: 'No missing details match these filters. Reset them to keep browsing.',
      reset: 'Reset filters', more: 'Show 24 more', open: 'Read entry', edit: 'Add details',
      score: 'Metadata {score} / 100', sourceLocale: 'Current source language',
      download: 'View missing-data index', fallback: 'Enable JavaScript to search, filter and load more. The entries below can still be opened.',
      fields: { summary: 'Summary', sources: 'Sources', 'presentation.image': 'Image', roles: 'Roles',
        'lifecycle.startedAt': 'Activity start date', officialLinks: 'Official links', performers: 'Performers', credits: 'Credits',
        releaseDate: 'Release date', lyricsSources: 'Lyric sources', tracks: 'Track list', primaryArtist: 'Primary artist',
        'dateRange.start': 'Event date', 'venue.name': 'Venue', headliners: 'Headliners', setlist: 'Setlist', translation: 'Translation in this language' } },
    ja: { title: '資料整備ボード', intro: '足りない情報を見つけて、次の観測者のために記録を補いましょう。', home: '貢献する',
      total: '確認した記事', needsWork: '追記できる記事', gaps: '不足項目', average: 'メタデータの平均充足率',
      note: '構造化された項目の記入状況です。追記時は出典を確認してください。翻訳の不足は充足率に含めません。',
      search: '名前・別名・ID で検索', type: '記事の種類', field: '不足項目', all: 'すべて', order: '並び順',
      sorts: { missing: '不足が多い順', score: '充足率が低い順', title: '名前順' },
      fieldTitle: '項目から探す', fieldNote: '追記できる情報を選び、資料の整備に参加しましょう。',
      results: '{shown} / {total} 件', empty: '条件に一致する不足資料はありません。条件をリセットして探せます。',
      reset: '条件をリセット', more: 'さらに24件を表示', open: '記事を読む', edit: '資料を追記',
      score: 'メタデータ {score} / 100', sourceLocale: '現在の資料言語',
      download: '不足資料の索引を見る', fallback: '検索・絞り込み・追加表示には JavaScript が必要です。下の記事はそのまま開けます。',
      fields: { summary: '概要', sources: '出典', 'presentation.image': '画像', roles: '役割',
        'lifecycle.startedAt': '活動開始日', officialLinks: '公式リンク', performers: '歌唱者', credits: 'クレジット',
        releaseDate: '発売日', lyricsSources: '歌詞の出典', tracks: '収録曲', primaryArtist: '主要アーティスト',
        'dateRange.start': '開催日', 'venue.name': '会場', headliners: '主な出演者', setlist: 'セットリスト', translation: 'この言語の翻訳' } },
  }, locale);
  copy.types = Object.fromEntries(entityTypes.map(type => [type, entityLabel(type, locale)]));
  return {...archiveCompletionCopy(locale),...copy};
}
