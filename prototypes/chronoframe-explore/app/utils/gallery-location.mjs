/** Build document/share URLs in the independently mounted gallery namespace. */
export function galleryURL(origin, base, path) {
 const root = new URL(base.endsWith('/') ? base : base + '/', origin)
 const result = new URL(root.pathname + path.replace(/^\/+/, ''), root.origin)
 if (!result.pathname.startsWith(root.pathname)) throw new Error('Gallery URL escapes application base')
 return result.href
}
