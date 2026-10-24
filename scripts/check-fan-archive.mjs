import {createEntitySchema} from '../src/lib/entitySchema.mjs';
import {getEntityRegistry} from '../src/lib/entityRegistry.mjs';
import {getArchiveSnapshot,archiveManifest} from '../src/lib/archiveSnapshot.mjs';
import {z} from 'astro/zod';
const registry=await getEntityRegistry(),schema=createEntitySchema(z),failures=[];
for(const translations of registry.entities.values())for(const entry of translations.values()){
 const result=schema.safeParse(entry.data);
 if(!result.success)failures.push({id:entry.data.id,locale:entry.data.locale,issues:result.error.issues});
}
const snapshot=await getArchiveSnapshot(),known=new Set(snapshot.entities.map(entity=>entity.id));
for(const edge of snapshot.relations)if(!known.has(edge.source) || !known.has(edge.target))failures.push({kind:'unresolved-relation',edge});
for(const entity of snapshot.entities)if(entity.image?.startsWith('/') && !entity.image.startsWith('/images/'))failures.push({kind:'unexpected-image-path',id:entity.id});
if(failures.length){console.error(JSON.stringify(failures,null,2));process.exitCode=1;}
else console.log(JSON.stringify({manifest:archiveManifest(snapshot),factDrift:snapshot.issues.filter(issue=>issue.kind==='fact-drift').length,sourcedClaims:snapshot.evidence.length,physicalItems:snapshot.physical.length},null,2));
