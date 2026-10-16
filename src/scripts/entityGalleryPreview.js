import {setIconLabel} from '../lib/icons.mjs';
import {imageViewer} from '../lib/imageViewer.mjs';

export function initEntityGalleryPreviews(){
 for(const root of document.querySelectorAll('[data-entity-gallery]:not([data-initialized])')){
  root.dataset.initialized='';
  const load=async()=>{
   try{const query=new URLSearchParams({entity:root.dataset.entity,offset:'0'}),response=await fetch(root.dataset.api.replace(/\/$/,'')+'/api/gallery/items?'+query,{signal:AbortSignal.timeout(15000)});if(!response.ok)return;const data=await response.json();if(Number.isSafeInteger(data.total) && data.total>=0){for(const hub of document.querySelectorAll('[data-entity-archive-hub]'))if(hub.dataset.entity===root.dataset.entity){const count=hub.querySelector('[data-hub-gallery-count]');if(count)count.textContent=String(data.total);}}if(!data.items?.length)return;
    const copy=JSON.parse(root.dataset.copy||'{}'),locale=root.dataset.locale,images=root.querySelector('[data-gallery-images]'),items=data.items.slice(0,6);
    const view=items.map(item=>({id:item.id,src:item.src,title:item.title||copy.title,notes:item.notes||'',links:[{href:`/${locale}/gallery/classify/?photo=${encodeURIComponent(item.id)}&returnTo=${encodeURIComponent(location.pathname)}`,label:copy.classify},...(item.sourceUrl?[{href:item.sourceUrl,label:item.sourceTitle||copy.source}]:[]),{href:item.src,label:copy.original}]}));
    setIconLabel(root.querySelector('[data-gallery-all]'),`${copy.all} (${data.total}) →`);
    for(const [index,item] of items.entries()){const button=document.createElement('button'),image=new Image();button.type='button';button.setAttribute('aria-label',item.title||copy.title);image.src=item.thumbnail||item.src;image.alt=item.title||copy.title;image.loading='lazy';button.append(image);button.onclick=()=>imageViewer().open(view,index,button,{photoFirst:true});images.append(button);}root.hidden=false;
   }catch{/* The article remains fully readable when the gallery API is unavailable. */}
  };
  void load();
 }
}
