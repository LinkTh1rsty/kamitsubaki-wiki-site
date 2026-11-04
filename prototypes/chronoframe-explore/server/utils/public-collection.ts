import {fetchPublicPage} from './public-page.mjs'
import {toPhoto,definitions,capturedAt} from './wiki-gallery.mjs'
const readPage=defineCachedFunction(fetchPublicPage,{name:'wiki-public-page-v1',maxAge:15,swr:false,getKey:({offset=0,entity='',type=''}:{offset?:number,entity?:string,type?:string})=>`${entity}:${type}:${offset}`})
export function albumDefinition(segment:string){
 const index=definitions.findIndex(([slug],i)=>slug===segment||String(i+1)===segment)
 if(index<0)return null
 const [slug,title]=definitions[index]!
 return {id:index+1,slug,title,description:`${title}的公开影像档案 · 来源与详细资料见 Wiki`,coverPhotoId:null,isHidden:false,hasPassword:false,position:index,createdAt:capturedAt,updatedAt:null}
}
export function albumQuery(slug:string){return slug==='portraits'?{type:'portrait'}:slug==='visuals'?{type:'promo'}:slug==='covers'?{type:'cover'}:{entity:slug}}
export async function publicPage(offset=0,albumSlug=''){
 const page=await readPage({offset,...(albumSlug?albumQuery(albumSlug):{})})
 return {photos:page.items.map((item:Parameters<typeof toPhoto>[0])=>toPhoto(item,{base:'/visuals',live:true})),total:page.total,nextOffset:page.nextOffset,offset:page.offset,queriedAt:page.queriedAt}
}
export async function publicAlbums(){
 const rows=await Promise.all(definitions.map(async([slug])=>{
  const page=await publicPage(0,slug),album=albumDefinition(slug)!
  const previews=page.photos.slice(0,3)
  return {album:{...album,coverPhotoId:previews[0]?.id||null,photoIds:previews.map((p:ReturnType<typeof toPhoto>)=>p.id),photoCount:page.total},previews}
 }))
 return {albums:rows.filter(r=>r.album.photoCount>0).map(r=>r.album),photos:[...new Map(rows.flatMap(r=>r.previews).map(p=>[p.id,p])).values()]}
}
