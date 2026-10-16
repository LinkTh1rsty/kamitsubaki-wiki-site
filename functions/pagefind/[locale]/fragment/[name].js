const locales=new Set(['zh','zh-tw','zh-hk','ja','en']);
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};

export async function onRequest({request,env,params}){
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{...noStore,Allow:'GET, HEAD'}});
 const locale=String(params.locale||''),name=String(params.name||'');
 const match=/^(zh|ja|en)_([a-f0-9]{7,64})\.pf_fragment$/.exec(name);
 if(!locales.has(locale)||!match||match[1] !== (locale.startsWith('zh')?'zh':locale))
  return new Response('Not found',{status:404,headers:noStore});
 try{
  const url=new URL(`/pagefind-packs/${locale}/${match[2].slice(0,1)}.json`,request.url);
  const response=await env.ASSETS.fetch(new Request(url,{method:'GET'}));
  if(!response.ok)return new Response('Search fragment unavailable',{status:response.status===404?404:503,headers:noStore});
  const pack=await response.json();
  const encoded=Object.hasOwn(pack,name)?pack[name]:null;
  if(typeof encoded!=='string')return new Response('Not found',{status:404,headers:noStore});
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  return new Response(request.method==='HEAD'?null:bytes,{headers:{
   'Content-Type':'application/octet-stream',
   'Content-Length':String(bytes.length),
   'Cache-Control':'public, max-age=31536000, immutable',
   'X-Content-Type-Options':'nosniff',
  }});
 }catch{return new Response('Search fragment unavailable',{status:503,headers:noStore});}
}
