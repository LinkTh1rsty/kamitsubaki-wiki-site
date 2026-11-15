import {readFile,readdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import YAML from 'yaml';
import {resolveLocaleCopy,supportedLocales} from './i18n.mjs';
import {unified} from 'unified';
import remarkParse from 'remark-parse';
import {docsCopy} from './docsCopy.mjs';
import {renderMarkdownDocument} from './markdown.mjs';

/** @typedef {{title:string,summary:string,order:number,locale:string,book:string,chapter:string,href:string,slug:string,body?:string}} ManualChapterSummary */
/** @typedef {{id:string,title:string,description:string,href:string,chapters:ManualChapterSummary[]}} ManualBook */

export const manualBooks=['site','contribute','develop'];
// Astro bundles this module into dist during prerendering, so resolve the
// document source from the project root rather than the bundle directory.
const manualRoot=resolve(process.cwd(),'docs/manuals');
const sourceLocales=['zh','ja','en'];
const localeFile=locale=>['zh-tw','zh-hk'].includes(locale)?locale:sourceLocales.includes(locale)?locale:'zh';

export const retiredDocTargets={
 'using-the-site':'site/start','reader':'site/reading',
 'editor':'contribute/entry','contributing':'contribute/start',
 'files-and-images':'contribute/entry','licensing':'contribute/rights',
 'article-publishing':'contribute/article','gallery-r2':'contribute/gallery',
 'metadata-schema':'develop/content','entity-classification':'develop/content',
 'feature-maintenance':'develop/features','frontend-system':'develop/frontend',
 'page-system':'develop/frontend','architecture':'develop/architecture',
 'release-runbook':'develop/operations',
};
export const retiredDocSlugs=Object.keys(retiredDocTargets);

export const docsCenterCopy=locale=>resolveLocaleCopy({
 zh:{title:'文档中心',eyebrow:'DOCUMENTS',home:'返回首页',intro:'从浏览、投稿到维护开发，按你的任务找到准确的说明。',search:'搜索所有说明书',empty:'没有找到匹配的章节',back:'返回文档中心',toc:'本章目录',next:'下一章',previous:'上一章',advanced:'进阶 · 开发维护',read:'阅读章节'},
 en:{title:'Documents',eyebrow:'DOCUMENTS',home:'Back to home',intro:'Find the right guide for reading, contributing, or maintaining the site.',search:'Search all manuals',empty:'No matching chapters',back:'Back to documents',toc:'In this chapter',next:'Next chapter',previous:'Previous chapter',advanced:'Advanced · Development',read:'Read chapter'},
 ja:{title:'ドキュメント',eyebrow:'DOCUMENTS',home:'ホームへ',intro:'閲覧、投稿、開発・保守に必要な手順を目的別に探せます。',search:'すべての説明書を検索',empty:'一致する章はありません',back:'ドキュメントへ戻る',toc:'この章の目次',next:'次の章',previous:'前の章',advanced:'上級 · 開発と保守',read:'章を読む'},
},locale);

export const bookCopy=(book,locale)=>resolveLocaleCopy({
 zh:{site:{title:'网站说明书',description:'浏览百科、阅读文章与使用探索功能。'},contribute:{title:'贡献说明书',description:'站内编辑和 GitHub 两条路线，涵盖词条、文章、图库与时间轴。'},develop:{title:'开发说明书',description:'前台内容模型、共享组件与公开集成边界。'}},
 en:{site:{title:'Site manual',description:'Browse the encyclopedia, read articles, and explore the archive.'},contribute:{title:'Contribution manual',description:'Site and GitHub routes for entries, articles, gallery sets, and events.'},develop:{title:'Development manual',description:'Frontend content models, shared components, and public integration boundaries.'}},
 ja:{site:{title:'サイト説明書',description:'百科、記事、探索機能の利用方法。'},contribute:{title:'投稿説明書',description:'サイトと GitHub の二経路で、項目・記事・設定資料・年表を投稿。'},develop:{title:'開発説明書',description:'フロントのコンテンツモデル、共通部品、公開連携の範囲。'}},
},locale)?.[book];

function assertPart(part,allowed){if(!allowed.includes(part))throw new Error(`Unknown manual path: ${part}`);}
function parseManual(source,path){
 const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/u);
 if(!match)throw new Error(`Missing manual frontmatter: ${path}`);
 const data=YAML.parse(match[1]);
 if(!data||typeof data.title!=='string'||typeof data.summary!=='string'||!Number.isInteger(data.order))throw new Error(`Invalid manual frontmatter: ${path}`);
 return {data,body:source.slice(match[0].length).trim()};
}

export async function getManualPaths(){
 const paths=[];
 for(const book of manualBooks){
  const chapters=(await readdir(join(manualRoot,book),{withFileTypes:true})).filter(item=>item.isDirectory());
  for(const chapter of chapters)paths.push({book,chapter:chapter.name});
 }
 return paths;
}

export async function getManualChapter(book,chapter,locale,{render=true}={}){
 assertPart(locale,supportedLocales);
 assertPart(book,manualBooks);
 const chapters=(await readdir(join(manualRoot,book),{withFileTypes:true})).filter(item=>item.isDirectory()).map(item=>item.name);
 assertPart(chapter,chapters);
 const file=join(manualRoot,book,chapter,`${localeFile(locale)}.md`);
 const parsed=parseManual(await readFile(file,'utf8'),file);
 const {data}=parsed;
 const body=['zh-tw','zh-hk'].includes(locale)?parsed.body.replaceAll('/zh/','/'+locale+'/'):parsed.body;
 if(data.book!==book||data.chapter!==chapter||data.locale!==localeFile(locale))throw new Error(`Manual identity mismatch: ${file}`);
 const result={book,chapter,locale,data,body,href:`/${locale}/docs/${book}/${chapter}/`};
 return render?{...result,...await renderMarkdownDocument(body,{fileURL:pathToFileURL(file)})}:result;
}

export async function getManualSearchIndex(locale){
 const books=await getManualCatalog(locale,{includeBody:true}),copy=docsCopy(locale);
 const parser=unified().use(remarkParse);
 const text=node=>node.type==='html'?'':typeof node.value==='string'?node.value:node.type==='image'?node.alt||'':(node.children||[]).map(text).join(' ');
 return {locale,entries:books.flatMap(book=>book.chapters.map(chapter=>({
  href:chapter.href,title:chapter.title,summary:chapter.summary,group:copy.books[book.id],
  body:text(parser.parse(chapter.body)).replace(/\s+/gu,' ').trim(),
 })))};
}

/** @returns {Promise<ManualBook[]>} */
export async function getManualCatalog(locale,{includeBody=false}={}){
 const paths=await getManualPaths();
 const chapters=await Promise.all(paths.map(({book,chapter})=>getManualChapter(book,chapter,locale,{render:false})));
 return manualBooks.map(book=>({
  id:book,...bookCopy(book,locale),href:`/${locale}/docs/${book}/`,
  chapters:chapters.filter(item=>item.book===book).sort((a,b)=>a.data.order-b.data.order).map(item=>({
   ...item.data,href:item.href,slug:item.chapter,...includeBody?{body:item.body}:{},
  })),
 }));
}
