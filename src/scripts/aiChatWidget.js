import { readModelSettings, setSegmentedValue } from '../lib/aiChatControls.mjs';
import { parseAiStreamChunk } from '../lib/aiStream.mjs';

const widgets = document.querySelectorAll('[data-ai-chat]');
const launcherStorageKey = 'kfw_ai_launcher_position';
const launcherDragThreshold = 12;
let turnstileLoader;
let markdownRendererLoader;

function loadMarkdownRenderer() {
  if (!markdownRendererLoader) {
    markdownRendererLoader = import('../lib/aiMarkdownRenderer.mjs');
  }
  return markdownRendererLoader;
}

function setMessageMarkdown(content, text) {
  const rawText = String(text || '');
  const renderId = crypto.randomUUID();
  content.dataset.markdownRenderId = renderId;
  content.textContent = rawText;
  loadMarkdownRenderer()
    .then(({ renderMarkdown }) => {
      if (content.dataset.markdownRenderId === renderId) {
        content.innerHTML = renderMarkdown(rawText);
      }
    })
    .catch(() => {
      if (content.dataset.markdownRenderId === renderId) {
        content.textContent = rawText;
      }
    });
}

function createStreamingRenderer(content, messages) {
  let pendingText = '';
  let frame = 0;

  const flush = () => {
    frame = 0;
    content.textContent = pendingText;
    scrollMessages(messages);
  };

  return {
    update(text) {
      pendingText = text;
      if (!content.classList.contains('ai-message__content--streaming')) {
        content.classList.add('ai-message__content--streaming');
        content.textContent = '';
      }
      if (!frame) {
        frame = window.requestAnimationFrame(flush);
      }
    },
    complete(text) {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      content.classList.remove('ai-message__content--streaming');
      setMessageMarkdown(content, text);
      scrollMessages(messages);
    },
    cancel() {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      content.classList.remove('ai-message__content--streaming');
    },
  };
}

function createMessage(role, text = '') {
  const message = document.createElement('article');
  message.className = `ai-message ai-message--${role}`;

  if (role === 'assistant') {
    const avatar = document.createElement('div');
    avatar.className = 'ai-message__avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5Z"/></svg>';
    message.append(avatar);
  }

  const content = document.createElement('div');
  content.className = 'ai-message__content ai-markdown';
  setMessageMarkdown(content, text);
  message.append(content);

  return { message, content };
}

function startThinkingMessage(assistantMessage, copy) {
  const phrases = Array.isArray(copy.thinkingPhrases) && copy.thinkingPhrases.length
    ? copy.thinkingPhrases
    : [copy.bubbleThinking, copy.status].filter(Boolean);
  const { message, content } = assistantMessage;
  message.classList.add('ai-message--thinking');
  content.classList.remove('ai-markdown');
  content.innerHTML = `
    <div class="ai-thinking" aria-live="polite">
      <span class="ai-thinking__beam" aria-hidden="true"></span>
      <span class="ai-thinking__text"></span>
      <span class="ai-thinking__dots" aria-hidden="true"><i></i><i></i><i></i></span>
    </div>
  `;
  const text = content.querySelector('.ai-thinking__text');
  if (text) {
    text.textContent = phrases[0] || '';
  }

  if (phrases.length > 1) {
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % phrases.length;
      if (text) {
        text.textContent = phrases[index];
      }
    }, 1600);
    message.dataset.thinkingTimer = String(timer);
  }
}

function createThinkingMessage(copy) {
  const assistantMessage = createMessage('assistant');
  startThinkingMessage(assistantMessage, copy);
  const { message, content } = assistantMessage;
  return { message, content };
}

function finishThinkingMessage({ message, content }) {
  const timer = Number(message.dataset.thinkingTimer || 0);
  if (timer) {
    window.clearInterval(timer);
  }
  delete message.dataset.thinkingTimer;
  message.classList.remove('ai-message--thinking');
  content.classList.add('ai-markdown');
  content.textContent = '';
}

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

function formatSourceKind(source) {
  const type = String(source?.sourceType || '').toLowerCase();
  if (type === 'current-page') {
    return '当前页';
  }
  if (type === 'official') {
    return '官方';
  }
  if (type === 'wiki') {
    return '站内/百科';
  }
  if (type.startsWith('web')) {
    return '全网';
  }
  return '来源';
}

function appendSource(content, source) {
  if (!source?.title || !source?.url) {
    return;
  }

  const sourceUrl = parseHttpUrl(source.url);
  if (!sourceUrl) {
    return;
  }

  const message = content.closest('.ai-message');
  if (!message) {
    return;
  }

  let sources = message.querySelector('.ai-message__sources');
  if (!sources) {
    sources = document.createElement('details');
    sources.className = 'ai-message__sources';
    sources.innerHTML = `
      <summary>
        <span class="ai-message__sources-label">引用</span>
        <span class="ai-message__sources-count">0</span>
      </summary>
      <div class="ai-message__sources-list"></div>
    `;
    message.append(sources);
  }

  const list = sources.querySelector('.ai-message__sources-list');
  if (!(list instanceof HTMLElement)) {
    return;
  }

  const normalizedUrl = sourceUrl.href;
  const existingLinks = Array.from(list.querySelectorAll('a'));
  if (existingLinks.some((link) => link.href === normalizedUrl)) {
    return;
  }

  const link = document.createElement('a');
  const kind = document.createElement('b');
  const title = document.createElement('span');
  const host = document.createElement('small');
  link.href = normalizedUrl;
  link.target = '_blank';
  link.rel = 'noreferrer';
  kind.textContent = formatSourceKind(source);
  title.textContent = String(source.title || formatSourceHost(sourceUrl)).trim();
  host.textContent = formatSourceHost(sourceUrl);
  link.append(kind, title, host);
  list.append(link);

  const count = sources.querySelector('.ai-message__sources-count');
  if (count) {
    count.textContent = String(list.querySelectorAll('a').length);
  }
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

function setExpanded(root, expanded) {
  const launcher = document.querySelector('[data-ai-launcher]');
  root.classList.toggle('is-open', expanded);
  root.querySelector('[data-ai-panel]')?.setAttribute('aria-hidden', expanded ? 'false' : 'true');
  document.querySelector('[data-ai-toggle]')?.setAttribute('aria-expanded', String(expanded));
  launcher?.classList.toggle('is-hidden', expanded);
  if (!expanded) {
    toggleSettings(root, false);
  }
}

function setThinking(root, copy, thinking) {
  root.classList.toggle('is-thinking', thinking);
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
  const status = root.querySelector('[data-ai-auth-status]');
  const logout = root.querySelector('[data-ai-logout]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const note = root.querySelector('[data-ai-auth-note]');
  const historyToggle = root.querySelector('[data-ai-history-toggle]');
  const isUser = viewer?.kind === 'user';

  root.dataset.viewerKind = isUser ? 'user' : 'anonymous';

  if (status) {
    status.textContent = isUser
      ? `${copy.accountLoggedInPrefix || ''} ${viewer.displayName || viewer.email || ''}`.trim()
      : copy.accountAnonymous || '';
  }

  oauthButtons.forEach((button) => {
    if (button instanceof HTMLButtonElement) {
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
}

async function bootstrap(root) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  const bootstrapUrl = new URL(`${apiBase}/api/ai/bootstrap`);
  bootstrapUrl.searchParams.set('locale', root.dataset.locale || document.documentElement.lang || 'zh');
  const response = await fetch(bootstrapUrl, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    return;
  }

  const data = await response.json();
  const copy = normalizeCopy(root);
  updateAuthState(root, copy, data.viewer);
  if (data.viewer?.kind === 'user') {
    if (Array.isArray(data.recentThreads)) {
      renderThreadList(root, data.recentThreads);
    }
    loadThreadList(root).catch(() => {});
  }

  if (typeof data.greeting === 'string' && data.greeting) {
    const firstAssistantMessage = root.querySelector('.ai-message--assistant .ai-message__content');
    if (firstAssistantMessage instanceof HTMLElement) {
      setMessageMarkdown(firstAssistantMessage, data.greeting);
    }
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

async function startOAuth(root, provider, trigger, copy) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase || !['github', 'google'].includes(provider)) {
    return;
  }

  const challengeAnchor = trigger instanceof HTMLElement ? trigger.closest('.ai-chat__auth-actions') || trigger : null;
  const turnstileToken = await requestTurnstileToken(root, challengeAnchor, copy, {
    action: 'oauth_login',
    updateContent: false,
  });
  if (!turnstileToken) {
    const note = root.querySelector('[data-ai-auth-note]');
    if (note instanceof HTMLElement) {
      note.hidden = false;
      note.textContent = copy.challengeFallback || copy.authErrorFallback || '';
    }
    return;
  }

  const returnTo = window.location.href;
  const url = new URL(apiBase + '/api/auth/oauth/' + provider + '/start');
  url.searchParams.set('returnTo', returnTo);
  const response = await fetch(url.toString(), {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ turnstileToken }),
  });
  delete root.dataset.turnstileToken;
  const data = await response.json();
  if (!response.ok || !data.authorizationUrl) {
    throw new Error('OAuth security challenge failed.');
  }
  window.location.assign(data.authorizationUrl);
}

async function logout(root, copy) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase) {
    return;
  }

  try {
    await fetch(`${apiBase}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
  } finally {
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
    menu.setAttribute('aria-label', 'Conversation actions');
    menu.setAttribute('aria-expanded', 'false');
    menu.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.45"/><circle cx="12" cy="12" r="1.45"/><circle cx="19" cy="12" r="1.45"/></svg>';

    const actions = document.createElement('div');
    actions.className = 'ai-chat__thread-actions';
    actions.hidden = true;
    actions.setAttribute('aria-label', 'Conversation actions');
    const copy = normalizeCopy(root);
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
          <button type="button" data-ai-thread-action-cancel>[CANCEL]</button>
          <button type="button" data-ai-thread-rename-confirm></button>
        </div>
      </div>
      <div class="ai-chat__thread-action-view ai-chat__thread-action-view--confirm" data-ai-thread-action-view="delete" hidden>
        <p data-ai-thread-delete-message></p>
        <div class="ai-chat__thread-confirm-row">
          <button type="button" data-ai-thread-action-cancel>[CANCEL]</button>
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
  if (!threadId || !title?.trim()) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/threads/${encodeURIComponent(threadId)}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ title: title.trim() }),
  });
  if (response.ok) {
    await loadThreadList(root);
  }
}

async function deleteThread(root, threadId) {
  if (!threadId) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/threads/${encodeURIComponent(threadId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
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
  const confirmed = await openHistoryDialog(root, {
    title: copy.clearHistoryLabel || '',
    message: copy.clearHistoryConfirm || '',
    confirmLabel: copy.clearHistoryLabel || '',
  });
  if (!confirmed) {
    return;
  }
  const response = await fetch(`${root.dataset.apiBase}/api/ai/threads`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return;
  }
  root.dataset.currentThreadId = '';
  clearMessages(root);
  await loadThreadList(root);
}

async function loadThreadList(root) {
  const apiBase = root.dataset.apiBase || '';
  if (!apiBase || root.dataset.viewerKind !== 'user') {
    return;
  }

  const response = await fetch(`${apiBase}/api/ai/threads`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  renderThreadList(root, Array.isArray(data.threads) ? data.threads : []);
}

function clearMessages(root) {
  const messages = root.querySelector('[data-ai-messages]');
  if (!(messages instanceof HTMLElement)) {
    return;
  }
  messages.innerHTML = '';
}

async function loadThreadDetail(root, threadId) {
  const apiBase = root.dataset.apiBase || '';
  const messages = root.querySelector('[data-ai-messages]');
  if (!apiBase || !(messages instanceof HTMLElement)) {
    return;
  }

  const response = await fetch(`${apiBase}/api/ai/threads/${encodeURIComponent(threadId)}`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    return;
  }

  const data = await response.json();
  root.dataset.currentThreadId = data.thread?.id || '';
  clearMessages(root);
  for (const item of data.messages || []) {
    const rendered = createMessage(item.role === 'user' ? 'user' : 'assistant', item.content || '');
    messages.append(rendered.message);
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
}

async function readStream(response, assistantMessage, messages, copy, root) {
  const { content } = assistantMessage;
  const contentType = response.headers.get('Content-Type') || '';
  if (!contentType.includes('text/event-stream')) {
    throw new Error('AI observer response is not an event stream.');
  }

  if (!response.body) {
    finishThinkingMessage(assistantMessage);
    setMessageMarkdown(content, content.dataset.emptyResponse || '');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let remainder = '';
  let assistantText = '';
  let hasDelta = false;
  let hasTerminalMessage = false;
  let needsChallenge = false;
  const streamRenderer = createStreamingRenderer(content, messages);

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    const parsed = parseAiStreamChunk(decoder.decode(value, { stream: true }), remainder);
    remainder = parsed.remainder;

    for (const event of parsed.events) {
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
        setMessageMarkdown(content, event.data.message || copy.challengeFallback || '');
        needsChallenge = true;
        hasTerminalMessage = true;
      }

      if (event.type === 'login_required') {
        finishThinkingMessage(assistantMessage);
        streamRenderer.cancel();
        setMessageMarkdown(content, event.data.message || copy.loginRequiredFallback || copy.authErrorFallback || '');
        hasTerminalMessage = true;
      }

      if (event.type === 'source') {
        appendSource(content, event.data);
      }

      if (event.type === 'error') {
        finishThinkingMessage(assistantMessage);
        streamRenderer.cancel();
        setMessageMarkdown(content, event.data.message || copy.streamErrorFallback || '');
        hasTerminalMessage = true;
      }
    }
  }

  if (hasDelta) {
    streamRenderer.complete(assistantText);
  }

  if (!hasDelta && !hasTerminalMessage) {
    finishThinkingMessage(assistantMessage);
    streamRenderer.cancel();
    setMessageMarkdown(content, content.dataset.emptyResponse || '');
  }

  if (needsChallenge && root) {
    return { needsChallenge: true };
  }

  return { needsChallenge: false };
}

function applyLauncherPosition(position) {
  const launcher = document.querySelector('[data-ai-launcher]');
  if (!(launcher instanceof HTMLElement)) {
    return;
  }

  const width = launcher.offsetWidth || 72;
  const height = launcher.offsetHeight || 72;
  const x = Math.max(12, Math.min(Number(position?.x ?? window.innerWidth - width - 24), window.innerWidth - width - 12));
  const y = Math.max(12, Math.min(Number(position?.y ?? window.innerHeight - height - 24), window.innerHeight - height - 12));
  launcher.style.left = `${x}px`;
  launcher.style.top = `${y}px`;
  launcher.style.right = 'auto';
  launcher.style.bottom = 'auto';
}

function initLauncherDrag(root) {
  const launcher = document.querySelector('[data-ai-launcher]');
  if (!(launcher instanceof HTMLElement)) {
    return;
  }

  try {
    applyLauncherPosition(JSON.parse(localStorage.getItem(launcherStorageKey) || 'null'));
  } catch {
    applyLauncherPosition(null);
  }

  let drag = null;
  launcher.addEventListener('pointerdown', (event) => {
    if (!(event.target instanceof Element) || !event.target.closest('[data-ai-toggle]')) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const rect = launcher.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
    };
  });

  window.addEventListener('pointermove', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const moved = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
    if (moved > launcherDragThreshold) {
      drag.moved = true;
      root.dataset.launcherDragging = 'true';
      launcher.dataset.dragging = 'true';
    }
    if (drag.moved) {
      event.preventDefault();
      applyLauncherPosition({ x: event.clientX - drag.offsetX, y: event.clientY - drag.offsetY });
    }
  });

  window.addEventListener('pointerup', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    if (drag.moved) {
      event.preventDefault();
      const rect = launcher.getBoundingClientRect();
      localStorage.setItem(launcherStorageKey, JSON.stringify({ x: rect.left, y: rect.top }));
      launcher.dataset.suppressClick = 'true';
      window.setTimeout(() => {
        delete launcher.dataset.suppressClick;
      }, 160);
    }
    delete root.dataset.launcherDragging;
    delete launcher.dataset.dragging;
    drag = null;
  });

  window.addEventListener('pointercancel', (event) => {
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    drag = null;
    delete root.dataset.launcherDragging;
    delete launcher.dataset.dragging;
    delete launcher.dataset.suppressClick;
  });

  launcher.addEventListener('click', (event) => {
    if (launcher.dataset.suppressClick === 'true') {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  window.addEventListener('resize', () => {
    const rect = launcher.getBoundingClientRect();
    applyLauncherPosition({ x: rect.left, y: rect.top });
  });
}

function initWidget(root) {
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
  const input = root.querySelector('[data-ai-input]');
  const messages = root.querySelector('[data-ai-messages]');
  const quick = root.querySelector('[data-ai-quick]');
  const threadList = root.querySelector('[data-ai-thread-list]');
  const oauthButtons = root.querySelectorAll('[data-ai-oauth]');
  const logoutButton = root.querySelector('[data-ai-logout]');

  if (
    !(toggle instanceof HTMLButtonElement) ||
    !(close instanceof HTMLButtonElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLTextAreaElement) ||
    !(messages instanceof HTMLElement) ||
    !(quick instanceof HTMLElement)
  ) {
    return;
  }

  const openPanel = () => {
    setExpanded(root, true);
    window.setTimeout(() => input.focus(), 160);
  };

  initLauncherDrag(root);
  updateAuthState(root, copy, { kind: 'anonymous' });
  bootstrap(root).catch(() => {});

  toggle.addEventListener('click', () => {
    const launcher = document.querySelector('[data-ai-launcher]');
    if (launcher instanceof HTMLElement && launcher.dataset.suppressClick === 'true') {
      return;
    }
    openPanel();
  });

  close.addEventListener('click', () => setExpanded(root, false));
  scrim?.addEventListener('click', () => setExpanded(root, false));
  settingsToggle?.addEventListener('click', () => {
    const popover = root.querySelector('[data-ai-settings-popover]');
    toggleSettings(root, popover instanceof HTMLElement ? popover.hidden : true);
  });
  settingsPopover?.addEventListener('click', (event) => {
    const option = event.target instanceof Element
      ? event.target.closest('[data-ai-model-option], [data-ai-thinking-option]')
      : null;
    if (!(option instanceof HTMLButtonElement)) {
      return;
    }

    const modelValue = option.dataset.aiModelOption;
    const thinkingValue = option.dataset.aiThinkingOption;
    if (modelValue) {
      setSegmentedValue(root.querySelector('[data-ai-model-choice]'), modelValue);
    }
    if (thinkingValue) {
      setSegmentedValue(root.querySelector('[data-ai-thinking-mode]'), thinkingValue);
    }
  });
  historyToggle?.addEventListener('click', () => {
    const panel = root.querySelector('[data-ai-history-panel]');
    toggleHistory(root, panel instanceof HTMLElement ? panel.hidden : true);
  });
  newThreadButton?.addEventListener('click', () => {
    root.dataset.currentThreadId = '';
    clearMessages(root);
    const greeting = createMessage('assistant', copy.greeting || '');
    messages.append(greeting.message);
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
      loadThreadDetail(root, button.dataset.aiThreadId || '').catch(() => {});
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
    input.focus();
  });

  oauthButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      if (button instanceof HTMLButtonElement) {
        button.disabled = true;
        try {
          await startOAuth(root, button.dataset.aiOauth || '', button, copy);
        } catch {
          const note = root.querySelector('[data-ai-auth-note]');
          if (note instanceof HTMLElement) {
            note.hidden = false;
            note.textContent = copy.authErrorFallback || copy.challengeFallback || '';
          }
          button.disabled = false;
        }
      }
    });
  });

  if (logoutButton instanceof HTMLButtonElement) {
    logoutButton.addEventListener('click', () => logout(root, copy).catch(() => {}));
  }

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  });

  input.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const isEnter = event.key === 'Enter' || event.code === 'NumpadEnter';
    if (isEnter && (event.ctrlKey || event.metaKey) && !event.isComposing) {
      event.preventDefault();
      insertTextareaNewline(input);
      return;
    }

    if (isEnter && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = input.value.trim();
    if (!message || root.classList.contains('is-thinking')) {
      return;
    }

    const apiBase = root.dataset.apiBase || '';
    const locale = root.dataset.locale || document.documentElement.lang || 'zh';
    const userMessage = createMessage('user', message);
    messages.append(userMessage.message);
    input.value = '';
    input.style.height = 'auto';

    const assistantMessage = createThinkingMessage(copy);
    assistantMessage.content.dataset.emptyResponse = copy.emptyResponse || '';
    messages.append(assistantMessage.message);
    scrollMessages(messages);
    setThinking(root, copy, true);

    const requestChat = (turnstileToken = '') => {
      const body = {
        message,
        locale,
        threadId: root.dataset.currentThreadId || undefined,
        pageContext: collectPageContext(root),
        ...readModelSettings(root),
      };
      if (turnstileToken) {
        body.turnstileToken = turnstileToken;
      }
      return fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(body),
      });
    };

    try {
      let turnstileToken = '';
      if (root.dataset.viewerKind !== 'user') {
        turnstileToken = await requestTurnstileToken(root, assistantMessage.content, copy, {
          action: 'ai_chat',
        });
        if (!turnstileToken) {
          finishThinkingMessage(assistantMessage);
          setMessageMarkdown(assistantMessage.content, copy.challengeFallback || copy.streamErrorFallback || '');
          return;
        }
      }

      let response = await requestChat(turnstileToken);
      delete root.dataset.turnstileToken;

      let result = await readStream(response, assistantMessage, messages, copy, root);
      if (result.needsChallenge && root.dataset.viewerKind === 'user') {
        const retryToken = await requestTurnstileToken(root, assistantMessage.content, copy, {
          action: 'ai_chat',
          updateContent: false,
        });
        if (retryToken) {
          startThinkingMessage(assistantMessage, copy);
          scrollMessages(messages);
          response = await requestChat(retryToken);
          delete root.dataset.turnstileToken;
          result = await readStream(response, assistantMessage, messages, copy, root);
        }
      }
      if (root.dataset.viewerKind === 'user') {
        loadThreadList(root).catch(() => {});
      }
    } catch {
      finishThinkingMessage(assistantMessage);
      setMessageMarkdown(assistantMessage.content, copy.fallbackOffline || '');
    } finally {
      setThinking(root, copy, false);
      scrollMessages(messages);
    }
  });
}

widgets.forEach(initWidget);
