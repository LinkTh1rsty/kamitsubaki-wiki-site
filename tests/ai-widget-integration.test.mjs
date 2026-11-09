import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const locales = ['zh', 'ja', 'en'];

async function readProjectFile(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

test('AI chat copy lives in localized site content', async () => {
  for (const locale of locales) {
    const content = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));

    assert.equal(typeof content.aiChat.title, 'string');
    assert.equal(typeof content.aiChat.greeting, 'string');
    assert.equal(typeof content.aiChat.fallbackOffline, 'string');
    assert.equal(typeof content.aiChat.challengeFallback, 'string');
    assert.equal(typeof content.aiChat.streamErrorFallback, 'string');
    assert.equal(typeof content.aiChat.keyboardHint, 'string');
    assert.equal(typeof content.aiChat.settingsLabel, 'string');
    assert.equal(typeof content.aiChat.threadActionsLabel, 'string');
    assert.equal(typeof content.aiChat.cancelLabel, 'string');
    assert.equal(typeof content.aiChat.loginRequiredFallback, 'string');
    assert.equal(content.aiChat.thinkingPhrases.length >= 1, true);
    assert.equal(typeof content.aiChat.historyLabel, 'string');
    assert.equal(content.aiChat.quickPrompts.length >= 1, true);
  }
});

test('AI chat widget receives copy from BaseLayout content lookup', async () => {
  const layout = await readProjectFile('../src/layouts/BaseLayout.astro');

  assert.match(layout, /getCollection\('site'\)/);
  assert.match(layout, /getLocalizedSite\(siteEntries,\s*lang\)/);
  assert.match(layout, /siteContent\?\.aiChat/);
  assert.match(layout, /<ObserverDashboard locale=\{lang\}[\s\S]*aiCopy=\{aiChatCopy\}/);
  const dashboard = await readProjectFile('../src/components/ObserverDashboard.astro');
  assert.equal((dashboard.match(/<AiChatWidget/g) || []).length, 1);
  assert.match(dashboard, /presentation="embedded"/);
  assert.doesNotMatch(layout, /<AiChatWidget/);
});

test('AI chat keeps the production Worker fallback when Pages build variables are absent', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');

  assert.match(component, /PUBLIC_AI_OBSERVER_API_BASE\s*\|\|\s*'https:\/\/api\.kamitsubaki\.wiki'/);
});

test('AI chat bootstrap sends the exact response locale for localized greetings', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.match(script, /buildAiLocaleRequest\(root\.dataset\.locale/);
  assert.match(script, /searchParams\.set\('locale',\s*localeRequest\.locale/);
  assert.match(script, /searchParams\.set\('languageTag',\s*localeRequest\.languageTag/);
  assert.match(script, /fetch\(bootstrapUrl/);
});

test('AI chat implementation does not hardcode localized chat copy', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.equal(component.includes('神椿是什么？'), false);
  assert.equal(component.includes('Need a quick Kamitsubaki primer?'), false);
  assert.equal(script.includes('观测回线暂时不稳定'), false);
  assert.equal(script.includes('观测频率过高'), false);
  assert.equal(script.includes('The observation line is offline'), false);
  assert.equal(component.includes('[CANCEL]'), false);
  assert.equal(script.includes('[CANCEL]'), false);
});

test('AI chat widget exposes interaction hooks and stream parser integration', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const controls = await readProjectFile('../src/lib/aiChatControls.mjs');
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(component, /data-ai-chat/);
  assert.match(component, /data-ai-toggle/);
  assert.match(component, /data-ai-launcher/);
  assert.match(component, /data-ai-scrim/);
  assert.match(component, /data-ai-messages/);
  assert.match(component, /data-ai-form/);
  assert.match(component, /data-ai-settings-toggle/);
  assert.match(component, /data-ai-settings-popover/);
  assert.match(component, /data-ai-retrieval-mode/);
  assert.equal(component.includes('data-ai-model-choice'), false);
  assert.equal(component.includes('data-ai-thinking-mode'), false);
  assert.match(component, /data-ai-challenge-tray/);
  assert.match(component, /data-ai-challenge-mount/);
  assert.match(component, /data-ai-terminal-link/);
  assert.match(script, /toggle\.addEventListener\('click'/);
  assert.match(script, /close\?\.addEventListener\('click'/);
  assert.match(script, /scrim\?\.addEventListener\('click'/);
  assert.match(script, /setExpanded\(root, true\)/);
  assert.match(script, /setExpanded\(root, false\)/);
  assert.match(script, /document\.querySelector\('\[data-ai-launcher\]'\)/);
  assert.match(script, /classList\.toggle\('is-hidden'/);
  assert.match(script, /resetLauncherDock/);
  assert.equal(component.includes("dataset.launcherDragging==='true'"), false);
  assert.equal(component.includes('onclick='), false);
  assert.equal(component.includes('data-ai-custom-model'), false);
  assert.match(script, /for await \(const event of readChatEvents\(/);
  assert.match(script, /text\/event-stream/);
  assert.match(script, /event\.type === 'thread'/);
  assert.match(script, /event\.type === 'source'/);
  assert.match(css, /\.ai-message__sources/);
  assert.match(css, /\.ai-message__sources-list/);
  assert.match(script, /dataset\.aiPrompt/);
  assert.match(script, /retrievalMode/);
  assert.match(script, /agentId: 'observer'/);
  assert.match(script, /\/api\/ai\/v2\/chat/);
  assert.match(script, /showChallengeTray/);
  assert.match(script, /hideChallengeTray/);
  assert.match(script, /theme: 'dark'/);
  assert.match(controls, /aiRetrievalOption/);
  assert.equal(controls.includes('modelChoice'), false);
  assert.equal(controls.includes('thinkingMode'), false);
  assert.match(script, /event\.key === 'Enter'/);
  assert.match(script, /event\.ctrlKey/);
  assert.match(script, /event\.metaKey/);
  assert.match(script, /event\.defaultPrevented/);
  assert.match(script, /compositionstart/);
  assert.match(script, /compositionend/);
  assert.match(script, /event\.keyCode === 229/);
  assert.match(script, /insertTextareaNewline/);
  assert.match(script, /selectionStart/);
  assert.match(script, /requestSubmit/);
  assert.match(css, /\.ai-chat__controls/);
  assert.match(css, /\.ai-chat__panel/);
  assert.match(css, /translateX/);
  assert.match(css, /\.ai-chat\.is-thinking/);
  assert.match(css, /@keyframes aiThinking/);
  assert.match(css, /@media \(max-width: 639px\)/);
});

test('AI chat widget keeps its launcher docked while supporting settings, history, and safe rich text rendering', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const homePage = await readProjectFile('../src/pages/[locale]/index.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const css = await readProjectFile('../src/styles/global.css');
  const packageJson = JSON.parse(await readProjectFile('../package.json'));

  assert.match(component, /data-ai-history-toggle/);
  assert.match(component, /data-ai-history-panel/);
  assert.match(component, /data-ai-thread-list/);
  assert.match(homePage, /data-page-context-root/);
  assert.match(component, /data-ai-settings-toggle[^>]*aria-label=/);
  assert.match(component, /data-ai-history-toggle[^>]*aria-label=/);
  assert.match(script, /legacyLauncherPositionKey/);
  assert.match(script, /localStorage\.removeItem\(legacyLauncherPositionKey\)/);
  assert.match(script, /style\.removeProperty\('left'\)/);
  assert.equal(script.includes('pointerdown'), false);
  assert.equal(script.includes('pointermove'), false);
  assert.equal(script.includes('pointerup'), false);
  assert.equal(script.includes('suppressClick'), false);
  assert.match(script, /api\/ai\/v2\/conversations/);
  assert.match(script, /loadThreadList/);
  assert.match(script, /loadThreadDetail/);
  assert.match(script, /data\.conversations/);
  assert.match(script, /collectPageContext/);
  assert.match(script, /\.\.\.collectPageContext\(root\)/);
  assert.match(script, /responseInstruction:\s*localeRequest\.responseInstruction/);
  assert.match(script, /data-page-context-root/);
  assert.match(script, /!node\.closest\('\[data-ai-chat\]'\)/);
  assert.match(script, /clonedMain\.textContent \|\| ''/);
  assert.match(script, /copy\.thinkingPhrases/);
  assert.match(script, /copy\.thinkingPhrases\|\|/);
  assert.equal(script.includes('setMessageMarkdown(assistantMessage.content, copy.challengeFallback || copy.thinking || \'\')'), false);
  assert.match(script, /action: 'ai_chat'/);
  assert.match(script, /root\.dataset\.viewerKind !== 'user'/);
  assert.match(script, /result\.needsChallenge && root\.dataset\.viewerKind === 'user'/);
  assert.match(script, /requestChat\(retryToken\)/);
  assert.match(script, /content\.store\.addSource/);
  assert.match(script, /formatSourceKind/);
  assert.match(css, /ai-message__sources-count/);
  assert.match(script, /sanitizeRenderedHtml/);
  assert.match(script, /micromark/);
  assert.match(script, /katex/);
  assert.match(script, /createStreamingRenderer/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /text:convertAiResponseText\(text,locale\)/);
  assert.match(css, /\.ai-chat__launcher/);
  assert.match(css, /\.ai-chat__launcher\.is-hidden/);
  assert.match(css, /\.ai-chat__settings-popover/);
  assert.match(css, /\.ai-chat__segmented/);
  assert.match(css, /\.ai-chat__challenge-tray/);
  assert.match(css, /\.ai-chat__challenge-shell/);
  assert.match(css, /\.ai-chat__challenge-mount/);
  assert.match(css, /\.ai-chat__header\s*\{[^}]*z-index: 4;/s);
  assert.match(css, /\.ai-chat__settings-popover\s*\{[^}]*z-index: 20;/s);
  assert.match(css, /\.ai-chat__body\s*\{[^}]*z-index: 1;/s);
  assert.match(css, /\.ai-chat__history/);
  assert.match(css, /aiPanelScan/);
  assert.match(css, /min-height: 3\.05rem/);
  assert.match(css, /\.ai-markdown/);
  assert.match(css, /\.ai-message--assistant/);
  assert.match(css, /\.ai-message__content--streaming/);
  assert.match(css, /table-layout: fixed/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.ok(packageJson.dependencies.micromark || packageJson.devDependencies.micromark);
  assert.ok(packageJson.dependencies.katex || packageJson.devDependencies.katex);
});

test('streaming uses one assistant bubble for thinking and the final answer', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.match(script, /const assistantMessage = createThinkingMessage\(root,copy\)/);
  assert.match(script, /content\.store\.patch/);
  assert.doesNotMatch(script,/messages\.append\(assistantMessage\.message\)/);
  assert.equal(script.includes('messages.append(thinkingMessage, assistantMessage.message)'), false);
});

test('AI chat widget exposes auth hooks and localized account copy', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const account = await readProjectFile('../src/components/AiChatAccount.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const css = await readProjectFile('../src/styles/global.css');

  for (const locale of locales) {
    const content = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));
    assert.equal(typeof content.aiChat.accountAnonymous, 'string');
    assert.equal(typeof content.aiChat.githubLoginLabel, 'string');
    assert.equal(typeof content.aiChat.googleLoginLabel, 'string');
    assert.equal(typeof content.aiChat.logoutLabel, 'string');
  }

  assert.match(component, /<AiChatAccount lang=\{lang\} copy=\{normalizedCopy\} signIn=\{signIn\.toString\(\)\}/);
  assert.match(account, /data-ai-auth/);
  assert.match(account, /data-ai-oauth href=\{signIn\}/);
  assert.doesNotMatch(account, /data-ai-oauth="(?:github|google)"/);
  assert.match(account, /data-ai-logout/);
  assert.match(script, /centralLoginUrl/);
  assert.match(script, /centralLogout/);
  assert.doesNotMatch(script, /api\/auth\/(?:oauth|logout)/);
  assert.match(script, /updateAuthState/);
  assert.match(css, /\.ai-chat__auth/);
  assert.match(css, /\.ai-chat__auth-actions/);
});

test('logged-in history exposes rename, delete, clear, and restored source controls', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(component, /data-ai-history-clear/);
  assert.match(component, /data-ai-thread-menu/);
  assert.match(component, /data-ai-history-dialog/);
  assert.match(script, /renameThread/);
  assert.match(script, /deleteThread/);
  assert.match(script, /clearAllThreads/);
  assert.match(script, /showAuthNote/);
  assert.match(script, /renderThreadList\(root, \[\]\)/);
  assert.match(script, /loadThreadList\(root\)\.catch\(\(\) => \{\}\)/);
  assert.match(script, /copy\.authErrorFallback \|\| copy\.fallbackOffline/);
  assert.match(script, /data-ai-thread-menu-toggle/);
  assert.match(script, /data-ai-thread-rename/);
  assert.match(script, /data-ai-thread-delete/);
  assert.match(script, /data-ai-thread-rename-confirm/);
  assert.match(script, /data-ai-thread-delete-confirm/);
  assert.match(script, /data-ai-thread-action-view/);
  assert.match(script, /closeThreadMenus/);
  assert.match(script, /item\.sources/);
  assert.match(script, /method: 'PATCH'/);
  assert.match(script, /method: 'DELETE'/);
  assert.match(css, /grid-template-columns: minmax\(0, 1fr\) 2\.45rem/);
  assert.match(css, /\.ai-chat__thread-menu/);
  assert.match(css, /grid-column: 1 \/ -1/);
  assert.match(css, /\.ai-chat__thread-actions button/);
  assert.equal(css.includes('position: absolute;\n  top: 100%;'), false);
  assert.match(css, /backdrop-filter:/);
  assert.match(css, /--ai-glass/);
  assert.match(css, /prefers-reduced-motion/);
  assert.equal(script.includes('window.prompt'), false);
  assert.equal(script.includes('window.confirm'), false);
});

test('AI chat light theme uses layered gray surfaces and white black-bordered prompt controls', async () => {
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(css, /html\[data-theme='light'\] \.ai-chat__header\s*\{[^}]*background: #e2e4e4;/s);
  assert.match(css, /html\[data-theme='light'\] \.ai-chat__messages\s*\{[^}]*background: #f6f7f7;/s);
  assert.match(css, /html\[data-theme='light'\] \.ai-chat__quick button\s*\{[^}]*border-color: #000000;[^}]*background: #ffffff;[^}]*color: #555b5f;/s);
  assert.match(css, /html\[data-theme='light'\] \.ai-chat__composer\s*\{[^}]*border-color: #000000;[^}]*background: #ffffff;/s);
  assert.match(css, /html\[data-theme='light'\] \.ai-chat__composer textarea::placeholder\s*\{[^}]*color: #747a7e;/s);
  assert.match(css, /html\[data-theme='light'\] \.ai-chat__submit-btn,[\s\S]*border: 1px solid #000000;[^}]*background: #ffffff;[^}]*color: #000000;/s);
});
