import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';

// Offline catalog curation only. Fixed public endpoints, anonymous requests, bounded cached reads.
export function publicCatalog({cacheDir,proxy='',maxRequests=600,onRequest=()=>{}}){
 mkdirSync(cacheDir,{recursive:true});let requests=0;
 async function read(url){
  if(!['c.y.qq.com','u.y.qq.com'].includes(url.hostname))throw Error('Public QQ endpoint only');
  const key=createHash('sha256').update(url.href).digest('hex');const file=join(cacheDir,key+'.json');
  if(existsSync(file))return JSON.parse(readFileSync(file,'utf8'));
  if(requests>=maxRequests)throw Error('Catalog request allowance reached');
  requests++;
  onRequest({requests,path:url.pathname});
  await new Promise(resolve=>setTimeout(resolve,180));
  const args=['-fsS','--max-time','35','--retry','1','--retry-all-errors','--retry-delay','1','-H','Referer: https://y.qq.com/'];
  if(proxy)args.push('--proxy',proxy);
  const raw=execFileSync('curl',[...args,url.href],{encoding:'utf8',maxBuffer:8*1024*1024});
  const data=JSON.parse(raw.replace(/^\s*MusicJsonCallback\(/,'').replace(/\);?\s*$/,''));
  if(data.code!==0)throw Error(`QQ public global code ${data.code}`);
  writeFileSync(file,JSON.stringify(data));return data;
 }
 async function musicu(module,method,param){
  const url=new URL('https://u.y.qq.com/cgi-bin/musicu.fcg');url.searchParams.set('format','json');
  url.searchParams.set('data',JSON.stringify({comm:{ct:24,cv:0},request:{module,method,param}}));
  const response=await read(url),part=response.request;
  if(part?.code!==0)throw Error(`QQ public ${method} code ${part?.code}`);
  return part.data;
 }
 return {
  get requests(){return requests;},
  async singers(keyword){const u=new URL('https://c.y.qq.com/soso/fcgi-bin/client_search_cp');u.search=new URLSearchParams({format:'json',w:keyword,t:'9',p:'1',n:'20'});return (await read(u)).data?.singer?.list||[];},
  albums(mid,begin=0){return musicu('music.musichallAlbum.AlbumListServer','GetAlbumList',{sort:5,singermid:mid,begin,num:80});},
  songs(mid,begin=0){return musicu('musichall.song_list_server','GetSingerSongList',{singerMid:mid,order:1,number:30,begin});},
  async album(mid){const u=new URL('https://c.y.qq.com/v8/fcg-bin/fcg_v8_album_info_cp.fcg');u.search=new URLSearchParams({albummid:mid,format:'json',outCharset:'utf-8'});return (await read(u)).data;},
 };
}
