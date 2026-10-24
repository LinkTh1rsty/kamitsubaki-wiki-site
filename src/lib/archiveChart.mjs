// Archive research artwork: axes, points, topology and field/source connections.
// Interface icons continue to use the shared Lucide icon library.
const chartTags=new Set(['svg','line','circle','rect','text','title','g']);
export function svgNode(tag,attrs={},text=''){
 if(!chartTags.has(tag))throw new Error('Unsupported archive chart primitive');
 const node=document.createElementNS('http://www.w3.org/2000/svg',tag);
 for(const [key,value]of Object.entries(attrs))node.setAttribute(key,String(value));
 node.textContent=text;
 return node;
}
