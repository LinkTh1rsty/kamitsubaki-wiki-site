import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {foliaListenUrl,foliaOrigin,qqListenTarget,FOLIA_PREVIEW_ORIGIN} from '../src/lib/musicListen.mjs';
import {checkMusicCatalog} from '../scripts/music-listen/check-catalog.mjs';
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
 assert.deepEqual(checkMusicCatalog(catalog).errors,[]);
 const artists=new Set();for(const [id,item] of Object.entries(catalog.entries)){
  const entityType=item.kind==='album'?'work-release':'work-track';
  const section=item.kind==='album'?'albums':'songs';
  artists.add(item.artist);
  for(const locale of ['zh','ja','en','zh-tw','zh-hk']){
   const path=`/${locale}/database/music/${section}/${id}/`;
   const url=new URL(foliaListenUrl({id,entityType},{origin:FOLIA_PREVIEW_ORIGIN,locale,wikiPath:path}));
   assert.equal(url.searchParams.get('id'),item.mid);assert.equal(url.searchParams.get('type'),item.kind);
   assert.equal(url.searchParams.get('wiki'),path);assert.equal(url.searchParams.has('autoplay'),false);
  }
 }
 assert.ok(artists.size>1,'catalog expands beyond the initial artist');
});
test('curation guard rejects guessed sources and ambiguous reverse aliases',()=>{
 const row={id:'example',kind:'track',title:'Example'};
 const entry={kind:'track',mid:'0029KJCm0OoNL1',title:'Example',albumMid:'00018lB72boGSR',albumTitle:'Album',source:'https://y.qq.com/n/ryqq/songDetail/0029KJCm0OoNL1',verifiedAt:'2026-10-28',canonical:true};
 assert.deepEqual(checkMusicCatalog({version:1,entries:{example:entry}},[row]).errors,[]);
 assert.match(checkMusicCatalog({version:1,entries:{example:{...entry,source:'https://example.com/'}}},[row]).errors.join('\n'),/public source/);
 const duplicated=checkMusicCatalog({version:1,entries:{example:entry,alias:entry}},[row,{...row,id:'alias'}]);
 assert.match(duplicated.errors.join('\n'),/canonical/);
});
