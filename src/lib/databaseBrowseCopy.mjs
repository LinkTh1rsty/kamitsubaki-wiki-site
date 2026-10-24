import {resolveLocaleCopy} from './i18n.mjs';

export function databaseBrowseCopy(locale) {
  return resolveLocaleCopy({
    zh: {
      title: '资料库', home: '首页', intro: '检索人物、音乐与企划，沿着记录之间的关联继续探索。',
      create: '新建词条', browse: '浏览记录', search: '搜索全部记录', placeholder: '搜索名称、艺人、作品或关键词…',
      collection: '记录集合', all: '全部记录', allValues: '全部', type: '类型', artist: '艺人 / 创作者',
      year: '年份', genre: '曲风', project: '企划', unknownYear: '年份未记录', clear: '清除筛选', filters: '筛选',
      records: '条记录', shown: '已显示', more: '再显示 24 条', empty: '没有符合条件的记录。',
      sort: '排序', sortOptions: {catalog:'目录顺序',title:'名称',newest:'年份从新到旧',oldest:'年份从旧到新'}, activeFilters:'已应用的条件', removeFilter:'移除：{label}',
      emptyHint: '试试其他关键词，或清除部分筛选条件。', tree: '深入浏览分类',
      treeHint: '按分类、子目录与组合成员查阅完整索引。', record: '记录', imagePending: '图像待补',
      collections: {people: '人物', music: '音乐', projects: '企划', lives: '演出', organizations: '组织', lore: '世界观', isotopes: '音乐同位体'},
    },
    ja: {
      title: 'データベース', home: 'ホーム', intro: '人物・音楽・企画を検索し、記録同士のつながりを辿る。',
      create: '項目を新規作成', browse: '記録を探す', search: 'すべての記録を検索', placeholder: '名前・アーティスト・作品・キーワードを検索…',
      collection: 'コレクション', all: 'すべての記録', allValues: 'すべて', type: '種類', artist: 'アーティスト / 制作者',
      year: '年', genre: 'ジャンル', project: '企画', unknownYear: '年の記載なし', clear: '条件をクリア', filters: '絞り込み',
      records: '件', shown: '表示中', more: 'さらに24件を表示', empty: '該当する記録はありません。',
      sort: '並び順', sortOptions: {catalog:'目録順',title:'名前順',newest:'新しい年から',oldest:'古い年から'}, activeFilters:'適用中の条件', removeFilter:'解除：{label}',
      emptyHint: 'キーワードを変えるか、絞り込み条件を解除してください。', tree: '分類から詳しく探す',
      treeHint: '分類・下位項目・グループのメンバーから索引を辿れます。', record: '記録', imagePending: '画像準備中',
      collections: {people: '人物', music: '音楽', projects: '企画', lives: '公演', organizations: '組織', lore: '世界観', isotopes: '音楽的同位体'},
    },
    en: {
      title: 'Database', home: 'Home', intro: 'Search people, music and projects. Follow the connections between records.',
      create: 'Create an entry', browse: 'Browse records', search: 'Search all records', placeholder: 'Search names, artists, works or keywords…',
      collection: 'Collections', all: 'All records', allValues: 'All', type: 'Type', artist: 'Artist / Creator',
      year: 'Year', genre: 'Genre', project: 'Project', unknownYear: 'Year not recorded', clear: 'Clear filters', filters: 'Filters',
      records: 'records', shown: 'Showing', more: 'Load 24 more', empty: 'No matching records.',
      sort: 'Sort', sortOptions: {catalog:'Catalogue order',title:'Name',newest:'Newest year',oldest:'Oldest year'}, activeFilters:'Applied filters', removeFilter:'Remove: {label}',
      emptyHint: 'Try another keyword or remove some filters.', tree: 'Explore the classification tree',
      treeHint: 'Follow categories, subcategories and group members through the full index.', record: 'Record', imagePending: 'Image pending',
      collections: {people: 'People', music: 'Music', projects: 'Projects', lives: 'Events', organizations: 'Organizations', lore: 'Lore', isotopes: 'Voice software'},
    },
  }, locale);
}
