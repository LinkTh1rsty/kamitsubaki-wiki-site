import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {buildEntityReaderNavigation,prepareEntityReaderHtml,musicListenLinks} from '../src/lib/entityReaderNavigation.mjs';

const media = '<section class="wiki-media-switcher"><div class="wiki-media-switcher__panels"><figure class="wiki-embed wiki-embed--audio"><iframe src="https://embed.music.apple.com/jp/song/123"></iframe></figure></div></section>';
const lyrics = '<div class="my-lyric-box"><div class="lyric-line"><ruby>歌<rt>うた</rt></ruby></div></div>';
const music = extra => buildEntityReaderNavigation({kind:'music',locale:'en',...extra});

test('live navigation links to the setlist section for concerts and populated event records only',()=>{
  assert.deepEqual(buildEntityReaderNavigation({kind:'live',locale:'en',data:{eventType:'oneman-live'}}).map(link=>link.href),['#entry-overview','#entry-setlist']);
  assert.deepEqual(buildEntityReaderNavigation({kind:'live',locale:'en',data:{eventType:'exhibition'}}).map(link=>link.href),['#entry-overview']);
  assert.ok(buildEntityReaderNavigation({kind:'live',locale:'ja',data:{eventType:'event',setlist:[{}]}}).some(link=>link.label==='セットリスト'));
});

test('song navigation exposes recorded performance history only when there are actual linked records',()=>{
  assert.ok(music({performanceCount:2}).some(link=>link.href==='#entry-performances'));
  assert.deepEqual(music({performanceCount:0}).map(link=>link.href),['#entry-overview']);
});

test('missing sections leave a single overview link, without placeholder tabs',() => {
  assert.deepEqual(music({data:{credits:[],tracks:[]},html:'<p>Text only</p>'}),[{key:'overview',label:'Overview',href:'#entry-overview'}]);
  assert.deepEqual(buildEntityReaderNavigation({kind:'artist',locale:'en',data:{id:'kaf'},groups:{music:[],albums:[],live:[],other:[]}}),[{key:'overview',label:'Overview',href:'#entry-overview'}]);
  assert.deepEqual(buildEntityReaderNavigation({kind:'article'}),[]);
  assert.equal(prepareEntityReaderHtml(''), '');
});

test('artist navigation links only populated sections and encodes external archive filters',() => {
  const links = buildEntityReaderNavigation({kind:'artist',locale:'ja',data:{id:'kaf & form'},groups:{music:[{}],albums:[{}],live:2,other:[{}]},hasGallery:true,footprintCount:3});
  assert.deepEqual(links.map(link => [link.key,link.href]),[
    ['overview','#entry-overview'],['music','#entry-music'],['albums','#entry-albums'],['live','#entry-live'],
    ['chronicle','/ja/chronicle/?entity=kaf%20%26%20form'],['gallery','/ja/gallery/?entity=kaf%20%26%20form'],['relations','#entry-relations'],
  ]);
  assert.equal(links[0].label,'概要');
  const missingId = buildEntityReaderNavigation({kind:'artist',locale:'en',hasGallery:true,footprintCount:2});
  assert.deepEqual(missingId.map(link => link.key),['overview']);
});

test('music navigation uses actual media and lyric blocks before supporting details',() => {
  const links = music({data:{tracks:[{}],credits:[{}]},html:media + lyrics,groups:{other:[{}]},headings:[{slug:'listen',text:'Listen',depth:2}]});
  assert.deepEqual(links.map(link => [link.key,link.href]),[
    ['overview','#entry-overview'],['listen','#entry-listen'],['lyrics','#entry-lyrics'],['tracks','#entry-tracks'],['credits','#entry-credits'],['relations','#entry-relations'],
  ]);
  assert.deepEqual(music({headings:[{slug:'lyrics',text:'Lyrics',depth:2}]}).map(link => link.key),['overview']);
});

test('navigation copy supports English, Japanese and both traditional Chinese variants',() => {
  const expected = {zh:['概览','专辑','歌词','关系'],ja:['概要','アルバム','歌詞','関連'],en:['Overview','Albums','Lyrics','Relations'],'zh-tw':['概覽','專輯','歌詞','關係'],'zh-hk':['概覽','專輯','歌詞','關係']};
  for (const [locale,labels] of Object.entries(expected)) {
    const artist = buildEntityReaderNavigation({kind:'artist',locale,groups:{albums:[{}],other:[{}]}});
    const song = buildEntityReaderNavigation({kind:'music',locale,html:lyrics});
    assert.deepEqual([artist[0].label,artist[1].label,song[1].label,artist[2].label],labels,locale);
  }
});

test('stable anchors attach to the first full media and lyric node only',() => {
  const prepared = prepareEntityReaderHtml(media + '<figure class="wiki-embed"></figure>' + lyrics + lyrics);
  const document = new JSDOM(prepared).window.document;
  assert.equal(document.querySelector('#entry-listen')?.tagName,'SECTION');
  assert.ok(document.querySelector('#entry-listen .wiki-embed iframe'));
  assert.equal(document.querySelector('#entry-lyrics')?.className,'my-lyric-box');
  assert.equal(document.querySelectorAll('#entry-listen').length,1);
  assert.equal(document.querySelectorAll('#entry-lyrics').length,1);
  assert.equal(document.querySelectorAll('.my-lyric-box').length,2);
  assert.equal(prepareEntityReaderHtml(prepared),prepared);
});

test('wrapping preserves original ids, nested contents and adjacent sections',() => {
  const original = '<div class="wiki-embed" id="authored-player"><div><div>media</div></div></div><p id="after-media">After</p><div id="authored-lyrics" class="my-lyric-box"><div class="lyric-line">歌</div></div><p id="after-lyrics">End</p>';
  const prepared = prepareEntityReaderHtml(original);
  const document = new JSDOM(prepared).window.document;
  assert.equal(document.querySelector('#entry-listen > #authored-player')?.textContent,'media');
  assert.equal(document.querySelector('#entry-lyrics > #authored-lyrics .lyric-line')?.textContent,'歌');
  assert.equal(document.querySelector('#after-media')?.parentElement,document.body);
  assert.equal(document.querySelector('#after-lyrics')?.parentElement,document.body);
  assert.equal(document.querySelectorAll('#authored-player').length,1);
  assert.equal(document.querySelectorAll('#authored-lyrics').length,1);
  assert.equal(prepareEntityReaderHtml(prepared),prepared);
});

test('anchor discovery matches class tokens on opening tags, not captions, attributes or examples',() => {
  const falseTargets = '<p title="class=\'wiki-embed\'">wiki-embed</p><div data-class="wiki-embed"></div><div class="wiki-embed__caption my-lyric-box-extra"></div><!-- <figure class="wiki-embed"></figure> --><code><figure class="wiki-embed"></figure></code><script>"<div class=\'my-lyric-box\'></div>"</script>';
  assert.equal(prepareEntityReaderHtml(falseTargets),falseTargets);
  assert.deepEqual(music({html:falseTargets}).map(link => link.key),['overview']);
  const valid = '<figure title="other > value" class=\'extra wiki-embed\'>Audio</figure><div class=my-lyric-box>Words</div>';
  const prepared = prepareEntityReaderHtml(valid);
  assert.deepEqual(music({html:prepared}).map(link => link.key),['overview','listen','lyrics']);
  assert.equal(new JSDOM(prepared).window.document.querySelector('#entry-listen')?.textContent,'Audio');
});

test('existing stable ids are not duplicated or rewritten',() => {
  const original = '<figure id="entry-listen" class="wiki-embed"></figure><div id="entry-lyrics" class="my-lyric-box"></div>';
  assert.equal(prepareEntityReaderHtml(original),original);
  const preexisting = '<div id="entry-listen"></div>' + media;
  assert.equal(prepareEntityReaderHtml(preexisting),preexisting);
});

test('album listening links retain valid platform labels and deduplicate canonical URLs',() => {
  const links = musicListenLinks({officialLinks:[
    {url:'https://music.apple.com/jp/album/123?i=456',label:'Apple Music 日本区'},
    {url:'https://open.spotify.com/album/abc'},
    {url:'http://music.163.com/#/album?id=123'},
    {url:'https://www.youtube.com/watch?v=abc'},
    {url:'https://music.apple.com/jp/album/123?i=456'},
    {url:'https://kaf.kamitsubaki.jp/discography/123/',label:'官方网站'},
  ]});
  assert.deepEqual(links,[
    {label:'Apple Music 日本区',url:'https://music.apple.com/jp/album/123?i=456'},
    {label:'Spotify',url:'https://open.spotify.com/album/abc'},
    {label:'网易云音乐',url:'http://music.163.com/#/album?id=123'},
    {label:'YouTube',url:'https://www.youtube.com/watch?v=abc'},
  ]);
  assert.deepEqual(musicListenLinks(),[]);
});

test('untrusted hosts, non-web schemes and credential or port tricks never become listening actions',() => {
  const urls = ['javascript:alert(1)','ftp://music.apple.com/a','//music.apple.com/a','/listen/','https://music.apple.com.evil.test/a','https://evil-music.apple.com/a','https://evil.test/?url=https://music.apple.com/a','https://music.apple.com@evil.test/a','https://user:pass@music.apple.com/a','https://music.apple.com:444/a','https://music.apple.com./a','not a url'];
  assert.deepEqual(musicListenLinks({officialLinks:urls.map(url => ({url}))}),[]);
});
