const contributionPath=/^\/(?:zh|zh-tw|zh-hk|ja|en)\/(?:media|account\/creator|articles\/submit|contribute(?:\/(?:editor|review))?|chronicle\/submit|gallery\/(?:manage(?:\/photos|\/legacy)?|classify|mine))\/$/;

export function safeAccountReturnTo(raw,origin){
  if(!raw)return null;
  try{
    const target=new URL(raw,origin);
    if(target.origin!==origin||!contributionPath.test(target.pathname))return null;
    // Drop nested return destinations without changing the draft query's encoding.
    if(target.searchParams.has('returnTo'))target.search=target.search.slice(1).split('&').filter(part=>{
      try{return decodeURIComponent(part.split('=',1)[0].replace(/\+/g,' '))!=='returnTo';}catch{return true;}
    }).join('&');
    return target;
  }catch{return null;}
}
