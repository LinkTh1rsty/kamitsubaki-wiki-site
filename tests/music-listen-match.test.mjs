import {test} from 'node:test';
import assert from 'node:assert/strict';
import {artistKey,titleKey,sameRelease,sameTrack,checkTracklist,songTitle,releaseTrackTitleMatches} from '../scripts/music-listen/catalog-match.mjs';

test('QQ translations and instrumental spelling match without erasing editions',()=>{
 assert.equal(titleKey('過去を喰らう (吞噬过去)'),titleKey('過去を喰らう'));
 assert.equal(titleKey('確信(Instrumental)'),titleKey('確信 (Inst.)'));
 for(const other of ['糸 (Live)','糸 (伴奏版)','糸 (2024 ver.)','糸 (Remix)'])assert.notEqual(titleKey(other),titleKey('糸'));
 assert.notEqual(titleKey('観測γ'),titleKey('観測'));
});
test('legacy canonical titles discard localized labels but retain recording versions',()=>{
 assert.equal(songTitle({songorig:'ネハン',songname:'ネハン (Nirvana)'}),'ネハン');
 assert.equal(titleKey(songTitle({songorig:'傷心中',songname:'傷心中 (伤心中) (Live)'})),titleKey('傷心中 (Live)'));
 assert.equal(titleKey(songTitle({songorig:'確信',songname:'確信 (Inst.)'})),titleKey('確信 (Instrumental)'));
 assert.notEqual(titleKey(songTitle({name:'糸',subtitle:'Live'})),titleKey('糸'));
});
test('artist pronunciation does not change identity or merge musical isotopes',()=>{
 assert.equal(artistKey('花譜 (かふ)'),artistKey('花譜'));
 assert.notEqual(artistKey('KAF'),artistKey('KAFU'));
 assert.notEqual(artistKey('理芽'),artistKey('裏命'));
});
test('standalone songs require matching title and a measured duration',()=>{
 const wiki={title:'糸',duration:'03:42'};
 assert.equal(sameTrack(wiki,{name:'糸',interval:222}),true);
 assert.equal(sameTrack(wiki,{name:'糸 (Live)',interval:222}),false);
 assert.equal(sameTrack(wiki,{name:'糸',interval:240}),false);
 assert.equal(sameTrack({title:'糸'},{name:'糸',interval:222}),false);
});
test('identified release tracks may omit a guest credit but cannot change an explicit guest',()=>{
 const wiki={title:'歌姫 (feat. 花譜)',duration:'03:42'};
 assert.equal(releaseTrackTitleMatches(wiki,'歌姫'),true);
 assert.equal(releaseTrackTitleMatches(wiki,'歌姫 (feat. 理芽)'),false);
 assert.equal(releaseTrackTitleMatches(wiki,'歌姫 (Live)'),false);
 assert.equal(sameTrack(wiki,{name:'歌姫',interval:222}),false);
});
test('release date and ordered tracklist disambiguate equal titles and artist profiles',()=>{
 const wiki={title:'観測',releaseDate:'2019-09-11',tracks:[{title:'確信 (Instrumental)',duration:'03:12'},{title:'糸',duration:'03:42'}]};
 const qq={name:'観測',aDate:'2019-09-11',list:[{songname:'確信 (Inst.)',interval:191},{songname:'糸',interval:222}]};
 assert.equal(sameRelease(wiki,qq),true);assert.equal(checkTracklist(wiki,qq).ok,true);
 assert.equal(sameRelease(wiki,{...qq,aDate:'2025-09-11'}),false);
 assert.equal(checkTracklist(wiki,{...qq,list:[...qq.list].reverse()}).ok,false);
 assert.equal(checkTracklist(wiki,{...qq,list:qq.list.slice(1)}).ok,false);
});
