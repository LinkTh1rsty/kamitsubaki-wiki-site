import {searchDocs} from '../lib/docsSearch.mjs';
export function initDocsSearch(root=document){
 for(const host of root.querySelectorAll('[data-docs-search]')){
  if(host.dataset.bound)continue;host.dataset.bound='true';
  const copy=JSON.parse(host.dataset.copy),dialog=host.querySelector('dialog');
  const trigger=host.querySelector('[data-docs-search-open]'),input=host.querySelector('input');
  const status=host.querySelector('[data-docs-search-status]'),retry=host.querySelector('[data-docs-search-retry]'),results=host.querySelector('[data-docs-search-results]');
  let entries,loading;
  const render=()=>{
   if(!entries)return;results.replaceChildren();
   const query=input.value.trim(),matches=searchDocs(entries,query);
   status.textContent=!query?copy.hint:matches.length?copy.results.replace('{count}',String(matches.length)):copy.empty;
   for(const match of matches){
    const link=document.createElement('a'),group=document.createElement('small'),title=document.createElement('strong'),snippet=document.createElement('span');
    link.href=match.href;group.textContent=match.group;title.textContent=match.title;snippet.textContent=match.snippet;
    link.append(group,title,snippet);results.append(link);
   }
  };
  const load=async()=>{
   if(entries){render();return;}if(loading)return loading;
   status.textContent=copy.loading;retry.hidden=true;
   loading=(async()=>{try{
    const response=await fetch(host.dataset.index);if(!response.ok)throw Error('Index unavailable');
    const data=await response.json(),prefix=host.dataset.index.replace(/search-index\.json$/,'');
    if(!Array.isArray(data.entries)||data.entries.some(entry=>!entry.href?.startsWith(prefix)||!['title','summary','body','group'].every(key=>typeof entry[key]==='string')))throw Error('Invalid index');
    entries=data.entries;render();
   }catch{status.textContent=copy.error;retry.hidden=false;}finally{loading=null;}})();return loading;
  };
  trigger.addEventListener('click',()=>{dialog.showModal();input.focus();void load();});
  host.querySelector('[data-docs-search-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>trigger.focus());
  dialog.addEventListener('click',event=>{if(event.target===dialog){const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();}});
  input.addEventListener('input',render);retry.addEventListener('click',()=>void load());
  input.addEventListener('keydown',event=>{
   if(event.isComposing||event.defaultPrevented)return;
   const first=results.querySelector('a');
   if(first&&event.key==='ArrowDown'){event.preventDefault();first.focus();}
   if(first&&event.key==='Enter'){event.preventDefault();first.click();}
  });
  results.addEventListener('keydown',event=>{
   if(!['ArrowDown','ArrowUp'].includes(event.key)||event.isComposing)return;
   const links=[...results.querySelectorAll('a')],at=links.indexOf(document.activeElement);if(at<0)return;
   event.preventDefault();const next=at+(event.key==='ArrowDown'?1:-1);
   if(next<0)input.focus();else links[Math.min(next,links.length-1)]?.focus();
  });
 }
}
