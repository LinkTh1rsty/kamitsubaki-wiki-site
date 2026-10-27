import type {APIRoute} from 'astro';
import {getArchiveSnapshot} from '../../../../../lib/archiveSnapshot.mjs';
export async function getStaticPaths(){const snapshot=await getArchiveSnapshot();return [{params:{snapshot:snapshot.snapshot},props:{snapshot}}];}
export const GET:APIRoute=({props})=>new Response(JSON.stringify(props.snapshot),{headers:{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Cache-Control':'public, max-age=31536000, immutable','ETag':'"'+props.snapshot.snapshot+'"'}});
