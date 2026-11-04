/** Only animate this small preview while it is visible; never load the explorer runtime here. */
export function initVisualRoamPortals(){
 const portals=[...document.querySelectorAll('[data-visual-roam]:not([data-roam-ready])')];
 if(!portals.length)return;
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.toggleAttribute('data-visible',entry.isIntersecting&&!document.hidden);},{rootMargin:'40px'});
 for(const portal of portals){portal.setAttribute('data-roam-ready','');observer.observe(portal);}
 const visibility=()=>{for(const portal of portals){const bounds=portal.getBoundingClientRect();portal.toggleAttribute('data-visible',!document.hidden&&bounds.bottom>0&&bounds.top<innerHeight);}};
 document.addEventListener('visibilitychange',visibility);
 document.addEventListener('astro:before-swap',()=>{observer.disconnect();document.removeEventListener('visibilitychange',visibility);},{once:true});
}
