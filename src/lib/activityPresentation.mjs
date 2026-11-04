import {galleryPreviewMarkup} from './galleryPreviewImage.mjs';
import {formatCommunityLocation} from './communityLocationFormat.mjs';
import {iconMarkup} from './icons.mjs';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeHref=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?escape(u.href):'';}catch{return '';}};

export function scheduleText(item,locale,copy,{local=false,compact=false}={}){
 const s=item.schedule;if(!s||s.kind==='undated')return copy.undated;
 try{
  if(s.kind==='allDay'){
   // Calendar dates are wall dates, including the last day. Never convert them
   // through the visitor's zone (or apply the ICS exclusive-end rule here).
   const start=new Date(s.startDate+'T12:00:00Z'),end=new Date((s.endDate||s.startDate)+'T12:00:00Z');
   const format=new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
   if(s.startDate===(s.endDate||s.startDate))return format.format(start);
   if(/^(zh|ja)/.test(locale))return format.format(start)+' — '+new Intl.DateTimeFormat(locale,{...(s.startDate.slice(0,4)===s.endDate.slice(0,4)?{}:{year:'numeric'}),month:'long',day:'numeric',timeZone:'UTC'}).format(end);
   return format.formatRange(start,end);
  }
  const format=value=>new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeStyle:'short',...(local?{}:{timeZone:s.timeZone})}).format(new Date(value));
  return format(s.startAt)+(s.endAt?' – '+format(s.endAt):compact?'':' · '+copy.endUnknown)+' · '+(local?copy.localTime:s.timeZone);
 }catch{return copy.undated;}
}
export function formatActivityTimeForDay(item,dayKey,locale,viewerTimeZone=Intl.DateTimeFormat().resolvedOptions().timeZone,copy={allDay:'全天',endUnknown:'结束时间未公布',localTime:'本地'}){
 const s=item.schedule;if(!s||s.kind==='undated')return scheduleText(item,locale,copy);
 const day=(at,zone)=>new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(at));
 if(s.kind==='allDay')return s.startDate===dayKey&&(s.endDate||s.startDate)===dayKey?copy.allDay:scheduleText(item,locale,copy);
 if(day(s.startAt,s.timeZone)!==dayKey||s.endAt&&day(s.endAt,s.timeZone)!==dayKey){
  const original=scheduleText(item,locale,copy);
  if(viewerTimeZone===s.timeZone)return original;
  const localDateTime=at=>new Intl.DateTimeFormat(locale,{timeZone:viewerTimeZone,dateStyle:'medium',timeStyle:'short',hourCycle:'h23'}).format(new Date(at));
  return original+'（'+copy.localTime+' '+localDateTime(s.startAt)+(s.endAt?' – '+localDateTime(s.endAt):' · '+copy.endUnknown)+' · '+viewerTimeZone+'）';
 }
 const time=(at,zone)=>new Intl.DateTimeFormat(locale,{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(at));
 const range=zone=>time(s.startAt,zone)+(s.endAt?' – '+time(s.endAt,zone):' · '+copy.endUnknown);
 const local=viewerTimeZone===s.timeZone?'': '（'+copy.localTime+' '+(day(s.startAt,viewerTimeZone)!==dayKey?day(s.startAt,viewerTimeZone)+' ':'')+range(viewerTimeZone)+(s.endAt&&day(s.endAt,viewerTimeZone)!==day(s.startAt,viewerTimeZone)?' '+day(s.endAt,viewerTimeZone):'')+' · '+viewerTimeZone+'）';
 return range(s.timeZone)+' · '+s.timeZone+local;
}

export function participationLinks(item,now=Date.now()){
 const links=(item.links||[]).filter(l=>safeHref(l.url)&&(!l.startsAt||Date.parse(l.startsAt)<=now)&&(!l.endsAt||Date.parse(l.endsAt)>now));
 const primary=['cancelled','postponed'].includes(item.eventStatus||item.status)?null:links.find(l=>l.primary)||links.find(l=>['registration','submission','live','replay'].includes(l.role))||links[0];
 return {links,primary};
}

// body/facts/credits are HTML from the existing sanitized Markdown and escaped
// metadata renderers. All activity values and outbound URLs are escaped here.
export function activityDetailMarkup(item,{locale,copy:c,bodyHtml='',factsHtml='',creditHtml='',originalHtml='',text=String,now,api}={}){
 const v=value=>escape(text(value||'')),{links,primary}=participationLinks(item,now);
 const external=(link,cls='')=>`<a class="${cls}"${link===primary?' data-tone="primary"':''} href="${safeHref(link.url)}" target="_blank" rel="noopener noreferrer"${links.includes(link)?' data-activity-outbound':''}>${v(link.label||c[link.role+'Link']||c.primary)}${link===primary?iconMarkup('arrow-up-right'):''}</a>`;
 const poster=item.poster||item.media?.find(m=>m.role==='poster')?.src,posterHref=safeHref(poster);
 const place=item.locationPrecision==='pending'?c.pending:formatCommunityLocation(item,locale,text);
 const secondary=[...links.filter(l=>l!==primary),...(safeHref(item.sourceUrl)?[{label:c.source,url:item.sourceUrl}]:[]),...(safeHref(item.organizerUrl)?[{label:c.organizerUrl,url:item.organizerUrl}]:[])];
 const section=(html,pattern,id)=>{let found=false;const result=html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,(match,level,attrs,title)=>{if(found||!pattern.test(title.replace(/<[^>]+>/g,'')))return match;found=true;if(new RegExp(`\\bid="${id}"`).test(attrs)||html.includes(`id="${id}"`))return match;return /\bid=/.test(attrs)?`<span id="${id}" class="activity-section-anchor" aria-hidden="true"></span>${match}`:`<h${level}${attrs} id="${id}">${title}</h${level}>`;});return {html:result,found};};
 const note=section(bodyHtml,/注意|须知|須知|notes|notice/i,'activity-notes');
 bodyHtml=note.html;
 const participation=section(bodyHtml,/参与|參與|participation|参加/i,'activity-participation');bodyHtml=participation.html;
 const state=item.eventStatus&&item.eventStatus!=='scheduled'?item.eventStatus:item.status;
 const status=['ongoing','ended','cancelled','postponed'].includes(state)?c[state]:'',category=c[item.category]||'';
 const nav=[...(bodyHtml.trim()?[['introduction',c.introduction]]:[]),...(participation.found||primary?[['participation',c.participate]]:[]),['schedule',c.timeline],...(note.found?[['notes',c.notes]]:[])];
 const fact=(label,value)=>value?`<div><dt>${escape(label)}</dt><dd>${value}</dd></div>`:'';
 const deadlines=(item.deadlines||[]).map(d=>fact(text(d.label)||c[d.type]||c.supportDeadline,escape(scheduleText({schedule:d.schedule},locale,c))+(d.schedule?.kind==='timed'?`<small class="activity-local" data-community-local-time="${escape(d.schedule.startAt)}"></small>`:''))).join('');
 // These are the same header, reading frame, infobox and action primitives used
 // by EntityArticle. The Worker and browser share this renderer.
 return `<div class="reader-frame reader-heading-frame mx-auto px-4 sm:px-6">
 <header class="wiki-article-header"><nav class="wiki-article-breadcrumb" aria-label="${escape(c.title)}"><a href="/${locale}/">${escape(c.home)}</a><span aria-hidden="true">/</span><a data-activity-back href="/${locale}/community/activities/">${escape(c.communityTab)}</a>${category?`<span aria-hidden="true">/</span><span>${escape(category)}</span>`:''}</nav>
 <div class="wiki-article-title-row"><div class="wiki-article-heading"><h1 class="wiki-page-title">${v(item.title)}</h1></div><div class="wiki-article-actions activity-detail-tools" data-activity-detail-tools></div></div>
 ${item.summary?`<p class="wiki-article-description">${v(item.summary)}</p>`:''}
 <div id="${participation.found?'activity-entry':'activity-participation'}" class="activity-detail-participation">${primary?external(primary,'context-action activity-primary'):''}${status?`<span class="activity-status" data-state="${escape(state)}">${escape(status)}</span>`:''}${item.cooperation?`<span class="activity-status">${escape(c.cooperation)}</span>`:''}</div>${item.changeNote?`<p class="wiki-article-description">${v(item.changeNote)}</p>`:''}${originalHtml}</header>
 <nav class="entity-section-nav activity-document-nav" aria-label="${escape(c.title)}">${nav.map(([id,label])=>`<a href="#activity-${id}">${escape(label)}</a>`).join('')}</nav></div>
 <div data-reader data-reader-variant="entry" class="reader-layout reader-frame mx-auto px-4 sm:px-6 grid items-start gap-8">
 <div class="reader-body">


 <article id="activity-introduction" class="community-detail-body wiki-reader wiki-prose" lang="${escape(locale)}">${bodyHtml}</article>
 ${creditHtml?`<details class="activity-detail-credits"><summary>${escape(c.materialCredits)}</summary>${creditHtml}</details>`:''}</div>
 <aside class="reader-sidebar"><section id="activity-schedule" class="wiki-infobox entity-info activity-info" aria-label="${escape(c.activityInfo)}"><header><h2>${escape(c.activityInfo)}</h2></header>${posterHref?`<figure class="activity-detail-art"><a href="${posterHref}" class="activity-poster-open" target="_blank" rel="noopener noreferrer" aria-label="${escape(c.viewPoster)}"><span class="activity-poster-frame"><img class="community-detail-poster" ${galleryPreviewMarkup(poster,{api,sizes:'(max-width:767px) 320px, 360px'})} alt="${v(item.title)}" fetchpriority="high"></span><span class="activity-poster-caption">${escape(c.viewPoster)}${iconMarkup('arrow-up-right')}</span></a></figure>`:''}<div class="entity-info-body">
 <dl class="entity-info-facts activity-detail-essentials">${fact(c.timeline,escape(scheduleText(item,locale,c)))}${item.schedule?.kind==='timed'?fact(c.localTime,`<span data-community-local-time="${escape(item.schedule.startAt)}"></span>`):''}${fact(c.locationShort,[c[item.mode],place].filter(Boolean).map(v).join(' · ')||escape(c.pending))}${deadlines}</dl>
 ${factsHtml||secondary.length||item.seriesId?`<details class="entity-info-more"><summary>${escape(c.moreInfo)}</summary><div class="entity-info-more-body">${factsHtml}${secondary.length||item.seriesId?`<div class="activity-detail-links">${secondary.map(l=>external(l)).join('')}${item.seriesId?`<a href="/${locale}/community/series/${escape(item.seriesId)}/">${escape(c.series)}</a>`:''}</div>`:''}</div></details>`:''}
 </div></section></aside></div>`;
}
