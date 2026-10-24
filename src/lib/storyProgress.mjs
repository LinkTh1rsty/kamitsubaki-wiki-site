export const storyProgressKey = 'kamitsubaki.story-progress.v1';
export function storyFormat(template, values) { return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? '')); }
const validId = value => typeof value === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 100;
const emptyStore = () => ({ version: 1, routes: {} });
function storeData(storage) {
  const raw = storage.getItem(storyProgressKey); if (!raw) return { data: emptyStore(), corrupt: false };
  try {
    if (raw.length > 200000) throw Error('Oversized progress');
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !data.routes || typeof data.routes !== 'object' || Array.isArray(data.routes)) throw Error('Invalid progress');
    return { data, corrupt: false };
  } catch { return { data: emptyStore(), corrupt: true }; }
}
export function normalizeStoryProgress(record, route) {
  const keys = new Set(route.chapters.map(c => c.id)), first = route.chapters[0]?.id || '';
  const changed = Boolean(record && record.fingerprint !== route.fingerprint);
  const usable = record && !changed;
  return { current: usable && keys.has(record.current) ? record.current : first,
    completed: usable && Array.isArray(record.completed) ? [...new Set(record.completed.filter(id => keys.has(id)))].slice(0, 64) : [],
    fingerprint: route.fingerprint, changed, corrupt: false };
}
export function readStoryProgress(storage, route) {
  const { data, corrupt } = storeData(storage);
  const record = Object.hasOwn(data.routes, route.id) ? data.routes[route.id] : null;
  return { ...normalizeStoryProgress(record, route), corrupt };
}
export function writeStoryProgress(storage, route, progress, now = new Date()) {
  const { data } = storeData(storage), routes = {};
  const prior = Object.entries(data.routes).filter(([id, entry]) => validId(id) && id !== route.id && entry && typeof entry === 'object').slice(-31);
  for (const [id, entry] of prior) routes[id] = { current: validId(entry.current) ? entry.current : '', fingerprint: String(entry.fingerprint || '').slice(0, 32),
    completed: Array.isArray(entry.completed) ? entry.completed.filter(validId).slice(0, 64) : [], updatedAt: String(entry.updatedAt || '').slice(0, 30) };
  const clean = normalizeStoryProgress({ ...progress, fingerprint: route.fingerprint }, route);
  routes[route.id] = { current: clean.current, completed: clean.completed, fingerprint: route.fingerprint, updatedAt: now.toISOString() };
  storage.setItem(storyProgressKey, JSON.stringify({ version: 1, routes }));
}
export function clearStoryProgress(storage, route) {
  const { data } = storeData(storage);
  delete data.routes[route.id]; storage.setItem(storyProgressKey, JSON.stringify(data));
}
