import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {parse} from 'yaml';
import {classificationTree,classificationEntries,flattenClassification} from '../src/lib/classificationTree.mjs';
import {entityRoute} from '../src/lib/entityModel.mjs';
import {createEntitySchema} from '../src/lib/entitySchema.mjs';import {z} from 'astro/zod';
const records=new Map();
for(const collection of ['people','units','isotopes','songs','releases','projects','lives','organizations','lore','articles']) {
 const base=`src/content/${collection}`;
 if(!fs.existsSync(base))continue;
 for(const relative of fs.readdirSync(base,{recursive:true}).map(r=>r.split('\\').join('/'))) {
  if(!relative.endsWith('/zh.md'))continue;
  const raw=fs.readFileSync(`${base}/${relative}`,'utf8');const m=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);const data=parse(m[1]);records.set(data.id,{data});
 }
}
const registry={list:()=>[...records.values()],resolveEntity:id=>records.get(id)};
const nodes=flattenClassification();
test('explicit map entries resolve and all seven pillars retain their hierarchy',()=>{assert.equal(classificationTree.length,7);for(const n of nodes)for(const id of [...n.ids||[],...n.overviewIds||[]])assert.ok(records.has(id),`${n.id}: ${id}`);assert.equal(nodes.find(n=>n.id==='releases').children.length,5);assert.equal(nodes.find(n=>n.id==='glossary').children.length,4);});
test('solo list is exactly the approved 12, never inferred from performer roles',()=>{assert.deepEqual(classificationEntries(registry,nodes.find(n=>n.id==='solo'),'zh').map(e=>e.data.id),['kaf','rim','harusaruhi','isekaijoucho','koko','kaika','ciel','asu','aru','azsagawa','teresa','sooda']);});
test('Girls Revolution members live under their units in navigation and reader URLs',()=>{for(const [group,ids]of [['sinseiki',['orihime','kakyoin','garasumiya']],['tsumitobatsu',['mikoto','yunagi','hinageshi']]]){const node=nodes.find(n=>n.id===`group-${group}`);assert.deepEqual(node.ids,ids);for(const id of ids)assert.equal(entityRoute(records.get(id).data),`/database/artists/groups/${group}/members/${id}/`);}});
test('stub dates remain unknown while published records still require them',()=>{const schema=createEntitySchema(z);const stub={schemaVersion:2,id:'test-live',locale:'zh',entityType:'live-event',name:'Test',eventType:'event',headliners:[],contentStatus:'stub'};assert.ok(schema.safeParse(stub).success);assert.equal(schema.safeParse({...stub,contentStatus:'published'}).success,false);});
