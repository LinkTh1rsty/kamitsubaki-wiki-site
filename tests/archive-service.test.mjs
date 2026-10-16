import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../archive-service/src/worker.mjs';

test('API host service limits credential CORS to the configured frontend',async()=>{
 const call=(url,origin,method='GET')=>worker.fetch(new Request(url,{method,headers:{Origin:origin}}),{},{});
 const preflight=await call('https://api.kamitsubaki.wiki/api/archive/community/me','https://kamitsubaki.wiki','OPTIONS');
 assert.equal(preflight.status,204);
 assert.equal(preflight.headers.get('Access-Control-Allow-Origin'),'https://kamitsubaki.wiki');
 assert.equal(preflight.headers.get('Access-Control-Allow-Credentials'),'true');
 const blocked=await call('https://api.kamitsubaki.wiki/api/archive/community/me','https://evil.example');
 assert.equal(blocked.status,403);assert.equal(blocked.headers.get('Access-Control-Allow-Origin'),null);
 const unrelated=await call('https://api.kamitsubaki.wiki/api/account-auth/me','https://kamitsubaki.wiki');
 assert.equal(unrelated.status,404);
 const unconfigured=await call('https://api.kamitsubaki.wiki/api/archive/community/status','https://kamitsubaki.wiki');
 assert.deepEqual(await unconfigured.json(),{configured:false,version:1});
 const invalid=await call('https://api.kamitsubaki.wiki/api/archive/community/%zz','https://kamitsubaki.wiki');
 assert.equal(invalid.status,400);
});
