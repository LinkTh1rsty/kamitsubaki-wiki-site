// Exact return registry from backend wrangler.toml. Keep the companion copy aligned.
export const centralAccountProductionOrigins=Object.freeze([
  'https://kamitsubaki.wiki',
  'https://chat.kamitsubaki.wiki',
  'https://kamitsubaki-companion.pages.dev',
  'https://kamitsubaki-companion-site.pages.dev',
  'https://zh.kamitsubaki.wiki',
  'https://en.kamitsubaki.wiki',
  'https://ja.kamitsubaki.wiki',
  'https://kamitsubaki.wiki.linkth1rsty.cc',
]);
const localApiOrigins=['http://127.0.0.1:8787','http://localhost:8787'];
const localReturnOrigins=['http://127.0.0.1:4322','http://localhost:4322','http://127.0.0.1:4321','http://localhost:4321'];
const previewApiOrigin='https://auth-preview.kamitsubaki.wiki';
const previewReturnOrigins=[previewApiOrigin,'https://wiki-auth-preview.kamitsubaki.wiki','https://chat-auth-preview.kamitsubaki.wiki'];
/** Only the coordinator's exact loopback origins are admitted in workspace mode. */
export function workspaceAccountRegistry(environment = import.meta.env) {
  if (environment?.PUBLIC_WORKSPACE_ISOLATED !== 'true') return null;
  const result = {};
  for (const [key, variable] of Object.entries({
    api: 'PUBLIC_WORKSPACE_API_ORIGIN',
    wiki: 'PUBLIC_WORKSPACE_WIKI_ORIGIN',
    companion: 'PUBLIC_WORKSPACE_COMPANION_ORIGIN',
  })) {
    const raw = environment[variable];
    let url;
    try { url = new URL(raw); } catch { throw new Error(`Missing workspace origin: ${variable}`); }
    if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || !url.port ||
        url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      throw new Error(`Invalid workspace loopback origin: ${variable}`);
    }
    result[key] = url.origin;
  }
  if (new Set(Object.values(result)).size !== 3) throw new Error('Workspace service origins must be distinct');
  return result;
}

function workspaceForAPI(apiBase, environment) {
  const registry = workspaceAccountRegistry(environment);
  if (registry) {
    let origin;
    try { const url = new URL(apiBase); if (!url.username && !url.password) origin = url.origin; } catch {}
    if (origin !== registry.api) throw new Error('API does not match the isolated workspace registry');
  }
  return registry;
}

/** @param {string} apiBase */
export function centralAccountReturnOrigins(apiBase, environment = import.meta.env) {
  const workspace = workspaceForAPI(apiBase, environment);
  if (workspace) return [workspace.wiki, workspace.companion];
  try { const origin = new URL(apiBase).origin; if (origin === previewApiOrigin) return [...previewReturnOrigins]; if (localApiOrigins.includes(origin)) return [...centralAccountProductionOrigins, ...localReturnOrigins]; } catch {}
  return [...centralAccountProductionOrigins];
}
/** Choose an explicitly registered frontend origin, never an arbitrary runtime host. */
export function centralAccountFrontendOrigin(apiBase, configuredOrigin, site = 'wiki', environment = import.meta.env) {
  const workspace = workspaceForAPI(apiBase, environment);
  if (workspace) return workspace[site === 'companion' ? 'companion' : 'wiki'];
  const allowed = centralAccountReturnOrigins(apiBase, environment);
  try { const url = new URL(configuredOrigin); if (!url.username && !url.password && allowed.includes(url.origin)) return url.origin; } catch {}
  if (allowed.includes(previewApiOrigin)) return `https://${site === 'companion' ? 'chat' : 'wiki'}-auth-preview.kamitsubaki.wiki`;
  return site === 'companion' ? 'https://chat.kamitsubaki.wiki' : 'https://kamitsubaki.wiki';
}
export function centralAccountReturnTo(raw, apiBase, locale = 'zh', site = 'wiki', environment = import.meta.env) {
  // Validate the registry before parsing an untrusted return URL; never swallow a configuration error.
  const allowed = centralAccountReturnOrigins(apiBase, environment);
  try { const url = new URL(raw); if (!url.username && !url.password && allowed.includes(url.origin)) return url.toString(); } catch {}
  return `${centralAccountFrontendOrigin(apiBase, null, site, environment)}/${locale}/`;
}

/** User-facing account routes stay on the primary website in production. */
export function centralAccountUIOrigin(apiBase, environment = import.meta.env) {
  const workspace = workspaceForAPI(apiBase, environment);
  if (workspace) return workspace.api;
  try { const origin = new URL(apiBase).origin; return origin === 'https://api.kamitsubaki.wiki' ? 'https://kamitsubaki.wiki' : origin; }
  catch { return 'https://kamitsubaki.wiki'; }
}
