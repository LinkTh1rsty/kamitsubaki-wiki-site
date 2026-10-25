import {setIconLabel} from './icons.mjs';
import {articleEntities} from './articleEntities.mjs';
import {localizeArticleText,localizeArticleBody} from './articlePresentation.mjs';
import {articleCopy} from './articleCopy.mjs';
export function initArticleBrowser(root:HTMLElement){
 const api=root.dataset.articleApi||'',locale=root.dataset.locale||'zh';
 const copy=articleCopy(locale),contentLocale=locale.startsWith('zh')?'zh':locale;
 const status=root.querySelector<HTMLElement>('[data-article-status]')!;
 const call=async(path:string,signal?:AbortSignal)=>{const response=await fetch(api+'/api/articles'+path,{credentials:'include',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(8000)]):AbortSignal.timeout(8000)});const data=await response.json();if(!response.ok)throw Error(data.error?.message||copy.unavailable);return data;};
 const text=(tag:string,value:string)=>{const node=document.createElement(tag);setIconLabel(node,value);return node;};
 const safeLinks=(container:Element)=>container.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(a=>{if(a.origin!==location.origin){a.rel='noopener noreferrer';a.target='_blank';}});
 if(root.dataset.articlePage==='read'){
  const title=root.querySelector('[data-article-title]')!;
  const id=root.dataset.articleId||new URL(location.href).searchParams.get('id');
  if(!id){title.textContent=copy.title;status.textContent=copy.missing;return;}
  call('/items/'+encodeURIComponent(id)+'?locale='+contentLocale).then(async({article,fallback,permissions})=>{
   const displayTitle=await localizeArticleText(article.title,locale);title.textContent=displayTitle;document.title=displayTitle+' · Kamitsubaki Wiki';
   root.querySelector('[data-article-meta]')!.textContent=`${copy.origins[article.origin as keyof typeof copy.origins]} · ${article.author} · ${article.updatedAt} · v${article.version}`+(fallback?' · '+copy.fallback:'');
   const body=root.querySelector<HTMLElement>('[data-article-body]')!;const {articleHTML}=await import('./articleMarkdown');body.innerHTML=articleHTML(article.body,locale);await localizeArticleBody(body,locale);root.querySelector('[data-article-summary]')!.textContent=await localizeArticleText(article.summary,locale);
   let linksFailed=false;try{const {linkArticleBody}=await import('./articleWikiLinks');await linkArticleBody(body,locale);}catch{linksFailed=true;}const {enhanceReader}=await import('./readerEnhancements.mjs');enhanceReader(body,locale);body.addEventListener('click',async event=>{const target=event.target instanceof Element?event.target.closest('[data-load-media]'):null;if(target){const {loadPreviewMedia}=await import('./editorPreview.mjs');loadPreviewMedia(target);}});safeLinks(body);
   const toc=root.querySelector('[data-article-toc]')!;body.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h,i)=>{h.id='article-heading-'+i;const a=document.createElement('a');a.href='#'+h.id;a.textContent=h.textContent;a.className='article-toc-link';a.style.paddingInlineStart=`${(Number(h.tagName.slice(1))-1)*.5}rem`;toc.append(a);});
   root.querySelector<HTMLElement>('[data-article-toc-panel]')!.hidden=!toc.children.length;
   const edit=root.querySelector<HTMLAnchorElement>('[data-article-edit]')!;edit.href=`/${locale}/articles/submit/?id=${encodeURIComponent(id)}`;if(article.locale!==contentLocale)edit.href=`/${article.locale}/articles/submit/?id=${encodeURIComponent(id)}`;edit.hidden=!permissions?.canEdit;
   root.querySelector<HTMLElement>('[data-article-contribute]')!.hidden=Boolean(permissions?.canEdit);
   const share=root.querySelector<HTMLElement>('[data-share-popover]')!;share.dataset.sharePath=`/${locale}/articles/read/${encodeURIComponent(id)}/`;share.hidden=false;
   const relatedPanel=root.querySelector<HTMLElement>('[data-article-related-panel]')!;const links=root.querySelector('[data-article-related]')!;if(article.relatedEntities?.length)articleEntities(locale).then((entities:any[])=>{for(const id of article.relatedEntities){const entity=entities.find((e:{id:string})=>e.id===id);if(!entity)continue;const a=text('a',entity.name||entity.title||id) as HTMLAnchorElement;a.href=entity.path;links.append(a);}relatedPanel.hidden=!links.children.length;}).catch(()=>{relatedPanel.hidden=false;links.append(text('p',copy.relatedError));});
   status.textContent=linksFailed?copy.relatedError:'';
  }).catch(e=>{title.textContent=copy.title;status.textContent=e.message;});return;
 }
 let related=new URL(location.href).searchParams.get('related')||'';
 const write=root.querySelector<HTMLAnchorElement>('[data-article-write]')!,filter=root.querySelector<HTMLElement>('[data-related-filter]')!;
 const updateFilter=()=>{write.href=`/${locale}/articles/submit/`+(related?'?related='+encodeURIComponent(related):'');filter.hidden=!related;root.querySelector('[data-related-name]')!.textContent=related;const url=new URL(location.href);if(related)url.searchParams.set('related',related);else url.searchParams.delete('related');history.replaceState(null,'',url);if(related)void articleEntities(locale).then((entries:any[])=>{root.querySelector('[data-related-name]')!.textContent=entries.find(e=>e.id===related)?.name||related;}).catch(()=>{});};updateFilter();
 let offset:number|null=Math.max(0,Math.floor(Number(new URL(location.href).searchParams.get('offset'))||0)),controller:AbortController|undefined;const form=root.querySelector<HTMLFormElement>('form')!,grid=root.querySelector('[data-article-grid]')!,more=root.querySelector<HTMLButtonElement>('[data-article-more]')!;
 const state=root.querySelector<HTMLElement>('[data-article-state]')!;
 const emptyWrite=root.querySelector<HTMLAnchorElement>('[data-article-empty-write]')!;
 const retry=root.querySelector<HTMLButtonElement>('[data-article-retry]')!;
 const previous=root.querySelector<HTMLButtonElement>('[data-article-previous]')!;
 for(const name of ['q','category','origin','sort']){const value=new URL(location.href).searchParams.get(name);const control=form.elements.namedItem(name);if(value&&control instanceof HTMLElement&&(control instanceof HTMLInputElement||control instanceof HTMLSelectElement))control.value=value;}
 const load=async(reset=false)=>{
  controller?.abort();const current=controller=new AbortController();more.disabled=true;root.setAttribute('aria-busy','true');status.textContent=copy.loading;state.dataset.state='loading';emptyWrite.hidden=true;retry.hidden=true;previous.disabled=true;
  try{
   const q=new URLSearchParams(new FormData(form) as any);if(related)q.set('related',related);q.set('locale',contentLocale);q.set('offset',String(reset?0:offset||0));
   const page=await call('?'+q,current.signal);const localized=await Promise.all(page.items.map(async(article:any)=>({...article,title:await localizeArticleText(article.title,locale),summary:await localizeArticleText(article.summary,locale)})));if(current.signal.aborted)return;
   form.hidden=!localized.length&&!related&&!['q','category','origin'].some(name=>Boolean(q.get(name)));
   grid.replaceChildren();const address=new URL(location.href);for(const name of ['q','category','origin','sort','offset']){const value=q.get(name);if(value&&value!=='0'&&!(name==='sort'&&value==='newest'))address.searchParams.set(name,value);else address.searchParams.delete(name);}history.replaceState(null,'',address);
   for(const article of localized){const card=document.createElement('a');card.className='article-list-card';card.href=`/${locale}/articles/read/${encodeURIComponent(article.id)}/`;card.append(text('small',`${copy.origins[article.origin as keyof typeof copy.origins]} · ${article.updatedAt} · ${copy.categories[article.category as keyof typeof copy.categories]||article.category} · ${article.author}`),text('h2',article.title),text('p',article.summary),text('span',copy.read));grid.append(card);}
   const pageStart=Number(q.get('offset'));previous.hidden=pageStart===0;previous.onclick=()=>{offset=Math.max(0,pageStart-24);void load();};more.onclick=()=>void load();offset=page.nextOffset;more.hidden=offset===null;state.dataset.state=grid.children.length?'ready':'empty';emptyWrite.href=write.href;emptyWrite.hidden=Boolean(grid.children.length);status.textContent=grid.children.length?copy.shown.replace('{n}',String(grid.children.length)):copy.empty;
  }catch(e){if(current.signal.aborted)return;status.textContent=(e as Error).message;state.dataset.state='error';more.hidden=true;retry.hidden=false;retry.onclick=()=>void load(reset);}
  finally{if(controller===current){more.disabled=false;previous.disabled=false;root.removeAttribute('aria-busy');}}
 };
 root.querySelector<HTMLButtonElement>('[data-related-clear]')!.onclick=()=>{related='';updateFilter();void load(true);};
 window.addEventListener('popstate',()=>{const params=new URL(location.href).searchParams;for(const name of ['q','category','origin','sort']){const control=form.elements.namedItem(name) as HTMLInputElement|HTMLSelectElement;if(control)control.value=params.get(name)||'';}offset=Math.max(0,Math.floor(Number(params.get('offset'))||0));related=params.get('related')||'';updateFilter();void load();});
 form.addEventListener('change',e=>{if(e.target instanceof HTMLSelectElement)void load(true);});
 form.addEventListener('submit',e=>{e.preventDefault();more.onclick=()=>void load();void load(true);});
 // A trusted reset can checkpoint microtasks before its default action resets controls.
 form.addEventListener('reset',event=>window.setTimeout(()=>{if(event.defaultPrevented)return;related='';updateFilter();more.onclick=()=>void load();void load(true);},0));more.onclick=()=>void load();void load();
}
