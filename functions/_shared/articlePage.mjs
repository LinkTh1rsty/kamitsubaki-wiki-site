import {articleMetaHTML} from '../../src/lib/articleReaderPresentation.mjs';
import {articleHTML} from '../../src/lib/articleMarkdownRenderer.mjs';

const locales=new Set(['zh','zh-tw','zh-hk','ja','en']);
const origin='https://kamitsubaki.wiki';
const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const xml=escape;
const apiBase=env=>String(env.ARTICLE_API_URL||env.PUBLIC_ARTICLE_API_URL||env.PUBLIC_GALLERY_API_URL||'https://api.kamitsubaki.wiki').replace(/\/$/,'');
const canonical=(locale,id)=>`${origin}/${locale}/articles/read/${encodeURIComponent(id)}/`;
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

export async function renderArticlePage({request,env,params}){
 const locale=String(params.locale||''),id=String(params.id||'');
 if(!locales.has(locale)||!(/^[a-z0-9-]{1,120}$/).test(id))return new Response('Not found',{status:404,headers:noStore});
 let article,fallback=false;
 try{
  const source=locale.startsWith('zh')?'zh':locale;
  const response=await fetch(`${apiBase(env)}/api/articles/items/${encodeURIComponent(id)}?locale=${source}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
  if(response.status===404)return new Response('Not found',{status:404,headers:noStore});
  if(!response.ok)throw Error('Article service unavailable');
  ({article,fallback}=await response.json());
  if(!article||!article.title||!article.body)throw Error('Invalid public article');
 }catch{return new Response('Article service unavailable',{status:503,headers:noStore});}
 const assetUrl=new URL(`/${locale}/articles/read/`,request.url);
 const asset=await env.ASSETS.fetch(new Request(assetUrl));
 if(!asset.ok)return new Response('Article template unavailable',{status:503,headers:noStore});
 const title=String(article.title),summary=String(article.summary||article.body.replace(/<[^>]*>|[#*`\[\]{}]/g,' ').replace(/\s+/g,' ').trim().slice(0,180));
 const displayTitle=`${title} · Kamitsubaki Wiki`,url=canonical(fallback?'zh':locale,id);
 const body=articleHTML(article.body,locale);
 const metadata=articleMetaHTML(article,locale,{fallback});
 let html=await asset.text();
 const replace=(pattern,value)=>{html=html.replace(pattern,()=>value);};
 replace(/<title>[^<]*<\/title>/,`<title>${escape(displayTitle)}</title>`);
 const meta=(name,value)=>`<meta ${name} content="${escape(value)}">`;
 replace(/<meta name="description"[^>]*>/,meta('name="description"',summary));
 replace(/<meta name="robots"[^>]*>/,meta('name="robots"','index, follow, max-image-preview:large'));
 replace(/<link rel="canonical"[^>]*>/,`<link rel="canonical" href="${escape(url)}">`);
 for(const [name,value] of Object.entries({'og:type':'article','og:title':displayTitle,'og:description':summary,'og:url':url}))replace(new RegExp(`<meta property="${name}"[^>]*>`),meta(`property="${name}"`,value));
 for(const [name,value] of Object.entries({'twitter:title':displayTitle,'twitter:description':summary}))replace(new RegExp(`<meta name="${name}"[^>]*>`),meta(`name="${name}"`,value));
 const structured={'@context':'https://schema.org','@type':'Article',headline:title,description:summary,url,author:{'@type':'Person',name:String(article.author||'Kamitsubaki Wiki')},datePublished:article.publishedAt||undefined,dateModified:article.updatedAt||undefined,inLanguage:locale};
 replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/,`<script type="application/ld+json">${JSON.stringify(structured).replace(/</g,'\\u003c')}</script>`);
 replace(/data-article-page="read"/,`data-article-page="read" data-article-id="${escape(id)}"`);
 replace(/<h1 data-article-title>[\s\S]*?<\/h1>/,`<h1 data-article-title>${escape(title)}</h1>`);
 replace(/<(div|p) data-article-meta><\/(?:div|p)>/,`<div data-article-meta>${metadata}</div>`);
 replace(/<p data-article-summary><\/p>/,`<p data-article-summary>${escape(summary)}</p>`);
 html=html.replace(/(<article\b[^>]*\bdata-article-body\b[^>]*>)[\s\S]*?(<\/article>)/,(_match,open,close)=>open+body+close);
 return new Response(html,{status:200,headers:{...noStore,'Content-Type':'text/html; charset=utf-8'}});
}

export async function articleSitemap({env}){
 const entries=[];let offset=0;
 try{
  for(let page=0;page<100;page++){
   const response=await fetch(`${apiBase(env)}/api/articles/sitemap?offset=${offset}`,{signal:AbortSignal.timeout(10000),headers:{Accept:'application/json'}});
   if(!response.ok)throw Error('Sitemap service unavailable');
   const data=await response.json();
   for(const row of data.items||[]){if(!/^[a-z0-9-]{1,120}$/.test(row.id)||!['zh','ja','en'].includes(row.locale))continue;for(const locale of row.locale==='zh'?['zh','zh-tw','zh-hk']:[row.locale])entries.push({url:canonical(locale,row.id),updatedAt:row.updatedAt});}
   if(data.nextOffset===null)break;
   if(!Number.isInteger(data.nextOffset)||data.nextOffset<=offset)throw Error('Invalid sitemap cursor');
   offset=data.nextOffset;
  }
 }catch{return new Response('Sitemap service unavailable',{status:503,headers:noStore});}
 const xmlBody=`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.map(row=>`<url><loc>${xml(row.url)}</loc>${/^\d{4}-\d\d-\d\d/.test(row.updatedAt||'')?`<lastmod>${xml(String(row.updatedAt).slice(0,10))}</lastmod>`:''}</url>`).join('\n')}\n</urlset>`;
 return new Response(xmlBody,{headers:{'Content-Type':'application/xml; charset=utf-8',...noStore}});
}
