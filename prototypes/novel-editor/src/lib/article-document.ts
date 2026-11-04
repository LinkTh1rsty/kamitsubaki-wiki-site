import {normalizeYamlDates} from './yaml-compat';
import {parseDocument} from 'yaml';
import {importMarkdown,parseVisualBlocks} from '../../../../src/lib/visualEditor.mjs';
import {reviewAttachments,type ReviewAttachment} from './review-attachments';
export type ArticleImage = {assetId?:string;galleryId?:string;src?:string;alt:string;caption:string;author:string;sourceTitle:string;sourceUrl:string;rightsBasis:string;rightsEvidence:string};
export type ArticleContent = {title:string;summary:string;body:string;category:string;relatedEntities:string[];mediaRefs?:ArticleImage[]};
export type ArticleBinding = {ownerId:string;articleId:string;revisionId:string;locale:string;baseVersion:number;fingerprint:string;draftVersion:number;status:string;updatedAt:string;withdrawnAt?:string|null};
export type ArticleSnapshot = {key:string;source:string;locale:string;content:ArticleContent;attachments:ReviewAttachment[];binding?:ArticleBinding;base?:{articleId:string;version:number}};
export const articleImageUrl=(image:ArticleImage)=>image.src||'/_private/article-assets/'+image.assetId;
export function articleLocalImages(body:string){return reviewAttachments(body,parseVisualBlocks(body));}
export function sameArticleContent(a:ArticleContent,b:ArticleContent) {
 const canonical=(content:ArticleContent)=>({title:content.title.trim(),summary:content.summary.trim(),body:content.body,category:content.category,relatedEntities:[...new Set(content.relatedEntities)],mediaRefs:(content.mediaRefs||[]).map(ref=>({assetId:ref.assetId,galleryId:ref.galleryId,src:ref.src,...Object.fromEntries(['alt','caption','author','sourceTitle','sourceUrl','rightsBasis','rightsEvidence'].map(key=>[key,String((ref as any)[key]||'').trim()]))}))});
 return JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
}
export function articleSnapshot(key:string,source:string,ledger:ReviewAttachment[]=[],binding?:ArticleBinding,bodyImages:{src:string;alt?:string;caption?:string}[]=[],base?:{articleId:string;version:number}):ArticleSnapshot {
 const draft=importMarkdown(source,'articles') as any,meta=draft.meta;
 if(meta.entityType!=='editorial-article')throw Error('请先选择文章类型。');
 if(!['zh','ja','en'].includes(meta.locale))throw Error('请编辑简体中文、日文或英文原文，繁体页面由简体内容生成。');
 if(binding&&binding.locale!==meta.locale)throw Error('已有文章的语言需要保持不变。');
 const body=draft.originalBody as string;
 const currentImages=new Map<string,{alt:string;caption:string}>();
 const collect=(blocks:any[])=>{for(const block of blocks){if(block.type==='image')currentImages.set(block.url,{alt:block.text||'',caption:block.caption||''});if(block.type==='details')collect(parseVisualBlocks(block.text));}};collect(draft.blocks);
 for(const image of bodyImages)currentImages.set(image.src,{alt:image.alt||'',caption:image.caption||''});
 const registered = [...(meta.articleMediaRefs || []), ...ledger.filter(asset => asset.staged?.purpose === 'article' && asset.staged.image && body.includes(asset.url)).map(asset => ({ ...asset.staged!.image!, assetId: asset.staged!.id }))];
 const mediaRefs=[...new Map(registered.filter((ref:ArticleImage)=>body.includes(articleImageUrl(ref))).map((ref:ArticleImage)=>[articleImageUrl(ref), {...ref,...currentImages.get(articleImageUrl(ref))}])).values()];
 return {key,source,locale:meta.locale,binding,base,attachments:reviewAttachments(source,draft.blocks,ledger),content:{title:meta.title||'',summary:meta.summary||'',category:meta.articleCategory||'archival',relatedEntities:meta.relatedEntities||[],body,...(mediaRefs.length?{mediaRefs}:{})}};
}
export function articleSourceWithContent(source:string,content:ArticleContent) {
 const match=source.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);if(!match)throw Error('文章缺少属性，请保留本地草稿。');
 const doc=parseDocument(match[1]);if(doc.errors.length)throw Error('文章属性无法读取，请保留本地草稿。');
 const meta=doc.toJS({maxAliasCount:100}),next={title:content.title,summary:content.summary,articleCategory:content.category,relatedEntities:content.relatedEntities,...(content.mediaRefs?.length?{articleMediaRefs:content.mediaRefs}:{})};let changed=false;
 for(const [key,value]of Object.entries(next))if(!(meta[key]===undefined&&(value===''||Array.isArray(value)&&value.length===0||key==='articleCategory'&&value==='archival'))&&JSON.stringify(meta[key])!==JSON.stringify(value)){doc.set(key,value);changed=true;}
 if(!content.mediaRefs?.length&&meta.articleMediaRefs!==undefined){doc.delete('articleMediaRefs');changed=true;}
 const newline=match[0].includes('\r\n')?'\r\n':'\n',prefix=changed?`${source.startsWith('\uFEFF')?'\uFEFF':''}---${newline}${doc.toString({lineWidth:0}).trimEnd().replaceAll('\n',newline)}${newline}---${newline}`:match[0];
 return normalizeYamlDates(prefix+content.body);
}
export function validateArticleContent(content:ArticleContent,submit=false) {
 if(content.title.length>200)throw Error('文章标题最多 200 字。');if(content.summary.length>1000)throw Error('一句话简介最多 1000 字。');if(content.body.length>200000)throw Error('文章正文过长，请拆分为多篇文章。');
 if(submit&&(!content.title.trim()||!content.body.trim()))throw Error('请填写文章标题与正文。');
 if(!['archival','profile','business','art-philosophy','infrastructure'].includes(content.category))throw Error('请选择有效的文章分类。');
 if(!Array.isArray(content.relatedEntities)||content.relatedEntities.length>50||content.relatedEntities.some(id=>typeof id!=='string'||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)))throw Error('相关词条列表有误，请重新选择站内词条。');
}
export function validateArticleImage(image:ArticleImage,submit=false) {
 for(const [key,max]of Object.entries({alt:300,caption:2000,author:200,sourceTitle:300,sourceUrl:2000,rightsBasis:30,rightsEvidence:2000})){const value=(image as any)[key]??'';if(typeof value!=='string'||value.length>max)throw Error('图片说明过长或格式不正确。');}
 if(submit&&(!(image.alt||'').trim()||!image.galleryId&&(!(image.author||'').trim()||!(image.sourceTitle||'').trim()||!['official','original','authorized'].includes(image.rightsBasis))))throw Error('请补全每张图片的说明、作者、来源名称和使用依据。');
 if(image.sourceUrl){try{if(!['https:','http:'].includes(new URL(image.sourceUrl).protocol))throw Error();}catch{throw Error('请填写完整的图片来源链接。');}}
 if(submit&&!image.galleryId&&image.rightsBasis==='official'&&!image.sourceUrl)throw Error('官方素材需要提供原始来源链接。');
 if(submit&&!image.galleryId&&image.rightsBasis==='authorized'&&!image.rightsEvidence&&!image.src)throw Error('请填写已获得授权的具体说明。');
}
