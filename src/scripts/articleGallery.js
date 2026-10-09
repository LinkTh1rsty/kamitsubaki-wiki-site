import {articleCreationCopy} from '../lib/articleCreationCopy.mjs';
// Article-only public picker: no upload or private gallery API is exposed here.
export function mountArticleGallery(root,{api,onChoose}){
 const $=s=>root.querySelector(s),copy=articleCreationCopy(root.dataset.locale),editor=JSON.parse($('[data-editor-copy]').textContent),list=$('[data-article-gallery-results]'),status=$('[data-article-gallery-status]'),search=$('[data-article-gallery-search]'),more=$('[data-article-gallery-more]');
 let next=null,epoch=0,controller,timer,disposed=false;
 const request=async(path,signal)=>{const response=await fetch(api+'/api/gallery'+path,{cache:'no-store',signal});const data=await response.json();if(!response.ok)throw Error(data.error?.message||editor.loadFailed);return data;};
 async function load(append=false){if(disposed)return;controller?.abort();controller=new AbortController();const token=++epoch;more.disabled=true;status.textContent=copy.loadingGallery;if(!append){list.replaceChildren();next=null;}
  try{const query=new URLSearchParams({offset:String(append?next||0:0)});if(search.value.trim())query.set('q',search.value.trim());const data=await request('/items?'+query,controller.signal);if(token!==epoch)return;
   for(const item of data.items){const row=document.createElement('article'),img=new Image(),title=document.createElement('strong'),button=document.createElement('button');row.className='article-gallery-choice';img.alt=item.title||'';img.loading='lazy';if(/^https?:\/\//.test(item.thumbnail||item.src||''))img.src=item.thumbnail||item.src;title.textContent=item.title||item.id;button.type='button';button.textContent=copy.insertPublic;button.onclick=async()=>{button.disabled=true;try{const {item:current}=await request('/items/'+encodeURIComponent(item.id),AbortSignal.timeout(15000));if(disposed)return;onChoose(current);}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};row.append(img,title,button);list.append(row);}
   next=data.nextOffset;more.hidden=next==null;status.textContent=list.children.length?'':copy.emptyGallery;
  }catch(error){if(token===epoch&&error.name!=='AbortError')status.textContent=error.message;}finally{if(token===epoch)more.disabled=false;}
 }
 search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>void load(),250);});more.onclick=()=>void load(true);
 return {load,dispose(){disposed=true;++epoch;clearTimeout(timer);controller?.abort();}};
}
