import {handleArchiveCommunity} from '../../functions/_shared/archiveCommunity.mjs';
const frontendOrigin='https://kamitsubaki.wiki';
/** Narrow route on the existing API hostname lets the browser send its host-scoped
 * account cookie. Authentication stays in the central account service binding.
 */
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url),origin=request.headers.get('Origin');
  const allowed=new Set([url.origin,frontendOrigin,...String(env.ARCHIVE_ALLOWED_ORIGINS || '').split(',').map(value=>value.trim()).filter(Boolean)]);
  if(origin && !allowed.has(origin))return Response.json({error:{code:'invalid_origin'}},{status:403});
  const headers={'Vary':'Origin','Cache-Control':'no-store'};
  if(origin){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Credentials']='true';}
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Accept','Access-Control-Max-Age':'600'}});
  if(!url.pathname.startsWith('/api/archive/community/'))return Response.json({error:{code:'not_found'}},{status:404,headers});
  const route=url.pathname.slice('/api/archive/community/'.length).split('/').filter(Boolean);
  try{route.forEach(value=>decodeURIComponent(value));}catch{return Response.json({error:{code:'invalid_path'}},{status:400,headers});}
  const ASSETS={
   fetch:async input=>{
    const asset=new URL(typeof input==='string'?input:input.url);
    if(!/^\/api\/archive\/v1\/(?:entities|events|physical)\.json$/.test(asset.pathname))return new Response(null,{status:404});
    const base=env.ARCHIVE_FRONTEND_ORIGIN || frontendOrigin;
    return fetch(new URL(asset.pathname,base),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(10000)});
   },
  };
  const response=await handleArchiveCommunity({request,env:{...env,ASSETS,ARCHIVE_ALLOWED_ORIGINS:[...allowed].join(',')},params:{route},waitUntil:promise=>ctx.waitUntil(promise)});
  const result=new Response(response.body,response);
  for(const [key,value]of Object.entries(headers))result.headers.set(key,value);
  return result;
 },
};
