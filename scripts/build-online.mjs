import {spawnSync} from 'node:child_process';
import { checkNodeVersion } from './check-node-version.mjs';

checkNodeVersion();

// Explicit release configuration: do not inherit a local fixture's service URLs.
const api='https://api.kamitsubaki.wiki';
const env={...process.env,PUBLIC_SITE_URL:'https://kamitsubaki.wiki',PUBLIC_EDITOR_ENABLED:'true',PUBLIC_EDITOR_LOCAL:'false',
 PUBLIC_EDITOR_API_BASE:api,PUBLIC_ARTICLE_API_URL:api,PUBLIC_GALLERY_API_URL:api,PUBLIC_COMMUNITY_API_URL:api,
 PUBLIC_ARCHIVE_API_BASE:api,PUBLIC_AI_OBSERVER_API_BASE:api,PUBLIC_SUPPORT_API_BASE:api,PUBLIC_COLLABORATORS_API_BASE:api,
 PUBLIC_EVENTS_API_BASE:'https://kamitsubaki-events-api.apikatsuwiki.workers.dev'};
const build=spawnSync('pnpm',['build'],{env,stdio:'inherit'});
if(build.error)throw build.error;
if(build.status!==0)process.exit(build.status??1);
await import('./audit-online-build.mjs');
