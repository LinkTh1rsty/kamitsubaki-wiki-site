/** Only public browsing ships; unsupported features have no reachable route. */
export default defineNuxtRouteMiddleware(to=>{
 if(['/globe','/signin','/dashboard','/media'].some(path=>to.path===path||to.path.startsWith(path+'/')))throw createError({statusCode:404,statusMessage:'Not available'})
})
