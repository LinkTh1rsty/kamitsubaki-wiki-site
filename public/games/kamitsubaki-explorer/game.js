import {
  archiveKey,
  buildGraphQuestion,
  getSpriteDrawY,
  getTerrainTileGeometry,
  resolveGraphAnswer,
  selectGraphPath,
} from './game-core.mjs';

const params = new URLSearchParams(window.location.search);
const wikiLocale = ['zh', 'ja', 'en'].includes(params.get('locale')) ? params.get('locale') : 'zh';
const sourceKind = params.get('sourceKind');
const sourceId = params.get('sourceId');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarsePointer = window.matchMedia('(pointer: coarse)').matches;

const copy = {
  zh: {
    memory: '记忆采集',
    portal: '条目传送',
    areaMemory: 'ARCHIVE FIELD / MEMORY ROUTE',
    areaPortal: 'ARCHIVE FIELD / PORTAL ROUTE',
    readTerminal: '读取档案终端',
    enterPortal: '进入条目传送门',
    needFragments: '还需要收集记忆碎片',
    memoryFound: 'MEMORY FRAGMENT RECOVERED',
    gemFound: 'RESONANCE GEM',
    portalReady: 'PORTAL SYNCHRONIZED',
    checkpoint: 'CHECKPOINT UPDATED',
    quizTitle: '档案校验',
    quizPrompt: '这条记忆线索属于哪个 Wiki 档案？',
    quizComplete: '记忆路径已复原',
    quizCompleteLead: '档案终端已确认这些记忆。你可以继续探索，或返回对应的 Wiki 条目。',
    portalTitle: '条目传送门',
    portalLead: '传送门已经与 Wiki 条目同步。确认后将离开游戏地图并抵达档案页面。',
    openArchive: '打开 Wiki 档案',
    continue: '继续探索',
    wrong: '档案校验失败，再观察一次。',
    correct: '档案匹配完成。',
    fragmentLocked: '共鸣不足：继续收集宝石',
    fragmentInteract: '解读记忆碎片',
    sealLocked: '封印未满足解锁条件',
    sealBreak: '按 Shift / X 冲刺击破封印',
    dashReady: '共鸣冲刺已就绪',
    portalLocked: '传送门需要更多共鸣宝石',
    enemyHit: '观测体受损',
    objectiveGems: '收集共鸣宝石',
    objectiveFragment: '寻找记忆碎片并完成档案校验',
    objectiveTerminal: '前往最终档案终端',
    objectivePortals: '同步下一座条目传送门',
  },
  ja: {
    memory: '記憶採集', portal: '記事転送', areaMemory: 'ARCHIVE FIELD / MEMORY ROUTE', areaPortal: 'ARCHIVE FIELD / PORTAL ROUTE',
    readTerminal: 'アーカイブ端末を読む', enterPortal: '記事ポータルへ入る', needFragments: '記憶の欠片を集めよう',
    memoryFound: 'MEMORY FRAGMENT RECOVERED', gemFound: 'RESONANCE GEM', portalReady: 'PORTAL SYNCHRONIZED', checkpoint: 'CHECKPOINT UPDATED',
    quizTitle: 'アーカイブ照合', quizPrompt: 'この記憶はどの Wiki 記事に属する？', quizComplete: '記憶経路を復元しました',
    quizCompleteLead: '端末が記憶を確認しました。探索を続けるか、関連記事へ移動できます。', portalTitle: '記事ポータル',
    portalLead: 'ポータルは Wiki 記事と同期しました。確認すると記事ページへ移動します。', openArchive: 'Wiki 記事を開く', continue: '探索を続ける',
    wrong: '照合に失敗しました。もう一度観測してください。', correct: 'アーカイブが一致しました。',
    fragmentLocked: '共鳴が不足しています', fragmentInteract: '記憶の欠片を解析', sealLocked: '封印条件を満たしていません', sealBreak: 'Shift / X で封印を破壊', dashReady: '共鳴ダッシュ準備完了', portalLocked: '共鳴ジェムが必要です', enemyHit: '観測体が損傷しました', objectiveGems: '共鳴ジェムを集める', objectiveFragment: '記憶の欠片を照合する', objectiveTerminal: '最終端末へ向かう', objectivePortals: '次のポータルを同期する',
  },
  en: {
    memory: 'Memory Hunt', portal: 'Entry Portals', areaMemory: 'ARCHIVE FIELD / MEMORY ROUTE', areaPortal: 'ARCHIVE FIELD / PORTAL ROUTE',
    readTerminal: 'Access archive terminal', enterPortal: 'Enter entry portal', needFragments: 'Recover more memory fragments',
    memoryFound: 'MEMORY FRAGMENT RECOVERED', gemFound: 'RESONANCE GEM', portalReady: 'PORTAL SYNCHRONIZED', checkpoint: 'CHECKPOINT UPDATED',
    quizTitle: 'Archive Verification', quizPrompt: 'Which Wiki archive owns this memory clue?', quizComplete: 'Memory route restored',
    quizCompleteLead: 'The terminal verified these memories. Continue exploring or return to their Wiki entries.', portalTitle: 'Entry Portal',
    portalLead: 'The portal is synchronized with a Wiki entry. Confirm to leave the map and open the archive.', openArchive: 'Open Wiki archive', continue: 'Keep exploring',
    wrong: 'Verification failed. Observe the clue again.', correct: 'Archive match confirmed.',
    fragmentLocked: 'Not enough resonance gems', fragmentInteract: 'Decode memory fragment', sealLocked: 'Seal condition not met', sealBreak: 'Dash with Shift / X to break the seal', dashReady: 'Resonance dash ready', portalLocked: 'More resonance gems required', enemyHit: 'Observer damaged', objectiveGems: 'Collect resonance gems', objectiveFragment: 'Find and verify a memory fragment', objectiveTerminal: 'Reach the final archive terminal', objectivePortals: 'Synchronize the next entry portal',
  },
}[wikiLocale];

document.documentElement.lang = wikiLocale === 'zh' ? 'zh-CN' : wikiLocale;

const shell = document.querySelector('#gameShell');
const canvas = document.querySelector('#gameCanvas');
const context = canvas.getContext('2d');
const loadingScreen = document.querySelector('#loadingScreen');
const modeMenu = document.querySelector('#modeMenu');
const hud = document.querySelector('#hud');
const modeTitle = document.querySelector('#modeTitle');
const areaName = document.querySelector('#areaName');
const gemCount = document.querySelector('#gemCount');
const fragmentCount = document.querySelector('#fragmentCount');
const healthCount = document.querySelector('#healthCount');
const openMenuButton = document.querySelector('#openMenuButton');
const runnerLayer = document.querySelector('#runnerLayer');
const runnerFrame = document.querySelector('#runnerFrame');
const runnerBackButton = document.querySelector('#runnerBackButton');
const interactionPrompt = document.querySelector('#interactionPrompt');
const interactionText = document.querySelector('#interactionText');
const toast = document.querySelector('#toast');
const toastKind = document.querySelector('#toastKind');
const toastTitle = document.querySelector('#toastTitle');
const toastFact = document.querySelector('#toastFact');
const archiveDialog = document.querySelector('#archiveDialog');
const dialogCloseButton = document.querySelector('#dialogCloseButton');
const dialogIndex = document.querySelector('#dialogIndex');
const dialogTitle = document.querySelector('#dialogTitle');
const dialogLead = document.querySelector('#dialogLead');
const dialogAnswers = document.querySelector('#dialogAnswers');
const dialogLinks = document.querySelector('#dialogLinks');
const touchControls = document.querySelector('#touchControls');
const screenFlash = document.querySelector('#screenFlash');
const questTracker = document.querySelector('#questTracker');
const questTitle = document.querySelector('#questTitle');
const questDetail = document.querySelector('#questDetail');
const questProgress = document.querySelector('#questProgress');

const ASSET_ROOT = './assets/';
const assetFiles = {
  player: 'player-sprites-v2.png',
  tiles: 'environment-tiles-v2.png',
  collectibles: 'archive-collectibles-v2.png',
  portals: 'archive-portals-v2.png',
  hazards: 'archive-hazards-v2.png',
  effects: 'effects-and-markers-v2.png',
  props: 'environment-props-v2.png',
  far: 'background-far-v2.png',
  mid: 'background-mid-v2.png',
  foreground: 'background-foreground-v2.png',
};
const assets = {};

const VIEW_HEIGHT = 720;
const WORLD_WIDTH = 5200;
const GROUND_Y = 606;
let viewWidth = 1280;
let drawScale = 1;
let pixelRatio = 1;
let animationFrame = 0;
let lastTime = performance.now();
let toastTimer = 0;
let catalog = [];
let memoryItems = [];
let memoryPath = [];
let graphQuestions = [];
let portalItems = [];

const game = {
  screen: 'loading',
  mode: 'memory',
  playing: false,
  dialogOpen: false,
  cameraX: 0,
  cameraTarget: 0,
  shake: 0,
  gems: 0,
  fragments: 0,
  portalsVisited: new Set(),
  nearby: null,
  quizIndex: 0,
  quizCorrect: 0,
  elapsed: 0,
  health: 3,
  maxHealth: 3,
  defeated: 0,
  barriersBroken: new Set(),
  objectivePulse: 0,
  pendingFragment: null,
  lastBlockedAt: 0,
};

const input = { left: false, right: false, jump: false, jumpBuffer: 0 };
const player = {
  x: 170,
  y: GROUND_Y - 82,
  width: 62,
  height: 82,
  vx: 0,
  vy: 0,
  facing: 1,
  onGround: true,
  coyote: 0,
  checkpointX: 170,
  hitCooldown: 0,
  dashTime: 0,
  dashCooldown: 0,
};

const platforms = [
  { x: 430, y: 510, width: 300, height: 34 },
  { x: 860, y: 444, width: 250, height: 34 },
  { x: 1210, y: 500, width: 330, height: 34 },
  { x: 1690, y: 430, width: 270, height: 34 },
  { x: 2080, y: 505, width: 340, height: 34 },
  { x: 2540, y: 450, width: 230, height: 34 },
  { x: 2880, y: 375, width: 240, height: 34 },
  { x: 3270, y: 490, width: 330, height: 34 },
  { x: 3730, y: 420, width: 280, height: 34 },
  { x: 4180, y: 500, width: 260, height: 34 },
];

const gemLayout = [
  [244, 548], [500, 455], [640, 455], [930, 390], [1300, 445], [1780, 375],
  [2180, 450], [2640, 395], [2960, 320], [3390, 435], [3820, 365], [4270, 445],
];
const fragmentLayout = [[600, 438], [3000, 303], [3890, 348]];
const hazardLayout = [
  { x: 1545, y: GROUND_Y - 50, width: 92, height: 50, col: 1 },
  { x: 2428, y: GROUND_Y - 72, width: 90, height: 72, col: 3 },
  { x: 3615, y: GROUND_Y - 62, width: 86, height: 62, col: 2 },
];
const portalLayout = [
  { kind: 'artist', x: 950, row: 0, requiredGems: 2 },
  { kind: 'song', x: 2050, row: 1, requiredGems: 5 },
  { kind: 'album', x: 3300, row: 2, requiredGems: 8 },
  { kind: 'project', x: 4430, row: 3, requiredGems: 11 },
];
const barrierLayout = [
  { id: 'seal-a', x: 1148, y: GROUND_Y - 142, width: 72, height: 142, memoryRequirement: 1, portalRequirement: 3 },
  { id: 'seal-b', x: 3165, y: GROUND_Y - 142, width: 72, height: 142, memoryRequirement: 2, portalRequirement: 6 },
  { id: 'seal-c', x: 4045, y: GROUND_Y - 142, width: 72, height: 142, memoryRequirement: 3, portalRequirement: 9 },
];
const enemyLayout = [
  { x: 1450, y: GROUND_Y - 58, minX: 1350, maxX: 1510, speed: 58, row: 1 },
  { x: 2300, y: GROUND_Y - 62, minX: 2180, maxX: 2380, speed: 72, row: 2 },
  { x: 3480, y: GROUND_Y - 58, minX: 3330, maxX: 3550, speed: 66, row: 1 },
  { x: 4510, y: GROUND_Y - 62, minX: 4410, maxX: 4630, speed: 82, row: 2 },
];
const propLayout = [
  { x: 260, y: GROUND_Y - 106, col: 0, row: 0, width: 80, height: 104 },
  { x: 760, y: GROUND_Y - 188, col: 1, row: 1, width: 100, height: 188 },
  { x: 1120, y: GROUND_Y - 128, col: 0, row: 2, width: 112, height: 128 },
  { x: 1970, y: GROUND_Y - 155, col: 3, row: 1, width: 130, height: 155 },
  { x: 2780, y: GROUND_Y - 118, col: 2, row: 2, width: 118, height: 118 },
  { x: 3160, y: GROUND_Y - 145, col: 1, row: 2, width: 90, height: 145 },
  { x: 4050, y: GROUND_Y - 126, col: 2, row: 3, width: 150, height: 126 },
  { x: 4800, y: GROUND_Y - 132, col: 3, row: 3, width: 148, height: 132 },
];

let gems = [];
let fragments = [];
let effects = [];
let enemies = [];

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = `${ASSET_ROOT}${file}`;
  });
}

async function loadGame() {
  const imageEntries = await Promise.all(Object.entries(assetFiles).map(async ([key, file]) => [key, await loadImage(file)]));
  imageEntries.forEach(([key, image]) => { assets[key] = image; });
  try {
    const response = await fetch(`/${wikiLocale}/game-index.json`);
    if (!response.ok) throw new Error(`catalog ${response.status}`);
    const data = await response.json();
    catalog = Array.isArray(data.items) ? data.items : [];
  } catch (error) {
    console.warn('Wiki archive index unavailable; using local demo records.', error);
    catalog = fallbackCatalog();
  }
  if (!catalog.length) catalog = fallbackCatalog();
  selectArchiveItems();
  resize();
  loadingScreen.hidden = true;
  showMenu();
  lastTime = performance.now();
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(frame);
}

function fallbackCatalog() {
  return [
    { kind: 'artist', id: 'vwp/kaf', title: '花譜', subtitle: 'KAF', href: `/${wikiLocale}/artists/vwp/kaf`, relatedKey: 'kaf', facts: ['档案类型 / 艺人', '观测代号 / 01'], connections: ['song:kaf/answer'], accentColor: '#12d8d0' },
    { kind: 'song', id: 'kaf/answer', title: 'アンサー', subtitle: '花譜', href: `/${wikiLocale}/songs/kaf/answer`, relatedKey: 'kaf', facts: ['档案类型 / 歌曲', '演唱 / 花譜', '收录 / 観測'], connections: ['artist:vwp/kaf', 'album:kaf/kansoku'], accentColor: '#12d8d0' },
    { kind: 'album', id: 'kaf/kansoku', title: '観測', subtitle: '花譜', href: `/${wikiLocale}/albums/kaf/kansoku`, relatedKey: 'kaf', facts: ['档案类型 / 专辑', '演唱 / 花譜', '曲目数 / 15'], connections: ['song:kaf/answer', 'project:vwp'], accentColor: '#10a77f' },
    { kind: 'project', id: 'vwp', title: 'V.W.P', subtitle: 'Project', href: `/${wikiLocale}/projects/vwp`, relatedKey: 'vwp', facts: ['档案类型 / 企划', '分类 / KAMITSUBAKI'], connections: ['album:kaf/kansoku'], accentColor: '#10a77f' },
    { kind: 'song', id: 'rim/flower', title: '食虫植物', subtitle: '理芽', href: `/${wikiLocale}/songs/rim/flower`, relatedKey: 'rim', facts: ['档案类型 / 歌曲', '演唱 / 理芽'], connections: [], accentColor: '#6fb9ff' },
    { kind: 'song', id: 'vwp/magical', title: '魔的', subtitle: 'V.W.P', href: `/${wikiLocale}/songs/vwp/magical`, relatedKey: 'vwp', facts: ['档案类型 / 歌曲', '演唱 / V.W.P'], connections: [], accentColor: '#c5a4ff' },
    { kind: 'album', id: 'rim/new-romancer', title: 'NEW ROMANCER', subtitle: '理芽', href: `/${wikiLocale}/albums/rim/new-romancer`, relatedKey: 'rim', facts: ['档案类型 / 专辑', '演唱 / 理芽'], connections: [], accentColor: '#6fb9ff' },
    { kind: 'album', id: 'kaf/majo', title: '魔女', subtitle: '花譜', href: `/${wikiLocale}/albums/kaf/majo`, relatedKey: 'kaf', facts: ['档案类型 / 专辑', '演唱 / 花譜'], connections: [], accentColor: '#f29ac2' },
    { kind: 'project', id: 'kamitsubaki-city', title: '神椿市建设中。', subtitle: 'PROJECT_ARG', href: `/${wikiLocale}/projects/kamitsubaki-city`, relatedKey: 'arg', facts: ['档案类型 / 企划', '分类 / PROJECT_ARG'], connections: [], accentColor: '#12d8d0' },
    { kind: 'project', id: 'musical-isotope', title: '音楽的同位体', subtitle: 'PROJECT', href: `/${wikiLocale}/projects/musical-isotope`, relatedKey: 'isotope', facts: ['档案类型 / 企划', '分类 / PROJECT'], connections: [], accentColor: '#10a77f' },
  ];
}

function selectArchiveItems() {
  const source = catalog.find((item) => item.kind === sourceKind && (item.id === sourceId || item.id.endsWith(`/${sourceId}`)));
  const candidates = [...catalog].sort((a, b) => a.kind.localeCompare(b.kind) || a.title.localeCompare(b.title));
  const anchors = [source, ...candidates.filter((item) => item.connections?.length)].filter(Boolean);
  memoryPath = [];
  for (const anchor of anchors) {
    const candidatePath = selectGraphPath(anchor, catalog, 3);
    if (candidatePath.length > memoryPath.length) memoryPath = candidatePath;
    if (candidatePath.length === 4) break;
  }
  if (memoryPath.length < 4) {
    const fallback = fallbackCatalog();
    memoryPath = selectGraphPath(fallback[0], fallback, 3);
  }
  memoryItems = memoryPath.slice(1, 4);
  const questionCatalog = memoryPath.every((item) => catalog.some((entry) => archiveKey(entry) === archiveKey(item))) ? catalog : fallbackCatalog();
  graphQuestions = memoryItems.map((item, index) => buildGraphQuestion(memoryPath, index, questionCatalog));
  portalItems = portalLayout.map(({ kind }, index) => {
    if (source?.kind === kind) return source;
    const matches = catalog.filter((item) => item.kind === kind);
    return matches[(index * 7) % Math.max(1, matches.length)] || catalog[index % catalog.length];
  });
}

function resize() {
  const rect = shell.getBoundingClientRect();
  pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  drawScale = Math.max(0.45, rect.height / VIEW_HEIGHT);
  viewWidth = rect.width / drawScale;
  canvas.width = Math.max(1, Math.round(rect.width * pixelRatio));
  canvas.height = Math.max(1, Math.round(rect.height * pixelRatio));
  context.imageSmoothingEnabled = false;
}

function resetWorld(mode) {
  game.mode = mode;
  game.playing = true;
  game.dialogOpen = false;
  game.cameraX = 0;
  game.cameraTarget = 0;
  game.gems = 0;
  game.fragments = 0;
  game.portalsVisited = new Set();
  game.nearby = null;
  game.quizIndex = 0;
  game.quizCorrect = 0;
  game.elapsed = 0;
  game.health = game.maxHealth;
  game.defeated = 0;
  game.barriersBroken = new Set();
  game.pendingFragment = null;
  game.lastBlockedAt = 0;
  gems = gemLayout.map(([x, y], index) => ({ x, y, index, collected: false }));
  fragments = fragmentLayout.map(([x, y], index) => ({ x, y, index, item: memoryItems[index], collected: false }));
  enemies = enemyLayout.map((enemy, index) => ({ ...enemy, index, direction: index % 2 ? -1 : 1, defeated: false }));
  effects = [];
  Object.assign(player, {
    x: 170, y: GROUND_Y - player.height, vx: 0, vy: 0, facing: 1, onGround: true,
    coyote: 0, checkpointX: 170, hitCooldown: 0, dashTime: 0, dashCooldown: 0,
  });
  updateHud();
  updateObjective();
  showToast(copy.dashReady, 'SHIFT / X', game.mode === 'memory' ? '收集宝石，校验碎片，冲刺击破区域封印。' : '收集宝石，同步传送门，冲刺穿越封印。', 3200);
}

function showMenu() {
  game.screen = 'menu';
  game.playing = false;
  shell.dataset.screen = 'menu';
  modeMenu.hidden = false;
  hud.hidden = true;
  touchControls.hidden = true;
  interactionPrompt.hidden = true;
  questTracker.hidden = true;
  runnerLayer.hidden = true;
  if (archiveDialog.open) archiveDialog.close();
}

function startMode(mode) {
  if (mode === 'runner') {
    game.screen = 'runner';
    game.playing = false;
    modeMenu.hidden = true;
    hud.hidden = true;
    touchControls.hidden = true;
    runnerLayer.hidden = false;
    const runnerParams = new URLSearchParams({ locale: wikiLocale });
    if (sourceKind) runnerParams.set('sourceKind', sourceKind);
    if (sourceId) runnerParams.set('sourceId', sourceId);
    runnerFrame.src = `/games/memory-corridor/index.html?${runnerParams.toString()}`;
    return;
  }
  runnerLayer.hidden = true;
  modeMenu.hidden = true;
  hud.hidden = false;
  touchControls.hidden = !coarsePointer;
  questTracker.hidden = false;
  game.screen = 'game';
  shell.dataset.screen = 'game';
  shell.dataset.mode = mode;
  resetWorld(mode);
}

function updateHud() {
  modeTitle.textContent = game.mode === 'portal' ? copy.portal : copy.memory;
  areaName.textContent = game.mode === 'portal' ? copy.areaPortal : copy.areaMemory;
  gemCount.textContent = String(game.gems).padStart(2, '0');
  fragmentCount.textContent = game.mode === 'portal' ? `${game.portalsVisited.size}/4` : `${game.fragments}/3`;
  healthCount.textContent = String(game.health);
  updateObjective();
}

function updateObjective() {
  if (!questTracker || game.screen !== 'game') return;
  let title = '';
  let detail = '';
  let progress = 0;
  if (game.mode === 'memory') {
    const nextFragment = fragments.find((fragment) => !fragment.collected);
    if (nextFragment) {
      const requirement = fragmentRequirement(nextFragment.index);
      if (game.gems < requirement) {
        title = copy.objectiveGems;
        detail = `${game.gems}/${requirement} · 下一枚碎片需要足够的共鸣强度`;
        progress = game.gems / requirement;
      } else {
        title = copy.objectiveFragment;
        detail = `第 ${nextFragment.index + 1} 枚碎片已可解读 · 靠近后按 E`;
        progress = game.fragments / 3;
      }
    } else {
      title = copy.objectiveTerminal;
      detail = '记忆路径已完整 · 终端位于地图最右侧';
      progress = 1;
    }
  } else {
    const nextPortalIndex = portalLayout.findIndex((portal) => !game.portalsVisited.has(portal.kind));
    if (nextPortalIndex < 0) {
      title = '全部传送门已同步';
      detail = '四类 Wiki 档案路径已经记录。';
      progress = 1;
    } else {
      const portal = portalLayout[nextPortalIndex];
      if (game.gems < portal.requiredGems) {
        title = copy.objectiveGems;
        detail = `${game.gems}/${portal.requiredGems} · 为下一座传送门积蓄共鸣`;
        progress = game.gems / portal.requiredGems;
      } else {
        title = copy.objectivePortals;
        detail = `${portal.kind.toUpperCase()} · 靠近传送门后按 E`;
        progress = game.portalsVisited.size / 4;
      }
    }
  }
  questTitle.textContent = title;
  questDetail.textContent = detail;
  questProgress.style.width = `${Math.max(0, Math.min(1, progress)) * 100}%`;
}

function drawSheet(image, columns, rows, column, row, x, y, width, height, alpha = 1) {
  if (!image?.complete || !image.naturalWidth) return;
  const sourceWidth = image.naturalWidth / columns;
  const sourceHeight = image.naturalHeight / rows;
  context.save();
  context.globalAlpha *= alpha;
  context.drawImage(image, column * sourceWidth, row * sourceHeight, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

function drawRegion(image, source, x, y, width, height, alpha = 1) {
  if (!image?.complete || !image.naturalWidth) return;
  context.save();
  context.globalAlpha *= alpha;
  context.drawImage(image, source.x, source.y, source.width, source.height, x, y, width, height);
  context.restore();
}

function drawCover(image, x, y, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const boxRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (imageRatio > boxRatio) {
    sourceWidth = image.naturalHeight * boxRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / boxRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawParallax(image, factor, alpha = 1) {
  const width = VIEW_HEIGHT * (image.naturalWidth / image.naturalHeight);
  const offset = -positiveModulo(game.cameraX * factor, width);
  context.save();
  context.globalAlpha = alpha;
  for (let x = offset - width; x < viewWidth + width; x += width) context.drawImage(image, x, 0, width, VIEW_HEIGHT);
  context.restore();
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function drawBackground() {
  context.fillStyle = '#020908';
  context.fillRect(0, 0, viewWidth, VIEW_HEIGHT);
  drawCover(assets.far, 0, 0, viewWidth, VIEW_HEIGHT);
  drawParallax(assets.mid, 0.22, 0.82);
}

function drawGround(cameraX) {
  const tileWidth = 158;
  const start = Math.floor(cameraX / tileWidth) * tileWidth - tileWidth;
  const tile = getTerrainTileGeometry('ground', GROUND_Y, tileWidth);
  for (let x = start; x < cameraX + viewWidth + tileWidth; x += tileWidth) {
    drawRegion(assets.tiles, tile.source, x - cameraX, tile.drawY, tile.drawWidth, tile.drawHeight);
  }
  context.fillStyle = '#032118';
  context.fillRect(0, GROUND_Y + 96, viewWidth, VIEW_HEIGHT - GROUND_Y - 96);
}

function drawPlatforms(cameraX) {
  platforms.forEach((platform) => {
    if (!isVisible(platform.x, platform.width, cameraX)) return;
    const segments = Math.ceil(platform.width / 112);
    for (let index = 0; index < segments; index += 1) {
      const width = Math.min(112, platform.width - index * 112);
      const tile = getTerrainTileGeometry('platform', platform.y, width);
      drawRegion(assets.tiles, tile.source, platform.x + index * 112 - cameraX, tile.drawY, tile.drawWidth, tile.drawHeight);
    }
  });
}

function drawProps(cameraX) {
  propLayout.forEach((prop) => {
    if (!isVisible(prop.x, prop.width, cameraX)) return;
    drawSheet(assets.props, 4, 4, prop.col, prop.row, prop.x - cameraX, prop.y, prop.width, prop.height, 0.9);
  });
}

function drawCheckpoint(cameraX) {
  const x = 2660;
  if (!isVisible(x, 100, cameraX)) return;
  const active = player.checkpointX > 2000;
  const column = active ? 2 : 0;
  drawSheet(assets.collectibles, 4, 4, column, 3, x - cameraX, GROUND_Y - 116, 90, 112);
}

function drawHazards(cameraX) {
  hazardLayout.forEach((hazard) => {
    if (!isVisible(hazard.x, hazard.width, cameraX)) return;
    drawSheet(assets.hazards, 4, 4, hazard.col, 3, hazard.x - cameraX, hazard.y, hazard.width, hazard.height);
  });
}

function drawBarriers(cameraX, time) {
  barrierLayout.forEach((barrier, index) => {
    if (game.barriersBroken.has(barrier.id) || !isVisible(barrier.x, barrier.width, cameraX)) return;
    const pulse = 0.9 + Math.sin(time * 0.006 + index) * 0.08;
    drawSheet(assets.hazards, 4, 4, 2, 3, barrier.x - cameraX - 10, barrier.y - 6, barrier.width + 20, barrier.height + 12, pulse);
    drawSheet(assets.effects, 4, 4, Math.floor(time / 160 + index) % 4, 3, barrier.x - cameraX + 8, barrier.y - 48, 56, 56, 0.88);
  });
}

function drawEnemies(cameraX, time) {
  enemies.forEach((enemy) => {
    if (enemy.defeated || !isVisible(enemy.x, 72, cameraX)) return;
    const column = Math.floor(time / 190 + enemy.index) % 2;
    const bob = Math.sin(time * 0.005 + enemy.index) * 3;
    drawSheet(assets.hazards, 4, 4, column, enemy.row, enemy.x - cameraX - 34, enemy.y - 20 + bob, 76, 76);
  });
}

function drawCollectibles(cameraX, time) {
  gems.forEach((gem) => {
    if (gem.collected || !isVisible(gem.x, 58, cameraX)) return;
    const column = Math.floor((time / 170 + gem.index) % 4);
    const bob = Math.sin(time * 0.004 + gem.index) * 5;
    drawSheet(assets.collectibles, 4, 4, column, 0, gem.x - cameraX - 28, gem.y - 28 + bob, 56, 56);
  });
  if (game.mode !== 'memory') return;
  fragments.forEach((fragment) => {
    if (fragment.collected || !isVisible(fragment.x, 76, cameraX)) return;
    const column = Math.floor((time / 240 + fragment.index) % 3);
    const bob = Math.sin(time * 0.003 + fragment.index * 1.8) * 7;
    const requirement = fragmentRequirement(fragment.index);
    const ready = game.gems >= requirement;
    drawSheet(assets.collectibles, 4, 4, column, 1, fragment.x - cameraX - 38, fragment.y - 34 + bob, 76, 68, ready ? 1 : 0.42);
    if (!ready) drawSheet(assets.effects, 4, 4, 0, 3, fragment.x - cameraX - 30, fragment.y - 31, 60, 60, 0.62);
  });
  const terminalX = 4680;
  const terminalColumn = game.fragments >= 3 ? 2 : 1;
  drawSheet(assets.collectibles, 4, 4, terminalColumn, 2, terminalX - cameraX - 76, GROUND_Y - 142, 152, 140);
}

function drawPortals(cameraX, time) {
  if (game.mode !== 'portal') return;
  portalLayout.forEach((portal, index) => {
    if (!isVisible(portal.x, 160, cameraX)) return;
    const distance = Math.abs(player.x + player.width / 2 - portal.x);
    const visited = game.portalsVisited.has(portal.kind);
    let column = 0;
    if (distance < 220) column = 1;
    if (distance < 125 || visited) column = 2;
    const bob = visited ? Math.sin(time * 0.004 + index) * 2 : 0;
    drawSheet(assets.portals, 4, 4, column, portal.row, portal.x - cameraX - 82, GROUND_Y - 190 + bob, 164, 188);
    drawSheet(assets.effects, 4, 4, index, 3, portal.x - cameraX - 24, GROUND_Y - 234, 48, 48, 0.9);
  });
}

function drawEffects(cameraX, time) {
  effects = effects.filter((effect) => time - effect.start < effect.duration);
  effects.forEach((effect) => {
    const progress = Math.min(0.999, (time - effect.start) / effect.duration);
    const column = Math.floor(progress * 4);
    const size = effect.size * (0.85 + progress * 0.35);
    drawSheet(assets.effects, 4, 4, column, effect.row, effect.x - cameraX - size / 2, effect.y - size / 2, size, size, 1 - progress * 0.4);
  });
}

function drawPlayer(cameraX, time) {
  let frameIndex = 0;
  if (!player.onGround) frameIndex = player.vy < -80 ? 6 : 8;
  else if (Math.abs(player.vx) > 250) frameIndex = Math.floor(time / 110) % 2 ? 4 : 5;
  else if (Math.abs(player.vx) > 15) frameIndex = Math.floor(time / 150) % 2 ? 2 : 3;
  else frameIndex = Math.floor(time / 620) % 2;
  if (player.hitCooldown > 0.58) frameIndex = 10;
  const column = frameIndex % 4;
  const row = Math.floor(frameIndex / 4);
  const drawWidth = 104;
  const drawHeight = 104;
  const x = player.x - cameraX + player.width / 2;
  const y = getSpriteDrawY(player.y + player.height, frameIndex, drawHeight);
  const drawFrame = (drawX, alpha = 1) => {
    context.save();
    context.globalAlpha = alpha;
    if (player.facing < 0) {
      context.translate(drawX, 0);
      context.scale(-1, 1);
      drawSheet(assets.player, 4, 3, column, row, -drawWidth / 2, y, drawWidth, drawHeight);
    } else {
      drawSheet(assets.player, 4, 3, column, row, drawX - drawWidth / 2, y, drawWidth, drawHeight);
    }
    context.restore();
  };
  if (player.dashTime > 0 && !reducedMotion) {
    drawFrame(x - player.facing * 44, 0.16);
    drawFrame(x - player.facing * 24, 0.32);
  }
  drawFrame(x);
}

function draw(time) {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(pixelRatio * drawScale, 0, 0, pixelRatio * drawScale, 0, 0);
  context.imageSmoothingEnabled = false;
  drawBackground();
  const shakeX = game.shake > 0 && !reducedMotion ? Math.sin(time * 0.08) * game.shake * 8 : 0;
  const cameraX = Math.max(0, Math.min(WORLD_WIDTH - viewWidth, game.cameraX + shakeX));
  drawProps(cameraX);
  drawGround(cameraX);
  drawPlatforms(cameraX);
  drawCheckpoint(cameraX);
  drawHazards(cameraX);
  drawBarriers(cameraX, time);
  drawEnemies(cameraX, time);
  drawCollectibles(cameraX, time);
  drawPortals(cameraX, time);
  drawEffects(cameraX, time);
  drawPlayer(cameraX, time);
  drawParallax(assets.foreground, 0.64, 0.78);
}

function isVisible(x, width, cameraX) {
  return x + width > cameraX - 180 && x < cameraX + viewWidth + 180;
}

function tryJump() {
  if (!game.playing || game.dialogOpen) return;
  if (player.onGround || player.coyote > 0) {
    player.vy = -650;
    player.onGround = false;
    player.coyote = 0;
    effects.push({ x: player.x + player.width / 2, y: player.y + player.height, row: 0, start: performance.now(), duration: 480, size: 86 });
  } else {
    input.jumpBuffer = 0.12;
  }
}

function startDash() {
  if (!game.playing || game.dialogOpen || player.dashCooldown > 0) return;
  player.dashTime = 0.16;
  player.dashCooldown = 0.52;
  player.vx = player.facing * 820;
  player.vy = 0;
  game.shake = 0.18;
  effects.push({ x: player.x + player.width / 2, y: player.y + player.height / 2, row: 3, start: performance.now(), duration: 360, size: 96 });
}

function update(dt, time) {
  if (!game.playing || game.dialogOpen) return;
  game.elapsed += dt;
  player.hitCooldown = Math.max(0, player.hitCooldown - dt);
  player.dashCooldown = Math.max(0, player.dashCooldown - dt);
  player.dashTime = Math.max(0, player.dashTime - dt);
  input.jumpBuffer = Math.max(0, input.jumpBuffer - dt);
  game.shake = Math.max(0, game.shake - dt * 4);

  const direction = Number(input.right) - Number(input.left);
  if (player.dashTime > 0) {
    player.vx = player.facing * 820;
    player.vy = 0;
  } else {
    const acceleration = player.onGround ? 1700 : 980;
    if (direction) {
      player.vx += direction * acceleration * dt;
      player.facing = direction;
    } else {
      const drag = player.onGround ? 10.5 : 2.2;
      player.vx *= Math.max(0, 1 - drag * dt);
    }
    player.vx = Math.max(-390, Math.min(390, player.vx));
  }

  const previousBottom = player.y + player.height;
  const previousX = player.x;
  player.x += player.vx * dt;
  player.x = Math.max(20, Math.min(WORLD_WIDTH - player.width - 20, player.x));
  resolveBarrierCollisions(previousX, time);
  if (player.dashTime <= 0) player.vy += 1780 * dt;
  player.y += player.vy * dt;
  player.onGround = false;

  let landingY = GROUND_Y;
  for (const platform of platforms) {
    const overlapsX = player.x + player.width * 0.82 > platform.x && player.x + player.width * 0.18 < platform.x + platform.width;
    const crossesTop = previousBottom <= platform.y + 7 && player.y + player.height >= platform.y;
    if (overlapsX && crossesTop && player.vy >= 0 && platform.y < landingY) landingY = platform.y;
  }
  if (player.y + player.height >= landingY && previousBottom <= landingY + Math.max(18, player.vy * dt + 8)) {
    const landedFast = player.vy > 420;
    player.y = landingY - player.height;
    player.vy = 0;
    player.onGround = true;
    player.coyote = 0.1;
    if (input.jumpBuffer > 0) {
      input.jumpBuffer = 0;
      tryJump();
    }
    if (landedFast) effects.push({ x: player.x + player.width / 2, y: landingY, row: 0, start: time, duration: 420, size: 92 });
  } else {
    player.coyote = Math.max(0, player.coyote - dt);
  }

  if (player.y > VIEW_HEIGHT + 100) hitPlayer();
  updateEnemies(dt, time);
  checkHazards();
  checkCollectibles(time);
  updateCheckpoint();
  updateNearby();

  game.cameraTarget = player.x - viewWidth * 0.38;
  game.cameraTarget = Math.max(0, Math.min(WORLD_WIDTH - viewWidth, game.cameraTarget));
  const cameraEase = 1 - Math.pow(0.0008, dt);
  game.cameraX += (game.cameraTarget - game.cameraX) * cameraEase;
}

function barrierRequirement(barrier) {
  return game.mode === 'memory' ? barrier.memoryRequirement : barrier.portalRequirement;
}

function barrierProgress() {
  return game.mode === 'memory' ? game.fragments : game.gems;
}

function resolveBarrierCollisions(previousX, time) {
  const playerBox = { x: player.x + 8, y: player.y + 8, width: player.width - 16, height: player.height - 8 };
  for (const barrier of barrierLayout) {
    if (game.barriersBroken.has(barrier.id) || !intersects(playerBox, barrier)) continue;
    const ready = barrierProgress() >= barrierRequirement(barrier);
    if (player.dashTime > 0 && ready) {
      game.barriersBroken.add(barrier.id);
      effects.push({ x: barrier.x + barrier.width / 2, y: barrier.y + barrier.height / 2, row: 2, start: time, duration: 760, size: 164 });
      game.shake = 0.72;
      showToast('ARCHIVE SEAL BROKEN', `${barrierRequirement(barrier)}/${barrierRequirement(barrier)}`, '新的档案区域已经开放。', 1900);
      updateObjective();
      continue;
    }
    player.x = previousX;
    player.vx = 0;
    if (time - game.lastBlockedAt > 1300) {
      game.lastBlockedAt = time;
      showToast(ready ? copy.sealBreak : copy.sealLocked, `${barrierProgress()}/${barrierRequirement(barrier)}`, ready ? copy.dashReady : (game.mode === 'memory' ? copy.objectiveFragment : copy.objectiveGems), 1500);
    }
  }
}

function updateEnemies(dt, time) {
  const playerHitbox = { x: player.x + 10, y: player.y + 14, width: player.width - 20, height: player.height - 18 };
  enemies.forEach((enemy) => {
    if (enemy.defeated) return;
    enemy.x += enemy.direction * enemy.speed * dt;
    if (enemy.x <= enemy.minX || enemy.x >= enemy.maxX) {
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
      enemy.direction *= -1;
    }
    const enemyHitbox = { x: enemy.x - 26, y: enemy.y - 10, width: 58, height: 56 };
    if (!intersects(playerHitbox, enemyHitbox)) return;
    if (player.dashTime > 0) {
      enemy.defeated = true;
      game.defeated += 1;
      effects.push({ x: enemy.x, y: enemy.y + 12, row: 2, start: time, duration: 620, size: 116 });
      game.shake = 0.38;
      showToast('CORRUPTION PURGED', `${game.defeated}/${enemyLayout.length}`, '冲刺可以清除巡逻中的档案噪点。', 1200);
    } else if (player.hitCooldown <= 0) {
      hitPlayer(false, enemy.x);
    }
  });
}

function checkHazards() {
  if (player.hitCooldown > 0) return;
  const hitbox = { x: player.x + 14, y: player.y + 18, width: player.width - 28, height: player.height - 22 };
  for (const hazard of hazardLayout) {
    if (intersects(hitbox, hazard)) {
      hitPlayer(true, hazard.x);
      break;
    }
  }
}

function hitPlayer(respawn = true, sourceX = player.x, resolvedHealth = null) {
  game.health = resolvedHealth ?? Math.max(0, game.health - 1);
  if (respawn || game.health <= 0) {
    if (game.health <= 0) game.health = game.maxHealth;
    player.x = player.checkpointX;
    player.y = GROUND_Y - player.height;
    player.vx = 0;
    player.vy = -190;
  } else {
    player.vx = player.x < sourceX ? -360 : 360;
    player.vy = -360;
  }
  player.hitCooldown = 0.85;
  game.shake = 1;
  updateHud();
  showToast(copy.enemyHit, `${'♥'.repeat(game.health)}${'·'.repeat(game.maxHealth - game.health)}`, '避开噪点，或使用冲刺将它清除。', 1300);
  flash();
}

function updateCheckpoint() {
  if (player.x > 2580 && player.checkpointX < 2000) {
    player.checkpointX = 2660;
    showToast(copy.checkpoint, 'ARCHIVE BEACON', '中继信号已经稳定。');
  }
}

function checkCollectibles(time) {
  gems.forEach((gem) => {
    if (gem.collected || distanceToPlayer(gem.x, gem.y) > 58) return;
    gem.collected = true;
    game.gems += 1;
    effects.push({ x: gem.x, y: gem.y, row: 1, start: time, duration: 620, size: 104 });
    game.shake = 0.25;
    updateHud();
    showToast(copy.gemFound, `+01 / ${String(game.gems).padStart(2, '0')}`, '共鸣能量已写入当前探索记录。', 1200);
  });
}

function fragmentRequirement(index) {
  return (index + 1) * 3;
}

function updateNearby() {
  game.nearby = null;
  if (game.mode === 'memory') {
    let nearestFragment = null;
    fragments.forEach((fragment) => {
      if (fragment.collected) return;
      const distance = distanceToPlayer(fragment.x, fragment.y);
      if (distance < 105 && (!nearestFragment || distance < nearestFragment.distance)) nearestFragment = { type: 'fragment', fragment, distance };
    });
    if (nearestFragment) {
      const requirement = fragmentRequirement(nearestFragment.fragment.index);
      game.nearby = nearestFragment;
      interactionText.textContent = game.gems >= requirement ? `${copy.fragmentInteract} / E` : `${copy.fragmentLocked} ${game.gems}/${requirement}`;
      interactionPrompt.hidden = false;
      return;
    }
    const terminalX = 4680;
    if (Math.abs(player.x + player.width / 2 - terminalX) < 130) {
      game.nearby = { type: 'terminal' };
      interactionText.textContent = game.fragments >= 3 ? copy.readTerminal : `${copy.needFragments} ${game.fragments}/3`;
    }
  } else if (game.mode === 'portal') {
    let best = null;
    portalLayout.forEach((portal, index) => {
      const distance = Math.abs(player.x + player.width / 2 - portal.x);
      if (distance < 125 && (!best || distance < best.distance)) best = { type: 'portal', portal, item: portalItems[index], distance };
    });
    if (best) {
      game.nearby = best;
      interactionText.textContent = game.gems >= best.portal.requiredGems
        ? `${copy.enterPortal} / ${best.item.title}`
        : `${copy.portalLocked} ${game.gems}/${best.portal.requiredGems}`;
    }
  }
  interactionPrompt.hidden = !game.nearby;
}

function interact() {
  if (!game.playing || game.dialogOpen || !game.nearby) return;
  if (game.nearby.type === 'terminal') {
    if (game.fragments < 3) {
      showToast('ARCHIVE LOCKED', `${game.fragments}/3`, copy.needFragments);
      return;
    }
    showQuizComplete();
  } else if (game.nearby.type === 'fragment') {
    const { fragment } = game.nearby;
    const requirement = fragmentRequirement(fragment.index);
    if (game.gems < requirement) {
      showToast(copy.fragmentLocked, `${game.gems}/${requirement}`, copy.objectiveGems);
      return;
    }
    game.pendingFragment = fragment;
    openQuiz(fragment);
  } else if (game.nearby.type === 'portal') {
    if (game.gems < game.nearby.portal.requiredGems) {
      showToast(copy.portalLocked, `${game.gems}/${game.nearby.portal.requiredGems}`, copy.objectiveGems);
      return;
    }
    openPortal(game.nearby.item, game.nearby.portal.kind);
  }
}

function openQuiz(fragment = game.pendingFragment) {
  const item = fragment?.item;
  if (!item || fragment.collected) return;
  const question = graphQuestions[fragment.index];
  if (!question) return;
  game.dialogOpen = true;
  dialogAnswers.innerHTML = '';
  dialogLinks.innerHTML = '';
  dialogIndex.textContent = `MEMORY SEAL / ${String(fragment.index + 1).padStart(2, '0')} · GEM ${game.gems}/${fragmentRequirement(fragment.index)}`;
  dialogTitle.textContent = copy.quizTitle;
  dialogLead.textContent = `${question.pathLabel}\n${question.clue ? `档案线索：${question.clue}\n` : ''}${question.prompt}`;
  question.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'archive-answer';
    button.dataset.archiveKey = archiveKey(option);
    button.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${escapeHtml(option.title)}</strong>`;
    button.addEventListener('click', () => answerQuiz(button, option, item, fragment, question));
    dialogAnswers.append(button);
  });
  if (!archiveDialog.open) archiveDialog.showModal();
}

function answerQuiz(button, choice, correctItem, fragment = game.pendingFragment, question = graphQuestions[fragment?.index]) {
  const buttons = [...dialogAnswers.querySelectorAll('button')];
  buttons.forEach((node) => { node.disabled = true; });
  const outcome = resolveGraphAnswer({ health: game.health }, choice, question);
  if (outcome.correct) {
    button.classList.add('is-correct');
    dialogLead.textContent = `${copy.correct} ${correctItem.title}`;
    game.quizCorrect += 1;
    collectFragment(fragment);
    setTimeout(() => {
      closeDialog();
    }, 850);
  } else {
    button.classList.add('is-wrong');
    const correctButton = buttons.find((node) => node.dataset.archiveKey === archiveKey(correctItem));
    correctButton?.classList.add('is-correct');
    dialogLead.textContent = `${copy.wrong}\n${outcome.hint}`;
    setTimeout(() => {
      closeDialog();
      hitPlayer(false, fragment.x, outcome.health);
    }, 950);
  }
}

function collectFragment(fragment) {
  if (!fragment || fragment.collected) return;
  fragment.collected = true;
  game.fragments += 1;
  effects.push({ x: fragment.x, y: fragment.y, row: 2, start: performance.now(), duration: 800, size: 128 });
  recordWikiFragment(fragment.item);
  updateHud();
  showToast(copy.memoryFound, fragment.item.title, fragment.item.facts?.[1] || fragment.item.facts?.[0] || fragment.item.subtitle || 'Wiki archive connected', 2800);
  game.pendingFragment = null;
}

function showQuizComplete() {
  dialogAnswers.innerHTML = '';
  dialogLinks.innerHTML = '';
  dialogIndex.textContent = `ARCHIVE RESTORED / ${game.fragments} OF 3`;
  dialogTitle.textContent = copy.quizComplete;
  dialogLead.textContent = copy.quizCompleteLead;
  memoryPath.filter((item, index) => index === 0 || fragments[index - 1]?.collected).forEach((item) => dialogLinks.append(makeArchiveLink(item)));
  game.dialogOpen = true;
  if (!archiveDialog.open) archiveDialog.showModal();
  flash();
}

function openPortal(item, kind) {
  game.portalsVisited.add(kind);
  updateHud();
  recordWikiFragment(item);
  dialogAnswers.innerHTML = '';
  dialogLinks.innerHTML = '';
  dialogIndex.textContent = `${kind.toUpperCase()} PORTAL / SYNCHRONIZED`;
  dialogTitle.textContent = item.title;
  dialogLead.textContent = `${item.facts?.join(' · ') || item.subtitle || ''}\n${copy.portalLead}`;
  dialogLinks.append(makeArchiveLink(item));
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'archive-answer';
  continueButton.textContent = copy.continue;
  continueButton.addEventListener('click', closeDialog);
  dialogLinks.append(continueButton);
  game.dialogOpen = true;
  archiveDialog.showModal();
  showToast(copy.portalReady, item.title, item.subtitle || item.kind);
}

function makeArchiveLink(item) {
  const link = document.createElement('a');
  link.className = 'archive-link';
  link.href = item.href;
  link.target = '_top';
  link.innerHTML = `<strong>${escapeHtml(item.title)}</strong><span>${copy.openArchive} →</span>`;
  return link;
}

function closeDialog() {
  if (archiveDialog.open) archiveDialog.close();
  game.dialogOpen = false;
}

function showToast(kind, title, fact, duration = 2200) {
  clearTimeout(toastTimer);
  toastKind.textContent = kind;
  toastTitle.textContent = title;
  toastFact.textContent = fact;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, duration);
}

function flash() {
  screenFlash.classList.remove('is-active');
  void screenFlash.offsetWidth;
  screenFlash.classList.add('is-active');
}

function recordWikiFragment(item) {
  if (!item?.href) return;
  try {
    const storageKey = 'kamitsubaki-memory-explorer-archive-v2';
    const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
    const next = [item.href, ...records.filter((href) => href !== item.href)].slice(0, 24);
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Persistence is optional; gameplay remains available in privacy modes.
  }
}

function distanceToPlayer(x, y) {
  return Math.hypot(player.x + player.width / 2 - x, player.y + player.height / 2 - y);
}

function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
}

function frame(time) {
  const dt = Math.min(0.033, Math.max(0, (time - lastTime) / 1000));
  lastTime = time;
  if (game.screen === 'game') {
    update(dt, time);
    draw(time);
  }
  animationFrame = requestAnimationFrame(frame);
}

document.querySelectorAll('[data-start-mode]').forEach((button) => {
  button.addEventListener('click', () => startMode(button.dataset.startMode));
});
openMenuButton.addEventListener('click', showMenu);
runnerBackButton.addEventListener('click', () => {
  runnerFrame.src = 'about:blank';
  showMenu();
});
dialogCloseButton.addEventListener('click', closeDialog);
archiveDialog.addEventListener('close', () => { game.dialogOpen = false; });

window.addEventListener('keydown', (event) => {
  if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'Space', 'ShiftLeft', 'ShiftRight'].includes(event.code)) event.preventDefault();
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = true;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = true;
  if (['ArrowUp', 'KeyW', 'Space'].includes(event.code)) {
    input.jump = true;
    if (!event.repeat) tryJump();
  }
  if (['ShiftLeft', 'ShiftRight', 'KeyX'].includes(event.code) && !event.repeat) startDash();
  if (event.code === 'KeyE' && !event.repeat) interact();
  if (event.code === 'Escape' && game.screen === 'game' && !archiveDialog.open) showMenu();
}, { passive: false });

window.addEventListener('keyup', (event) => {
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') input.left = false;
  if (event.code === 'ArrowRight' || event.code === 'KeyD') input.right = false;
  if (['ArrowUp', 'KeyW', 'Space'].includes(event.code)) {
    input.jump = false;
    if (player.vy < -180) player.vy *= 0.48;
  }
});

document.querySelectorAll('[data-touch]').forEach((button) => {
  const action = button.dataset.touch;
  const press = (event) => {
    event.preventDefault();
    button.classList.add('is-pressed');
    if (action === 'left') input.left = true;
    if (action === 'right') input.right = true;
    if (action === 'jump') tryJump();
    if (action === 'dash') startDash();
    if (action === 'interact') interact();
  };
  const release = (event) => {
    event.preventDefault();
    button.classList.remove('is-pressed');
    if (action === 'left') input.left = false;
    if (action === 'right') input.right = false;
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
});

window.addEventListener('resize', resize, { passive: true });
document.addEventListener('visibilitychange', () => {
  input.left = false;
  input.right = false;
  input.jump = false;
  lastTime = performance.now();
});

loadGame().catch((error) => {
  console.error('Failed to initialize archive explorer.', error);
  loadingScreen.querySelector('p').textContent = '档案接入失败，请刷新重试';
});
