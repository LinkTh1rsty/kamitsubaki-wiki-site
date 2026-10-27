import type {ResolvedEntity} from './entityRegistry.mjs';
export function buildHomePortal(entries:ResolvedEntity[],starts?:ResolvedEntity[]):{total:number;collections:{id:string;count:number}[];people:ResolvedEntity[]};
export function homeUpdates(entries:{data:{title:string;date:string;translationKey:string;draft?:boolean}}[],locale?:string):{title:string;date:string;datetime:string;href:string}[];
