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

export function annotateActivityDeadlines(root,copy={},now=Date.now()){
 if(!root)return;
 for(const row of root.querySelectorAll('.activity-deadline-row')){
  const badge=row.querySelector('[data-deadline-countdown]');if(!badge)continue;
  let diffDays=null;
  if(row.dataset.deadlineAt){
   const ms=Date.parse(row.dataset.deadlineAt)-now;
   if(Number.isFinite(ms))diffDays=ms<0?-1:Math.ceil(ms/86400000);
  }else if(row.dataset.deadlineDate){
   try{
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:row.dataset.deadlineZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));
    const ms=Date.parse(row.dataset.deadlineDate+'T00:00:00Z')-Date.parse(today+'T00:00:00Z');
    if(Number.isFinite(ms))diffDays=Math.round(ms/86400000);
   }catch{}
  }
  if(diffDays===null)continue;
  if(diffDays<0){badge.textContent=copy.deadlinePassed||'';badge.dataset.state='passed';}
  else if(diffDays===0){badge.textContent=copy.deadlineToday||'';badge.dataset.state='urgent';}
  else{badge.textContent=(copy.deadlineDaysLeft||'{n}d').replace('{n}',String(diffDays));badge.dataset.state=diffDays<=7?'urgent':'upcoming';}
 }
}

export function participationLinks(item,now=Date.now()){
 const links=(item.links||[]).filter(l=>safeHref(l.url)&&(!l.startsAt||Date.parse(l.startsAt)<=now)&&(!l.endsAt||Date.parse(l.endsAt)>now));
 const primary=['cancelled','postponed'].includes(item.eventStatus||item.status)?null:links.find(l=>l.primary)||links.find(l=>['registration','submission','live','replay'].includes(l.role))||links[0];
 return {links,primary};
}

// body/facts/credits are HTML from the existing sanitized Markdown and escaped
// metadata renderers. All activity values and outbound URLs are escaped here.
export function activityDetailMarkup(item,{locale='zh',copy:c={},bodyHtml='',factsHtml='',creditHtml='',originalHtml='',text=String,now=Date.now(),api=''}={}){
 const v=value=>escape(text(value||'')),{links,primary}=participationLinks(item,now);
 const actionLink=(link,{isPrimary=false,tone=isPrimary?'primary':'secondary',cls=''}={})=>`<a class="context-action${isPrimary?' activity-primary':''}${cls?' '+cls:''}" data-tone="${tone}" href="${safeHref(link.url)}" target="_blank" rel="noopener noreferrer"${links.includes(link)?' data-activity-outbound':''}><span class="context-action__label">${v(link.label||c[link.role+'Link']||c.primary)}</span><span class="context-action__arrow" aria-hidden="true">${iconMarkup('arrow-up-right')}</span></a>`;
 const poster=item.poster||item.media?.find(m=>m.role==='poster')?.src,posterHref=safeHref(poster);
 const place=item.locationPrecision==='pending'?c.pending:formatCommunityLocation(item,locale,text);
 const activeOtherLinks=links.filter(l=>l!==primary);
 const referenceLinks=[...(safeHref(item.sourceUrl)?[{label:c.source,url:item.sourceUrl}]:[]),...(safeHref(item.organizerUrl)?[{label:c.organizer||item.organizerUrl,url:item.organizerUrl}]:[])];
 const section=(html,pattern,id)=>{let found=false;const result=html.replace(/<h([23])([^>]*)>([\s\S]*?)<\/h\1>/gi,(match,level,attrs,title)=>{if(found||!pattern.test(title.replace(/<[^>]+>/g,'')))return match;found=true;if(new RegExp(`\\bid="${id}"`).test(attrs)||html.includes(`id="${id}"`))return match;return /\bid=/.test(attrs)?`<span id="${id}" class="activity-section-anchor" aria-hidden="true"></span>${match}`:`<h${level}${attrs} id="${id}">${title}</h${level}>`;});return {html:result,found};};
 const note=section(bodyHtml,/注意|须知|須知|notes|notice/i,'activity-notes');
 bodyHtml=note.html;
 const participation=section(bodyHtml,/参与|參與|participation|参加/i,'activity-participation');bodyHtml=participation.html;
 const state=item.eventStatus&&item.eventStatus!=='scheduled'?item.eventStatus:item.status;
 const status=['upcoming','ongoing','ended','cancelled','postponed'].includes(state)?c[state]:'',category=c[item.category]||'',modeLabel=c[item.mode]||'';
 const nav=[...(bodyHtml.trim()?[['introduction',c.introduction]]:[]),...(participation.found||primary?[['participation',c.participate]]:[]),['schedule',c.timeline],...(note.found?[['notes',c.notes]]:[])];
 const fact=(label,value,cls='',attrs='')=>value?`<div${cls?` class="${cls}"`:''}${attrs?' '+attrs:''}><dt>${escape(label)}</dt><dd>${value}</dd></div>`:'';
 const deadlines=(item.deadlines||[]).map(d=>{
  const s=d.schedule||{},attr=s.kind==='timed'&&s.startAt?`data-deadline-at="${escape(s.startAt)}"`:s.kind==='allDay'&&s.startDate?`data-deadline-date="${escape(s.startDate)}" data-deadline-zone="${escape(s.timeZone||'UTC')}"`:'';
  return fact(text(d.label)||c[d.type]||c.supportDeadline,`<span class="activity-deadline-value">${escape(scheduleText({schedule:d.schedule},locale,c))}</span><span class="activity-deadline-countdown" data-deadline-countdown></span>`+(d.schedule?.kind==='timed'?`<small class="activity-local" data-community-local-time="${escape(d.schedule.startAt)}"></small>`:''),'activity-deadline-row',attr);
 }).join('');
 const metaParts=[
  modeLabel?`<span>${escape(modeLabel)}</span>`:'',
  status?`<span class="activity-status" data-state="${escape(state)}">${escape(status)}</span>`:'',
  item.cooperation?`<span class="activity-status">${escape(c.cooperation)}</span>`:'',
  item.edition?`<span>${v(item.edition)}</span>`:'',
  item.organizer?`<span>${escape(c.organizer)} · ${v(item.organizer)}</span>`:''
 ].filter(Boolean).join('<span class="activity-meta-sep" aria-hidden="true">/</span>');
 const hasFacts=/<(dt|dd)\b/i.test(factsHtml);
 // Poster-first hero: left main artwork, right title/facts/actions, full prose below.
 return `<div class="reader-frame reader-heading-frame activity-top-frame mx-auto px-4 sm:px-6">
 <div class="activity-topbar"><nav class="wiki-article-breadcrumb" aria-label="${escape(c.title)}"><a href="/${locale}/">${escape(c.home)}</a><span aria-hidden="true">/</span><a data-activity-back href="/${locale}/community/activities/">${escape(c.communityTab)}</a>${category?`<span aria-hidden="true">/</span><span>${escape(category)}</span>`:''}</nav><div class="activity-tools-shell"><div class="wiki-article-actions activity-detail-tools" data-activity-detail-tools></div><p class="activity-share-status" data-activity-share-status role="status" aria-live="polite"></p></div></div></div>
 <div data-reader data-reader-variant="entry" class="reader-layout activity-showcase-layout${posterHref?' activity-showcase-layout--with-poster':''} reader-frame mx-auto px-4 sm:px-6">
 <aside class="reader-sidebar activity-poster-column"${posterHref?'':' hidden'}><section class="wiki-infobox entity-info activity-info ui-crosshair tl br" aria-label="${escape(c.activityInfo)}">${posterHref?`<figure class="activity-detail-art"><a href="${posterHref}" class="activity-poster-open" target="_blank" rel="noopener noreferrer" aria-label="${escape(c.viewPoster)}"><span class="activity-poster-media"><img class="community-detail-poster" ${galleryPreviewMarkup(poster,{api,sizes:'(max-width:767px) calc(100vw - 32px), 480px'})} alt="${v(item.title)}" fetchpriority="high"></span><span class="activity-poster-caption"><span class="activity-poster-caption__label">${escape(c.viewPoster)}</span>${iconMarkup('maximize')}</span></a></figure>`:''}</section></aside>
 <div class="activity-overview-column">
 <header class="wiki-article-header activity-article-header">
 ${metaParts?`<p class="activity-meta-line">${metaParts}</p>`:''}
 <div class="wiki-article-title-row"><div class="wiki-article-heading"><h1 class="wiki-page-title">${v(item.title)}</h1></div></div>
 ${item.summary?`<p class="wiki-article-description">${v(item.summary)}</p>`:''}
 ${item.changeNote?`<p class="wiki-article-description activity-change-note" data-state="${escape(state||'scheduled')}">${v(item.changeNote)}</p>`:''}
 ${originalHtml?`<div class="activity-original-note">${originalHtml}</div>`:''}
 </header>
 <section id="activity-schedule" class="activity-schedule-panel ui-crosshair tr" aria-label="${escape(c.activityInfo)}">
 <dl class="entity-info-facts activity-detail-essentials">${fact(c.timeline,escape(scheduleText(item,locale,c)),'activity-schedule-row--main')}${item.schedule?.kind==='timed'?fact(c.localTime,`<span data-community-local-time="${escape(item.schedule.startAt)}"></span>`,'activity-schedule-row--local'):''}${fact(c.locationShort,[c[item.mode],place].filter(Boolean).map(v).join(' · ')||escape(c.pending),'activity-schedule-row--place')}${deadlines}</dl>
 ${hasFacts?`<details class="entity-info-more"><summary>${escape(c.moreInfo)}</summary><div class="entity-info-more-body">${factsHtml}</div></details>`:factsHtml?`<div hidden>${factsHtml}</div>`:''}
 </section>
 <div id="${participation.found?'activity-entry':'activity-participation'}" class="activity-detail-participation">${primary?actionLink(primary,{isPrimary:true}):''}${activeOtherLinks.map(l=>actionLink(l,{tone:'secondary'})).join('')}${referenceLinks.map(l=>actionLink(l,{tone:'quiet',cls:'activity-reference-link'})).join('')}${item.seriesId?`<a class="context-action activity-reference-link" data-tone="quiet" href="/${locale}/community/series/${escape(item.seriesId)}/"><span class="context-action__label">${escape(c.series)}</span><span class="context-action__arrow" aria-hidden="true">${iconMarkup('arrow-right')}</span></a>`:''}</div>
 </div>
 <nav class="entity-section-nav activity-document-nav ui-crosshair tr" aria-label="${escape(c.title)}">${nav.map(([id,label])=>`<a href="#activity-${id}">${escape(label)}</a>`).join('')}</nav>
 <div class="reader-body activity-prose-column">
 <article id="activity-introduction" class="community-detail-body wiki-reader wiki-prose prose prose-invert max-w-none" lang="${escape(locale)}">${bodyHtml}</article>
 ${creditHtml?`<details class="activity-detail-credits"><summary>${escape(c.materialCredits)}</summary><div class="activity-detail-credits-body">${creditHtml}</div></details>`:''}</div>
 </div>`;
}
