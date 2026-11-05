import {scanSpeech,normalizeSpeechRoles} from './speech.mjs';

export default function remarkSpeech() {
  const processor = this;
  return (tree, file) => {
    const source = String(file).replaceAll('\r\n', '\n');
    const scan = scanSpeech(source);
    const registries = scan.parts.filter(part => part.type === 'speech-roles');
    if (!scan.parts.some(part => part.type === 'speech' || part.type === 'speech-roles')) return;
    // Ambiguous registries remain visible instead of choosing one silently.
    if (registries.length > 1) return;
    const roles = registries[0]?.roles || [];
    const ranges = [];
    let cursor = 0;
    let masked = '';
    const blank = value => value.replace(/[^\n]/g, ' ');
    for (const part of scan.parts) {
      const start = source.indexOf(part.source, cursor);
      masked += source.slice(cursor, start);
      if (part.type === 'speech-roles') masked += blank(part.source);
      else if (part.type === 'speech') {
        const openEnd = part.source.indexOf('\n');
        const closeStart = part.source.lastIndexOf('\n');
        masked += blank(part.source.slice(0, openEnd)) + part.source.slice(openEnd, closeStart + 1) + blank(part.source.slice(closeStart + 1));
        const role = roles.find(value => value.id === part.roleId) || {id: part.roleId, name: part.roleId};
        ranges.push({start, end: start + part.source.length, node: {type: 'speech', data: {hName: 'wiki-speech', hProperties: {dataRole: JSON.stringify(role)}}, children: []}});
      } else masked += part.source;
      cursor = start + part.source.length;
    }
    masked += source.slice(cursor);
    // Parse the complete document once so references and footnotes continue to
    // resolve across speech boundaries. Keep offsets by blanking only syntax.
    const parsed = processor.parse(masked);
    const children = [];
    let index = 0;
    for (const node of parsed.children) {
      const offset = node.position?.start.offset ?? 0;
      while (index < ranges.length && offset >= ranges[index].end) children.push(ranges[index++].node);
      if (index < ranges.length && offset >= ranges[index].start) ranges[index].node.children.push(node);
      else children.push(node);
    }
    while (index < ranges.length) children.push(ranges[index++].node);
    tree.children = children;
  };
}
const el=(tagName,properties={},children=[])=>({type:'element',tagName,properties,children});
const text=value=>({type:'text',value});
export function rehypeSpeech() {
  return tree=>{
    function visit(node){
      if(node.tagName==='wiki-speech'){
        let role;try{role=normalizeSpeechRoles([JSON.parse(node.properties.dataRole)])[0];}catch{role={name:'?',color:'#B7B7B0',avatar:'',href:''};}
        const avatar=el('span',{className:['wiki-speech-avatar'],'ariaHidden':'true'},[el('span',{},[text(role.name.slice(0,1))]),...(role.avatar?[el('img',{src:role.avatar,alt:'',loading:'lazy',decoding:'async',referrerPolicy:'no-referrer'})]:[])]);
        const name=el(role.href?'a':'span',{...(role.href?{href:role.href}:{}),className:['wiki-speech-name']},[text(role.name)]);
        node.tagName='div';node.properties={className:['wiki-speech'],style:'--speech-color:'+role.color};
        node.children=[el('div',{className:['wiki-speech-byline']},[avatar,name]),el('div',{className:['wiki-speech-body']},node.children||[])];
      }
      node.children?.forEach(visit);
    }
    visit(tree);
  };
}
