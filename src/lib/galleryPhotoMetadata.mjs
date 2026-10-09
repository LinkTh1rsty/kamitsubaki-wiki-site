import {resolveLocaleCopy} from './i18n.mjs';

export const photoFieldLimits=Object.freeze({title:200,author:200,sourceTitle:300,rightsEvidence:2000,sourceUrl:2000,tags:1000});
export function updatePhotoTags(metadata,value,{clear=false}={}){
 if(clear){metadata.tags=[];return;}
 const text=value.trim();
 if(text)metadata.tags=text.split(/[,，]/).map(tag=>tag.trim()).filter(Boolean);
 else delete metadata.tags;
}
export const photoMetadataCopy=locale=>resolveLocaleCopy({
 zh:{clearTags:'本图不使用标签（不继承通用标签）'},
 ja:{clearTags:'この画像にタグを付けない（共通タグを引き継がない）'},
 en:{clearTags:'No tags for this photo (do not inherit shared tags)'}
},locale);
