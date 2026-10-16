import {readdir,readFile} from 'node:fs/promises';
import {siteIcons} from '../src/lib/icons.mjs';
const root=new URL('../src/',import.meta.url);
// archiveChart contains documented data visualization primitives, with no interface icons.
const exceptions=new Set(['components/Icon.astro','components/ProviderIcon.astro','components/ContactIcon.astro','components/PlatformIcon.astro','components/Hero.astro','pages/[locale]/explore/[section].astro','lib/icons.mjs','lib/archiveChart.mjs','scripts/siteInteractions.js','scripts/labsApp.js','backend/generatedUiIcons.js','backend/adminBrand.js']);
const problems=[];let count=0;
async function scan(dir,path='') {
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const name=path+entry.name,url=new URL(entry.name,dir);
  if(entry.isDirectory()){await scan(new URL(entry.name+'/',dir),name+'/');continue;}
  if(!/\.(astro|mjs|js|ts|css)$/.test(name))continue;
  const source=await readFile(url,'utf8');
  if((/<svg\b/.test(source)||/createElementNS/.test(source))&&!exceptions.has(name))problems.push(`${name}: inline SVG outside the icon library or documented artwork`);
  if(!exceptions.has(name)&&/data:image\/svg\+xml[^\n]*(?:%3Cpath|<path)/.test(source))problems.push(`${name}: hand-drawn CSS SVG`);
  for(const match of source.matchAll(/<Icon\s+name="([^"]+)"/g)){count++;if(!siteIcons[match[1]])problems.push(`${name}: unknown icon ${match[1]}`);}
  if(/<[a-z][^>]*>\s*[↗⤢✎▧]\s*<\//.test(source))problems.push(`${name}: glyph used as an interface icon`);
 }
}
await scan(root);

if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log(`Icon audit passed: ${count} static icon references, ${Object.keys(siteIcons).length} selected Lucide icons.`);
