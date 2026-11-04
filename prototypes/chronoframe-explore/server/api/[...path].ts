import {publicPage,publicAlbums,albumDefinition} from '../utils/public-collection'
import {pageOffset} from '../utils/public-page.mjs'
import {fetchPublishedItem} from '../utils/public-selection.mjs'
import {toPhoto,definitions} from '../utils/wiki-gallery.mjs'
import {PUBLIC_GALLERY_DEFAULTS} from '@chronoframe/contracts/gallery-settings'
export default defineEventHandler(async event=>{
 if(event.method!=='GET')throw createError({statusCode:405,statusMessage:'Read-only gallery'})
 setHeader(event,'Cache-Control','public, max-age=15')
 const path=getRequestURL(event).pathname.replace(/^\/visuals(?=\/)/,'').replace(/^\/api/,'')
 if(path==='/system/settings/all')return {data:{...PUBLIC_GALLERY_DEFAULTS,app:{...PUBLIC_GALLERY_DEFAULTS.app,title:'神椿影像馆',author:'KAMITSUBAKI Wiki',slogan:'从另一种视角，遇见神椿。',avatarUrl:'/visuals/wiki-avatar.svg','appearance.theme':'dark',socialLinks:{links:[]}}}}
 let offset=0
 try{offset=pageOffset(Number(getQuery(event).offset??0))}catch{throw createError({statusCode:400,statusMessage:'Invalid offset'})}
 const resolution=path.match(/^\/albums\/resolve\/([a-z0-9-]+)$/)
 if(resolution){const album=albumDefinition(resolution[1]!);if(!album)throw createError({statusCode:404});return {albumId:album.id,slug:album.slug,isCanonical:album.slug===resolution[1],redirectCode:301}}
 try{
  if(path==='/catalog')return await publicPage(offset)
  if(path==='/photos'||path==='/photos/visible')return (await publicPage(offset)).photos
  if(path==='/albums')return await publicAlbums()
  if(path==='/preview'){const page=await publicPage();return {mode:'live-public-catalog',sourceTotal:page.total,pageSize:page.photos.length,nextOffset:page.nextOffset,queriedAt:page.queriedAt}}
  const detail=path.match(/^\/albums\/(\d+)$/)
  if(detail){const album=albumDefinition(detail[1]!);if(!album)throw createError({statusCode:404});const page=await publicPage(offset,album.slug);return {...album,...page,coverPhotoId:page.photos[0]?.id||null,photoIds:page.photos.map((p: ReturnType<typeof toPhoto>)=>p.id)}}
  const photo=path.match(/^\/photos\/([\w-]+)$/)
  if(photo){const item=await fetchPublishedItem(photo[1]);if(!item)throw createError({statusCode:404});return toPhoto(item,{base:'/visuals',live:true})}
  const memberships=path.match(/^\/photos\/([\w-]+)\/albums$/)
  if(memberships){const item=await fetchPublishedItem(memberships[1]);if(!item)throw createError({statusCode:404});return definitions.filter(([slug])=>slug==='portraits'?item.mediaType==='portrait':slug==='visuals'?item.mediaType==='promo':slug==='covers'?item.mediaType==='cover':item.entityIds?.includes(slug)).map(([slug])=>albumDefinition(slug!))}
 }catch(error){if(error&&typeof error==='object'&&'statusCode' in error)throw error;console.error(JSON.stringify({event:'public-gallery-unavailable',path}));throw createError({statusCode:503,statusMessage:'Public gallery temporarily unavailable'})}
 throw createError({statusCode:404,statusMessage:'Not available'})
})
