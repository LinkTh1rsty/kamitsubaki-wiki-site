const FRESH_MS = 5 * 60 * 1000;
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'contributor-records-v1';

// Public records only. Keep a bounded tab-local cache across Astro navigation.
export function createContributorClient({ fetchImpl = fetch, storage, now = Date.now } = {}) {
  const records = new Map();
  const pending = new Map();
  try {
    for (const [key, record] of JSON.parse(storage?.getItem(STORAGE_KEY) || '[]').slice(-32)) {
      if (record?.data && now() - record.savedAt < RETAIN_MS) records.set(key, record);
    }
  } catch { /* Storage may be disabled or contain an obsolete format. */ }

  function peek(url) {
    const record = records.get(String(url));
    if (!record || now() - record.savedAt >= RETAIN_MS) return null;
    return { data: record.data, stale: record.data.stale || now() - record.savedAt >= FRESH_MS };
  }
  async function load(url, { force = false } = {}) {
    const key = String(url);
    const existing = peek(key);
    if (!force && existing && !existing.stale) return existing;
    if (pending.has(key)) return pending.get(key);
    const work = Promise.resolve().then(async () => {
      try {
        const response = await fetchImpl(key, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) throw new Error(`Contributor API returned ${response.status}`);
        const data = await response.json();
        if (!data?.totals || !Array.isArray(data.topContributors) || !Array.isArray(data.recent)) {
          throw new Error('Invalid contribution records');
        }
        const savedAt = data.stale && records.has(key) ? records.get(key).savedAt : now();
        records.delete(key);
        records.set(key, { data, savedAt });
        while (records.size > 32) records.delete(records.keys().next().value);
        try { storage?.setItem(STORAGE_KEY, JSON.stringify([...records])); } catch { /* Optional. */ }
        return { data, stale: Boolean(data.stale) };
      } catch (error) {
        if (existing) return { ...existing, stale: true };
        throw error;
      } finally { pending.delete(key); }
    });
    pending.set(key, work);
    return work;
  }
  return { peek, load };
}
