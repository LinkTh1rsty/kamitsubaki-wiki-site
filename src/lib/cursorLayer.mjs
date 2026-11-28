// One cursor for every page. The top layer escapes dialog transforms and clipping.
export function installCursorLayer(cursor) {
  if(!cursor || typeof cursor.showPopover!=='function'||cursor.dataset.cursorReady)return;
  const CURSOR_STATE_KEY='kamitsubaki-cursor-state';
  cursor.dataset.cursorReady='true';
  if(typeof window.__earlyCursorCleanup==='function'){window.__earlyCursorCleanup();delete window.__earlyCursorCleanup;}
  const root=document.documentElement;
  const home=document.createComment('cursor-home');cursor.before(home);
  cursor.setAttribute('popover','manual');
  let owner=null,lastX=-100,lastY=-100,active=false,navigating=false,scrollFrame=0,saveTimer=0;
  const persist=(x,y)=>{try{window.sessionStorage.setItem(CURSOR_STATE_KEY,JSON.stringify({x:Math.round(x),y:Math.round(y)}));}catch{}};
  const clearPersisted=()=>{try{window.sessionStorage.removeItem(CURSOR_STATE_KEY);}catch{}};
  const readPersisted=()=>{
    const inlineX=Number.parseFloat(cursor.style.getPropertyValue('--cursor-x')||root.style.getPropertyValue('--cursor-x'));
    const inlineY=Number.parseFloat(cursor.style.getPropertyValue('--cursor-y')||root.style.getPropertyValue('--cursor-y'));
    if(Number.isFinite(inlineX)&&Number.isFinite(inlineY)&&inlineX>=0&&inlineY>=0)return {x:inlineX,y:inlineY};
    try{
      const raw=window.sessionStorage.getItem(CURSOR_STATE_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(Number.isFinite(parsed?.x)&&Number.isFinite(parsed?.y)&&parsed.x>=0&&parsed.y>=0)return {x:parsed.x,y:parsed.y};
    }catch{}
    return null;
  };
  const sync=(records,raise=false)=>{
    const opened=records?.filter(r=>r.type==='attributes' && r.target.matches('dialog[open]')).at(-1)?.target;
    const next=opened || (owner?.isConnected && owner.matches('dialog[open]')?owner:[...document.querySelectorAll('dialog[open]')].at(-1)||null);
    if(!raise && next===owner && cursor.matches(':popover-open'))return;
    if(cursor.matches(':popover-open'))cursor.hidePopover();
    owner=next;if(owner)owner.append(cursor);else home.after(cursor);
    cursor.showPopover();
  };
  const hide=()=>{
    active=false;
    root.removeAttribute('data-custom-cursor');
    cursor.classList.remove('hovering','text-entry','is-pressing','is-disabled');
    cursor.style.visibility='hidden';
  };
  // Browser pickers own a separate top-layer surface. Keep the native pointer
  // while interacting with them instead of hiding it behind a select/datalist.
  const nativePicker=target=>target?.closest('select,option,input[list],input[type=date],input[type=month],input[type=week],input[type=time],input[type=datetime-local],input[type=color],input[type=file],input[type=range]');
  const interactiveSelector='a[href],button,summary,[role=button],[role=tab],[role=menuitem],[role=menuitemradio],[role=menuitemcheckbox],[role=switch],[role=checkbox],[role=radio],[role=option],[data-hoverable],.wiki-spoiler:not(.is-revealed),.ve-inline-token,input[type=checkbox],input[type=radio],input[type=submit],input[type=button],input[type=reset]';
  const schedulePersist=()=>{
    if(saveTimer)return;
    saveTimer=window.setTimeout(()=>{saveTimer=0;if(active)persist(lastX,lastY);},120);
  };
  const updateForTarget=(target,clientX,clientY)=>{
    navigating=false;
    if(target?.closest('iframe') || nativePicker(target)){hide();return;}
    const directInteractive=target?.closest(interactiveSelector);
    const field=target?.closest('input,textarea,[contenteditable]');
    const text=!directInteractive&&field&&!field.disabled&&!field.readOnly&&(field.matches('textarea')||field.matches('input')&&['text','email','search','url','tel','password','number'].includes(field.type)||field.getAttribute('contenteditable')==='true'||field.getAttribute('contenteditable')==='');
    // Editable surfaces use the native text pointer; a second custom I-beam
    // obscures the caret and conflicts with browser / editor pointer rules.
    if(text||clientX>=root.clientWidth&&root.clientWidth>0){hide();return;}
    const label=directInteractive?null:target?.closest('label');
    const labelInteractive=label&&(label.htmlFor||label.querySelector('input[type=checkbox]:not(:disabled),input[type=radio]:not(:disabled)'))?label:null;
    const interactive=directInteractive||labelInteractive;
    const disabled=!!interactive&&(interactive.disabled||interactive.getAttribute('aria-disabled')==='true');
    lastX=clientX;lastY=clientY;active=true;
    root.style.setProperty('--cursor-x',`${clientX}px`);
    root.style.setProperty('--cursor-y',`${clientY}px`);
    cursor.style.setProperty('--cursor-x',`${clientX}px`);
    cursor.style.setProperty('--cursor-y',`${clientY}px`);
    cursor.style.visibility='visible';root.setAttribute('data-custom-cursor','');
    cursor.classList.remove('text-entry');
    cursor.classList.toggle('hovering',!!interactive&&!disabled);
    cursor.classList.toggle('is-disabled',disabled);
    schedulePersist();
  };
  const move=event=>{
    if(event.pointerType&&event.pointerType!=='mouse'){hide();clearPersisted();return;}
    updateForTarget(event.target instanceof Element?event.target:null,event.clientX,event.clientY);
  };
  const onScroll=()=>{
    if(!active||scrollFrame||typeof document.elementFromPoint!=='function')return;
    scrollFrame=window.requestAnimationFrame(()=>{
      scrollFrame=0;
      if(!active)return;
      const hit=document.elementFromPoint(lastX,lastY);
      if(hit)updateForTarget(hit,lastX,lastY);
    });
  };
  const toggle=event=>{
    const target=event.target;
    if(target===cursor || !(target instanceof Element))return;
    if(target.matches('[popover]') && event.newState==='open')sync(undefined,true);
    else if(target.matches('dialog'))sync();
  };
  const pointerDown=event=>{
    if(event.pointerType&&event.pointerType!=='mouse'){hide();clearPersisted();return;}
    const target=event.target instanceof Element?event.target:null;
    if(nativePicker(target)){hide();return;}
    if(Number.isFinite(event.clientX)&&Number.isFinite(event.clientY)){
      lastX=event.clientX;lastY=event.clientY;
      persist(lastX,lastY);
    }
    if(active)cursor.classList.add('is-pressing');
  };
  const pointerUp=()=>{
    cursor.classList.remove('is-pressing');
    if(active)persist(lastX,lastY);
  };
  const pointerLeave=()=>{
    if(navigating)return;
    hide();
    clearPersisted();
  };
  const markNavigating=()=>{
    if(!active)return;
    navigating=true;
    cursor.classList.remove('is-pressing');
    persist(lastX,lastY);
  };
  const observer=new MutationObserver(records=>sync(records));
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['open']});
  document.addEventListener('pointermove',move,{passive:true});
  document.addEventListener('pointerover',move,{passive:true});
  document.addEventListener('pointerdown',pointerDown,{passive:true,capture:true});
  document.addEventListener('pointerup',pointerUp,{passive:true,capture:true});
  document.addEventListener('pointercancel',pointerUp,{passive:true,capture:true});
  document.addEventListener('toggle',toggle,true);
  document.addEventListener('pointerleave',pointerLeave);
  window.addEventListener('blur',pointerUp);
  window.addEventListener('beforeunload',markNavigating);
  window.addEventListener('pageswap',markNavigating);
  window.addEventListener('pagehide',markNavigating);
  window.addEventListener('scroll',onScroll,{passive:true});
  const initial=readPersisted();
  sync();
  if(initial){
    const hit=typeof document.elementFromPoint==='function'?document.elementFromPoint(initial.x,initial.y):null;
    updateForTarget(hit,initial.x,initial.y);
  }else{
    hide();
  }
  document.addEventListener('astro:before-swap',()=>{
    if(scrollFrame)window.cancelAnimationFrame(scrollFrame);
    if(saveTimer)window.clearTimeout(saveTimer);
    observer.disconnect();
    document.removeEventListener('pointermove',move);
    document.removeEventListener('pointerover',move);
    document.removeEventListener('pointerdown',pointerDown,true);
    document.removeEventListener('pointerup',pointerUp,true);
    document.removeEventListener('pointercancel',pointerUp,true);
    document.removeEventListener('toggle',toggle,true);
    document.removeEventListener('pointerleave',pointerLeave);
    window.removeEventListener('blur',pointerUp);
    window.removeEventListener('beforeunload',markNavigating);
    window.removeEventListener('pageswap',markNavigating);
    window.removeEventListener('pagehide',markNavigating);
    window.removeEventListener('scroll',onScroll);
    hide();
  },{once:true});
}
