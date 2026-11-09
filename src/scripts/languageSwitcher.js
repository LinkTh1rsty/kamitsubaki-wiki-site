import { preserveLocaleLocation } from '../lib/localeLocation.mjs';

function refreshLocaleLink(link) {
  link.href = preserveLocaleLocation(link.dataset.localeHref, location.href);
}
function refreshLocaleLinks() {
  document.querySelectorAll('a[data-locale-href]').forEach(refreshLocaleLink);
}
for (const type of ['pointerdown', 'focusin', 'contextmenu', 'click']) {
  document.addEventListener(type, event => {
    const link = event.target.closest?.('a[data-locale-href]');
    if (link) refreshLocaleLink(link);
  }, true);
}
window.addEventListener('hashchange', refreshLocaleLinks);
window.addEventListener('popstate', refreshLocaleLinks);
refreshLocaleLinks();

const languageFamilies = document.querySelectorAll('[data-language-family]');

function setLanguageMenuOpen(family, open) {
  const trigger = family.querySelector('[data-language-menu-trigger]');
  const menu = family.querySelector('[data-language-menu]');
  family.classList.toggle('is-open', open);
  trigger?.setAttribute('aria-expanded', String(open));
  menu?.setAttribute('aria-hidden', String(!open));
}

function getMenuItems(family) {
  return [...family.querySelectorAll('[role="menuitem"]')].filter(
    (item) => item instanceof HTMLAnchorElement,
  );
}

languageFamilies.forEach((family) => {
  const trigger = family.querySelector('[data-language-menu-trigger]');
  const menu = family.querySelector('[data-language-menu]');
  if (!(trigger instanceof HTMLButtonElement) || !(menu instanceof HTMLElement)) {
    return;
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    setLanguageMenuOpen(family, trigger.getAttribute('aria-expanded') !== 'true');
  });

  trigger.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const items = getMenuItems(family);
    setLanguageMenuOpen(family, true);
    items[event.key === 'ArrowUp' ? items.length - 1 : 0]?.focus();
  });

  menu.addEventListener('keydown', (event) => {
    const items = getMenuItems(family);
    const currentIndex = items.indexOf(document.activeElement);
    if (event.key === 'Escape') {
      event.preventDefault();
      setLanguageMenuOpen(family, false);
      trigger.focus();
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key) || !items.length) {
      return;
    }
    event.preventDefault();
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? items.length - 1
        : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus();
  });

  family.addEventListener('focusout', (event) => {
    if (!(event.relatedTarget instanceof Node) || !family.contains(event.relatedTarget)) {
      setLanguageMenuOpen(family, false);
    }
  });
});

document.addEventListener('pointerdown', (event) => {
  languageFamilies.forEach((family) => {
    if (!(event.target instanceof Node) || !family.contains(event.target)) {
      setLanguageMenuOpen(family, false);
    }
  });
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  languageFamilies.forEach((family) => setLanguageMenuOpen(family, false));
});
