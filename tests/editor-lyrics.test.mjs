import assert from 'node:assert/strict';
import test from 'node:test';
import { LyricsImportError, formatLyricTimestamp, parseLyricTimestamp, parseLyricsBatch, validLyricsTiming } from '../src/lib/editorLyrics.mjs';
import { blockMarkdown, newBlock, newDraft, parseVisualBlocks, validateDraft } from '../src/lib/visualEditor.mjs';

test('imports alternating original and translation lines into the existing row shape', () => {
  const result = parseLyricsBatch('  夜が明ける  \n  夜色将尽\n\n君の声\n你的声音  ');
  assert.equal(result.layout, 'alternating');
  assert.equal(result.hasTiming, false);
  assert.deepEqual(result.rows, [
    { original: '夜が明ける', kana: '', romaji: '', translation: '夜色将尽' },
    { original: '君の声', kana: '', romaji: '', translation: '你的声音' },
  ]);
});

test('imports LRC line timestamps without inventing translations or word timing', () => {
  const result = parseLyricsBatch('[00:03.50]夜が明ける\n[00:05.125]君の声');
  assert.equal(result.layout, 'original-only');
  assert.deepEqual(result.rows.map(({original,time,translation,units})=>({original,time,translation,units})), [
    { original: '夜が明ける', time: '00:03.50', translation: '', units: undefined },
    { original: '君の声', time: '00:05.125', translation: '', units: undefined },
  ]);
  assert.equal(validLyricsTiming(result.rows), true);
  assert.equal(parseLyricsBatch('[00:03.50]夜が明ける\r[00:05.125]君の声').rows.length,2);
});

test('imports translated LRC pairs sharing a timestamp', () => {
  const result = parseLyricsBatch('[01:23.45]あなたが歌う\n[01:23.45]你在歌唱\n[01:27.00]空を見る\n[01:27.00]望向天空');
  assert.equal(result.layout, 'alternating');
  assert.deepEqual(result.rows.map(row=>[row.original,row.translation,row.time]), [
    ['あなたが歌う','你在歌唱','01:23.45'],
    ['空を見る','望向天空','01:27.00'],
  ]);
  assert.match(blockMarkdown({...newBlock('lyrics'),rows:result.rows},'zh'), /<div class="cn-lyric">\[01:23.45\]你在歌唱<\/div>/);
});

test('LRC descriptive tags are reported separately and timing offsets are rejected', () => {
  const result = parseLyricsBatch('[ti:Song]\n[ar:Singer]\n[00:03.50]歌');
  assert.deepEqual(result.ignoredMetadata,[{line:1,tag:'ti'},{line:2,tag:'ar'}]);
  assert.deepEqual(result.rows.map(row=>row.original),['歌']);
  assert.throws(()=>parseLyricsBatch('[offset:500]\n[00:03.50]歌'),error=>error.code==='unsupported-offset'&&error.line===1);
});

test('import reports the offending line and never silently repairs invalid timing or pairing', () => {
  const rejected = (source, options, code, line) => assert.throws(() => parseLyricsBatch(source,options), error =>
    error instanceof LyricsImportError && error.code === code && error.line === line);
  rejected('原文\n译文\n剩余原文',undefined,'unpaired-line',3);
  rejected('[00:60.00]错误',undefined,'invalid-timestamp',1);
  rejected('[00:03.50]一行\n[00:02.00]二行',undefined,'reversed-timestamp',2);
  rejected('[00:03.50]原文\n[00:03.60]译文',{layout:'alternating'},'mismatched-timestamp',2);
  rejected('[00:03.50][00:04.00]两次',undefined,'multiple-timestamps',1);
  rejected('',undefined,'empty-input',null);
});

test('timestamp helpers match the published syntax and avoid invalid minute overflow', () => {
  assert.equal(parseLyricTimestamp('01:23.45'),83.45);
  assert.equal(parseLyricTimestamp('01:60.45'),null);
  assert.equal(formatLyricTimestamp(61.234,3),'01:01.234');
  assert.equal(formatLyricTimestamp(59.999,2),'01:00.00');
  assert.equal(formatLyricTimestamp(6000),null);
});

test('editing an imported lyric preserves the original ruby, spacing and supplied timing', () => {
  const source = '{{lyrics-controls::zh}}\n\n<div class="my-lyric-box">\n<div class="lyric-line">\n<div class="jp-lyric">[00:01.00]Hello <ruby>世界<rt class="furi">せかい</rt><rt class="roma">sekai</rt></ruby> !</div>\n<div class="cn-lyric">[00:01.00]你好，世界！</div>\n</div>\n</div>';
  const block = parseVisualBlocks(source)[0];
  assert.equal(block.type,'lyrics');
  assert.equal(block.rows[0].original,'Hello 世界 !');
  assert.deepEqual(block.rows[0].units.map(unit=>[unit.original,unit.kana,unit.romaji,unit.time]),[
    ['Hello ','','','00:01.00'],['世界','せかい','sekai',''],[' !','','',''],
  ]);
  block.rows[0].translation = '更新的译文';
  const updated = blockMarkdown(block,'zh');
  assert.match(updated, /\[00:01.00\]Hello <ruby>世界<rt class="furi">せかい<\/rt><rt class="roma">sekai<\/rt><\/ruby> !/);
  assert.match(updated, /<div class="cn-lyric">\[00:01.00\]更新的译文<\/div>/);
  assert.equal(parseVisualBlocks(updated)[0].rows[0].original,'Hello 世界 !');
});

test('new lyric exports use the language-specific translation container', () => {
  const block = {...newBlock('lyrics'),rows:[{original:'歌',kana:'',romaji:'',translation:'A song'}]};
  assert.match(blockMarkdown(block,'en'), /class="trans-lyric">A song<\/div>/);
  block.rows[0].translation = '';
  assert.doesNotMatch(blockMarkdown(block,'ja'), /(?:cn|trans)-lyric/);
  block.rows[0].translation = '不应无声丢弃';
  assert.match(blockMarkdown(block,'ja'), /class="trans-lyric">不应无声丢弃<\/div>/);
  const japaneseDraft = newDraft('songs','ja');
  japaneseDraft.blocks = [block];
  assert.ok(validateDraft(japaneseDraft).includes('lyrics'));
});

test('an inserted empty lyric row cannot be published as a blank lyric container', () => {
  const draft = newDraft('songs','zh');
  draft.blocks = [newBlock('lyrics')];
  assert.ok(validateDraft(draft).includes('lyrics'));
  draft.blocks[0].rows[0].original = '歌';
  assert.ok(!validateDraft(draft).includes('lyrics'));
});
