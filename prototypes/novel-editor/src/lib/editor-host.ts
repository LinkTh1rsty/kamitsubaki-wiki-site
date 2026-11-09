import {attachmentFile} from '../../../../src/lib/editorAttachments.mjs';
export type EditorHost = {locale:string; contentLocale:string; apiBase:string; mode:'entry'|'article'; transport:'local'|'production'; ownerId?:string; accountName?:string; backHref?:string; backLabel?:string; initialTarget?:string; admin?:boolean; embedded?:boolean; parentOrigin?:string; initialDocument?:any; loginHref:string};
declare global {interface Window {__WIKI_EDITOR_HOST__?:EditorHost}}
export const editorHost=()=>typeof window==='undefined'?undefined:window.__WIKI_EDITOR_HOST__;
export const localEditorHost=()=>!editorHost()||editorHost()!.transport==='local';
export const editorApiUrl=(path:string)=>editorHost()?editorHost()!.apiBase.replace(/\/$/,'')+path:path;
const localImages=new Map<string,string>();
const stagedImages=new Set<string>();
export const registerStagedImage=(id:string)=>stagedImages.add(id);
export function registerStagedImages(assets:{url:string;staged?:{id:string}}[]=[]){stagedImages.clear();for(const asset of assets)if(asset.staged)stagedImages.add(asset.staged.id);}
export function previewAssetUrl(url:string){
 if(!editorHost())return url;
 if(localImages.has(url))return localImages.get(url)!;
 const privateArticle=url.match(/^\/_private\/article-assets\/([a-f0-9]{64})/);
 if(privateArticle)return editorApiUrl('/api/articles/assets/'+privateArticle[1]+'/image');
 if(url.startsWith('/gallery/article-assets/'))return editorApiUrl(url);
 const entry=url.match(/^\/images\/contributions\/([a-f0-9]{64})\./);
 return entry&&stagedImages.has(entry[1])?editorApiUrl('/api/editor/assets/'+entry[1]):url;
}
export async function restoreBrowserImages(source:string){
 if(!editorHost())return;
 for(const url of new Set(source.match(/\/images\/novel-prototype\/[a-f0-9]{64}\.(?:png|jpg|webp|gif)/g)||[])){
  if(localImages.has(url))continue;
  const file=await attachmentFile('novel:'+editorHost()!.ownerId+':'+url).catch(()=>null);
  if(file instanceof Blob)localImages.set(url,URL.createObjectURL(file));
 }
}
export function previewHTML(html:string){return html.replace(/src="([^"<>]+)"/g,(_match,url)=>'src="'+previewAssetUrl(url)+'"');}
export async function retainBrowserImage(file:File){
 if(file.size>10*1024*1024||!['image/png','image/jpeg','image/webp','image/gif'].includes(file.type))throw Error('请选择10 MiB以内的PNG、JPEG、WebP或GIF。');
 const bytes=await file.arrayBuffer(),head=new Uint8Array(bytes),ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'}[file.type];
 const valid=file.type==='image/png'?[137,80,78,71,13,10,26,10].every((b,i)=>head[i]===b):file.type==='image/jpeg'?head[0]===255&&head[1]===216&&head[2]===255:file.type==='image/gif'?String.fromCharCode(...head.slice(0,6)).match(/^GIF8[79]a$/):String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP';
 if(!valid)throw Error('图片文件内容与格式不符。');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
 const url='/images/novel-prototype/'+hash+'.'+ext;
 await attachmentFile('novel:'+editorHost()!.ownerId+':'+url,file);localImages.set(url,URL.createObjectURL(file));return url;
}
export async function editorFetch(input:RequestInfo|URL,options?:RequestInit):Promise<Response>{
 const host=editorHost();if(!host)return fetch(input,options);
 const url=String(input);
 if(url.startsWith('/images/novel-prototype/')){await restoreBrowserImages(url);const source=localImages.get(url);return source?fetch(source,options):new Response('图片原图暂未恢复，请重新选择原图。',{status:404});}
 if(url.startsWith('/__local')&&!localEditorHost())throw Error('本地测试操作不能在正式网站执行。');
 if(url==='/__novel/catalog'){
  const values=await Promise.all(['zh','ja','en'].map(async locale=>{const r=await fetch('/'+locale+'/editor-catalog.json',options);if(!r.ok)throw Error('词条目录读取失败。');return (await r.json()).map((entry:any)=>({...entry,locale:entry.sourceLocale||locale,collection:entry.kind,image:entry.image,romanized:entry.romanized||''}));}));
  const unique=new Map(values.flat().map((entry:any)=>[entry.path,entry]));return Response.json({entries:[...unique.values()]});
 }
 if(url.startsWith('/__novel/source')){const query=new URL(url,'https://wiki.invalid').search;const r=await fetch(editorApiUrl('/api/editor/source'+query),{...options,credentials:'include'});const value=await r.json();return Response.json(r.ok?{source:value.content}:value,{status:r.status});}
 let target=url==='/__novel/preview'?'/api/editor/preview':previewAssetUrl(url);
 if(host.admin&&target.startsWith('/api/articles'))target=target.replace('/api/articles','/api/admin/articles');
 const relativeApi=target.startsWith('/api/')||target.startsWith('/__local');
 const api=relativeApi||Boolean(host.apiBase&&target.startsWith(host.apiBase+'/')); 
 return fetch(relativeApi?editorApiUrl(target):target,api?{...options,credentials:'include'}:options);
}
