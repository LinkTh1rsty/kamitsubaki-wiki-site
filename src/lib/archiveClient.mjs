import {readBoundedJson} from './boundedJson.mjs';
import {loadObservatory,saveObservatory,upsertObservation,emptyObservatory,completeObservatorySave} from './archivePersonal.mjs';
let accountModule;
const snapshotPromises=new Map();
export async function archiveAccount(){return accountModule??=import('../scripts/accountStore.js');}
/** Capture the resolved identity once, including its session generation, for each operation. */
export function createArchiveCommunityClient(getAccount=archiveAccount){
 let account,personalWrites=Promise.resolve();
 async function identity(){account??=await getAccount();if(account.state.auth==='checking')await account.refreshAuth();return {owner:account.state.viewer?.userId || null,generation:account.getAccountGeneration()};}
 function requireCurrent(expected){if(expected.owner!==(account.state.viewer?.userId || null) || expected.generation!==account.getAccountGeneration())throw new Error('account_changed');}
 async function currentOwner(){return (await identity()).owner;}
 async function request(path,{method='GET',body,expectedOwner,expectedIdentity}={}){
  const scope=await identity(),owner=scope.owner;requireCurrent(scope);
  if(method!=='GET' && !owner)throw Object.assign(new Error('sign_in_required'),{status:401});
  if(expectedOwner!==undefined && expectedOwner!==owner)throw new Error('account_changed');
  if(expectedIdentity)requireCurrent(expectedIdentity);
  const configured=import.meta.env?.PUBLIC_ARCHIVE_API_BASE,serviceBase=(configured!==undefined?configured:import.meta.env?.PROD?account.apiBase:'').replace(/\/$/,'');
  const response=await fetch(serviceBase+'/api/archive/community/'+path,{method,credentials:'include',cache:'no-store',signal:AbortSignal.timeout(12000),headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify({...body,accountId:owner}):undefined});
  if(!response.headers.get('Content-Type')?.includes('application/json'))throw new Error('community_unavailable');
  const data=await readBoundedJson(response,1000000);requireCurrent(scope);
  if(!response.ok)throw Object.assign(new Error(data.error?.code || 'request_failed'),{status:response.status});return data;
 }
 function record(record,storage=localStorage){
  const expected=identity();
  const operation=personalWrites.then(async()=>{const scope=await expected;requireCurrent(scope);const owner=scope.owner,local=loadObservatory(storage,owner),data=upsertObservation(local.data,record),saved=saveObservatory(storage,owner,data,local.revision,true);
   if(owner)try{const result=await request('me',{method:'PUT',expectedOwner:owner,expectedIdentity:scope,body:{data,revision:local.revision}});requireCurrent(scope);return completeObservatorySave(storage,owner,data,result);}
   catch(error){if(error.message==='account_changed')throw error;return {...saved,synced:false,error};}return {...saved,synced:false};
  });personalWrites=operation.catch(()=>undefined);return operation;
 }
 async function synchronize(storage=localStorage){
  const scope=await identity(),owner=scope.owner;requireCurrent(scope);if(!owner)return {data:loadObservatory(storage,null).data,synced:false,owner:null};
  const remote=await request('me',{expectedOwner:owner,expectedIdentity:scope});requireCurrent(scope);const local=loadObservatory(storage,owner);
  if(!local.dirty){saveObservatory(storage,owner,remote.data,remote.revision,false);return {...remote,synced:true,owner};}
  if(local.revision!==remote.revision)throw new Error('profile_conflict');
  const saved=await request('me',{method:'PUT',expectedOwner:owner,expectedIdentity:scope,body:{data:local.data,revision:local.revision}});requireCurrent(scope);return {...remote,...saved,...completeObservatorySave(storage,owner,local.data,saved),owner};
 }
 return {currentOwner,request,record,synchronize};
}
const communityClient=createArchiveCommunityClient();
export const currentArchiveOwner=()=>communityClient.currentOwner();
export const communityRequest=(path,options)=>communityClient.request(path,options);
export async function loadArchiveSnapshot(url){
 if(!snapshotPromises.has(url)){
 const pending=(async()=>{
  const response=await fetch(url,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error('catalogue_unavailable');
  const snapshot=await readBoundedJson(response,12*1024*1024);
  if(snapshot.version!==1 || !Array.isArray(snapshot.entities))throw new Error('invalid_catalogue');
  return snapshot;
 })().catch(error=>{if(snapshotPromises.get(url)===pending)snapshotPromises.delete(url);throw error;});
 snapshotPromises.set(url,pending);if(snapshotPromises.size>4)snapshotPromises.delete(snapshotPromises.keys().next().value);
 }
 return snapshotPromises.get(url);
}
export const recordObservation=(record,storage=localStorage)=>communityClient.record(record,storage);
export const synchronizeObservatory=(storage=localStorage)=>communityClient.synchronize(storage);
export const guestObservatory=()=>emptyObservatory();
