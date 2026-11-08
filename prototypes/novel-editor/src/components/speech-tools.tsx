import {workbenchText as t} from '@/lib/workbench-copy';
import {previewAssetUrl} from '@/lib/editor-host';
import {useContext,useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Editor} from '@tiptap/core';
import {Plus,Pencil,Download,Copy,UserRound,ExternalLink} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from './ui/button';
import {Input} from './ui/input';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from './ui/dialog';
import {CatalogContext,EntrySearch} from './entity-picker';
import {normalizeSpeechRoles,speechColors,parseSpeechImport,mergeSpeechImport,speechRolesMarkdown,speechMarkdown} from '../../../../src/lib/speech.mjs';
import {articleHTML} from '../../../../src/lib/articleMarkdownRenderer.mjs';
import {documentSpeechRoles,saveSpeechRoles,insertSpeechImport,speechInsertPosition,type SpeechRole} from '@/lib/speech-editor';
import {speechTemplate as template,speechPrompt as prompt} from '../../../../src/lib/speechResources.mjs';

function useRoles(editor:Editor|null){
 const [version,setVersion]=useState(0);
 useEffect(()=>{if(!editor)return;const update=()=>setVersion(n=>n+1);editor.on('transaction',update);return()=>{editor.off('transaction',update);};},[editor]);
 let roles:SpeechRole[]=[],error='';try{if(editor)roles=documentSpeechRoles(editor);}catch(e:any){error=e.message;}
 return {roles,error,version};
}
export function SpeechAvatar({role}:{role:Partial<SpeechRole>}){return <span className="wiki-speech-avatar"><UserRound size={18} aria-hidden="true"/>{role.avatar?<img key={role.avatar} src={previewAssetUrl(role.avatar)} alt="" referrerPolicy="no-referrer" onError={e=>{e.currentTarget.hidden=true;}}/>:null}</span>;}
export function SpeechByline({role}:{role:SpeechRole}){return <div className="wiki-speech-byline" style={{'--speech-color':role.color} as CSSProperties}><SpeechAvatar role={role}/>{role.href?<a className="wiki-speech-name" href={role.href} target="_blank" rel="noopener noreferrer">{role.name}</a>:<span className="wiki-speech-name">{role.name}</span>}</div>;}
export function RoleFields({role,onChange}:{role:SpeechRole;onChange:(r:SpeechRole)=>void}){
 const [search,setSearch]=useState(false);
 const [uploading,setUploading]=useState(false);
 const latest=useRef({role,onChange});latest.current={role,onChange};
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 const uploadAvatar=async(input:HTMLInputElement)=>{
  const file=input.files?.[0];if(!file)return;
  const initial=latest.current.role;setUploading(true);
  try{
   const {uploadLocalImage}=await import('@/editor/node-dialog');const avatar=await uploadLocalImage(file);
   const current=latest.current;
   if(mounted.current&&current.role.id===initial.id&&current.role.avatar===initial.avatar&&current.role.entityId===initial.entityId)current.onChange({...current.role,avatar});
  }catch(error:any){if(mounted.current)toast.error(t(error.message), { id: error.message });}
  finally{input.value='';if(mounted.current)setUploading(false);}
 };
 return <div className="speech-role-fields">
 <label>{t("名字")}<Input value={role.name} maxLength={100} placeholder={t("输入发言者名字")} onChange={e=>onChange({...role,name:e.target.value})}/></label>
 <details className="speech-role-options"><summary>{t("头像、颜色与人物链接")}</summary><div className="speech-role-options-body">
 <div className="speech-role-summary"><SpeechAvatar role={role}/>{role.href?<a href={role.href} target="_blank" rel="noopener noreferrer">{role.name} <ExternalLink size={14}/></a>:<span>{role.name||'新角色'}</span>}</div>
 <div className="speech-role-kind"><Button size="sm" variant="outline" onClick={()=>setSearch(!search)}>{role.entityId?t('更换人物'):t('关联站内人物')}</Button>{role.entityId?<Button size="sm" variant="ghost" onClick={()=>{onChange({...role,entityId:'',href:''});setSearch(false);}}>{t("解除关联")}</Button>:null}</div>
 {search?<EntrySearch entityTypes={['person','virtual-avatar']} onSelect={entry=>{onChange({...role,entityId:entry.id,name:entry.title,href:entry.url||'',avatar:entry.image||''});setSearch(false);}}/>:null}
 <label>{t("头像地址")}<Input value={role.avatar} placeholder={t("站内图片路径或 HTTPS 地址")} onChange={e=>onChange({...role,avatar:e.target.value})}/></label>
 <label className="speech-file-label">{uploading?t('正在上传头像…'):t('上传头像')}<input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadAvatar(e.currentTarget)}/></label>
 <label>{t("颜色")}<span className="speech-colors">{speechColors.map(color=><button type="button" key={color} style={{background:color}} aria-label={`颜色 ${color}`} aria-pressed={role.color.toLowerCase()===color.toLowerCase()} onClick={()=>onChange({...role,color})}/>)}<input type="color" aria-label={t("自定义角色颜色")} value={role.color} onChange={e=>onChange({...role,color:e.target.value})}/></span></label>
 </div></details></div>;
}
function newSpeechRole(count:number):SpeechRole{return {id:'speaker_'+crypto.randomUUID().slice(0,8),name:'',color:speechColors[count%speechColors.length],entityId:'',href:'',avatar:''};}
export function SpeechRoleSelect({editor,value,onChange}:{editor:Editor;value:string;onChange:(id:string)=>void}){
 const {roles,error}=useRoles(editor);const [editing,setEditing]=useState<SpeechRole|null>(()=>roles.length?null:newSpeechRole(0));const [formError,setFormError]=useState('');
 const selected=roles.find(role=>role.id===value);
 return <div className="speech-role-select">
 {roles.length?<div className="speech-role-select-row"><label className="speech-select-label">{t("发言者")}<select value={value} onChange={e=>{onChange(e.target.value);setEditing(null);setFormError('');}}><option value="">{t("选择发言者")}</option>{roles.map(role=><option value={role.id} key={role.id}>{role.name}</option>)}</select></label><Button variant="ghost" size="icon-sm" aria-label={t("编辑发言者")} disabled={!selected||!!error} onClick={()=>{setEditing({...selected!});setFormError('');}}><Pencil/></Button><Button variant="ghost" size="icon-sm" aria-label={t("添加发言者")} disabled={!!error} onClick={()=>{setEditing(newSpeechRole(roles.length));setFormError('');}}><Plus/></Button></div>:null}
 {editing?<div className="speech-inline-role-editor"><RoleFields key={editing.id} role={editing} onChange={setEditing}/><div className="speech-inline-role-actions">{roles.length?<Button size="sm" variant="ghost" onClick={()=>setEditing(null)}>{t("取消")}</Button>:null}<Button size="sm" variant="outline" disabled={!editing.name.trim()||!!error} onClick={()=>{try{saveSpeechRoles(editor,roles.some(role=>role.id===editing.id)?roles.map(role=>role.id===editing.id?editing:role):[...roles,editing]);onChange(editing.id);setEditing(null);setFormError('');}catch(e:any){setFormError(e.message);}}}>{roles.some(role=>role.id===editing.id)?t('保存修改'):t('使用此名字')}</Button></div></div>:null}
 {error||formError?<p role="alert" className="speech-error">{error||formError}</p>:null}
 </div>;
}
function downloadTemplate(){const url=URL.createObjectURL(new Blob([template],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='访谈导入模板.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function SpeechImportDialog({editor,open,onClose}:{editor:Editor;open:boolean;onClose:()=>void}){
 const {locale}=useContext(CatalogContext);const {roles:existingRoles}=useRoles(editor);const [sourceOpen,setSourceOpen]=useState(false);const [source,setSource]=useState('');const [parsed,setParsed]=useState<any>(null);const [error,setError]=useState('');const [selected,setSelected]=useState('');const [tab,setTab]=useState('preview');const [copyFallback,setCopyFallback]=useState(false);const [position,setPosition]=useState(0);const [origin,setOrigin]=useState<any>(null);
 useEffect(()=>{if(open){setPosition(speechInsertPosition(editor));setOrigin(editor.state.doc);setSource('');setParsed(null);setError('');setSelected('');setSourceOpen(false);setCopyFallback(false);setTab('preview');}},[open,editor]);
 const changeSource=(value:string)=>{setSource(value);setParsed(null);setError('');};
 const analyze=()=>{try{const result=parseSpeechImport(source);setParsed({...result,mapping:{},sourceNames:Object.fromEntries(result.roles.map((r:SpeechRole)=>[r.id,r.name]))});setSelected('');setSourceOpen(false);setTab('preview');setError('');}catch(e:any){setError(e.message);setParsed(null);}};
 const role=parsed?.roles.find((r:SpeechRole)=>r.id===selected);
 let html='',previewError='';try{if(parsed){const merged=mergeSpeechImport(existingRoles,parsed);html=articleHTML(speechRolesMarkdown(merged.roles)+'\n\n'+merged.parts.map((p:any)=>p.type==='speech'?speechMarkdown(p.roleId,p.text):p.source).join('\n\n'),locale);}}catch(e:any){previewError=e.message;}
 const count=parsed?.parts.filter((p:any)=>p.type==='speech').length||0;
 return <Dialog open={open} onOpenChange={next=>{if(!next)onClose();}}><DialogContent className="speech-import-dialog"><DialogHeader><DialogTitle>{t("快速导入对话")}</DialogTitle><DialogDescription>{t("粘贴对话或上传 Markdown，预览后插入当前文档。")}</DialogDescription></DialogHeader>
 <div className="speech-import-top"><div><Button variant="ghost" size="sm" onClick={downloadTemplate}><Download size={16}/>{t("下载模板")}</Button><Button variant="ghost" size="sm" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);toast.success(t('AI 转换提示词已复制'), { id: 'AI 转换提示词已复制' });}catch{setCopyFallback(true);}}}><Copy size={16}/>{t("复制 AI 转换提示词")}</Button></div></div>
 <div className="speech-import-scroll">{copyFallback?<label>{t("请选择并复制提示词")}<textarea readOnly value={prompt} onFocus={e=>e.target.select()}/></label>:null}
 <div className="speech-import-columns"><section className={parsed&&!sourceOpen?'speech-source-mobile-hidden':''}><div className="speech-import-source-heading"><strong>{t("粘贴文本")}</strong><label className="speech-file-label">{t("上传 Markdown")}<input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>600000){setError(t('文件过大，请分批导入。'));return;}try{changeSource(await file.text());}catch{setError(t('文件读取失败，请重新选择文件或粘贴原文。'));}e.target.value='';}}/></label></div><textarea aria-label={t("对话原文")} spellCheck={false} placeholder={'花谱：这里填写发言。\n理芽：这里填写回答。'} value={source} onChange={e=>changeSource(e.target.value)}/><Button variant="outline" disabled={!source.trim()} onClick={analyze}>{t("识别发言与角色")}</Button></section>
 <section><div className="speech-mobile-tabs">{parsed?<Button variant="ghost" onClick={()=>setSourceOpen(!sourceOpen)}>{sourceOpen?t('收起原文'):t('修改原文')}</Button>:null}<Button variant={tab==='roles'?'secondary':'ghost'} onClick={()=>setTab('roles')}>{t("角色")}</Button><Button variant={tab==='preview'?'secondary':'ghost'} onClick={()=>setTab('preview')}>{t("预览")}</Button></div>{!parsed?<p className="speech-help">{t("识别后在这里预览。")}</p>:<><details className={'speech-import-roles '+(tab!=='roles'?'speech-mobile-hidden':'')} open={tab==='roles'} onToggle={event=>{if(event.currentTarget.open!==(tab==='roles'))setTab(event.currentTarget.open?'roles':'preview');}}><summary>角色设置 · {parsed.roles.length} 人</summary>{parsed.roles.map((r:SpeechRole)=><button type="button" className="speech-role-row" key={r.id} aria-pressed={r.id===selected} onClick={()=>setSelected(selected===r.id?'':r.id)}><small>{parsed.sourceNames?.[r.id]||r.name} →</small><SpeechAvatar role={existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r}/><span>{(existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r).name}<small>{(existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r).entityId?t('人物词条'):t('自定义角色')}</small></span><Pencil size={14}/></button>)}{role?<div className="speech-mapping-editor">{existingRoles.length?<label className="speech-select-label">{t("对应本文角色")}<select aria-label={t("对应本文角色")} value={parsed.mapping?.[role.id]||''} onChange={e=>{setParsed({...parsed,mapping:{...parsed.mapping,[role.id]:e.target.value}});}}><option value="">{t("创建新角色")}</option>{existingRoles.map(existing=><option key={existing.id} value={existing.id}>{existing.name}</option>)}</select></label>:null}{parsed.mapping?.[role.id]?<p className="speech-help">{t("使用已有角色的头像、名称和颜色。")}</p>:<RoleFields key={role.id} role={role} onChange={next=>{setParsed({...parsed,roles:parsed.roles.map((r:SpeechRole)=>r.id===next.id?next:r)});}}/>}</div>:null}</details><div className={'speech-import-preview wiki-prose '+(tab!=='preview'?'speech-mobile-hidden':'')}><strong>预览 · {count} 段发言</strong><div onErrorCapture={e=>{if(e.target instanceof HTMLImageElement)e.target.hidden=true;}} dangerouslySetInnerHTML={{__html:html}}/></div></>}
 </section></div>{parsed?.notes.length?<details className="speech-import-notes"><summary>{parsed.notes.length} 处普通段落需要核对</summary>{parsed.notes.map((n:string)=><p key={n}>{n}</p>)}</details>:null}{error||previewError?<p role="alert" className="speech-error">{error||previewError}</p>:null}</div>
 <footer><Button variant="outline" onClick={onClose}>{t("取消")}</Button><Button disabled={!parsed||!!previewError} onClick={()=>{try{if(!editor.state.doc.eq(origin))throw Error(t('文档已变化，请关闭导入后重新打开，避免插入到错误位置。'));normalizeSpeechRoles(parsed.roles);insertSpeechImport(editor,parsed,position,locale);onClose();toast.success(t('已插入 {count} 段发言，可撤销').replace('{count}', String(count)), { id: 'speech-import' });}catch(e:any){setError(e.message);}}}>{count ? `插入 ${count} 段发言` : '插入'}</Button></footer>
 </DialogContent></Dialog>;
}
export function SpeechBlockPreview({editor,roleId,children}:{editor:Editor;roleId:string;children:React.ReactNode}){const {roles}=useRoles(editor);const role=roles.find(r=>r.id===roleId)||{id:roleId,name:roleId||'未选择角色',color:'#B7B7B0',avatar:'',entityId:'',href:''};return <div className="wiki-speech" style={{'--speech-color':role.color} as CSSProperties}><SpeechByline role={role}/><div className="wiki-speech-body">{children}</div></div>;}
