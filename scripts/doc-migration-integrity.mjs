import {createHash} from 'node:crypto';
import {unified} from 'unified';
import remarkParse from 'remark-parse';

// Relocating a document can change link targets, never its prose or code examples.
const parser=unified().use(remarkParse);
function content(node){
 return Object.fromEntries(Object.entries(node).filter(([key])=>!['position','url'].includes(key)).map(([key,value])=>[key,Array.isArray(value)?value.map(item=>item&&typeof item==='object'?content(item):item):value]));
}
export function documentContentDigest(markdown){
 const source=String(markdown).replace(/\r\n/g,'\n');
 return createHash('sha256').update(JSON.stringify(content(parser.parse(source)))).digest('hex');
}
