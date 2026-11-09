import { aiChatErrorText } from '../lib/aiChatErrors.mjs';
import {chatPresentationStore} from '../lib/chatPresentationStore.mjs';
import {loadSiteComponents} from '../lib/siteComponentRuntime.mjs';
import {iconMarkup} from '../lib/icons.mjs';
import {claimFloatingPanel,onFloatingPanelChange} from '../lib/floatingPanels.js';
import {loginUrl as centralLoginUrl,logout as centralLogout,state as centralAccountState} from './accountStore.js';
import {isLocalEditorMode} from '../lib/localEditorMode.mjs';
import { setSegmentedValue } from '../lib/aiChatControls.mjs';
import {
  buildAiLocaleRequest,
  convertAiResponseText,
  isTraditionalAiResponseLocale,
  loadTraditionalConverters,
} from '../lib/aiResponseLocale.mjs';
import { readChatEvents } from '../lib/aiStream.mjs';

const widgetRevision=root=>Number(root.dataset.accountGeneration)||0;
const widgetRequests=new WeakMap();
const widgets = document.querySelectorAll('[data-ai-chat]');
const legacyLauncherPositionKey = 'kfw_ai_launcher_position';
let turnstileLoader;
let markdownRenderer = null;
let markdownRendererPromise = null;

async function loadMarkdownRenderer() {
  if (markdownRenderer) {
    return markdownRenderer;
  }
  if (!markdownRendererPromise) {
    markdownRendererPromise = Promise.all([
      import('katex'),
      import('micromark'),
      import('micromark-extension-gfm'),
      import('micromark-extension-math'),
    ]).then(([katexMod, micromarkMod, gfmMod, mathMod]) => {
      const katex = katexMod.default || katexMod;
      const { micromark } = micromarkMod;
      const { gfm, gfmHtml } = gfmMod;
      const { math, mathHtml } = mathMod;
      markdownRenderer = { katex, micromark, gfm, gfmHtml, math, mathHtml };
      return markdownRenderer;
    }).catch((error) => {
      markdownRendererPromise = null;
      throw error;
    });
  }
  return markdownRendererPromise;
}

function sanitizeRenderedHtml(html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  const allowedTags = new Set([
    'A',
    'BLOCKQUOTE',
    'BR',
    'CODE',
    'DIV',
    'EM',
    'H1',
    'H2',
    'H3',
    'H4',
    'HR',
    'LI',
    'OL',
    'P',
    'PRE',
    'SPAN',
    'STRONG',
    'TABLE',
    'TBODY',
    'TD',
    'TH',
    'THEAD',
    'TR',
    'UL',
  ]);
  const allowedAttributes = new Set(['aria-hidden', 'class', 'colspan', 'href', 'rel', 'rowspan', 'target', 'title']);

  template.content.querySelectorAll('*').forEach((element) => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(document.createTextNode(element.textContent || ''));
      return;
    }

    for (const attribute of [...element.attributes]) {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || !allowedAttributes.has(name)) {
        element.removeAttribute(attribute.name);
        continue;
      }

      if (name === 'href') {
        try {
          const url = new URL(attribute.value, window.location.origin);
          if (!['http:', 'https:'].includes(url.protocol)) {
            element.removeAttribute(attribute.name);
          }
        } catch {
          element.removeAttribute(attribute.name);
        }
      }
    }
  });

  template.content.querySelectorAll('a[href]').forEach((link) => {
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noreferrer');
  });

  return template.innerHTML;
}

function localizeRenderedHtml(html, locale) {
  if (!isTraditionalAiResponseLocale(locale)) {
    return html;
  }

  const template = document.createElement('template');
  template.innerHTML = html;
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const parent = node.parentElement;
    if (!parent?.closest('code, pre, .katex, .katex-display')) {
      node.data = convertAiResponseText(node.data, locale);
    }
    node = walker.nextNode();
  }
  return template.innerHTML;
}

function renderMarkdown(text, locale = '') {
  const sourceText = String(text || '');
  if (!markdownRenderer) {
    return localizeRenderedHtml(sanitizeRenderedHtml(sourceText.replace(/\n/g, '<br>')), locale);
  }
  const { katex, micromark, gfm, gfmHtml, math, mathHtml } = markdownRenderer;
  const html = sanitizeRenderedHtml(
    micromark(sourceText, {
      extensions: [gfm(), math()],
      htmlExtensions: [gfmHtml(), mathHtml({ katex, throwOnError: false, strict: false })],
    }),
  );
  return localizeRenderedHtml(html, locale);
}

function setMessageMarkdown(content, text, locale = '') {
  content.store.patch(content,{text:convertAiResponseText(text,locale),streaming:false,thinking:false});
}
function createStreamingRenderer(content, messages, locale = '') {
  return {update(text){content.store.patch(content,{text:convertAiResponseText(text,locale),streaming:true,thinking:false});},complete(text){setMessageMarkdown(content,text,locale);},cancel(){content.store.patch(content,{streaming:false,thinking:false});}};
}
function createMessage(root, role, text = '', locale = '') {
  const content=chatPresentationStore(root).append(role,role==='assistant'?convertAiResponseText(text,locale):text);
  return {message:content,content};
}
function startThinkingMessage({content}){content.store.patch(content,{thinking:true});}
function createThinkingMessage(root,copy){const message=createMessage(root,'assistant');startThinkingMessage(message,copy);return message;}
function finishThinkingMessage({content}){content.store.patch(content,{thinking:false});}

function parseHttpUrl(value) {
  try {
    const url = new URL(String(value || ''), window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function formatSourceHost(url) {
  return url.hostname.replace(/^www\./, '');
}

const SOURCE_KINDS = {
  zh: {page: '当前页', official: '官方', wiki: '站内/百科', web: '全网', other: '来源'},
  ja: {page: '現在のページ', official: '公式', wiki: 'サイト内/Wiki', web: 'ウェブ', other: '出典'},
  en: {page: 'This page', official: 'Official', wiki: 'Wiki', web: 'Web', other: 'Source'},
};

function formatSourceKind(source, locale = 'zh') {
  const labels = SOURCE_KINDS[String(locale).startsWith('ja') ? 'ja' : String(locale).startsWith('en') ? 'en' : 'zh'];
  const type = String(source?.sourceType || '').toLowerCase();
  if (type === 'current-page') return labels.page;
  if (type === 'official') return labels.official;
  if (type === 'wiki') return labels.wiki;
  if (type.startsWith('web')) return labels.web;
  return labels.other;
}

function appendSource(content,source){
 if(!source?.title||!source?.url)return;const url=parseHttpUrl(source.url);if(!url)return;
 content.store.addSource(content,{...source,url:url.href,kind:convertAiResponseText(formatSourceKind(source,content.root.dataset.locale),content.root.dataset.locale)});
}

function scrollMessages(messages) {
  messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
}

function normalizeCopy(root) {
  try {
    return JSON.parse(root.dataset.copy || '{}');
  } catch {
    return {};
  }
}

function setExpanded(root, expanded, restoreFocus = true) {
  if(root.dataset.aiPresentation==='embedded'){
    root.classList.toggle('is-open',expanded);root.inert=!expanded;root.querySelector('[data-ai-panel]')?.setAttribute('aria-hidden',String(!expanded));
    if(!expanded){toggleSettings(root,false);window.dispatchEvent(new CustomEvent('wiki-dashboard-section',{detail:{section:'overview'}}));}return;
  }
  if(expanded)claimFloatingPanel('ai');
  const launcher = document.querySelector('[data-ai-launcher]');
  const wasExpanded = root.classList.contains('is-open');
  const toggle = document.querySelector('[data-ai-toggle]');
  root.classList.toggle('is-open', expanded);
  root.inert = !expanded;
  root.querySelector('[data-ai-panel]')?.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  document.querySelector('[data-ai-toggle]')?.setAttribute('aria-expanded', String(expanded));
  launcher?.classList.toggle('is-hidden', expanded);
  if (!expanded) {
    toggleSettings(root, false);
    if (wasExpanded && restoreFocus) {
      const dock = toggle?.closest('[data-reader-tools]');
      const target = dock && !dock.open ? dock.querySelector('summary') : toggle;
      target?.focus({ preventScroll: true });
    }
  }
}

function setThinking(root, copy, thinking) {
  root.classList.toggle('is-thinking', thinking);
  chatPresentationStore(root).running(thinking);
  const bubble = document.querySelector('[data-ai-bubble]');
  if (bubble) {
    bubble.textContent = thinking ? copy.bubbleThinking : copy.bubbleIdle;
  }
}

function toggleSettings(root, expanded) {
  const popover = root.querySelector('[data-ai-settings-popover]');
  const toggle = root.querySelector('[data-ai-settings-toggle]');
  if (!(popover instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
    return;
  }

  popover.hidden = !expanded;
  toggle.setAttribute('aria-expanded', String(expanded));
  root.classList.toggle('is-settings-open', expanded);
}

function toggleHistory(root, expanded) {
  const panel = root.querySelector('[data-ai-history-panel]');
  const toggle = root.querySelector('[data-ai-history-toggle]');
  if (!(panel instanceof HTMLElement) || !(toggle instanceof HTMLButtonElement)) {
    return;
  }

  const isUser = root.dataset.viewerKind === 'user';
  panel.hidden = !expanded || !isUser;
  toggle.setAttribute('aria-expanded', String(expanded && isUser));
  root.classList.toggle('is-history-open', expanded && isUser);
  if (expanded && isUser) {
    loadThreadList(root).catch(() => {});
  }
}

function compactText(value, maxLength) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function collectPageContext(root) {
  const main =
    document.querySelector('[data-page-context-root]') ||
    Array.from(document.querySelectorAll('main')).find((node) => !node.closest('[data-ai-chat]')) ||
    document.body;
  const title =
    main.querySelector('h1')?.textContent ||
    Array.from(document.querySelectorAll('h1')).find((node) => !node.closest('[data-ai-chat]'))?.textContent ||
    document.title ||
    '';
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
  const headings = Array.from(main.querySelectorAll('h1, h2, h3'))
    .filter((heading) => !heading.closest('[data-ai-chat]'))
    .map((heading) => compactText(heading.textContent, 90))
    .filter(Boolean)
    .slice(0, 18);
  const clonedMain = main.cloneNode(true);
  if (clonedMain instanceof HTMLElement) {
    clonedMain
      .querySelectorAll(
        [
          '[data-ai-chat]',
          '[data-ai-launcher]',
          '[data-ai-bubble]',
          '[data-ai-toggle]',
          '[aria-live]',
          'script',
          'style',
          'nav',
          'footer',
          'form',
          'button',
          'dialog',
          'template',
        ].join(', '),
      )
      .forEach((node) => node.remove());
  }

  const path = window.location.pathname;
  const kind = path.includes('/artists/') || path.includes('/projects/') || path.includes('/logs/')
    ? 'article'
    : path === '/' || /^\/(zh|ja|en)\/?$/.test(path)
      ? 'home'
      : 'page';

  return {
    url: window.location.href,
    title: compactText(title, 160),
    description: compactText(description, 260),
    headings,
    text: compactText(clonedMain.textContent || '', kind === 'home' ? 12000 : 10000),
    kind,
    locale: root.dataset.locale || document.documentElement.lang || 'zh',
  };
}

function insertTextareaNewline(input) {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  input.value = `${input.value.slice(0, start)}\n${input.value.slice(end)}`;
  input.selectionStart = start + 1;
  input.selectionEnd = start + 1;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function updateAuthState(root, copy, viewer) {
  const accountFocus = document.activeElement;
  const status = root.querySelector('[data-ai-auth-status]');
  const logout = root.querySelector('[data-ai-logout]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const note = root.querySelector('[data-ai-auth-note]');
  const historyToggle = root.querySelector('[data-ai-history-toggle]');
  const isUser = viewer?.kind === 'user';

  root.dataset.viewerKind = isUser ? 'user' : 'anonymous';
  root.dataset.viewerId=isUser?(viewer.userId||''):'';

  if (status) {
    status.textContent = isUser
      ? `${copy.accountLoggedInPrefix || ''} ${viewer.displayName || viewer.email || ''}`.trim()
      : copy.accountAnonymous || '';
  }

  oauthButtons.forEach((button) => {
    if (button instanceof HTMLElement) {
      button.hidden = isUser;
    }
  });

  if (logout instanceof HTMLButtonElement) {
    logout.hidden = !isUser;
  }

  if (historyToggle instanceof HTMLButtonElement) {
    historyToggle.hidden = !isUser;
  }

  if (!isUser) {
    toggleHistory(root, false);
  }

  if (note instanceof HTMLElement) {
    note.hidden = true;
    note.textContent = '';
  }
  // Signing in/out can hide the focused action inside the settings popover.
  // Keep keyboard ownership in that layer instead of dropping it to the page.
  if (root.dataset.aiPresentation === 'embedded' && accountFocus instanceof HTMLElement &&
      root.contains(accountFocus) && accountFocus.matches('[data-ai-oauth],[data-ai-logout]') &&
      accountFocus.hidden && root.getClientRects().length) {
    const target = isUser ? logout : [...oauthButtons].find(button => button instanceof HTMLElement && !button.hidden);
    if (target instanceof HTMLElement) target.focus({ preventScroll: true });
  }
}

function showAuthNote(root, message) {
  const note = root.querySelector('[data-ai-auth-note]');
  if (note instanceof HTMLElement) {
    note.hidden = false;
    note.textContent = message || '';
  }
}

async function bootstrap(root) {
  const revision=widgetRevision(root);
  if(isLocalEditorMode())return;
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  const bootstrapUrl = new URL(`${apiBase}/api/ai/v2/bootstrap`);
  const localeRequest = buildAiLocaleRequest(root.dataset.locale || document.documentElement.lang || 'zh');
  bootstrapUrl.searchParams.set('locale', localeRequest.locale);
  bootstrapUrl.searchParams.set('responseLocale', localeRequest.locale);
  bootstrapUrl.searchParams.set('languageTag', localeRequest.languageTag);
  bootstrapUrl.searchParams.set('responseVariant', localeRequest.responseVariant);
  const response = await fetch(bootstrapUrl, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return;
  }

  const data = await response.json();
  if(revision!==widgetRevision(root))return;
  const copy = normalizeCopy(root);
  const limit = Number(data.limits?.messageMaxLength);
  if (Number.isSafeInteger(limit) && limit > 0) {
    root.dataset.messageMaxLength = String(limit);
    const field = root.querySelector('[data-ai-input]');
    if (field instanceof HTMLTextAreaElement) field.maxLength = limit;
  }
  updateAuthState(root, copy, data.viewer);
  if (data.viewer?.kind === 'user') {
    loadThreadList(root).catch(() => {});
  }

  if (typeof data.greeting === 'string' && data.greeting) {
    const presentation=chatPresentationStore(root),first=presentation.getSnapshot().messages.find(message=>message.role==='assistant');
    const firstAssistantMessage=first?{id:first.id,root,store:presentation}:createMessage(root,'assistant').content;
    setMessageMarkdown(firstAssistantMessage, data.greeting, localeRequest.locale);

  }

  if (data.turnstile?.siteKey) {
    root.dataset.turnstileSiteKey = data.turnstile.siteKey;
  }
}

function loadTurnstile() {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }

  if (turnstileLoader) {
    return turnstileLoader;
  }

  turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async = true;
    script.defer = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile unavailable.')));
    script.onerror = () => reject(new Error('Turnstile failed to load.'));
    document.head.append(script);
  });

  return turnstileLoader;
}

function showChallengeTray(root, container) {
  const tray = root.querySelector('[data-ai-challenge-tray]');
  const mount = root.querySelector('[data-ai-challenge-mount]');
  if (!(tray instanceof HTMLElement) || !(mount instanceof HTMLElement)) {
    return false;
  }

  mount.replaceChildren(container);
  tray.hidden = false;
  root.classList.add('is-challenge-open');
  return true;
}

function hideChallengeTray(root) {
  const tray = root.querySelector('[data-ai-challenge-tray]');
  const mount = root.querySelector('[data-ai-challenge-mount]');
  if (mount instanceof HTMLElement) {
    mount.replaceChildren();
  }
  if (tray instanceof HTMLElement) {
    tray.hidden = true;
  }
  root.classList.remove('is-challenge-open');
}

async function requestTurnstileToken(root, content, copy, options = {}) {
  const siteKey = root.dataset.turnstileSiteKey || '';
  if (!siteKey) {
    return '';
  }

  try {
    const turnstile = await loadTurnstile();
    const container = document.createElement('div');
    container.className = 'ai-message__challenge';
    const usesTray = showChallengeTray(root, container);
    if (!usesTray) {
      const anchor = content instanceof HTMLElement ? content : root;
      if (anchor === root) {
        root.append(container);
      } else {
        anchor.after(container);
      }
    }

    return await new Promise((resolve) => {
      turnstile.render(container, {
        sitekey: siteKey,
        theme: 'dark',
        action: options.action || 'ai_chat',
        callback(token) {
          root.dataset.turnstileToken = token;
          if (usesTray) {
            hideChallengeTray(root);
          } else {
            container.remove();
          }
          if (options.updateContent !== false && content instanceof HTMLElement) {
            setMessageMarkdown(content, copy.challengeReady || content.textContent || '');
          }
          resolve(token);
        },
        'error-callback'() {
          if (usesTray) {
            hideChallengeTray(root);
          } else {
            container.remove();
          }
          resolve('');
        },
        'expired-callback'() {
          delete root.dataset.turnstileToken;
        },
      });
    });
  } catch {
    return '';
  }
}

async function logout(root, copy) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  try {
    await centralLogout();
    window.dispatchEvent(new Event('kamitsubaki-auth-changed'));
  } catch { return; }
  {
    root.dataset.currentThreadId = '';
    updateAuthState(root, copy, { kind: 'anonymous' });
  }
}

function renderThreadList(root, threads) {
  const list = root.querySelector('[data-ai-thread-list]');
  if (!(list instanceof HTMLElement)) {
    return;
  }

  list.innerHTML = '';
  if (!threads.length) {
    const empty = document.createElement('p');
    empty.className = 'ai-chat__history-empty';
    empty.textContent = list.dataset.empty || '';
    list.append(empty);
    return;
  }

  for (const thread of threads) {
    const row = document.createElement('div');
    row.className = 'ai-chat__thread-row';
    row.dataset.threadId = thread.id;

    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.aiThreadId = thread.id;
    button.className = 'ai-chat__thread';
    button.innerHTML = `<span></span><small></small>`;
    button.querySelector('span').textContent = thread.title || thread.id;
    button.querySelector('small').textContent = thread.updatedAt || '';
    button.classList.toggle('is-active', thread.id === root.dataset.currentThreadId);

    const menu = document.createElement('button');
    menu.type = 'button';
    menu.className = 'ai-chat__thread-menu';
    menu.dataset.aiThreadMenuToggle = thread.id;
    const copy = normalizeCopy(root);
    const threadActionsLabel = copy.threadActionsLabel || 'Conversation actions';
    const cancelLabel = copy.cancelLabel || 'Cancel';
    menu.setAttribute('aria-label', threadActionsLabel);
    menu.setAttribute('aria-expanded', 'false');
    menu.innerHTML = iconMarkup('ellipsis');

    const actions = document.createElement('div');
    actions.className = 'ai-chat__thread-actions';
    actions.hidden = true;
    actions.setAttribute('aria-label', threadActionsLabel);
    const renameLabel = copy.renameThreadLabel || 'Rename';
    const deleteLabel = copy.deleteThreadLabel || 'Delete';
    actions.innerHTML = `
      <div class="ai-chat__thread-action-view" data-ai-thread-action-view="choices">
        <button type="button" data-ai-thread-rename></button>
        <button type="button" data-ai-thread-delete></button>
      </div>
      <div class="ai-chat__thread-action-view ai-chat__thread-action-view--form" data-ai-thread-action-view="rename" hidden>
        <input type="text" maxlength="80" data-ai-thread-rename-input>
        <div class="ai-chat__thread-confirm-row">
          <button type="button" data-ai-thread-action-cancel></button>
          <button type="button" data-ai-thread-rename-confirm></button>
        </div>
      </div>
      <div class="ai-chat__thread-action-view ai-chat__thread-action-view--confirm" data-ai-thread-action-view="delete" hidden>
        <p data-ai-thread-delete-message></p>
        <div class="ai-chat__thread-confirm-row">
          <button type="button" data-ai-thread-action-cancel></button>
          <button type="button" data-ai-thread-delete-confirm></button>
        </div>
      </div>
    `;
    const renameButton = actions.querySelector('[data-ai-thread-rename]');
    const deleteButton = actions.querySelector('[data-ai-thread-delete]');
    const renameConfirm = actions.querySelector('[data-ai-thread-rename-confirm]');
    const deleteConfirm = actions.querySelector('[data-ai-thread-delete-confirm]');
    const renameInput = actions.querySelector('[data-ai-thread-rename-input]');
    const deleteMessage = actions.querySelector('[data-ai-thread-delete-message]');
    actions.querySelectorAll('[data-ai-thread-action-cancel]').forEach((cancelButton) => {
      if (cancelButton instanceof HTMLButtonElement) {
        cancelButton.textContent = cancelLabel;
        cancelButton.setAttribute('aria-label', cancelLabel);
      }
    });
    if (renameButton instanceof HTMLButtonElement) {
      renameButton.textContent = renameLabel;
      renameButton.setAttribute('aria-label', renameLabel);
      renameButton.title = renameLabel;
    }
    if (deleteButton instanceof HTMLButtonElement) {
      deleteButton.textContent = deleteLabel;
      deleteButton.setAttribute('aria-label', deleteLabel);
      deleteButton.title = deleteLabel;
    }
    if (renameConfirm instanceof HTMLButtonElement) {
      renameConfirm.textContent = renameLabel;
    }
    if (deleteConfirm instanceof HTMLButtonElement) {
      deleteConfirm.textContent = deleteLabel;
    }
    if (renameInput instanceof HTMLInputElement) {
      renameInput.setAttribute('aria-label', renameLabel);
    }
    if (deleteMessage instanceof HTMLElement) {
      deleteMessage.textContent = copy.deleteThreadConfirm || '';
    }

    row.append(button, menu, actions);
    list.append(row);
  }
}

function setThreadActionView(row, view) {
  const actions = row?.querySelector('.ai-chat__thread-actions');
  if (!(actions instanceof HTMLElement)) {
    return;
  }

  actions.querySelectorAll('[data-ai-thread-action-view]').forEach((panel) => {
    if (panel instanceof HTMLElement) {
      panel.hidden = panel.dataset.aiThreadActionView !== view;
    }
  });
}

function closeThreadMenus(list, exceptRow = null) {
  list.querySelectorAll('[data-thread-id]').forEach((row) => {
    if (!(row instanceof HTMLElement) || row === exceptRow) {
      return;
    }
    const actions = row.querySelector('.ai-chat__thread-actions');
    const toggle = row.querySelector('[data-ai-thread-menu-toggle]');
    if (actions instanceof HTMLElement) {
      actions.hidden = true;
      setThreadActionView(row, 'choices');
    }
    if (toggle instanceof HTMLButtonElement) {
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
}

function openHistoryDialog(root, { title, message = '', value = '', confirmLabel = '', showInput = false }) {
  const dialog = root.querySelector('[data-ai-history-dialog]');
  if (!(dialog instanceof HTMLDialogElement)) {
    return Promise.resolve(null);
  }
  const titleNode = dialog.querySelector('[data-ai-dialog-title]');
  const messageNode = dialog.querySelector('[data-ai-dialog-message]');
  const input = dialog.querySelector('[data-ai-dialog-input]');
  const confirm = dialog.querySelector('[data-ai-dialog-confirm]');
  if (titleNode) titleNode.textContent = title;
  if (messageNode instanceof HTMLElement) {
    messageNode.textContent = message;
    messageNode.hidden = !message;
  }
  if (input instanceof HTMLInputElement) {
    input.hidden = !showInput;
    input.value = value;
    input.onkeydown = (event) => {
      if (showInput && event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        dialog.close('confirm');
      }
    };
  }
  if (confirm instanceof HTMLButtonElement) confirm.textContent = confirmLabel;
  if (dialog.open) dialog.close('cancel');

  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      resolve(dialog.returnValue === 'confirm' ? (showInput && input instanceof HTMLInputElement ? input.value : true) : null);
    }, { once: true });
    dialog.showModal();
    if (showInput && input instanceof HTMLInputElement) {
      window.setTimeout(() => {
        input.focus();
        input.select();
      }, 40);
    }
  });
}

async function renameThread(root, threadId, title) {
  const revision=widgetRevision(root);
  if (!threadId || !title?.trim()) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/v2/conversations/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: title.trim() }),
  });
  if(revision!==widgetRevision(root))return;
  if (response.ok) {
    await loadThreadList(root);
  }
}

async function deleteThread(root, threadId) {
  const revision=widgetRevision(root);
  if (!threadId) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/v2/conversations/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if(revision!==widgetRevision(root))return;
  if (!response.ok) {
    return;
  }
  if (root.dataset.currentThreadId === threadId) {
    root.dataset.currentThreadId = '';
    clearMessages(root);
  }
  await loadThreadList(root);
}

async function clearAllThreads(root, copy) {
  const revision=widgetRevision(root);
  const confirmed = await openHistoryDialog(root, {
    title: copy.clearHistoryLabel || '',
    message: copy.clearHistoryConfirm || '',
    confirmLabel: copy.clearHistoryLabel || '',
  });
  if (!confirmed||revision!==widgetRevision(root)) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/v2/conversations?agentId=observer`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if(revision!==widgetRevision(root))return;
  if (!response.ok) {
    showAuthNote(root, copy.authErrorFallback || copy.fallbackOffline || '');
    return;
  }
  root.dataset.currentThreadId = '';
  renderThreadList(root, []);
  clearMessages(root);
  const messages = root.querySelector('[data-ai-messages]');
  if (messages instanceof HTMLElement) {
    createMessage(root,'assistant', copy.greeting || '', root.dataset.locale);
  }
  loadThreadList(root).catch(() => {});
}

async function loadThreadList(root) {
  const revision=widgetRevision(root);
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase || root.dataset.viewerKind !== 'user') {
    return;
  }

  const response = await fetch(`${apiBase}/api/ai/v2/conversations?agentId=observer`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  if(revision!==widgetRevision(root))return;
  renderThreadList(root, Array.isArray(data.conversations) ? data.conversations : []);
}

function clearMessages(root) {
  chatPresentationStore(root).clear();
  const messages = root.querySelector('[data-ai-messages]');
  if (!(messages instanceof HTMLElement)) {
    return;
  }
  if(!chatPresentationStore(root).ui)messages.innerHTML = '';
}

async function loadThreadDetail(root, threadId) {
  const revision=widgetRevision(root);
  const apiBase = root.dataset.apiBase || '';
  const messages = root.querySelector('[data-ai-messages]');
  if (!apiBase || !(messages instanceof HTMLElement)) {
    return;
  }

  const response = await fetch(`${apiBase}/api/ai/v2/conversations/${encodeURIComponent(threadId)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  if(revision!==widgetRevision(root))return;
  root.dataset.currentThreadId = data.conversation?.id || data.thread?.id || threadId;
  clearMessages(root);
  for (const item of data.messages || []) {
    const rendered = createMessage(
      root,
      item.role === 'user' ? 'user' : 'assistant',
      item.content || '',
      root.dataset.locale,
    );

    for (const source of item.sources || []) {
      appendSource(rendered.content, source);
    }
  }
  renderThreadList(root, [...root.querySelectorAll('[data-ai-thread-id]')].map((button) => ({
    id: button.dataset.aiThreadId,
    title: button.querySelector('span')?.textContent || '',
    updatedAt: button.querySelector('small')?.textContent || '',
  })));
  scrollMessages(messages);
  return true;
}

async function readStream(response, assistantMessage, messages, copy, root, retryText, {signal, resume}) {
  const revision=widgetRevision(root);
  const { content } = assistantMessage;
  const locale = root?.dataset.locale || document.documentElement.lang || 'zh';
  let assistantText = '';
  let hasDelta = false;
  let hasTerminalMessage = false;
  let receivedDone = false;
  let needsChallenge = false;
  const streamRenderer = createStreamingRenderer(content, messages, locale);

  try {
    for await (const event of readChatEvents(response, {signal, resume, stillCurrent:()=>revision===widgetRevision(root)})) {
      if (event.type === 'done') receivedDone = true;
      if (event.type === 'thread' && event.data.threadId) {
        root.dataset.currentThreadId = event.data.threadId;
      }

      if (event.type === 'delta' && typeof event.data.text === 'string') {
        if (!hasDelta) {
          finishThinkingMessage(assistantMessage);
          hasDelta = true;
        }
        assistantText += event.data.text;
        streamRenderer.update(assistantText);
      }

      if (event.type === 'challenge_required') {
        finishThinkingMessage(assistantMessage);
        streamRenderer.cancel();
        setMessageMarkdown(content, copy.challengeFallback || '', locale);
        needsChallenge = true;
        hasTerminalMessage = true;
      }

      if (event.type === 'login_required') {
        finishThinkingMessage(assistantMessage);
        streamRenderer.cancel();
        setMessageMarkdown(content, copy.loginRequiredFallback || copy.authErrorFallback || '', locale);
        hasTerminalMessage = true;
      }

      if (event.type === 'snapshot') {
        assistantText=event.data.text || '';
        hasDelta=Boolean(assistantText);
        finishThinkingMessage(assistantMessage);
        streamRenderer.update(assistantText);
        for (const source of event.data.sources || []) appendSource(content, source);
      }

      if (event.type === 'source') {
        appendSource(content, event.data);
      }

      if (event.type === 'error') {
        finishThinkingMessage(assistantMessage);
        streamRenderer.cancel();
        setMessageMarkdown(content, aiChatErrorText(event.data.code, locale, copy.streamErrorFallback), locale);
        content.store.patch(content, {error: true, retryText});
        hasTerminalMessage = true;
      }
    }
  } catch(error) {
    if(error?.name==='AbortError') throw error;
    if(!assistantText)throw error;
    finishThinkingMessage(assistantMessage);
    streamRenderer.cancel();
    setMessageMarkdown(content, [assistantText, aiChatErrorText(error?.chatCode,locale,copy.streamErrorFallback)].join('\n\n'), locale);
    content.store.patch(content, {error: true, retryText});
    return {needsChallenge:false};
  }
  if(revision!==widgetRevision(root))return {needsChallenge:false};
  if (!receivedDone && !hasTerminalMessage) {
    finishThinkingMessage(assistantMessage);
    streamRenderer.cancel();
    const notice = aiChatErrorText('stream_interrupted', locale);
    setMessageMarkdown(content, [assistantText, notice].filter(Boolean).join('\n\n'), locale);
    content.store.patch(content, {error: true, retryText});
    hasTerminalMessage = true;
  }
  if (hasDelta && !hasTerminalMessage) {
    streamRenderer.complete(assistantText);
  }

  if (!hasDelta && !hasTerminalMessage) {
    finishThinkingMessage(assistantMessage);
    streamRenderer.cancel();
    setMessageMarkdown(content, content.dataset.emptyResponse || '', locale);
  }

  if (needsChallenge && root) {
    return { needsChallenge: true };
  }

  return { needsChallenge: false };
}

function resetLauncherDock() {
  const launcher = document.querySelector('[data-ai-launcher]');
  if (!(launcher instanceof HTMLElement)) {
    return;
  }

  try {
    localStorage.removeItem(legacyLauncherPositionKey);
  } catch {}

  launcher.style.removeProperty('top');
  launcher.style.removeProperty('right');
  launcher.style.removeProperty('bottom');
  launcher.style.removeProperty('left');
}

function consumeAuthResult() {
  const url = new URL(window.location.href);
  const result = url.searchParams.get('aiAuth');
  if (!result) {
    return;
  }

  const locale = document.documentElement.lang || 'zh';
  const message = result === 'success'
    ? ({ zh: '登录成功', ja: 'ログインしました', en: 'Signed in' }[locale] || 'Signed in')
    : ({ zh: '登录没有完成，请重新尝试。', ja: 'ログインを完了できませんでした。もう一度お試しください。', en: 'Sign-in did not complete. Please try again.' }[locale] || 'Sign-in did not complete. Please try again.');

  url.searchParams.delete('aiAuth');
  url.searchParams.delete('aiAuthProvider');
  url.searchParams.delete('aiAuthCode');
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

  const notice = document.createElement('div');
  notice.className = `ai-auth-callback-toast${result === 'success' ? ' is-success' : ' is-error'}`;
  notice.setAttribute('role', 'status');
  notice.textContent = message;
  document.body.append(notice);
  window.requestAnimationFrame(() => notice.classList.add('is-visible'));
  window.setTimeout(() => {
    notice.classList.remove('is-visible');
    window.setTimeout(() => notice.remove(), 240);
  }, 3600);
}

function initWidget(root) {
  if(root.dataset.aiControllerReady)return;root.dataset.aiControllerReady='true';
  onFloatingPanelChange(id=>{if(root.dataset.aiPresentation!=='embedded'&&id!=='ai'&&root.classList.contains('is-open'))setExpanded(root,false,false);});
  const copy = normalizeCopy(root);
  const toggle = document.querySelector('[data-ai-toggle]');
  const close = root.querySelector('[data-ai-close]');
  const scrim = root.querySelector('[data-ai-scrim]');
  const settingsToggle = root.querySelector('[data-ai-settings-toggle]');
  const settingsPopover = root.querySelector('[data-ai-settings-popover]');
  const historyToggle = root.querySelector('[data-ai-history-toggle]');
  const newThreadButton = root.querySelector('[data-ai-new-thread]');
  const clearHistoryButton = root.querySelector('[data-ai-history-clear]');
  const form = root.querySelector('[data-ai-form]');
  let input = root.querySelector('[data-ai-input]');
  const messages = root.querySelector('[data-ai-messages]');
  const quick = root.querySelector('[data-ai-quick]');
  const threadList = root.querySelector('[data-ai-thread-list]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const logoutButton = root.querySelector('[data-ai-logout]');
  const terminalLink = root.querySelector('[data-ai-terminal-link]');

  if (
    !(toggle instanceof HTMLButtonElement) ||
    (root.dataset.aiPresentation!=='embedded'&&!(close instanceof HTMLButtonElement)) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLTextAreaElement) ||
    !(messages instanceof HTMLElement) ||
    !(quick instanceof HTMLElement)
  ) {
    return;
  }

  let isReady = false;
  let readyPromise = null;

  const showLoadError = error => {
    console.error('AI component initialization failed',error);
    const presentation=chatPresentationStore(root),first=presentation.getSnapshot().messages.find(message=>message.role==='assistant');
    const handle=first?{id:first.id}:presentation.append('assistant');
    if(!presentation.ui&&!root.querySelector('[data-ai-load-fallback]')){const fallback=document.createElement('p');fallback.dataset.aiLoadFallback='';fallback.setAttribute('role','alert');fallback.append(document.createTextNode(copy.fallbackOffline||'Connection failed.'));const retry=document.createElement('button');retry.type='button';retry.textContent=copy.retry||'Retry';retry.onclick=()=>ensureWidgetReady().catch(showLoadError);fallback.append(retry);form.before(fallback);}
    presentation.patch(handle,{text:copy.fallbackOffline||copy.streamErrorFallback||'Connection failed.',error:true,retryText:'initialize',thinking:false,streaming:false});
  };

  const presentation=chatPresentationStore(root);
  let pendingRetry = null;
  if(root.dataset.aiPresentation==='embedded')presentation.subscribe(()=>{
    quick.hidden=presentation.getSnapshot().messages.some(message=>message.role==='user');
  });
  let componentFlight;
  const ensureChatComponents=()=>componentFlight ||= loadSiteComponents().then(async runtime=>{
    if(!presentation.getSnapshot().messages.length)createMessage(root,'assistant',copy.greeting||'',root.dataset.locale);
    const composer=root.querySelector('.ai-chat__composer');
    presentation.ui=await runtime.mountChat(messages,composer,{getSnapshot:presentation.getSnapshot,subscribe:presentation.subscribe,variant:'wiki',renderMarkdown:text=>renderMarkdown(text,root.dataset.locale),copy:{placeholder:copy.inputPlaceholder,send:copy.sendLabel,stop:copy.cancelLabel||'Stop',sources:convertAiResponseText('引用',root.dataset.locale),thinking:copy.thinkingPhrases||[copy.bubbleThinking||copy.status||'…'],retry:copy.retry||'Retry'},retry:entry=>{if(entry.retryText==='initialize')return ensureWidgetReady().catch(showLoadError);pendingRetry=entry.retryTurn || null;presentation.remove(entry);input.value=entry.retryText;presentation.setDraft(entry.retryText);input.focus();},initialDraft:input.value,inputAttributes:{'data-ai-input':'',id:'ai-chat-input'},onInputReady:element=>{input=element;input.maxLength=Number(root.dataset.messageMaxLength)||500;},send:text=>{input.value=text;form.requestSubmit();},cancel:()=>widgetRequests.get(root)?.abort()});
    window.addEventListener('pagehide',event=>{if(!event.persisted)presentation.ui?.destroy();});
  }).catch(error=>{componentFlight=null;throw error;});

  const ensureWidgetReady = () => {
    if (isReady) return Promise.resolve();
    if (!readyPromise) {
      readyPromise = (async () => {
        root.classList.add('is-loading');
        root.setAttribute('aria-busy','true');
        toggle.setAttribute('aria-busy', 'true');
        try {
          const locale = root.dataset.locale || document.documentElement.lang || 'zh';
          await loadMarkdownRenderer();
          const tasks = [
            bootstrap(root),
            ensureChatComponents(),
          ];
          if (isTraditionalAiResponseLocale(locale)) {
            tasks.push(loadTraditionalConverters());
          }
          await Promise.all(tasks);
          root.querySelector('[data-ai-load-fallback]')?.remove();
          isReady = true;
          root.classList.remove('has-load-error');
        } catch (error) {
          readyPromise = null;
          root.classList.add('has-load-error');
          throw error;
        } finally {
          root.classList.remove('is-loading');
          root.setAttribute('aria-busy','false');
          toggle.removeAttribute('aria-busy');
        }
      })();
    }
    return readyPromise;
  };

  const openPanel = () => {
    setExpanded(root, true);
    if(root.dataset.aiPresentation!=='embedded')window.setTimeout(() => {
      if (root.classList.contains('is-open')&&root.getClientRects().length) input.focus({preventScroll:true});
    }, 160);
    ensureWidgetReady().catch(showLoadError);
  };

  resetLauncherDock();
  if (terminalLink instanceof HTMLAnchorElement) {
    const context = collectPageContext(root);
    const target = new URL(terminalLink.href);
    target.searchParams.set('sourcePage', context.url);
    if (context.title) {
      target.searchParams.set('sourceTitle', context.title);
    }
    terminalLink.href = target.toString();
  }
  consumeAuthResult();
  updateAuthState(root, copy, { kind: 'anonymous' });
  window.addEventListener('kamitsubaki-auth-changed', () => {
    if (isReady) bootstrap(root).catch(() => {});
  });

  if(root.dataset.aiPresentation==='embedded')root.addEventListener('ai-widget:open',openPanel);
  else toggle.addEventListener('click',openPanel);

  close?.addEventListener('click', () => setExpanded(root, false));
  scrim?.addEventListener('click', () => setExpanded(root, false));
  root.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !root.classList.contains('is-open')) return;
    // Native history dialogs and conversation controls handle their own Escape.
    if (event.defaultPrevented || root.querySelector('dialog[open]')) return;
    event.preventDefault();
    event.stopPropagation();
    if (settingsPopover instanceof HTMLElement && !settingsPopover.hidden) {
      toggleSettings(root, false);
      settingsToggle?.focus({ preventScroll: true });
      return;
    }
    const historyPanel = root.querySelector('[data-ai-history-panel]');
    if (historyPanel instanceof HTMLElement && !historyPanel.hidden) {
      toggleHistory(root, false);
      historyToggle?.focus({ preventScroll: true });
      return;
    }
    if(root.dataset.aiPresentation==='embedded')window.dispatchEvent(new CustomEvent('wiki-dashboard-close'));else setExpanded(root,false);
  });
  settingsToggle?.addEventListener('click', () => {
    const popover = root.querySelector('[data-ai-settings-popover]');
    toggleSettings(root, popover instanceof HTMLElement ? popover.hidden : true);
  });
  settingsPopover?.addEventListener('click', (event) => {
    const option = event.target instanceof Element
      ? event.target.closest('[data-ai-retrieval-option]')
      : null;
    if (!(option instanceof HTMLButtonElement)) {
      return;
    }

    const retrievalValue = option.dataset.aiRetrievalOption;
    if (retrievalValue) {
      setSegmentedValue(root.querySelector('[data-ai-retrieval-mode]'), retrievalValue);
    }
  });
  historyToggle?.addEventListener('click', () => {
    const panel = root.querySelector('[data-ai-history-panel]');
    toggleHistory(root, panel instanceof HTMLElement ? panel.hidden : true);
  });
  newThreadButton?.addEventListener('click', () => {
    root.dataset.currentThreadId = '';
    clearMessages(root);
    const greeting = createMessage(root,'assistant', copy.greeting || '', root.dataset.locale);

  });

  clearHistoryButton?.addEventListener('click', () => {
    clearAllThreads(root, copy).catch(() => {});
  });

  threadList?.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const row = target?.closest('[data-thread-id]');
    const threadId = row instanceof HTMLElement ? row.dataset.threadId || '' : '';
    const menuToggle = target?.closest('[data-ai-thread-menu-toggle]');
    if (menuToggle instanceof HTMLButtonElement) {
      const actions = row?.querySelector('.ai-chat__thread-actions');
      if (actions instanceof HTMLElement) {
        closeThreadMenus(threadList, row instanceof HTMLElement ? row : null);
        const shouldOpen = actions.hidden;
        actions.hidden = !shouldOpen;
        if (shouldOpen) {
          setThreadActionView(row, 'choices');
        }
        menuToggle.setAttribute('aria-expanded', String(!actions.hidden));
      }
      return;
    }
    if (target?.closest('[data-ai-thread-rename]')) {
      const currentTitle = row?.querySelector('[data-ai-thread-id] span')?.textContent || '';
      const input = row?.querySelector('[data-ai-thread-rename-input]');
      setThreadActionView(row, 'rename');
      if (input instanceof HTMLInputElement) {
        input.value = currentTitle;
        input.focus({ preventScroll: true });
        input.select();
      }
      return;
    }
    if (target?.closest('[data-ai-thread-rename-confirm]')) {
      const input = row?.querySelector('[data-ai-thread-rename-input]');
      const nextTitle = input instanceof HTMLInputElement ? input.value : '';
      renameThread(root, threadId, nextTitle).catch(() => {});
      return;
    }
    if (target?.closest('[data-ai-thread-delete]')) {
      setThreadActionView(row, 'delete');
      return;
    }
    if (target?.closest('[data-ai-thread-delete-confirm]')) {
      deleteThread(root, threadId).catch(() => {});
      return;
    }
    if (target?.closest('[data-ai-thread-action-cancel]')) {
      const actions = row?.querySelector('.ai-chat__thread-actions');
      const toggle = row?.querySelector('[data-ai-thread-menu-toggle]');
      if (actions instanceof HTMLElement) {
        actions.hidden = true;
        setThreadActionView(row, 'choices');
      }
      if (toggle instanceof HTMLButtonElement) {
        toggle.setAttribute('aria-expanded', 'false');
      }
      return;
    }
    const button = target?.closest('[data-ai-thread-id]');
    if (button instanceof HTMLButtonElement) {
      closeThreadMenus(threadList);
      loadThreadDetail(root, button.dataset.aiThreadId || '').then(loaded=>{
        if(loaded&&root.dataset.aiPresentation==='embedded'&&matchMedia('(max-width:760px)').matches){
          toggleHistory(root,false);historyToggle?.focus({preventScroll:true});
        }
      }).catch(() => {});
    }
  });

  threadList?.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!(target instanceof HTMLInputElement) || !target.matches('[data-ai-thread-rename-input]')) {
      return;
    }
    const row = target.closest('[data-thread-id]');
    const threadId = row instanceof HTMLElement ? row.dataset.threadId || '' : '';
    if (event.key === 'Enter' && !event.isComposing) {
      event.preventDefault();
      renameThread(root, threadId, target.value).catch(() => {});
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      const actions = row?.querySelector('.ai-chat__thread-actions');
      const toggle = row?.querySelector('[data-ai-thread-menu-toggle]');
      if (actions instanceof HTMLElement) {
        actions.hidden = true;
        setThreadActionView(row, 'choices');
      }
      if (toggle instanceof HTMLButtonElement) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    }
  });

  quick.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }

    input.value = target.dataset.aiPrompt || '';
    presentation.setDraft(input.value);
    input.focus();
  });

  oauthButtons.forEach((button) => {
    if(button instanceof HTMLAnchorElement)button.href=centralLoginUrl();
  });

  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener('click', () => logout(root, copy).catch(() => {}));
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  });

  let inputIsComposing = false;
  let compositionEndedAt = Number.NEGATIVE_INFINITY;
  input.addEventListener('compositionstart', () => {
    inputIsComposing = true;
  });
  input.addEventListener('compositionend', () => {
    inputIsComposing = false;
    compositionEndedAt = performance.now();
  });

  input.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const isEnter = event.key === 'Enter' || event.code === 'NumpadEnter';
    const isImeCommit = inputIsComposing || event.isComposing || event.keyCode === 229 || performance.now() - compositionEndedAt < 80;
    if (isEnter && isImeCommit) {
      return;
    }
    if (isEnter && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      insertTextareaNewline(input);
      return;
    }

    if (isEnter && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    const revision=widgetRevision(root);
    event.preventDefault();

    const message = input.value.trim();
    if (!message || root.classList.contains('is-thinking')) {
      return;
    }

    try{await ensureWidgetReady();}catch(error){showLoadError(error);return;}
    if(revision!==widgetRevision(root))return;
    const apiBase = root.dataset.apiBase || '';
    const locale = root.dataset.locale || document.documentElement.lang || 'zh';
    const localeRequest = buildAiLocaleRequest(locale);
    if (message.length > (Number(root.dataset.messageMaxLength) || 500)) {
      createMessage(root, 'assistant', aiChatErrorText('message_too_long', locale), locale);
      return;
    }
    const turn = pendingRetry?.message === message && pendingRetry.revision === revision &&
      (!root.dataset.currentThreadId || root.dataset.currentThreadId === pendingRetry.conversationId)
      ? pendingRetry
      : { message, revision, clientMessageId: crypto.randomUUID(), conversationId: root.dataset.currentThreadId || crypto.randomUUID() };
    pendingRetry = null;
    const controller=new AbortController();widgetRequests.set(root,controller);
    if (!turn.userMessage) turn.userMessage = createMessage(root,'user', message);

    input.value = '';
    presentation.setDraft('');
    input.style.height = 'auto';

    const assistantMessage = createThinkingMessage(root,copy);
    assistantMessage.content.dataset.emptyResponse = copy.emptyResponse || '';

    scrollMessages(messages);
    setThinking(root, copy, true);

    let sent=false;
    const requestChat = (turnstileToken = '', resumeFrom, streamAction) => {
      if(!streamAction)sent=true;
      const body = {
        agentId: 'observer',
        message,
        locale: localeRequest.locale,
        conversationId: turn.conversationId,
        clientMessageId: turn.clientMessageId,
        streamVersion: 1,
        resumeFrom,
        streamAction,
        retrievalMode: root.querySelector('[data-ai-retrieval-mode]')?.dataset.value === 'forced' ? 'forced' : 'auto',
        pageContext: {
          ...collectPageContext(root),
          responseLocale: localeRequest.locale,
          responseLanguage: localeRequest.responseLanguage,
          responseInstruction: localeRequest.responseInstruction,
        },
      };
      if (turnstileToken) {
        body.turnstileToken = turnstileToken;
      }
      return fetch(`${apiBase}/api/ai/v2/chat`, {
        method: 'POST',
        credentials: 'include',
        signal:streamAction?undefined:controller.signal,
        keepalive:streamAction==='cancel',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    };

    const streamOptions={signal:controller.signal,resume:cursor=>requestChat('',cursor)};
    controller.signal.addEventListener('abort',()=>{if(sent)void requestChat('',undefined,'cancel').catch(()=>{});},{once:true});

    try {
      let turnstileToken = '';
      if (root.dataset.viewerKind !== 'user') {
        turnstileToken = await requestTurnstileToken(root, assistantMessage.content, copy, {
          action: 'ai_chat',
        });
        if (!turnstileToken) {
          finishThinkingMessage(assistantMessage);
          setMessageMarkdown(
            assistantMessage.content,
            copy.challengeFallback || copy.streamErrorFallback || '',
            localeRequest.locale,
          );
          return;
        }
      }

      let response = await requestChat(turnstileToken);
      if(revision!==widgetRevision(root)){await response.body?.cancel();return;}
      delete root.dataset.turnstileToken;

      let result = await readStream(response, assistantMessage, messages, copy, root, message, streamOptions);
      if (result.needsChallenge && root.dataset.viewerKind === 'user') {
        const retryToken = await requestTurnstileToken(root, assistantMessage.content, copy, {
          action: 'ai_chat',
          updateContent: false,
        });
        if (retryToken) {
          startThinkingMessage(assistantMessage, copy);
          scrollMessages(messages);
          response = await requestChat(retryToken);
          if(revision!==widgetRevision(root)){await response.body?.cancel();return;}
          delete root.dataset.turnstileToken;
          result = await readStream(response, assistantMessage, messages, copy, root, message, streamOptions);
        }
      }
      if (root.dataset.viewerKind === 'user') {
        loadThreadList(root).catch(() => {});
      }
    } catch(error) {
      if(revision!==widgetRevision(root))return;
      finishThinkingMessage(assistantMessage);
      setMessageMarkdown(assistantMessage.content, error?.name==='AbortError'?(assistantMessage.content.textContent||copy.cancelLabel||''):aiChatErrorText(error?.chatCode, localeRequest.locale, copy.fallbackOffline), localeRequest.locale);
      if (error?.name !== 'AbortError') assistantMessage.content.store.patch(assistantMessage.content, {error: true, retryText: message});
    } finally {
      assistantMessage.content.store.patch(assistantMessage.content, {retryTurn: turn});
      if(widgetRequests.get(root)===controller)widgetRequests.delete(root);
      if(revision===widgetRevision(root)){setThinking(root, copy, false);scrollMessages(messages);}
    }
  });
}

widgets.forEach(initWidget);
window.addEventListener('kamitsubaki-account-state',()=>{
  if(!['user','guest'].includes(centralAccountState.auth))return;
  for(const root of widgets){const id=centralAccountState.viewer?.userId||'',copy=normalizeCopy(root),viewer=centralAccountState.viewer||{kind:'anonymous'};if(root.dataset.viewerId===id){updateAuthState(root,copy,viewer);continue;}widgetRequests.get(root)?.abort();widgetRequests.delete(root);root.dataset.accountGeneration=String(widgetRevision(root)+1);root.dataset.currentThreadId='';delete root.dataset.turnstileToken;const input=root.querySelector('[data-ai-input]');if(input){input.value='';input.style.height='auto';}chatPresentationStore(root).setDraft('');hideChallengeTray(root);setThinking(root,copy,false);clearMessages(root);renderThreadList(root,[]);updateAuthState(root,copy,viewer);void bootstrap(root).catch(()=>{});}
});
