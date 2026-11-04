/** Keep upstream masonry from rebuilding columns for metadata outside its window. */
export function useStablePhotoWindow<T>(photos:()=>T[],limit:()=>number){
 return computed<T[]>((previous)=>{
  const visible=photos().slice(0,limit())
  return previous?.length===visible.length&&visible.every((photo,index)=>photo===previous[index])?previous:visible
 })
}
