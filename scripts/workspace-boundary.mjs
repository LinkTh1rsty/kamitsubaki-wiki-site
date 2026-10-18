import { workspaceAccountRegistry } from '../src/lib/centralAccountOrigins.mjs';

// Development-only policy. No production/preview-server hooks are installed.
export default function workspaceBoundary() {
  return {
    name: 'workspace-local-boundary',
    configureServer(server) {
      if (process.env.WORKSPACE_ISOLATED !== 'true') return;
      const registry = workspaceAccountRegistry(process.env);
      if (!registry) throw new Error('Workspace requires PUBLIC_WORKSPACE_ISOLATED=true and exact service origins');
      const origins = Object.values(registry).join(' ');
      const sockets = Object.values(registry).map(origin => origin.replace('http:', 'ws:')).join(' ');
      const policy = [
        "default-src 'self'",
        `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${registry.api}`,
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
        `img-src 'self' data: blob: ${origins}`,
        "media-src 'self' blob:",
        "worker-src 'self' blob:",
        `connect-src 'self' ${origins} ${sockets}`,
        `form-action 'self' ${origins}`,
        `frame-src 'self' ${origins}`,
        "base-uri 'self'",
        "object-src 'none'",
      ].join('; ');
      server.middlewares.use((_request, response, next) => {
        response.setHeader('Content-Security-Policy', policy);
        response.setHeader('X-Workspace-Environment', 'isolated-local');
        next();
      });
    },
  };
}
