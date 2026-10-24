import type {EntityRegistry} from './entityRegistry.mjs';
export interface ArchiveNarrative {locale:string;title:string;romanized:string;summary:string;aliases:string[];path:string;generated?:boolean}
export interface ArchiveCredit {role:string;entity?:string;name?:string;sourceIds?:string[]}
export interface ArchiveSource {id?:string;title:string;url?:string;type?:string;publishedAt?:string;reference?:string}
export interface ArchiveFacts {
 genres?:string[];tags?:string[];credits?:ArchiveCredit[];sources?:ArchiveSource[];
 performers?:Array<{entity:string;role:string}>;headliners?:string[];guestPerformers?:string[];primaryArtist?:string;
 tracks?:Array<{songId?:string;number?:string;title?:string;duration?:string}>;
 setlist?:Array<{songId?:string;number?:string;title?:string;duration?:string}>;
 genome?:{bpm?:{value:number;sourceIds:string[]};tags?:Array<{dimension:string;value:string;sourceIds:string[]}>};
 releaseDate?:string;duration?:string;eventType?:string;
 [field:string]:unknown;
}
export interface ArchiveEntity {
 id:string;type:string;canonicalLocale:string;facts:ArchiveFacts;narratives:Record<string,ArchiveNarrative>;
 date:string;datePrecision:string|null;status:string;image:string;morphing:unknown;
 media:Array<{platform:string;id?:string;url?:string;embed:{src:string;label:string;allow:string;sandbox?:string}}>;
 completeness:{score:number;tier:string;missing:Array<{field:string;weight:number}>};
 sourceFile:string|null;history:Array<{sha:string;date:string;title:string}>;
}
export interface ArchiveSnapshot {
 version:number;snapshot:string;entities:ArchiveEntity[];
 relations:Array<{source:string;target:string;type:string;role?:string;[field:string]:unknown}>;
 events:Array<{id:string;date:{start:string;end?:string;precision:string};text:Record<string,{title:string;summary?:string;locale:string}>;[field:string]:unknown}>;
 evidence:Array<{id:string;entityId:string;field:string;sourceIds:string[];status:string;sources:ArchiveSource[];[field:string]:unknown}>;
 physical:unknown[];issues:Array<{id:string;field?:string;locale?:string;kind:string;target?:string}>;
}
export function getArchiveSnapshot():Promise<ArchiveSnapshot>;
export function buildArchiveSnapshot(registry:EntityRegistry,feature:unknown):Promise<ArchiveSnapshot>;
export function stableArchiveJSON(value:unknown):string;
export function archiveDigest(value:unknown):string;
export function archiveManifest(snapshot:ArchiveSnapshot):{version:number;snapshot:string;snapshotUrl:string;license:{text:string;media:string};[key:string]:unknown};
export const sharedFactFields:string[];
