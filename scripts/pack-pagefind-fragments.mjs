import {mkdir, readdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

// Preserve Pagefind's original URLs and bytes while keeping the complete five
// language site below Pages' file limit. Public, content-hashed fragments only.
export async function packPagefindFragments(directory, locales){
 let fragments=0,packs=0;
 for(const locale of locales){
  const source=join(directory,'pagefind',locale,'fragment');
  const groups=new Map();
  for(const name of (await readdir(source)).sort()){
   const match=/^(?:zh|ja|en)_([a-f0-9]{7,64})\.pf_fragment$/.exec(name);
   if(!match)throw Error('Unexpected Pagefind fragment name: '+name);
   const group=match[1].slice(0,1),entries=groups.get(group)||Object.create(null);
   entries[name]=(await readFile(join(source,name))).toString('base64');
   groups.set(group,entries);fragments++;
  }
  const target=join(directory,'pagefind-packs',locale);
  await mkdir(target,{recursive:true});
  for(const [group,entries] of groups){
   const content=JSON.stringify(entries);
   if(Buffer.byteLength(content)>1024*1024)throw Error('Pagefind pack exceeds its response budget.');
   await writeFile(join(target,group+'.json'),content);packs++;
  }
  // Remove originals only after every replacement has been written.
  await rm(source,{recursive:true});
 }
 return {fragments,packs};
}
