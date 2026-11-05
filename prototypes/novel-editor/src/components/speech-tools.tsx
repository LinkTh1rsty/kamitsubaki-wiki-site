import {previewAssetUrl} from '@/lib/editor-host';
import {useContext,useEffect,useRef,useState,type CSSProperties} from 'react';
import type {Editor} from '@tiptap/core';
import {Plus,Pencil,Download,Copy,MessageSquare,FileInput,UserRound,ExternalLink} from 'lucide-react';
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
  }catch(error:any){if(mounted.current)toast.error(error.message);}
  finally{input.value='';if(mounted.current)setUploading(false);}
 };
 return <div className="speech-role-fields"><div className="speech-role-summary"><SpeechAvatar role={role}/><strong>{role.name||'新角色'}</strong>{role.href?<a href={role.href} target="_blank" rel="noopener noreferrer">人物词条 <ExternalLink size={14}/></a>:<small>自定义角色</small>}</div>
 <div className="speech-role-kind"><Button size="sm" variant={role.entityId?'secondary':'outline'} onClick={()=>setSearch(!search)}>站内人物</Button><Button size="sm" variant={!role.entityId?'secondary':'outline'} onClick={()=>{onChange({...role,entityId:'',href:'',avatar:role.entityId?'':role.avatar});setSearch(false);}}>自定义角色</Button></div>
 {search?<EntrySearch entityTypes={['person','virtual-avatar']} onSelect={entry=>{onChange({...role,entityId:entry.id,name:entry.title,href:entry.url||'',avatar:entry.image||''});setSearch(false);}}/>:null}
 <label>显示名称<Input value={role.name} maxLength={100} onChange={e=>onChange({...role,name:e.target.value})}/></label>
 <details className="speech-avatar-settings"><summary>头像设置（可选）</summary><label>头像地址<Input value={role.avatar} placeholder="站内图片路径或 HTTPS 地址" onChange={e=>onChange({...role,avatar:e.target.value})}/></label>
 <label className="speech-file-label">{uploading?'正在上传头像…':'上传头像'}<input type="file" disabled={uploading} accept="image/png,image/jpeg,image/webp" onChange={e=>void uploadAvatar(e.currentTarget)}/></label></details>
 <label>发言识别色<span className="speech-colors">{speechColors.map(color=><button type="button" key={color} style={{background:color}} aria-label={`颜色 ${color}`} aria-pressed={role.color.toLowerCase()===color.toLowerCase()} onClick={()=>onChange({...role,color})}/>)}<input type="color" aria-label="自定义角色颜色" value={role.color} onChange={e=>onChange({...role,color:e.target.value})}/></span></label>
 </div>;
}
export function SpeechRolePanel({editor}:{editor:Editor|null}){
 const {roles,error}=useRoles(editor);const [editing,setEditing]=useState<SpeechRole|null>(null);const [formError,setFormError]=useState('');
 return <section className="speech-role-panel"><div className="speech-panel-heading"><strong>本文参与者</strong><Button variant="ghost" size="icon-sm" aria-label="添加发言角色" disabled={!editor||!!error} onClick={()=>{setFormError('');setEditing({id:'speaker_'+crypto.randomUUID().slice(0,8),name:'',color:speechColors[roles.length%speechColors.length],entityId:'',href:'',avatar:''});}}><Plus/></Button></div>
 {error?<p role="alert">{error}</p>:roles.length?roles.map(role=><button type="button" className="speech-role-row" key={role.id} onClick={()=>{setFormError('');setEditing({...role});}}><span className="speech-role-dot" style={{background:role.color}}/><SpeechAvatar role={role}/><span>{role.name}<small>{role.entityId?'人物词条':'自定义角色'}</small></span><Pencil size={14}/></button>):<p className="speech-help">选择站内人物或添加自定义角色，再插入发言。</p>}
 <Dialog open={!!editing} onOpenChange={open=>{if(!open)setEditing(null);}}><DialogContent className="speech-role-dialog"><DialogHeader><DialogTitle>角色设置</DialogTitle><DialogDescription>设置只影响当前文档，不修改人物词条。</DialogDescription></DialogHeader>{editing?<RoleFields role={editing} onChange={setEditing}/>:null}{formError?<p role="alert">{formError}</p>:null}<Button onClick={()=>{if(!editor||!editing)return;try{const next=roles.some(r=>r.id===editing.id)?roles.map(r=>r.id===editing.id?editing:r):[...roles,editing];saveSpeechRoles(editor,next);setEditing(null);}catch(e:any){setFormError(e.message);}}}>保存角色</Button></DialogContent></Dialog>
 </section>;
}
export function SpeechRoleSelect({editor,value,onChange}:{editor:Editor;value:string;onChange:(id:string)=>void}){const {roles}=useRoles(editor);return <label className="speech-select-label">发言角色<select value={value} onChange={e=>onChange(e.target.value)}><option value="">选择角色</option>{roles.map(r=><option value={r.id} key={r.id}>{r.name}</option>)}</select>{!roles.length?<span>先在左侧“本文参与者”中添加角色，或使用快速导入。</span>:null}</label>;}
function downloadTemplate(){const url=URL.createObjectURL(new Blob([template],{type:'text/markdown;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='访谈导入模板.md';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function SpeechImportDialog({editor,open,onClose}:{editor:Editor;open:boolean;onClose:()=>void}){
 const {locale}=useContext(CatalogContext);const {roles:existingRoles}=useRoles(editor);const [sourceOpen,setSourceOpen]=useState(false);const [source,setSource]=useState('');const [parsed,setParsed]=useState<any>(null);const [error,setError]=useState('');const [selected,setSelected]=useState('');const [step,setStep]=useState(1);const [tab,setTab]=useState('roles');const [copyFallback,setCopyFallback]=useState(false);const [confirmed,setConfirmed]=useState(false);const [position,setPosition]=useState(0);const [origin,setOrigin]=useState<any>(null);
 useEffect(()=>{if(open){setPosition(speechInsertPosition(editor));setOrigin(editor.state.doc);setSource('');setParsed(null);setError('');setStep(1);setSelected('');setConfirmed(false);setSourceOpen(false);setCopyFallback(false);setTab('roles');}},[open,editor]);
 const changeSource=(value:string)=>{setSource(value);setParsed(null);setConfirmed(false);setStep(1);setError('');};
 const analyze=()=>{try{const result=parseSpeechImport(source);setParsed({...result,mapping:{},sourceNames:Object.fromEntries(result.roles.map((r:SpeechRole)=>[r.id,r.name]))});setSelected('');setSourceOpen(false);setTab('roles');setStep(2);setError('');setConfirmed(false);}catch(e:any){setError(e.message);setParsed(null);}};
 const role=parsed?.roles.find((r:SpeechRole)=>r.id===selected);
 let html='',previewError='';try{if(parsed){const merged=mergeSpeechImport(existingRoles,parsed);html=articleHTML(speechRolesMarkdown(merged.roles)+'\n\n'+merged.parts.map((p:any)=>p.type==='speech'?speechMarkdown(p.roleId,p.text):p.source).join('\n\n'),locale);}}catch(e:any){previewError=e.message;}
 const count=parsed?.parts.filter((p:any)=>p.type==='speech').length||0;
 return <Dialog open={open} onOpenChange={next=>{if(!next)onClose();}}><DialogContent className="speech-import-dialog"><DialogHeader><DialogTitle>快速导入对话</DialogTitle><DialogDescription>粘贴对话或上传 Markdown，确认角色后插入当前文档。</DialogDescription></DialogHeader>
 <div className="speech-import-top"><div><Button variant="ghost" size="sm" onClick={downloadTemplate}><Download size={16}/>下载模板</Button><Button variant="ghost" size="sm" onClick={async()=>{try{await navigator.clipboard.writeText(prompt);toast.success('AI 转换提示词已复制');}catch{setCopyFallback(true);}}}><Copy size={16}/>复制 AI 转换提示词</Button></div><ol aria-label="导入步骤"><li aria-current={step===1?'step':undefined}>1 导入原文</li><li aria-current={step===2?'step':undefined}>2 确认角色</li><li aria-current={step===3?'step':undefined}>3 预览插入</li></ol></div>
 <div className="speech-import-scroll">{copyFallback?<label>请选择并复制提示词<textarea readOnly value={prompt} onFocus={e=>e.target.select()}/></label>:null}
 <div className="speech-import-columns"><section className={parsed&&!sourceOpen?'speech-source-mobile-hidden':''}><div className="speech-import-source-heading"><strong>粘贴文本</strong><label className="speech-file-label">上传 Markdown<input type="file" accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>600000){setError('文件过大，请分批导入。');return;}try{changeSource(await file.text());}catch{setError('文件读取失败，请重新选择文件或粘贴原文。');}e.target.value='';}}/></label></div><textarea aria-label="对话原文" spellCheck={false} placeholder={'花谱：这里填写发言。\n理芽：这里填写回答。'} value={source} onChange={e=>changeSource(e.target.value)}/><Button variant="outline" disabled={!source.trim()} onClick={analyze}>识别发言与角色</Button></section>
 <section><div className="speech-mobile-tabs">{parsed?<Button variant="ghost" onClick={()=>setSourceOpen(!sourceOpen)}>{sourceOpen?'收起原文':'修改原文'}</Button>:null}<Button variant={tab==='roles'?'secondary':'ghost'} onClick={()=>setTab('roles')}>角色</Button><Button variant={tab==='preview'?'secondary':'ghost'} onClick={()=>setTab('preview')}>预览</Button></div>{!parsed?<p className="speech-help">识别后，在这里绑定人物词条或保留自定义角色。</p>:<><div className={'speech-import-roles '+(tab!=='roles'?'speech-mobile-hidden':'')}><strong>角色对应关系 · 请确认</strong>{parsed.roles.map((r:SpeechRole)=><button type="button" className="speech-role-row" key={r.id} aria-pressed={r.id===selected} onClick={()=>setSelected(selected===r.id?'':r.id)}><small>{parsed.sourceNames?.[r.id]||r.name} →</small><SpeechAvatar role={existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r}/><span>{(existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r).name}<small>{(existingRoles.find(value=>value.id===parsed.mapping?.[r.id])||r).entityId?'人物词条':'自定义角色'}</small></span><Pencil size={14}/></button>)}{role?<div className="speech-mapping-editor">{existingRoles.length?<label className="speech-select-label">对应本文角色<select aria-label="对应本文角色" value={parsed.mapping?.[role.id]||''} onChange={e=>{setParsed({...parsed,mapping:{...parsed.mapping,[role.id]:e.target.value}});setConfirmed(false);setStep(2);}}><option value="">创建新角色</option>{existingRoles.map(existing=><option key={existing.id} value={existing.id}>{existing.name}</option>)}</select></label>:null}{parsed.mapping?.[role.id]?<p className="speech-help">使用已有角色的头像、名称和颜色。</p>:<RoleFields key={role.id} role={role} onChange={next=>{setParsed({...parsed,roles:parsed.roles.map((r:SpeechRole)=>r.id===next.id?next:r)});setConfirmed(false);setStep(2);}}/>}</div>:null}</div><div className={'speech-import-preview wiki-prose '+(tab!=='preview'?'speech-mobile-hidden':'')}><strong>预览 · {count} 段发言</strong><div onErrorCapture={e=>{if(e.target instanceof HTMLImageElement)e.target.hidden=true;}} dangerouslySetInnerHTML={{__html:html}}/></div></>}
 </section></div>{parsed?.notes.length?<details className="speech-import-notes"><summary>{parsed.notes.length} 处普通段落需要核对</summary>{parsed.notes.map((n:string)=><p key={n}>{n}</p>)}</details>:null}{error||previewError?<p role="alert" className="speech-error">{error||previewError}</p>:null}</div>
 <footer><div><p>插入当前段落之后，可一次撤销。</p>{parsed?<label><input type="checkbox" checked={confirmed} onChange={e=>{setConfirmed(e.target.checked);setStep(e.target.checked?3:2);setTab(e.target.checked?'preview':'roles');}}/> 已核对角色和正文</label>:null}</div><Button variant="outline" onClick={onClose}>取消</Button><Button disabled={!parsed||!confirmed||!!previewError} onClick={()=>{try{if(!editor.state.doc.eq(origin))throw Error('文档已变化，请关闭导入后重新打开，避免插入到错误位置。');normalizeSpeechRoles(parsed.roles);insertSpeechImport(editor,parsed,position,locale);onClose();toast.success(`已插入 ${count} 段发言，可撤销`);}catch(e:any){setError(e.message);}}}>确认并插入 {count||''} 段发言</Button></footer>
 </DialogContent></Dialog>;
}
export function SpeechToolbar({editor,onInsert,disabled=false}:{editor:Editor;onInsert:()=>void;disabled?:boolean}){const [open,setOpen]=useState(false);return <><Button size="sm" variant="ghost" disabled={disabled} onClick={onInsert}><MessageSquare size={16}/>发言</Button><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>setOpen(true)}><FileInput size={16}/>快速导入</Button><SpeechImportDialog editor={editor} open={open} onClose={()=>setOpen(false)}/></>;}
export function SpeechBlockPreview({editor,roleId,children}:{editor:Editor;roleId:string;children:React.ReactNode}){const {roles}=useRoles(editor);const role=roles.find(r=>r.id===roleId)||{id:roleId,name:roleId||'未选择角色',color:'#B7B7B0',avatar:'',entityId:'',href:''};return <div className="wiki-speech" style={{'--speech-color':role.color} as CSSProperties}><SpeechByline role={role}/><div className="wiki-speech-body">{children}</div></div>;}
