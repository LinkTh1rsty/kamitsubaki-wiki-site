import {readdirSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';

import {backendReady,backendRoot} from '../tests/backend-root.mjs';
const crossRepo=new Set([
  'creator-workflow-integration.test.mjs',
  'article-associations.test.mjs',
  'content-layout.test.mjs',
  'entity-maintenance.test.mjs',
  'community-locations.test.mjs',
]);
const files=readdirSync('tests')
  .filter(file=>file.endsWith('.test.mjs')&&(backendReady||!crossRepo.has(file))&&(file!=='community-locations.test.mjs'||existsSync(resolve(backendRoot,'src/community/locationRuntime.generated.js'))))
  .sort()
  .map(file=>resolve('tests',file));
if(!backendReady){
  console.log('Backend checkout unavailable; skipping cross-repository tests. Run pnpm test beside the backend checkout for the complete suite.');
}
const concurrency=process.env.WIKI_TEST_CONCURRENCY;
if(concurrency&&!/^[1-9]\d*$/.test(concurrency))throw Error('WIKI_TEST_CONCURRENCY must be a positive integer');
const result=spawnSync(process.execPath,['--test',...(concurrency?['--test-concurrency='+concurrency]:[]),...files],{stdio:'inherit'});
process.exitCode=result.status??1;
