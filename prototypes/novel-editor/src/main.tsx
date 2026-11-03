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
 let openingError='';try{await initializeWebsiteDocument();}catch(error:any){openingError=error.message;}
 const {default:App}=await import('./app');
 ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
 if(openingError){const {toast}=await import("sonner");setTimeout(()=>toast.error(openingError),200);}
}
void mount().catch(()=>{document.getElementById('root')!.textContent='编辑器暂时无法启动，请刷新重试。原有草稿不会被清除。';});
