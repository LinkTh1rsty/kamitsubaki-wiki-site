import {parseDocument} from 'yaml';
// Match Astro's timestamp resolution without changing existing unambiguous source.
export function normalizeYamlDates(source:string):string {
 const match=source.match(/^(?:\uFEFF)?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!match)return source;
 const built=parseDocument(match[1],{customTags:['timestamp']});
 if(built.errors.length)throw Error('词条属性无法解析，请保留草稿。');
 const seen=new WeakSet<object>();
 const hasDate=(value:unknown):boolean=>{
  if(value instanceof Date)return true;
  if(!value||typeof value!=='object'||seen.has(value))return false;
  seen.add(value);return Object.values(value).some(hasDate);
 };
 if(!hasDate(built.toJS({maxAliasCount:100})))return source;
 const doc=parseDocument(match[1],{compat:'yaml-1.1'});
 if(doc.errors.length)throw Error('词条属性无法解析，请保留草稿。');
 const newline=match[0].includes('\r\n')?'\r\n':'\n';
 return `${source.startsWith('\uFEFF')?'\uFEFF':''}---${newline}${doc.toString({lineWidth:0}).trimEnd().replaceAll('\n',newline)}${newline}---${newline}${source.slice(match[0].length)}`;
}
