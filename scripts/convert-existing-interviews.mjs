// Offline, reversible conversion of the reviewed public article snapshots.
// Never writes to an API or a database. The manifest pins the source version/hash.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {speechRolesMarkdown,speechMarkdown,parseSpeechImport,scanSpeech} from '../src/lib/speech.mjs';
import {articleHTML} from '../src/lib/articleMarkdownRenderer.mjs';
import {renderMarkdownFragment} from '../src/lib/markdown.mjs';
import {JSDOM} from 'jsdom';
import {parseVisualBlocks,blockMarkdown} from '../src/lib/visualEditor.mjs';

const root=new URL('../maintenance/article-speech-conversion/',import.meta.url);
const sha=s=>createHash('sha256').update(s).digest('hex');
const entities=JSON.parse(fs.readFileSync(new URL('../dist/zh/article-entities.json',import.meta.url))).entities;
const person=(id,name,color)=>{const e=entities.find(e=>e.id===id);assert(e);return {id,name,color,entityId:id,href:e.path,avatar:e.image};};
const q1='article-0ce3ab7e390724dda607461650fbcaa2ae10a4f4';
const shikisai='article-b4ab2f0716334c5972b13113826ac1944aaf6f90';
const changes=[],mediaUrls=new Set();
for(const filename of fs.readdirSync(new URL('original/',root)).filter(f=>f.endsWith('.json')).sort()){
 const input=JSON.parse(fs.readFileSync(new URL('original/'+filename,root))),a=input.article;
 if(a.authorAvatarUrl)mediaUrls.add(a.authorAvatarUrl);
 for(const media of a.mediaRefs||[])if(media.src)mediaUrls.add(media.src);
 const edits=[];let roles=[];
 if(a.id===q1){
  roles=[person('kaf','花谱','#F29AC2'),person('rim','理芽','#8CBEE5')];
  const re=/^[\u200b]*\*\*(?:(花谱|理芽)\*\*（以下简称\*\*[KR]\*\*）:|([KR]):\*\*)[ \t]*(.*)(?:\n\u200b)?$/gm;
  for(const m of a.body.matchAll(re)){
   const id=m[1]==='花谱'||m[2]==='K'?'kaf':'rim';
   // A trailing hard-break slash + empty zero-width line is layout residue,
   // not dialogue. At a block boundary it would otherwise render as a literal slash.
   const text=m[3].replace(/\\$/,'');
   edits.push({start:m.index,end:m.index+m[0].length,old:m[0],next:speechMarkdown(id,text),role:id,removedHardBreak:text!==m[3]});
  }
  assert.equal(edits.length,36);
 }else if(a.id===shikisai){
  roles=[{id:'interviewer',name:'Kanon Izumi',color:'#B7B7B0'},person('isekaijoucho','ヰ世界情緒','#B5A2D9')];
  // Only the explicitly attributed interview; no inference from surrounding prose.
  const re=/^(\*\*—— [^\n]+|\*\*ヰ世界情緒\*\* [^\n]+)\n\n(\*\*［译］—— [^\n]+|\*\*［译］ヰ世界情緒\*\* [^\n]+)/gm;
  for(const m of a.body.matchAll(re)){
   const question=m[1].startsWith('**—— '),id=question?'interviewer':'isekaijoucho';
   assert(m[2].startsWith(question?'**［译］—— ':'**［译］ヰ世界情緒** '));
   const ja=question?m[1].replace(/^\*\*—— /,'**'):m[1].slice('**ヰ世界情緒** '.length);
   const zh=question?m[2].replace(/^\*\*［译］—— /,'**［译］**\n\n**'):m[2].replace(/^\*\*［译］ヰ世界情緒\*\* /,'**［译］**\n\n');
   edits.push({start:m.index,end:m.index+m[0].length,old:m[0],next:speechMarkdown(id,ja+'\n\n'+zh),role:id});
  }
  assert.equal(edits.length,75);
 }
 let body=a.body;
 for(const e of [...edits].reverse()){assert.equal(body.slice(e.start,e.end),e.old);body=body.slice(0,e.start)+e.next+body.slice(e.end);}
 const registry=roles.length?speechRolesMarkdown(roles)+'\n\n':'';
 const converted=registry+body;
 // Prove reversibility, including all non-dialogue text and original whitespace.
 let restored=body,shift=0;
 const offsets=edits.map(e=>{const start=e.start+shift;shift+=e.next.length-e.old.length;return {...e,convertedStart:start};});
 for(const e of [...offsets].reverse()){
  assert.equal(restored.slice(e.convertedStart,e.convertedStart+e.next.length),e.next);
  restored=restored.slice(0,e.convertedStart)+e.old+restored.slice(e.convertedStart+e.next.length);
 }
 assert.equal(restored,a.body);
 if(roles.length){
  const imported=parseSpeechImport(converted);assert.equal(imported.parts.filter(p=>p.type==='speech').length,edits.length);
  const blocks=parseVisualBlocks(converted);assert.equal(blocks.filter(b=>b.type==='speech').length,edits.length);
  const roundtrip=blocks.map(blockMarkdown).join('\n\n');
  assert.deepEqual(scanSpeech(roundtrip).parts.filter(p=>p.type==='speech').map(p=>[p.roleId,p.text]),scanSpeech(converted).parts.filter(p=>p.type==='speech').map(p=>[p.roleId,p.text]));
  const html=articleHTML(converted,'zh');assert.equal((html.match(/class="wiki-speech"/g)||[]).length,edits.length);
  assert(!html.includes(':::speech'));assert(!html.includes('speech-roles'));
  const staticHtml=await renderMarkdownFragment(converted);
  assert.equal((staticHtml.match(/class="wiki-speech"/g)||[]).length,edits.length);
  const oldDoc=new JSDOM(articleHTML(a.body,'zh')).window.document;
  const newDoc=new JSDOM(html).window.document;
  const textList=(doc,selector)=>[...doc.querySelectorAll(selector)].map(e=>e.textContent);
  assert.deepEqual(textList(newDoc,'h1,h2,h3,h4,h5,h6'),textList(oldDoc,'h1,h2,h3,h4,h5,h6'));
  const links=doc=>[...doc.querySelectorAll('a:not(.wiki-speech-name)')].map(e=>[e.textContent,e.getAttribute('href')]);
  assert.deepEqual(links(newDoc),links(oldDoc));
  assert.deepEqual(textList(newDoc,'table,blockquote'),textList(oldDoc,'table,blockquote'));
  assert.equal(newDoc.querySelectorAll('.wiki-speech-body').length,edits.length);
  assert(![...newDoc.querySelectorAll('.wiki-speech-body')].some(e=>e.textContent.trim().endsWith('\\')));
  if(a.id===shikisai)assert.equal([...newDoc.querySelectorAll('.wiki-speech-body')].filter(e=>e.textContent.includes('［译］')).length,75);
  for(const r of roles.filter(r=>r.entityId)){
   assert(fs.existsSync(new URL('../dist'+r.href+'index.html',import.meta.url)));
   assert(fs.existsSync(new URL('../dist'+r.avatar,import.meta.url)));
  }
 }
 const output={...input,article:{...a,body:converted}};
 assert.deepEqual({...output.article,body:a.body},a);
 fs.writeFileSync(new URL('converted/'+filename,root),JSON.stringify(output,null,2)+'\n');
 fs.writeFileSync(new URL('converted/'+a.id+'.md',root),converted);
 changes.push({id:a.id,title:a.title,baseVersion:a.version,status:edits.length?'converted':'unchanged-not-an-interview',sourceBodySha256:sha(a.body),convertedBodySha256:sha(converted),speechCount:edits.length,roles,edits:offsets.map(({old,next,...e})=>({...e,oldSha256:sha(old),newSha256:sha(next)})),checks:{reversible:true,metadataUnchanged:true,editorRoundtrip:roles.length?true:'not-applicable',rendered:roles.length?true:'not-applicable'}});
}
const manifest={task:'20261105-speech-blocks-a1',productionApplied:false,publicReadAllowlist:['https://api.kamitsubaki.wiki/api/articles?locale=zh',...changes.map(a=>'https://api.kamitsubaki.wiki/api/articles/items/'+a.id+'?locale=zh')],previewMediaReadAllowlist:[...mediaUrls].sort(),articles:changes};
fs.writeFileSync(new URL('manifest.json',root),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify(changes.map(({id,title,speechCount,status})=>({id,title,speechCount,status})),null,2));
