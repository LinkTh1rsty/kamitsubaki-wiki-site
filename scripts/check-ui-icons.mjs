import {readdir,readFile} from 'node:fs/promises';
import {siteIcons} from '../src/lib/icons.mjs';
const root=new URL('../src/',import.meta.url);
const problems=[];let count=0;
async function scan(dir,path='') {
 for(const entry of await readdir(dir,{withFileTypes:true})){
  const name=path+entry.name,url=new URL(entry.name,dir);
  if(entry.isDirectory()){await scan(new URL(entry.name+'/',dir),name+'/');continue;}
  if(!/\.(astro|mjs|js|ts|css)$/.test(name))continue;
  const source=await readFile(url,'utf8');
  for(const match of source.matchAll(/<Icon\s+name="([^"]+)"/g)){count++;if(!siteIcons[match[1]])problems.push(`${name}: unknown icon ${match[1]}`);}
 }
}
await scan(root);

if(problems.length){console.error(problems.join('\n'));process.exitCode=1;}else console.log(`Icon audit passed: ${count} static icon references, ${Object.keys(siteIcons).length} selected Lucide icons.`);
