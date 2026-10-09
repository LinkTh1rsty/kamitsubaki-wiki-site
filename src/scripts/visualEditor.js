import {articleCopy} from '../lib/articleCopy.mjs';
import {mountArticleAssets} from './articleAssets.js';
import {mountArticleGallery} from './articleGallery.js';
import {hasEditorLocalWork} from '../lib/editorWorkingState.mjs';
import {state as accountState,refreshAuth} from './accountStore.js';
import {mountArticlePicker,ensureArticleDraftUrl,initialArticleRelations,articleEntities} from '../lib/articleEntities.mjs';
import {initializeArticleSubmission} from './articleSubmission.js';
import {entitySourcePath} from '../lib/contentLayout.mjs';
import {revealPanel,enhanceTabRail} from '../lib/uiMotion.mjs';
import {newEntryPath,prepareImage,attachmentFile,imageBase64} from '../lib/editorAttachments.mjs';
import { markdownTrigger, upgradeListBlock } from '../lib/editorWriting.mjs';
import {editorEnabled,editorApiBase,localEditor} from '../lib/editorConfig.mjs';
import { sourceRequest } from '../lib/editorSource.mjs';
import { initializeEditorPrDemo } from './editorPrDemo.js';
import { renderRich, richMarkdown, inlineKinds, inlineSource, inlineParts, shortcodeChip } from '../lib/editorRichText.mjs';
import { nestedMetadataOptions, nestedMetadataDefault, metadataDefault, metadataOptions, metadataLabel, metadataChoices, newMetadataItem, advancedErrors } from '../lib/editorMetadata.mjs';
import { previewBlock as renderPreviewBlock, previewMedia, loadPreviewMedia } from '../lib/editorPreview.mjs';
import { enhanceReader } from '../lib/readerEnhancements.mjs';
import 'katex/dist/katex.min.css';
import { isApplePlatform, formatShortcut } from '../lib/searchShortcut.mjs';
import { fields, fieldsFor, blockTypes, entryTypes, newDraft, newBlock, blockMarkdown, parseVisualBlocks, importMarkdown, exportMarkdown, validateDraft, safeUrl, validPath, escapeHtml } from '../lib/visualEditor.mjs';

const initialize = async () => {
  const root = document.querySelector('[data-visual-editor]');
  if (!root || root.dataset.ready) return;
  root.dataset.ready = 'true';
  const $ = selector => root.querySelector(selector);
  const returnTo=new URLSearchParams(location.search).get('returnTo');
  if(returnTo){try{const target=new URL(returnTo,location.origin);if(target.origin===location.origin&&/^\/(zh|ja|en)\/account\/creator\/$/.test(target.pathname)){const back=$('.ve-home');back.href=target.pathname+target.search;back.textContent='← '+(root.dataset.locale==='en'?'Creator center':root.dataset.locale==='ja'?'クリエイターセンター':'创作者中心');}}catch{}}
  const copy = JSON.parse($('[data-editor-copy]').textContent);
  const toolbarScroll = $('.ve-toolbar-scroll');
  const toolbarArrows = [...root.querySelectorAll('[data-toolbar-scroll]')];
  function updateToolbarScroll() {
    const max = toolbarScroll.scrollWidth - toolbarScroll.clientWidth;
    toolbarArrows.forEach(button => { button.disabled = Number(button.dataset.toolbarScroll) < 0 ? toolbarScroll.scrollLeft <= 1 : toolbarScroll.scrollLeft >= max - 1; });
  }
  toolbarArrows.forEach(button => button.addEventListener('click', () => {
    toolbarScroll.scrollBy({left: Number(button.dataset.toolbarScroll) * Math.max(120, toolbarScroll.clientWidth * .65), behavior: 'instant'});
    updateToolbarScroll();
  }));
  toolbarScroll.addEventListener('scroll', updateToolbarScroll, {passive:true});
  toolbarScroll.addEventListener('wheel', event => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const max = toolbarScroll.scrollWidth - toolbarScroll.clientWidth;
    if ((delta > 0 && toolbarScroll.scrollLeft < max - 1) || (delta < 0 && toolbarScroll.scrollLeft > 1)) {
      event.preventDefault();
      toolbarScroll.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? toolbarScroll.clientWidth : 1);
    }
  }, {passive:false});
  new ResizeObserver(updateToolbarScroll).observe(toolbarScroll);
  document.fonts.ready.then(updateToolbarScroll);
  updateToolbarScroll();
  const kbdLabel = text => formatShortcut(text, { platform: navigator.platform ?? '', userAgent: navigator.userAgent });
  if (!isApplePlatform({ platform: navigator.platform ?? '', userAgent: navigator.userAgent })) {
    root.querySelectorAll('kbd').forEach(el => { el.textContent = kbdLabel(el.textContent); });
    root.querySelectorAll('[title],[aria-label]').forEach(el => {
      if (el.getAttribute('title')?.includes('⌘')) el.setAttribute('title', kbdLabel(el.getAttribute('title')));
      if (el.getAttribute('aria-label')?.includes('⌘')) el.setAttribute('aria-label', kbdLabel(el.getAttribute('aria-label')));
    });
  }
  const creationDictionary=JSON.parse(root.dataset.creationCopy || '{}');
  const tc = text => creationDictionary[text] || text;
  const uiLocale = root.dataset.locale.startsWith('zh') ? 'zh' : root.dataset.locale;
  const articleMode=root.dataset.articleMode==='true';
  if(articleMode){const url=ensureArticleDraftUrl(location.href,()=>crypto.randomUUID());window.history.replaceState(null,'',url);}
  const articleOwner=articleMode?(await refreshAuth())?.userId||(accountState.auth==='guest'?'guest':'unverified'):null;
  const currentOwner=()=>accountState.viewer?.userId||(accountState.auth==='guest'?'guest':'unverified');
  const articleIdentity=new URLSearchParams(location.search).get('draft')||new URLSearchParams(location.search).get('id');
  const legacyArticleKey=`kamitsubaki-article-workbench-v1:${articleIdentity}:${root.dataset.contentLocale}`;
  const prDemo = !articleMode && editorEnabled;
  const key = articleMode?`kamitsubaki-article-workbench-v2:${articleOwner}:${articleIdentity}:${root.dataset.contentLocale}`:`${prDemo?'kamitsubaki-visual-editor-pr-demo-v1':'kamitsubaki-visual-editor-v1'}:${root.dataset.contentLocale}`;
  const md = renderRich;
  let draft = newDraft(articleMode?'articles':'projects', root.dataset.contentLocale);
  let saving = true, restoredArticle=false;
  let activeBlockId = draft.blocks[0]?.id, sourcePending = null, sourceTimer;
  const sourceKey = key + ':source';
  if (window.innerWidth <= 900) root.setAttribute('data-sidebar-hidden','');
  try {
    let saved = JSON.parse(localStorage.getItem(key) || 'null');
    if(articleMode&&!saved){const legacy=JSON.parse(localStorage.getItem(legacyArticleKey)||'null');if(legacy?.ownerId===articleOwner){saved=legacy;const pending=localStorage.getItem(legacyArticleKey+':source');if(pending!==null&&localStorage.getItem(sourceKey)===null)localStorage.setItem(sourceKey,pending);}}
    if(articleMode&&saved&&saved.ownerId!==articleOwner&&!(['guest','unverified'].includes(articleOwner)&&!saved.ownerId))saved=null;
    if (saved?.version === 1 && entryTypes.includes(saved.kind) && (!articleMode||saved.kind==='articles') && Array.isArray(saved.blocks) && saved.blocks.length < 1000 && saved.meta) {
      exportMarkdown(saved); draft = saved;restoredArticle=true;
    }
  } catch { saving = false; }
  if(articleMode&&!restoredArticle&&!new URL(location.href).searchParams.has('id'))draft.meta.relatedEntities=initialArticleRelations(location.href);
  const unchangedArticle=articleMode&&draft.articleBodySnapshot===JSON.stringify(draft.blocks);
  draft.blocks = draft.blocks.flatMap(block => block.type === 'preserved' ? parseVisualBlocks(block.text) : [block]).map(upgradeListBlock);
  if(unchangedArticle)draft.articleBodySnapshot=JSON.stringify(draft.blocks);
  const target = articleMode?null:new URLSearchParams(location.search).get('target');
  const serializeDraft=()=>articleMode?(draft.articleBodySnapshot===JSON.stringify(draft.blocks)?draft.articleOriginalBody:draft.blocks.map(b=>blockMarkdown(b,draft.meta.locale)).join('\n\n')):exportMarkdown(draft);
  let history = [JSON.stringify(draft)], cursor = 0, historyTimer;
  function save() {
    if(articleMode)draft.ownerId=['guest','unverified'].includes(articleOwner)?null:articleOwner;
    else if(!draft.ownerId&&accountState.viewer?.userId)draft.ownerId=accountState.viewer.userId;
    try { localStorage.setItem(key, JSON.stringify(draft)); saving = true; } catch { saving = false; }
    $('[data-save-status]').textContent = sourcePending !== null ? copy.sourcePending : saving ? copy.saved : copy.unsaved;
  }
  function checkpoint() {
    clearTimeout(historyTimer);
    const state = JSON.stringify(draft);
    if (state === history[cursor]) return;
    history = history.slice(0, cursor + 1); history.push(state);
    if (history.length > 40) history.shift();
    cursor = history.length - 1;
    updateHistory();
    refreshAttachmentPreviews();
  }
  function updateHistory() { const pending=JSON.stringify(draft)!==history[cursor]; $('[data-undo]').disabled = cursor === 0 && !pending; $('[data-redo]').disabled = pending || cursor === history.length - 1; }
  function changed(structural = false) { save(); output(); if(articleMode)root.dispatchEvent(new CustomEvent('article-draft-change')); clearTimeout(historyTimer); if (structural) checkpoint(); else historyTimer = setTimeout(checkpoint, 350); }
  const label = key => key.includes('.')?key.split('.').map(k=>/^\d+$/.test(k)?String(Number(k)+1):metadataLabel(k,uiLocale)).join(' / '):fieldsFor(draft).find(f => f.key === key)?.labels[uiLocale] || copy.blocks[key] || copy[key] || metadataLabel(key,uiLocale);
  function renderFields() {
    $('[data-kind]').value = draft.kind;
    $('[data-locale-select]').value = draft.meta.locale;
    $('[data-path]').value = draft.path;
    $('[data-document-title]').value = draft.meta.name || draft.meta.title || '';
    if(articleMode){const c=articleCopy(root.dataset.locale);$('[data-fields]').innerHTML=`<label>${uiLocale==='en'?'Summary':uiLocale==='ja'?'概要':'摘要'}<textarea data-article-property="summary">${escapeHtml(draft.meta.summary||'')}</textarea></label><label>${c.category}<select data-article-property="articleCategory">${Object.entries(c.categories).map(([value,label])=>`<option value="${value}" ${draft.meta.articleCategory===value?'selected':''}>${label}</option>`).join('')}</select></label><div data-article-picker></div>`;
      mountArticlePicker($('[data-article-picker]'),{locale:root.dataset.locale,selected:()=>draft.meta.relatedEntities||[],onChange:ids=>{draft.meta.relatedEntities=ids;changed(true);}});return;}

    renderAdvanced();
    $('[data-fields]').innerHTML = fieldsFor(draft).map(f => f.key==='entityType'&&draft.kind==='people'&&!draft.originalMeta?`<label>${escapeHtml(f.labels[uiLocale])}<select data-field="entityType">${['person','virtual-avatar'].map(t=>`<option value="${t}" ${draft.meta.entityType===t?'selected':''}>${t}</option>`).join('')}</select></label>`:`<label>${escapeHtml(f.labels[uiLocale])}${f.required ? ' <span aria-hidden="true">*</span>' : ''}<input data-field="${f.key}" type="${f.type}" ${f.required ? 'required' : ''} ${(draft.originalMeta&&f.key==='id')||f.key==='entityType'&&draft.kind!=='people'?'readonly':''} value="${escapeHtml(draft.meta[f.key] ?? '')}" ${f.key === 'releaseDate' ? 'placeholder="YYYY-MM-DD"' : ''} /></label>`).join('');
  }
  const protectedKeys = new Set(['__proto__','prototype','constructor']);
  const fieldPath = path => encodeURIComponent(JSON.stringify(path));
  const parsePath = value => JSON.parse(decodeURIComponent(value));
  function metadataTree(value,path) {
    const key=String(path.at(-1)), name=metadataLabel(key,uiLocale), attr=fieldPath(path);
    if(Array.isArray(value)) return `<fieldset><legend>${escapeHtml(name)}</legend>${value.map((item,i)=>`<div class="ve-meta-item">${metadataTree(item,[...path,i])}<button data-meta-remove="${fieldPath([...path,i])}" aria-label="${copy.remove}">×</button></div>`).join('')}<button data-meta-add="${attr}">＋ ${copy.row}</button></fieldset>`;
    if(value && typeof value==='object') return `<fieldset><legend>${escapeHtml(name)}</legend>${Object.entries(value).filter(([key])=>!protectedKeys.has(key)).map(([key,val])=>`<div class="ve-meta-item">${metadataTree(val,[...path,key])}<button data-meta-remove="${fieldPath([...path,key])}" aria-label="${copy.remove}">×</button></div>`).join('')}${nestedMetadataOptions(path,value).map(key=>`<button data-meta-property="${attr}" data-property="${key}">＋ ${escapeHtml(metadataLabel(key,uiLocale))}</button>`).join('')}</fieldset>`;
    const choices=metadataChoices[path.filter(k=>typeof k!=='number').join('.')]||metadataChoices[key]||(typeof path.at(-1)==='number'?metadataChoices[path.at(-2)]:undefined);
    if(choices) return `<label>${escapeHtml(name)}<select data-meta-value="${attr}">${[...new Set([...choices,String(value ?? '')])].map(choice=>`<option value="${escapeHtml(choice)}" ${choice===value?'selected':''}>${escapeHtml(choice)}</option>`).join('')}</select></label>`;
    if(typeof value==='boolean')return `<label class="ve-check"><input data-meta-value="${attr}" type="checkbox" ${value?'checked':''} />${escapeHtml(name)}</label>`;
    return `<label>${escapeHtml(name)}<input ${referenceFields.has(key)||typeof path.at(-1)==='number'&&referenceFields.has(path.at(-2))?'list="entity-reference-options"':''} data-meta-value="${attr}" type="${typeof value==='number'?'number':/Color$|^value$/.test(key)&&/^#[0-9a-f]{6}$/i.test(value)?'color':'text'}" value="${escapeHtml(value ?? '')}" /></label>`;
  }
  const referenceFields=new Set(['entity','target','organization','songId','primaryArtist','parentOrg','organizer','belongToUniverse','headliners','guestPerformers','relatedEntities']);
  async function loadReferenceOptions(){
    try{const response=await fetch(`/${draft.meta.locale}/editor-catalog.json`);if(!response.ok)return;const records=await response.json();let list=root.querySelector('#entity-reference-options');if(!list){list=document.createElement('datalist');list.id='entity-reference-options';root.append(list);}list.innerHTML=records.filter(e=>e.id).map(e=>`<option value="${escapeHtml(e.id)}">${escapeHtml(e.title)} · ${escapeHtml(e.kind)}</option>`).join('');}catch{/* Free ID input remains available offline. */}
  }
  function renderAdvanced() {
    const basic=new Set(['locale',...fieldsFor(draft).map(f=>f.key)]);
    $('[data-advanced-fields]').innerHTML=Object.entries(draft.meta).filter(([key])=>!basic.has(key)&&!protectedKeys.has(key)&&!['legacy','schemaVersion','researchImport','translation'].includes(key)).map(([key,value])=>`<details><summary>${escapeHtml(metadataLabel(key,uiLocale))}</summary>${metadataTree(value,[key])}<button data-meta-remove="${fieldPath([key])}">× ${escapeHtml(metadataLabel(key,uiLocale))}</button></details>`).join('');
    const available=metadataOptions(draft.kind,draft.meta).filter(key=>!(key in draft.meta));
    $('[data-advanced-type]').innerHTML=available.map(key=>`<option value="${key}">${escapeHtml(metadataLabel(key,uiLocale))}</option>`).join('');
    $('[data-add-property]').disabled=!available.length;
  }
  function metaParent(path) { if(path.some(key=>protectedKeys.has(String(key))))throw new Error('path');return path.slice(0,-1).reduce((obj,key)=>obj[key],draft.meta); }
  function richControls(b) { return `<div class="ve-rich" contenteditable="true" role="textbox" aria-multiline="true" aria-label="${copy.blocks[b.type]}" data-rich data-placeholder="${copy.emptyParagraph}">${md(b.type==='list'?blockMarkdown(b):b.text)}</div>`; }
  const inlineLabels = kind => kind==='ruby' ? [copy.text,copy.kana,copy.romaji] : kind==='zh-variant' ? [copy.text,copy.taiwan,copy.hongkong] : ['abbr','time'].includes(kind) ? [copy.text,copy.explanation] : [copy.text];
  function unitControls(unit,attr) { return ['original','kana','romaji','time'].map(p=>control(p==='time'?copy.timestamp:copy[p],`${attr}="${p}"`,unit[p]||'')).join(''); }
  function control(labelText, attr, value = '', multiline = false) {
    return `<label>${escapeHtml(labelText)}${multiline ? `<textarea ${attr} rows="3">${escapeHtml(value)}</textarea>` : `<input ${attr} value="${escapeHtml(value)}" />`}</label>`;
  }
  function blockControls(b) {
    if (b.type === 'paragraph' || b.type === 'list') return richControls(b);
    if (b.type === 'heading') return `<select data-prop="level" aria-label="${copy.blocks.heading}">${[2,3,4,5,6].map(level=>`<option value="${level}" ${b.level===String(level)?'selected':''}>H${level}</option>`).join('')}</select>${control(copy.text,'data-prop="text"',b.text)}`;
    if (b.type === 'list') return `<label class="ve-check"><input type="checkbox" data-prop="ordered" ${b.ordered ? 'checked' : ''} />${copy.ordered}</label>${control(copy.lines,'data-prop="text"',b.text,true)}`;
    if (b.type === 'quote') return control(copy.text,'data-prop="text"',b.text,true);
    if (b.type === 'image') return control(copy.url,'data-prop="url"',b.url) + control(copy.text,'data-prop="text"',b.text) + control(copy.caption,'data-prop="caption"',b.caption);
    if (b.type === 'media') return `<select data-prop="provider" aria-label="${copy.blocks.media}">${['youtube','bilibili','apple-music','spotify','netease','qq-music'].map(p => `<option ${b.provider === p ? 'selected' : ''}>${p}</option>`).join('')}</select>${control(copy.url,'data-prop="url"',b.url)}`;
    if (b.type === 'ruby') return control(copy.text,'data-prop="text"',b.text) + control(copy.kana,'data-prop="kana"',b.kana) + control(copy.romaji,'data-prop="romaji"',b.romaji);
    if (b.type === 'details') return control(copy.detailTitle,'data-prop="title"',b.title) + richControls(b);
    if (b.type === 'table') return `<div class="ve-table-edit"><table>${b.rows.map((row, ri) => `<tr>${row.map((cell, ci) => `<td><input aria-label="${ri + 1} / ${ci + 1}" data-cell="${ri}:${ci}" value="${escapeHtml(cell)}" /></td>`).join('')}</tr>`).join('')}</table></div><div class="ve-row-tools"><button data-row>${copy.row}</button><button data-column>${copy.column}</button></div>`;
    if (b.type === 'lyrics') return `<p class="ve-hint">${copy.lyricsTiming}</p>` + b.rows.map((r,i)=>`<fieldset><legend>${i+1}</legend>${r.units?.length ? r.units.map((unit,j)=>`<div class="ve-unit" data-unit-row="${i}" data-unit-index="${j}">${unitControls(unit,'data-unit-prop')}<button data-unit-remove="${i}:${j}" ${r.units.length===1?'disabled':''}>×</button></div>`).join('') : ['original','kana','romaji','time'].map(p=>control(p==='time'?copy.timestamp:copy[p],`data-lyric="${i}:${p}"`,r[p]||'')).join('')}${control(copy.translation,`data-lyric="${i}:translation"`,r.translation)}<div class="ve-row-tools"><button data-unit-add="${i}">${copy.addUnit}</button><button data-remove-row="${i}" ${b.rows.length===1?'disabled':''}>− ${copy.lines}</button></div></fieldset>`).join('')+`<button data-row>${copy.row}</button>`;
    if(b.type==='inline')return `<select data-inline-style aria-label="${copy.specialFormat}">${inlineKinds.map(kind=>`<option value="${kind}" ${b.kind===kind?'selected':''}>${copy.inline[kind]}</option>`).join('')}</select>${inlineLabels(b.kind).map((label,i)=>control(label,`data-inline-arg="${i}"`,b.args[i]||'')).join('')}`;
    if(b.type==='code')return control(copy.languageName,'data-prop="language"',b.language)+control(copy.blocks.code,'data-prop="text"',b.text,true);
    if(b.type==='math')return `<label class="ve-check"><input type="checkbox" data-prop="display" ${b.display?'checked':''} />${copy.displayMath}</label>`+control(copy.formula,'data-prop="text"',b.text,true);
    if(b.type==='media-switcher')return control(copy.text,'data-prop="title"',b.title)+b.items.map((item,i)=>`<fieldset><legend>${i+1}</legend><select data-media="${i}:provider">${['youtube','bilibili','apple-music','spotify','netease','qq-music'].map(provider=>`<option ${provider===item.provider?'selected':''}>${provider}</option>`).join('')}</select>${control(copy.url,`data-media="${i}:url"`,item.url)}<button data-media-remove="${i}" ${b.items.length<=2?'disabled':''}>×</button></fieldset>`).join('')+`<button data-media-add ${b.items.length>=6?'disabled':''}>${copy.addMedia}</button>`;
    if (b.type === 'preserved') return `<p class="ve-hint">${copy.preservedHint}</p><details><summary>${copy.source}</summary><pre>${escapeHtml(b.text)}</pre></details>`;
    return '<hr />';
  }
  function previewBlock(b) { if(articleMode&&b.type==='image'&&/^\/_private\/article-assets\/[a-f0-9]{64}$/.test(b.url||''))return `<figure><img data-article-reference="${escapeHtml(b.url)}" alt="${escapeHtml(b.text||'')}"/>${b.caption?`<figcaption>${escapeHtml(b.caption)}</figcaption>`:''}</figure>`;return renderPreviewBlock(b,copy); }
  function canvasBlock(b) {
    if (b.type === 'paragraph' || b.type === 'list') return richControls(b);
    if (b.type === 'heading') return `<input class="ve-heading-input" data-prop="text" value="${escapeHtml(b.text)}" placeholder="${copy.blocks.heading}" aria-label="${copy.blocks.heading}"/>`;
    if (b.type === 'table') return blockControls(b);
    if (b.type === 'quote' || b.type === 'list') return `<textarea data-prop="text" rows="${Math.max(2,b.text.split('\n').length)}" aria-label="${copy.blocks[b.type]}" placeholder="${copy.blocks[b.type]}">${escapeHtml(b.text)}</textarea>`;
    return `<div class="ve-block-visual wiki-reader wiki-prose" data-inspect-block="${escapeHtml(b.id)}" tabindex="0" role="button" aria-label="${copy.properties}: ${copy.blocks[b.type] || copy.preserved}">${previewBlock(b)}</div>`;
  }
  function renderBlocks(focusId) {
    if (!draft.blocks.some(b=>b.id===activeBlockId)) activeBlockId=draft.blocks[0]?.id;
    if(focusId) activeBlockId=focusId;
    $('[data-blocks]').innerHTML = draft.blocks.map((b,i)=>`<section class="ve-block ${b.id===activeBlockId?'is-active':''}" data-block="${escapeHtml(b.id)}" data-type="${b.type}"><span class="ve-block-gutter" draggable="true" data-drag-block="${escapeHtml(b.id)}" aria-hidden="true">⠿</span><header><button data-insert-after="${escapeHtml(b.id)}" aria-label="${copy.insertAfter}">＋</button><button data-duplicate aria-label="${copy.duplicate}">⧉</button><button data-move="-1" aria-label="${copy.up}" ${i===0?'disabled':''}>↑</button><button data-move="1" aria-label="${copy.down}" ${i===draft.blocks.length-1?'disabled':''}>↓</button><button data-remove aria-label="${copy.remove}">×</button></header>${canvasBlock(b)}</section>`).join('');
    renderOutline(); renderInspector();
    if(focusId) blockElement(focusId)?.querySelector('[contenteditable],input,textarea,[data-inspect-block]')?.focus();
  }
  const blockElement = id => [...$('[data-blocks]').children].find(el=>el.dataset.block===id);
  function renderOutline() {
    $('[data-document-name]').textContent=draft.meta.name||draft.meta.title||copy.emptyTitle;
    $('[data-file-label]').textContent=articleMode?`${draft.meta.locale} · ${uiLocale==='en'?'Article':uiLocale==='ja'?'文章':'文章'}`:draft.path ? draft.path.split('/').slice(-2).join('/') : `${draft.meta.locale}.md`;
    $('[data-block-count]').textContent=`${draft.blocks.length} ${copy.blockCount}`;
    $('[data-outline]').innerHTML=draft.blocks.map((b,i)=>`<button data-outline-block="${escapeHtml(b.id)}" class="${b.id===activeBlockId?'is-active':''}" title="${escapeHtml(b.text?.slice(0,100)||copy.blocks[b.type]||copy.preserved)}"><small>${b.type==='heading'?'H'+b.level:String(i+1).padStart(2,'0')}</small><span>${escapeHtml((b.title||b.text||'').replace(/\{\{[a-z-]+::([^:}]+)(?:::[^}]*)?\}\}/g,'$1').replace(/<[^>]+>/g,'').replace(/[*#|_`>]/g,'').slice(0,45)||copy.blocks[b.type]||copy.preserved)}</span></button>`).join('')||`<p class="ve-hint">${copy.emptyOutline}</p>`;
  }
  function renderInspector() {
    const block=draft.blocks.find(b=>b.id===activeBlockId);const panel=$('[data-inspector]');
    if(!block) {panel.innerHTML=`<p>${copy.selectBlock}</p>`;return;}
    panel.dataset.block=block.id;
    panel.innerHTML=`<p class="ve-inspector-kind">${copy.blocks[block.type]||copy.preserved}</p>`+(block.type==='paragraph'?`<p class="ve-hint">${copy.paragraphHint}</p>`:blockControls(block));
  }
  function selectBlock(id,{scroll=false,inspect=false}={}) {
    if(!draft.blocks.some(b=>b.id===id))return;
    const changed=activeBlockId!==id; activeBlockId=id;
    $('[data-blocks]').querySelectorAll('.ve-block').forEach(el=>el.classList.toggle('is-active',el.dataset.block===id));
    $('[data-outline]').querySelectorAll('button').forEach(el=>el.classList.toggle('is-active',el.dataset.outlineBlock===id));
    $('[data-preview]').querySelectorAll('[data-preview-block]').forEach(el=>el.classList.toggle('is-active',el.dataset.previewBlock===id));
    if(changed)renderInspector();
    if(scroll)blockElement(id)?.scrollIntoView({block:'center',behavior:'instant'});
    if(inspect) {if(window.innerWidth<=900)setLayout('preview'); changeView('properties');}
  }
  function output() {
    if(articleMode)queueMicrotask(()=>void refreshAttachmentPreviews());
    if(draft.create&&draft.meta.schemaVersion===2){try{draft.path=entitySourcePath(draft.meta);}catch{/* Incomplete metadata is reported by validation. */}}
    const errors = articleMode?[]:[...validateDraft(draft), ...advancedErrors(draft.meta)];
    if (draft.needsOriginal) errors.push('loadOriginal');
    if(sourcePending===null && document.activeElement!==$('[data-source]')) $('[data-source]').value=serializeDraft();
    updateSourceLines(); renderOutline();
    const preview=$('[data-preview]');
    let heading=preview.querySelector('[data-preview-heading]');
    if(!heading) { heading=document.createElement('div'); heading.dataset.previewHeading=''; preview.prepend(heading); }
    const headingHtml=`<h1>${escapeHtml(draft.meta.name||draft.meta.title||copy.emptyTitle)}</h1>${draft.meta.profileTagline||draft.meta.description?`<p class="ve-deck">${escapeHtml(draft.meta.profileTagline||draft.meta.description)}</p>`:''}`;
    if(heading.innerHTML!==headingHtml) heading.innerHTML=headingHtml;
    const current=new Map([...preview.querySelectorAll(':scope > [data-preview-block]')].map(el=>[el.dataset.previewBlock,el]));
    let previous=heading;
    for(const block of draft.blocks) {
      const signature=JSON.stringify(block);let node=current.get(block.id);
      if(!node){node=document.createElement('div');node.className='ve-preview-block';node.dataset.previewBlock=block.id;}
      if(node.dataset.signature!==signature){node.innerHTML=previewBlock(block);node.dataset.signature=signature;enhanceReader(node,root.dataset.locale);}
      node.classList.toggle('is-active',block.id===activeBlockId);
      if(previous.nextElementSibling!==node)previous.after(node); previous=node; current.delete(block.id);
    }
    current.forEach(node=>node.remove());
    preview.querySelectorAll('a').forEach(a=>{a.target='_blank';a.rel='noopener noreferrer';});
    $('[data-validation]').innerHTML=errors.length?errors.map(error=>`<button data-error-field="${escapeHtml(error)}">${escapeHtml(label(error))}</button>`).join(''):`<p>${copy.ready}</p>`;
    $('[data-problem-count]').textContent=String(errors.length);
    $('[data-copy]').disabled=sourcePending!==null;
    $('[data-download]').disabled=false;
    const github = $('[data-github]');
    github.hidden = articleMode || !validPath(draft.path);
    if (!github.hidden) {
      const parts = draft.path.split('/').map(encodeURIComponent);
      const filename = parts.pop();
      github.href = draft.originalMeta ? `https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/edit/main/${parts.join('/')}/${filename}` : `https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/new/main/${parts.join('/')}?filename=${filename}`;
    }
    updateHistory();
  }
  let composing=false;
  root.addEventListener('compositionstart',()=>{composing=true;checkpoint();});
  root.addEventListener('compositionend',event=>{composing=false;const rich=event.target.closest('[data-rich]');if(rich)syncRich(rich);});
  root.addEventListener('input', event => {
    if(event.isComposing||composing)return;
    const el = event.target;
    if (!(el instanceof HTMLElement)) return;
    if(el.matches('[data-article-property]')){const key=el.dataset.articleProperty;draft.meta[key]=el.value;changed();return;}
    if(el.matches('[data-source]')) {queueSource();return;}
    if(el.matches('[data-document-title]')) {draft.meta['name' in draft.meta?'name':'title']=el.value;const field=$(`[data-field="${'name' in draft.meta?'name':'title'}"]`);if(field)field.value=el.value;changed();return;}
    if (el.matches('[data-meta-value]')) { const path=parsePath(el.dataset.metaValue); metaParent(path)[path.at(-1)]=el.type==='checkbox'?el.checked:el.type==='number'?Number(el.value):el.value; changed(); return; }
    if (el.matches('[data-field]')) {
      const spec = fieldsFor(draft).find(f => f.key === el.dataset.field);
      if (!el.value && !spec.required) delete draft.meta[spec.key];
      else draft.meta[spec.key] = spec.type === 'number' && el.value !== '' ? Number(el.value) : el.value;
    } else if (el.matches('[data-path]')) draft.path = el.value.trim();
    else {
      const block = draft.blocks.find(b => b.id === el.closest('[data-block]')?.dataset.block);
      if (!block) return;
      if (el.closest('[data-rich]')) { block.text = richMarkdown(el.closest('[data-rich]')); if(block.type==='list')block.type='paragraph'; }
      else if(el.hasAttribute('data-inline-style')) {block.kind=el.value;block.args=inlineLabels(block.kind).map((_,i)=>block.args[i]||'');renderBlocks();}
      else if(el.hasAttribute('data-inline-arg')) block.args[Number(el.dataset.inlineArg)]=el.value;
      else if(el.hasAttribute('data-media')) {const [i,p]=el.dataset.media.split(':');block.items[Number(i)][p]=el.value;}
      else if(el.hasAttribute('data-unit-prop')) {const unit=el.closest('[data-unit-row]');block.rows[Number(unit.dataset.unitRow)].units[Number(unit.dataset.unitIndex)][el.dataset.unitProp]=el.value;}
      else if (el.dataset.prop) block[el.dataset.prop] = el.type === 'checkbox' ? el.checked : el.value;
      else if (el.dataset.cell) { const [r,c] = el.dataset.cell.split(':').map(Number); block.rows[r][c] = el.value; }
      else if (el.dataset.lyric) { const [r,p] = el.dataset.lyric.split(':'); block.rows[Number(r)][p] = el.value; }
      else return;
    }
    if(el.closest('[data-inspector]')) { const id=activeBlockId,element=blockElement(id),block=draft.blocks.find(b=>b.id===id); if(element&&block) {element.querySelector(':scope > :last-child')?.remove();element.insertAdjacentHTML('beforeend',canvasBlock(block));} }
    if(el.matches('[data-field="name"],[data-field="title"]')) $('[data-document-title]').value=el.value;
    changed();
  });
  root.addEventListener('paste', event => {
    if (!event.target.closest('[data-rich]') || event.clipboardData.files.length) return;
    checkpoint(); event.preventDefault(); document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
  });
  root.addEventListener('drop', event => { if (event.target.closest('[data-rich]')) event.preventDefault(); });
  root.addEventListener('pointerdown', event => { if (event.target.closest('[data-format],[data-special],[data-inline-preset],[data-toolbar-scroll]')) event.preventDefault(); });
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const block = draft.blocks.find(b => b.id === (button.closest('[data-block]')?.dataset.block || activeBlockId));
    if(button.hasAttribute('data-add-property')) {checkpoint();const key=$('[data-advanced-type]').value;if(!metadataOptions(draft.kind,draft.meta).includes(key))return;draft.meta[key]=metadataDefault(key,draft.meta);renderAdvanced();changed(true);}
    if(button.hasAttribute('data-meta-property')){checkpoint();const path=parsePath(button.dataset.metaProperty),obj=path.reduce((o,k)=>o[k],draft.meta),key=button.dataset.property;if(nestedMetadataOptions(path,obj).includes(key))obj[key]=nestedMetadataDefault(path,key);renderAdvanced();changed(true);}
    if(button.hasAttribute('data-meta-add')) {checkpoint();const path=parsePath(button.dataset.metaAdd);const array=path.reduce((obj,key)=>obj[key],draft.meta);array.push(newMetadataItem(path.join('.'),array,draft.meta));renderAdvanced();changed(true);}
    if(button.hasAttribute('data-meta-remove')) {checkpoint();const path=parsePath(button.dataset.metaRemove),parent=metaParent(path);if(Array.isArray(parent))parent.splice(Number(path.at(-1)),1);else delete parent[path.at(-1)];renderAdvanced();changed(true);}
    if(button.hasAttribute('data-preview-provider')) {const [id,index]=button.dataset.previewProvider.split(':');const b=draft.blocks.find(b=>b.id===id);if(b){const item=b.items[Number(index)];$(`[data-preview-media="${id}"]`).innerHTML=previewMedia(item.provider,item.url);}}
    if(block && button.hasAttribute('data-media-add')){checkpoint();if(block.items.length<6)block.items.push({provider:'youtube',url:''});renderBlocks(block.id);changed(true);}
    if(block && button.hasAttribute('data-media-remove')){checkpoint();if(block.items.length>2)block.items.splice(Number(button.dataset.mediaRemove),1);renderBlocks(block.id);changed(true);}
    if(block && button.hasAttribute('data-unit-add')){checkpoint();const row=block.rows[Number(button.dataset.unitAdd)];if(!row.units?.length)row.units=[{original:row.original,kana:row.kana,romaji:row.romaji,time:row.time||''}];row.units.push({original:'',kana:'',romaji:'',time:''});renderBlocks(block.id);changed(true);}
    if(block && button.hasAttribute('data-unit-remove')){checkpoint();const [i,j]=button.dataset.unitRemove.split(':').map(Number);if(block.rows[i].units.length>1)block.rows[i].units.splice(j,1);renderBlocks(block.id);changed(true);}
    if(button.hasAttribute('data-load-media')) {loadPreviewMedia(button);return;}
    if (button.dataset.format) {
      const rich=blockElement(activeBlockId)?.querySelector('[data-rich]');
      if(!rich){$('[data-action-status]').textContent=copy.paragraphHint;return;}
      restoreSelection(rich);
      if(button.dataset.format==='link') {openLink(rich);return;}
      checkpoint(); document.execCommand(button.dataset.format,false); syncRich(rich); return;
    }
    if(button.hasAttribute('data-duplicate')&&block) {checkpoint();const next=structuredClone(block);next.id=crypto.randomUUID();draft.blocks.splice(draft.blocks.indexOf(block)+1,0,next);renderBlocks(next.id);changed(true);}
    if (button.hasAttribute('data-remove')) { checkpoint(); draft.blocks = draft.blocks.filter(b => b !== block); if(!draft.blocks.length)draft.blocks.push(newBlock('paragraph')); renderBlocks(); changed(true); }
    if (button.dataset.move) { checkpoint(); const i = draft.blocks.indexOf(block), j = i + Number(button.dataset.move); if (j < 0 || j >= draft.blocks.length) return; [draft.blocks[i],draft.blocks[j]] = [draft.blocks[j],draft.blocks[i]]; renderBlocks(block.id); changed(true); }
    if (button.hasAttribute('data-row')) { checkpoint(); block.rows.push(block.type === 'table' ? block.rows[0].map(() => '') : {original:'',kana:'',romaji:'',translation:''}); renderBlocks(block.id); changed(true); }
    if (button.hasAttribute('data-column')) { checkpoint(); block.rows.forEach(row => row.push('')); renderBlocks(block.id); changed(true); }
    if (button.hasAttribute('data-remove-row')) { checkpoint(); block.rows.splice(Number(button.dataset.removeRow),1); renderBlocks(block.id); changed(true); }
  });
  function syncRich(rich, structural=false) {
    const block=draft.blocks.find(b=>b.id===rich.closest('[data-block]')?.dataset.block);
    if(!block)return;
    block.text=richMarkdown(rich);if(block.type==='list')block.type='paragraph';
    changed(structural);
  }
  root.addEventListener('keydown',event=>{
    const rich=event.target.closest('[data-rich]');
    if(!rich||event.isComposing||composing||event.defaultPrevented)return;
    const selection=window.getSelection();
    if(!selection?.rangeCount||!rich.contains(selection.focusNode))return;
    if(!rich.contains(selection.getRangeAt(0).startContainer)||!rich.contains(selection.getRangeAt(0).endContainer))return;
    const range=selection.getRangeAt(0), parent=selection.anchorNode.nodeType===Node.ELEMENT_NODE?selection.anchorNode:selection.anchorNode.parentElement;
    const li=parent.closest('li');
    if(event.key==='Tab'&&li&&rich.contains(li)) {
      event.preventDefault();if(!event.shiftKey&&!li.previousElementSibling)return;checkpoint();document.execCommand(event.shiftKey?'outdent':'indent',false);syncRich(rich,true);return;
    }
    if(event.key===' '&&selection.isCollapsed&&!li) {
      const line=parent.closest('p,div');
      const prefix=range.cloneRange();prefix.selectNodeContents(line&&rich.contains(line)?line:rich);prefix.setEnd(range.startContainer,range.startOffset);
      const trigger=markdownTrigger(prefix.toString());
      if(trigger){event.preventDefault();checkpoint();prefix.deleteContents();selection.removeAllRanges();selection.addRange(prefix);document.execCommand(trigger.command,false,trigger.value);syncRich(rich,true);return;}
    }
    if(event.key==='Enter'&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!li) {
      // Split at the caret, preserving inline markup and both sides of a selection.
      event.preventDefault();checkpoint();range.deleteContents();
      const tail=range.cloneRange();tail.setEnd(rich,rich.childNodes.length);
      const rest=document.createElement('div');rest.append(tail.extractContents());
      const block=draft.blocks.find(b=>b.id===rich.closest('[data-block]').dataset.block);
      block.text=richMarkdown(rich);if(block.type==='list')block.type='paragraph';
      const next={...newBlock('paragraph'),text:richMarkdown(rest)};
      draft.blocks.splice(draft.blocks.indexOf(block)+1,0,next);renderBlocks(next.id);changed(true);return;
    }
    if(event.key==='Backspace'&&selection.isCollapsed&&!li){
      const prefix=range.cloneRange();prefix.selectNodeContents(rich);prefix.setEnd(range.startContainer,range.startOffset);
      const index=draft.blocks.findIndex(b=>b.id===rich.closest('[data-block]').dataset.block),previous=draft.blocks[index-1];
      if(!prefix.toString()&&index>0&&previous?.type==='paragraph'&&!prefix.cloneContents().querySelector('img,[data-ve-source]')){
        event.preventDefault();checkpoint();const previousRich=blockElement(previous.id)?.querySelector('[data-rich]');
        if(previousRich){const marker=document.createElement('span');marker.dataset.caretMarker='';previousRich.append(marker);while(rich.firstChild)previousRich.append(rich.firstChild);const caret=document.createRange();caret.setStartBefore(marker);caret.collapse(true);marker.remove();previous.text=richMarkdown(previousRich);draft.blocks.splice(index,1);rich.closest('[data-block]').remove();selection.removeAllRanges();selection.addRange(caret);previousRich.focus();activeBlockId=previous.id;changed(true);return;}
      }
    }
    if(event.key==='Backspace'&&selection.isCollapsed&&!rich.textContent.trim()&&!rich.querySelector('img,[data-ve-source]')&&!li) {
      const index=draft.blocks.findIndex(b=>b.id===rich.closest('[data-block]').dataset.block);
      if(index>0){event.preventDefault();checkpoint();draft.blocks.splice(index,1);const previous=draft.blocks[index-1];renderBlocks(previous.id);const editable=blockElement(previous.id)?.querySelector('[data-rich]');if(editable){const end=document.createRange();end.selectNodeContents(editable);end.collapse(false);selection.removeAllRanges();selection.addRange(end);}changed(true);}
    }
  });
  let inlineContext=null;
  function inlineFields(args=[]) {const kind=$('[data-inline-kind]').value;$('[data-inline-args]').innerHTML=inlineLabels(kind).map((label,i)=>control(label,`data-dialog-arg="${i}"`,args[i]||'')).join('');inlinePreview();}
  function openInline(rich,chip=null,preset=null) {
    const selection=window.getSelection(); let range=selection?.rangeCount?selection.getRangeAt(0).cloneRange():null;
    if(!range||!rich.contains(range.commonAncestorContainer)){range=document.createRange();range.selectNodeContents(rich);range.collapse(false);}
    const parts=chip?inlineParts(decodeURIComponent(chip.dataset.veSource)):null;
    inlineContext={rich,chip,range};$('[data-inline-kind]').value=parts?.kind||preset||'ruby';inlineFields(parts?.args||[selection?.toString()||'']);$('#ve-inline-title').textContent=copy.inline[$('[data-inline-kind]').value];$('[data-inline-error]').textContent='';$('[data-inline-dialog]').showModal();
  }
  root.addEventListener('click',event=>{
    const special=event.target.closest('[data-special],[data-inline-preset]');if(special){const rich=blockElement(activeBlockId)?.querySelector('[data-rich]');if(rich){restoreSelection(rich);const preset=special.dataset.inlinePreset;if(['mark','spoiler','kbd','small','sub','sup'].includes(preset)&&window.getSelection()?.toString()){applyInlineSelection(rich,preset);}else openInline(rich,null,preset);special.closest('details')?.removeAttribute('open');}else{$('[data-action-status]').textContent=copy.paragraphHint;}}
    const chip=event.target.closest('[data-ve-source]');if(chip?.closest('[data-rich]'))openInline(chip.closest('[data-rich]'),chip);
  });
  root.addEventListener('keydown',event=>{const chip=event.target.closest('[data-ve-source]');if(chip?.closest('[data-rich]')&&['Enter',' '].includes(event.key)){event.preventDefault();openInline(chip.closest('[data-rich]'),chip);}});
  $('[data-inline-kind]').addEventListener('change',()=>inlineFields([...root.querySelectorAll('[data-dialog-arg]')].map(input=>input.value)));
  $('[data-inline-apply]').addEventListener('click',()=>{
    const kind=$('[data-inline-kind]').value,args=[...root.querySelectorAll('[data-dialog-arg]')].map(input=>input.value.trim()).filter((arg,i)=>kind!=='ruby'||i<2||arg);
    if(args.some(arg=>!arg||/[{}\n]/.test(arg))){$('[data-inline-error]').textContent=copy.missing+copy.argument;return;}
    const {rich,chip,range}=inlineContext;const template=document.createElement('template');template.innerHTML=shortcodeChip(inlineSource(kind,args));const node=template.content.firstChild;
    checkpoint();
    if(chip)chip.replaceWith(node);else {range.deleteContents();range.insertNode(node);}
    const block=draft.blocks.find(b=>b.id===rich.closest('[data-block]').dataset.block);block.text=richMarkdown(rich);changed();$('[data-inline-dialog]').close();rich.focus();
  });
  $('[data-kind]').addEventListener('change', event => {
    if (!window.confirm(copy.replace)) { event.target.value = draft.kind; return; }
    checkpoint(); clearPendingSource(); draft = newDraft(event.target.value, draft.meta.locale); renderFields(); renderBlocks(); changed(true);
  });
  $('[data-locale-select]').addEventListener('change', event => { checkpoint(); draft.meta.locale = event.target.value; renderFields(); changed(true); });
   $('[data-add]').addEventListener('click',()=>insertBlock($('[data-block-type]').value));
  $('[data-undo]').addEventListener('click', () => { checkpoint(); if (!cursor) return; clearPendingSource(); draft = JSON.parse(history[--cursor]); savedRange=null; renderFields(); renderBlocks(activeBlockId); save(); output(); });
  $('[data-redo]').addEventListener('click', () => { if (cursor >= history.length - 1) return; clearPendingSource(); draft = JSON.parse(history[++cursor]); savedRange=null; renderFields(); renderBlocks(activeBlockId); save(); output(); });
  function changeView(view) {
    const previous=root.querySelector('[data-view][aria-selected="true"]')?.dataset.view;
    root.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===view;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    $('#ve-preview').hidden=view!=='preview'; $('#ve-properties').hidden=view!=='properties';
    if(previous!==view)revealPanel(view==='preview'?$('#ve-preview'):$('#ve-properties'));
  }
  root.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>changeView(button.dataset.view)));
  $('[data-copy]').addEventListener('click', async () => { try { await navigator.clipboard.writeText(serializeDraft()); $('[data-action-status]').textContent = copy.copied; } catch { changeMode('source'); $('[data-source]').select(); $('[data-action-status]').textContent = copy.copyFailed; } });
  $('[data-download]').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([sourcePending ?? serializeDraft()], {type:'text/markdown;charset=utf-8'}));
    const link = document.createElement('a'); link.href = url; link.download = `${draft.meta.locale}.md`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('[data-import-open]').addEventListener('click', () => { $('[data-import-error]').textContent = ''; $('[data-import-dialog]').showModal(); });
  $('[data-import-file]').addEventListener('change', async event => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 1_000_000) { $('[data-import-error]').textContent = copy.invalid; return; } $('[data-import-text]').value = await file.text(); });
  $('[data-import-apply]').addEventListener('click', () => {
    try {
      const imported = importMarkdown($('[data-import-text]').value, draft.kind, draft.path);
      if (!window.confirm(copy.replace)) return;
      checkpoint(); clearPendingSource(); draft = imported; renderFields(); renderBlocks(); changed(true); $('[data-import-dialog]').close();
    } catch { $('[data-import-error]').textContent = copy.invalid; }
  });
  const hasWork = () => sourcePending!==null || Boolean(draft.meta.name || draft.meta.title || draft.meta.translationKey || draft.blocks.some(b => b.text || ['table','lyrics'].includes(b.type)));
  let loadRequest = 0;
  const originalCache = new Map();
  async function loadOriginal(path, ask = true) {
    const request = sourceRequest(path);
    if (!request) return;
    if (ask && hasWork() && !window.confirm(copy.replace)) return;
    const token = ++loadRequest;
    $('[data-load-status]').textContent = copy.loading;
    root.setAttribute('aria-busy','true');
    $('.ve-workspace').inert = true;
    for (const selector of ['[data-copy]','[data-download]','[data-import-open]','[data-new-entry]']) $(selector).disabled = true;
    try {
      let backendSource=null;
      if(prDemo){const response=await fetch(editorApiBase+'/api/editor/source?path='+encodeURIComponent(path),{credentials:'include'});if(response.ok)backendSource=await response.json();else if(response.status!==401)throw new Error('source');}
      let files = backendSource?{[path]:backendSource.content}:originalCache.get(request);
      if (!files) {
        const response = await fetch(request);
        if (!response.ok) throw new Error('source');
        files = (await response.json()).files;
        if (!files || typeof files !== 'object') throw new Error('source');
        originalCache.set(request, files);
      }
      const actualPath = Object.keys(files).find(key => key.normalize('NFC') === path.normalize('NFC'));
      if (!actualPath || typeof files[actualPath] !== 'string') throw new Error('source');
      const imported = importMarkdown(files[actualPath], path.split('/')[2], actualPath);
      if(backendSource){imported.baseSha=backendSource.sha;imported.baseContent=backendSource.content;}
      if (token !== loadRequest) return;
      checkpoint(); clearPendingSource(); draft = imported;
      renderFields(); renderBlocks(); changed(true);
      root.dispatchEvent(new CustomEvent('editor-source-loaded'));
      $('[data-existing-picker]').hidden = false; changeSide('outline');
      $('[data-load-status]').textContent = copy.loaded + ' ' + actualPath;
      const url = new URL(location.href); url.searchParams.set('target',actualPath); window.history.replaceState(null,'',url);
    } catch {
      if (token === loadRequest) {
        $('[data-load-status]').textContent = copy.loadFailed;
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'context-action'; retry.textContent = copy.load; retry.addEventListener('click',()=>loadOriginal(path,false)); $('[data-load-status]').append(' ',retry);
      }
    } finally {
      if (token === loadRequest) {
        root.removeAttribute('aria-busy'); $('.ve-workspace').inert = false;
        $('[data-import-open]').disabled = false; $('[data-new-entry]').disabled = false;
        output();
      }
    }
  }
  let entries = [], catalogLocale = '';
  function renderMatches() {
    const query = $('[data-entry-search]').value.trim().toLocaleLowerCase();
    const kind=$('[data-entry-kind]').value;
    const filtered=entries.filter(entry => (!kind||entry.kind===kind) && query.split(/\s+/).every(term=>`${entry.title} ${entry.path}`.toLocaleLowerCase().includes(term)));
    const matches=filtered.slice(0,50);
    $('[data-entry-count]').textContent=`${filtered.length} ${copy.results}${filtered.length>50?' · '+copy.moreResults:''}`;
    $('[data-entry-results]').innerHTML = matches.length ? matches.map(entry => `<button class="ve-entry-result" title="${escapeHtml(entry.title)}" data-load-path="${escapeHtml(entry.path)}"><strong>${escapeHtml(entry.title)}</strong><span class="ve-entry-kind">${escapeHtml(copy.kinds[entry.kind])}</span><small>${escapeHtml(entry.path.replace('src/content/',''))}</small></button>`).join('') : `<p>${copy.notFound}</p>`;
  }
  $('[data-existing-open]').addEventListener('click', async () => {
    changeSide('files');
    $('[data-existing-picker]').hidden = false; $('[data-entry-search]').focus();
    const locale = draft.meta.locale;
    if (catalogLocale !== locale) {
      $('[data-entry-results]').textContent = copy.loading; $('[data-entry-retry]').hidden=true;
      try {
        const response = await fetch(`/${locale}/editor-catalog.json`);
        if (!response.ok) throw new Error('catalog');
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('catalog');
        entries = data; catalogLocale = locale;
      } catch { $('[data-entry-results]').textContent = copy.loadFailed; $('[data-entry-retry]').hidden=false; return; }
    }
    renderMatches();
  });
  $('[data-entry-search]').addEventListener('input', renderMatches);
  $('[data-entry-kind]').addEventListener('change',renderMatches);
  $('[data-entry-retry]').addEventListener('click',()=>$('[data-existing-open]').click());
  $('[data-existing-picker]').addEventListener('keydown',event=>{
    if(event.isComposing)return;
    const buttons=[...root.querySelectorAll('[data-load-path]')],index=buttons.indexOf(event.target);
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,index+(event.key==='ArrowDown'?1:-1)))]?.focus();}
    if(event.key==='Enter'&&event.target.matches('[data-entry-search]')){event.preventDefault();buttons[0]?.click();}
    if(event.key==='Escape'){root.setAttribute('data-sidebar-hidden','');$('[data-existing-open]').focus();}
  });
  $('[data-entry-results]').addEventListener('click', event => {
    const path = event.target.closest('[data-load-path]')?.dataset.loadPath;
    if (path) loadOriginal(path);
  });
  $('[data-new-entry]').addEventListener('click', () => openNewEntry());

  function applyInlineSelection(rich,kind) {
    const selection=window.getSelection();if(!selection?.rangeCount)return;
    checkpoint();const range=selection.getRangeAt(0),template=document.createElement('template');template.innerHTML=shortcodeChip(inlineSource(kind,[selection.toString()]));const token=template.content.firstChild;
    range.deleteContents();range.insertNode(token);range.setStartAfter(token);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
    const block=draft.blocks.find(b=>b.id===rich.closest('[data-block]').dataset.block);block.text=richMarkdown(rich);changed();$('[data-selection-toolbar]').hidden=true;
  }
  let savedRange=null;
  document.addEventListener('selectionchange',()=>{
    const selection=window.getSelection(),toolbar=$('[data-selection-toolbar]');
    if(!selection?.rangeCount){toolbar.hidden=true;return;}
    const rich=selection.anchorNode?.parentElement?.closest('[data-rich]');
    if(!rich||!root.contains(rich)||!rich.contains(selection.focusNode)){toolbar.hidden=true;return;}
    savedRange=selection.getRangeAt(0).cloneRange();
    for(const button of root.querySelectorAll('[data-format]')) if(['bold','italic','strikeThrough','insertOrderedList','insertUnorderedList'].includes(button.dataset.format)) {
      button.setAttribute('aria-pressed',String(document.queryCommandState(button.dataset.format)));
    }
    if(selection.isCollapsed||root.querySelector('dialog[open]')){toolbar.hidden=true;return;}
    const rect=savedRange.getBoundingClientRect();toolbar.hidden=false;
    const width=toolbar.getBoundingClientRect().width;
    toolbar.style.left=`${Math.max(8,Math.min(innerWidth-width-8,rect.left+rect.width/2-width/2))}px`;
    toolbar.style.top=`${Math.max(60,rect.top-48)}px`;
    for(const button of root.querySelectorAll('[data-format]'))if(['bold','italic','strikeThrough'].includes(button.dataset.format))button.setAttribute('aria-pressed',String(document.queryCommandState(button.dataset.format)));
  });
  $('.ve-canvas').addEventListener('scroll',()=>{$('[data-selection-toolbar]').hidden=true;});
  function restoreSelection(rich) {rich.focus();const selection=window.getSelection();if(savedRange&&rich.contains(savedRange.commonAncestorContainer)){selection.removeAllRanges();selection.addRange(savedRange);}else{const range=document.createRange();range.selectNodeContents(rich);range.collapse(false);selection.removeAllRanges();selection.addRange(range);}}
  let linkContext;
  function openLink(rich) {const selection=window.getSelection();linkContext={rich,range:selection.getRangeAt(0).cloneRange()};$('[data-link-text]').value=selection.toString();$('[data-link-url]').value='';$('[data-link-error]').textContent='';$('[data-link-dialog]').showModal();$('[data-link-url]').focus();}
  $('[data-link-apply]').addEventListener('click',()=>{
    const url=$('[data-link-url]').value.trim(),text=$('[data-link-text]').value||url;
    if(!safeUrl(url)){$('[data-link-error]').textContent=copy.missing+copy.url;return;}
    checkpoint();const link=document.createElement('a');link.href=url;link.textContent=text;
    const {range,rich}=linkContext;range.deleteContents();range.insertNode(link);
    const block=draft.blocks.find(b=>b.id===rich.closest('[data-block]').dataset.block);block.text=richMarkdown(rich);
    $('[data-link-dialog]').close();rich.focus();changed();
  });
  function inlinePreview() {const kind=$('[data-inline-kind]').value,args=[...root.querySelectorAll('[data-dialog-arg]')].map(el=>el.value).filter((value,i)=>kind!=='ruby'||i<2||value);$('[data-inline-preview]').innerHTML=shortcodeChip(inlineSource(kind,args));}
  $('[data-inline-args]').addEventListener('input',inlinePreview);
  function changeSide(side) {const previous=root.dataset.side;root.dataset.side=side;root.removeAttribute('data-sidebar-hidden');root.querySelectorAll('[data-side-panel]').forEach(panel=>panel.hidden=panel.dataset.sidePanel!==side);root.querySelectorAll('[data-side-button]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.sideButton===side)));if(previous!==side)revealPanel(root.querySelector(`[data-side-panel="${side}"]`));}
  function setLayout(layout) {
    root.dataset.layout=layout;
    if(layout==='preview')changeView('preview');
    root.querySelectorAll('[data-mobile-pane]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.mobilePane===(layout==='preview'?'preview':'write'))));
  }
  function changeMode(mode) {
    const previous=root.dataset.mode;
    if(mode==='visual'&&sourcePending!==null&&!applySource())return false;
    root.dataset.mode=mode;$('#ve-canvas').hidden=mode!=='visual';$('#ve-source').hidden=mode!=='source';
    root.querySelectorAll('button[data-mode]').forEach(button=>{const active=button.dataset.mode===mode;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    if(mode==='source'){$('[data-source]').value=sourcePending??serializeDraft();updateSourceLines();$('[data-source]').focus();}
    if(previous!==mode)revealPanel(mode==='visual'?$('#ve-canvas'):$('#ve-source'));
    return true;
  }
  const motionCleanups=[...root.querySelectorAll('[role="tablist"]')].map(enhanceTabRail);
  document.addEventListener('astro:before-swap',()=>motionCleanups.forEach(cleanup=>cleanup?.()),{once:true});
  root.querySelectorAll('[data-side-button]').forEach(button=>button.addEventListener('click',()=>{changeSide(button.dataset.sideButton);if(button.dataset.sideButton==='files')$('[data-existing-open]').click();}));
  const hideSidebar=()=>{root.setAttribute('data-sidebar-hidden','');root.querySelectorAll('[data-side-button]').forEach(button=>button.setAttribute('aria-pressed','false'));root.querySelector('.ve-activity [data-side-button="'+root.dataset.side+'"]')?.focus();};
  root.querySelectorAll('[data-sidebar-close]').forEach(button=>button.addEventListener('click',hideSidebar));
  $('[data-sidebar-toggle]').addEventListener('click',()=>root.hasAttribute('data-sidebar-hidden')?changeSide(root.dataset.side||'outline'):hideSidebar());
  root.querySelector('.ve-tools-menu')?.addEventListener('click',event=>{if(event.target.closest('button,a'))event.currentTarget.open=false;});
  root.querySelectorAll('button[data-layout]').forEach(button=>button.addEventListener('click',()=>setLayout(root.dataset.layout===button.dataset.layout?'split':button.dataset.layout)));
  root.querySelectorAll('[data-mobile-pane]').forEach(button=>button.addEventListener('click',()=>setLayout(button.dataset.mobilePane==='preview'?'preview':'split')));
  requestAnimationFrame(()=>requestAnimationFrame(()=>{root.dataset.motionReady='';}));
  root.querySelectorAll('button[data-mode]').forEach(button=>button.addEventListener('click',()=>changeMode(button.dataset.mode)));
  root.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;const tabs=[...list.querySelectorAll('[role="tab"]')];const index=tabs.indexOf(event.target);if(index<0)return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next].click();tabs[next].focus();}));
  root.addEventListener('focusin',event=>{const id=event.target.closest('[data-block]')?.dataset.block;if(id)selectBlock(id);});
  root.addEventListener('click',event=>{
    const outline=event.target.closest('[data-outline-block]');if(outline){if(root.dataset.layout==='preview')setLayout('write');if(!changeMode('visual'))return;selectBlock(outline.dataset.outlineBlock,{scroll:true});if(innerWidth<=900)root.setAttribute('data-sidebar-hidden','');}
    const visual=event.target.closest('[data-inspect-block]');if(visual&&!event.target.closest('a,button,summary'))selectBlock(visual.dataset.inspectBlock,{inspect:true});
    const preview=event.target.closest('[data-preview-block]');if(preview&&!event.target.closest('a,button,summary,.wiki-spoiler,abbr'))selectBlock(preview.dataset.previewBlock,{scroll:true});
    const error=event.target.closest('[data-error-field]');if(error){const field=$(`[data-field="${error.dataset.errorField}"]`);if(field){changeSide('properties');field.focus();}else{const block=draft.blocks.find(b=>b.type===error.dataset.errorField||error.dataset.errorField==='url'&&['image','media'].includes(b.type));if(block)selectBlock(block.id,{scroll:true,inspect:true});}}
  });
  root.addEventListener('keydown',event=>{const visual=event.target.closest('[data-inspect-block]');if(visual&&['Enter',' '].includes(event.key)){event.preventDefault();selectBlock(visual.dataset.inspectBlock,{inspect:true});}});
  function updateSourceLines() {const area=$('[data-source]');$('[data-source-lines]').textContent=Array.from({length:area.value.split('\n').length},(_,i)=>i+1).join('\n');$('[data-source-lines]').scrollTop=area.scrollTop;}
  $('[data-source]').addEventListener('scroll',()=>{$('[data-source-lines]').scrollTop=$('[data-source]').scrollTop;});
  function clearPendingSource() {clearTimeout(sourceTimer);sourcePending=null;$('[data-source-error]').hidden=true;try{localStorage.removeItem(sourceKey);}catch{/* Optional persistence. */}}
  function queueSource() {
    sourcePending=$('[data-source]').value;updateSourceLines();
    try{localStorage.setItem(sourceKey,sourcePending);}catch{saving=false;}
    $('[data-save-status]').textContent=copy.sourcePending;clearTimeout(sourceTimer);sourceTimer=setTimeout(applySource,500);
  }
  function applySource() {
    if(sourcePending===null)return true;
    if(articleMode){checkpoint();draft.blocks=parseVisualBlocks(sourcePending);draft.articleOriginalBody=sourcePending;draft.articleBodySnapshot=JSON.stringify(draft.blocks);clearPendingSource();renderBlocks();changed(true);return true;}
    try {const next=importMarkdown(sourcePending,draft.kind,draft.path);next.baseSha=draft.baseSha;next.baseContent=draft.baseContent;next.create=draft.create;next.assets=draft.assets;checkpoint();draft=next;clearPendingSource();renderFields();renderBlocks();changed(true);return true;}
    catch {$('[data-source-error]').textContent=copy.sourceError;$('[data-source-error]').hidden=false;$('[data-copy]').disabled=true;return false;}
  }
  $('[data-source]').addEventListener('keydown',event=>{if(event.key==='Tab'){event.preventDefault();const area=event.target;area.setRangeText('  ',area.selectionStart,area.selectionEnd,'end');queueSource();}});
  function insertBlock(type, ordered=false) {
    if(!blockTypes.includes(type))return;
    if(sourcePending!==null&&!applySource())return;
    checkpoint();const block=type==='list'?{...newBlock('paragraph'),text:ordered?'1. ':'- '}:newBlock(type),index=draft.blocks.findIndex(b=>b.id===activeBlockId);
    const replace=insertOnly&&draft.blocks[index]?.type==='paragraph'&&!draft.blocks[index].text.trim();
    draft.blocks.splice(index<0?draft.blocks.length:replace?index:index+1,replace?1:0,block);changeMode('visual');if(root.dataset.layout==='preview')setLayout('write');renderBlocks(block.id);changed(true);blockElement(block.id)?.scrollIntoView({block:'center'});
    if(!['paragraph','heading','table','list','quote','divider'].includes(type)){changeView('properties');if(innerWidth<=900)root.dataset.layout='preview';}
  }
  let commandItems=[],commandIndex=0,insertOnly=false;
  const commandActions=()=>[
    {label:copy.editExisting,shortcut:'⌘ P',run:()=>{$('[data-existing-open]').click();}},
    {label:copy.newEntry,run:()=>{$('[data-new-entry]').click();}},
    {label:copy.import,run:()=>{$('[data-import-open]').click();}},
    {label:copy.download,run:()=>{$('[data-download]').click();}},
    {label:copy.undo,shortcut:'⌘ Z',run:()=>{$('[data-undo]').click();}},
    {label:copy.redo,shortcut:'⌘ ⇧ Z',run:()=>{$('[data-redo]').click();}},
    {label:copy.visual,run:()=>changeMode('visual')},
    {label:copy.codeView,run:()=>changeMode('source')},
    {label:copy.searchText,shortcut:'⌘ F',run:()=>openFind()},
    {label:copy.writeOnly,run:()=>setLayout('write')},
    {label:copy.split,run:()=>setLayout('split')},
    {label:copy.metadata,run:()=>changeSide('properties')},
    {label:copy.numberList,shortcut:copy.insert,keywords:'ordered numbered list 有序 编号',run:()=>insertBlock('list',true)},
    ...blockTypes.map(type=>({label:type==='list'?copy.bulletList:copy.blocks[type],shortcut:copy.insert,keywords:type,run:()=>insertBlock(type)})),
  ];
  function renderCommands() {const query=$('[data-command-search]').value.toLocaleLowerCase().replace(/^\//,'').trim();commandItems=commandActions().filter(item=>(!insertOnly||item.shortcut===copy.insert)&&`${item.label} ${item.keywords||''}`.toLocaleLowerCase().includes(query));commandIndex=0;$('[data-command-results]').innerHTML=commandItems.length?commandItems.map((item,i)=>`<button id="ve-command-${i}" data-command-index="${i}" role="option" aria-selected="${i===0}"><span>${escapeHtml(item.label)}</span><small>${escapeHtml(kbdLabel(item.shortcut||''))}</small></button>`).join(''):`<p class="ve-hint">${copy.noCommands}</p>`;updateCommandSelection();}
  function updateCommandSelection() {const buttons=[...root.querySelectorAll('[data-command-index]')];buttons.forEach((b,i)=>b.setAttribute('aria-selected',String(i===commandIndex)));const current=buttons[commandIndex];if(current){$('[data-command-search]').setAttribute('aria-activedescendant',current.id);current.scrollIntoView({block:'nearest'});}else $('[data-command-search]').removeAttribute('aria-activedescendant');}
  function openCommands(onlyInsert=false) {closeInsert();insertOnly=onlyInsert;$('[data-command-search]').value='';renderCommands();$('[data-command-dialog]').showModal();$('[data-command-search]').focus();}
  function runCommand(index) {const command=commandItems[index];if(!command)return;$('[data-command-dialog]').close();command.run();}
  root.querySelectorAll('[data-command-open]').forEach(button=>button.addEventListener('click',()=>openCommands()));
  const insertPopover=$('[data-insert-popover]'),insertSearch=$('[data-insert-search]'),insertResults=$('[data-insert-results]');
  let insertItems=[],insertIndex=0,insertOrigin=null,insertRect=null;
  function closeInsert({restoreFocus=false}={}) {if(insertPopover.hidden)return;insertPopover.hidden=true;insertSearch.setAttribute('aria-expanded','false');if(restoreFocus&&insertOrigin?.isConnected)insertOrigin.focus();}
  function positionInsert() {
    if(insertPopover.hidden||!insertRect)return;
    const bounds=insertPopover.getBoundingClientRect(),width=bounds.width,height=bounds.height;
    const left=Math.max(8,Math.min(innerWidth-width-8,insertRect.left));
    const below=insertRect.bottom+7,top=below+height>innerHeight-8&&insertRect.top-height-7>=8?insertRect.top-height-7:Math.max(8,Math.min(below,innerHeight-height-8));
    insertPopover.style.left=`${left}px`;insertPopover.style.top=`${top}px`;
  }
  function renderInsert() {
    const query=insertSearch.value.toLocaleLowerCase().trim();
    insertItems=commandActions().filter(item=>item.shortcut===copy.insert&&`${item.label} ${item.keywords||''}`.toLocaleLowerCase().includes(query));
    insertIndex=0;
    insertResults.innerHTML=insertItems.length?insertItems.map((item,i)=>`<button type="button" id="ve-insert-${i}" data-insert-index="${i}" role="option" aria-selected="${i===0}"><span>${escapeHtml(item.label)}</span></button>`).join(''):`<p class="ve-hint">${copy.noCommands}</p>`;
    updateInsertSelection();positionInsert();
  }
  function updateInsertSelection(){const buttons=[...insertResults.querySelectorAll('[data-insert-index]')];buttons.forEach((button,i)=>button.setAttribute('aria-selected',String(i===insertIndex)));const current=buttons[insertIndex];if(current){insertSearch.setAttribute('aria-activedescendant',current.id);current.scrollIntoView({block:'nearest'});}else insertSearch.removeAttribute('aria-activedescendant');}
  function openInsert(origin,rect) {
    insertOnly=true;insertOrigin=origin;insertRect=rect||origin.getBoundingClientRect();
    insertPopover.hidden=false;insertSearch.value='';insertSearch.setAttribute('aria-expanded','true');renderInsert();insertSearch.focus();
  }
  function runInsert(index){const command=insertItems[index];if(!command)return;closeInsert();command.run();}
  root.querySelectorAll('[data-insert-open]').forEach(button=>button.addEventListener('click',()=>openInsert(button)));
  root.addEventListener('click',event=>{const after=event.target.closest('[data-insert-after]');if(after){selectBlock(after.dataset.insertAfter);openInsert(after);}});
  insertSearch.addEventListener('input',renderInsert);
  insertSearch.addEventListener('keydown',event=>{if(event.isComposing)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();insertIndex=(insertIndex+(event.key==='ArrowDown'?1:-1)+insertItems.length)%Math.max(1,insertItems.length);updateInsertSelection();}else if(event.key==='Enter'){event.preventDefault();runInsert(insertIndex);}else if(event.key==='Escape'){event.preventDefault();closeInsert({restoreFocus:true});}});
  insertResults.addEventListener('click',event=>{const button=event.target.closest('[data-insert-index]');if(button)runInsert(Number(button.dataset.insertIndex));});
  document.addEventListener('pointerdown',event=>{if(!insertPopover.hidden&&!insertPopover.contains(event.target)&&!event.target.closest('[data-insert-open],[data-insert-after]'))closeInsert();});
  window.addEventListener('resize',()=>{if(!insertPopover.hidden)positionInsert();});
  root.querySelectorAll('.ve-canvas,.ve-output,.ve-sidebar').forEach(panel=>panel.addEventListener('scroll',()=>closeInsert(),{passive:true}));
  $('[data-command-search]').addEventListener('input',renderCommands);
  $('[data-command-results]').addEventListener('click',event=>{const button=event.target.closest('[data-command-index]');if(button)runCommand(Number(button.dataset.commandIndex));});
  $('[data-command-search]').addEventListener('keydown',event=>{if(event.isComposing)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();commandIndex=(commandIndex+(event.key==='ArrowDown'?1:-1)+commandItems.length)%Math.max(1,commandItems.length);updateCommandSelection();}if(event.key==='Enter'){event.preventDefault();runCommand(commandIndex);}});
  function openFind() {$('[data-find-dialog]').showModal();$('[data-find-text]').focus();}
  $('[data-find-open]').addEventListener('click',openFind);
  for (const dialog of root.querySelectorAll('dialog')) dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();});
  document.addEventListener('click',event=>{for(const details of root.querySelectorAll('.ve-export-menu,.ve-theme-menu,.ve-format-more'))if(details.hasAttribute('open')&&!details.contains(event.target))details.removeAttribute('open');});
  let findOffset=0,lastFind='';
  function findNext() {
    const query=$('[data-find-text]').value.toLocaleLowerCase();if(!query)return;
    if(query!==lastFind){findOffset=0;lastFind=query;}
    if(root.dataset.mode==='source'){const area=$('[data-source]'),haystack=area.value.toLocaleLowerCase();let index=haystack.indexOf(query,findOffset);if(index<0)index=haystack.indexOf(query);if(index<0){$('[data-find-status]').textContent=copy.noMatches;return;}findOffset=index+query.length;$('[data-find-dialog]').close();area.focus();area.setSelectionRange(index,findOffset);area.scrollTop=Math.max(0,area.value.slice(0,index).split('\n').length-4)*22;return;}
    const matches=draft.blocks.filter(b=>JSON.stringify([b.title,b.text,b.rows,b.args]).toLocaleLowerCase().includes(query));
    if(!matches.length){$('[data-find-status]').textContent=copy.noMatches;return;}
    const block=matches[findOffset%matches.length];findOffset++;$('[data-find-dialog]').close();setLayout('split');selectBlock(block.id,{scroll:true});blockElement(block.id)?.querySelector('[data-rich],input,textarea')?.focus();
  }
  $('[data-find-next]').addEventListener('click',findNext);$('[data-find-text]').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();findNext();}});
  $('[data-problems-toggle]').addEventListener('click',()=>{$('[data-problems]').hidden=!$('[data-problems]').hidden;});
  $('[data-problems-close]').addEventListener('click',()=>{$('[data-problems]').hidden=true;});
  $('[data-ui-locale]').addEventListener('change',event=>{const url=new URL(location.href);url.pathname=`/${event.target.value}/${articleMode?'articles/submit':'contribute/editor'}/`;const target=url.searchParams.get('target');if(target&&/\.md$/.test(target))url.searchParams.set('target',target.replace(/[^/]+\.md$/,`${event.target.value}.md`));location.href=url.href;});
  root.addEventListener('keydown',event=>{
    if(event.isComposing||event.target.closest('dialog'))return;
    const mod=event.metaKey||event.ctrlKey;
    if(mod&&((event.key.toLowerCase()==='k')||(event.shiftKey&&event.key.toLowerCase()==='p'))){event.preventDefault();openCommands();return;}
    if(mod&&event.key.toLowerCase()==='p'){event.preventDefault();$(articleMode?'[data-article-mine]':'[data-existing-open]').click();return;}
    if(mod&&event.key.toLowerCase()==='f'){event.preventDefault();openFind();return;}
    if(mod&&event.key.toLowerCase()==='s'){event.preventDefault();if(sourcePending!==null)applySource();if(articleMode)$('[data-article-save]').click();else save();return;}
    if(mod&&event.key.toLowerCase()==='b'&&!event.target.closest('[data-rich]')){event.preventDefault();root.hasAttribute('data-sidebar-hidden')?changeSide(root.dataset.side||'outline'):hideSidebar();return;}
    if(mod&&event.key.toLowerCase()==='z'&&!event.target.matches('[data-source]')){event.preventDefault();(event.shiftKey?$('[data-redo]'):$('[data-undo]')).click();return;}
    if(event.key==='/'&&event.target.closest('[data-rich]')&&!event.target.closest('[data-rich]').textContent.trim()){event.preventDefault();const rich=event.target.closest('[data-rich]'),rect=window.getSelection()?.rangeCount?window.getSelection().getRangeAt(0).getBoundingClientRect():null;openInsert(rich,rect?.width||rect?.height?rect:rich.getBoundingClientRect());}
    if(event.key==='Enter'&&event.target.matches('.ve-heading-input')){event.preventDefault();insertBlock('paragraph');}
  });
  let draggedBlock=null;
  root.addEventListener('dragstart',event=>{const handle=event.target.closest('[data-drag-block]');if(!handle)return;draggedBlock=handle.dataset.dragBlock;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',draggedBlock);});
  root.addEventListener('dragover',event=>{const block=event.target.closest('.ve-canvas [data-block]');if(!draggedBlock||!block)return;event.preventDefault();root.querySelectorAll('.is-dragover').forEach(el=>el.classList.remove('is-dragover'));block.classList.add('is-dragover');});
  root.addEventListener('drop',event=>{const target=event.target.closest('.ve-canvas [data-block]');if(!draggedBlock||!target)return;event.preventDefault();const from=draft.blocks.findIndex(b=>b.id===draggedBlock),to=draft.blocks.findIndex(b=>b.id===target.dataset.block);if(from>=0&&to>=0&&from!==to){checkpoint();const [block]=draft.blocks.splice(from,1);draft.blocks.splice(to,0,block);renderBlocks(block.id);changed(true);}draggedBlock=null;root.querySelectorAll('.is-dragover').forEach(el=>el.classList.remove('is-dragover'));});
  root.addEventListener('dragend',()=>{draggedBlock=null;root.querySelectorAll('.is-dragover').forEach(el=>el.classList.remove('is-dragover'));});
  window.addEventListener('beforeunload',event=>{if(!saving){event.preventDefault();event.returnValue='';}});

  const imageURLs = new Map();
  let selectedImageFiles = [], preparingImages = false;
  async function localImageURL(asset) {
    if(imageURLs.has(asset.id))return imageURLs.get(asset.id);
    const blob=await attachmentFile(asset.id);
    if(!blob)return asset.previewUrl || asset.url;
    const url=URL.createObjectURL(blob);imageURLs.set(asset.id,url);return url;
  }
  async function refreshAttachmentPreviews() {
    if(articleMode&&currentOwner()===articleOwner)for(const ref of draft.meta.articleMediaRefs||[]){if(ref.src||!ref.assetId)continue;const reference=`/_private/article-assets/${ref.assetId}`,cacheKey='article:'+ref.assetId;try{let preview=imageURLs.get(cacheKey);if(!preview){const response=await fetch(`${root.dataset.articleApi}/api/articles/assets/${ref.assetId}/image`,{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok||currentOwner()!==articleOwner)continue;preview=URL.createObjectURL(await response.blob());imageURLs.set(cacheKey,preview);}root.querySelectorAll('.ve-canvas img,[data-preview] img').forEach(img=>{if(img.getAttribute('src')===reference||img.dataset.articleReference===reference)img.src=preview;});}catch{/* A failed preview keeps the stable private reference. */}}

    for(const asset of draft.assets || []) {
      try {const url=await localImageURL(asset);root.querySelectorAll('.ve-canvas img,[data-preview] img').forEach(img=>{if(img.getAttribute('src')===asset.url)img.src=url;});} catch { /* Missing local files remain recoverable through the attachment panel. */ }
    }
  }
  async function renderAttachments() {
    const list=$('[data-image-list]');list.replaceChildren();
    for(const asset of draft.assets || []) {
      const row=document.createElement('div');row.className='ve-attachment-row';
      row.innerHTML=`<img alt=""/><div><p>${escapeHtml(asset.name || asset.path.split('/').pop())} · ${Math.ceil(asset.size/1024)} KB</p><p class="ve-hint">${escapeHtml(asset.source)}</p><div class="ve-row-tools"><button data-image-insert="${asset.id}">${tc('插入正文')}</button><button data-image-cover="${asset.id}">${tc('设为封面')}</button><button data-image-remove="${asset.id}">${tc('移除附件')}</button></div></div>`;
      list.append(row);try {row.querySelector('img').src=await localImageURL(asset);}catch{}
    }
  }
  let articleImagePosition=null;
  const articleGalleryDialog=$('[data-article-gallery-dialog]'),articleAssetDialog=$('[data-article-asset-dialog]');
  const captureArticlePosition=()=>root.dataset.mode==='source'?{source:true,from:$('[data-source]').selectionStart,to:$('[data-source]').selectionEnd}:{blockId:activeBlockId};
  function insertArticleImage(url,ref){
    if(!applySource())return false;checkpoint();
    const image={...newBlock('image'),url,text:ref.alt,caption:[ref.caption,ref.sourceTitle,ref.sourceUrl].filter(Boolean).join(' · ')};
    if(articleImagePosition?.source){const text=$('[data-source]').value;sourcePending=text.slice(0,articleImagePosition.from)+blockMarkdown(image,draft.meta.locale)+text.slice(articleImagePosition.to);$('[data-source]').value=sourcePending;applySource();}
    else{const index=draft.blocks.findIndex(b=>b.id===articleImagePosition?.blockId);const empty=index>=0&&draft.blocks[index].type==='paragraph'&&!draft.blocks[index].text.trim();draft.blocks.splice(index<0?draft.blocks.length:empty?index:index+1,empty?1:0,image);renderBlocks(image.id);changed(true);}return true;
  }
  const articleAssetUploader=articleMode?mountArticleAssets(root,{api:root.dataset.articleApi,owner:articleOwner,currentOwner,onLocalChange:()=>{draft.meta.pendingArticleImage=true;changed();},onInsert:(ref,url)=>{draft.meta.articleMediaRefs=[...(draft.meta.articleMediaRefs||[]).filter(r=>r.assetId!==ref.assetId),ref];if(insertArticleImage(url,ref))articleAssetDialog.close();},onPublicInsert:(item,ref)=>{draft.meta.articleMediaRefs=[...(draft.meta.articleMediaRefs||[]).filter(r=>r.galleryId!==item.id),{...ref,galleryId:item.id,src:item.src}];if(insertArticleImage(item.src,ref))articleAssetDialog.close();}}):null;
  const articleGallery=articleMode?mountArticleGallery(root,{api:root.dataset.articleApi,onChoose:item=>{articleGalleryDialog.close();articleAssetDialog.showModal();void articleAssetUploader.open(item);}}):null;
  root.querySelectorAll('[data-article-images-open]').forEach(button=>button.addEventListener('click',()=>{articleImagePosition=captureArticlePosition();articleGalleryDialog.showModal();void articleGallery.load();}));
  root.querySelectorAll('[data-article-upload-open]').forEach(button=>button.addEventListener('click',()=>{articleGalleryDialog.close();articleAssetDialog.showModal();void articleAssetUploader.open();}));
  document.addEventListener('astro:before-swap',()=>{articleAssetUploader?.dispose();articleGallery?.dispose();imageURLs.forEach(URL.revokeObjectURL);},{once:true});
  function openImages(files=[]) {
    if(articleMode){articleImagePosition=captureArticlePosition();articleGalleryDialog.close();if(!articleAssetDialog.open)articleAssetDialog.showModal();void articleAssetUploader.open().then(()=>files[0]&&articleAssetUploader.selectFile(files[0]));return;}
    selectedImageFiles=files;$('[data-image-files]').value='';$('[data-image-selection]').textContent=files.map(f=>f.name).join('、');
    $('[data-image-feedback]').textContent='';renderAttachments();$('[data-attachments-dialog]').showModal();
  }
  $('[data-attachments-open]').addEventListener('click',()=>openImages());
  $('[data-image-files]').addEventListener('change',event=>{selectedImageFiles=[...event.target.files];$('[data-image-selection]').textContent=selectedImageFiles.map(f=>f.name).join('、');});
  $('[data-image-add]').addEventListener('click',async()=>{
    if(preparingImages)return;
    const targetDraft=draft,button=$('[data-image-add]'),feedback=$('[data-image-feedback]');
    try {
      if(!selectedImageFiles.length)throw Error(tc('请先选择、拖入或粘贴图片。'));
      if((draft.assets?.length || 0)+selectedImageFiles.length>8)throw Error(tc('最多添加 8 张图片。'));
      preparingImages=true;button.disabled=true;feedback.textContent=tc('正在保存原图…');
      const next=[];
      for(const file of selectedImageFiles)next.push(await prepareImage(file,$('[data-image-source]').value,$('[data-image-alt]').value));
      if(draft!==targetDraft)throw Error('词条已变化，请重新选择图片。');
      const assets=[...new Map([...(draft.assets || []),...next].map(a=>[a.id,a])).values()];
      if(assets.reduce((n,a)=>n+a.size,0)>4000000)throw Error(tc('附件合计不能超过 4 MB。'));
      checkpoint();draft.assets=assets;changed(true);await renderAttachments();selectedImageFiles=[];$('[data-image-files]').value='';$('[data-image-selection]').textContent='';feedback.textContent=tc('已保存在本机，提交审核时上传。');
    }catch(error){feedback.textContent=tc(error.message);}finally{preparingImages=false;button.disabled=false;}
  });
  $('[data-image-list]').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    const id=button.dataset.imageInsert || button.dataset.imageCover || button.dataset.imageRemove;
    if(!applySource()){$('[data-image-feedback]').textContent=tc('请先修正源码，再操作附件。');return;}
    const asset=draft.assets?.find(a=>a.id===id);if(!asset)return;
    if(button.hasAttribute('data-image-remove') && serializeDraft().includes(asset.url)){$('[data-image-feedback]').textContent=tc('请先移除正文或封面中的图片引用，再移除附件。');return;}
    checkpoint();
    if(button.hasAttribute('data-image-insert')) {const block={...newBlock('image'),url:asset.url,text:asset.alt || asset.name || '',caption:asset.source};draft.blocks.push(block);renderBlocks(block.id);$('[data-attachments-dialog]').close();}
    if(button.hasAttribute('data-image-cover')) {if(draft.meta.schemaVersion===2)(draft.meta.presentation ||= {}).image=asset.url;else draft.meta.image=asset.url;renderFields();$('[data-attachments-dialog]').close();changeSide('properties');}
    if(button.hasAttribute('data-image-remove')){draft.assets=draft.assets.filter(a=>a.id!==id);renderAttachments();}
    changed(true);
  });
  root.addEventListener('paste',event=>{const files=[...(event.clipboardData?.files || [])];if(files.length){event.preventDefault();openImages(files);}},true);
  root.addEventListener('dragover',event=>{if(event.dataTransfer?.types.includes('Files'))event.preventDefault();});
  root.addEventListener('drop',event=>{const files=[...(event.dataTransfer?.files || [])];if(files.length){event.preventDefault();openImages(files);}},true);
  root.querySelectorAll('[data-dialog-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
  function openNewEntry(kind=draft.kind) {$('[data-new-feedback]').textContent='';$('[data-new-form]').elements.kind.value=typeof kind==='string'?kind:draft.kind;$('[data-new-form]').elements.locale.value=draft.meta.locale;$('[data-new-dialog]').showModal();}
  $('[data-new-open]').addEventListener('click',openNewEntry);
  $('[data-previous-draft]').addEventListener('click',()=>{
    try {
      const previous=JSON.parse(localStorage.getItem(key+':previous') || 'null');
      if(!previous)throw Error(tc('没有上一份本地草稿。'));
      if(sourcePending!==null&&!applySource())throw Error(tc('请先修正源码，再创建新条目。'));
      localStorage.setItem(key+':previous',JSON.stringify(draft));
      checkpoint();clearPendingSource();draft=previous;renderFields();renderBlocks();changed(true);$('[data-new-dialog]').close();
    }catch(error){$('[data-new-feedback]').textContent=tc(error.message);}
  });
  $('[data-new-form]').addEventListener('submit',event=>{
    event.preventDefault();const form=event.target;
    try {
      const kind=form.elements.kind.value,locale=form.elements.locale.value,folder=form.elements.folder.value.trim();
      const path=newEntryPath(kind,locale,folder);
      if(sourcePending!==null&&!applySource())throw Error(tc('请先修正源码，再创建新条目。'));
      localStorage.setItem(key+':previous',JSON.stringify(draft));
      checkpoint();clearPendingSource();draft=newDraft(kind,locale);draft.create=true;draft.path=path;draft.baseSha=null;draft.baseContent='';draft.assets=[];
      draft.meta['name' in draft.meta?'name':'title']=form.elements.title.value.trim();if(draft.meta.schemaVersion===2)draft.meta.id=folder;else draft.meta.translationKey=folder.replaceAll('/','-');
      renderFields();renderBlocks();changed(true);changeSide('properties');$('[data-new-dialog]').close();
      const url=new URL(location.href);url.searchParams.delete('target');url.searchParams.delete('new');window.history.replaceState(null,'',url);
    }catch(error){$('[data-new-feedback]').textContent=tc(error.message);}
  });
  renderFields(); renderBlocks(); output(); loadReferenceOptions();
  $('[data-save-status]').textContent = saving ? copy.saved : copy.unsaved;
  try { const recovered=localStorage.getItem(sourceKey);if(recovered!==null){sourcePending=recovered;changeMode('source');$('[data-source-error]').hidden=false;$('[data-source-error]').textContent=copy.sourceRecovered;} } catch { /* Optional draft recovery. */ }
  const entryEditor = {
    snapshot() {
      if (root.hasAttribute('aria-busy')) throw new Error('词条还在加载，请稍后再试。');
      if (!applySource()) throw new Error('源码存在格式错误，请先修正后再提交。');
      if (!draft.path || !sourceRequest(draft.path) || (draft.needsOriginal && !draft.create)) throw new Error('请先通过“编辑已有词条”载入一个词条。');
      const errors = [...validateDraft(draft), ...advancedErrors(draft.meta)];
      if (errors.length) throw new Error(`请先修正词条属性：${errors.map(label).join('、')}`);
      return { path: draft.path, kind: draft.kind, title: draft.meta.name || draft.meta.title, baseSha:draft.baseSha, baseContent:draft.baseContent, create:draft.create === true, assets:draft.assets || [], content: serializeDraft() };
    },
    async uploadAttachments(api, accountId, snapshot) {
      const ids=[];
      for(const asset of snapshot.assets || []) {
        const blob=await attachmentFile(asset.id);
        if(blob){const receipt=await api('/api/editor/assets','POST',{accountId,content:await imageBase64(blob),source:asset.source});if(receipt.id!==asset.id)throw Error('图片校验失败，请重新选择。');}
        ids.push(asset.id);
      }
      return ids;
    },
    restore(submission) {
      if (hasWork() && !window.confirm(copy.replace)) return false;
      const imported = importMarkdown(submission.content, submission.kind, submission.path);
      imported.baseSha=submission.baseSha;imported.baseContent=submission.baseContent??null;imported.create=submission.create === true || (submission.create == null && submission.baseSha == null);imported.assets=submission.assets || [];
      checkpoint(); clearPendingSource(); draft = imported; renderFields(); renderBlocks(); changed(true);
      const url = new URL(location.href); url.searchParams.set('target', draft.path);
      window.history.replaceState(null, '', url);
      return true;
    },
  };
  if (prDemo) initializeEditorPrDemo(root, entryEditor);
  const cloudDraftPath = articleMode ? null : new URLSearchParams(location.search).get('draftPath');
  if (prDemo && cloudDraftPath && sourceRequest(cloudDraftPath)) {
    void (async () => {
      try {
        const response = await fetch(editorApiBase+'/api/editor/draft?path='+encodeURIComponent(cloudDraftPath), { credentials:'include',cache:'no-store' });
        if (!response.ok) throw new Error(copy.loadFailed);
        const saved = await response.json();
        if (!saved?.content || saved.path !== cloudDraftPath) throw new Error(copy.loadFailed);
        const restored = entryEditor.restore({ ...saved, kind:saved.kind||cloudDraftPath.split('/')[2] });
        if (restored) {
          const url=new URL(location.href);url.searchParams.delete('draftPath');window.history.replaceState(null,'',url);
          root.dispatchEvent(new CustomEvent('editor-source-loaded'));
          $('[data-load-status]').textContent = copy.loaded + ' ' + (saved.title||cloudDraftPath);
        }
      } catch (error) {
        $('[data-load-status]').textContent = error.message || copy.loadFailed;
      }
    })();
  }
  if(articleMode&&!['guest','unverified'].includes(articleOwner)){
    const recovery=articleCopy(root.dataset.locale).recovery,panel=document.createElement('div');panel.className='ve-row-tools';
    for(const [scope,label]of [['guest',recovery.guest],['unverified',recovery.unverified]]){const recoveredKey=`kamitsubaki-article-workbench-v2:${scope}:${articleIdentity}:${root.dataset.contentLocale}`;let raw;try{raw=localStorage.getItem(recoveredKey);}catch{continue;}if(!raw)continue;
      const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=()=>{if(currentOwner()!==articleOwner)return;let recovered;try{recovered=JSON.parse(raw);if(recovered.ownerId||recovered.kind!=='articles'||!Array.isArray(recovered.blocks)||recovered.blocks.length>1000)throw Error(recovery.invalid);exportMarkdown(recovered);}catch(error){$('[data-article-status]').textContent=error.message;return;}if(hasEditorLocalWork(draft,sourcePending)&&!window.confirm(recovery.replace))return;clearPendingSource();draft={...recovered,ownerId:articleOwner};try{const pending=localStorage.getItem(recoveredKey+':source');if(pending!==null){sourcePending=pending;$('[data-source]').value=pending;applySource();}}catch{}history=[JSON.stringify(draft)];cursor=0;renderFields();renderBlocks();changed(true);panel.remove();};panel.append(button);
    }if(panel.childElementCount)$('[data-article-status]').after(panel);
  }
  if(articleMode)window.addEventListener('kamitsubaki-account-state',()=>{if(currentOwner()!==articleOwner){imageURLs.forEach(URL.revokeObjectURL);imageURLs.clear();root.querySelectorAll('[data-article-reference]').forEach(img=>img.removeAttribute('src'));articleAssetDialog?.close();}});
  if(articleMode)initializeArticleSubmission(root,{
    async validateRelations(){const ids=draft.meta.relatedEntities||[];if(!ids.length)return;const entries=await articleEntities(root.dataset.locale);if(ids.some(id=>!entries.some(e=>e.id===id)))throw Error(articleCopy(root.dataset.locale).invalidRelated);},
    prepareNavigation(){saving=true;},
    currentOwner,persistLocal(){if(sourcePending!==null)try{localStorage.setItem(sourceKey,sourcePending);}catch{}save();},
    subscribe(callback){root.addEventListener('article-draft-change',callback);},
    snapshot(){if(!applySource())throw Error(copy.sourceError);return {locale:draft.meta.locale,content:{title:draft.meta.title||'',summary:draft.meta.summary||'',category:draft.meta.articleCategory||'archival',relatedEntities:draft.meta.relatedEntities||[],body:serializeDraft(),mediaRefs:(draft.meta.articleMediaRefs||[]).filter(ref=>serializeDraft().includes(ref.src||`/_private/article-assets/${ref.assetId}`))}};},
    restore(content,locale){clearPendingSource();draft=newDraft('articles',locale);Object.assign(draft.meta,{title:content.title||'',summary:content.summary||'',articleCategory:content.category||'archival',relatedEntities:content.relatedEntities||[],articleMediaRefs:content.mediaRefs||[]});draft.blocks=parseVisualBlocks(content.body||'');if(!draft.blocks.length)draft.blocks=[newBlock('paragraph')];draft.articleOriginalBody=content.body||'';draft.articleBodySnapshot=JSON.stringify(draft.blocks);history=[JSON.stringify(draft)];cursor=0;renderFields();renderBlocks();changed(true);},
    hasLocalWork(){return hasEditorLocalWork(draft,sourcePending);},
  },articleOwner);
  if (!articleMode && !target && new URLSearchParams(location.search).get('new')==='articles') openNewEntry('articles');
  if (target && sourceRequest(target) && !(draft.path === target && draft.originalMeta)) loadOriginal(target, hasWork());
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once:true});
else initialize();
