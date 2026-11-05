import {test} from 'node:test';
import assert from 'node:assert/strict';
import {articleHTML} from '../src/lib/articleMarkdownRenderer.mjs';
import {renderMarkdownFragment} from '../src/lib/markdown.mjs';
import {parseVisualBlocks,blockMarkdown} from '../src/lib/visualEditor.mjs';
import {normalizeSpeechRoles,scanSpeech,speechRolesMarkdown,parseSpeechImport,mergeSpeechImport} from '../src/lib/speech.mjs';
import {speechTemplate,speechPrompt} from '../src/lib/speechResources.mjs';
const roles=[{id:'kaf',name:'花谱',color:'#F29AC2',entityId:'kaf',href:'/zh/database/artists/vwp/kaf/',avatar:'/images/artists/kaf.jpg'}];
const body=speechRolesMarkdown(roles)+'\n\n:::speech kaf\n第一段 **强调**。\n\n第二段 {{ruby::花譜::かふ}}。\n:::\n\n普通段落。';
test('shared article and static entry renderer preserve structure, role and rich Markdown',async()=>{
 for(const html of [articleHTML(body),await renderMarkdownFragment(body)]){
  assert.match(html,/wiki-speech/);assert.match(html,/花谱/);assert.match(html,/<strong>强调<\/strong>/);assert.match(html,/<ruby>/);assert.match(html,/href="\/zh\/database\/artists\/vwp\/kaf\/"/);assert.match(html,/普通段落/);assert.doesNotMatch(html,/speech-roles|:::speech/);
 }
});
test('literal code examples and malformed fences are not interpreted',()=>{
 assert.doesNotMatch(articleHTML('````md\n'+body+'\n````'),/class="wiki-speech"/);
 assert.ok(scanSpeech(':::speech kaf\n未结束').errors.length);
 assert.throws(()=>parseSpeechImport(':::speech kaf\n未结束'),/未闭合/);
 assert.throws(()=>parseSpeechImport(':::speech missing\n正文\n:::'),/未定义角色/);
});
test('template covers every role; visual blocks round trip unchanged',()=>{
 const imported=parseSpeechImport(speechTemplate);assert.equal(imported.roles.length,3);assert.equal(imported.parts.filter(p=>p.type==='speech').length,3);
 const blocks=parseVisualBlocks(body);assert.deepEqual(blocks.map(b=>b.type),['speech-roles','speech','paragraph']);
 assert.equal(blocks.map(b=>blockMarkdown(b)).join('\n\n'),body);
 assert.match(speechPrompt,/不要翻译/);
});
test('plain import keeps unknown speakers and unlabelled prose without guessing',()=>{
 const result=parseSpeechImport('导语\n\nK：原文。\n没有标记的第二段。\nR: 回答。\nhttps://example.com');
 assert.deepEqual(result.roles.map(r=>r.name),['K','R']);
 assert.equal(result.parts.filter(p=>p.type==='speech').length,2);assert.ok(result.notes.length>=2);assert.ok(result.parts.some(p=>p.source?.includes('没有标记')));
});
test('registry collisions rename references without merging unrelated roles',()=>{
 const result=mergeSpeechImport([{id:'speaker_1',name:'旧角色'}],parseSpeechImport('新角色：发言'));
 assert.equal(result.roles.length,2);assert.equal(result.parts[0].roleId,'speaker_1_2');assert.equal(result.roles[0].name,'旧角色');
});
test('roles and authored HTML cannot inject active content',()=>{
 assert.throws(()=>normalizeSpeechRoles([{id:'a',name:'A',avatar:'javascript:alert(1)'}]),/头像/);
 assert.throws(()=>normalizeSpeechRoles([{id:'a',name:'A',color:'red;background:url(x)'}]),/颜色/);
 assert.throws(()=>normalizeSpeechRoles([{id:'a',name:'A'},{id:'a',name:'B'}]),/重复/);
 const html=articleHTML(speechRolesMarkdown([{id:'x',name:'<img src=x onerror=alert(1)>',href:'javascript:alert(1)'}])+'\n\n:::speech x\n<script>alert(1)</script>\n:::' );
 assert.doesNotMatch(html,/<script|onerror=\"|href="javascript/);assert.match(html,/&#x3C;img/);
 assert.throws(()=>parseSpeechImport('---\ntitle: replace\n---\nA：hi'),/不会导入/);
});

test('references and footnotes resolve across speech boundaries',()=>{
 const html=articleHTML(speechRolesMarkdown(roles)+'\n\n:::speech kaf\n[人物][person]，脚注[^note]。\n:::\n\n[person]: /zh/database/artists/vwp/kaf/\n[^note]: 脚注原文。');
 assert.match(html, /href="\/zh\/database\/artists\/vwp\/kaf\/"[^>]*>人物/);
 assert.match(html, /data-footnote-ref/);
 assert.match(html, /脚注原文/);
 assert.doesNotMatch(html, /\[人物\]\[person\]/);
});

test('explicit import mapping reuses existing role without changing identity',()=>{
 const imported=parseSpeechImport('K：接续发言。');imported.mapping={speaker_1:'kaf'};
 const merged=mergeSpeechImport(roles,imported);
 assert.equal(merged.roles.length,1);assert.equal(merged.parts[0].roleId,'kaf');
 assert.equal(merged.roles[0].avatar,roles[0].avatar);
 assert.throws(()=>mergeSpeechImport(roles,{...imported,mapping:{speaker_1:'missing'}}),/不存在/);
});
