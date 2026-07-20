const storageKey = 'kamitsubaki-theme';
const themes = new Set(['dark', 'light']);

const getTheme = () => {
  const theme = document.documentElement.dataset.theme;
  return themes.has(theme) ? theme : 'dark';
};

const updateToggle = (button, theme) => {
  const isLight = theme === 'light';
  const label = isLight ? button.dataset.darkLabel : button.dataset.lightLabel;
  const ariaLabel = isLight ? button.dataset.darkAria : button.dataset.lightAria;
  const labelNode = button.querySelector('[data-theme-label]');

  if (labelNode) labelNode.textContent = label || '';
  button.setAttribute('aria-label', ariaLabel || '');
  button.setAttribute('title', ariaLabel || '');
  button.setAttribute('aria-pressed', String(isLight));
};

const applyTheme = (theme, { persist = false } = {}) => {
  const nextTheme = themes.has(theme) ? theme : 'dark';
  document.documentElement.dataset.theme = nextTheme;
  document.querySelectorAll('[data-theme-toggle]').forEach((button) => updateToggle(button, nextTheme));

  if (persist) {
    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      // The visual toggle should still work when storage is unavailable.
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(getTheme());

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element && event.target.closest('[data-theme-toggle]');
    if (!(button instanceof HTMLButtonElement)) return;

    applyTheme(getTheme() === 'light' ? 'dark' : 'light', { persist: true });
  });
});
