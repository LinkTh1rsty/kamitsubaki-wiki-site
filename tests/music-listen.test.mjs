import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {foliaListenUrl,foliaOrigin,qqListenTarget,FOLIA_PREVIEW_ORIGIN} from '../src/lib/musicListen.mjs';
const song={id:'kaf-kako-wo-kurau',entityType:'work-track'};
test('reviewed song maps to exact QQ album version with public Wiki return',()=>{
 const url=new URL(foliaListenUrl(song,{origin:FOLIA_PREVIEW_ORIGIN,locale:'zh',wikiPath:'/zh/database/music/songs/kaf-kako-wo-kurau/'}));
 assert.equal(url.pathname,'/listen');assert.equal(url.searchParams.get('id'),'0029KJCm0OoNL1');assert.equal(url.searchParams.get('type'),'track');
 assert.equal(url.searchParams.get('wiki'),'/zh/database/music/songs/kaf-kako-wo-kurau/');assert.equal(url.searchParams.has('autoplay'),false);
});
test('unmapped entries and disabled release switch never create guessed links',()=>{
 assert.equal(qqListenTarget({id:'unverified',entityType:'work-track',title:'過去を喰らう'}),null);
 assert.equal(foliaListenUrl(song,{origin:'',wikiPath:'/zh/database/music/songs/kaf-kako-wo-kurau/'}),null);
 assert.equal(foliaOrigin('https://evil.example/'),null);assert.equal(foliaOrigin(FOLIA_PREVIEW_ORIGIN+'/steal'),null);
});
test('explicit QQ link wins without treating songid or deceptive host as a mid',()=>{
 assert.deepEqual(qqListenTarget({...song,officialLinks:[{url:'https://y.qq.com/n/ryqq/songDetail/004QDc561eiK6t'}]}),{kind:'track',mid:'004QDc561eiK6t'});
 for(const url of ['https://y.qq.com.evil.example/n/ryqq/songDetail/004QDc561eiK6t','https://evil.example/?songmid=004QDc561eiK6t','https://y.qq.com/n/ryqq/songDetail/12345'])assert.equal(qqListenTarget({id:'unmapped',entityType:'work-track',officialLinks:[{url}]}),null);
});
test('every reviewed mapping is linked to a real canonical Wiki entry and QQ source',()=>{
 const catalog=JSON.parse(readFileSync('src/data/music-listen.json','utf8'));
 assert.equal(Object.keys(catalog.entries).length,16);
 const mids=new Set();for(const [id,item] of Object.entries(catalog.entries)){
  assert.match(item.mid,/^0[A-Za-z0-9]{13}$/);assert.equal(item.verifiedAt,'2026-10-28');assert.ok(!mids.has(item.mid));mids.add(item.mid);
  assert.ok(item.source.endsWith(item.mid));assert.ok(item.artist==='花譜');
 }
});
