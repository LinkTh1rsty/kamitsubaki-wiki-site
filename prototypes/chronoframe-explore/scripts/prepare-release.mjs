import {execFileSync} from 'node:child_process'
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const cwd=fileURLToPath(new URL('..',import.meta.url))
const git=(...args)=>execFileSync('git',args,{cwd,encoding:'utf8'}).trim()
const revision=git('rev-parse','HEAD'),tree=git('rev-parse','HEAD^{tree}')
if(git('status','--porcelain','--untracked-files=normal'))throw new Error('Release preparation requires a clean committed worktree')
const config=JSON.parse(await readFile(new URL('../.output/server/wrangler.json',import.meta.url),'utf8'))
Object.assign(config,{
 account_id:'7783e8de80b4858d8287a2d371fee913',
 workers_dev:false,preview_urls:false,
 routes:[{pattern:'kamitsubaki.wiki/visuals',zone_name:'kamitsubaki.wiki'},{pattern:'kamitsubaki.wiki/visuals/*',zone_name:'kamitsubaki.wiki'}],
 observability:{enabled:false},
})
if(config.name!=='kamitsubaki-visual-roam')throw new Error('Unexpected Worker target')
const marker={version:'0.1.0',revision,tree,source:`https://github.com/LinkTh1rsty/kamitsubaki-wiki-site/tree/${revision}/prototypes/chronoframe-explore`}
const target=new URL('../.output/public/visuals/.well-known/',import.meta.url)
await mkdir(target,{recursive:true})
await writeFile(new URL('visual-roam-release.json',target),JSON.stringify(marker,null,2)+'\n')
await writeFile(new URL('../.output/server/wrangler.production.json',import.meta.url),JSON.stringify(config,null,2)+'\n')
console.log(JSON.stringify({...marker,configSha256:createHash('sha256').update(JSON.stringify(config)).digest('hex'),routes:config.routes},null,2))
console.log('Prepared local artifacts only. Deploy only after approval of the fixed release manifest.')
