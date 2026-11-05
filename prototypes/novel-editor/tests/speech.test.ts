import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {Editor} from '@tiptap/core';
import {undoNoScroll,redoNoScroll} from '@tiptap/pm/history';
import {createWikiExtensions} from '../src/editor/extensions';
import {loadWikiDocument,exportWikiDocument} from '../src/lib/wiki-document';
import {insertSpeechImport,documentSpeechRoles,saveSpeechRoles} from '../src/lib/speech-editor';
import {parseSpeechImport} from '../../../src/lib/speech.mjs';
const dom=new JSDOM('<div id="editor"></div>',{url:'http://127.0.0.1:18500',pretendToBeVisual:true});
for(const key of ['window','document','navigator','HTMLElement','Element','Node','DOMParser','MutationObserver','getComputedStyle','ShadowRoot','requestAnimationFrame','cancelAnimationFrame'])Object.defineProperty(globalThis,key,{value:(dom.window as any)[key],configurable:true,writable:true});
const editor=new Editor({element:dom.window.document.querySelector('#editor')!,extensions:createWikiExtensions(undefined,false),content:''});
after(()=>{editor.destroy();dom.window.close();});
for(const type of ['editorial-article','person'])test(type+' import is one undoable operation and survives source reload',()=>{
 const source=`---\nschemaVersion: 2\nid: test-document\nlocale: zh\nentityType: ${type}\n${type==='person'?'name':'title'}: 测试\n---\n\n原有正文。\n`;
 const loaded=loadWikiDocument(editor,source);
 // Avoid layout-dependent scroll methods in JSDOM.
 editor.view.dom.getBoundingClientRect=()=>({top:0,left:0,right:600,bottom:400,width:600,height:400,x:0,y:0,toJSON(){}});
 insertSpeechImport(editor,parseSpeechImport('K：第一段。\nR：回答。'),editor.state.doc.content.size);
 const out=exportWikiDocument(editor,loaded.context,loaded.metadata);assert.match(out,/原有正文/);assert.match(out,/:::speech speaker_1/);assert.equal(documentSpeechRoles(editor).length,2);
 assert.equal(undoNoScroll(editor.state,editor.view.dispatch),true);assert.equal(exportWikiDocument(editor,loaded.context,loaded.metadata),source);
 assert.equal(redoNoScroll(editor.state,editor.view.dispatch),true);assert.equal(exportWikiDocument(editor,loaded.context,loaded.metadata),out);
 const reopened=loadWikiDocument(editor,out);assert.equal(exportWikiDocument(editor,reopened.context,reopened.metadata),out);
 const roles=documentSpeechRoles(editor);roles[0].name='花谱';saveSpeechRoles(editor,roles);assert.match(exportWikiDocument(editor,reopened.context,reopened.metadata),/花谱/);assert.equal(documentSpeechRoles(editor)[0].id,'speaker_1');
});
