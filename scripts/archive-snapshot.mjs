import {mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {getArchiveSnapshot,archiveDigest} from '../src/lib/archiveSnapshot.mjs';
const folder=resolve('public/api/archive/v1/snapshots');
if(process.argv.includes('--check')){
 let files=[];try{files=await readdir(folder);}catch(error){if(error.code!=='ENOENT')throw error;}
 for(const file of files.filter(file=>/^[a-f0-9]{64}\.json$/.test(file))){
  const data=JSON.parse(await readFile(join(folder,file),'utf8')),{snapshot,...payload}=data;
  if(snapshot!==file.slice(0,-5) || archiveDigest(payload)!==snapshot)throw Error('Modified immutable snapshot: '+file);
 }
 console.log('Immutable archive snapshots checked: '+files.length);
}else{
 const snapshot=await getArchiveSnapshot(),path=join(folder,snapshot.snapshot+'.json'),bytes=JSON.stringify(snapshot);
 await mkdir(folder,{recursive:true});
 try{await writeFile(path,bytes+'\n',{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;if((await readFile(path,'utf8')).trim()!==bytes)throw Error('Snapshot hash collision or modified artifact');}
 console.log('Archive snapshot saved: '+snapshot.snapshot);
}
