const themePreferences = ['system', 'light', 'dark'];

export function normalizeThemePreference(value) {
  return themePreferences.includes(value) ? value : 'system';
}

export function resolveTheme(preference, prefersDark = false) {
  const normalized = normalizeThemePreference(preference);
  return normalized === 'system' ? (prefersDark ? 'dark' : 'light') : normalized;
}

export function nextThemePreference(preference) {
  const normalized = normalizeThemePreference(preference);
  return themePreferences[(themePreferences.indexOf(normalized) + 1) % themePreferences.length];
}
