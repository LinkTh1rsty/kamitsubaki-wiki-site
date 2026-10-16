import {withSupportQr,supportTier} from './supportCatalog.mjs';
import {supportExperienceCopy} from './supportExperienceCopy.mjs';
import {supportImageUrl,supportQrCropStyle} from './supportAssets.mjs';
import {iconMarkup} from './icons.mjs';
import { orderSupporters } from './supporterOrder.mjs';
const escapeHtml = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
export function supportLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? escapeHtml(url.href) : ''; } catch { return ''; }
}

/** Accept only the public API contract before touching the existing page. */
export function validSupportPayload(payload) {
  const data=payload?.data;
  const label=value=>value&&typeof value==='object'&&typeof value.zh==='string';
  const amount=value=>value===null||(typeof value==='number'&&Number.isFinite(value)&&value>=0);
  if(!data||typeof data.currency!=='string'||!Array.isArray(data.channels)||!Array.isArray(data.costs)||!Array.isArray(data.annualReports)||!Array.isArray(data.sponsors))return false;
  try {
    new Intl.NumberFormat('en',{style:'currency',currency:data.currency});
    if(!data.channels.every(item=>typeof item.id==='string'&&label(item.name)&&label(item.description)))return false;
    if(!data.costs.every(item=>label(item.name)&&label(item.description)&&amount(item.annualEstimate)))return false;
    if(!data.sponsors.every(item=>typeof item.name==='string'&&item.public===true&&(item.pinned===undefined||typeof item.pinned==='boolean')))return false;
    return data.annualReports.every(item=>{
      new Intl.NumberFormat('en',{style:'currency',currency:item.currency});
      return Number.isInteger(item.year)&&amount(item.received)&&amount(item.spent)&&(item.note===null||label(item.note))&&Array.isArray(item.entries)&&item.entries.every(entry=>typeof entry.date==='string'&&['income','expense'].includes(entry.type)&&label(entry.description)&&amount(entry.amount)&&entry.amount!==null);
    });
  }catch{return false;}
}

export function supporterAvatar(raw,apiBase='https://api.kamitsubaki.wiki') {
 if(typeof raw!=='string'||!raw)return '';
 try {const u=new URL(raw,apiBase),api=new URL(apiBase);return !u.username&&!u.password&&((u.protocol==='https:'&&!u.port&&/^pic\d*\.afdiancdn\.com$/.test(u.hostname))||(u.origin===api.origin&&/^\/api\/supporters\/avatars\/[a-f\d-]{36}$/.test(u.pathname)))?u.href:'';}catch{return '';}
}
export function renderSupportData(data,copy,locale,apiBase,embedded=false) {
  const e=escapeHtml;
  const local=value=>e(value?.[locale]||value?.zh||value?.en||'');
  const amount=(value,currency=data.currency)=>value===null?e(copy.pending):e(new Intl.NumberFormat(locale,{style:'currency',currency,currencyDisplay:'code',maximumFractionDigits:2}).format(value));
  const external=(href,label)=>`<a class="support-text-link" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${e(label)} (${e(copy.external)})">${e(label)}<span aria-hidden="true">${iconMarkup('arrow-up-right')}</span></a>`;
  const channels=data.channels.map(withSupportQr).filter(item=>(!embedded||item.id!=='afdian')&&(supportLink(item.url)||supportImageUrl(item.qrImageUrl))).map((item,i)=>{
    const href=supportLink(item.url),qr=escapeHtml(supportImageUrl(item.qrImageUrl)||''),qrLabel=locale==='en'?'Save original QR image':locale==='ja'?'QRコードの原画像を保存':'保存二维码原图';
    return `<article class="support-channel" data-available="${Boolean(href||qr)}" aria-labelledby="channel-${e(item.id)}"><div class="support-channel__top"><span class="support-index" aria-hidden="true">${String(i+1).padStart(2,'0')}</span><span class="support-status"><span aria-hidden="true"></span>${e(href||qr?copy.available:copy.unavailable)}</span></div><h3 id="channel-${e(item.id)}">${local(item.name)}</h3><p>${local(item.description)}</p>${qr?`<details class="support-channel__qr-details"><summary>${e(locale==='en'?'Show QR code':locale==='ja'?'QRコードを表示':'展开二维码')}</summary><div class="support-channel__qr"><a class="support-qr-frame" href="${qr}" target="_blank" rel="noopener noreferrer"><span class="support-qr-window" data-cropped="${Boolean(supportQrCropStyle(item))}" style="${e(supportQrCropStyle(item))}"><img src="${qr}" alt="${local(item.name)}" loading="lazy"></span></a>${item.recipientLabel?`<p>${local(item.recipientLabel)}</p>`:''}<a href="${qr}" download target="_blank" rel="noopener noreferrer">${e(qrLabel)}</a></div></details>`:''}<div class="support-channel__action">${href?`<a class="support-button" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${e(copy.visit)} · ${local(item.name)} (${e(copy.external)})">${e(copy.visit)}<span aria-hidden="true">${iconMarkup('arrow-up-right')}</span></a><span class="support-note">${e(copy.external)}</span>`:qr?'':`<span class="support-note">${e(copy.unavailableNote)}</span>`}</div></article>`;
  }).join('');
  const costs=`<dl class="support-cost-list">${data.costs.map(item=>`<div><dt>${local(item.name)}</dt><dd class="support-cost-description">${local(item.description)}</dd><dd class="support-cost-amount"><span>${e(copy.estimate)}</span><strong>${amount(item.annualEstimate)}</strong></dd></div>`).join('')}</dl>${data.costs.some(item=>item.annualEstimate===null)?`<p class="support-note support-cost-note">${e(copy.costsPending)}</p>`:''}`;
  const reports=[...data.annualReports].sort((a,b)=>b.year-a.year).map((report,i)=>{
    const pending=report.received===null&&report.spent===null;
    const difference=report.received===null||report.spent===null?null:Math.round((report.received-report.spent)*100)/100;
    return `<details class="support-report" data-year="${report.year}" ${i===0?'open':''}><summary><span class="support-report__year">${report.year}</span><span>${e(copy.reportLabel)}</span><span class="support-report__status">${e(pending?copy.reportPending:copy.reportRecorded)}</span><span class="support-report__toggle" aria-hidden="true"></span></summary><div class="support-report__body"><dl class="support-totals">${[[copy.received,report.received],[copy.spent,report.spent],[copy.balance,difference]].map(([title,value])=>`<div><dt>${e(title)}</dt><dd class="${value===null?'is-pending':''}">${amount(value,report.currency)}</dd></div>`).join('')}</dl>${pending?`<p class="support-note">${e(copy.reportEmpty)}</p>`:''}${report.note?`<p class="support-report__note">${local(report.note)}</p>`:''}<div class="support-report__meta">${report.asOf?`<p class="support-note">${e(copy.asOf)} <time datetime="${e(report.asOf)}">${e(report.asOf)}</time></p>`:''}${supportLink(report.reportUrl)?external(supportLink(report.reportUrl),copy.reportLink):''}</div>${report.entries.length?`<div class="support-ledger" tabindex="0" role="region" aria-label="${e(report.year+' '+copy.reportLabel)}"><table><thead><tr><th scope="col">${e(copy.entryDate)}</th><th scope="col">${e(copy.entryDescription)}</th><th scope="col">${e(copy.entryAmount)}</th></tr></thead><tbody>${[...report.entries].sort((a,b)=>b.date.localeCompare(a.date)).map(entry=>`<tr><td><time datetime="${e(entry.date)}">${e(entry.date)}</time></td><td>${local(entry.description)}</td><td>${e(entry.type==='income'?copy.income:copy.expense)}<br>${amount(entry.amount,report.currency)}</td></tr>`).join('')}</tbody></table></div>`:''}</div></details>`;
  }).join('')||`<p class="support-empty">${e(copy.noReports)}</p>`;
  const wall=data.sponsors.length?`<ul class="support-wall" role="list">${orderSupporters(data.sponsors).map(item=>`<li><span class="support-wall__avatar" aria-hidden="true">${e(Array.from(item.name)[0]||'·')}${supporterAvatar(item.avatarUrl,apiBase)?`<img class="supporter-avatar" src="${e(supporterAvatar(item.avatarUrl,apiBase))}" alt="" width="42" height="42" loading="lazy" referrerpolicy="no-referrer"/>`:''}</span><div>${supportLink(item.url)?external(supportLink(item.url),item.name):`<span>${e(item.name)}</span>`}<small class="support-wall__tier">${e(supportTier(item.tier)?.name||supportExperienceCopy(locale).supporter)}</small></div></li>`).join('')}</ul>`:`<div class="support-empty"><span class="support-empty__mark" aria-hidden="true">${iconMarkup('plus')}</span><h3>${e(copy.wallEmpty)}</h3><p>${e(copy.wallEmptyBody)}</p></div>`;
  return {channels,costs,reports,wall};
}

export function renderSupportOverview(data,copy,locale){
 const report=[...data.annualReports].sort((a,b)=>b.year-a.year)[0],e=escapeHtml;
 if(!report)return `<p>${e(copy.noReports)}</p>`;
 const amount=value=>value===null?e(copy.pending):e(new Intl.NumberFormat(locale,{style:"currency",currency:report.currency,currencyDisplay:"code",maximumFractionDigits:2}).format(value));
 const balance=report.received===null||report.spent===null?null:Math.round((report.received-report.spent)*100)/100;
 return `<p>${report.year} · ${e(copy.reportLabel)}${report.asOf?" · "+e(copy.asOf)+" "+e(report.asOf):""}</p><dl class="support-totals">${[[copy.received,report.received],[copy.spent,report.spent],[copy.balance,balance]].map(([label,value])=>`<div><dt>${e(label)}</dt><dd>${amount(value)}</dd></div>`).join("")}</dl>`;
}
