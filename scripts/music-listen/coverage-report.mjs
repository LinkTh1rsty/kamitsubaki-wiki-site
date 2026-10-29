import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {musicInventory} from './inventory.mjs';
import {checkMusicCatalog} from './check-catalog.mjs';

// Publish only public IDs and review outcomes, never raw provider responses or the private cache.
const source=readFileSync('src/data/music-listen.json','utf8'),catalog=JSON.parse(source);
const result=checkMusicCatalog(catalog);
if(result.errors.length)throw Error(result.errors.join('\n'));
const review=JSON.parse(readFileSync(process.argv[2],'utf8'));
const rows=musicInventory().rows,byId=new Map(rows.map(row=>[row.id,row]));
const unresolved=review.unresolved.filter(row=>!catalog.entries[row.id]).map(({id,reason})=>{
 const row=byId.get(id);
 if(!row)throw Error(`Unknown unresolved entry: ${id}`);
 return {id,kind:row.kind,title:row.title,artist:row.artist||row.performers[0],reason};
});
if(unresolved.length+result.entries!==rows.length)throw Error('Coverage does not account for every Wiki music entry');
const count=kind=>({total:rows.filter(r=>r.kind===kind).length,mapped:Object.values(catalog.entries).filter(r=>r.kind===kind).length});
writeFileSync('maintenance/music-listen-coverage.json',JSON.stringify({
 verifiedAt:review.verifiedAt||Object.values(catalog.entries).map(e=>e.verifiedAt).sort().at(-1),sourceSha256:createHash('sha256').update(source).digest('hex'),
 albums:count('album'),tracks:count('track'),identities:result.identities,
 unresolvedReasons:Object.fromEntries([...new Set(unresolved.map(r=>r.reason))].map(reason=>[reason,unresolved.filter(r=>r.reason===reason).length])),
 unresolved,
},null,2)+'\n');
console.log(JSON.stringify({mapped:result.entries,unresolved:unresolved.length,identities:result.identities}));
