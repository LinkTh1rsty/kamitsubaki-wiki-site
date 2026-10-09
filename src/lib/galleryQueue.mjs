import {resolveLocaleCopy} from './i18n.mjs';
const issueCopy=locale=>resolveLocaleCopy({
 zh:{character:'请选择角色',images:'请添加本组照片',author:'请填写图片作者',sourceTitle:'请填写来源名称',rightsBasis:'请选择使用依据',sourceUrl:'官方素材需要原始来源链接',rightsEvidence:'请填写授权说明',invalidSource:'请填写有效的 HTTP / HTTPS 来源链接',invalidDate:'日期应为 YYYY、YYYY-MM 或 YYYY-MM-DD',decode:'无法读取图片，请移除并重新选择',missingFile:'请重新选择未备份的本机文件'},
 ja:{character:'人物を選択してください',images:'この設定に画像を追加してください',author:'画像の作者を入力してください',sourceTitle:'出典名を入力してください',rightsBasis:'利用根拠を選択してください',sourceUrl:'公式素材の元の出典 URL を入力してください',rightsEvidence:'許可の説明を入力してください',invalidSource:'有効な HTTP / HTTPS の出典 URL を入力してください',invalidDate:'日付は YYYY、YYYY-MM、YYYY-MM-DD 形式です',decode:'画像を読み取れません。削除して選び直してください',missingFile:'端末内のファイルを選び直してください'},
 en:{character:'Choose a person',images:'Add photos to this set',author:'Enter the image creator',sourceTitle:'Enter the source title',rightsBasis:'Choose a basis for use',sourceUrl:'Official material needs its original source URL',rightsEvidence:'Enter authorization details',invalidSource:'Enter a valid HTTP / HTTPS source URL',invalidDate:'Use YYYY, YYYY-MM or YYYY-MM-DD for the date',decode:'Image cannot be read; remove and select it again',missingFile:'Select the local file again'}
},locale);
const clean=value=>typeof value==='string'?value.trim():'';
const validUrl=value=>{try{return ['http:','https:'].includes(new URL(value).protocol);}catch{return false;}};
export function galleryIssueMessage(issue,locale='zh'){
 const labels=issueCopy(locale);return `${issue.name||issue.set||''}：${labels[issue.code||issue.field]||labels.images}`;
}
export function galleryIssueSelector(issue){
 if(issue.file&&issue.field==='images')return '[data-file-inspect]';
 if(issue.file)return `[data-file-field="${issue.field||'sourceUrl'}"]`;
 return ['character','author','sourceTitle','rightsBasis','sourceUrl','rightsEvidence','date'].includes(issue.field)?`[name="${issue.field}"]`:'[data-select-set]';
}
export function galleryQueueSummary(sets,files,{locale='zh'}={}){
 const staged=files.filter(f=>f.state==='staged').length,failed=files.filter(f=>f.state==='failed').length,issues=[],keys=new Set();
 const add=(set,field,code=field,file)=>{const key=[set.id,field,code,file?.id||''].join(':');if(keys.has(key))return;keys.add(key);const issue={set:set.id,field,code,name:file?.file?.name||file?.fileInfo?.name||set.title||set.id,...(file?{file:file.id}:{})};issue.message=galleryIssueMessage(issue,locale);issues.push(issue);};
 for(const set of sets){
  const members=files.filter(file=>file.set===set.id),metadata=set.metadata;
  if(!clean(set.character||metadata?.character))add(set,'character');if(!members.length)add(set,'images');
  // Transport summaries can omit metadata; workbench submission always passes
  // it. Per-photo attribution inherits the group unless it has an override.
  if(!metadata)continue;
  if(clean(metadata.sourceUrl)&&!validUrl(clean(metadata.sourceUrl)))add(set,'sourceUrl','invalidSource');
  if(clean(metadata.date)&&!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(clean(metadata.date)))add(set,'date','invalidDate');
  for(const file of members){
   const effective=key=>clean(file[key])||clean(metadata[key]);
   for(const field of ['author','sourceTitle','rightsBasis'])if(!effective(field))add(set,field);
   const basis=effective('rightsBasis'),individualBasis=clean(file.rightsBasis)&&clean(file.rightsBasis)!==clean(metadata.rightsBasis);
   if(basis==='official'&&!effective('sourceUrl'))add(set,'sourceUrl','sourceUrl',individualBasis?file:undefined);
   if(basis==='authorized'&&!effective('rightsEvidence'))add(set,'rightsEvidence','rightsEvidence',individualBasis?file:undefined);
   if(clean(file.sourceUrl)&&!validUrl(clean(file.sourceUrl)))add(set,'sourceUrl','invalidSource',file);
  }
 }
 for(const file of files){const set=sets.find(set=>set.id===file.set)||{id:file.set,title:file.set};if(file.decodeError)add(set,'images','decode',file);if(file.state!=='staged'&&file.fileInfo)add(set,'images','missingFile',file);}
 return {total:files.length,staged,failed,pending:files.length-staged,issues,ready:files.length>0&&staged===files.length&&issues.length===0};
}
