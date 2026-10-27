import {resolveLocaleCopy} from './i18n.mjs';
export function homePortalCopy(locale) {
  return resolveLocaleCopy({
    zh:{search:'从一条档案开始',placeholder:'人物、歌曲、专辑或关键词',find:'查找档案',fullText:'搜索正文',start:'从人物开始',directory:'浏览完整资料库',updates:'站点更新',allUpdates:'查看更新历史',empty:'暂无已公布更新',preface:'关于本站与站长序言',prefaceNote:'了解档案的来由、原则与参与方式',browse:'选择一种档案',note:'完整分类和高级筛选在资料库中。'},
    en:{search:'Start with a record',placeholder:'A person, song, album or keyword',find:'Find a record',fullText:'Search full text',start:'Start with a person',directory:'Browse the full database',updates:'Site updates',allUpdates:'Update history',empty:'No announced updates yet',preface:'About this archive & preface',prefaceNote:'The archive, its principles and ways to contribute',browse:'Choose a collection',note:'Find the full classification and advanced filters in Database.'},
    ja:{search:'ひとつの記録から',placeholder:'人物・楽曲・アルバム・キーワード',find:'記録を探す',fullText:'本文を検索',start:'人物から始める',directory:'データベース全体を見る',updates:'サイト更新',allUpdates:'更新履歴',empty:'公開された更新はありません',preface:'このサイトと序文',prefaceNote:'記録の背景、方針、参加方法について',browse:'記録の種類を選ぶ',note:'詳細な分類と絞り込みはデータベースへ。'},
  },locale);
}
