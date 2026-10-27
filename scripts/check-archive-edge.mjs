import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {archiveFixture} from '../tests/helpers/archive-fixture.mjs';
import {emptyObservatory,upsertObservation} from '../src/lib/archivePersonal.mjs';
const require=createRequire(import.meta.url);
const {Miniflare,convertV4MiniflareOptions}=require(resolve(process.env.ARCHIVE_QA_RUNTIME || '.local/browser-qa/node_modules','miniflare'));
const snapshot=archiveFixture();
const mf=new Miniflare(convertV4MiniflareOptions({workers:[{name:'archive',modules:true,scriptPath:'.local/archive-functions-build/index.js',compatibilityDate:'2026-10-13',compatibilityFlags:['nodejs_compat'],d1Databases:{ARCHIVE_DB:'archive-test'},serviceBindings:{
 ARCHIVE_ACCOUNT:async request=>Response.json({viewer:{kind:'user',userId:request.headers.get('Cookie') || 'alice',displayName:'Test observer',roles:[]}}),
 ASSETS:async request=>Response.json({version:1,snapshot:'fixture',records:new URL(request.url).pathname.includes('events')?snapshot.events:snapshot.entities}),
}}]}));
try{
 const db=await mf.getD1Database('ARCHIVE_DB');
 const sql=await readFile('migrations/archive/0001_community.sql','utf8');
 for(const statement of sql.split(';').map(s=>s.replace(/^--.*$/gm,'').trim()).filter(Boolean))await db.prepare(statement).run();
 const call=async(path,method='GET',body,who='alice',origin='http://localhost')=>{
  const response=await mf.dispatchFetch('http://localhost/api/archive/community/'+path,{method,headers:{Origin:origin,Cookie:who,'Content-Type':'application/json'},body:['GET','DELETE'].includes(method)?undefined:JSON.stringify(body)});
  return {status:response.status,data:await response.json()};
 };
 assert.equal((await call('status')).data.configured,true);
 const data=upsertObservation(emptyObservatory(),{kind:'visited',entityId:'live-a',visibility:'public',note:'Shared memory'});
 assert.equal((await call('me','PUT',{revision:0,data})).status,200);
 assert.equal((await call('witnesses/live-a')).data.witnesses[0].record.note,'Shared memory');
 assert.equal((await call('me','PUT',{revision:0,data})).status,409);
 assert.equal((await call('me','GET',undefined,'bob')).data.data.records.length,0);
 assert.equal((await call('me','PUT',{revision:1,data},'alice','http://evil.test')).status,403);
 const claim={entityId:'song-a',field:'sources',snapshot:'fixture'};
 const race=await Promise.all([call('tasks/song-a%3Asources/claim','POST',claim,'alice'),call('tasks/song-a%3Asources/claim','POST',claim,'bob')]);
 assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
 const room=(await call('rooms','POST',{title:'Runtime test'})).data;
 assert.equal((await call('rooms/'+room.id+'/join','POST',{},'bob')).status,200);
 assert.equal((await call('rooms/'+room.id+'/position','PUT',{entityId:'song-a',revision:1},'bob')).status,403);
 assert.equal((await call('rooms/'+room.id+'/position','PUT',{entityId:'song-a',revision:1})).status,200);
 assert.equal((await call('rooms/'+room.id,'GET',undefined,'bob')).data.position.entityId,'song-a');
 console.log('PASS: workerd + D1 runtime; privacy, CSRF, revisions, competing claims and host synchronization. Local identity binding is a fixture.');
}finally{await mf.dispose();}
