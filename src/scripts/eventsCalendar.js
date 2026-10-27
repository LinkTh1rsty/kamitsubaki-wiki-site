import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import {calendarMonthRange,renderCalendarMonth,shiftCalendarMonth} from '../lib/calendarMonth.js';
import {setIconLabel} from '../lib/icons.mjs';
import {
  LIVE_EVENTS_POLL_INTERVAL,
  buildEventsUrl,
  formatDisplayDate,
  formatEventArtists,
  formatEventTime,
  getEventDateKey,
  getJapanDateKey,
  normalizeArtistsRegistry,
  normalizeEventsPayload,
  resolveArtistLabel,
  resolveEventStatus,
} from '../lib/liveEventsClient.js';

const pad = (value) => String(value).padStart(2, '0');
const monthKey = (year, month) => `${year}-${pad(month + 1)}`;
const dateKey = (year, month, day) => `${monthKey(year, month)}-${pad(day)}`;

function mountCalendar(calendar) {
  if (!(calendar instanceof HTMLElement) || calendar.dataset.eventsCalendarMounted === 'true') return;
  calendar.dataset.eventsCalendarMounted = 'true';

  const grid = calendar.querySelector('[data-events-calendar-grid]');
  const monthOutput = calendar.querySelector('[data-events-calendar-month]');
  const status = calendar.querySelector('[data-events-calendar-status]');
  const selectedDateOutput = calendar.querySelector('[data-events-calendar-selected-date]');
  const countOutput = calendar.querySelector('[data-events-calendar-count]');
  const list = calendar.querySelector('[data-events-calendar-list]');
  const updated = calendar.querySelector('[data-events-calendar-updated]');
  if (!(grid instanceof HTMLElement) || !(monthOutput instanceof HTMLElement)
    || !(status instanceof HTMLElement) || !(list instanceof HTMLElement)) return;

  let copy;
  try {
    copy = JSON.parse(calendar.dataset.copy || '{}');
  } catch {
    return;
  }

  const locale = calendar.dataset.locale || 'en';
  const languageTag = calendar.dataset.languageTag || 'en';
  const today = getJapanDateKey();
  const initial = today.split('-').map(Number);
  let year = initial[0];
  let month = initial[1] - 1;
  let selectedDate = today;
  let events = [];
  let artistsRegistry = new Map();
  let artistFilter = '';
  let timer;
  let request;
  let disposed = false;

  const statusLabels = {
    live: copy.statusLive,
    upcoming: copy.statusUpcoming,
    ended: copy.statusEnded,
    cancelled: copy.statusCancelled,
  };

  const stopPolling = () => {
    window.clearTimeout(timer);
    timer = undefined;
    request?.abort();
    request = undefined;
  };

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    stopPolling();
    document.removeEventListener('visibilitychange', handleVisibility);
  };

  const monthRange = () => calendarMonthRange(monthKey(year,month));

  // 当前筛选条件下可见的活动；artistFilter 为空时返回全部
  const visibleEvents = () => (artistFilter
    ? events.filter((event) => Array.isArray(event.artistIds) && event.artistIds.includes(artistFilter))
    : events);

  const filterContainer = calendar.querySelector('[data-events-calendar-filter]');
  const filterSelect = calendar.querySelector('[data-events-calendar-artist]');

  // 依据当前月份活动中实际出现的艺人重建筛选选项；保留仍存在的选中项
  const renderArtistFilter = () => {
    if (!(filterContainer instanceof HTMLElement) || !(filterSelect instanceof HTMLSelectElement)) return;
    const presentIds = [];
    events.forEach((event) => {
      (event.artistIds || []).forEach((id) => {
        if (artistsRegistry.has(id) && !presentIds.includes(id)) presentIds.push(id);
      });
    });

    if (!presentIds.length) {
      filterContainer.hidden = true;
      artistFilter = '';
      return;
    }

    const options = presentIds
      .map((id) => ({ id, label: resolveArtistLabel(artistsRegistry.get(id), languageTag, id) }))
      .sort((a, b) => a.label.localeCompare(b.label, languageTag));

    filterSelect.replaceChildren();
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = copy.allArtistsLabel;
    filterSelect.append(allOption);
    options.forEach(({ id, label }) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = label;
      filterSelect.append(option);
    });

    if (artistFilter && !presentIds.includes(artistFilter)) artistFilter = '';
    filterSelect.value = artistFilter;
    filterContainer.hidden = false;
  };

  const renderAgenda = () => {
    const selectedEvents = visibleEvents().filter((event) => getEventDateKey(event) === selectedDate);
    const selectedDateObject = new Date(`${selectedDate}T12:00:00+09:00`);
    if (selectedDateOutput instanceof HTMLElement) {
      selectedDateOutput.textContent = formatDisplayDate(selectedDateObject, languageTag, { weekday: 'long' });
    }
    if (countOutput instanceof HTMLElement) {
      countOutput.textContent = `${selectedEvents.length} ${copy.eventCountLabel}`;
    }
    list.replaceChildren();

    if (!selectedEvents.length) {
      const empty = document.createElement('p');
      empty.className = 'events-calendar__empty';
      empty.textContent = copy.emptyDay;
      list.append(empty);
      return;
    }

    selectedEvents.forEach((event) => {
      const item = document.createElement('article');
      item.className = 'events-calendar__event';
      const rail = document.createElement('div');
      rail.className = 'events-calendar__event-time';
      const time = document.createElement('time');
      time.dateTime = event.startAt;
      time.textContent = formatEventTime(event, languageTag, copy.allDayLabel);
      const badge = document.createElement('span');
      const status = resolveEventStatus(event);
      badge.className = `events-calendar__badge events-calendar__badge--${status}`;
      badge.textContent = statusLabels[status] || copy.statusUpcoming;
      rail.append(time, badge);

      const body = document.createElement('div');
      body.className = 'events-calendar__event-copy';
      const title = document.createElement('h4');
      title.textContent = event.title;
      body.append(title);
      const metadata = [formatEventArtists(event, artistsRegistry, languageTag), event.location].filter(Boolean);
      if (metadata.length) {
        const detail = document.createElement('p');
        detail.textContent = metadata.join(' · ');
        body.append(detail);
      }
      if (event.url) {
        const link = document.createElement('a');
        link.href = event.url;
        link.target = '_blank';
        link.rel = 'noreferrer';
        setIconLabel(link, `${copy.detailsLabel} →`);
        body.append(link);
      }
      item.append(rail, body);
      list.append(item);
    });
  };

  const renderGrid = () => {
    monthOutput.textContent = new Intl.DateTimeFormat(languageTag, {year:'numeric',month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(year,month,1)));
    renderCalendarMonth({grid,month:monthKey(year,month),selected:selectedDate,today,locale:languageTag,entries:visibleEvents().map(event=>({id:event.id,startDate:getEventDateKey(event),endDate:getEventDateKey(event)})),onSelect(day){selectedDate=day;renderGrid();}});
    renderAgenda();
  };

  const schedule = (delay = LIVE_EVENTS_POLL_INTERVAL) => {
    window.clearTimeout(timer);
    if (!disposed && document.visibilityState !== 'hidden') timer = window.setTimeout(loadMonth, delay);
  };

  const loadMonth = async () => {
    if (disposed || !calendar.isConnected || calendar.dataset.eventsCalendarDisabled === 'true') {
      cleanup();
      return;
    }
    if (document.visibilityState === 'hidden') return;

    request?.abort();
    const activeRequest = new AbortController();
    request = activeRequest;
    status.hidden = false;
    setLoadingStatus(status,copy.loading);
    status.dataset.state = 'loading';

    try {
      const range = monthRange();
      const response = await fetch(buildEventsUrl(calendar.dataset.apiBase, { ...range, locale }), {
        headers: { Accept: 'application/json' },
        credentials: 'omit',
        signal: activeRequest.signal,
      });
      if (!response.ok) throw new Error(`Events API returned ${response.status}`);
      const payload = await response.json();
      events = normalizeEventsPayload(payload);
      artistsRegistry = normalizeArtistsRegistry(payload);
      status.hidden = true;
      renderArtistFilter();
      renderGrid();
      if (updated instanceof HTMLElement) {
        updated.textContent = `${copy.updatedLabel} ${new Intl.DateTimeFormat(languageTag, {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
        }).format(new Date())}`;
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        events = [];
        artistsRegistry = new Map();
        status.textContent = copy.fallback;
        status.dataset.state = 'error';
        renderArtistFilter();
        renderGrid();
      }
    } finally {
      if (request === activeRequest) {
        request = undefined;
        schedule();
      }
    }
  };

  const changeMonth = (offset) => {
    const next = new Date(shiftCalendarMonth(monthKey(year,month),offset)+"-01T12:00Z");
    year = next.getUTCFullYear();
    month = next.getUTCMonth();
    selectedDate = dateKey(year, month, 1);
    stopPolling();
    renderGrid();
    schedule(0);
  };

  function handleVisibility() {
    if (document.visibilityState === 'hidden') stopPolling();
    else schedule(0);
  }

  calendar.querySelector('[data-events-calendar-previous]')?.addEventListener('click', () => changeMonth(-1));
  calendar.querySelector('[data-events-calendar-next]')?.addEventListener('click', () => changeMonth(1));
  filterSelect?.addEventListener('change', () => {
    artistFilter = filterSelect.value;
    renderGrid();
  });
  calendar.querySelector('[data-events-calendar-today]')?.addEventListener('click', () => {
    const parts = today.split('-').map(Number);
    year = parts[0];
    month = parts[1] - 1;
    selectedDate = today;
    stopPolling();
    renderGrid();
    schedule(0);
  });
  calendar.addEventListener('events-calendar:disable', cleanup, { once: true });
  document.addEventListener('visibilitychange', handleVisibility);
  document.addEventListener('astro:before-swap', cleanup, { once: true });
  renderGrid();
  schedule(0);
}

function initializeCalendars() {
  document.querySelectorAll('[data-events-calendar]').forEach(mountCalendar);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCalendars, { once: true });
} else {
  initializeCalendars();
}

document.addEventListener('astro:page-load', initializeCalendars);
