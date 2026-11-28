import {applyGalleryPreview} from './galleryPreviewImage.mjs';
import {micromark} from 'micromark';
import {gfm,gfmHtml} from 'micromark-extension-gfm';
import {convertChineseValue,isTraditionalChineseLocale} from './traditionalChinese.mjs';
export const communityApi=base=>String(base||'https://api.kamitsubaki.wiki').replace(/\/$/,'');
export const renderCommunityMarkdownHtml=body=>micromark(String(body||''),{allowDangerousHtml:false,allowDangerousProtocol:false,extensions:[gfm()],htmlExtensions:[gfmHtml()]});
export async function communityRequest(base,path,{method='GET',body,signal}={}){
 const response=await fetch(communityApi(base)+'/api/community-activities'+path,{method,credentials:body?'include':'omit',signal:signal||AbortSignal.timeout(body?15000:8000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});let data;try{data=await response.json();}catch{throw Object.assign(Error('Service unavailable'),{status:response.status});}if(!response.ok)throw Object.assign(Error(data.error?.message||'Service unavailable'),{status:response.status});return data;
}
export function contentText(value,activity,locale){return typeof value==='string'&&activity?.sourceLocale==='zh'&&isTraditionalChineseLocale(locale)?convertChineseValue(value,locale):String(value||'');}
export function renderCommunityMarkdown(target,body,media=[],options={}){const template=document.createElement('template');template.innerHTML=renderCommunityMarkdownHtml(body);for(const link of template.content.querySelectorAll('a')){link.target='_blank';link.rel='noopener noreferrer';}for(const img of template.content.querySelectorAll('img')){if(!media.some(ref=>ref.src===img.getAttribute('src'))){const label=document.createElement('span');label.textContent=img.alt||'';img.replaceWith(label);}else {applyGalleryPreview(img,media.find(ref=>ref.src===img.getAttribute('src')),options);img.loading='lazy';}}target.replaceChildren(template.content);}
export function communityCard(activity,{locale='zh',copy,api}){
 const a=document.createElement('a');a.className='community-card';a.href=`/${locale}/community/activities/${encodeURIComponent(activity.id)}/`;
 if(activity.poster){const img=document.createElement('img');applyGalleryPreview(img,{src:activity.poster},{api,sizes:'(max-width:700px) 90vw, 400px'});img.alt=contentText(activity.title,activity,locale);img.loading='lazy';a.append(img);}
 const div=document.createElement('div');div.className='community-card__copy';const meta=document.createElement('div');meta.className='community-card__meta';const badge=document.createElement('span');badge.className='community-badge';badge.textContent=copy[activity.mode];meta.append(badge);if(activity.cooperation){const b=document.createElement('span');b.className='community-badge community-badge--coop';b.textContent=copy.cooperation;meta.append(b);}div.append(meta);
 const title=document.createElement('h3');title.textContent=contentText(activity.title,activity,locale);const summary=document.createElement('p');summary.textContent=contentText(activity.summary,activity,locale);div.append(title,summary);if(activity.sourceLocale!==locale&&!(activity.sourceLocale==='zh'&&locale.startsWith('zh'))){const language=document.createElement('small');language.textContent=copy.originalLanguage+' · '+new Intl.DisplayNames([locale],{type:'language'}).of(activity.sourceLocale);div.append(language);}a.append(div);return a;
}

export function enhanceCommunityImages(root,{api}={}) {
 for(const image of root.querySelectorAll('img')) {
  const source=image.dataset.original||image.getAttribute('src');
  const sizes=image.closest('.community-card')?'(max-width:700px) 90vw, 400px':image.classList.contains('community-detail-poster')?'(max-width:767px) calc(100vw - 48px), 440px':'(max-width:767px) calc(100vw - 32px), 720px';
  applyGalleryPreview(image,{src:source,width:image.dataset.originalWidth,height:image.dataset.originalHeight},{api,sizes});
 }
}
