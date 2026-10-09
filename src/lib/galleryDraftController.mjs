// Save the current snapshot locally before any network request. Cloud writes
// are serialized; a response acknowledges only the revision it actually sent.
export class GalleryDraftController {
 constructor({id,kind,batch=null,version,readManifest,readSnapshot,saveLocal,request,onState=()=>{},onBatch=()=>{},applyRemote=()=>{},delay=700}){
  Object.assign(this,{id,kind,batch,version:version??batch?.version??0,readManifest,readSnapshot,saveLocal,request,onState,onBatch,applyRemote,delay});
  this.onState=onState;this.onBatch=onBatch;this.revision=0;this.savedRevision=0;this.localState='saved';this.cloudState=batch?'saved':'local';this.localChain=Promise.resolve();
 }
 state(){return {local:this.localState,cloud:this.cloudState,conflict:this.conflict,error:this.error,id:this.id,version:this.version};}
 emit(){this.onState(this.state());}
 async persist(){
  if(this.closed)return;
  const snapshot={...this.readSnapshot(),id:this.id,kind:this.kind,version:this.version,cloudPending:this.revision!==this.savedRevision,conflict:this.conflict||null};
  this.localState='saving';this.emit();
  const write=this.localChain.catch(()=>{}).then(()=>this.saveLocal(snapshot));this.localChain=write;
  try{await write;if(this.localChain===write)this.localState='saved';this.emit();}catch(error){if(this.localChain===write){this.localState='error';this.error=error;}this.emit();throw error;}
 }
 changed(){
  if(this.closed)return;
  this.revision++;this.cloudState=this.conflict?'conflict':'pending';this.error=null;
  void this.persist().catch(()=>{});clearTimeout(this.timer);
  if(!this.conflict)this.timer=setTimeout(()=>void this.sync().catch(()=>{}),this.delay);
 }
 async ensureBatch(){
  if(this.closed)throw Error('draft_closed');
  if(this.batch)return this.batch;
  if(!this.creating)this.creating=(async()=>{
   await this.persist();if(this.closed)throw Error('draft_closed');
   const result=await this.request('/batches','POST',{id:this.id,kind:this.kind});
   if(this.closed)return result.batch;
   this.batch=result.batch;this.onBatch(this.batch);
   // A retry may find a batch created before a lost response. Keep the local
   // expected version rather than silently taking the remote version.
   await this.persist();return this.batch;
  })().finally(()=>{this.creating=null;});
  return this.creating;
 }
 async sync(){
  if(this.closed)throw Error('draft_closed');
  clearTimeout(this.timer);if(this.conflict)throw Object.assign(Error('draft_conflict'),{status:409});
  if(this.flight)return this.flight;
  this.flight=(async()=>{
   try{
    await this.ensureBatch();
    while(this.savedRevision<this.revision&&!this.closed){
     const revision=this.revision,manifest=structuredClone(this.readManifest());
     this.cloudState='saving';this.emit();
     const result=await this.request(`/batches/${encodeURIComponent(this.id)}`,'PUT',{version:this.version,manifest});
     if(this.closed)return this.batch;
     this.batch=result.batch;this.version=result.batch.version;this.savedRevision=revision;this.onBatch(this.batch);
     await this.persist();
    }
    this.cloudState='saved';this.error=null;this.emit();return this.batch;
   }catch(error){
    if(this.closed)throw error;
    this.error=error;
    if(error.status===409){
     this.conflict=await this.request(`/batches/${encodeURIComponent(this.id)}`).catch(()=>({batch:null}));if(this.closed)throw error;this.cloudState='conflict';
     await this.persist().catch(()=>{});
    }else this.cloudState=error.status===401?'login':'offline';
    this.emit();throw error;
   }
  })().finally(()=>{this.flight=null;});
  return this.flight;
 }
 async resolve(choice){
  if(this.closed||!this.conflict)return;
  const remote=await this.request(`/batches/${encodeURIComponent(this.id)}`);if(this.closed)return;
  if(remote.batch.status!=='draft')throw Object.assign(Error('draft_not_editable'),{status:409});
  this.batch=remote.batch;this.version=remote.batch.version;
  if(choice==='remote'){await this.applyRemote(remote);if(this.closed)return;this.savedRevision=this.revision;}
  else if(choice==='local'){this.revision=Math.max(this.revision,this.savedRevision+1);}
  else throw Error('invalid_conflict_resolution');
  this.conflict=null;this.cloudState=choice==='remote'?'saved':'pending';this.onBatch(this.batch);await this.persist();this.emit();
  if(choice==='local')return this.sync();
 }
 close(){this.closed=true;clearTimeout(this.timer);}
}
