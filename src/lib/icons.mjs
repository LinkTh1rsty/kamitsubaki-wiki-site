// UI geometry comes exclusively from Lucide. Import only the icons we use;
// never copy paths into individual components or ship the full icon catalog.
import {
 ArrowUpRight, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, ChevronDown,
 ChevronUp, ChevronLeft, ChevronRight, Search, Menu, X, Plus, Minus,
 Download, Maximize, SquarePen, Images, FileText, List, ListTree, LayoutGrid,
 PanelLeft, SlidersHorizontal, Heart, CalendarDays, Network, History, UserRound, Megaphone,
 LogOut, Trash2, Share, Sparkles, MessageCircle, Ellipsis, Globe, Mail,
 Link, Play, Copy, Check, Circle, ZoomIn, ZoomOut, Info,
 Undo2, Redo2, IndentDecrease, IndentIncrease, ListOrdered, Bold, Italic,
 Strikethrough, Highlighter, EyeOff, GripVertical, MoveHorizontal, Columns2,
} from 'lucide';

export const siteIcons = {
 'arrow-up-right':ArrowUpRight, 'arrow-right':ArrowRight, 'arrow-left':ArrowLeft,
 'arrow-up':ArrowUp, 'arrow-down':ArrowDown, 'chevron-down':ChevronDown,
 'chevron-up':ChevronUp, 'chevron-left':ChevronLeft, 'chevron-right':ChevronRight,
 search:Search, menu:Menu, x:X, plus:Plus, minus:Minus, download:Download,
 maximize:Maximize, 'square-pen':SquarePen, images:Images, 'file-text':FileText,
 list:List, 'list-tree':ListTree, 'layout-grid':LayoutGrid, 'panel-left':PanelLeft,
 'sliders-horizontal':SlidersHorizontal, heart:Heart, 'calendar-days':CalendarDays,
 'user-round':UserRound,megaphone:Megaphone,network:Network, history:History, 'log-out':LogOut, 'trash-2':Trash2, share:Share,
 sparkles:Sparkles, 'message-circle':MessageCircle, ellipsis:Ellipsis, globe:Globe,
 mail:Mail, link:Link, play:Play, copy:Copy, check:Check, circle:Circle,
 'zoom-in':ZoomIn, 'zoom-out':ZoomOut, info:Info,
 'undo-2':Undo2,'redo-2':Redo2,'indent-decrease':IndentDecrease,'indent-increase':IndentIncrease,
 'list-ordered':ListOrdered,bold:Bold,italic:Italic,strikethrough:Strikethrough,
 highlighter:Highlighter,'eye-off':EyeOff,'grip-vertical':GripVertical,
 'move-horizontal':MoveHorizontal,'columns-2':Columns2,
};
const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
export function iconBody(name) {
 const nodes=siteIcons[name];
 if(!nodes)throw new Error(`Unknown site icon: ${name}`);
 return nodes.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).map(([key,value])=>`${key}="${escape(value)}"`).join(' ')}></${tag}>`).join('');
}
export function iconMarkup(name, attributes={}) {
 const attrs={xmlns:'http://www.w3.org/2000/svg',width:18,height:18,viewBox:'0 0 24 24',fill:'none',stroke:'currentColor','stroke-width':2,'stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false',...attributes,class:`site-icon ${attributes.class||''}`.trim(),'data-icon':name};
 return `<svg ${Object.entries(attrs).map(([key,value])=>`${key}="${escape(value)}"`).join(' ')}>${iconBody(name)}</svg>`;
}
export function createIcon(name, attributes={}, ownerDocument=document) {
 const template=ownerDocument.createElement('template');
 template.innerHTML=iconMarkup(name,attributes);
 return template.content.firstElementChild;
}
// Navigation icon convention: arrow-up-right only when the link leaves the site
// (another origin or a new tab); internal navigation uses arrow-right.
export function isExternalHref(href, target) {
 if(target==='_blank')return true;
 const value=String(href??'').trim();
 if(!/^[a-z][a-z0-9+.-]*:/i.test(value)&&!value.startsWith('//'))return false;
 if(/^(mailto|tel):/i.test(value))return true;
 try{const origin=typeof location==='undefined'?'https://kamitsubaki.wiki':location.origin;return new URL(value,origin).origin!==origin;}catch{return false;}
}
export const linkArrowIcon=(href,target)=>isExternalHref(href,target)?'arrow-up-right':'arrow-right';
// UI labels sometimes come from locale dictionaries. Convert an explicit edge
// marker, preserving the label as text (never interpret user content as HTML).
const labelIcons={'↗':'arrow-up-right','→':'arrow-right','←':'arrow-left','↑':'arrow-up','↓':'arrow-down','×':'x','✕':'x','＋':'plus','−':'minus','⧉':'copy','▶':'play'};
export function setIconLabel(element, value) {
 const label=String(value??''),match=label.match(/^([↗→←↑↓×✕＋−⧉▶])\s*(.*)$|^(.*?)\s*([↗→←↑↓×✕＋−⧉▶])$/s);
 if(!match){element.textContent=label;return element;}
 const leading=Boolean(match[1]),symbol=match[1]||match[4],text=leading?match[2]:match[3];
 const link=element.closest?.('a[href]');
 const name=symbol==='↗'&&link&&!isExternalHref(link.getAttribute('href'),link.getAttribute('target'))?'arrow-right':labelIcons[symbol];
 const icon=createIcon(name,{},element.ownerDocument);
 element.replaceChildren(...(leading?[icon,element.ownerDocument.createTextNode(text?' '+text:'')]:[element.ownerDocument.createTextNode(text?text+' ':''),icon]));
 return element;
}
