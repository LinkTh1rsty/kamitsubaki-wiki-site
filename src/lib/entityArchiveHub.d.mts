import type {EntityRegistry} from './entityRegistry.mjs';
export function entityArchiveHub(registry:EntityRegistry,id:string,locale?:string,timeline?:Array<{id:string}>):Array<{key:string;labelKey?:string;count:number;records:Array<{id:string;title:string;path:string}>;href:string}>;
