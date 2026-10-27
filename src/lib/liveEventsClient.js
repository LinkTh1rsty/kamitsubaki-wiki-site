export const LIVE_EVENTS_POLL_INTERVAL = 30_000;
export const LIVE_EVENTS_TIME_ZONE = 'Asia/Tokyo';
export const LIVE_EVENTS_CACHE_PREFIX = 'kamitsubaki-live-events:v1';
// 未公布 endAt 的活动按此时长视为“进行中”，超时后展示“已结束”
export const LIVE_STATUS_DEFAULT_DURATION_MS = 6 * 60 * 60 * 1000;

const dateParts = (date) => new Intl.DateTimeFormat('en-CA', {
  timeZone: LIVE_EVENTS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).formatToParts(date).reduce((parts, part) => {
  if (part.type !== 'literal') parts[part.type] = part.value;
  return parts;
}, {});

export function getJapanDateKey(date = new Date()) {
  const parts = dateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getEventDateKey(event) {
  return getJapanDateKey(new Date(event.startAt));
}

export function resolveEventStatus(event, now = new Date()) {
  if (event.status === 'cancelled') return 'cancelled';
  const start = Date.parse(event.startAt);
  if (!Number.isFinite(start)) return 'upcoming';

  if (event.allDay) {
    const eventDay = getJapanDateKey(new Date(start));
    const today = getJapanDateKey(now);
    if (eventDay < today) return 'ended';
    if (eventDay > today) return 'upcoming';
    return 'live';
  }

  const at = now.getTime();
  if (at < start) return 'upcoming';
  const end = event.endAt ? Date.parse(event.endAt) : Number.NaN;
  const liveUntil = Number.isFinite(end) ? end : start + LIVE_STATUS_DEFAULT_DURATION_MS;
  return at < liveUntil ? 'live' : 'ended';
}

export function buildEventsUrl(apiBase, params = {}) {
  const normalizedBase = String(apiBase || '').trim().replace(/\/+$/, '');
  const url = new URL(`${normalizedBase}/v1/events`);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  return url;
}

export function normalizeEventsPayload(payload) {
  const source = Array.isArray(payload) ? payload : payload?.events;
  if (!Array.isArray(source)) throw new TypeError('Expected an events array');

  return source.flatMap((item, index) => {
    if (!item || typeof item !== 'object') return [];
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const startAt = typeof item.startAt === 'string' ? item.startAt : '';
    const startTime = Date.parse(startAt);
    if (!title || !Number.isFinite(startTime)) return [];

    const endAt = typeof item.endAt === 'string' && Number.isFinite(Date.parse(item.endAt))
      ? item.endAt
      : undefined;

    const artistIds = Array.isArray(item.artistIds)
      ? [...new Set(item.artistIds.filter((id) => typeof id === 'string' && id.trim()).map((id) => id.trim()))]
      : [];

    return [{
      id: String(item.id ?? `${startAt}-${index}`),
      title,
      artist: typeof item.artist === 'string' ? item.artist.trim() : '',
      artistIds,
      location: typeof item.location === 'string' ? item.location.trim() : '',
      startAt,
      endAt,
      allDay: item.allDay === true,
      status: ['live', 'upcoming', 'ended', 'cancelled'].includes(item.status) ? item.status : 'upcoming',
      url: isSafeHttpUrl(item.url) ? item.url : '',
    }];
  }).sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
}

// 解析 API 载荷顶层的艺人注册表（{ id, type, labels: { <locale>: name } }），
// 以 id 为键返回；缺失时返回空 Map，调用方回退到 event.artist 原文展示。
export function normalizeArtistsRegistry(payload) {
  const source = Array.isArray(payload) ? null : payload?.artists;
  const registry = new Map();
  if (!Array.isArray(source)) return registry;
  for (const item of source) {
    if (!item || typeof item !== 'object') continue;
    const id = typeof item.id === 'string' ? item.id.trim() : '';
    if (!id) continue;
    const labels = item.labels && typeof item.labels === 'object' ? item.labels : {};
    registry.set(id, { id, type: typeof item.type === 'string' ? item.type : '', labels });
  }
  return registry;
}

// 依据艺人注册表按语言环境解析显示名；无词条时回退到 fallback（通常为 event.artist 原文）
export function resolveArtistLabel(entry, languageTag, fallback = '') {
  if (!entry || typeof entry !== 'object') return fallback;
  const labels = entry.labels || {};
  const tag = String(languageTag || '').toLowerCase();
  const candidates = tag.startsWith('zh-tw') ? ['zh-tw', 'zh']
    : tag.startsWith('zh-hk') || tag.startsWith('zh-mo') ? ['zh-hk', 'zh-tw', 'zh']
    : tag.startsWith('zh') ? ['zh']
    : tag.startsWith('ja') ? ['ja', 'en', 'zh']
    : ['en', 'zh'];
  for (const key of candidates) {
    const value = labels[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  const first = Object.values(labels).find((value) => typeof value === 'string' && value.trim());
  return first ? first.trim() : fallback;
}

// 组装活动的艺人展示文案：优先使用 artistIds + 注册表的本地化名称，否则回退原文
export function formatEventArtists(event, artistsRegistry, languageTag) {
  const ids = Array.isArray(event?.artistIds) ? event.artistIds : [];
  if (!ids.length || !(artistsRegistry instanceof Map)) return event?.artist || '';
  const names = ids.map((id) => resolveArtistLabel(artistsRegistry.get(id), languageTag, '')).filter(Boolean);
  return names.length ? names.join(' / ') : event?.artist || '';
}

export function isSafeHttpUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function formatEventTime(event, locale, allDayLabel) {
  if (event.allDay) return allDayLabel;
  return new Intl.DateTimeFormat(locale, {
    timeZone: LIVE_EVENTS_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(event.startAt));
}

export function getVisitorTimeZone() {
  try {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatUtcOffset(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = String(Math.floor(absoluteMinutes / 60)).padStart(2, '0');
  const minutes = String(absoluteMinutes % 60).padStart(2, '0');
  return `GMT${sign}${hours}:${minutes}`;
}

export function formatEventDateTime(event, locale, allDayLabel, timeZone) {
  if (event.allDay) return allDayLabel;
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(event.startAt));
}

export function buildLiveEventsCacheKey(apiBase, date, locale) {
  const normalizedBase = String(apiBase || '').trim().replace(/\/+$/, '');
  return [
    LIVE_EVENTS_CACHE_PREFIX,
    encodeURIComponent(normalizedBase),
    encodeURIComponent(String(locale || 'en')),
    encodeURIComponent(String(date || '')),
  ].join(':');
}

export function writeLiveEventsCache(storage, context, savedAt = new Date().toISOString()) {
  try {
    const timestamp = new Date(savedAt);
    if (Number.isNaN(timestamp.getTime())) return false;
    const events = normalizeEventsPayload(context.events);
    storage.setItem(
      buildLiveEventsCacheKey(context.apiBase, context.date, context.locale),
      JSON.stringify({ version: 1, savedAt: timestamp.toISOString(), events }),
    );
    return true;
  } catch {
    return false;
  }
}

export function readLiveEventsCache(storage, context) {
  try {
    const raw = storage.getItem(
      buildLiveEventsCacheKey(context.apiBase, context.date, context.locale),
    );
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached?.version !== 1 || !Number.isFinite(Date.parse(cached.savedAt))) return null;
    return {
      savedAt: cached.savedAt,
      events: normalizeEventsPayload(cached.events),
    };
  } catch {
    return null;
  }
}

export function formatDisplayDate(date, locale, options = {}) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: LIVE_EVENTS_TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(date);
}
