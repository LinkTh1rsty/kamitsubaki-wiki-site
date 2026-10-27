import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import YAML from 'yaml';
import {entityRoute} from '../src/lib/entityModel.mjs';
import entities from '../src/data/gallery-entities.json' with {type:'json'};

const root=resolve('.');
const source=JSON.parse(await readFile(resolve(root,'public/gallery-import-manifest.json'),'utf8'));
const target=resolve(root,'gallery-publication-manifest.json');
const allowedEntities=new Set(entities.map(entity=>entity.id));
const cache=new Map();
async function page(path){
 if(cache.has(path))return cache.get(path);
 const markdown=await readFile(resolve(root,path),'utf8');
 const front=markdown.match(/^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 if(!front)throw Error(`缺少词条元数据：${path}`);
 const data=YAML.parse(front[1]);cache.set(path,data);return data;
}
function typeFor(path){
 const collection=path.split('/')[2];
 if(collection==='songs'||collection==='releases')return 'cover';
 if(collection==='people'||collection==='isotopes')return 'portrait';
 if(collection==='units'||collection==='projects')return 'promo';
 return null;
}
function assetTitle(sourceUrl){
 const known=new Map([
  ['/images/artists/grp.jpg','V.W.P 全员视觉图'],
  ['/images/albums/fate-vwp-1400x1400.jpg','FATE'],
  ['/images/songs/isekaijoucho/また-ここから-once-again-it-begins.jpg','また、ここから'],
  ['/images/songs/isekaijoucho/とめどなき白情-tomedonaki-hakujou.jpg','とめどなき白情'],
  ['/images/songs/isekaijoucho/グレイスケイル-grayscale.jpg','グレイスケイル'],
  ['/images/songs/harusaruhi/回向-echo-echo.jpg','回向 -echo-'],
  ['/images/songs/harusaruhi/Interlude-1-ケダモノ-interlude-1-the-beast.jpg','Interlude #1 -ケダモノ-'],
  ['/images/songs/harusaruhi/INTRODUCTION-目-introduction-eye.jpg','INTRODUCTION -目-'],
  ['/images/songs/harusaruhi/ありがとう-arigato.jpg','ありがとう']
 ]);
 if(known.has(sourceUrl))return known.get(sourceUrl);
 const name=decodeURIComponent(sourceUrl.split('/').at(-1)).replace(/\.(?:png|jpe?g|webp|gif|avif)$/i,'');
 return name.replace(/-\d{3,4}x\d{3,4}$/i,'').replaceAll('-',' ').replace(/\s+/g,' ').trim().slice(0,200);
}
const items=[];
for(const candidate of source.items){
 const references=candidate.references.filter(ref=>ref.kind==='content');
 const checked=await Promise.all(references.map(async ref=>({ref,data:await page(ref.path)})));
 const selected=checked.find(({ref,data})=>ref.locale==='zh'&&data.presentation?.image===candidate.sourceUrl&&data.id)
  ||checked.find(({ref,data})=>ref.locale==='zh'&&data.id)||checked.find(({data})=>data.id);
 const isAsset=!selected;
 if(isAsset&&!candidate.references.some(ref=>ref.kind==='asset')&&!candidate.references.length)throw Error(`没有站内来源：${candidate.id}`);
 const title=isAsset?assetTitle(candidate.sourceUrl):String(selected.data.title||selected.data.name||selected.data.romanizedTitle||selected.data.romanizedName||'').trim();
 if(!title)throw Error(`缺少标题：${candidate.id}`);
 const pageUrl=isAsset?new URL(candidate.sourceUrl,'https://kamitsubaki.wiki').href:`https://kamitsubaki.wiki/zh${entityRoute(selected.data)}`;
 const entityIds=[...new Set(candidate.suggestedEntities)];
 if(entityIds.length>20||entityIds.some(id=>!allowedEntities.has(id)))throw Error(`关联对象无效：${candidate.id}`);
 const taxonomy={mediaType:isAsset?candidate.sourceUrl.startsWith('/images/artists/')?'promo':'cover':typeFor(selected.ref.path),entityIds,tags:[]};
 items.push({
  id:candidate.id,sourceUrl:candidate.sourceUrl,sha256:candidate.sha256,
  metadata:{title,sourceTitle:isAsset?'本站既有图片文件':`本站词条《${title}》`,sourceUrl:pageUrl,author:'',rightsBasis:'',
   archiveProvenance:isAsset?'existing-file':'existing-site',attributionStatus:'incomplete',...taxonomy}
 });
}
const output=JSON.stringify({schemaVersion:1,sourceManifest:'public/gallery-import-manifest.json',items},null,2)+'\n';
if(process.argv.includes('--check')){
 if((await readFile(target,'utf8').catch(()=>null)||'').replace(/\r\n/g,'\n')!==output)throw Error('图库公开清单需要更新');
}else await writeFile(target,output);
console.log(`站内既有图片公开清单：${items.length} 张（其中未关联词条的站内素材 ${items.filter(item=>item.metadata.archiveProvenance==='existing-file').length} 张）；作者和原始图片出处未被推定。`);
