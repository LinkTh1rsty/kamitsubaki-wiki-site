import {archiveOnThisDay} from '../lib/archiveResearch.mjs';
import {readBoundedJson} from '../lib/boundedJson.mjs';
const root=document.querySelector('[data-home-archive-day]');
if(root){
 const load=async()=>{
  const locale=root.dataset.locale,day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit'}).format(new Date()).replace('/','-');
  try{
   const response=await fetch('/api/archive/v1/calendar.json',{signal:AbortSignal.timeout(10000)});
   if(!response.ok)return;
   const data=await readBoundedJson(response,3*1024*1024),events=archiveOnThisDay({events:data.records},day,locale);
   root.querySelector('[data-home-day-status]').textContent=day+' · '+events.length;
   const list=root.querySelector('[data-home-day-events]');for(const event of events.slice(0,3)){const li=document.createElement('li'),a=document.createElement('a');a.href=event.path;a.textContent=event.date.start+' · '+event.title;li.append(a);list.append(li);}
  }catch{}
 };
 const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();void load();}},{rootMargin:'200px'});observer.observe(root);
}
