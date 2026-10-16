import {readBoundedJson} from '../../src/lib/boundedJson.mjs';
import {validateObservatory,emptyObservatory} from '../../src/lib/archivePersonal.mjs';
import {stableIdPattern} from '../../src/lib/entityContract.mjs';

const failure=(code,status=400)=>Object.assign(new Error(code),{status});
const text=(value,max,required=false)=>{
 if(typeof value!=='string' || value.length>max || required && !value.trim())throw failure('invalid_text');
 return value.trim();
};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const writable=new Set(['POST','PUT','DELETE']);
const reviewer=(viewer,env={})=>Array.isArray(viewer.roles) && viewer.roles.some(role=>['archive-reviewer','admin'].includes(role)) || String(env.ARCHIVE_REVIEWER_IDS || '').split(',').map(id=>id.trim()).filter(Boolean).includes(viewer.userId);
const requireReviewer=(viewer,env)=>{if(!reviewer(viewer,env))throw failure('reviewer_required',403);};
const publicCollection=row=>({id:row.id,title:row.title,description:row.description,kind:row.kind,items:JSON.parse(row.items),status:row.status,revision:row.revision,forked_from:row.forked_from,created_at:row.created_at,updated_at:row.updated_at});
function proofURL(value) {
 let url;try{url=new URL(text(value,1000,true));}catch{throw failure('invalid_proof');}
 if(url.protocol!=='https:' || url.username || url.password)throw failure('invalid_proof');
 return url.href;
}
async function authenticate(context) {
 if(!context.env.ARCHIVE_ACCOUNT)throw failure('identity_service_unavailable',503);
 const headers=new Headers({Accept:'application/json'});
 for(const key of ['Cookie','Authorization','Origin'])if(context.request.headers.has(key))headers.set(key,context.request.headers.get(key));
 const response=await context.env.ARCHIVE_ACCOUNT.fetch(new Request('https://api.kamitsubaki.wiki/api/account-auth/me',{headers,signal:AbortSignal.timeout(8000)}));
 if(!response.ok)throw failure(response.status===401?'sign_in_required':'identity_service_unavailable',response.status===401?401:503);
 const data=await readBoundedJson(response,32768),viewer=data.viewer;
 if(viewer?.kind!=='user' || typeof viewer.userId!=='string' || !viewer.userId || viewer.userId.length>200)throw failure('sign_in_required',401);
 return viewer;
}
async function catalogue(context) {
 const url=new URL('/api/archive/v1/entities.json',context.request.url);
 const response=await context.env.ASSETS.fetch(new Request(url));
 if(!response.ok)throw failure('catalogue_unavailable',503);
 const data=await readBoundedJson(response,12*1024*1024);
 if(data.version!==1 || !Array.isArray(data.records))throw failure('catalogue_unavailable',503);
 return {snapshot:data.snapshot,entities:new Map(data.records.map(e=>[e.id,e]))};
}
async function eventCatalogue(context) {
 const response=await context.env.ASSETS.fetch(new Request(new URL('/api/archive/v1/events.json',context.request.url)));
 if(!response.ok)throw failure('catalogue_unavailable',503);
 const data=await readBoundedJson(response,3*1024*1024);
 if(data.version!==1 || !Array.isArray(data.records))throw failure('catalogue_unavailable',503);
 return new Set(data.records.map(event=>event.id));
}
function validateCollection(body,catalogue) {
 const title=text(body.title,120,true),description=text(body.description || '',3000);
 if(!['collection','exhibition'].includes(body.kind) || !['draft','publish'].includes(body.action) || !Array.isArray(body.items) || body.items.length<1 || body.items.length>100)throw failure('invalid_collection');
 const seen=new Set(),items=body.items.map(item=>{
  if(!item || typeof item!=='object' || !catalogue.entities.has(item.entityId) || seen.has(item.entityId))throw failure('invalid_entity');
  seen.add(item.entityId);
  return {entityId:item.entityId,note:text(item.note || '',2000)};
 });
 return {title,description,kind:body.kind,items:JSON.stringify(items),status:body.action==='draft'?'draft':body.kind==='exhibition'?'pending':'published'};
}
function validTask(body,catalogue) {
 const entity=catalogue.entities.get(body.entityId),field=body.field,locale=body.locale || '';
 if(!entity || body.snapshot!==catalogue.snapshot)throw failure('stale_catalogue',409);
 if(field==='translation'){
  if(!['zh','ja','en'].includes(locale) || entity.narratives[locale])throw failure('not_a_missing_field',409);
 }else if(locale || !entity.completeness?.missing?.some(item=>item.field===field))throw failure('not_a_missing_field',409);
 return {entityId:entity.id,field,locale,id:entity.id+':'+field+(locale?':'+locale:'')};
}
const queryOne=(db,sql,...args)=>db.prepare(sql).bind(...args).first();
const queryAll=async(db,sql,...args)=>(await db.prepare(sql).bind(...args).all()).results;
const run=(db,sql,...args)=>db.prepare(sql).bind(...args).run();
async function audit(db,viewer,action,target,revision=null,note='') {
 await run(db,'INSERT INTO archive_audit(id,actor,action,target,revision,note,created_at) VALUES(?,?,?,?,?,?,?)',crypto.randomUUID(),viewer.userId,action,target,revision,note,Date.now());
}
export async function handleArchiveCommunity(context) {
 try {
  const request=context.request,method=request.method;
  const rawRoute=context.params.route || [];
  let parts;try{parts=(Array.isArray(rawRoute)?rawRoute:rawRoute.split('/')).filter(Boolean).map(decodeURIComponent);}catch{throw failure('invalid_path');}
  const db=context.env.ARCHIVE_DB,now=Date.now();
  if(method==='GET' && parts[0]==='status')return json({configured:Boolean(db && context.env.ARCHIVE_ACCOUNT),version:1});
  if(!db || !context.env.ARCHIVE_ACCOUNT)throw failure('community_unavailable',503);
  if(writable.has(method)){
   const allowedOrigins=new Set([new URL(request.url).origin,...String(context.env.ARCHIVE_ALLOWED_ORIGINS || '').split(',').map(value=>value.trim()).filter(Boolean)]);
   if(!allowedOrigins.has(request.headers.get('Origin')))throw failure('invalid_origin',403);
   if(!request.headers.get('Content-Type')?.startsWith('application/json') && method!=='DELETE')throw failure('invalid_content_type',415);
   if(Number(request.headers.get('Content-Length') || 0)>500000)throw failure('body_too_large',413);
  }
  let body=null;
  if(writable.has(method) && method!=='DELETE')try{body=await readBoundedJson(request,500000);}catch(error){throw failure(error.message==='Response too large'?'body_too_large':'invalid_json',error.message==='Response too large'?413:400);}
  if(writable.has(method) && method!=='DELETE' && (!body || typeof body!=='object' || Array.isArray(body)))throw failure('invalid_json');
  // Public listings never authenticate or reveal drafts, owner IDs, audit actors or private profiles.
  if(method==='GET' && parts[0]==='collections' && !parts[1]){
   const rows=await queryAll(db,"SELECT id,title,description,kind,items,status,revision,forked_from,created_at,updated_at FROM archive_collections WHERE status='published' ORDER BY updated_at DESC LIMIT 100");
   return json({collections:rows.map(publicCollection)});
  }
  if(method==='GET' && parts[0]==='collections' && parts[1] && !parts[2]){
   const published=await queryOne(db,"SELECT * FROM archive_collections WHERE id=? AND status='published'",parts[1]);
   if(published)return json({collection:publicCollection(published)});
  }
  if(method==='GET' && parts[0]==='passports' && parts[1]){
   const profile=await queryOne(db,'SELECT data,public_id FROM archive_profiles WHERE public_id=?',parts[1]);
   const data=profile?JSON.parse(profile.data):null;
   if(!data?.passport?.published)throw failure('not_found',404);
   return json({id:profile.public_id,passport:data.passport,records:data.records.filter(record=>record.visibility==='public')});
  }
  if(method==='GET' && parts[0]==='witnesses' && parts[1]){
   const cat=await catalogue(context);
   if(cat.entities.get(parts[1])?.type!=='live-event')throw failure('invalid_entity');
   const rows=await queryAll(db,"SELECT p.public_id,p.data,j.value AS record FROM archive_profiles p JOIN json_each(p.data,'$.records') j WHERE json_extract(j.value,'$.kind')='visited' AND json_extract(j.value,'$.visibility')='public' AND json_extract(j.value,'$.entityId')=? ORDER BY json_extract(j.value,'$.at') DESC LIMIT 100",parts[1]);
   return json({witnesses:rows.map(row=>{const passport=JSON.parse(row.data).passport;return {record:JSON.parse(row.record),...(passport.published?{passportId:row.public_id,name:passport.name}:{})};})});
  }
  const viewer=await authenticate(context),owner=viewer.userId;
  if(body?.accountId && body.accountId!==owner)throw failure('account_changed',409);
  if(parts[0]==='me'){
   if(method==='GET'){
    const profile=await queryOne(db,'SELECT data,revision,public_id FROM archive_profiles WHERE owner=?',owner);
    const collections=await queryAll(db,'SELECT * FROM archive_collections WHERE owner=? ORDER BY updated_at DESC LIMIT 100',owner);
    const tasks=await queryAll(db,'SELECT * FROM archive_tasks WHERE owner=? ORDER BY updated_at DESC LIMIT 100',owner);
    const follows=await queryAll(db,'SELECT collection_id FROM archive_follows WHERE owner=?',owner);
    const calendar=Object.fromEntries(new Intl.DateTimeFormat('en',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit'}).formatToParts(new Date(now)).filter(part=>['year','month'].includes(part.type)).map(part=>[part.type,part.value]));
    const month=calendar.year+'-'+calendar.month,start=Date.UTC(Number(calendar.year),Number(calendar.month)-1,1)-9*3600000,end=Date.UTC(Number(calendar.year),Number(calendar.month),1)-9*3600000;
    const counts=await queryAll(db,"SELECT status,count(*) AS total,sum(CASE WHEN updated_at>=? AND updated_at<? THEN 1 ELSE 0 END) AS monthly FROM archive_tasks WHERE owner=? GROUP BY status",start,end,owner),approved=counts.find(row=>row.status==='approved');
    const contributions={approved:Number(approved?.total || 0),month:{id:month,approved:Number(approved?.monthly || 0)}};
    return json({data:profile?JSON.parse(profile.data):emptyObservatory(),revision:profile?.revision || 0,publicId:profile?.public_id || null,collections:collections.map(publicCollection),tasks,follows:follows.map(f=>f.collection_id),reviewer:reviewer(viewer,context.env),contributions});
   }
   if(method==='PUT'){
    let data;try{data=validateObservatory(body.data);}catch{throw failure('invalid_observatory');}
    const revision=body.revision;
    if(!Number.isSafeInteger(revision) || revision<0)throw failure('invalid_revision');
    const cat=await catalogue(context);
    let physical=[];
    if(data.records.some(record=>record.kind==='owned' && record.editionId && !record.editionId.includes(':'))){
     const response=await context.env.ASSETS.fetch(new Request(new URL('/api/archive/v1/physical.json',request.url)));
     if(!response.ok)throw failure('catalogue_unavailable',503);
     physical=(await readBoundedJson(response,1000000)).records || [];
    }
    for(const record of data.records){
     const entity=cat.entities.get(record.entityId);
     if(!entity || record.kind==='heard' && entity.type!=='work-track' || record.kind==='visited' && entity.type!=='live-event')throw failure('invalid_entity');
     if(record.kind==='owned'){
      const edition=(entity.facts.editions || []).find(item=>entity.id+':'+item.id===record.editionId);
      const item=physical.find(item=>item.id===record.editionId && item.relatedEntities?.includes(entity.id));
      if(record.editionId && !edition && !item || !record.editionId && entity.type!=='work-release')throw failure('invalid_edition');
      if(record.barcode && (edition || item)?.barcode!==record.barcode)throw failure('invalid_barcode');
     }
    }
    const current=await queryOne(db,'SELECT revision FROM archive_profiles WHERE owner=?',owner);
    if(!current && revision!==0 || current && current.revision!==revision)throw failure('profile_conflict',409);
    for(const interest of data.interests)if(!cat.entities.has(interest))throw failure('invalid_interest');
    const result=await run(db,'INSERT INTO archive_profiles(owner,public_id,data,revision,updated_at) VALUES(?,?,?,1,?) ON CONFLICT(owner) DO UPDATE SET data=excluded.data,revision=archive_profiles.revision+1,updated_at=excluded.updated_at WHERE archive_profiles.revision=?',owner,crypto.randomUUID(),JSON.stringify(data),now,revision);
    if(!result.meta.changes)throw failure('profile_conflict',409);
    return json({data,revision:revision+1,publicId:(await queryOne(db,'SELECT public_id FROM archive_profiles WHERE owner=?',owner)).public_id});
   }
  }
  if(parts[0]==='reviews' && method==='GET'){
   requireReviewer(viewer,context.env);
   const collections=await queryAll(db,"SELECT * FROM archive_collections WHERE status='pending' AND owner<>? ORDER BY updated_at ASC LIMIT 100",owner);
   return json({collections:collections.map(publicCollection)});
  }
  if(parts[0]==='collections'){
   const id=parts[1],action=parts[2];
   if(method==='POST' && !id){
    if((await queryOne(db,'SELECT count(*) AS n FROM archive_collections WHERE owner=?',owner)).n>=100)throw failure('collection_limit',429);
    const value=validateCollection(body,await catalogue(context)),newId=crypto.randomUUID();
    await run(db,'INSERT INTO archive_collections(id,owner,title,description,kind,items,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)',newId,owner,value.title,value.description,value.kind,value.items,value.status,now,now);
    await audit(db,viewer,'collection-created',newId,1);
    return json({collection:publicCollection(await queryOne(db,'SELECT * FROM archive_collections WHERE id=?',newId))},201);
   }
   const row=id?await queryOne(db,'SELECT * FROM archive_collections WHERE id=?',id):null;
   if(!row)throw failure('not_found',404);
   if(row.owner!==owner && row.status!=='published' && !(row.status==='pending' && reviewer(viewer,context.env)))throw failure('not_found',404);
   if(method==='GET')return json({collection:publicCollection(row)});
   if(method==='POST' && action==='fork'){
    if(row.status!=='published' && row.owner!==owner)throw failure('not_found',404);
    if((await queryOne(db,'SELECT count(*) AS n FROM archive_collections WHERE owner=?',owner)).n>=100)throw failure('collection_limit',429);
    const fork=crypto.randomUUID();
    await run(db,"INSERT INTO archive_collections(id,owner,title,description,kind,items,status,forked_from,created_at,updated_at) VALUES(?,?,?,?,?,?,'draft',?,?,?)",fork,owner,row.title,row.description,row.kind,row.items,id,now,now);
    return json({collection:publicCollection(await queryOne(db,'SELECT * FROM archive_collections WHERE id=?',fork))},201);
   }
   if(method==='POST' && action==='follow'){
    if(row.status!=='published')throw failure('not_found',404);
    if(body.follow===false)await run(db,'DELETE FROM archive_follows WHERE owner=? AND collection_id=?',owner,id);
    else await run(db,'INSERT OR IGNORE INTO archive_follows(owner,collection_id) VALUES(?,?)',owner,id);
    return json({followed:body.follow!==false});
   }
   if(method==='POST' && action==='review'){
    requireReviewer(viewer,context.env);
    if(row.owner===owner)throw failure('self_review_forbidden',403);
    if(row.status!=='pending' || !['approve','reject'].includes(body.action) || body.revision!==row.revision)throw failure('collection_conflict',409);
    const note=text(body.note || '',2000,true),status=body.action==='approve'?'published':'rejected';
    const result=await run(db,"UPDATE archive_collections SET status=?,reviewer=?,review_note=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? AND status='pending'",status,owner,note,now,id,body.revision);
    if(!result.meta.changes)throw failure('collection_conflict',409);
    await audit(db,viewer,'collection-'+body.action,id,row.revision+1,note);
    return json({collection:publicCollection(await queryOne(db,'SELECT * FROM archive_collections WHERE id=?',id))});
   }
   if(row.owner!==owner)throw failure('owner_required',403);
   if(method==='PUT'){
    if(body.revision!==row.revision)throw failure('collection_conflict',409);
    const value=validateCollection(body,await catalogue(context));
    const result=await run(db,'UPDATE archive_collections SET title=?,description=?,kind=?,items=?,status=?,reviewer=NULL,review_note=NULL,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=?',value.title,value.description,value.kind,value.items,value.status,now,id,owner,body.revision);
    if(!result.meta.changes)throw failure('collection_conflict',409);
    await audit(db,viewer,'collection-updated',id,row.revision+1);
    return json({collection:publicCollection(await queryOne(db,'SELECT * FROM archive_collections WHERE id=?',id))});
   }
   if(method==='DELETE'){await run(db,'DELETE FROM archive_collections WHERE id=? AND owner=?',id,owner);return json({deleted:true});}
  }
  if(parts[0]==='tasks'){
   if(method==='GET' && !parts[1]){
    const rows=await queryAll(db,"SELECT id,entity_id,field,locale,status,expires_at,updated_at FROM archive_tasks WHERE status IN ('submitted','approved') OR expires_at>? ORDER BY updated_at DESC LIMIT 500",now);
    const reviews=reviewer(viewer,context.env)?await queryAll(db,"SELECT * FROM archive_tasks WHERE status='submitted' ORDER BY updated_at ASC LIMIT 100"):[];
    return json({tasks:rows,reviews});
   }
   const id=parts[1],action=parts[2];
   if(method==='POST' && action==='claim'){
    const task=validTask(body,await catalogue(context));
    if(id!==task.id)throw failure('invalid_task');
    if((await queryOne(db,"SELECT count(*) AS n FROM archive_tasks WHERE owner=? AND status IN ('claimed','submitted') AND expires_at>?",owner,now)).n>=10)throw failure('claim_limit',429);
    const result=await run(db,"INSERT INTO archive_tasks(id,entity_id,field,locale,owner,status,snapshot,claimed_at,expires_at,updated_at) VALUES(?,?,?,?,?,'claimed',?,?,?,?) ON CONFLICT(id) DO UPDATE SET owner=excluded.owner,status='claimed',snapshot=excluded.snapshot,proof_url=NULL,reviewer=NULL,review_note=NULL,claimed_at=excluded.claimed_at,expires_at=excluded.expires_at,updated_at=excluded.updated_at WHERE archive_tasks.status IN ('claimed','rejected') AND archive_tasks.expires_at<?",id,task.entityId,task.field,task.locale,owner,body.snapshot,now,now+7*86400000,now,now);
    if(!result.meta.changes)throw failure('task_already_claimed',409);
    return json({id,status:'claimed'});
   }
   const task=await queryOne(db,'SELECT * FROM archive_tasks WHERE id=?',id);
   if(!task)throw failure('not_found',404);
   if(method==='POST' && action==='review'){
    requireReviewer(viewer,context.env);
    if(task.owner===owner)throw failure('self_review_forbidden',403);
    if(task.status!=='submitted' || !['approve','reject'].includes(body.action))throw failure('task_conflict',409);
    const note=text(body.note || '',2000,true),status=body.action==='approve'?'approved':'rejected';
    const result=await run(db,"UPDATE archive_tasks SET status=?,reviewer=?,review_note=?,updated_at=?,expires_at=? WHERE id=? AND status='submitted'",status,owner,note,now,status==='rejected'?now:task.expires_at,id);
    if(!result.meta.changes)throw failure('task_conflict',409);
    await audit(db,viewer,'task-'+body.action,id,null,note);
    return json({id,status});
   }
   if(task.owner!==owner)throw failure('owner_required',403);
   if(method==='POST' && action==='submit'){
    if(task.status!=='claimed' || task.expires_at<now)throw failure('task_conflict',409);
    const proof=proofURL(body.proofUrl);
    const result=await run(db,"UPDATE archive_tasks SET status='submitted',proof_url=?,updated_at=? WHERE id=? AND owner=? AND status='claimed' AND expires_at>?",proof,now,id,owner,now);
    if(!result.meta.changes)throw failure('task_conflict',409);
    return json({id,status:'submitted'});
   }
   if(method==='DELETE'){
    if(task.status!=='claimed' && task.status!=='rejected')throw failure('task_conflict',409);
    await run(db,"DELETE FROM archive_tasks WHERE id=? AND owner=? AND status IN ('claimed','rejected')",id,owner);return json({released:true});
   }
  }
  if(parts[0]==='rooms'){
   const id=parts[1],action=parts[2];
   if(method==='POST' && !id){
    if((await queryOne(db,'SELECT count(*) AS n FROM archive_rooms WHERE owner=? AND ended=0 AND updated_at>?',owner,now-86400000)).n>=5)throw failure('room_limit',429);
    const newId=crypto.randomUUID(),title=text(body.title,120,true);
    await run(db,'INSERT INTO archive_rooms(id,owner,title,created_at,updated_at) VALUES(?,?,?,?,?)',newId,owner,title,now,now);
    await run(db,'INSERT INTO archive_room_members(room_id,owner,display_name,last_seen) VALUES(?,?,?,?)',newId,owner,text(viewer.displayName || viewer.name || 'Observer',120),now);
    return json({id:newId,title,host:true,revision:1},201);
   }
   const room=await queryOne(db,'SELECT * FROM archive_rooms WHERE id=?',id);
   if(!room || room.ended || room.updated_at<now-7*86400000)throw failure('room_ended',404);
   if(method==='POST' && action==='join'){
    const size=await queryOne(db,'SELECT count(*) AS n FROM archive_room_members WHERE room_id=? AND last_seen>?',id,now-60000);
    if(size.n>=50 && !await queryOne(db,'SELECT owner FROM archive_room_members WHERE room_id=? AND owner=?',id,owner))throw failure('room_full',429);
    await run(db,'INSERT INTO archive_room_members(room_id,owner,display_name,last_seen) VALUES(?,?,?,?) ON CONFLICT(room_id,owner) DO UPDATE SET display_name=excluded.display_name,last_seen=excluded.last_seen',id,owner,text(viewer.displayName || viewer.name || 'Observer',120),now);
   }
   const member=await queryOne(db,'SELECT owner FROM archive_room_members WHERE room_id=? AND owner=?',id,owner);
   if(!member)throw failure('join_required',403);
   if(method==='GET' || method==='POST' && ['join','presence'].includes(action)){
    if(method==='POST')await run(db,'UPDATE archive_room_members SET last_seen=? WHERE room_id=? AND owner=?',now,id,owner);
    const participants=await queryAll(db,'SELECT display_name FROM archive_room_members WHERE room_id=? AND last_seen>? ORDER BY last_seen DESC LIMIT 50',id,now-60000);
    return json({id,title:room.title,host:room.owner===owner,position:room.position?JSON.parse(room.position):null,revision:room.revision,participants:participants.map(p=>p.display_name)});
   }
   if(method==='DELETE' && action==='leave'){await run(db,'DELETE FROM archive_room_members WHERE room_id=? AND owner=?',id,owner);return json({left:true});}
   if(room.owner!==owner)throw failure('host_required',403);
   if(method==='PUT' && action==='position'){
    if(body.revision!==room.revision)throw failure('room_conflict',409);
    const entityId=body.entityId,kind=body.kind || 'entity',section=body.section || '';
    if(typeof entityId!=='string' || !stableIdPattern.test(entityId) || !['entity','event','collection'].includes(kind) || typeof section!=='string' || !/^[a-z0-9-]{0,100}$/.test(section))throw failure('invalid_entity');
    if(kind==='entity'){const cat=await catalogue(context);if(!cat.entities.has(entityId))throw failure('invalid_entity');}
    if(kind==='event' && !(await eventCatalogue(context)).has(entityId))throw failure('invalid_event');
    if(kind==='collection' && !(await queryOne(db,"SELECT id FROM archive_collections WHERE id=? AND status='published'",entityId)))throw failure('not_found',404);
    const position={entityId,kind,section};
    const result=await run(db,'UPDATE archive_rooms SET position=?,revision=revision+1,updated_at=? WHERE id=? AND owner=? AND revision=? AND ended=0',JSON.stringify(position),now,id,owner,body.revision);
    if(!result.meta.changes)throw failure('room_conflict',409);
    return json({position,revision:room.revision+1});
   }
   if(method==='DELETE' && !action){await run(db,'UPDATE archive_rooms SET ended=1,updated_at=? WHERE id=? AND owner=?',now,id,owner);return json({ended:true});}
  }
  throw failure('not_found',404);
 }catch(error){
  if(!error.status)console.error(JSON.stringify({event:'archive_request_failed',message:error.message}));
  return json({error:{code:error.status?error.message:'request_failed'}},error.status || 500);
 }
}
