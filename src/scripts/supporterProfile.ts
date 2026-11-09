import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import { isExpiredLink, isStaleVersion, ProfileRequestError } from '../lib/supporterProfileFlow.mjs';

window.addEventListener('hashchange', () => window.location.reload());
const root = document.querySelector<HTMLElement>('[data-supporter-profile]');
if (root) {
  const labels: Record<string, string> = JSON.parse(root.querySelector('[data-profile-copy]')!.textContent!);
  const t = (key:string, values: Record<string, string | number> = {}) =>
    labels[key].replace(/\{(\w+)\}/g, (token, name) => String(values[name] ?? token));
  const page = root, base = new URL(page.dataset.apiBase!), fragment = location.hash.slice(1),
    verifying = fragment.startsWith('verify='), token = verifying ? fragment.slice(7) : fragment;
  const el = <T extends Element = HTMLElement>(selector: string) => page.querySelector<T>(selector)!;
  const form=el<HTMLFormElement>('[data-profile-form]'), status=el('[data-profile-status]'),
    name=el<HTMLInputElement>('[name=name]'), email=el<HTMLInputElement>('[name=email]'),
    file=el<HTMLInputElement>('[data-avatar-input]'), code=el<HTMLInputElement>('[data-email-code]'),
    send=el<HTMLButtonElement>('[data-code-send]'), confirmCode=el<HTMLButtonElement>('[data-code-confirm]'),
    submit=el<HTMLButtonElement>('[data-profile-submit]'), done=el('[data-profile-done]'),
    reissue=el('[data-reissue]'), reissueForm=el<HTMLFormElement>('[data-reissue-form]');
  let busy=false, dirty=false, version=0, avatarId='', objectURL='', verifiedEmail='', wikiUserId='',
    existingWikiUserId='', resendAt=0, expired=false;
  const report=(message:string,error=false)=>{
    status.textContent=message;status.dataset.error=String(error);
    if(error){status.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});status.focus({preventScroll:true});}
  };
  const showLoading=(label:string)=>{status.dataset.error='false';setLoadingStatus(status,label);};
  const address=()=>email.value.trim().toLowerCase();
  const wantsBinding=()=>el<HTMLInputElement>('[name=binding]:checked').value==='now';
  function update(){
    const verified=!!verifiedEmail&&verifiedEmail===address();
    el('[data-wiki-step]').hidden=!verified;
    el('[data-code-step]').hidden=verified;
    el('[data-code-verified]').hidden=!verified;
    el('[data-wiki-now]').hidden=!wantsBinding();
    send.disabled=busy||expired||verified||Date.now()<resendAt;
    send.textContent=Date.now()<resendAt?t('resend',{seconds:Math.ceil((resendAt-Date.now())/1000)}):t('send');
    confirmCode.disabled=busy||expired||verified;
    code.disabled=busy||expired||verified;
    submit.disabled=busy||expired||!verified||(wantsBinding()&&!wikiUserId);
    if(busy)setLoadingStatus(submit,t('processing'));else submit.textContent=!verified?t('verifyToSubmit'):wantsBinding()&&!wikiUserId?t('loginToSubmit'):t('submit');
  }
  function lock(value:boolean){busy=value;for(const control of page.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button'))control.disabled=value;update();}
  async function request(path:string,body?:unknown,raw=false,personal=true){
    if(['localhost','127.0.0.1'].includes(location.hostname)&&!['localhost','127.0.0.1'].includes(base.hostname))
      throw new ProfileRequestError(t('localOnly'),'local_api_missing');
    const response=await fetch(new URL('/api/supporters'+path,base),{
      method:body===undefined?'GET':'POST',credentials:'include',cache:'no-store',
      headers:{...(personal?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':raw?'application/octet-stream':'application/json'})},
      body:body===undefined?undefined:raw?body as Blob:JSON.stringify(body),signal:AbortSignal.timeout(20000)
    });
    if(!response.headers.get('content-type')?.includes('application/json'))throw new ProfileRequestError(t('unavailable'),'service_unavailable',response.status);
    const result=await response.json();
    if(!response.ok)throw new ProfileRequestError(t(result.error?.code==='invitation_expired'?'invitationExpired':'requestFailed'),result.error?.code,response.status);
    return result.data;
  }
  function failureMessage(error:unknown) {
    if(error instanceof ProfileRequestError)return error.message;
    if(error instanceof Error&&['TimeoutError','AbortError'].includes(error.name))return t('timeout');
    return t(error instanceof TypeError?'network':'requestFailed');
  }
  function failed(error:unknown){
    report(failureMessage(error),true);
    if(isExpiredLink(error)){expired=true;reissue.hidden=false;update();}
  }
  async function loadWiki(){
    setLoadingStatus(el('[data-wiki-account-status]'),t('loadingAccount'));
    try{
      const account=await request('/profile/wiki-account');wikiUserId=account?.id||'';
      el('[data-wiki-account-choice]').hidden=!account;
      el('[data-wiki-account-name]').textContent=account?.displayName||account?.id||'';
      el('[data-wiki-login]').hidden=!!account;el('[data-wiki-register]').hidden=!!account;
      el('[data-wiki-account-status]').textContent=existingWikiUserId
        ?t('alreadyLinked')
        :account?t('accountFound'):t('accountMissing');
    }catch{wikiUserId='';el('[data-wiki-account-status]').textContent=t('accountError');}
    update();
  }
  el('[data-wiki-refresh]').addEventListener('click',()=>void loadWiki());
  for(const radio of page.querySelectorAll<HTMLInputElement>('[name=binding]'))radio.addEventListener('change',()=>{dirty=true;update();});
  async function previewAvatar(id:string){
    const response=await fetch(new URL('/api/supporters/profile/avatar/'+id,base),{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(20000)});
    if(!response.ok)return;
    if(objectURL)URL.revokeObjectURL(objectURL);
    objectURL=URL.createObjectURL(await response.blob());
    const img=el<HTMLImageElement>('[data-avatar-preview]');img.src=objectURL;img.hidden=false;el('[data-avatar-placeholder]').hidden=true;
  }
  function showDone(state:string,reason=''){
    form.hidden=true;done.hidden=false;
    el('[data-done-title]').textContent=state==='approved'?t('approved'):state==='rejected'?t('resubmit'):t('pending');
    el('[data-done-name]').textContent=name.value;el('[data-done-email]').textContent=email.value;
    el('[data-done-verify]').textContent=state==='rejected'?t('feedback',{reason}):state==='approved'?t('published'):t('waiting');
    el('[data-profile-edit]').textContent=state==='rejected'?t('resubmit'):t('edit');
    report(state==='approved'?t('approvedStatus'):state==='rejected'?t('changesStatus',{reason}):t('pendingStatus'));
  }
  async function load(){
    if(busy)return;lock(true);showLoading(t('opening'));
    try{
      if(!/^[\w-]{40,100}$/.test(token))throw new ProfileRequestError(t('invitationRequired'),'invitation_required');
      const data=await request('/profile'), p=data.profile;
      name.value=p?.name||data.person.name||data.person.afdianName||'';email.value=p?.email||data.person.email||'';
      version=p?.version||0;avatarId=p?.avatarId||data.person.avatarId||'';existingWikiUserId=data.person.wikiUserId||'';
      verifiedEmail=data.emailVerified?address():'';expired=false;dirty=false;
      form.hidden=false;done.hidden=true;reissue.hidden=true;
      el<HTMLInputElement>('[name=afdianAccount]').value=data.person.afdianUserId||'';
      if(avatarId)await previewAvatar(avatarId);
      await loadWiki();
      el<HTMLInputElement>('[name=binding][value=now]').checked=!!p?.wikiUserId && p.wikiUserId===wikiUserId;
      el<HTMLInputElement>('[name=binding][value=later]').checked=!el<HTMLInputElement>('[name=binding][value=now]').checked;
      if(p)showDone(p.status,p.reason);else report(t('fillStatus'));
      el('[data-code-status]').textContent=verifiedEmail?t('verifiedNext'):t('codeHelp');
    }catch(error){failed(error);el('[data-profile-outside-retry]').hidden=isExpiredLink(error);}
    finally{lock(false);}
  }
  form.addEventListener('input',()=>{dirty=true;});
  email.addEventListener('input',()=>{if(verifiedEmail!==address()){verifiedEmail='';code.value='';el('[data-code-status]').textContent=t('addressChanged');}update();});
  send.addEventListener('click',async()=>{
    if(busy||!email.reportValidity())return;lock(true);
    try{
      const result=await request('/profile/email',{email:address(),mode:'code'});
      if(result.verified)verifiedEmail=address();else resendAt=Date.now()+(result.retryAfter||60)*1000;
      el('[data-code-status]').textContent=result.verified?t('verifiedNext'):result.previewCode?t('previewCode',{code:result.previewCode}):result.sent===false?t('codeFailed'):t('codeSent',{email:address()});
      if(!result.verified)code.focus();
    }catch(error){el('[data-code-status]').textContent=failureMessage(error);failed(error);}
    finally{lock(false);}
  });
  confirmCode.addEventListener('click',async()=>{
    if(busy)return;
    if(!/^\d{6}$/.test(code.value.trim())){el('[data-code-status]').textContent=t('sixDigits');code.focus();return;}
    lock(true);
    try{
      await request('/profile/email/confirm',{email:address(),code:code.value.trim()});verifiedEmail=address();code.value='';
      el('[data-code-status]').textContent=t('verifiedNext');
      report(t('verifiedNext'));await loadWiki();
    }catch(error){el('[data-code-status]').textContent=failureMessage(error);failed(error);}
    finally{lock(false);}
  });
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0];if(!selected||busy)return;lock(true);
    try{
      if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>2*1024*1024)throw new ProfileRequestError(t('invalidAvatar'),'invalid_avatar');
      const result=await request('/profile/avatar',selected,true);avatarId=result.id;await previewAvatar(avatarId);dirty=true;report(t('avatarSaved'));
    }catch(error){failed(error);}finally{file.value='';lock(false);}
  });
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();if(busy)return;
    if(verifiedEmail!==address()){report(t('verifyFirst'),true);return;}
    if(!name.reportValidity()||!email.reportValidity())return;
    if(wantsBinding()&&!wikiUserId){report(t('linkFirst'),true);return;}
    if(wantsBinding()&&existingWikiUserId&&wikiUserId!==existingWikiUserId){report(t('keepLink'),true);return;}
    lock(true);showLoading(t('submitting'));
    try{
      const result=await request('/profile',{name:name.value.trim(),email:address(),avatarId,version,...(wantsBinding()?{wikiUserId}:{})});
      version=result.version;dirty=false;showDone('pending');
    }catch(error){
      // Do not silently advance a stale version and overwrite another window's update.
      if(isStaleVersion(error))report(t('stale'),true);
      else failed(error);
    }finally{lock(false);}
  });
  el('[data-profile-edit]').addEventListener('click',()=>{done.hidden=true;form.hidden=false;update();report(t('editHelp'));});
  for(const button of page.querySelectorAll<HTMLButtonElement>('[data-profile-retry]'))button.addEventListener('click',()=>{if(!dirty||window.confirm(t('reloadConfirm')))void load();});
  reissueForm.addEventListener('submit',async(event)=>{
    event.preventDefault();if(busy||!reissueForm.reportValidity())return;lock(true);
    try{await request('/profile/reissue',{afdianAccount:el<HTMLInputElement>('[name=afdianAccount]').value.trim()},false,false);el('[data-reissue-status]').textContent=t('reissueDone');}
    catch(error){el('[data-reissue-status]').textContent=failureMessage(error);}
    finally{lock(false);}
  });
  window.addEventListener('beforeunload',(event)=>{if(dirty)event.preventDefault();});
  window.setInterval(update,1000);
  if(verifying){
    const button=el<HTMLButtonElement>('[data-email-confirm]');button.hidden=false;report(t('legacyHelp'));
    button.addEventListener('click',async()=>{if(busy)return;lock(true);try{await request('/email/verify',{});button.hidden=true;report(t('legacyDone'));}catch(error){failed(error);}finally{lock(false);}});
  }else void load();
}
