export async function galleryFileHash(file){
 const digest=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
 return [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
}
export async function findExistingGalleryFile(file,files,request){
 file.sha256||=await galleryFileHash(file.file);
 const local=files.find(other=>other!==file&&other.sha256===file.sha256);
 if(local)return {kind:'batch',id:local.id};
 // Older deployments may not expose the additive lookup endpoint yet. An
 // unavailable lookup must not strand otherwise valid private uploads.
 const result=await request('/assets/lookup','POST',{hashes:[file.sha256]}).catch(()=>null);
 const match=result?.matches?.find(asset=>asset.sha256===file.sha256);
 return match?{kind:'public',...match}:null;
}
