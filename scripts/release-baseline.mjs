import {execFileSync} from 'node:child_process';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function assertReleaseHead({head,remoteMain,branch,buildHead}) {
 if(branch!=='main')throw Error('Production release must use main. Merge feature branches first.');
 if(head!==remoteMain)throw Error('Production main moved or this checkout is stale. Reconcile before publishing.');
 if(buildHead && buildHead!==head)throw Error('Build source differs from the release commit. Rebuild before publishing.');
}
const git=(...args)=>execFileSync('git',['-c','core.fsmonitor=false',...args],{encoding:'utf8'}).trim();
export async function checkReleaseBaseline({final=false}={}) {
 const head=git('rev-parse','HEAD');
 const branch=process.env.CF_PAGES_BRANCH||git('branch','--show-current');
 const remoteMain=git('ls-remote','origin','refs/heads/main').split(/\s+/)[0];
 const buildHead=process.env.CF_PAGES_COMMIT_SHA||head;
 assertReleaseHead({head,remoteMain,branch,buildHead});
 if(git('status','--porcelain','--untracked-files=normal'))throw Error('Release checkout is dirty; commit all release inputs first.');
 if(final){
  const started=JSON.parse(await readFile('.local/release-start.json','utf8'));
  if(started.commit!==head)throw Error('Source changed during build.');
  await mkdir('dist/.well-known',{recursive:true});
  await writeFile('dist/.well-known/wiki-release.json',JSON.stringify({version:'3.3.0',commit:head,branch:'main',builtAt:new Date().toISOString(),includes:['account-20261011','gallery-icons-20261011','observer-projects-20261013','novel-editor-20261013','support-dialog-20261014']},null,2)+'\n');
 }else{
  await mkdir('.local',{recursive:true});
  await writeFile('.local/release-start.json',JSON.stringify({commit:head}));
 }
 console.log(`Production baseline verified: ${head}`);
 return head;
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)await checkReleaseBaseline({final:process.argv.includes('--final')});
