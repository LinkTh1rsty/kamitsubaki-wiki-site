import {setLoadingStatus} from '../lib/loadingStatus.mjs';
import { failureMessage, isExpiredLink, isStaleVersion, ProfileRequestError, verificationNotice } from '../lib/supporterProfileFlow.mjs';

window.addEventListener('hashchange', () => window.location.reload());
const root = document.querySelector<HTMLElement>('[data-supporter-profile]');
if (root) {
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
    send.textContent=Date.now()<resendAt?`${Math.ceil((resendAt-Date.now())/1000)} 秒后可重发`:'发送验证码';
    confirmCode.disabled=busy||expired||verified;
    code.disabled=busy||expired||verified;
    submit.disabled=busy||expired||!verified||(wantsBinding()&&!wikiUserId);
    if(busy)setLoadingStatus(submit,'正在处理…');else submit.textContent=!verified?'验证邮箱后提交审核':wantsBinding()&&!wikiUserId?'登录并刷新账号后提交':'提交审核';
  }
  function lock(value:boolean){busy=value;for(const control of page.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button'))control.disabled=value;update();}
  async function request(path:string,body?:unknown,raw=false,personal=true){
    if(['localhost','127.0.0.1'].includes(location.hostname)&&!['localhost','127.0.0.1'].includes(base.hostname))
      throw new ProfileRequestError('本地资料预览需要连接本地 API。','local_api_missing');
    const response=await fetch(new URL('/api/supporters'+path,base),{
      method:body===undefined?'GET':'POST',credentials:'include',cache:'no-store',
      headers:{...(personal?{Authorization:'Bearer '+token}:{}),...(body===undefined?{}:{'Content-Type':raw?'application/octet-stream':'application/json'})},
      body:body===undefined?undefined:raw?body as Blob:JSON.stringify(body),signal:AbortSignal.timeout(20000)
    });
    if(!response.headers.get('content-type')?.includes('application/json'))throw new ProfileRequestError('服务暂不可用，输入已保留，请稍后重试。','service_unavailable',response.status);
    const result=await response.json();
    if(!response.ok)throw new ProfileRequestError(result.error?.message||'请求未完成，请重试。',result.error?.code,response.status);
    return result.data;
  }
  function failed(error:unknown,fallback?:string){
    report(failureMessage(error,fallback),true);
    if(isExpiredLink(error)){expired=true;reissue.hidden=false;update();}
  }
  async function loadWiki(){
    setLoadingStatus(el('[data-wiki-account-status]'),'正在读取登录状态…');
    try{
      const account=await request('/profile/wiki-account');wikiUserId=account?.id||'';
      el('[data-wiki-account-choice]').hidden=!account;
      el('[data-wiki-account-name]').textContent=account?.displayName||account?.id||'';
      el('[data-wiki-login]').hidden=!!account;el('[data-wiki-register]').hidden=!!account;
      el('[data-wiki-account-status]').textContent=existingWikiUserId
        ?'这份贡献已有账号绑定，将保留已有绑定。如需改绑，请联系管理员。'
        :account?'已读取当前登录账号。选择“现在绑定”并提交，绑定申请会随资料审核。':'请在新标签页登录或注册，再回来点击“我已登录，刷新账号”。本页内容会保留。';
    }catch{wikiUserId='';el('[data-wiki-account-status]').textContent='暂时无法读取登录状态，请重试；也可以选择“以后再绑定”提交。';}
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
    el('[data-done-title]').textContent=state==='approved'?'已通过审核':state==='rejected'?'请修改后重新提交':'已提交，等待审核';
    el('[data-done-name]').textContent=name.value;el('[data-done-email]').textContent=email.value;
    el('[data-done-verify]').textContent=state==='rejected'?`修改意见：${reason}`:state==='approved'?'自定义资料已公开。后续修改需要重新审核，期间保留当前展示。':'通过或退回时会发送结果邮件。无需重复登记，原有公开资料保持展示。';
    el('[data-profile-edit]').textContent=state==='rejected'?'修改后重新提交':'修改资料';
    report(state==='approved'?'资料已通过审核。':state==='rejected'?`请修改后重新提交：${reason}`:'资料已提交，正在等待管理员审核。');
  }
  async function load(){
    if(busy)return;lock(true);showLoading('正在读取专属链接…');
    try{
      if(!/^[\w-]{40,100}$/.test(token))throw new ProfileRequestError('请打开爱发电私信或邮件中的完整专属链接，也可以在下方申请补发。','invitation_required');
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
      if(p)showDone(p.status,p.reason);else report('请填写资料并验证邮箱，再选择账号关联方式，最后提交审核。');
      el('[data-code-status]').textContent=verifiedEmail?verificationNotice({verified:true},address()).text:'请先发送验证码，再输入邮件中的 6 位数字。10 分钟内有效。';
    }catch(error){failed(error);el('[data-profile-outside-retry]').hidden=isExpiredLink(error);}
    finally{lock(false);}
  }
  form.addEventListener('input',()=>{dirty=true;});
  email.addEventListener('input',()=>{if(verifiedEmail!==address()){verifiedEmail='';code.value='';el('[data-code-status]').textContent='邮箱已变化，请发送验证码并重新验证。';}update();});
  send.addEventListener('click',async()=>{
    if(busy||!email.reportValidity())return;lock(true);
    try{
      const result=await request('/profile/email',{email:address(),mode:'code'});
      if(result.verified)verifiedEmail=address();else resendAt=Date.now()+(result.retryAfter||60)*1000;
      el('[data-code-status]').textContent=verificationNotice({...result,sent:!result.verified&&!result.previewCode},address()).text;
      if(!result.verified)code.focus();
    }catch(error){el('[data-code-status]').textContent=failureMessage(error);failed(error);}
    finally{lock(false);}
  });
  confirmCode.addEventListener('click',async()=>{
    if(busy)return;
    if(!/^\d{6}$/.test(code.value.trim())){el('[data-code-status]').textContent='请输入邮件中的 6 位数字验证码。';code.focus();return;}
    lock(true);
    try{
      await request('/profile/email/confirm',{email:address(),code:code.value.trim()});verifiedEmail=address();code.value='';
      el('[data-code-status]').textContent=verificationNotice({verified:true},address()).text;
      report('邮箱已验证。请选择现在绑定 Wiki 账号，或以后同邮箱注册自动绑定，然后提交审核。');await loadWiki();
    }catch(error){el('[data-code-status]').textContent=failureMessage(error);failed(error);}
    finally{lock(false);}
  });
  file.addEventListener('change',async()=>{
    const selected=file.files?.[0];if(!selected||busy)return;lock(true);
    try{
      if(!['image/png','image/jpeg','image/webp'].includes(selected.type)||selected.size>2*1024*1024)throw new ProfileRequestError('请使用最大 2 MiB 的 PNG、JPEG 或 WebP 图片。','invalid_avatar');
      const result=await request('/profile/avatar',selected,true);avatarId=result.id;await previewAvatar(avatarId);dirty=true;report('头像已暂存，提交资料后进入审核。');
    }catch(error){failed(error);}finally{file.value='';lock(false);}
  });
  form.addEventListener('submit',async(event)=>{
    event.preventDefault();if(busy)return;
    if(verifiedEmail!==address()){report('请先输入邮箱验证码完成验证。',true);return;}
    if(!name.reportValidity()||!email.reportValidity())return;
    if(wantsBinding()&&!wikiUserId){report('请先登录并刷新账号，或选择“以后再绑定”。',true);return;}
    if(wantsBinding()&&existingWikiUserId&&wikiUserId!==existingWikiUserId){report('此份贡献已有账号绑定，不会替换。请选“以后再绑定”保留原账号，或联系管理员核对。',true);return;}
    lock(true);showLoading('正在提交资料…');
    try{
      const result=await request('/profile',{name:name.value.trim(),email:address(),avatarId,version,...(wantsBinding()?{wikiUserId}:{})});
      version=result.version;dirty=false;showDone('pending');
    }catch(error){
      // Do not silently advance a stale version and overwrite another window's update.
      if(isStaleVersion(error))report('资料已在别处更新。请先复制未提交内容，再点击“重新读取”核对最新资料；本次输入仍保留。',true);
      else failed(error);
    }finally{lock(false);}
  });
  el('[data-profile-edit]').addEventListener('click',()=>{done.hidden=true;form.hidden=false;update();report('修改后重新提交审核，审核期间保留当前公开资料。');});
  for(const button of page.querySelectorAll<HTMLButtonElement>('[data-profile-retry]'))button.addEventListener('click',()=>{if(!dirty||window.confirm('重新读取会覆盖尚未提交的修改，继续吗？'))void load();});
  reissueForm.addEventListener('submit',async(event)=>{
    event.preventDefault();if(busy||!reissueForm.reportValidity())return;lock(true);
    try{const result=await request('/profile/reissue',{afdianAccount:el<HTMLInputElement>('[name=afdianAccount]').value.trim()},false,false);el('[data-reissue-status]').textContent=result.message;}
    catch(error){el('[data-reissue-status]').textContent=failureMessage(error);}
    finally{lock(false);}
  });
  window.addEventListener('beforeunload',(event)=>{if(dirty)event.preventDefault();});
  window.setInterval(update,1000);
  if(verifying){
    const button=el<HTMLButtonElement>('[data-email-confirm]');button.hidden=false;report('这是此前发送的邮箱验证链接。点击确认后，回到原资料页面继续填写和提交。');
    button.addEventListener('click',async()=>{if(busy)return;lock(true);try{await request('/email/verify',{});button.hidden=true;report('邮箱已验证。请回到原专属资料链接继续提交审核。');}catch(error){failed(error);}finally{lock(false);}});
  }else void load();
}
