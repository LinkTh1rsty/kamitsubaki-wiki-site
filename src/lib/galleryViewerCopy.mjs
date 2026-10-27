import {resolveLocaleCopy} from './i18n.mjs';
export function galleryViewerCopy(language='zh'){
 const lang=language.toLowerCase(),locale=lang.startsWith('en')?'en':lang.startsWith('ja')?'ja':lang.includes('hk')?'zh-hk':lang.includes('hant')||lang.includes('tw')?'zh-tw':'zh';
 return resolveLocaleCopy({
  zh:{close:'关闭',zoom:'放大 / 适应窗口',previous:'上一张',next:'下一张',error:'图片加载失败，请关闭后重试',details:'图片资料',fit:'适应窗口',out:'缩小',in:'放大',more:'加载后续照片',loading:'加载中…',failed:'加载失败，可重试',image:'图片',actions:'相关操作',download:'下载原图',source:'查看来源'},
  en:{close:'Close',zoom:'Zoom / fit',previous:'Previous image',next:'Next image',error:'Image could not load. Close and retry.',details:'Image details',fit:'Fit',out:'Zoom out',in:'Zoom in',more:'Load more photos',loading:'Loading…',failed:'Could not load. Retry.',image:'Image',actions:'Actions',download:'Download original',source:'View source'},
  ja:{close:'閉じる',zoom:'拡大 / 全体表示',previous:'前の画像',next:'次の画像',error:'画像を読み込めません。閉じて再試行してください。',details:'画像情報',fit:'全体表示',out:'縮小',in:'拡大',more:'続きを読み込む',loading:'読み込み中…',failed:'読み込めません。再試行できます。',image:'画像',actions:'関連操作',download:'原画像を保存',source:'出典を見る'},
 },locale);
}
