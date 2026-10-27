import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildLiveEventsCacheKey,
  formatEventDateTime,
  formatUtcOffset,
  LIVE_STATUS_DEFAULT_DURATION_MS,
  readLiveEventsCache,
  resolveEventStatus,
  writeLiveEventsCache,
} from '../src/lib/liveEventsClient.js';

const event = {
  id: 'stream-1',
  title: 'Test stream',
  artist: 'Test artist',
  location: 'YouTube',
  startAt: '2026-08-21T19:00:00+09:00',
  allDay: false,
  status: 'upcoming',
  url: 'https://www.youtube.com/watch?v=test',
};

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    values,
  };
}

test('live-event components default to the production Workers API', async () => {
  const expectedBase = 'https://kamitsubaki-events-api.apikatsuwiki.workers.dev';
  const [calendar, widget, envExample] = await Promise.all([
    readFile(new URL('../src/components/EventsCalendar.astro', import.meta.url), 'utf8'),
    readFile(new URL('../src/components/LiveEventsWidget.astro', import.meta.url), 'utf8'),
    readFile(new URL('../.env.example', import.meta.url), 'utf8'),
  ]);

  assert.match(calendar, /import\.meta\.env\.PUBLIC_EVENTS_API_BASE/);
  assert.match(widget, /import\.meta\.env\.PUBLIC_EVENTS_API_BASE/);
  assert.ok(calendar.includes(expectedBase));
  assert.ok(widget.includes(expectedBase));
  assert.match(envExample, new RegExp(`PUBLIC_EVENTS_API_BASE=${expectedBase.replaceAll('.', '\\.')}\\s`));
});

test('live-event times can be rendered in the visitor time zone and JST', () => {
  const local = formatEventDateTime(event, 'en-GB', 'All day', 'Asia/Hong_Kong');
  const jst = formatEventDateTime(event, 'en-GB', 'All day', 'Asia/Tokyo');

  assert.match(local, /18:00/);
  assert.match(jst, /19:00/);
  assert.notEqual(local, jst);
});

test('event status is derived from the current time, not the static API field', () => {
  const stream = {
    title: 'Stream',
    startAt: '2026-09-07T20:00:00+09:00',
    endAt: '2026-09-07T21:30:00+09:00',
    status: 'upcoming',
  };
  const at = (time) => new Date(time);

  assert.equal(resolveEventStatus(stream, at('2026-09-07T19:59:59+09:00')), 'upcoming');
  assert.equal(resolveEventStatus(stream, at('2026-09-07T20:00:00+09:00')), 'live');
  assert.equal(resolveEventStatus(stream, at('2026-09-07T21:29:59+09:00')), 'live');
  assert.equal(resolveEventStatus(stream, at('2026-09-07T21:30:00+09:00')), 'ended');
  assert.equal(resolveEventStatus(stream, at('2026-09-08T12:00:00+09:00')), 'ended');
  // API 返回的 ended/upcoming 只是静态字段，时间未到仍应显示 upcoming
  assert.equal(resolveEventStatus({ ...stream, status: 'ended' }, at('2026-09-07T10:00:00+09:00')), 'upcoming');
});

test('events without endAt stay live for a bounded default duration', () => {
  const stream = { title: 'Stream', startAt: '2026-09-07T20:00:00+09:00', status: 'upcoming' };
  const at = (time) => new Date(time);
  const expectedEnd = Date.parse(stream.startAt) + LIVE_STATUS_DEFAULT_DURATION_MS;

  assert.equal(resolveEventStatus(stream, at('2026-09-07T20:30:00+09:00')), 'live');
  assert.equal(resolveEventStatus(stream, new Date(expectedEnd - 1)), 'live');
  assert.equal(resolveEventStatus(stream, new Date(expectedEnd)), 'ended');
});

test('all-day events follow the JST calendar day and cancelled is preserved', () => {
  const festival = { title: 'Festival', startAt: '2026-09-07T00:00:00+09:00', allDay: true, status: 'upcoming' };
  const at = (time) => new Date(time);

  assert.equal(resolveEventStatus(festival, at('2026-09-06T23:00:00+09:00')), 'upcoming');
  assert.equal(resolveEventStatus(festival, at('2026-09-07T12:00:00+09:00')), 'live');
  assert.equal(resolveEventStatus(festival, at('2026-09-08T00:00:00+09:00')), 'ended');
  assert.equal(
    resolveEventStatus({ ...festival, status: 'cancelled' }, at('2026-09-07T12:00:00+09:00')),
    'cancelled',
  );
  assert.equal(
    resolveEventStatus({ title: 'Stream', startAt: 'not-a-date', status: 'live' }, at('2026-09-07T12:00:00+09:00')),
    'upcoming',
  );
});

test('the observation clock formats whole-hour and fractional GMT offsets', () => {
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => -480 }), 'GMT+08:00');
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => -345 }), 'GMT+05:45');
  assert.equal(formatUtcOffset({ getTimezoneOffset: () => 210 }), 'GMT-03:30');
});

test('live-event cache is scoped, normalized, and resilient to malformed data', () => {
  const storage = memoryStorage();
  const context = {
    apiBase: 'https://events.example.com/',
    date: '2026-08-21',
    locale: 'zh',
    events: [event, { title: '', startAt: 'invalid' }],
  };
  const savedAt = '2026-08-21T10:00:00.000Z';

  assert.equal(writeLiveEventsCache(storage, context, savedAt), true);
  assert.equal(storage.values.size, 1);
  assert.equal(
    buildLiveEventsCacheKey(context.apiBase, context.date, context.locale),
    buildLiveEventsCacheKey('https://events.example.com', context.date, context.locale),
  );

  const cached = readLiveEventsCache(storage, context);
  assert.equal(cached.savedAt, savedAt);
  assert.equal(cached.events.length, 1);
  assert.equal(cached.events[0].id, event.id);

  storage.setItem(
    buildLiveEventsCacheKey(context.apiBase, context.date, context.locale),
    '{not-json',
  );
  assert.equal(readLiveEventsCache(storage, context), null);
  assert.equal(readLiveEventsCache(null, context), null);
  assert.equal(writeLiveEventsCache(null, context, savedAt), false);
});

test('the observation widget exposes dual-time and cached fallback UI', async () => {
  const [script, styles, calendarScript] = await Promise.all([
    readFile(new URL('../src/scripts/liveEvents.js', import.meta.url), 'utf8'),
    readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8'),
    readFile(new URL('../src/scripts/eventsCalendar.js', import.meta.url), 'utf8'),
  ]);

  assert.match(script, /copy\.localTimeLabel/);
  assert.match(script, /copy\.jstTimeLabel/);
  assert.match(script, /formatUtcOffset/);
  assert.match(script, /scheduleClock/);
  assert.match(script, /readLiveEventsCache/);
  assert.match(script, /writeLiveEventsCache/);
  assert.match(script, /copy\.cachedFallback/);
  assert.match(styles, /\.live-events__time-row/);
  assert.match(styles, /data-live-events-state='cached'/);
  // 徽章状态必须按当前时间实时推导，而不是照搬 API 静态字段
  assert.match(script, /resolveEventStatus\(event\)/);
  assert.match(calendarScript, /resolveEventStatus\(event\)/);
  assert.doesNotMatch(script, /badge--\$\{event\.status\}/);
  assert.doesNotMatch(calendarScript, /badge--\$\{event\.status\}/);
});

test('calendar month changes cannot be delayed by an aborted request cleanup', async () => {
  const script = await readFile(new URL('../src/scripts/eventsCalendar.js', import.meta.url), 'utf8');

  assert.match(script, /const activeRequest = new AbortController\(\);/);
  assert.match(script, /signal: activeRequest\.signal/);
  assert.match(
    script,
    /finally \{\s*if \(request === activeRequest\) \{\s*request = undefined;\s*schedule\(\);\s*\}\s*\}/,
  );
});

test('events payload keeps artistIds and exposes the artists registry', async () => {
  const { normalizeArtistsRegistry, normalizeEventsPayload } = await import('../src/lib/liveEventsClient.js');
  const payload = {
    updatedAt: '2026-10-06T00:00:00.000Z',
    artists: [
      { id: 'kaf', type: 'virtual-avatar', labels: { zh: '花譜', ja: '花譜', en: 'KAF' } },
      { id: 'teresa', type: 'virtual-avatar', labels: { zh: 'teresaAI', ja: 'teresaAI', en: 'teresaAI' } },
      { id: '' },
      null,
    ],
    events: [
      { ...event, artistIds: ['kaf', 'teresa', 'kaf', 42, ' '] },
      { ...event, id: 'stream-2', title: 'No ids' },
    ],
  };

  const events = normalizeEventsPayload(payload);
  assert.deepEqual(events[0].artistIds, ['kaf', 'teresa']);
  assert.deepEqual(events[1].artistIds, []);

  const registry = normalizeArtistsRegistry(payload);
  assert.equal(registry.size, 2);
  assert.equal(registry.get('kaf').labels.zh, '花譜');
  // 旧格式载荷（数组或缺少 artists 字段）回退为空注册表
  assert.equal(normalizeArtistsRegistry(events).size, 0);
  assert.equal(normalizeArtistsRegistry({ events }).size, 0);
});

test('artist labels resolve per locale with documented fallbacks', async () => {
  const { formatEventArtists, resolveArtistLabel } = await import('../src/lib/liveEventsClient.js');
  const registry = new Map([
    ['asu', { id: 'asu', type: 'virtual-avatar', labels: { zh: '明透 / ASU', 'zh-tw': '明透 / ASU', ja: '明透 / ASU', en: 'ASU' } }],
    ['kanzaki-iori', { id: 'kanzaki-iori', type: 'person', labels: { zh: '神崎一织', ja: 'カンザキイオリ', en: 'Kanzaki Iori' } }],
  ]);

  assert.equal(resolveArtistLabel(registry.get('asu'), 'en', 'x'), 'ASU');
  assert.equal(resolveArtistLabel(registry.get('asu'), 'zh-HK', 'x'), '明透 / ASU');
  assert.equal(resolveArtistLabel(registry.get('kanzaki-iori'), 'ja', 'x'), 'カンザキイオリ');
  assert.equal(resolveArtistLabel(undefined, 'zh', 'fallback'), 'fallback');

  const withIds = { artist: '明透', artistIds: ['asu', 'kanzaki-iori'] };
  assert.equal(formatEventArtists(withIds, registry, 'en'), 'ASU / Kanzaki Iori');
  assert.equal(formatEventArtists(withIds, registry, 'zh'), '明透 / ASU / 神崎一织');
  // 无 artistIds 或注册表缺失时回退到 artist 原文，保证旧数据展示不变
  assert.equal(formatEventArtists({ artist: '詩道', artistIds: [] }, registry, 'zh'), '詩道');
  assert.equal(formatEventArtists({ artist: '詩道' }, new Map(), 'zh'), '詩道');
});

test('calendar filter renders only for artist-tagged payloads and filters by id', async () => {
  const script = await readFile(new URL('../src/scripts/eventsCalendar.js', import.meta.url), 'utf8');
  const component = await readFile(new URL('../src/components/EventsCalendar.astro', import.meta.url), 'utf8');
  const styles = await readFile(new URL('../src/styles/global.css', import.meta.url), 'utf8');

  assert.match(component, /data-events-calendar-artist/);
  assert.match(component, /allArtistsLabel/);
  assert.match(script, /event\.artistIds\.includes\(artistFilter\)/);
  assert.match(script, /filterContainer\.hidden = true/);
  assert.match(script, /normalizeArtistsRegistry\(payload\)/);
  assert.match(styles, /\.events-calendar__filter select/);
});
