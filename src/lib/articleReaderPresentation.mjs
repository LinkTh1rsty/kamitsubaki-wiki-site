import {articleCopy} from './articleCopy.mjs';
import {iconMarkup} from './icons.mjs';

export const escapeArticleText=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function articleAvatarURL(value){
 if(typeof value!=='string'||!value.trim()||/[\\\s]/.test(value))return '';
 if(value.startsWith('/')&&!value.startsWith('//'))return value;
 try{const url=new URL(value);return !url.username&&!url.password&&(url.protocol==='https:'||url.protocol==='http:'&&['127.0.0.1','localhost'].includes(url.hostname))?url.href:'';}catch{return '';}
}
export function articleDate(value,locale='zh'){
 const day=String(value||'').match(/^\d{4}-\d{2}-\d{2}/)?.[0];
 if(!day)return null;
 const date=new Date(day+'T00:00:00Z');
 if(!Number.isFinite(date.valueOf()))return null;
 return {day,label:new Intl.DateTimeFormat(locale,{year:'numeric',month:'short',day:'numeric',timeZone:'UTC'}).format(date)};
}
export function articleAuthorHTML(article,locale,{compact=false}={}){
 const e=escapeArticleText,copy=articleCopy(locale),avatar=articleAvatarURL(article.authorAvatarUrl);
 const date=articleDate(article.publishedAt||article.updatedAt,locale);
 return `<div class="article-author${compact?' article-author--compact':''}"><span class="article-avatar" aria-hidden="true">${iconMarkup('user-round')}${avatar?`<img data-article-avatar src="${e(avatar)}" alt="" width="48" height="48" decoding="async" referrerpolicy="no-referrer"${compact?' loading="lazy"':''}>`:''}</span><span class="article-author-text"><span class="article-author-name">${e(article.author||copy.unknownAuthor)}</span>${date?`<time datetime="${date.day}" title="${e(article.updatedAt||'')}">${e(date.label)}</time>`:''}</span></div>`;
}
export function articleMetaHTML(article,locale,{fallback=false}={}){
 const e=escapeArticleText,copy=articleCopy(locale),category=copy.categories[article.category]||article.category;
 const updated=articleDate(article.updatedAt,locale),published=articleDate(article.publishedAt,locale);
 return `${category?`<a class="article-category" href="/${locale}/articles/?category=${encodeURIComponent(article.category)}">${e(category)}</a>`:''}${articleAuthorHTML(article,locale)}<p class="article-origin"><span>${e(copy.origin)}</span><span>${e(copy.origins[article.origin]||'')}</span></p>${updated&&published&&updated.day!==published.day?`<p class="article-updated">${e(copy.updated)} <time datetime="${updated.day}">${e(updated.label)}</time></p>`:''}${fallback?`<p class="article-language-note">${e(copy.fallback)}</p>`:''}`;
}
// An unavailable avatar keeps the same-size library icon; no broken-image glyph or guessed identity.
export function enhanceArticleAvatars(root){
 for(const image of root.querySelectorAll('img[data-article-avatar]')){
  const fail=()=>image.remove();
  image.addEventListener('error',fail,{once:true});
  if(image.complete&&!image.naturalWidth)fail();
 }
}
