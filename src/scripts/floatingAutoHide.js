// On narrow screens the fixed action buttons cover reading content. Hide them
// while the reader scrolls down and bring them back on any upward scroll, at the
// page end, or whenever focus is inside one of them.
const narrow=window.matchMedia('(max-width: 760px)');
const root=document.documentElement;
const selector='.support-float,.community-float,.tools-dock,.ai-chat__launcher,.dashboard-launcher';
let last=window.scrollY,frame=0;
const show=()=>root.classList.remove('floating-actions-hidden');
function update(){
 frame=0;
 const y=window.scrollY,delta=y-last;last=y;
 if(!narrow.matches||document.querySelector(`:is(${selector}) :focus-visible,.tools-dock[open]`)){show();return;}
 const atEnd=window.innerHeight+y>=document.documentElement.scrollHeight-48;
 if(y<120||atEnd||delta<-6)show();
 else if(delta>6)root.classList.add('floating-actions-hidden');
}
window.addEventListener('scroll',()=>{if(!frame)frame=requestAnimationFrame(update);},{passive:true});
narrow.addEventListener?.('change',show);
document.addEventListener('focusin',event=>{if(event.target instanceof Element&&event.target.closest(selector))show();});
