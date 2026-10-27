export interface Source { title: string; url?: string; publisher?: string; page?: string; publishedAt?: string }
export interface EntityData {
 id: string; schemaVersion: number; locale: string; entityType: string;
 name?: string; title?: string; summary?: string; description?: string; profileTagline?: string;
 romanizedName?: string; romanizedTitle?: string; releaseDate?: string; duration?: string;
 genres?: string[]; primaryArtist?: string; sources?: Source[];
 roles?: string[];
 officialLinks?: {url: string; label?: string; platform?: string}[];
 performers?: {entity: string; role?: string}[];
 credits?: {entity?: string; name?: string; role: string}[];
 tracks?: {songId?: string; title?: string; disc?: number; number?: number; duration?: string}[];
 [field: string]: any;
}
export interface EntityEntry {filePath: string; body: string; data: EntityData}
export interface ResolvedEntity extends EntityEntry {sourceLocale: string; requestedLocale: string; fallback: boolean; url: string;factsLocale?:string;factSourceFilePath?:string}
export interface EntityEdge {source: string; target: string; type: string; inverse?: boolean; role?: string; current?: boolean; startDate?: string; endDate?: string}
export interface EntityRegistry {
 entities: Map<string, Map<string,EntityEntry>>;
 legacyRoutes: Map<string,string>;
 resolveEntity(id: string, locale?: string): ResolvedEntity | undefined;
 resolveEntityUrl(id: string, locale?: string): string | undefined;
 getIncomingRelations(id: string): EntityEdge[];
 getOutgoingRelations(id: string): EntityEdge[];
 getRelations(id: string): EntityEdge[];
 list(locale?: string): ResolvedEntity[];
 morphs(id: string, locale?: string): ResolvedEntity[];
}
export function createEntityRegistry(entries: EntityEntry[],redirects?:Record<string,string>): EntityRegistry;
export function getEntityRegistry(): Promise<EntityRegistry>;
export function entityBody(entry: ResolvedEntity): string;
export const entityLocales: string[];
