import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm, access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {packPagefindFragments} from '../scripts/pack-pagefind-fragments.mjs';
import {onRequest} from '../functions/pagefind/[locale]/fragment/[name].js';

test('packed fragments preserve every byte, locale URL and HEAD metadata without exposing unrelated assets',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'wiki-search-packs-'));
 try{
  const locales=['zh','zh-tw','zh-hk','ja','en'];
  const expected=new Map();
  for(const locale of locales){
   const fragmentDir=join(directory,'pagefind',locale,'fragment');await mkdir(fragmentDir,{recursive:true});
   for(const hash of ['aa01234','ab56789','ff00000']){
    const name=`${locale.startsWith('zh')?'zh':locale}_${hash}.pf_fragment`;
    const bytes=Buffer.from([0,255,31,139,...Buffer.from(locale+hash)]);
    await writeFile(join(fragmentDir,name),bytes);expected.set(locale+'/'+name,bytes);
   }
  }
  assert.deepEqual(await packPagefindFragments(directory,locales),{fragments:15,packs:10});
  let subrequests=0;
  const env={ASSETS:{fetch:async request=>{
   subrequests++;assert.equal(request.method,'GET');
   const path=new URL(request.url).pathname;
   assert.match(path,/^\/pagefind-packs\/(?:zh|zh-tw|zh-hk|ja|en)\/[a-f0-9]\.json$/);
   try{return new Response(await readFile(join(directory,path)));}catch{return new Response(null,{status:404});}
  }}};
  for(const [path,bytes] of expected){
   const [locale,name]=path.split('/');
   await assert.rejects(access(join(directory,'pagefind',locale,'fragment',name)));
   const request=new Request('https://kamitsubaki.wiki/pagefind/'+locale+'/fragment/'+name);
   const result=await onRequest({request,env,params:{locale,name}});
   assert.equal(result.status,200);assert.deepEqual(Buffer.from(await result.arrayBuffer()),bytes);
   assert.match(result.headers.get('Cache-Control'),/immutable/);
   const head=await onRequest({request:new Request(request,{method:'HEAD'}),env,params:{locale,name}});
   assert.equal(head.headers.get('Content-Length'),String(bytes.length));assert.equal((await head.arrayBuffer()).byteLength,0);
  }
  const before=subrequests;
  for(const params of [{locale:'other',name:'zh_aa01234.pf_fragment'},{locale:'ja',name:'zh_aa01234.pf_fragment'},{locale:'zh',name:'../../secret'}]){
   assert.equal((await onRequest({request:new Request('https://kamitsubaki.wiki/'),env,params})).status,404);
  }
  assert.equal(subrequests,before);
  assert.equal((await onRequest({request:new Request('https://kamitsubaki.wiki/',{method:'POST'}),env,params:{locale:'zh',name:'zh_aa01234.pf_fragment'}})).status,405);
  assert.equal((await onRequest({request:new Request('https://kamitsubaki.wiki/'),env,params:{locale:'zh',name:'zh_aa99999.pf_fragment'}})).status,404);
 }finally{await rm(directory,{recursive:true,force:true});}
});
