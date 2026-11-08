import { foldCjkSearchText } from './cjkSearch.mjs';
import { stableIdPattern } from './entityContract.mjs';

/** UI shortcuts for schema-v2 entities. These names never become YAML keys. */
export function metadataPresetKind(meta) {
  if (meta?.schemaVersion !== 2) return null;
  return ({
    'work-track': 'song',
    'work-release': 'album',
    'software-voice': 'isotope',
    person: 'person',
    'virtual-avatar': 'person',
    unit: 'person',
  })[meta.entityType] || null;
}

export const songCreditRoles = ['lyricist', 'composer', 'arranger', 'mixer', 'recording-engineer'];
export const voiceEngineShortcuts = ['CeVIO AI', 'Synthesizer V AI', 'VOCALOID'];
export const personActivityStates = ['active', 'hiatus', 'ended', 'unknown'];

const presetCopy = {
  zh: {
    song: '创作者与制作', album: '曲目顺序', isotope: '声源与引擎', person: '活动状态',
    role: '职责', contributor: '站内人物', creditedName: '其他署名', addCredit: '添加制作人员',
    linkSong: '关联已有歌曲', addTrack: '添加曲目', number: '曲序', title: '曲名',
    voiceSource: '基于角色', voiceEngine: '声音引擎', addEngine: '添加引擎',
    active: '活动中', hiatus: '暂停活动', ended: '结束活动', unknown: '未确认',
    lyricist: '作词', composer: '作曲', arranger: '编曲', mixer: '混音', 'recording-engineer': '录音',
    ambiguous: '找到多个同名词条，请选择带 ID 的完整选项。', batchCredit:'从站内目录批量添加', batchSearch:'搜索人物、团体或声音库', batchSelected:'已选 {n} 位', batchAdd:'添加所选制作人员', batchEmpty:'没有符合条件的站内人物。', batchAdded:'已添加 {n} 位制作人员。', batchDuplicate:'所选人物已在此职责下添加。',
  },
  'zh-tw': {
    song: '創作者與製作', album: '曲目順序', isotope: '聲源與引擎', person: '活動狀態',
    role: '職責', contributor: '站內人物', creditedName: '其他署名', addCredit: '新增製作人員',
    linkSong: '關聯現有歌曲', addTrack: '新增曲目', number: '曲序', title: '曲名',
    voiceSource: '基於角色', voiceEngine: '聲音引擎', addEngine: '新增引擎',
    active: '活動中', hiatus: '暫停活動', ended: '結束活動', unknown: '未確認',
    lyricist: '作詞', composer: '作曲', arranger: '編曲', mixer: '混音', 'recording-engineer': '錄音',
    ambiguous: '找到多個同名詞條，請選擇附有 ID 的完整選項。', batchCredit:'從站內目錄批次加入', batchSearch:'搜尋人物、團體或聲音庫', batchSelected:'已選 {n} 位', batchAdd:'加入所選製作人員', batchEmpty:'沒有符合條件的站內人物。', batchAdded:'已加入 {n} 位製作人員。', batchDuplicate:'所選人物已在此職責下加入。',
  },
  'zh-hk': {
    song: '創作者與製作', album: '曲目次序', isotope: '聲源與引擎', person: '活動狀態',
    role: '職責', contributor: '站內人物', creditedName: '其他署名', addCredit: '新增製作人員',
    linkSong: '關聯現有歌曲', addTrack: '新增曲目', number: '曲序', title: '曲名',
    voiceSource: '基於角色', voiceEngine: '聲音引擎', addEngine: '新增引擎',
    active: '活動中', hiatus: '暫停活動', ended: '結束活動', unknown: '未確認',
    lyricist: '填詞', composer: '作曲', arranger: '編曲', mixer: '混音', 'recording-engineer': '錄音',
    ambiguous: '找到多個同名詞條，請選擇附有 ID 的完整選項。', batchCredit:'從站內目錄批量加入', batchSearch:'搜尋人物、團體或聲音庫', batchSelected:'已選 {n} 位', batchAdd:'加入所選製作人員', batchEmpty:'沒有符合條件的站內人物。', batchAdded:'已加入 {n} 位製作人員。', batchDuplicate:'所選人物已在此職責下加入。',
  },
  ja: {
    song: '制作クレジット', album: '収録曲順', isotope: '声の元とエンジン', person: '活動状況',
    role: '担当', contributor: '登録済みの人物', creditedName: 'その他のクレジット名', addCredit: 'クレジットを追加',
    linkSong: '登録済みの楽曲にリンク', addTrack: '曲を追加', number: '曲順', title: '曲名',
    voiceSource: '声の元になった人物', voiceEngine: '音声エンジン', addEngine: 'エンジンを追加',
    active: '活動中', hiatus: '休止中', ended: '活動終了', unknown: '未確認',
    lyricist: '作詞', composer: '作曲', arranger: '編曲', mixer: 'ミックス', 'recording-engineer': 'レコーディング',
    ambiguous: '同じ名前の項目が複数あります。ID 付きの候補を選んでください。', batchCredit:'登録済み人物をまとめて追加', batchSearch:'人物・ユニット・音声ライブラリを検索', batchSelected:'{n} 件選択中', batchAdd:'選択したクレジットを追加', batchEmpty:'該当する人物がありません。', batchAdded:'{n} 件のクレジットを追加しました。', batchDuplicate:'選択した人物はこの担当に追加済みです。',
  },
  en: {
    song: 'Creators and production', album: 'Track order', isotope: 'Voice source and engines', person: 'Activity',
    role: 'Role', contributor: 'Catalog contributor', creditedName: 'Other credited name', addCredit: 'Add credit',
    linkSong: 'Link an existing song', addTrack: 'Add track', number: 'Track number', title: 'Track title',
    voiceSource: 'Based on', voiceEngine: 'Voice engine', addEngine: 'Add engine',
    active: 'Active', hiatus: 'On hiatus', ended: 'Activity ended', unknown: 'Unconfirmed',
    lyricist: 'Lyrics', composer: 'Composition', arranger: 'Arrangement', mixer: 'Mixing', 'recording-engineer': 'Recording',
    ambiguous: 'Several entries share this title. Select the full option with its ID.', batchCredit:'Add several from the catalog', batchSearch:'Search people, units or voices', batchSelected:'{n} selected', batchAdd:'Add selected credits', batchEmpty:'No matching catalog contributors.', batchAdded:'Added {n} credits.', batchDuplicate:'Selected contributors already have this role.',
  },
};

export function metadataPresetCopy(locale = 'zh') {
  return presetCopy[locale] || presetCopy.zh;
}

const creditEntityTypes = new Set(['person', 'virtual-avatar', 'unit', 'software-voice']);
const voiceSourceTypes = new Set(['person', 'virtual-avatar']);

function requirePreset(meta, preset) {
  if (metadataPresetKind(meta) !== preset) throw new TypeError(`Expected ${preset} metadata`);
}

function requireId(value) {
  const id = String(value || '').trim();
  if (!stableIdPattern.test(id)) throw new TypeError('Expected a stable entity ID');
  return id;
}

function catalogEntity(catalog, id, types) {
  if (!Array.isArray(catalog)) return null;
  const found = catalog.find(item => item?.id === id && types.has(item.entityType));
  if (!found) throw new TypeError(`Entity ${id} is not in the selected catalog`);
  return found;
}

const searchFields = new WeakMap();
function foldedCatalogFields(item) {
  const raw = [item.id,item.title,item.path,item.romanized,...(Array.isArray(item.aliases)?item.aliases:[])];
  const signature = JSON.stringify(raw);
  const cached = searchFields.get(item);
  if(cached?.signature === signature) return cached;
  const [id,title,path,...names] = raw.map(foldCjkSearchText);
  const next = {signature,id,title,path,names:names.filter(Boolean)};
  searchFields.set(item,next);return next;
}
/** Search the editor catalog by canonical ID, localized title, romanization, aliases, or source path. */
export function metadataCatalogMatches(catalog, { entityTypes, query = '', limit = 30 } = {}) {
  if (!Array.isArray(catalog)) return [];
  const allowed = entityTypes ? new Set(entityTypes) : null;
  const needle = foldCjkSearchText(query);
  const capped = Number.isInteger(limit) ? Math.max(0, limit) : 30;
  const matches = catalog.flatMap((item, index) => {
    if (!item?.id || allowed && !allowed.has(item.entityType)) return [];
    if (!needle) return [{ item, index, score: 0 }];
    const {id,title,names,path} = foldedCatalogFields(item);
    const score = id === needle || title === needle || names.some(name=>name===needle) ? 0
      : id.startsWith(needle) || title.startsWith(needle) || names.some(name=>name.startsWith(needle)) ? 1
      : id.includes(needle) || title.includes(needle) || names.some(name=>name.includes(needle)) ? 2
      : path.includes(needle) ? 3 : -1;
    return score < 0 ? [] : [{ item, index, score }];
  });
  return matches.sort((a, b) => a.score - b.score || a.index - b.index).slice(0, capped).map(({ item }) => item);
}

/** Human-facing datalist value. The appended ID keeps duplicate titles distinct. */
export function metadataCatalogDisplay(catalog, id, { entityTypes } = {}) {
  const key = String(id || '').trim();
  if (!key) return '';
  const allowed = entityTypes ? new Set(entityTypes) : null;
  const entry = Array.isArray(catalog) ? catalog.find(item => item?.id === key && (!allowed || allowed.has(item.entityType))) : null;
  const title = String(entry?.title || '').trim();
  return title && title !== key ? `${title} · ${key}` : key;
}

/** Resolve a datalist choice or a uniquely typed localized title to a stable ID. */
export function resolveMetadataCatalogInput(catalog, input, { entityTypes } = {}) {
  const value = String(input || '').normalize('NFKC').trim();
  if (!value) return { status: 'empty' };
  const allowed = entityTypes ? new Set(entityTypes) : null;
  const entries = (Array.isArray(catalog) ? catalog : []).filter(item => item?.id && (!allowed || allowed.has(item.entityType)));
  const unique = matches => {
    const byId = new Map(matches.map(item => [item.id, item]));
    return byId.size === 1
      ? { status: 'matched', id: matches[0].id, entry: matches[0] }
      : { status: 'ambiguous', ids: [...byId.keys()] };
  };
  // An exact ID always wins, even if another entry happens to use it as a title.
  const ids = entries.filter(item => item.id === value.toLocaleLowerCase());
  if (ids.length) return unique(ids);
  const displays = entries.filter(item => metadataCatalogDisplay(entries, item.id).normalize('NFKC') === value);
  if (displays.length) return unique(displays);
  const exactTitle = entries.filter(item => String(item.title || '').normalize('NFKC').trim().toLocaleLowerCase() === value.toLocaleLowerCase());
  if (exactTitle.length) return unique(exactTitle);
  const folded = foldCjkSearchText(value);
  const foldedTitle = entries.filter(item => foldCjkSearchText(item.title) === folded);
  if (foldedTitle.length) return unique(foldedTitle);
  return { status: 'missing' };
}

/** Credits may reference a known contributor or preserve a credited display name. */
export function makeSongCredit({ role, entity, name } = {}, catalog) {
  const cleanRole = String(role || '').trim();
  const cleanName = String(name || '').trim();
  const cleanEntity = entity ? requireId(entity) : '';
  if (!cleanRole || !cleanName && !cleanEntity) throw new TypeError('Credit needs a role and a contributor');
  if (cleanEntity) catalogEntity(catalog, cleanEntity, creditEntityTypes);
  return {
    role: cleanRole,
    ...(cleanEntity ? { entity: cleanEntity } : {}),
    ...(cleanName ? { name: cleanName } : {}),
  };
}

/** Add several canonical catalog credits for one role without duplicating role/entity pairs. */
export function addSongCreditsBatch(meta, role, ids, catalog) {
  requirePreset(meta, 'song');
  if (!songCreditRoles.includes(role) || !Array.isArray(ids)) throw new TypeError('Expected a song credit role and ID list');
  const credits = Array.isArray(meta.credits) ? meta.credits.slice() : [];
  const existing = new Set(credits.filter(item => item?.entity && item.role === role).map(item => item.entity));
  for (const id of ids) {
    const credit = makeSongCredit({ role, entity: id }, catalog);
    if (existing.has(credit.entity)) continue;
    credits.push(credit);
    existing.add(credit.entity);
  }
  return { ...meta, credits };
}

/** Reorder the physical rows while preserving titles, disc numbers, and track numbers. */
export function reorderReleaseTracks(tracks, from, to) {
  if (!Array.isArray(tracks) || !Number.isInteger(from) || !Number.isInteger(to)
    || from < 0 || to < 0 || from >= tracks.length || to >= tracks.length) throw new RangeError('Invalid track position');
  const rows = tracks.slice();
  rows.splice(to, 0, rows.splice(from, 1)[0]);
  return rows;
}

/** Explicitly renumber rows within each disc after a drag operation. */
export function renumberReleaseTracks(tracks) {
  if (!Array.isArray(tracks)) throw new TypeError('Expected tracks');
  const nextNumber = new Map();
  return tracks.map(track => {
    const disc = track.disc ?? 1;
    const number = (nextNumber.get(disc) || 0) + 1;
    nextNumber.set(disc, number);
    return { ...track, number: String(number) };
  });
}

/** Attach the stable song ID and fill only an empty title from the catalog. */
export function linkReleaseTrack(track, songId, catalog) {
  const id = requireId(songId);
  const song = catalogEntity(catalog, id, new Set(['work-track']));
  return { ...(track || {}), songId: id, ...(!String(track?.title || '').trim() && song?.title ? { title: song.title } : {}) };
}

/** Software voices need one based-on-voice relation; preserve unrelated edges. */
export function setVoiceSource(meta, sourceId, catalog) {
  requirePreset(meta, 'isotope');
  const id = requireId(sourceId);
  catalogEntity(catalog, id, voiceSourceTypes);
  const relations = Array.isArray(meta.relations) ? meta.relations : [];
  let inserted = false;
  const next = relations.flatMap(relation => {
    if (relation.type !== 'based-on-voice') return [relation];
    if (inserted) return [];
    inserted = true;
    return [{ type: 'based-on-voice', target: id }];
  });
  if (!inserted) next.push({ type: 'based-on-voice', target: id });
  return {
    ...meta,
    relations: next,
  };
}

/** Engine names are open text in the schema; shortcuts are merely suggestions. */
export function setVoiceEngine(meta, engine, enabled = true) {
  requirePreset(meta, 'isotope');
  const name = String(engine || '').trim();
  if (!name) throw new TypeError('Expected voice engine');
  const engines = Array.isArray(meta.voiceEngines) ? meta.voiceEngines : [];
  if (!enabled) return { ...meta, voiceEngines: engines.filter(item => item.engine !== name) };
  if (engines.some(item => item.engine === name)) return { ...meta, voiceEngines: engines.slice() };
  return { ...meta, voiceEngines: [...engines, { engine: name }] };
}

/** Activity is the schema's lifecycle enum; archive details remain untouched. */
export function setPersonActivity(meta, activity) {
  requirePreset(meta, 'person');
  if (!personActivityStates.includes(activity)) throw new TypeError('Unknown activity state');
  return { ...meta, lifecycle: { ...(meta.lifecycle || {}), activity } };
}
