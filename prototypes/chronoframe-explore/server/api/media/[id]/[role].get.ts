import { sourceById } from '../../../utils/wiki-gallery.mjs'
import {fetchPublishedItem} from '../../../utils/public-selection.mjs'

export default defineEventHandler(async event => {
  const id = getRouterParam(event, 'id') || ''
  const role = getRouterParam(event, 'role')
  if (!['original','thumbnail'].includes(role||'')) throw createError({ statusCode: 404 })
  let item
  try { item=await fetchPublishedItem(id) }
  catch { throw createError({statusCode:503,statusMessage:'Public image temporarily unavailable'}) }
  if (!item) throw createError({ statusCode: 404 })
  const cached=sourceById.get(id)
  if(role==='thumbnail'&&cached&&cached.src===item.src&&cached.sha256&&cached.sha256===item.sha256){
    const bytes=await useStorage('assets:gallery-thumbnails').getItemRaw<Uint8Array>(`${id}.webp`)
    if(bytes){const body=new ArrayBuffer(bytes.byteLength);new Uint8Array(body).set(bytes);return new Response(body,{headers:{'Content-Type':'image/webp','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}})}
  }
  let url = new URL(item.src)
  if (url.origin !== 'https://images.kamitsubaki.wiki' || !url.pathname.startsWith('/gallery/') || url.search || url.hash) throw createError({ statusCode: 404 })
  if(role==='thumbnail')url=new URL('/api/gallery/thumbnails/480'+url.pathname,'https://api.kamitsubaki.wiki')
  const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(25000) })
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    await response.body?.cancel()
    throw createError({ statusCode: 502, statusMessage: 'Original image unavailable' })
  }
  const headers = new Headers({ 'Content-Type': response.headers.get('content-type')!, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox" })
  const length = response.headers.get('content-length')
  if (length) headers.set('Content-Length', length)
  return new Response(response.body, { headers })
})
