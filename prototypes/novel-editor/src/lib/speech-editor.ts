import type {Editor,JSONContent} from '@tiptap/core';
import {Fragment} from '@tiptap/pm/model';
import {Selection} from '@tiptap/pm/state';
import {closeHistory} from '@tiptap/pm/history';
import {normalizeSpeechRoles,mergeSpeechImport} from '../../../../src/lib/speech.mjs';
import {parseWikiBody} from './wiki-document';
export type SpeechRole={id:string;name:string;color:string;entityId:string;href:string;avatar:string};
export function speechRegistry(editor:Editor){
  let found:{position:number;node:any}|null=null;
  editor.state.doc.forEach((node,position)=>{if(node.type.name==='wikiBlock'&&node.attrs.data?.type==='speech-roles'){if(found)throw Error('文档含多份角色配置，请在源码中合并后再编辑。');found={position,node};}});
  return found as {position:number;node:any}|null;
}
export function documentSpeechRoles(editor:Editor):SpeechRole[]{return normalizeSpeechRoles(speechRegistry(editor)?.node.attrs.data.roles||[]);}
export function saveSpeechRoles(editor:Editor,roles:SpeechRole[]){
  const validated=normalizeSpeechRoles(roles),registry=speechRegistry(editor),tr=closeHistory(editor.state.tr);
  const attrs={data:{type:'speech-roles',roles:validated},source:'',edited:true};
  if(registry)tr.setNodeMarkup(registry.position,undefined,{...registry.node.attrs,...attrs});else tr.insert(0,editor.schema.nodes.wikiBlock.create(attrs));
  editor.view.dispatch(tr);editor.view.dispatch(closeHistory(editor.state.tr));
}
export function speechInsertPosition(editor:Editor){const s=editor.state.selection;return s.$to.depth?s.$to.after(1):s.to;}
export function insertSpeechImport(editor:Editor,imported:any,position:number,locale='zh'){
  const merged=mergeSpeechImport(documentSpeechRoles(editor),imported),registry=speechRegistry(editor);
  const content:JSONContent[]=merged.parts.flatMap((p:any)=>p.type==='speech'?[{type:'wikiBlock',attrs:{data:{type:'speech',roleId:p.roleId,text:p.text},source:'',edited:true}}]:p.source.trim()?parseWikiBody(editor,p.source,locale):[]);
  if(!content.length)throw Error('没有可插入的内容。');
  const tr=closeHistory(editor.state.tr),attrs={data:{type:'speech-roles',roles:merged.roles},source:'',edited:true};
  if(registry)tr.setNodeMarkup(registry.position,undefined,{...registry.node.attrs,...attrs});else tr.insert(0,editor.schema.nodes.wikiBlock.create(attrs));
  const at=tr.mapping.map(Math.max(0,Math.min(position,editor.state.doc.content.size)));
  const fragment=Fragment.fromArray(content.map(n=>editor.schema.nodeFromJSON(n)));
  tr.insert(at,fragment);tr.setSelection(Selection.near(tr.doc.resolve(Math.min(at+fragment.size,tr.doc.content.size))));
  editor.view.dispatch(tr.scrollIntoView());editor.view.dispatch(closeHistory(editor.state.tr));editor.view.focus();
}
