import {readFile,readdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,relative} from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import YAML from 'yaml';
import {createHash} from 'node:crypto';
import {entityCollections,entityRoute} from '../src/lib/entityModel.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),backend=process.argv[process.argv.indexOf('--backend')+1];
if(!backend||!process.argv.includes('--backend'))throw Error('Explicit isolated backend path required.');
async function walk(dir){const result=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);if(entry.isDirectory())result.push(...await walk(path));else if(/\/(zh|ja|en)\.md$/.test(path))result.push(path);}return result;}
const entries=[];
for(const collection of entityCollections){for(const path of (await walk(resolve(root,'src/content',collection))).sort()){
 const source=await readFile(path,'utf8'),match=source.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---/);if(!match)continue;
 const data=YAML.parse(match[1]);if(data.schemaVersion!==2)continue;
 const keys=['schemaVersion','id','entityType','locale','name','title','summary','romanizedName','romanizedTitle','aliases','roles','classification','lifecycle','articleCategory','presentation','performers','primaryArtist','relations','credits','affiliations','tracks','setlist','headliners','guestPerformers','relatedEntities','label','parentOrg','organizer','belongToUniverse','legacy'];
 const metadata=Object.fromEntries(keys.filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));
 if(entityRoute(metadata)!==entityRoute(data))throw Error('Shared preview lost canonical navigation metadata: '+relative(root,path));
 entries.push({filePath:relative(root,path),data:metadata,body:''});
}}
const redirects=JSON.parse(await readFile(resolve(root,'src/data/entity-redirects.json'),'utf8'));
const require=createRequire(import.meta.url),{build}=createRequire(require.resolve('vite/package.json'))('esbuild');
const result=await build({stdin:{contents:'import {createEditorPreview} from "./src/lib/editorDocumentPreview.mjs";export const renderEditorPreview=createEditorPreview('+JSON.stringify(entries)+','+JSON.stringify(redirects)+');',resolveDir:root,sourcefile:'editor-preview-entry.mjs'},bundle:true,platform:'node',mainFields:['module','main'],plugins:[{name:'worker-yaml',setup(plugin){plugin.onResolve({filter:/^yaml$/},()=>({path:resolve(root,'node_modules/yaml/browser/index.js')}));}}],format:'esm',minify:true,write:false,legalComments:'inline'});
const target=resolve(backend,'src/generated/editorPreviewRuntime.js'),output='// Generated from the shared Wiki reader and public entity metadata.\n'+result.outputFiles[0].text;
if(process.argv.includes('--check')){if(await readFile(target,'utf8')!==output)throw Error('Editor preview runtime differs.');}else {await writeFile(target,output);await writeFile(resolve(backend,'src/generated/editorPreviewManifest.json'),JSON.stringify({version:'3.1.0',entityRecords:entries.length,runtimeSha256:createHash('sha256').update(output).digest('hex'),publicMetadataSha256:createHash('sha256').update(JSON.stringify(entries)).digest('hex'),redirectsSha256:createHash('sha256').update(JSON.stringify(redirects)).digest('hex')},null,2)+'\n');}
const css=await readFile(resolve(root,'src/styles/speech.css'),'utf8');
const styleTarget=resolve(backend,'admin-ui/src/editor/speechPreviewStyle.ts');
const styleOutput=execFileSync(resolve(backend,'node_modules/.bin/biome'),['format','--stdin-file-path',styleTarget],{cwd:backend,encoding:'utf8',input:'// Generated from Wiki src/styles/speech.css.\nexport const speechPreviewStyle = '+JSON.stringify(css)+';\n'});
if(process.argv.includes('--check')){if(await readFile(styleTarget,'utf8')!==styleOutput)throw Error('Editor speech preview style differs.');}else await writeFile(styleTarget,styleOutput);
console.log('Shared editor preview:',entries.length,'records,',output.length,'bytes');
