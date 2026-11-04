import test from 'node:test';
import assert from 'node:assert/strict';
import {visualExplorerProxy} from '../scripts/visual-explorer-proxy.mjs';
import {VISUAL_EXPLORER_BASE} from '../src/lib/visualExplorer.mjs';

test('local explorer proxy owns only its namespace and refuses remote/private credentials',()=>{
 const proxy=visualExplorerProxy('http://127.0.0.1:18360');
 const matcher=new RegExp(Object.keys(proxy)[0]);
 assert.equal(VISUAL_EXPLORER_BASE,'/visuals/');
 for(const path of ['/visuals/','/visuals/api/photos','/visuals/_nuxt/app.js'])assert.ok(matcher.test(path));
 for(const path of ['/zh/gallery/','/api/gallery/items','/visuals-other','/zh/account/'])assert.equal(matcher.test(path),false);
 assert.deepEqual(visualExplorerProxy(''),{});
 for(const origin of ['https://api.kamitsubaki.wiki','http://user:password@127.0.0.1:18360','http://127.0.0.1:18360/path'])assert.throws(()=>visualExplorerProxy(origin));
});
