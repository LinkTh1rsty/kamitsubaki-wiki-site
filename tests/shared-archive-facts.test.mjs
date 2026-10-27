import test from 'node:test';
import assert from 'node:assert/strict';
import {createEntityRegistry} from '../src/lib/entityRegistry.mjs';
import {resolveSharedEntityData,sharedEntityFacts} from '../src/lib/sharedEntityFacts.mjs';
test('localized narratives cannot replace shared facts, and unknown canonical values remain unknown',()=>{
 const translations=new Map([['zh',{data:{id:'song',locale:'zh',entityType:'work-track',title:'歌',releaseDate:'2024',credits:[]}}],['en',{data:{id:'song',locale:'en',entityType:'work-track',title:'Song',releaseDate:'2025',credits:[{name:'Unverified',role:'composer'}],duration:'99:99'}}]]);
 const resolved=resolveSharedEntityData(translations,translations.get('en').data);
 assert.equal(resolved.title,'Song');assert.equal(resolved.locale,'en');assert.equal(resolved.releaseDate,'2024');
 assert.deepEqual(resolved.credits,[]);assert.equal(resolved.duration,undefined);
 assert.equal(translations.get('en').data.releaseDate,'2025');
 assert.equal(sharedEntityFacts(translations).locale,'zh');
});
test('the real entity registry uses shared facts in all supported routes',()=>{
 const entries=['zh','en'].map(locale=>({filePath:'src/content/songs/song/'+locale+'.md',body:'',data:{schemaVersion:2,id:'song',entityType:'work-track',locale,title:locale==='zh'?'歌':'Song',romanizedTitle:'Song',releaseDate:locale==='zh'?'2024':'2025',performers:[],credits:[]}}));
 const registry=createEntityRegistry(entries);
 assert.equal(registry.resolveEntity('song','en').data.releaseDate,'2024');
 assert.equal(registry.resolveEntity('song','en').data.title,'Song');
 assert.equal(registry.resolveEntity('song','en').factsLocale,'zh');
 assert.equal(registry.resolveEntity('song','zh-hk').data.releaseDate,'2024');
});
