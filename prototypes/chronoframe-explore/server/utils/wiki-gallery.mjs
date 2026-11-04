import snapshot from '../../data/public-gallery.json' with { type: 'json' }
import entities from '../../data/entities.json' with { type: 'json' }

const names = new Map(entities.map(entity => [entity.id, entity.name]))
const mediaNames = { cover: '作品封面', portrait: '角色立绘', promo: '官方视觉', setting: '设定资料', event: '活动影像' }
export const sourceItems = snapshot.items
export const sourceById = new Map(sourceItems.map(item => [item.id, item]))
export function toPhoto(item, {base = '', live = false} = {}) {
  const subjects = (item.entityIds || []).map(id => names.get(id) || id)
  const source = item.sourceTitle || item.sourceUrl || ''
  return {
    id: item.id, title: item.title || item.setTitle || '未命名影像',
    description: [subjects.join(' / '), item.author ? `作者：${item.author}` : '', source ? `来源：${source}` : ''].filter(Boolean).join('\n'),
    width: item.width || null, height: item.height || null,
    aspectRatio: item.width && item.height ? item.width / item.height : 1,
    dateTaken: null, lastModified: item.updatedAt || null,
    originalUrl: `${base}/api/media/${encodeURIComponent(item.id)}/original`,
    downloadUrl: `${base}/api/media/${encodeURIComponent(item.id)}/original`,
    thumbnailUrl: `${base}/api/media/${encodeURIComponent(item.id)}/thumbnail`,
    thumbnailHash: null, fileSize: item.size || null,
    tags: [...new Set([...subjects, mediaNames[item.mediaType], ...(item.tags || [])].filter(Boolean))],
    exif: null, latitude: null, longitude: null, city: null, country: null, locationName: null,
    isLivePhoto: 0, livePhotoVideoUrl: null,
    wiki: { sourceUrl: item.sourceUrl || '', author: item.author || '', rightsBasis: item.rightsBasis || '',
      recordUrl: `https://kamitsubaki.wiki/zh/gallery/?photo=${encodeURIComponent(item.id)}`,
      articleUrl: item.siteReferenceUrl || '', entityIds: item.entityIds || [], mediaType: item.mediaType || '', sourceDate: item.date || null },
  }
}
// Round-robin real content categories so the initial wall represents the collection.
const buckets = new Map()
for (const item of sourceItems) {
  const key = item.mediaType === 'portrait' ? 'portraits' : item.mediaType === 'promo' ? 'visuals' : item.entityIds?.[0] || 'other'
  if (!buckets.has(key)) buckets.set(key, [])
  buckets.get(key).push(item)
}
const priority = ['visuals', 'kaf', 'portraits', 'isekaijoucho', 'rim', 'harusaruhi', 'koko', 'dustcell']
const orderedBuckets = [...buckets.entries()].sort(([a], [b]) => (priority.includes(a) ? priority.indexOf(a) : 99) - (priority.includes(b) ? priority.indexOf(b) : 99)).map(([, items]) => items)
export const photos = []
while ([...buckets.values()].some(items => items.length)) {
  for (const items of orderedBuckets) if (items.length) photos.push(toPhoto(items.shift()))
}
/** @type {[string,string][]} */
export const definitions = [
  ['kaf', '花譜'], ['rim', '理芽'], ['harusaruhi', '春猿火'], ['isekaijoucho', 'ヰ世界情緒'], ['koko', '幸祜'],
  ['dustcell', 'DUSTCELL'], ['portraits', '角色立绘'], ['visuals', '官方视觉'], ['covers', '作品封面'],
]
export const albums = definitions.map(([slug, title], index) => {
  const members = photos.filter(photo => slug === 'portraits' ? photo.wiki.mediaType === 'portrait' : slug === 'visuals' ? photo.wiki.mediaType === 'promo' : slug === 'covers' ? photo.wiki.mediaType === 'cover' : photo.wiki.entityIds.includes(slug))
  return { id: index + 1, slug, title, description: `${title}的公开影像档案 · 来源与详细资料见 Wiki`, coverPhotoId: members[0]?.id || null, isHidden: false, hasPassword: false, position: index, createdAt: snapshot.capturedAt, updatedAt: snapshot.capturedAt, photoIds: members.map(photo => photo.id), photos: members }
}).filter(album => album.photoIds.length)
export const capturedAt = snapshot.capturedAt

export function projectCollection(items, {base = '/visuals', live = true, updatedAt = null} = {}) {
  const mapped = items.map(item => toPhoto(item, {base, live}))
  const groups = definitions.map(([slug,title],index) => {
    const members = mapped.filter(photo => slug === 'portraits' ? photo.wiki.mediaType === 'portrait' : slug === 'visuals' ? photo.wiki.mediaType === 'promo' : slug === 'covers' ? photo.wiki.mediaType === 'cover' : photo.wiki.entityIds.includes(slug))
    return {id:index+1,slug,title,description:`${title}的公开影像档案 · 来源与详细资料见 Wiki`,coverPhotoId:members[0]?.id||null,isHidden:false,hasPassword:false,position:index,createdAt:capturedAt,updatedAt,photoIds:members.map(photo=>photo.id),photos:members}
  }).filter(album => album.photos.length)
  return {photos:mapped,albums:groups}
}
