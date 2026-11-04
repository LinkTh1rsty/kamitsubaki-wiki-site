import test from 'node:test';
import assert from 'node:assert/strict';
import {activityCopy} from '../src/lib/activityCopy.mjs';
import {activityHref,scheduleText,nextDeadline,getActivities} from '../src/lib/activityClient.js';

const copy=activityCopy('zh');
test('official links remain external while project links retain canonical identity and placement',()=>{
 assert.equal(activityHref({source:'official',sourceUrl:'https://example.org/official'},'zh','home'),'https://example.org/official');
 assert.equal(activityHref({source:'community',id:'same-id'},'zh'),'/'+'zh/community/activities/same-id/');
 assert.equal(activityHref({source:'community',id:'same-id'},'zh','home'),'/zh/community/activities/same-id/?entry=home');
});
test('calendar copy covers all five locales and all-day dates never shift with time zones',()=>{
 for(const locale of ['zh','zh-tw','zh-hk','ja','en'])assert.ok(activityCopy(locale).shareImage);
 const schedule={kind:'allDay',timeZone:'Pacific/Honolulu',startDate:'2026-10-31',endDate:'2026-11-02'};
 assert.equal(scheduleText({schedule},'zh',copy,{local:true}),'2026年10月31日 — 11月2日');
 assert.equal(scheduleText({schedule},'zh',copy),scheduleText({schedule},'zh',copy,{local:true}));
 assert.equal(scheduleText({schedule:{...schedule,startDate:'2026-12-31',endDate:'2027-01-01'}},'zh',copy),'2026年12月31日 — 2027年1月1日');
 const timed={kind:'timed',timeZone:'Asia/Tokyo',startAt:'2026-10-31T15:30:00Z'};
 assert.ok(scheduleText({schedule:timed},'zh',copy).includes(copy.endUnknown));assert.ok(scheduleText({schedule:timed},'zh',copy).includes('11月1日'));
});
test('expired all-day deadlines are evaluated in the organizer time zone',()=>{
 const deadlines=[{type:'registration',schedule:{kind:'allDay',timeZone:'Asia/Tokyo',startDate:'2026-10-31'}}];
 assert.equal(nextDeadline({deadlines},'zh',copy,Date.parse('2026-10-31T18:00Z')),'');
 assert.ok(nextDeadline({deadlines},'zh',copy,Date.parse('2026-10-31T01:00Z')).includes(copy.registration));
});
test('failed reads only recover the exact query cache and never swallow a cancellation',async()=>{
 const originalFetch=globalThis.fetch,oldStorage=globalThis.localStorage,cache=new Map();
 globalThis.localStorage={setItem:(k,v)=>cache.set(k,v),getItem:k=>cache.get(k)||null};
 try{
  globalThis.fetch=async()=>Response.json({items:[{id:'a'}],cache:{stale:false,available:true}});
  await getActivities('https://api.example',{source:'official',q:'KAF'});
  globalThis.fetch=async()=>{throw Error('offline');};
  assert.equal((await getActivities('https://api.example',{source:'official',q:'KAF'})).cache.stale,true);
  await assert.rejects(getActivities('https://api.example',{source:'community',q:'KAF'}));
  globalThis.fetch=async()=>{throw new DOMException('cancelled','AbortError');};
  await assert.rejects(getActivities('https://api.example',{source:'official',q:'KAF'}),e=>e.name==='AbortError');
 }finally{globalThis.fetch=originalFetch;if(oldStorage===undefined)delete globalThis.localStorage;else globalThis.localStorage=oldStorage;}
});

test('detail presentation keeps full artwork, original text, one title and reachable section navigation',async()=>{
 const {JSDOM}=await import('jsdom'),{activityDetailMarkup}=await import('../src/lib/activityPresentation.mjs');
 for(const locale of ['zh','zh-tw','zh-hk','ja','en']){
  const c=activityCopy(locale),item={title:'A < B & "C"',poster:'https://images.example/full.png',status:'upcoming',schedule:{kind:'allDay',timeZone:'Pacific/Honolulu',startDate:'2026-10-31',endDate:'2026-11-02'},links:[{label:'Join',url:'https://example.org/join',primary:true}],media:[]};
  const dom=new JSDOM(activityDetailMarkup(item,{locale,copy:c,bodyHtml:'<h2>参与方式</h2><p>Original <em>body</em>.</p><h2>注意事项</h2><p>Keep this notice.</p>',factsHtml:'<dl class="community-facts"><dt>Deadline</dt><dd>2026-10-26</dd></dl>',creditHtml:'<p class="community-image-credit">Creator ©</p>'})),d=dom.window.document;
  assert.equal(d.querySelectorAll('h1').length,1);assert.equal(d.querySelector('h1').textContent,item.title);assert.equal(d.querySelector('.activity-poster-open').href,item.poster);assert.equal(d.querySelector('.community-detail-body p').innerHTML,'Original <em>body</em>.');assert.ok(d.body.textContent.includes('Creator ©'));
  for(const a of d.querySelectorAll('.activity-document-nav a'))assert.ok(d.querySelector(a.hash),a.hash);
  assert.ok(d.querySelector('.activity-detail-essentials').textContent.includes(scheduleText(item,locale,c)));
  assert.ok(d.querySelector('.wiki-article-header .wiki-page-title'));assert.ok(d.querySelector('[data-reader] .reader-sidebar .entity-info'));assert.equal(d.querySelectorAll('.activity-primary').length,1);assert.equal(d.querySelector('.activity-primary').href,'https://example.org/join');dom.window.close();
 }
});
test('primary participation respects validity windows and cancellation without dropping secondary links',async()=>{
 const {participationLinks,activityDetailMarkup}=await import('../src/lib/activityPresentation.mjs'),{JSDOM}=await import('jsdom'),now=Date.parse('2026-10-20T12:00Z');
 const item={title:'Undated',links:[{primary:true,url:'https://example.org/expired',endsAt:'2026-10-19T12:00Z'},{role:'registration',url:'https://example.org/future',startsAt:'2026-10-21T12:00Z'},{role:'live',url:'https://example.org/live'},{primary:true,url:'javascript:alert(1)'}]};
 assert.equal(participationLinks(item,now).primary.url,'https://example.org/live');
 const cancelled={...item,eventStatus:'cancelled'};assert.equal(participationLinks(cancelled,now).primary,null);
 const dom=new JSDOM(activityDetailMarkup(cancelled,{locale:'en',copy:activityCopy('en'),now}));assert.equal(dom.window.document.querySelector('.activity-primary'),null);assert.equal(dom.window.document.querySelector('figure'),null);assert.equal(dom.window.document.querySelector('a[href^="javascript:"]'),null);assert.ok(dom.window.document.querySelector('a[href="https://example.org/live"]'));dom.window.close();
});

test('an undated reader states the missing time once, preserves heading links and adds no invented prose',async()=>{
 const {JSDOM}=await import('jsdom'),{activityDetailMarkup}=await import('../src/lib/activityPresentation.mjs');
 const body='<h2 id="original-participation">参与方式</h2><p>Original instructions.</p>';
 const item={title:'Future project',status:'undated',schedule:{kind:'undated'},links:[]};
 const first=new JSDOM(activityDetailMarkup(item,{locale:'zh',copy,bodyHtml:body}));const d=first.window.document;
 assert.equal(d.querySelectorAll('#original-participation').length,1);assert.ok(d.querySelector('#activity-participation'));
 assert.equal(d.body.textContent.split(copy.undated).length-1,1);assert.equal(d.querySelector('#activity-notes'),null);
 assert.deepEqual([...d.querySelectorAll('.community-detail-body p')].map(n=>n.textContent),['Original instructions.']);
 const second=new JSDOM(activityDetailMarkup(item,{locale:'zh',copy,bodyHtml:d.querySelector('.community-detail-body').innerHTML}));
 assert.equal(second.window.document.querySelectorAll('#activity-participation').length,1);assert.equal(second.window.document.querySelectorAll('#original-participation').length,1);
 for(const a of second.window.document.querySelectorAll('.activity-document-nav a'))assert.ok(second.window.document.querySelector(a.hash),a.hash);
 first.window.close();second.window.close();
});

test('range transitions return to a usable month and yearly history windows do not overlap',async()=>{
 const {readActivityState,transitionActivity,activityRange,pastActivities}=await import('../src/lib/activityCenterState.mjs');
 const today='2026-10-25',initial=readActivityState(new URLSearchParams('range=next&view=agenda&month=2027-01'),today);
 const monthly=transitionActivity(initial,'calendar',today);assert.equal(monthly.range,'month');assert.equal(monthly.view,'calendar');assert.equal(monthly.month,'2027-01');
 const past=transitionActivity(initial,'past',today),a=activityRange(past,today),b=activityRange(transitionActivity(past,'older',today),today);
 assert.equal(a.to,today,'include events that finished earlier today');
 assert.equal(Date.parse(a.from)-Date.parse(b.to),86400000);assert.ok((Date.parse(a.to)-Date.parse(a.from))/86400000<400);
 const query=activityRange(monthly,today,'keyword');assert.equal((Date.parse(query.to)-Date.parse(query.from))/86400000,360);
 const item={id:'past',eventStatus:'scheduled',schedule:{kind:'allDay',timeZone:'Asia/Tokyo',startDate:'2026-10-01',endDate:'2026-10-02'}};
 assert.equal(pastActivities([{id:'today',eventStatus:'scheduled',schedule:{kind:'timed',timeZone:'UTC',startAt:today+'T01:00:00Z',endAt:today+'T02:00:00Z'}}],a,Date.parse(today+'T12:00Z')).length,1);
 assert.deepEqual(pastActivities([item,item,{...item,id:'future',schedule:{...item.schedule,endDate:'2027-01-01'}},{...item,id:'unknown',schedule:{kind:'timed',timeZone:'UTC',startAt:'2026-01-01T00:00Z'}}],a,Date.parse(today+'T12:00Z')).map(x=>x.id),['past']);
});

test('same-day time compression retains original zone and cross-date local meaning',async()=>{
 const {formatActivityTimeForDay}=await import('../src/lib/activityPresentation.mjs');
 const item={schedule:{kind:'timed',timeZone:'Asia/Tokyo',startAt:'2026-10-25T00:00:00+09:00',endAt:'2026-10-25T01:00:00+09:00'}};
 const output=formatActivityTimeForDay(item,'2026-10-25','en','America/Los_Angeles',activityCopy('en'));
 assert.ok(output.includes('Asia/Tokyo'));assert.ok(output.includes('24'));assert.ok(output.includes('America/Los_Angeles'));
});

test('details keep the poster exclusively in the information sidebar and a plain participation link is actionable',async()=>{
 const {JSDOM}=await import('jsdom'),{activityDetailMarkup,participationLinks}=await import('../src/lib/activityPresentation.mjs');
 const item={id:'plain',title:'Plain',poster:'https://example.org/poster.png',schedule:{kind:'undated'},links:[{label:'Join',url:'https://example.org/join'}]};
 assert.equal(participationLinks(item).primary.url,item.links[0].url);
 const dom=new JSDOM(activityDetailMarkup(item,{locale:'en',copy:activityCopy('en'),bodyHtml:'<p>Intro</p>'}));
 assert.equal(dom.window.document.querySelector('.reader-body .activity-detail-art'),null);
 assert.ok(dom.window.document.querySelector('.reader-sidebar .activity-info .activity-poster-open'));
 dom.window.close();
});


test('reading-index cards have one detail link and do not invent time or actions for undated projects',async()=>{
 const {JSDOM}=await import('jsdom'),{activityCard}=await import('../src/lib/activityClient.js'),dom=new JSDOM('<body/>'),old=globalThis.document;
 globalThis.document=dom.window.document;
 try {
  const options={locale:'zh',copy,base:'https://api.example',onJump:()=>{}};
  const unknown=activityCard({id:'unknown',title:'时间待定',source:'community',schedule:{kind:'undated'}},options);
  assert.equal(unknown.querySelectorAll('a').length,1);assert.equal(unknown.querySelector('.activity-card__primary').textContent,copy.details);assert.equal(unknown.querySelector('.activity-jump'),null);
  const dated=activityCard({id:'dated',title:'日期已知',source:'community',schedule:{kind:'allDay',timeZone:'Asia/Shanghai',startDate:'2027-04-04',endDate:'2027-04-04'}},{...options,dayKey:'2027-04-04'});
  assert.equal(dated.querySelector('.activity-date'),null,'a known date does not imply all-day opening hours');assert.equal(dated.querySelectorAll('a[href*="/zh/community/activities/"]').length,1);assert.ok(dated.querySelector('a[href*="calendar.ics"]'));assert.ok(dated.querySelector('.activity-jump'));
 } finally {if(old===undefined)delete globalThis.document;else globalThis.document=old;dom.window.close();}
});

test('cross-midnight agenda retains the full viewer-local date and time range',async()=>{
 const {formatActivityTimeForDay}=await import('../src/lib/activityPresentation.mjs');
 const item={schedule:{kind:'timed',timeZone:'America/New_York',startAt:'2026-10-31T23:00:00-04:00',endAt:'2026-11-01T00:00:00-04:00'}};
 const output=formatActivityTimeForDay(item,'2026-10-31','zh','Asia/Shanghai',activityCopy('zh'));
 assert.ok(output.includes('America/New_York'));assert.ok(output.includes('Asia/Shanghai'));
 assert.ok(output.includes('11:00'));assert.ok(output.includes('12:00'));assert.ok(output.includes('11月1日'));
 const sameZone=formatActivityTimeForDay(item,'2026-10-31','en','America/New_York',activityCopy('en'));
 assert.equal(sameZone.split('America/New_York').length,2);
});
