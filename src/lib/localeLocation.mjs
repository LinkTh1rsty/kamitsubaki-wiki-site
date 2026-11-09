/** Keep runtime filters and the current anchor on a same-origin translation. */
export function preserveLocaleLocation(href, currentHref) {
  const current = new URL(currentHref);
  const target = new URL(href, current);
  if (target.origin !== current.origin) return href;
  const targetParams = new URLSearchParams(target.search);
  target.search = current.search;
  for (const key of new Set(targetParams.keys())) {
    target.searchParams.delete(key);
    for (const value of targetParams.getAll(key)) target.searchParams.append(key, value);
  }
  if (!target.hash) target.hash = current.hash;
  return target.pathname + target.search + target.hash;
}
