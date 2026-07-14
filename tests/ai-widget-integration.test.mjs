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
    assert.equal(typeof content.aiChat.loginRequiredFallback, 'string');
    assert.equal(content.aiChat.thinkingPhrases.length >= 1, true);
    assert.equal(typeof content.aiChat.historyLabel, 'string');
    assert.equal(content.aiChat.quickPrompts.length >= 1, true);
  }
});

test('AI chat widget receives copy from BaseLayout content lookup', async () => {
  const layout = await readProjectFile('../src/layouts/BaseLayout.astro');

  assert.match(layout, /getCollection\('site'\)/);
  assert.match(layout, /data\.aiChat/);
  assert.match(layout, /<AiChatWidget lang=\{lang\} copy=\{aiChatCopy\}/);
});

test('AI chat keeps the production Worker fallback when Pages build variables are absent', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');

  assert.match(component, /PUBLIC_AI_OBSERVER_API_BASE\s*\|\|\s*'https:\/\/api\.kamitsubaki\.wiki'/);
});

test('AI chat bootstrap sends the active page locale for localized IP greetings', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.match(script, /searchParams\.set\('locale',\s*root\.dataset\.locale/);
  assert.match(script, /fetch\(bootstrapUrl/);
});

test('AI chat delays bootstrap until the panel opens and reuses the request', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const initWidgetBody = script.slice(
    script.indexOf('function initWidget'),
    script.indexOf('widgets.forEach(initWidget)'),
  );
  const beforeOpenPanel = initWidgetBody.slice(0, initWidgetBody.indexOf('const openPanel'));

  assert.match(script, /const bootstrapLoaders = new WeakMap\(\)/);
  assert.doesNotMatch(beforeOpenPanel, /bootstrap\(root\)/);
  assert.match(
    initWidgetBody,
    /const finishPanelOpen = \(\) => \{[\s\S]*ensureBootstrap\(root\)\.catch\(\(\) => \{\}\)/,
  );
  assert.match(initWidgetBody, /panel\.addEventListener\('transitionend',[\s\S]*finishPanelOpen\(\)/);
  assert.equal((initWidgetBody.match(/ensureBootstrap\(root\)\.catch/g) || []).length, 1);
  assert.match(script, /if \(!response\.ok\) \{\s*throw new Error\(`AI bootstrap returned \$\{response\.status\}`\)/);
  assert.match(script, /bootstrapLoaders\.delete\(root\)/);
});

test('AI chat prepares compositor layers before opening the panel', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const initWidgetBody = script.slice(
    script.indexOf('function initWidget'),
    script.indexOf('widgets.forEach(initWidget)'),
  );

  assert.match(
    initWidgetBody,
    /const preparePanel = \(\) => \{\s*root\.classList\.add\('is-preparing'\);\s*\}/,
  );
  assert.match(initWidgetBody, /toggle\.addEventListener\('pointerenter', preparePanel/);
  assert.match(initWidgetBody, /toggle\.addEventListener\('focus', preparePanel/);
  assert.match(initWidgetBody, /toggle\.addEventListener\('pointerdown', preparePanel/);
  assert.match(
    initWidgetBody,
    /window\.requestAnimationFrame\(\(\) => \{\s*openFrame = window\.requestAnimationFrame\(\(\) => \{\s*openFrame = 0;\s*setExpanded\(root, true\)/,
  );
});

test('AI chat defers bootstrap, pending Markdown, and focus until panel opening completes', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const initWidgetBody = script.slice(
    script.indexOf('function initWidget'),
    script.indexOf('widgets.forEach(initWidget)'),
  );
  const finishPanelOpenBody = initWidgetBody.slice(
    initWidgetBody.indexOf('const finishPanelOpen'),
    initWidgetBody.indexOf("panel.addEventListener('transitionend'"),
  );
  const openPanelBody = initWidgetBody.slice(
    initWidgetBody.indexOf('const openPanel'),
    initWidgetBody.indexOf('resetLauncherDock()'),
  );

  assert.match(initWidgetBody, /event\.target !== panel \|\| event\.propertyName !== 'opacity'/);
  assert.match(finishPanelOpenBody, /root\.classList\.remove\('is-preparing'\)/);
  assert.match(finishPanelOpenBody, /ensureBootstrap\(root\)\.catch\(\(\) => \{\}\)/);
  assert.match(finishPanelOpenBody, /const pendingGreeting = root\.querySelector\('\[data-pending-markdown\]'\)/);
  assert.match(finishPanelOpenBody, /setMessageMarkdown\(pendingGreeting, greeting\)/);
  assert.match(finishPanelOpenBody, /input\.focus\(\{ preventScroll: true \}\)/);
  assert.doesNotMatch(openPanelBody, /ensureBootstrap\(root\)|setMessageMarkdown\(|input\.focus\(/);
  assert.doesNotMatch(initWidgetBody, /setTimeout\(\(\) => input\.focus\(\), 160\)/);
});

test('AI chat completes opening when transitionend is not dispatched', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const initWidgetBody = script.slice(
    script.indexOf('function initWidget'),
    script.indexOf('widgets.forEach(initWidget)'),
  );

  assert.match(initWidgetBody, /let openFallbackTimer = 0/);
  assert.match(
    initWidgetBody,
    /const finishPanelOpen = \(\) => \{[\s\S]*window\.clearTimeout\(openFallbackTimer\)[\s\S]*ensureBootstrap\(root\)\.catch\(\(\) => \{\}\)[\s\S]*input\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(
    initWidgetBody,
    /panel\.addEventListener\('transitionend',[\s\S]*finishPanelOpen\(\)/,
  );
  assert.match(
    initWidgetBody,
    /openFallbackTimer = window\.setTimeout\(finishPanelOpen, 320\)/,
  );
});

test('AI chat opening optimization preserves the existing visual effects', async () => {
  const css = await readProjectFile('../src/styles/global.css');

  assert.match(css, /--ai-glass:\s*blur\(24px\) saturate\(130%\);/);
  assert.match(css, /\.ai-chat__scrim\s*\{[^}]*backdrop-filter:\s*blur\(6px\);[^}]*\}/s);
  assert.match(css, /\.ai-chat__panel\s*\{[^}]*backdrop-filter:\s*var\(--ai-glass\);[^}]*box-shadow:\s*0 28px 80px rgba\(0, 0, 0, 0\.62\), inset 0 1px 0 rgba\(255, 255, 255, 0\.06\);[^}]*transition:\s*opacity 260ms ease, transform 260ms ease;[^}]*\}/s);
  assert.match(css, /\.ai-chat\.is-preparing \.ai-chat__scrim\s*\{[^}]*will-change:\s*opacity, backdrop-filter;[^}]*\}/s);
  assert.match(css, /\.ai-chat\.is-preparing \.ai-chat__panel\s*\{[^}]*will-change:\s*opacity, transform, backdrop-filter;[^}]*\}/s);
});

test('AI chat implementation does not hardcode localized chat copy', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.equal(component.includes('神椿是什么？'), false);
  assert.equal(component.includes('Need a quick Kamitsubaki primer?'), false);
  assert.equal(script.includes('观测回线暂时不稳定'), false);
  assert.equal(script.includes('观测频率过高'), false);
  assert.equal(script.includes('The observation line is offline'), false);
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
  assert.match(component, /data-ai-model-choice/);
  assert.match(component, /data-ai-thinking-mode/);
  assert.match(component, /data-ai-challenge-tray/);
  assert.match(component, /data-ai-challenge-mount/);
  assert.match(script, /toggle\.addEventListener\('click'/);
  assert.match(script, /close\.addEventListener\('click'/);
  assert.match(script, /scrim\?\.addEventListener\('click'/);
  assert.match(script, /setExpanded\(root, true\)/);
  assert.match(script, /setExpanded\(root, false\)/);
  assert.match(script, /document\.querySelector\('\[data-ai-launcher\]'\)/);
  assert.match(script, /classList\.toggle\('is-hidden'/);
  assert.match(script, /resetLauncherDock/);
  assert.equal(component.includes("dataset.launcherDragging==='true'"), false);
  assert.equal(component.includes('onclick='), false);
  assert.equal(component.includes('data-ai-custom-model'), false);
  assert.match(script, /parseAiStreamChunk/);
  assert.match(script, /text\/event-stream/);
  assert.match(script, /event\.type === 'thread'/);
  assert.match(script, /event\.type === 'source'/);
  assert.match(css, /\.ai-message__sources/);
  assert.match(css, /\.ai-message__sources-list/);
  assert.match(script, /dataset\.aiPrompt/);
  assert.match(script, /readModelSettings/);
  assert.match(script, /showChallengeTray/);
  assert.match(script, /hideChallengeTray/);
  assert.match(script, /theme: 'dark'/);
  assert.match(controls, /modelChoice/);
  assert.match(controls, /thinkingMode/);
  assert.match(script, /event\.key === 'Enter'/);
  assert.match(script, /event\.ctrlKey/);
  assert.match(script, /event\.metaKey/);
  assert.match(script, /event\.defaultPrevented/);
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
  assert.match(component, /viewBox="0 0 16 16"/);
  assert.match(component, /viewBox="0 0 48 48"/);
  assert.match(script, /legacyLauncherPositionKey/);
  assert.match(script, /localStorage\.removeItem\(legacyLauncherPositionKey\)/);
  assert.match(script, /style\.removeProperty\('left'\)/);
  assert.equal(script.includes('pointermove'), false);
  assert.equal(script.includes('pointerup'), false);
  assert.equal(script.includes('suppressClick'), false);
  assert.match(script, /api\/ai\/threads/);
  assert.match(script, /loadThreadList/);
  assert.match(script, /loadThreadDetail/);
  assert.match(script, /data\.recentThreads/);
  assert.match(script, /collectPageContext/);
  assert.match(script, /pageContext: collectPageContext\(root\)/);
  assert.match(script, /data-page-context-root/);
  assert.match(script, /!node\.closest\('\[data-ai-chat\]'\)/);
  assert.match(script, /clonedMain\.textContent \|\| ''/);
  assert.match(script, /copy\.thinkingPhrases/);
  assert.match(script, /\[copy\.bubbleThinking, copy\.status\]\.filter\(Boolean\)/);
  assert.equal(script.includes('setMessageMarkdown(assistantMessage.content, copy.challengeFallback || copy.thinking || \'\')'), false);
  assert.match(script, /action: 'ai_chat'/);
  assert.match(script, /root\.dataset\.viewerKind !== 'user'/);
  assert.match(script, /result\.needsChallenge && root\.dataset\.viewerKind === 'user'/);
  assert.match(script, /requestChat\(retryToken\)/);
  assert.match(script, /document\.createElement\('details'\)/);
  assert.match(script, /formatSourceKind/);
  assert.match(script, /ai-message__sources-count/);
  assert.match(script, /sanitizeRenderedHtml/);
  assert.match(script, /micromark/);
  assert.match(script, /katex/);
  assert.match(script, /createStreamingRenderer/);
  assert.match(script, /requestAnimationFrame/);
  assert.match(script, /textContent = pendingText/);
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

test('AI chat loads rich Markdown dependencies on demand', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const markdownDependencies = [
    'katex',
    'micromark',
    'micromark-extension-gfm',
    'micromark-extension-math',
  ];

  for (const dependency of markdownDependencies) {
    assert.equal(
      new RegExp(`^import\\s.+?from\\s+['\"]${dependency}['\"];?$`, 'm').test(script),
      false,
      `${dependency} must not be statically imported by the site-wide widget`,
    );
    assert.match(script, new RegExp(`import\\(['\"]${dependency}['\"]\\)`));
  }

  assert.match(script, /let markdownRendererLoader/);
  assert.match(script, /Promise\.all\(/);

  const bootstrapBody = script.slice(
    script.indexOf('async function bootstrap'),
    script.indexOf('function loadTurnstile'),
  );
  assert.match(
    bootstrapBody,
    /if \(root\.classList\.contains\('is-open'\)\) \{\s*setMessageMarkdown\(firstAssistantMessage, data\.greeting\)/,
  );
  assert.match(script, /firstAssistantMessage\.dataset\.pendingMarkdown = data\.greeting/);
  assert.match(script, /const pendingGreeting = root\.querySelector\('\[data-pending-markdown\]'\)/);
});

test('streaming uses one assistant bubble for thinking and the final answer', async () => {
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');

  assert.match(script, /const assistantMessage = createThinkingMessage\(copy\)/);
  assert.match(script, /messages\.append\(assistantMessage\.message\)/);
  assert.equal(script.includes('messages.append(thinkingMessage, assistantMessage.message)'), false);
});

test('AI chat widget exposes auth hooks and localized account copy', async () => {
  const component = await readProjectFile('../src/components/AiChatWidget.astro');
  const script = await readProjectFile('../src/scripts/aiChatWidget.js');
  const css = await readProjectFile('../src/styles/global.css');

  for (const locale of locales) {
    const content = JSON.parse(await readProjectFile(`../src/content/site/${locale}.json`));
    assert.equal(typeof content.aiChat.accountAnonymous, 'string');
    assert.equal(typeof content.aiChat.githubLoginLabel, 'string');
    assert.equal(typeof content.aiChat.googleLoginLabel, 'string');
    assert.equal(typeof content.aiChat.logoutLabel, 'string');
  }

  assert.match(component, /data-ai-auth/);
  assert.match(component, /data-ai-oauth="github"/);
  assert.match(component, /data-ai-oauth="google"/);
  assert.match(component, /data-ai-logout/);
  assert.match(script, /api\/auth\/oauth/);
  assert.match(script, /startOAuth/);
  assert.match(script, /action: 'oauth_login'/);
  assert.match(script, /method: 'POST'/);
  assert.match(script, /authorizationUrl/);
  assert.match(script, /JSON\.stringify\(\{ turnstileToken \}\)/);
  assert.match(script, /api\/auth\/logout/);
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
