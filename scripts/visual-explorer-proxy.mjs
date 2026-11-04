/** Development only. The release uses a separately reviewed Cloudflare route for /visuals/*. */
export function visualExplorerProxy(origin=process.env.VISUAL_EXPLORER_LOCAL_ORIGIN){
 if(!origin)return {};
 const target=new URL(origin);
 if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password||target.pathname!=='/'||target.search||target.hash)throw new Error('Explorer preview must use an explicit loopback origin');
 return {'^/visuals(?:/|$)':{target:target.origin,changeOrigin:true}};
}
