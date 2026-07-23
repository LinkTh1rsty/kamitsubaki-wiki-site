import { sampleRandom } from '../lib/homeMusicCatalog.mjs';

const catalogRequests = new Map();

function getCatalog(url) {
  if (!catalogRequests.has(url)) {
    catalogRequests.set(
      url,
      fetch(url, { headers: { Accept: 'application/json' } }).then((response) => {
        if (!response.ok) throw new Error(`Home music catalog request failed: ${response.status}`);
        return response.json();
      }),
    );
  }

  return catalogRequests.get(url);
}

function setOptionalText(element, value) {
  if (!(element instanceof HTMLElement)) return;
  element.textContent = value || '';
  element.hidden = !value;
}

function renderItem(template, item) {
  const fragment = template.content.cloneNode(true);
  const link = fragment.querySelector('[data-home-music-link]');
  const image = fragment.querySelector('[data-home-music-image]');
  const placeholder = fragment.querySelector('[data-home-music-placeholder]');
  const title = fragment.querySelector('[data-home-music-title]');
  const subtitle = fragment.querySelector('[data-home-music-subtitle]');

  if (link instanceof HTMLAnchorElement) link.href = item.href;
  if (title instanceof HTMLElement) title.textContent = item.title;
  if (subtitle instanceof HTMLElement) subtitle.textContent = item.subtitle;

  if (image instanceof HTMLImageElement && item.image) {
    image.src = item.image;
    image.hidden = false;
    if (placeholder instanceof HTMLElement) placeholder.hidden = true;
  } else if (placeholder instanceof HTMLElement) {
    placeholder.textContent = Array.from(item.title || '?')[0] || '?';
    placeholder.hidden = false;
  }

  setOptionalText(fragment.querySelector('[data-home-music-primary-info]'), item.primaryInfo);
  setOptionalText(fragment.querySelector('[data-home-music-secondary-info]'), item.secondaryInfo);
  return fragment;
}

async function randomizeList(list) {
  const url = list.dataset.homeMusicUrl;
  const kind = list.dataset.homeMusicKind;
  const template = list.parentElement?.querySelector('template[data-home-music-template]');
  if (!url || !kind || !(template instanceof HTMLTemplateElement)) return;

  try {
    const catalog = await getCatalog(url);
    const items = sampleRandom(Array.isArray(catalog[kind]) ? catalog[kind] : [], 5);
    if (items.length === 0) return;
    list.replaceChildren(...items.map((item) => renderItem(template, item)));
  } catch {
    // Keep the server-rendered fallback rows when the catalog request is unavailable.
  }
}

export function initializeHomeMusicRandomizer() {
  const randomizeAll = () => {
    document.querySelectorAll('[data-home-music-list]').forEach((list) => {
      if (list instanceof HTMLElement) void randomizeList(list);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', randomizeAll, { once: true });
  } else {
    randomizeAll();
  }

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) randomizeAll();
  });
}
