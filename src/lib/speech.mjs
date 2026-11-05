import {parseDocument} from 'yaml';

export const speechIdPattern = /^[a-z][a-z0-9_-]{0,63}$/;
export const speechColors = ['#F29AC2','#F0787E','#A6B69B','#B5A2D9','#8CBEE5','#B7B7B0'];
export function speechImageUrl(value) {
  return typeof value === 'string' && value.length <= 2048 && /^(?:https:\/\/[^\s<>"'\\]+|\/(?!\/)[^\s<>"'\\]*)$/.test(value) ? value : '';
}
export function normalizeSpeechRoles(input) {
  if (!Array.isArray(input) || input.length > 64) throw Error('角色列表无效，最多支持 64 个角色。');
  const ids = new Set();
  return input.map((role,index) => {
    if (!role || !speechIdPattern.test(role.id || '') || ids.has(role.id)) throw Error('角色标识无效或重复。');
    ids.add(role.id);
    if (typeof role.name !== 'string' || !role.name.trim() || role.name.length > 100) throw Error('请填写不超过 100 字的角色名称。');
    if (role.color && !/^#[\da-f]{6}$/i.test(role.color)) throw Error('角色颜色需要使用六位十六进制色值。');
    const entityId = typeof role.entityId === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(role.entityId) ? role.entityId : '';
    // A bound link is an internal canonical route, never an arbitrary authored URL.
    const href = entityId && typeof role.href === 'string' && new RegExp('^/(?:zh|zh-tw|zh-hk|ja|en)/database/(?:[a-z0-9-]+/){1,8}'+entityId+'/$').test(role.href) ? role.href : '';
    const avatar = speechImageUrl(role.avatar || '');
    if (role.avatar && !avatar) throw Error('头像需要使用站内路径或 HTTPS 图片地址。');
    return {id:role.id,name:role.name.trim(),color:role.color || speechColors[index % speechColors.length],entityId,href,avatar};
  });
}
export function speechRolesMarkdown(roles) { return '```speech-roles\n'+JSON.stringify(normalizeSpeechRoles(roles),null,2)+'\n```'; }
export function speechMarkdown(roleId,text) {
  if (!speechIdPattern.test(roleId || '')) throw Error('请选择发言角色。');
  if (/^:::(?:speech\b|\s*$)/m.test(text)) throw Error('发言正文含有冲突的发言围栏，请先检查原文。');
  return `:::speech ${roleId}\n${text}\n:::`;
}

/** Root-level speech syntax. Code examples and unclosed/ambiguous input stay literal. */
export function scanSpeech(source) {
  const lines=String(source).replaceAll('\r\n','\n').split('\n'),parts=[],errors=[];let plain=[];
  const flush=()=>{if(plain.length){parts.push({type:'text',source:plain.join('\n')});plain=[];}};
  for(let i=0;i<lines.length;) {
    const fence=lines[i].match(/^(`{3,}|~{3,})([^\s]*)\s*$/);
    if(fence){
      const start=i++;while(i<lines.length&&!new RegExp(`^${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[i]))i++;
      const closed=i<lines.length;if(closed)i++;
      const raw=lines.slice(start,i).join('\n');
      if(fence[2]==='speech-roles'&&closed){
        try{const roles=normalizeSpeechRoles(JSON.parse(lines.slice(start+1,i-1).join('\n')));flush();parts.push({type:'speech-roles',roles,source:raw});}
        catch(e){errors.push(`第 ${start+1} 行：${e.message}`);plain.push(raw);}
      }else plain.push(raw);
      continue;
    }
    const open=lines[i].match(/^:::speech ([a-z][a-z0-9_-]{0,63})\s*$/);
    if(open){
      const start=i++;let code=null,nested=false;
      while(i<lines.length){
        const f=lines[i].match(/^(`{3,}|~{3,})/);
        if(code){if(new RegExp(`^${code[0]}{${code.length},}\\s*$`).test(lines[i]))code=null;}
        else if(f)code=f[1];
        else if(/^:::speech\b/.test(lines[i]))nested=true;
        else if(/^:::\s*$/.test(lines[i]))break;
        i++;
      }
      if(i===lines.length||nested){errors.push(`第 ${start+1} 行：发言围栏未闭合或发生嵌套。`);plain.push(lines.slice(start,i===lines.length?i:++i).join('\n'));}
      else{flush();parts.push({type:'speech',roleId:open[1],text:lines.slice(start+1,i).join('\n'),source:lines.slice(start,++i).join('\n')});}
      continue;
    }
    if(/^:::speech\b/.test(lines[i]))errors.push(`第 ${i+1} 行：发言角色标识无效。`);
    plain.push(lines[i++]);
  }
  flush();return {parts,errors};
}
export function parseSpeechImport(source) {
  if(typeof source!=='string'||!source.trim()||source.length>300000)throw Error('请输入对话内容，最多 300,000 个字符。');
  let body=source.replace(/^\uFEFF/,''),roles=[],parts,notes=[];
  const front=body.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(front){const doc=parseDocument(front[1]);if(doc.errors.length)throw Error('模板角色配置无法解析。');const meta=doc.toJS({maxAliasCount:30});if(meta?.speechImport!==1)throw Error('请选择访谈导入模板；这里不会导入或覆盖文档属性。');roles=normalizeSpeechRoles(meta.roles);body=body.slice(front[0].length);}
  const scanned=scanSpeech(body);
  if(scanned.errors.length)throw Error(scanned.errors.join('\n'));
  const registries=scanned.parts.filter(p=>p.type==='speech-roles');
  if(registries.length){if(roles.length||registries.length>1)throw Error('导入片段只能有一份角色配置。');roles=registries[0].roles;}
  if(scanned.parts.some(p=>p.type==='speech')){
    parts=scanned.parts.filter(p=>p.type!=='speech-roles');
    for(const p of parts.filter(p=>p.type==='speech'))if(!roles.some(r=>r.id===p.roleId))throw Error(`发言引用了未定义角色：${p.roleId}`);
  }else{
    if(front||registries.length)throw Error('模板中没有发言块。');
    parts=[];const names=new Map();let code=null;
    for(const [index,line] of body.replaceAll('\r\n','\n').split('\n').entries()){
      const f=line.match(/^(`{3,}|~{3,})/),wasCode=Boolean(code);
      if(code){if(new RegExp(`^${code[0]}{${code.length},}\\s*$`).test(line))code=null;}else if(f)code=f[1];
      const match=!wasCode&&!f&&line.match(/^([^\s#>*`\[!:：][^:：\n]{0,39})[:：][ \t]*(.*)$/);
      if(match&&!/^(?:https?|ftp)$/i.test(match[1])&&!/\d/.test(match[1])&&!/[{}<>/\\]/.test(match[1])){
        const name=match[1].trim();let roleId=names.get(name);
        if(!roleId){roleId='speaker_'+(names.size+1);names.set(name,roleId);roles.push({id:roleId,name});}
        parts.push({type:'speech',roleId,text:match[2]});
      }else{
        // Unlabelled lines remain ordinary prose; never guess who said them.
        const last=parts.at(-1);if(last?.type==='text')last.source+='\n'+line;else parts.push({type:'text',source:line});
        if(line.trim())notes.push(`第 ${index+1} 行未标明角色，已保留为普通段落。`);
      }
    }
    roles=normalizeSpeechRoles(roles);
  }
  if(!parts.some(p=>p.type==='speech'))throw Error('没有发现发言。请使用“姓名：正文”，多段发言可使用模板。');
  if(parts.length>1000)throw Error('片段过多，请分批导入。');
  return {roles,parts,notes:[...new Set(notes)]};
}
export function mergeSpeechImport(existing,imported) {
  const roles=normalizeSpeechRoles(existing),map=new Map();
  for(const role of normalizeSpeechRoles(imported.roles)){
    const target=imported.mapping?.[role.id];
    if(target){if(!roles.some(existing=>existing.id===target))throw Error('映射的角色不存在，请重新确认。');map.set(role.id,target);continue;}
    let id=role.id;let n=2;while(roles.some(r=>r.id===id))id=role.id.slice(0,55)+'_'+n++;
    map.set(role.id,id);roles.push({...role,id});
  }
  return {roles:normalizeSpeechRoles(roles),parts:imported.parts.map(p=>p.type==='speech'?{...p,roleId:map.get(p.roleId)}:p)};
}
