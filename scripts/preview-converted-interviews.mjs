// Local-only acceptance server using the built reader and production renderer.
// No upstream API calls, credentials, writes, or live mutations are supported.
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderArticlePage} from '../functions/_shared/articlePage.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dist=path.join(root,'dist');
const base='http://127.0.0.1:18501';
const dir=path.join(root,'maintenance/article-speech-conversion');
const mediaDir=path.join(root,'.workspace-runtime/article-speech-media');
const media=JSON.parse(await fs.readFile(path.join(mediaDir,'map.json'),'utf8').catch(()=>'{}'));
const records=new Map();
for(const f of await fs.readdir(path.join(dir,'converted'))){if(f.endsWith('.json')){const x=JSON.parse(await fs.readFile(path.join(dir,'converted',f),'utf8'));for(const [url,local] of Object.entries(media)){if(local){x.article.body=x.article.body.replaceAll(url,local);if(x.article.authorAvatarUrl===url)x.article.authorAvatarUrl=local;}}records.set(x.article.id,x);}}
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function asset(url){
 const pathname=decodeURIComponent(new URL(url).pathname),file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(dist+path.sep))return new Response('Not found',{status:404});
 try{let body=await fs.readFile(file);if(file.endsWith('.html'))body=Buffer.from(body.toString().replaceAll(/data-article-api="[^"]*"/g,`data-article-api="${base}"`));return new Response(body,{headers:{'Content-Type':types[path.extname(file)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}
}
// The production page renderer can fetch only this exact local snapshot namespace.
globalThis.fetch=async input=>{
 const u=new URL(typeof input==='string'?input:input.url),m=u.pathname.match(/^\/api\/articles\/items\/([a-z0-9-]+)$/);
 if(u.origin!==base||!m||!records.has(m[1]))throw Error('Preview forbids upstream requests');
 return Response.json(records.get(m[1]));
};
http.createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,base);let response;
  if(req.method!=='GET')response=new Response('Read only',{status:405});
  else if(/^\/__preview-media\/[a-f0-9]{64}$/.test(u.pathname)&&Object.values(media).includes(u.pathname))response=new Response(await fs.readFile(path.join(mediaDir,u.pathname.split('/').at(-1))));
  else if(u.pathname==='/')response=Response.redirect(base+'/zh/articles/');
  else if(u.pathname==='/api/articles')response=Response.json({items:[...records.values()].map(x=>({...x.article,body:undefined})),total:records.size,nextOffset:null});
  else if(u.pathname.startsWith('/api/articles/items/')){const x=records.get(u.pathname.split('/').at(-1));response=x?Response.json(x):new Response('Not found',{status:404});}
  else if(u.pathname.startsWith('/api/'))response=Response.json({error:{message:'本地只读预览'}},{status:404});
  else{
   const m=u.pathname.match(/^\/(zh|zh-tw|zh-hk|ja|en)\/articles\/read\/([a-z0-9-]+)\/$/);
   response=m?await renderArticlePage({request:new Request(u),env:{ARTICLE_API_URL:base,ASSETS:{fetch:r=>asset(r.url)}},params:{locale:m[1],id:m[2]}}):await asset(u);
  }
  res.writeHead(response.status,{...Object.fromEntries(response.headers),'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; frame-src 'none'"});res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error(e);res.writeHead(500);res.end('Local preview failed');}
}).listen(18501,'127.0.0.1',()=>console.log(`Converted interviews: ${base}/zh/articles/`));
