import {workbenchText as t} from './lib/workbench-copy';
import {notifyEditorHost} from './lib/embedded-host';
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../../../src/styles/readerFormats.css';
import '../../../src/styles/readerInteractive.css';
import '../../../src/styles/entityInfoBox.css';
import './index.css';
import 'katex/dist/katex.min.css';
import {editorHost,editorFetch} from './lib/editor-host';
async function mount(){
 const host=editorHost();
 if(host){try{const response=await editorFetch('/api/editor/session',{signal:AbortSignal.timeout(15000)});const data=await response.json();host.ownerId=response.ok&&data.account?.id?data.account.id:response.status===401?'guest':'unverified';host.accountName=response.ok?data.account?.name:undefined;}catch{host.ownerId='unverified';}}
 if(host?.mode==='entry'&&new URLSearchParams(location.search).get('view')==='submissions'&&!new URLSearchParams(location.search).get('submission')){location.replace('/'+host.locale+'/account/creator/?recordType=entry');return;}
 const {initializeWebsiteDocument}=await import('./lib/website-bootstrap');
 let openingFailed=false;try{await initializeWebsiteDocument();}catch{openingFailed=true;}
 if(openingFailed){
  notifyEditorHost('error');
  const navigation=document.querySelector<HTMLElement>('.novel-host-nav');if(navigation)navigation.hidden=false;
  const root=document.getElementById('root')!;root.setAttribute('role','alert');
  root.textContent=t('无法打开指定文档。原有草稿仍保留，请重试或返回内容管理。');
  const retry=document.createElement('button');retry.type='button';retry.textContent=t('重试');retry.onclick=()=>location.reload();root.append(retry);
  return;
 }
 const {default:App}=await import('./app');
 ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
}
void mount().catch(()=>{notifyEditorHost('error');const navigation=document.querySelector<HTMLElement>('.novel-host-nav');if(navigation)navigation.hidden=false;document.getElementById('root')!.textContent=t('无法打开指定文档。原有草稿仍保留，请重试或返回内容管理。');});
