import {activityHref,scheduleText,trackActivity} from './activityClient.js';
import {formatCommunityLocation} from './communityLocationFormat.mjs';
import {galleryPreviewAttributes} from './galleryPreviewImage.mjs';
import {createIcon} from './icons.mjs';

export function shareUrlForActivity(item,locale){
 const href=activityHref(item,locale);
 if(!href)return typeof location!=='undefined'?location.href:'';
 try{return new URL(href,typeof location!=='undefined'?location.origin:'https://kamitsubaki.wiki').href;}
 catch{return href;}
}

export function shareText(item,{locale,copy}){
 const place=item.locationPrecision==='pending'?copy.pending:formatCommunityLocation(item,locale);
 const loc=[copy[item.mode],place].filter(Boolean).join(' · ');
 return [
  item.title,
  item.organizer?`${copy.organizer}：${item.organizer}`:'',
  scheduleText(item,locale,copy),
  loc,
  item.summary,
  shareUrlForActivity(item,locale),
 ].filter(Boolean).join('\n');
}

export async function copyActivity(item,options,status){
 try{
  await navigator.clipboard.writeText(shareText(item,options));
  if(status)status.textContent=options.copy.shareCopied;
  trackActivity(options.base,item,options.placement||'detail','copy');
  return true;
 }catch{
  if(status)status.textContent=options.copy.shareError;
  return false;
 }
}

export async function copyActivityLink(item,options,status){
 try{
  await navigator.clipboard.writeText(shareUrlForActivity(item,options.locale));
  if(status)status.textContent=options.copy.shareLinkCopied||options.copy.shareCopied;
  trackActivity(options.base,item,options.placement||'detail','copy');
  return true;
 }catch{
  if(status)status.textContent=options.copy.shareError;
  return false;
 }
}

const loadCorsImage=src=>new Promise((resolve,reject)=>{
 if(!src){reject(Error('empty'));return;}
 const img=new Image(),timer=setTimeout(()=>reject(Error('image timeout')),10000);
 img.crossOrigin='anonymous';
 img.onload=()=>{clearTimeout(timer);if(img.naturalWidth>0)resolve(img);else reject(Error('zero size'));};
 img.onerror=()=>{clearTimeout(timer);reject(Error('image unavailable'));};
 img.src=src;
});

async function resolvePosterImage(item,base){
 const candidates=[];
 if(item.poster){
  const thumb=galleryPreviewAttributes(item.poster,{api:base,widths:[960]}).src;
  if(thumb&&thumb!==item.poster)candidates.push(thumb);
  candidates.push(item.poster);
 }
 for(const src of candidates){
  try{return await loadCorsImage(src);}catch{}
 }
 return null;
}

function wrapLines(ctx,text,maxWidth,maxLines){
 const result=[];
 for(const paragraph of String(text||'').split(/\r?\n/)){
  if(!paragraph.trim()){continue;}
  let line='';
  for(const char of paragraph){
   const next=line+char;
   if(line&&ctx.measureText(next).width>maxWidth){
    result.push(line);
    if(result.length>=maxLines)return result;
    line=char.trimStart();
   }else{
    line=next;
   }
  }
  if(line){
   result.push(line);
   if(result.length>=maxLines)return result;
  }
 }
 return result;
}

function drawLines(ctx,lines,x,y,lineHeight){
 let cursor=y;
 for(const line of lines){
  ctx.fillText(line,x,cursor);
  cursor+=lineHeight;
 }
 return cursor;
}

function drawCrosshair(ctx,x,y,color,size=10){
 ctx.save();
 ctx.strokeStyle=color;
 ctx.lineWidth=1.5;
 ctx.beginPath();
 ctx.moveTo(x-size,y);ctx.lineTo(x+size,y);
 ctx.moveTo(x,y-size);ctx.lineTo(x,y+size);
 ctx.stroke();
 ctx.restore();
}

const PALETTES={
 dark:{
  bg:'#0a0b0d',
  panel:'#111216',
  panelBorder:'rgba(255,255,255,0.14)',
  hairline:'rgba(255,255,255,0.12)',
  crosshair:'rgba(255,255,255,0.34)',
  fg:'#f5f5f2',
  body:'#cfd1cc',
  muted:'#8f938d',
  badgeBg:'rgba(255,255,255,0.08)',
  badgeBorder:'rgba(255,255,255,0.2)',
  ambientOverlay:'rgba(10,11,13,0.84)',
  qrFrame:'#ffffff',
  qrDark:'#0a0b0d',
  qrLight:'#ffffff',
 },
 light:{
  bg:'#f8f7f3',
  panel:'#ffffff',
  panelBorder:'rgba(20,22,24,0.14)',
  hairline:'rgba(20,22,24,0.12)',
  crosshair:'rgba(20,22,24,0.30)',
  fg:'#141618',
  body:'#33383c',
  muted:'#686d73',
  badgeBg:'rgba(20,22,24,0.05)',
  badgeBorder:'rgba(20,22,24,0.18)',
  ambientOverlay:'rgba(248,247,243,0.92)',
  qrFrame:'#ffffff',
  qrDark:'#141618',
  qrLight:'#ffffff',
 },
};

const FONT_SERIF='"Noto Serif SC Variable","Noto Serif JP Variable","Noto Serif TC Variable","Songti SC",Georgia,serif';
const FONT_SANS='"Montserrat Variable","Noto Sans SC Variable","Noto Sans JP Variable","PingFang SC",system-ui,sans-serif';
const FONT_MONO='"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,monospace';

export async function renderActivityPosterCanvas(item,options,{theme='dark',ratio='portrait'}={}){
 const c=options.copy||{},locale=options.locale||'zh';
 const palette=PALETTES[theme==='light'?'light':'dark'];
 const landscape=ratio==='landscape';
 const W=landscape?1600:1080,H=landscape?900:1440;
 const [{default:QRCode},poster]=await Promise.all([
  import('qrcode'),
  options.posterImage!==undefined?Promise.resolve(options.posterImage):resolvePosterImage(item,options.base),
 ]);
 if(typeof document!=='undefined'&&document.fonts?.ready){
  await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2500))]);
 }
 const canvas=document.createElement('canvas');
 canvas.width=W;canvas.height=H;
 const ctx=canvas.getContext('2d');
 ctx.textBaseline='top';

 // 1. Paper / nocturne base + subtle blurred poster ambient wash
 ctx.fillStyle=palette.bg;
 ctx.fillRect(0,0,W,H);
 if(poster){
  ctx.save();
  try{ctx.filter='blur(48px) saturate(0.85)';}catch{}
  const coverScale=Math.max(W/poster.naturalWidth,H/poster.naturalHeight)*1.16;
  const dw=poster.naturalWidth*coverScale,dh=poster.naturalHeight*coverScale;
  ctx.drawImage(poster,(W-dw)/2,(H-dh)/2,dw,dh);
  ctx.restore();
  ctx.fillStyle=palette.ambientOverlay;
  ctx.fillRect(0,0,W,H);
 }

 // 2. Architectural outer frame + corner crosshairs
 const pad=landscape?56:60;
 ctx.strokeStyle=palette.hairline;
 ctx.lineWidth=1;
 ctx.strokeRect(pad,pad,W-pad*2,H-pad*2);
 drawCrosshair(ctx,pad,pad,palette.crosshair,9);
 drawCrosshair(ctx,W-pad,pad,palette.crosshair,9);
 drawCrosshair(ctx,pad,H-pad,palette.crosshair,9);
 drawCrosshair(ctx,W-pad,H-pad,palette.crosshair,9);

 const url=shareUrlForActivity(item,locale);
 const qrSize=landscape?148:168;
 const qr=document.createElement('canvas');
 await QRCode.toCanvas(qr,url,{width:qrSize,margin:1,errorCorrectionLevel:'M',color:{dark:palette.qrDark,light:palette.qrLight}});

 const state=item.eventStatus&&item.eventStatus!=='scheduled'?item.eventStatus:item.status;
 const metaItems=[
  c[item.category],
  c[item.mode],
  ['upcoming','ongoing','ended','cancelled','postponed'].includes(state)?c[state]:'',
  item.edition,
 ].filter(Boolean).join('  /  ');
 const schedule=scheduleText(item,locale,c);
 const place=item.locationPrecision==='pending'?c.pending:formatCommunityLocation(item,locale);
 const locationLine=[c[item.mode],place].filter(Boolean).join(' · ');
 const posterCredit=item.promotion?.poster?.src===item.poster?item.promotion.poster:(item.media||[]).find(ref=>ref.role==='poster');
 const credits=[posterCredit?.author,posterCredit?.sourceTitle].filter(Boolean).join(' · ');

 const innerPad=landscape?44:48;
 const x0=pad+innerPad,y0=pad+36,innerW=W-x0*2;

 // Top brand & category bar
 ctx.fillStyle=palette.muted;
 ctx.font=`500 ${landscape?14:15}px ${FONT_MONO}`;
 ctx.fillText('KAMITSUBAKI WIKI  //  EVENT ARCHIVE',x0,y0);
 if(metaItems){
  ctx.textAlign='right';
  ctx.font=`500 ${landscape?14:15}px ${FONT_SANS}`;
  ctx.fillStyle=palette.body;
  ctx.fillText(metaItems,W-x0,y0);
  ctx.textAlign='left';
 }
 const topLineY=y0+34;
 ctx.strokeStyle=palette.hairline;
 ctx.beginPath();ctx.moveTo(x0,topLineY);ctx.lineTo(W-x0,topLineY);ctx.stroke();

 const footerH=landscape?172:208;
 const footerTopY=H-pad-footerH;

 if(landscape){
  // 16:9 Exhibition split: Left full poster frame, Right editorial column
  const contentTop=topLineY+34;
  const contentH=H-pad-36-contentTop;
  let rightX=x0,rightW=innerW;
  if(poster){
   const boxW=Math.round(innerW*0.40),boxH=contentH;
   ctx.fillStyle=palette.panel;
   ctx.fillRect(x0,contentTop,boxW,boxH);
   ctx.strokeStyle=palette.panelBorder;
   ctx.strokeRect(x0,contentTop,boxW,boxH);
   const inset=16;
   const scale=Math.min((boxW-inset*2)/poster.naturalWidth,(boxH-inset*2)/poster.naturalHeight);
   const iw=poster.naturalWidth*scale,ih=poster.naturalHeight*scale;
   ctx.drawImage(poster,x0+(boxW-iw)/2,contentTop+(boxH-ih)/2,iw,ih);
   rightX=x0+boxW+48;
   rightW=W-x0-rightX;
  }

  let cy=contentTop+6;
  ctx.fillStyle=palette.fg;
  ctx.font=`400 ${poster?46:56}px ${FONT_SERIF}`;
  const titleLines=wrapLines(ctx,item.title,rightW,2);
  cy=drawLines(ctx,titleLines,rightX,cy,poster?60:72)+10;

  if(item.organizer){
   ctx.fillStyle=palette.muted;
   ctx.font=`500 18px ${FONT_SANS}`;
   ctx.fillText(`${c.organizer} · ${item.organizer}`,rightX,cy);
   cy+=36;
  }

  ctx.strokeStyle=palette.hairline;
  ctx.beginPath();ctx.moveTo(rightX,cy);ctx.lineTo(rightX+rightW,cy);ctx.stroke();
  cy+=22;

  // Schedule & location rows
  const drawSpec=(label,val)=>{
   if(!val)return;
   ctx.fillStyle=palette.muted;
   ctx.font=`500 15px ${FONT_SANS}`;
   ctx.fillText(label,rightX,cy+2);
   ctx.fillStyle=palette.fg;
   ctx.font=`500 19px ${FONT_SANS}`;
   const lines=wrapLines(ctx,val,rightW-132,2);
   cy=drawLines(ctx,lines,rightX+132,cy,28)+12;
  };
  drawSpec(c.timeline,schedule);
  drawSpec(c.locationShort,locationLine);

  if(item.summary&&cy<footerTopY-64){
   cy+=8;
   ctx.fillStyle=palette.body;
   ctx.font=`400 18px ${FONT_SANS}`;
   const maxSummaryLines=Math.max(1,Math.floor((footerTopY-24-cy)/30));
   const sumLines=wrapLines(ctx,item.summary,rightW,Math.min(3,maxSummaryLines));
   drawLines(ctx,sumLines,rightX,cy,30);
  }

  // Right-column bottom bar with QR + credits
  const barY=H-pad-36-qrSize-16;
  ctx.strokeStyle=palette.hairline;
  ctx.beginPath();ctx.moveTo(rightX,barY-18);ctx.lineTo(rightX+rightW,barY-18);ctx.stroke();

  const qrX=rightX+rightW-qrSize-12,qrY=barY;
  ctx.fillStyle=palette.qrFrame;
  ctx.fillRect(qrX-8,qrY-8,qrSize+16,qrSize+16);
  ctx.drawImage(qr,qrX,qrY,qrSize,qrSize);

  const footTextW=qrX-28-rightX;
  ctx.fillStyle=palette.muted;
  ctx.font=`500 14px ${FONT_MONO}`;
  ctx.fillText('KAMITSUBAKI.WIKI',rightX,qrY+6);
  ctx.font=`400 15px ${FONT_SANS}`;
  const hostLines=wrapLines(ctx,url.replace(/^https?:\/\//,''),footTextW,2);
  let fy=drawLines(ctx,hostLines,rightX,qrY+34,22)+10;
  if(credits){
   let creditSize=14;
   while(creditSize>9){
    ctx.font=`400 ${creditSize}px ${FONT_SANS}`;
    const cl=wrapLines(ctx,credits,footTextW,10);
    if(cl.length*creditSize*1.45<=qrSize+qrY-fy)break;
    creditSize--;
   }
   ctx.fillStyle=palette.muted;
   drawLines(ctx,wrapLines(ctx,credits,footTextW,10),rightX,fy,creditSize*1.45);
  }
 }else{
  // 3:4 Portrait exhibition poster
  let cy=topLineY+34;
  if(poster){
   const boxH=570;
   ctx.fillStyle=palette.panel;
   ctx.fillRect(x0,cy,innerW,boxH);
   ctx.strokeStyle=palette.panelBorder;
   ctx.strokeRect(x0,cy,innerW,boxH);
   const inset=18;
   const scale=Math.min((innerW-inset*2)/poster.naturalWidth,(boxH-inset*2)/poster.naturalHeight);
   const iw=poster.naturalWidth*scale,ih=poster.naturalHeight*scale;
   ctx.drawImage(poster,x0+(innerW-iw)/2,cy+(boxH-ih)/2,iw,ih);
   cy+=boxH+36;
  }else{
   cy+=60;
  }

  // Serif title
  ctx.fillStyle=palette.fg;
  ctx.font=`400 ${poster?46:58}px ${FONT_SERIF}`;
  const titleLines=wrapLines(ctx,item.title,innerW,poster?2:3);
  cy=drawLines(ctx,titleLines,x0,cy,poster?62:76)+10;

  if(item.organizer){
   ctx.fillStyle=palette.muted;
   ctx.font=`500 19px ${FONT_SANS}`;
   ctx.fillText(`${c.organizer} · ${item.organizer}`,x0,cy);
   cy+=38;
  }

  ctx.strokeStyle=palette.hairline;
  ctx.beginPath();ctx.moveTo(x0,cy);ctx.lineTo(W-x0,cy);ctx.stroke();
  cy+=22;

  const drawSpec=(label,val)=>{
   if(!val)return;
   ctx.fillStyle=palette.muted;
   ctx.font=`500 16px ${FONT_SANS}`;
   ctx.fillText(label,x0,cy+3);
   ctx.fillStyle=palette.fg;
   ctx.font=`500 20px ${FONT_SANS}`;
   const lines=wrapLines(ctx,val,innerW-148,2);
   cy=drawLines(ctx,lines,x0+148,cy,30)+12;
  };
  drawSpec(c.timeline,schedule);
  drawSpec(c.locationShort,locationLine);

  if(item.summary&&cy<footerTopY-56){
   cy+=8;
   ctx.fillStyle=palette.body;
   ctx.font=`400 19px ${FONT_SANS}`;
   const maxLines=Math.max(1,Math.floor((footerTopY-24-cy)/32));
   drawLines(ctx,wrapLines(ctx,item.summary,innerW,Math.min(poster?2:5,maxLines)),x0,cy,32);
  }

  // Bottom bar with QR & complete artwork credits
  ctx.strokeStyle=palette.hairline;
  ctx.beginPath();ctx.moveTo(x0,footerTopY);ctx.lineTo(W-x0,footerTopY);ctx.stroke();

  const qrX=W-x0-qrSize-8,qrY=footerTopY+24;
  ctx.fillStyle=palette.qrFrame;
  ctx.fillRect(qrX-8,qrY-8,qrSize+16,qrSize+16);
  ctx.drawImage(qr,qrX,qrY,qrSize,qrSize);

  const footW=qrX-32-x0;
  ctx.fillStyle=palette.fg;
  ctx.font=`500 16px ${FONT_MONO}`;
  ctx.fillText('KAMITSUBAKI WIKI · '+(c.communityTab||'EVENT'),x0,qrY+2);
  ctx.fillStyle=palette.muted;
  ctx.font=`400 15px ${FONT_MONO}`;
  let fy=drawLines(ctx,wrapLines(ctx,url.replace(/^https?:\/\//,''),footW,2),x0,qrY+32,22)+14;

  if(credits){
   // Keep complete credits for the artwork used; shrink type to fit, never truncate.
   let creditSize=16;
   while(creditSize>9){
    ctx.font=`400 ${creditSize}px ${FONT_SANS}`;
    const cl=wrapLines(ctx,credits,footW,20);
    if(cl.length*creditSize*1.45<=H-pad-24-fy)break;
    creditSize--;
   }
   ctx.fillStyle=palette.muted;
   drawLines(ctx,wrapLines(ctx,credits,footW,20),x0,fy,creditSize*1.45);
  }
 }

 return {canvas,usedPoster:Boolean(poster)};
}

function attachDialogLightDismissFallback(dialog){
 if(typeof HTMLDialogElement==='undefined'||'closedBy' in HTMLDialogElement.prototype)return;
 const outside=e=>{
  const r=dialog.getBoundingClientRect();
  return e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom;
 };
 let pressedOutside=false;
 dialog.addEventListener('pointerdown',e=>{pressedOutside=outside(e);});
 dialog.addEventListener('pointerup',e=>{if(pressedOutside&&outside(e))dialog.close();});
}

export async function openActivityShareStudio(item,options,externalStatus){
 const c=options.copy||{};
 const initialTheme=document.documentElement.dataset.theme==='light'?'light':'dark';
 const state={theme:initialTheme,ratio:'portrait',blob:null,objectUrl:''};

 const dialog=document.createElement('dialog');
 dialog.className='activity-share-dialog';
 dialog.setAttribute('closedby','any');
 const headingId='activity-share-title-'+Math.random().toString(36).slice(2,8);
 dialog.setAttribute('aria-labelledby',headingId);
 dialog.dataset.uiKit='';

 const header=document.createElement('header');
 header.className='activity-share-dialog__header';
 const heading=document.createElement('h2');
 heading.id=headingId;
 heading.textContent=c.shareStudioTitle||c.shareImage;
 const closeBtn=document.createElement('button');
 closeBtn.type='button';
 closeBtn.className='workspace-button dui-btn dui-btn-ghost activity-share-dialog__close';
 closeBtn.dataset.uiKit='';closeBtn.dataset.tone='quiet';
 closeBtn.setAttribute('aria-label',c.close);
 closeBtn.append(createIcon('x',{width:16,height:16}));
 closeBtn.onclick=()=>dialog.close();
 header.append(heading,closeBtn);

 const controls=document.createElement('div');
 controls.className='activity-share-dialog__controls';
 const makeGroup=(entries,key)=>{
  const group=document.createElement('div');
  group.className='activity-share-segmented';
  for(const [val,label] of entries){
   const btn=document.createElement('button');
   btn.type='button';
   btn.className='workspace-button dui-btn dui-btn-ghost';
   btn.dataset.uiKit='';
   btn.dataset.tone='quiet';
   btn.textContent=label;
   btn.setAttribute('aria-pressed',String(state[key]===val));
   btn.onclick=()=>{
    if(state[key]===val)return;
    state[key]=val;
    for(const child of group.children)child.setAttribute('aria-pressed',String(child===btn));
    void regenerate();
   };
   group.append(btn);
  }
  return group;
 };
 controls.append(
  makeGroup([['dark',c.shareThemeDark||'暗夜黑'],['light',c.shareThemeLight||'宣纸白']],'theme'),
  makeGroup([['portrait',c.shareRatioPortrait||'竖版 3:4'],['landscape',c.shareRatioLandscape||'横版 16:9']],'ratio'),
 );

 const stage=document.createElement('div');
 stage.className='activity-share-dialog__stage';
 const previewImg=document.createElement('img');
 previewImg.alt=item.title||'';
 previewImg.className='activity-share-dialog__preview';
 stage.append(previewImg);

 const statusEl=document.createElement('p');
 statusEl.className='activity-share-dialog__status';
 statusEl.setAttribute('role','status');
 statusEl.setAttribute('aria-live','polite');

 const footer=document.createElement('footer');
 footer.className='activity-share-dialog__actions';
 const downloadLink=document.createElement('a');
 downloadLink.className='workspace-button dui-btn dui-btn-primary';
 downloadLink.dataset.uiKit='';downloadLink.dataset.tone='primary';
 downloadLink.append(createIcon('download',{width:15,height:15}),document.createTextNode(c.shareDownloadPng||c.shareImage));
 downloadLink.onclick=()=>{trackActivity(options.base,item,options.placement||'detail','image');};

 const copyImgBtn=document.createElement('button');
 copyImgBtn.type='button';
 copyImgBtn.className='workspace-button dui-btn dui-btn-ghost';
 copyImgBtn.dataset.uiKit='';copyImgBtn.dataset.tone='secondary';
 copyImgBtn.append(createIcon('copy',{width:15,height:15}),document.createTextNode(c.shareCopyImage||'复制图片'));
 copyImgBtn.onclick=async()=>{
  if(!state.blob)return;
  if(typeof ClipboardItem==='undefined'||!navigator.clipboard?.write){
   statusEl.textContent=c.shareImageCopyUnsupported||c.imageError;
   return;
  }
  try{
   await navigator.clipboard.write([new ClipboardItem({'image/png':state.blob})]);
   statusEl.textContent=c.shareImageCopied||c.shareCopied;
   trackActivity(options.base,item,options.placement||'detail','image');
  }catch{
   statusEl.textContent=c.shareImageCopyUnsupported||c.imageError;
  }
 };

 const copyTextBtn=document.createElement('button');
 copyTextBtn.type='button';
 copyTextBtn.className='workspace-button dui-btn dui-btn-ghost';
 copyTextBtn.dataset.uiKit='';copyTextBtn.dataset.tone='quiet';
 copyTextBtn.textContent=c.share;
 copyTextBtn.onclick=()=>void copyActivity(item,options,statusEl);

 footer.append(downloadLink,copyImgBtn,copyTextBtn);
 dialog.append(header,controls,stage,statusEl,footer);
 attachDialogLightDismissFallback(dialog);

 dialog.addEventListener('close',()=>{
  if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);
  dialog.returnValue='';
  dialog.remove();
 },{once:true});

 document.body.append(dialog);
 dialog.showModal();
 downloadLink.focus({preventScroll:true});

 let renderSeq=0;
 let cachedPoster;
 const regenerate=async()=>{
  const seq=++renderSeq;
  statusEl.textContent=c.shareGenerating||'';
  stage.dataset.loading='true';
  copyImgBtn.disabled=true;
  try{
   if(cachedPoster===undefined)cachedPoster=await resolvePosterImage(item,options.base);
   const {canvas,usedPoster}=await renderActivityPosterCanvas(item,{...options,posterImage:cachedPoster},{theme:state.theme,ratio:state.ratio});
   if(seq!==renderSeq||!dialog.isConnected)return;
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
   if(!blob)throw Error('blob');
   if(state.objectUrl)URL.revokeObjectURL(state.objectUrl);
   state.blob=blob;
   state.objectUrl=URL.createObjectURL(blob);
   previewImg.src=state.objectUrl;
   downloadLink.href=state.objectUrl;
   downloadLink.download=`kamitsubaki-event-${item.id||'poster'}-${state.ratio}-${state.theme}.png`;
   copyImgBtn.disabled=false;
   statusEl.textContent=item.poster&&!usedPoster?(c.shareNoPosterFallback||''):'';
   if(externalStatus)externalStatus.textContent='';
  }catch{
   if(seq!==renderSeq)return;
   statusEl.textContent=c.imageError;
   if(externalStatus)externalStatus.textContent=c.imageError;
  }finally{
   if(seq===renderSeq)delete stage.dataset.loading;
  }
 };

 await regenerate();
 return dialog;
}

export async function exportActivityImage(item,options,status){
 return openActivityShareStudio(item,options,status);
}

export function mountActivityShareTools(toolsContainer,item,options){
 if(!toolsContainer)return;
 const c=options.copy||{};
 const statusEl=options.statusElement||toolsContainer.parentElement?.querySelector('[data-activity-share-status]')||null;

 const popoverWrap=document.createElement('div');
 popoverWrap.className='share-popover activity-share-popover';
 popoverWrap.dataset.uiKit='';

 const panelId='activity-share-panel-'+Math.random().toString(36).slice(2,8);
 const shareTrigger=document.createElement('button');
 shareTrigger.type='button';
 shareTrigger.className='activity-tool-btn share-popover__trigger';
 shareTrigger.dataset.uiKit='';
 shareTrigger.setAttribute('aria-expanded','false');
 shareTrigger.setAttribute('aria-haspopup','true');
 shareTrigger.setAttribute('aria-controls',panelId);
 shareTrigger.append(createIcon('share',{width:14,height:14}),document.createTextNode(c.shareShort));

 const panel=document.createElement('div');
 panel.id=panelId;
 panel.className='share-popover__panel activity-share-popover__panel';
 panel.hidden=true;

 const heading=document.createElement('p');
 heading.className='share-popover__heading';
 heading.textContent=c.shareHeading||c.shareShort;

 const linkInput=document.createElement('input');
 linkInput.type='text';
 linkInput.readOnly=true;
 linkInput.className='workspace-control dui-input share-popover__link';
 linkInput.dataset.uiKit='';
 linkInput.setAttribute('aria-label',c.shareCopyLink||c.shareShort);
 linkInput.value=shareUrlForActivity(item,options.locale);

 const actions=document.createElement('div');
 actions.className='share-popover__actions';

 const panelStatus=document.createElement('p');
 panelStatus.className='share-popover__status';
 panelStatus.setAttribute('role','status');
 panelStatus.setAttribute('aria-live','polite');

 const copyLinkBtn=document.createElement('button');
 copyLinkBtn.type='button';
 copyLinkBtn.className='workspace-button dui-btn dui-btn-primary share-popover__copy';
 copyLinkBtn.dataset.uiKit='';copyLinkBtn.dataset.tone='primary';
 copyLinkBtn.append(createIcon('link',{width:14,height:14}),document.createTextNode(c.shareCopyLink||'复制链接'));
 copyLinkBtn.onclick=async()=>{
  const ok=await copyActivityLink(item,options,panelStatus);
  if(!ok){linkInput.focus();linkInput.select();}
 };

 const copyTextBtn=document.createElement('button');
 copyTextBtn.type='button';
 copyTextBtn.className='workspace-button dui-btn dui-btn-ghost activity-share-panel-btn';
 copyTextBtn.dataset.uiKit='';copyTextBtn.dataset.tone='secondary';
 copyTextBtn.append(createIcon('copy',{width:14,height:14}),document.createTextNode(c.share));
 copyTextBtn.onclick=()=>void copyActivity(item,options,panelStatus);

 const studioFromPanelBtn=document.createElement('button');
 studioFromPanelBtn.type='button';
 studioFromPanelBtn.className='workspace-button dui-btn dui-btn-ghost activity-share-panel-btn';
 studioFromPanelBtn.dataset.uiKit='';studioFromPanelBtn.dataset.tone='secondary';
 studioFromPanelBtn.append(createIcon('images',{width:14,height:14}),document.createTextNode(c.shareImage));
 studioFromPanelBtn.onclick=()=>{closePanel();void openActivityShareStudio(item,options,statusEl);};

 actions.append(copyLinkBtn,copyTextBtn,studioFromPanelBtn);

 if(typeof navigator!=='undefined'&&typeof navigator.share==='function'){
  const nativeBtn=document.createElement('button');
  nativeBtn.type='button';
  nativeBtn.className='workspace-button dui-btn dui-btn-ghost activity-share-panel-btn';
  nativeBtn.dataset.uiKit='';nativeBtn.dataset.tone='quiet';
  nativeBtn.append(createIcon('share',{width:14,height:14}),document.createTextNode(c.shareNative||'系统分享'));
  nativeBtn.onclick=async()=>{
   try{
    await navigator.share({title:item.title,text:shareText(item,options),url:shareUrlForActivity(item,options.locale)});
    closePanel();
   }catch{}
  };
  actions.append(nativeBtn);
 }

 panel.append(heading,linkInput,actions,panelStatus);
 popoverWrap.append(shareTrigger,panel);

 const positionPanel=()=>{
  if(panel.hidden)return;
  const rect=shareTrigger.getBoundingClientRect();
  const pr=panel.getBoundingClientRect();
  panel.style.left=`${Math.max(16,Math.min(rect.right-pr.width,innerWidth-pr.width-16))}px`;
  panel.style.top=`${rect.bottom+pr.height+8>innerHeight?Math.max(8,rect.top-pr.height-8):rect.bottom+8}px`;
 };
 const closePanel=(restoreFocus=false)=>{
  if(panel.hidden)return;
  panel.hidden=true;
  shareTrigger.setAttribute('aria-expanded','false');
  if(restoreFocus)shareTrigger.focus();
 };

 shareTrigger.onclick=()=>{
  if(!panel.hidden){closePanel(true);return;}
  linkInput.value=shareUrlForActivity(item,options.locale);
  panelStatus.textContent='';
  panel.hidden=false;
  shareTrigger.setAttribute('aria-expanded','true');
  positionPanel();
  copyLinkBtn.focus();
 };

 const onPointerDown=e=>{if(e.target instanceof Node&&!popoverWrap.contains(e.target))closePanel();};
 const onKeyDown=e=>{if(e.key==='Escape'&&!panel.hidden){e.preventDefault();closePanel(true);}};
 document.addEventListener('pointerdown',onPointerDown);
 document.addEventListener('keydown',onKeyDown);
 window.addEventListener('resize',positionPanel);
 window.addEventListener('scroll',positionPanel,{passive:true});

 const studioBtn=document.createElement('button');
 studioBtn.type='button';
 studioBtn.className='activity-tool-btn';
 studioBtn.dataset.uiKit='';
 studioBtn.append(createIcon('images',{width:14,height:14}),document.createTextNode(c.shareImage));
 studioBtn.onclick=async()=>{
  studioBtn.disabled=true;
  try{await openActivityShareStudio(item,options,statusEl);}
  finally{studioBtn.disabled=false;}
 };

 toolsContainer.append(popoverWrap,studioBtn);

 if(options.exportAnchor&&!options.exportAnchor.hidden){
  const label=options.exportAnchor.textContent?.trim()||c.calendarShort;
  options.exportAnchor.className='activity-tool-btn';
  options.exportAnchor.replaceChildren(createIcon('calendar-days',{width:14,height:14}),document.createTextNode(label));
  toolsContainer.append(options.exportAnchor);
 }
}
