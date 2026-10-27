import {readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function savedArchiveSnapshots(current){
 const files=await readdir(resolve('public/api/archive/v1/snapshots'));
 return [...new Set([current,...files.filter(file=>/^[a-f0-9]{64}\.json$/.test(file)).map(file=>file.slice(0,-5))])].map(hash=>({hash,current:hash===current,url:'/api/archive/v1/snapshots/'+hash+'.json'}));
}
